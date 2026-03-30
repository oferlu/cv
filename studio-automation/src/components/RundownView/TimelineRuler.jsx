import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../../store';
import { ASSET_MIN_PX, GAP_PX } from './AssetBlock';
import './TimelineRuler.css';

export const LABEL_WIDTH = 160; // must match track-label width in TrackRow.css

// How many seconds between ruler ticks at a given zoom level
function tickInterval(zoom) {
  if (zoom >= 200) return 0.5;
  if (zoom >= 80)  return 1;
  if (zoom >= 30)  return 5;
  if (zoom >= 10)  return 10;
  return 30;
}

function fmtTime(seconds) {
  const intSec = Math.floor(seconds);
  const frac   = seconds - intSec;
  const m = Math.floor(intSec / 60);
  const s = intSec % 60;
  const base = `${m}:${String(s).padStart(2, '0')}`;
  return frac > 0 ? `${base}.${Math.round(frac * 10)}` : base;
}

export default function TimelineRuler() {
  const { zoom, setZoom, rulerScrollLeft, setRulerScrollLeft, tracks } = useStore();
  const rulerRef   = useRef(null);
  const syncingRef = useRef(false);

  // Sync scroll from store → DOM (driven by track scroll)
  useEffect(() => {
    const el = rulerRef.current;
    if (!el || syncingRef.current) return;
    syncingRef.current = true;
    el.scrollLeft = rulerScrollLeft;
    requestAnimationFrame(() => { syncingRef.current = false; });
  }, [rulerScrollLeft]);

  // Ctrl+Wheel to zoom
  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom(zoom + (e.deltaY < 0 ? 10 : -10));
  }, [zoom, setZoom]);

  useEffect(() => {
    const el = rulerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Total ruler width = longest track + padding
  const maxSec = Math.max(
    60,
    ...tracks.map((t) =>
      t.assets.reduce((sum, a) => sum + a.durationMs / 1000, 0) + t.assets.length * (GAP_PX / zoom)
    )
  ) + 30;

  const interval   = tickInterval(zoom);
  const totalPx    = maxSec * zoom;
  const tickCount  = Math.ceil(maxSec / interval) + 1;

  return (
    <div className="ruler-row">
      {/* Fixed label area with zoom controls */}
      <div className="ruler-label">
        <button className="zoom-btn" onClick={() => setZoom(zoom + 10)} title="Zoom in (Ctrl+Scroll)">+</button>
        <span className="zoom-val">{zoom}</span>
        <button className="zoom-btn" onClick={() => setZoom(zoom - 10)} title="Zoom out">−</button>
      </div>

      {/* Scrollable ruler — overflow hidden, driven by store */}
      <div ref={rulerRef} className="ruler-scroll">
        <div className="ruler-inner" style={{ width: totalPx }}>
          {Array.from({ length: tickCount }, (_, i) => {
            const t   = i * interval;
            const x   = t * zoom;
            const maj = Number.isInteger(t / (interval * 4));
            return (
              <div key={t} className={`ruler-tick ${maj ? 'major' : 'minor'}`} style={{ left: x }}>
                <span className="ruler-label-text">{fmtTime(t)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
