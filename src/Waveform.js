// Waveform.js
import { useMemo, useRef, useState } from "react";
import "./App.css";

export default function Waveform({
  progress = 0,
  duration = 0,
  loop = null,
  onScrub,
  onLoopChange,
}) {
  const ref = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'scrub', 'start', 'end'

  const shape = useMemo(() => {
    const W = 740;
    const H = 180;
    const mid = H / 2;
    const steps = 200;
    let d = `M 0 ${mid}`;

    // Generate more realistic waveform pattern
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * W;
      const t = i / steps;

      // Create varying amplitude
      const amp1 = 35 * Math.sin(t * Math.PI * 8 + 1);
      const amp2 = 25 * Math.sin(t * Math.PI * 12 + 2);
      const amp3 = 15 * Math.sin(t * Math.PI * 20 + 3);
      const envelope = Math.sin(t * Math.PI) * 0.8 + 0.2;

      const amplitude = (amp1 + amp2 + amp3) * envelope;
      const y = mid - Math.abs(amplitude);

      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // Mirror for bottom half
    for (let i = steps; i >= 0; i--) {
      const x = (i / steps) * W;
      const t = i / steps;

      const amp1 = 35 * Math.sin(t * Math.PI * 8 + 1);
      const amp2 = 25 * Math.sin(t * Math.PI * 12 + 2);
      const amp3 = 15 * Math.sin(t * Math.PI * 20 + 3);
      const envelope = Math.sin(t * Math.PI) * 0.8 + 0.2;

      const amplitude = (amp1 + amp2 + amp3) * envelope;
      const y = mid + Math.abs(amplitude);

      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    d += " Z";
    return { d, W, H, mid };
  }, []);

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

        {/* Background waveform */}
        <path d={shape.d} fill="rgba(255,255,255,0.1)" stroke="none" />

        {/* Progress waveform */}
        <path
          d={shape.d}
          fill="url(#waveform-gradient)"
          stroke="none"
          clipPath="url(#progress-clip)"
        />

        {/* Dimmed areas outside loop */}
        <path
          d={shape.d}
          fill="rgba(0,0,0,0.5)"
          stroke="none"
          mask="url(#loop-mask)"
        />
      </svg>

      {/* Scrubbing bar */}
      <div
        className="waveform-scrubber"
        style={{ left: `${progress * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "scrub")}
      >
        <div className="scrubber-line" />
      </div>

      {/* Start clip handle */}
      <div
        className="waveform-clip-handle start"
        style={{ left: `${startPos * 100}%` }}
        onMouseDown={(e) => handleMouseDown(e, "start")}
      >
        <div className="clip-handle-cap" />
      </div>

      {/* End clip handle */}
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
