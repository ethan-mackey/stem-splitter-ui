import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * VibrancyMask
 * - Covers the entire window with an opaque plate.
 * - Cuts a rounded-rect "hole" where your pill lives.
 * - The hole can be inset slightly to prevent any blur bleed.
 *
 * Props:
 *   targetSelector  CSS selector for the pill element (default ".pill-window")
 *   radius          Corner radius of the pill in px (default 39)
 *   inset           Shrinks the hole on all sides by this many px to avoid edge bleed (default 2)
 *   overlayColor    Color outside the pill (default "#0d0d0d" opaque)
 *   zIndex          Stacking order (default 2147483000)
 */
export default function VibrancyMask({
  targetSelector = ".pill-window",
  radius = 39,
  inset = 2,
  overlayColor = "#0d0d0d", // opaque to fully hide vibrancy outside the pill
  zIndex = 2147483000,
}) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({
    vw: typeof window !== "undefined" ? window.innerWidth : 0,
    vh: typeof window !== "undefined" ? window.innerHeight : 0,
  });
  const [cut, setCut] = useState({ x: 0, y: 0, w: 0, h: 0, r: radius });

  // Measure pill and keep in sync
  useLayoutEffect(() => {
    const el = () => document.querySelector(targetSelector);

    const update = () => {
      const pill = el();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setDims({ vw, vh });

      if (!pill) return;

      const b = pill.getBoundingClientRect();

      // Shrink hole slightly to ensure no blur bleeds past border radius/gradient stroke
      const ix = Math.max(0, inset);
      setCut({
        x: Math.round(b.x + ix),
        y: Math.round(b.y + ix),
        w: Math.max(0, Math.round(b.width - ix * 2)),
        h: Math.max(0, Math.round(b.height - ix * 2)),
        r: Math.max(0, radius - ix),
      });
    };

    update();

    const ro = new ResizeObserver(update);
    const mo = new MutationObserver(update);

    ro.observe(document.documentElement);
    mo.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetSelector, radius, inset]);

  return (
    <svg
      ref={svgRef}
      className="vibrancy-mask"
      width={dims.vw}
      height={dims.vh}
      viewBox={`0 0 ${dims.vw} ${dims.vh}`}
      style={{
        position: "fixed",
        inset: 0,
        // Put it ABOVE your UI; pointerEvents none so it doesn't block clicks.
        zIndex,
        pointerEvents: "none",
        // Avoid subpixel fuzz on edges
        shapeRendering: "crispEdges",
      }}
    >
      <defs>
        <mask id="vmask" maskUnits="userSpaceOnUse">
          {/* White = show overlay. Black = cutout (reveal OS vibrancy). */}
          <rect x="0" y="0" width={dims.vw} height={dims.vh} fill="white" />
          <rect
            x={cut.x}
            y={cut.y}
            width={cut.w}
            height={cut.h}
            rx={cut.r}
            ry={cut.r}
            fill="black"
          />
        </mask>
      </defs>

      {/* Opaque plate that hides vibrancy everywhere except the pill hole */}
      <rect
        x="0"
        y="0"
        width={dims.vw}
        height={dims.vh}
        fill={overlayColor}
        mask="url(#vmask)"
      />
    </svg>
  );
}
