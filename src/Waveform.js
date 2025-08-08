import { useRef, useState, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioAnalyzer } from "./audioAnalysis";
import "./App.css";

// === Helper: AudioBuffer -> WAV Blob (your original helper, kept) ===
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);

  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

export default function Waveform({
  progress = 0,
  duration = 0,
  loop = null,
  onScrub,
  onLoopChange,
  videoId = null, // <-- we now actually use this
}) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Create WaveSurfer once
  useEffect(() => {
    if (!containerRef.current || wavesurferRef.current) return;

    try {
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#ff0a9c",
        progressColor: "#ff1aac",
        height: 180,
        normalize: true,
        interact: true,
        dragToSeek: true,
      });

      wavesurfer.on("ready", () => {
        setIsReady(true);
        setLoadError(null);
      });

      wavesurfer.on("error", (error) => {
        console.error("WaveSurfer error:", error);
        setLoadError("Failed to render waveform.");
      });

      wavesurfer.on("seek", (ratio) => {
        onScrub?.(ratio);
      });

      wavesurferRef.current = wavesurfer;
    } catch (e) {
      console.error("Failed to create WaveSurfer:", e);
      setLoadError("Audio renderer failed to initialize.");
    }

    return () => {
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch {}
        wavesurferRef.current = null;
      }
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache for analyzed audio buffers
  const audioBufferCache = useRef({});

  // Load real audio for the selected video, with caching
  useEffect(() => {
    let cancelled = false;

    async function loadForVideo(id) {
      if (!wavesurferRef.current || !id) return;

      setIsLoading(true);
      setIsReady(false);
      setLoadError(null);

      try {
        let buffer = audioBufferCache.current[id];
        if (!buffer) {
          // Use *your* analyzer to find & decode the audio
          await audioAnalyzer.analyzeYouTubeVideo(id);
          buffer = audioAnalyzer.audioBuffer;
          if (!buffer) {
            throw new Error("Audio buffer not available.");
          }
          audioBufferCache.current[id] = buffer;
        }

        const wavBlob = audioBufferToWav(buffer);

        if (cancelled) return;
        // Feed the decoded audio into WaveSurfer
        wavesurferRef.current.loadBlob(wavBlob);
      } catch (err) {
        console.warn("Could not load audio for video:", err);
        if (!cancelled) {
          setLoadError(
            "Could not fetch audio for this video (CORS/YouTube blocking)."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadForVideo(videoId);

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Keep external progress/duration in sync if you use them
  useEffect(() => {
    if (!wavesurferRef.current || !isReady || !duration) return;

    const targetTime = progress * duration;
    const current = wavesurferRef.current.getCurrentTime?.() ?? 0;

    if (Math.abs(current - targetTime) > 0.5) {
      wavesurferRef.current.setTime(targetTime);
    }
  }, [progress, duration, isReady]);

  // Drag logic (unchanged)
  const toRatio = useCallback((clientX) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return 0;
    const x = Math.min(Math.max(clientX - box.left, 0), box.width);
    return x / box.width;
  }, []);

  const handleMouseDown = useCallback(
    (e, type) => {
      e.preventDefault();
      setIsDragging(true);
      setDragType(type);

      if (type === "scrub") {
        const r = toRatio(e.clientX);
        onScrub?.(r);
      }
    },
    [toRatio, onScrub]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      const r = toRatio(e.clientX);

      if (dragType === "scrub") {
        onScrub?.(r);
      } else if (dragType === "start" || dragType === "end") {
        const t = r * duration;
        if (dragType === "start") {
          onLoopChange?.({ ...loop, a: t });
        } else {
          onLoopChange?.({ ...loop, b: t });
        }
      }
    },
    [isDragging, dragType, toRatio, duration, loop, onScrub, onLoopChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  const startPos = (loop?.a ?? 0) / duration || 0;
  const endPos = (loop?.b ?? 1) / duration || 1;

  return (
    <div
      className="waveform-wrapper"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ position: "relative" }}
    >
      {/* WaveSurfer container */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "180px",
          opacity: isLoading ? 0.5 : 1,
          transition: "opacity 0.3s ease",
          // NOTE: I did NOT change your CSS classes; these inline styles were already here.
          backgroundColor: "rgba(255, 0, 0, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          cursor: "pointer",
          position: "relative",
          zIndex: 2, // keeps canvas visible if your ::before overlay is on z-index:1
        }}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "14px",
            fontFamily: "Inter, sans-serif",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          Loading waveform...
        </div>
      )}

      {/* Error banner (non-blocking) */}
      {loadError && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            right: 8,
            color: "#ff6b6b",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          {loadError}
        </div>
      )}

      {/* Loop region overlay */}
      {loop && duration > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${startPos * 100}%`,
            width: `${(endPos - startPos) * 100}%`,
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.3)",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      )}

      {/* Clip handles */}
      <div
        className="waveform-clip-handle start"
        style={{ left: `${startPos * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "start")}
      >
        <div className="clip-handle-cap" />
      </div>

      <div
        className="waveform-clip-handle end"
        style={{ left: `${endPos * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "end")}
      >
        <div className="clip-handle-cap" />
      </div>
    </div>
  );
}
