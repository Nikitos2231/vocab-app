import { useRef, useCallback } from "react";

// Double-handle range slider. min=20, max=100 (mastery bounds).
// value: [lo, hi], onChange: ([lo, hi]) => void
export function RangeSlider({ value, onChange, min = 20, max = 100 }) {
  const [lo, hi] = value;
  const trackRef = useRef(null);

  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v)));

  const posFromEvent = useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return clamp(min + ratio * (max - min));
  }, [min, max]);

  const startDrag = (which) => (e) => {
    e.preventDefault();
    const move = (ev) => {
      const v = posFromEvent(ev);
      if (which === "lo") onChange([Math.min(v, hi), hi]);
      else onChange([lo, Math.max(v, lo)]);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
  };

  const loPercent = ((lo - min) / (max - min)) * 100;
  const hiPercent = ((hi - min) / (max - min)) * 100;
  const isDefault = lo === min && hi === max;

  return (
    <div style={s.wrap}>
      <div style={s.track} ref={trackRef}>
        {/* inactive left segment */}
        <div style={{ ...s.rail, left: 0, width: `${loPercent}%` }} />
        {/* active segment */}
        <div style={{ ...s.active, left: `${loPercent}%`, width: `${hiPercent - loPercent}%` }} />
        {/* inactive right segment */}
        <div style={{ ...s.rail, left: `${hiPercent}%`, right: 0, width: `${100 - hiPercent}%` }} />

        {/* lo thumb */}
        <div
          style={{ ...s.thumb, left: `${loPercent}%` }}
          onMouseDown={startDrag("lo")}
          onTouchStart={startDrag("lo")}
        >
          <div style={s.thumbInner} />
          <div style={{ ...s.tooltip, transform: "translateX(-50%)" }}>{lo}%</div>
        </div>

        {/* hi thumb */}
        <div
          style={{ ...s.thumb, left: `${hiPercent}%` }}
          onMouseDown={startDrag("hi")}
          onTouchStart={startDrag("hi")}
        >
          <div style={s.thumbInner} />
          <div style={{ ...s.tooltip, transform: "translateX(-50%)" }}>{hi}%</div>
        </div>
      </div>

      <div style={s.labels}>
        <span style={{ ...s.label, opacity: isDefault ? 0.4 : 1 }}>{lo}%</span>
        <span style={{ ...s.label, opacity: isDefault ? 0.4 : 1 }}>{hi}%</span>
      </div>
    </div>
  );
}

const THUMB_SIZE = 18;

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 4, userSelect: "none" },
  track: {
    position: "relative",
    height: 20,
    marginTop: 20, // space for tooltips above
    display: "flex",
    alignItems: "center",
  },
  rail: {
    position: "absolute",
    height: 4,
    background: "var(--border)",
    borderRadius: 2,
  },
  active: {
    position: "absolute",
    height: 4,
    background: "var(--accent)",
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    transform: "translateX(-50%)",
    cursor: "grab",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  thumbInner: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: "50%",
    background: "var(--accent)",
    border: "2.5px solid var(--bg)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
    transition: "transform 0.1s",
    flexShrink: 0,
  },
  tooltip: {
    position: "absolute",
    top: -22,
    fontSize: 10,
    fontWeight: 600,
    color: "var(--accent)",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  },
  labels: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--accent)",
    transition: "opacity 0.15s",
  },
};
