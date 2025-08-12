import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * VibrancyMask
 *
 * This component overlays an opaque plate over the entire window and cuts a
 * rounded‑rect hole where your pill or results panel lives. The hole
 * reveals the OS vibrancy (blur) behind the window, while the plate hides
 * it elsewhere. You can adjust the inset to shrink the cutout and hide
 * any blur bleeding at the edges of your gradient border.
 *
 * Props:
 *   targetSelector  CSS selector for the element to reveal (e.g. ".pill-window")
 *   radius          Corner radius of the target element (in px)
 *   inset           Extra padding to shrink the cutout and avoid blur bleed
 *   overlayColor    Colour outside the cutout; use a semi‑transparent dark tint
 *   zIndex          Stacking order relative to your app content
 */
export default function VibrancyMask({
  targetSelector = ".pill-window",
  radius = 39,
  inset = 2,
  overlayColor = "rgba(13,13,13,0.7)",
  zIndex = 0,
}) {
  const [dims, setDims] = useState({ vw: 0, vh: 0 });
  const [cut, setCut] = useState({ x: 0, y: 0, w: 0, h: 0, r: radius });

  // Measure target element and update cutout dimensions on resize/scroll/mutation
  useLayoutEffect(() => {
    const update = () => {
      const el = document.querySelector(targetSelector);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setDims({ vw, vh });
      if (!el) return;
      const b = el.getBoundingClientRect();
      const pad = Math.max(0, inset);
      setCut({
        x: Math.round(b.x + pad),
        y: Math.round(b.y + pad),
        w: Math.max(0, Math.round(b.width - pad * 2)),
        h: Math.max(0, Math.round(b.height - pad * 2)),
        r: Math.max(0, radius - pad),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    const mo = new MutationObserver(update);
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
      className="vibrancy-mask"
      width={dims.vw}
      height={dims.vh}
      viewBox={`0 0 ${dims.vw} ${dims.vh}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "none",
        shapeRendering: "crispEdges",
      }}
    >
      <defs>
        <mask id="vmask" maskUnits="userSpaceOnUse">
          {/* White shows overlay; black cuts hole for the target */}
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
      {/* Opaque plate covers blur outside the cutout */}
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
