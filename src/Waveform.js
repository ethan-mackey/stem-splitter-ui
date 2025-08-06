import { useMemo, useRef, useState, useEffect } from "react";
import { audioAnalyzer } from "./audioAnalysis";
import "./App.css";

export default function Waveform({
  progress = 0,
  duration = 0,
  loop = null,
  onScrub,
  onLoopChange,
  videoId = null,
  youtubePlayer = null,
}) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null);
  const [waveformData, setWaveformData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  
  useEffect(() => {
    if (!videoId) return;

    setIsAnalyzing(true);
    
    const analyzeAudio = async () => {
      try {
        let data;
        
        
        if (youtubePlayer) {
          data = await audioAnalyzer.analyzeFromYouTubePlayer(youtubePlayer);
        } else {
          
          data = await audioAnalyzer.analyzeYouTubeVideo(videoId);
        }
        
        setWaveformData(data);
      } catch (error) {
        console.warn('Audio analysis failed, using fallback:', error);
        setWaveformData(audioAnalyzer.generateFallbackWaveform());
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeAudio();
  }, [videoId, youtubePlayer]);

  const shape = useMemo(() => {
    const W = 740;
    const H = 180;

    
    if (waveformData && waveformData.length > 0) {
      return audioAnalyzer.convertToSVGPath(waveformData, W, H);
    }

    
    const fallbackData = audioAnalyzer.generateFallbackWaveform();
    return audioAnalyzer.convertToSVGPath(fallbackData, W, H);
  }, [waveformData]);

  const toRatio = (clientX) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return 0;
    const x = Math.min(Math.max(clientX - box.left, 0), box.width);
    return x / box.width;
  };

  const handleMouseDown = (e, type) => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);

    if (type === "scrub") {
      const r = toRatio(e.clientX);
      onScrub?.(r);
    }
  };

  const handleMouseMove = (e) => {
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
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const startPos = (loop?.a ?? 0) / duration;
  const endPos = (loop?.b ?? 1) / duration;

  return (
    <div
      className="waveform-wrapper"
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg
        className="waveform-svg"
        viewBox={`0 0 ${shape.W} ${shape.H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="waveform-gradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ff0a9c" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c026d3" stopOpacity="1" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.9" />
          </linearGradient>

          <clipPath id="progress-clip">
            <rect x="0" y="0" width={shape.W * progress} height={shape.H} />
          </clipPath>

          <mask id="loop-mask">
            <rect x="0" y="0" width={shape.W} height={shape.H} fill="white" />
            <rect
              x={shape.W * startPos}
              y="0"
              width={shape.W * (endPos - startPos)}
              height={shape.H}
              fill="black"
            />
          </mask>
        </defs>

        
        <path d={shape.d} fill="rgba(255,255,255,0.1)" stroke="none" />

        
        <path
          d={shape.d}
          fill="url(#waveform-gradient)"
          stroke="none"
          clipPath="url(#progress-clip)"
          opacity={isAnalyzing ? 0.5 : 1}
        />

        
        {isAnalyzing && (
          <text
            x={shape.W / 2}
            y={shape.mid}
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize="14"
            fontFamily="Inter, sans-serif"
          >
            Analyzing audio...
          </text>
        )}

        
        <path
          d={shape.d}
          fill="rgba(0,0,0,0.5)"
          stroke="none"
          mask="url(#loop-mask)"
        />
      </svg>

      
      <div
        className="waveform-scrubber"
        style={{ left: `${progress * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "scrub")}
      >
        <div className="scrubber-line" />
      </div>

      
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
