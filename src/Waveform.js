import { useRef, useState, useEffect, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { audioAnalyzer } from "./audioAnalysis";
import "./App.css";

/**
 * Props:
 *  - progress: number 0..1 (from YouTube player)
 *  - duration: number seconds (YouTube duration; used by loop UI)
 *  - loop: {a:number,b:number}|null
 *  - onScrub(ratio 0..1): parent will seek YT to ratio * youtubeDuration
 *  - onLoopChange(newLoop)
 *  - videoId: string (YouTube ID)
 *  - onAudioLoaded?: (blob: Blob) => void  // called when a WAV blob is ready
 */
export default function Waveform({
  progress = 0,
  duration = 0,
  loop = null,
  onScrub,
  onLoopChange,
  videoId = null,
  onAudioLoaded,
}) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [wsDuration, setWsDuration] = useState(0); // WaveSurfer’s true duration

  const onScrubRef = useRef(onScrub);
  const onAudioLoadedRef = useRef(onAudioLoaded);

  // keep latest callbacks in refs
  useEffect(() => {
    onScrubRef.current = onScrub;
  }, [onScrub]);
  useEffect(() => {
    onAudioLoadedRef.current = onAudioLoaded;
  }, [onAudioLoaded]);

  // build WaveSurfer once
  useEffect(() => {
    if (!containerRef.current || wsRef.current) return;

    try {
      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#ff0a9c",
        progressColor: "#ff1aac",
        height: 180,
        normalize: false, // keep real amplitudes
        interact: true,
        dragToSeek: true,
        partialRender: true,
        barWidth: 3,
        barGap: 1,
        barRadius: 3,
      });

      ws.on("ready", () => {
        setWsDuration(ws.getDuration() || 0);
        setLoadError(null);
      });

      ws.on("error", (e) => {
        console.error("WaveSurfer error:", e);
        setLoadError("Waveform render error.");
      });

      ws.on("seek", (ratio) => {
        // WaveSurfer ratio should directly correspond to YouTube ratio
        // since both represent the same audio content
        onScrubRef.current?.(ratio);
      });

      wsRef.current = ws;
    } catch (e) {
      console.error("Failed to create WaveSurfer:", e);
      setLoadError("Audio renderer failed to initialize.");
    }

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.destroy();
        } catch {}
        wsRef.current = null;
      }
      setWsDuration(0);
    };
  }, []);

  // download + decode + load (instead of loading remote URL directly)
  useEffect(() => {
    let cancelled = false;
    const ws = wsRef.current;
    if (!ws || !videoId) return;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      console.log("Loading waveform for video:", videoId);

      let hasSetSpecificError = false;

      // 1) Electron native pipeline (if you exposed it): returns raw bytes
      if (window.audioAPI?.downloadAudioForVideo) {
        try {
          console.log("Trying Electron audioAPI for video:", videoId);
          const { mime, data } = await window.audioAPI.downloadAudioForVideo(
            videoId
          );
          if (cancelled) return;
          const blob = new Blob([data], { type: mime || "audio/webm" });
          console.log("Electron audioAPI success — size:", blob.size, "bytes");
          ws.loadBlob(blob);
          onAudioLoadedRef.current?.(blob);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error("Electron audioAPI failed:", e);
          setLoadError(
            `Electron download failed: ${e.message || "Unknown error"}`
          );
          hasSetSpecificError = true;
        }
      }

      // 2) Piped URL → fetch bytes → decode → convert to WAV blob → load
      try {
        console.log("Trying Piped API for video:", videoId);
        const pipedUrl = await audioAnalyzer.getYouTubeAudioUrl(videoId);
        if (cancelled) return;

        if (pipedUrl) {
          console.log("Piped URL acquired; downloading & decoding…");
          try {
            const audioBuffer = await audioAnalyzer.fetchAndDecodeAudio(
              pipedUrl
            );
            if (cancelled) return;

            const wavBlob = audioAnalyzer.audioBufferToWav(audioBuffer);
            console.log("Decoded & converted to WAV:", wavBlob.size, "bytes");

            ws.loadBlob(wavBlob);
            onAudioLoadedRef.current?.(wavBlob);
            setIsLoading(false);
            return;
          } catch (decodeError) {
            console.error("Download/decode failed:", decodeError);
            setLoadError(
              `Failed to download or decode audio stream: ${
                decodeError.message || decodeError
              }`
            );
            hasSetSpecificError = true;
          }
        } else {
          setLoadError("No audio streams available from Piped API");
          hasSetSpecificError = true;
        }
      } catch (e) {
        console.error("Piped path failed:", e);
        setLoadError(`Piped API failed: ${e.message || "Network error"}`);
        hasSetSpecificError = true;
      }

      // 3) Final attempt: show clear error instead of fake waveform
      console.log("All audio sources failed - cannot generate accurate waveform");
      if (!cancelled) {
        if (!hasSetSpecificError) {
          setLoadError(
            "Unable to extract audio from this YouTube video. This may be due to: (1) Copyright restrictions, (2) Geo-blocking, (3) Private/age-restricted video, or (4) Temporary YouTube API issues. Try a different public video (music tracks from independent artists often work best) or check back later."
          );
        }
        setIsLoading(false);
        // Don't load any waveform - leave it empty to make it clear audio isn't available
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [videoId, duration]);

  // keep the waveform cursor in sync with YT progress
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !wsDuration || isDragging) return;
    
    // Use progress ratio to set waveform time directly
    // progress is 0-1 ratio, multiply by waveform's actual duration
    const targetTime = (progress || 0) * wsDuration;
    const currentTime = ws.getCurrentTime?.() ?? 0;
    
    // Only update if there's a significant difference (avoid jitter)
    if (Math.abs(currentTime - targetTime) > 0.25) {
      ws.setTime(targetTime);
    }
  }, [progress, wsDuration, isDragging]);

  // ---------- scrub/loop UI ----------
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
    [onScrub, toRatio]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const r = toRatio(e.clientX);
      if (dragType === "scrub") {
        onScrub?.(r);
      } else if (dragType === "start" || dragType === "end") {
        // Convert waveform position ratio to YouTube time
        const ytTime = r * (duration || 0);
        onLoopChange?.(
          dragType === "start" ? { ...loop, a: ytTime } : { ...loop, b: ytTime }
        );
      }
    },
    [isDragging, dragType, toRatio, duration, loop, onScrub, onLoopChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragType(null);
  }, []);

  // Loop positions as ratios of the total duration
  const startPos = (loop?.a ?? 0) / (duration || 1);
  const endPos = (loop?.b ?? duration ?? 1) / (duration || 1);

  return (
    <div
      className="waveform-wrapper"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ position: "relative" }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "180px",
          opacity: isLoading ? 0.5 : 1,
          transition: "opacity 0.3s ease",
          backgroundColor: "rgba(255, 0, 0, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          cursor: "pointer",
          position: "relative",
          zIndex: 2,
        }}
      />

      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          Loading waveform...
        </div>
      )}

      {loadError && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#ff6b6b",
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            textAlign: "center",
            pointerEvents: "none",
            backgroundColor: "rgba(0,0,0,0.8)",
            padding: "12px 16px",
            borderRadius: "8px",
            maxWidth: "80%",
            lineHeight: "1.4",
          }}
        >
          ⚠️ {loadError}
        </div>
      )}

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
