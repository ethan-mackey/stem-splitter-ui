export class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.audioBuffer = null;
  }

  async initializeAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  async analyzeYouTubeVideo(videoId) {
    try {
      const audioUrl = await this.getYouTubeAudioUrl(videoId);
      if (!audioUrl) {
        throw new Error("Could not get audio URL from YouTube video");
      }

      const audioBuffer = await this.fetchAndDecodeAudio(audioUrl);
      return this.generateWaveformData(audioBuffer);
    } catch (error) {
      console.warn("Failed to analyze YouTube audio:", error);

      const fallback = await this.generateFallbackAudioBuffer();
      return this.generateWaveformData(fallback);
    }
  }

  async getYouTubeAudioUrl(videoId) {
    try {
      const apiUrl = `https://piped.video/streams/${videoId}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const audio = data?.audioStreams?.[0]?.url;
      return audio || null;
    } catch (error) {
      console.warn("Failed to extract audio URL:", error);
      return null;
    }
  }

  async fetchAndDecodeAudio(audioUrl) {
    const context = await this.initializeAudioContext();

    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(arrayBuffer);

    this.audioBuffer = audioBuffer;
    return audioBuffer;
  }

  async generateFallbackAudioBuffer(duration = 2) {
    const context = await this.initializeAudioContext();
    const sampleRate = context.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < frameCount; i++) {
      const t = i / frameCount;
      const bass = Math.sin(2 * Math.PI * t) * 0.3;
      const mid = Math.sin(2 * Math.PI * 4 * t) * 0.2;
      const noise = (Math.random() - 0.5) * 0.1;
      data[i] = bass + mid + noise;
    }

    this.audioBuffer = buffer;
    return buffer;
  }

  generateWaveformData(audioBuffer, sampleCount = 200) {
    if (!audioBuffer) return this.generateFallbackWaveform();

    const channelData = audioBuffer.getChannelData(0);
    const samplesPerGroup = Math.floor(channelData.length / sampleCount);
    const waveformData = [];

    for (let i = 0; i < sampleCount; i++) {
      let sum = 0;
      let maxVal = 0;

      const start = i * samplesPerGroup;
      const end = Math.min(start + samplesPerGroup, channelData.length);

      for (let j = start; j < end; j++) {
        const sample = channelData[j];
        sum += sample * sample;
        maxVal = Math.max(maxVal, Math.abs(sample));
      }

      const rms = Math.sqrt(sum / (end - start));
      const amplitude = Math.max(rms, maxVal * 0.3);

      waveformData.push({
        amplitude: amplitude,
        position: i / sampleCount,
      });
    }

    return waveformData;
  }

  generateFallbackWaveform(sampleCount = 200) {
    const waveformData = [];

    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount;

      const bassFreq = Math.sin(t * Math.PI * 2) * 0.3;
      const midFreq = Math.sin(t * Math.PI * 8 + 1) * 0.4;
      const highFreq = Math.sin(t * Math.PI * 16 + 2) * 0.2;
      const noise = (Math.random() - 0.5) * 0.1;

      let envelope = 1;
      if (t < 0.1) envelope = t / 0.1;
      else if (t > 0.9) envelope = (1 - t) / 0.1;
      else envelope = 0.5 + 0.5 * Math.sin(t * Math.PI * 3);

      const amplitude =
        Math.abs(bassFreq + midFreq + highFreq + noise) * envelope;

      waveformData.push({
        amplitude: Math.min(amplitude, 1),
        position: t,
      });
    }

    return waveformData;
  }

  async analyzeFromYouTubePlayer(player) {
    if (!player || typeof player.getVideoData !== "function") {
      return this.generateFallbackWaveform();
    }

    try {
      await this.initializeAudioContext();

      const iframe = player.getIframe?.();
      if (iframe && iframe.contentWindow) {
        return this.generateFallbackWaveform();
      }
    } catch (error) {
      console.warn("Could not analyze YouTube player audio:", error);
    }

    return this.generateFallbackWaveform();
  }

  convertToSVGPath(waveformData, width = 740, height = 180) {
    if (!waveformData || waveformData.length === 0) {
      return { d: "", W: width, H: height, mid: height / 2 };
    }

    const mid = height / 2;
    let d = `M 0 ${mid}`;

    waveformData.forEach((point) => {
      const x = (point.position * width).toFixed(1);
      const amplitude = point.amplitude * (mid - 10);
      const y = (mid - amplitude).toFixed(1);
      d += ` L ${x} ${y}`;
    });

    for (let i = waveformData.length - 1; i >= 0; i--) {
      const point = waveformData[i];
      const x = (point.position * width).toFixed(1);
      const amplitude = point.amplitude * (mid - 10);
      const y = (mid + amplitude).toFixed(1);
      d += ` L ${x} ${y}`;
    }

    d += " Z";

    return { d, W: width, H: height, mid };
  }
}

export const audioAnalyzer = new AudioAnalyzer();
