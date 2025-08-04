// Waveform.js
import { useMemo, useRef, useState } from "react";
import "./App.css";

export default function Waveform({
  progress = 0,
  markers = [],
  duration = 0,
  loop = null, // {a: sec, b: sec} or null
  onScrub,
  onMarkerAdd,
  onMarkerMove,
  onMarkerRemove,
  onLoopChange,
}) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null); // {type: 'marker'|'loop-a'|'loop-b', id?}

  const shape = useMemo(() => {
    const W = 740,
      H = 180,
      mid = H / 2;
    const steps = 220;
    let d = `M 0 ${mid}`;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * W;
      const amp = 48 * Math.sin(i / 2.2) + 24 * Math.cos(i / 3.7);
      const y = mid - Math.abs(amp) * (0.65 + 0.1 * Math.sin(i / 5));
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return { d, W, H, mid };
  }, []);

  const toRatio = (clientX) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return 0;
    const x = Math.min(Math.max(clientX - box.left, 0), box.width);
    return x / box.width;
  };

  const secToX = (s) => (shape.W * s) / Math.max(duration, 0.0001);

  const onDown = (e) => {
    const type = e.target.dataset.type;
    if (type === "marker") {
      setDrag({ type: "marker", id: e.target.dataset.id });
    } else if (type === "loop-a" || type === "loop-b") {
      setDrag({ type });
    } else if (e.detail === 2) {
      // double click to add marker at cursor
      const r = toRatio(e.clientX);
      onMarkerAdd?.(r * duration);
    } else {
      onScrub?.(toRatio(e.clientX));
    }
  };

  const onMove = (e) => {
    if (!drag) return;
    const r = toRatio(e.clientX);
    const t = r * duration;
    if (drag.type === "marker") onMarkerMove?.(drag.id, t);
    if (drag.type === "loop-a") onLoopChange?.({ ...loop, a: t });
    if (drag.type === "loop-b") onLoopChange?.({ ...loop, b: t });
  };

  const onUp = () => setDrag(null);

  const aX = loop?.a != null ? secToX(loop.a) : null;
  const bX = loop?.b != null ? secToX(loop.b) : null;
  const left = aX != null && bX != null ? Math.min(aX, bX) : null;
  const right = aX != null && bX != null ? Math.max(aX, bX) : null;

  return (
    <div
      className="wave-wrap"
      ref={ref}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      title="Double-click to add marker. Drag markers or loop handles. Click to scrub."
    >
      <svg
        className="wave-svg"
        viewBox={`0 0 ${shape.W} ${shape.H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wf-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <clipPath id="wf-cut">
            <rect x="0" y="0" width={shape.W * progress} height={shape.H} />
          </clipPath>
        </defs>

        {/* base */}
        <path d={shape.d} fill="none" stroke="#2b2147" strokeWidth="4" />
        {/* played */}
        <path
          d={shape.d}
          fill="none"
          stroke="url(#wf-grad)"
          strokeWidth="4"
          clipPath="url(#wf-cut)"
        />

        {/* loop region */}
        {left != null && right != null && (
          <rect
            x={left}
            y="0"
            width={Math.max(2, right - left)}
            height={shape.H}
            fill="rgba(124,58,237,0.18)"
            stroke="rgba(124,58,237,0.5)"
            strokeWidth="1"
            rx="4"
          />
        )}

        {/* loop handles */}
        {aX != null && (
          <g transform={`translate(${aX},0)`}>
            <rect
              x="-4"
              y="0"
              width="8"
              height={shape.H}
              rx="2"
              fill="#7c3aed"
              data-type="loop-a"
              style={{ cursor: "ew-resize" }}
            />
          </g>
        )}
        {bX != null && (
          <g transform={`translate(${bX},0)`}>
            <rect
              x="-4"
              y="0"
              width="8"
              height={shape.H}
              rx="2"
              fill="#7c3aed"
              data-type="loop-b"
              style={{ cursor: "ew-resize" }}
            />
          </g>
        )}

        {/* markers */}
        {markers.map((m) => {
          const x = secToX(m.t);
          return (
            <g key={m.id} transform={`translate(${x},0)`}>
              <line
                x1="0"
                x2="0"
                y1="0"
                y2={shape.H}
                stroke="#22d3ee"
                strokeWidth="2"
                opacity="0.9"
                data-type="marker"
                data-id={m.id}
                style={{ cursor: "ew-resize" }}
              />
              <rect
                x="-30"
                y="8"
                width="60"
                height="20"
                rx="6"
                fill="#0ea5b7"
                opacity="0.95"
              />
              <text
                x="0"
                y="22"
                textAnchor="middle"
                fontSize="12"
                fill="white"
                style={{ pointerEvents: "none" }}
              >
                {m.label}
              </text>
              <circle
                cx="0"
                cy={shape.H - 10}
                r="6"
                fill="#22d3ee"
                stroke="white"
                strokeWidth="2"
                data-type="marker"
                data-id={m.id}
                style={{ cursor: "ew-resize" }}
                onDoubleClick={() => onMarkerRemove?.(m.id)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
