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

      return this.generateFallbackWaveform();
    }
  }

  async getYouTubeAudioUrl(videoId) {
    try {
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const youtubeUrl = encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      );

      const response = await fetch(`${corsProxy}${youtubeUrl}`);
      const html = await response.text();

      const audioUrlMatch = html.match(/"url":"([^"]*audioonly[^"]*)"/);
      if (audioUrlMatch) {
        return decodeURIComponent(audioUrlMatch[1].replace(/\\u0026/g, "&"));
      }

      const adaptiveFormatsMatch = html.match(/"adaptiveFormats":\[(.*?)\]/);
      if (adaptiveFormatsMatch) {
        const formats = JSON.parse(`[${adaptiveFormatsMatch[1]}]`);
        const audioFormat = formats.find(
          (f) => f.mimeType && f.mimeType.includes("audio")
        );
        if (audioFormat && audioFormat.url) {
          return audioFormat.url;
        }
      }
    } catch (error) {
      console.warn("Failed to extract audio URL:", error);
    }

    return null;
  }

  async fetchAndDecodeAudio(audioUrl) {
    const context = await this.initializeAudioContext();

    try {
      const corsProxy = "https://api.allorigins.win/raw?url=";
      const proxyUrl = `${corsProxy}${encodeURIComponent(audioUrl)}`;

      const response = await fetch(proxyUrl, {
        mode: "cors",
        headers: {
          Accept: "audio/*,*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(arrayBuffer);

      this.audioBuffer = audioBuffer;
      return audioBuffer;
    } catch (error) {
      console.warn("Failed to fetch and decode audio:", error);
      try {
        const directResponse = await fetch(audioUrl, { mode: "no-cors" });
        const arrayBuffer = await directResponse.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);

        this.audioBuffer = audioBuffer;
        return audioBuffer;
      } catch (directError) {
        console.warn("Direct fetch also failed:", directError);
        throw error;
      }
    }
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
