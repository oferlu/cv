import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store';
import { usePlayback } from '../../hooks/usePlayback';
import AssetBlock, { GapMarker, PX_PER_SEC, ASSET_MIN_PX, GAP_PX } from './AssetBlock';
import './TrackRow.css';

export default function TrackRow({ track, isPhantom }) {
  const { playback, addAssetToTrack, renameTrack, removeTrack, settings } = useStore();
  const { playTrack } = usePlayback();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(track.name);
  const [dropOver, setDropOver] = useState(false);
  const bodyRef = useRef(null);

  const isActiveTrack = playback.activeTrackId === track.id;

  // Auto-scroll body so playhead stays visible
  useEffect(() => {
    if (!isActiveTrack || !bodyRef.current) return;
    const playheadX = calcPlayheadX(track, playback.activeAssetIdx, playback.elapsedMs);
    const el = bodyRef.current;
    const scrollTarget = playheadX - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, scrollTarget);
  }, [playback.elapsedMs, isActiveTrack]); // eslint-disable-line

  const handleDrop = (e, insertAfterIdx = -1) => {
    e.preventDefault();
    setDropOver(false);
    const raw = e.dataTransfer.getData('application/studio-asset');
    if (!raw) return;
    const assetData = JSON.parse(raw);
    // Use cameraDuration for live sources, actual duration for clips
    if (assetData.assetType === 'camera' || assetData.durationMs === 0) {
      assetData.durationMs = settings.cameraDuration;
    }
    addAssetToTrack(track.id, assetData, insertAfterIdx);
  };

  const commitRename = () => {
    renameTrack(track.id, nameVal.trim() || track.name);
    setEditing(false);
  };

  // Calculate playhead X for active asset in this track
  const playheadX = isActiveTrack
    ? calcPlayheadX(track, playback.activeAssetIdx, playback.elapsedMs)
    : -1;

  return (
    <div className={`track-row ${isActiveTrack ? 'is-active-track' : ''} ${isPhantom ? 'is-phantom' : ''}`}>
      {/* ── Label ── */}
      <div className="track-label">
        <button
          className="track-play-btn"
          onClick={() => playTrack(track.id)}
          disabled={track.assets.length === 0}
          title="Play this track"
        >▶</button>

        {editing ? (
          <input
            className="track-name-input"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
        ) : (
          <span className="track-name" onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            {isPhantom ? '+ drop here or click to add' : track.name}
          </span>
        )}

        {!isPhantom && (
          <button className="track-remove-btn" onClick={() => removeTrack(track.id)} title="Remove track">✕</button>
        )}
      </div>

      {/* ── Body (scrollable) ── */}
      <div
        ref={bodyRef}
        className={`track-body ${dropOver ? 'drop-over' : ''} ${track.assets.length === 0 ? 'is-empty' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropOver(false); }}
        onDrop={(e) => handleDrop(e, track.assets.length - 1)}
      >
        {track.assets.length === 0 && (
          <span className="track-empty-hint">Drag assets here</span>
        )}

        {track.assets.map((asset, idx) => {
          // Is the playhead inside this asset?
          const isActive = isActiveTrack && playback.activeAssetIdx === idx;
          const playheadPct = isActive ? playback.elapsedMs / asset.durationMs : 0;

          return (
            <React.Fragment key={asset.id}>
              <AssetBlock
                asset={asset}
                trackId={track.id}
                isActive={isActive}
                playheadPct={Math.min(1, playheadPct)}
              />
              {idx < track.assets.length - 1 && (
                <GapMarker onDrop={(e) => handleDrop(e, idx)} />
              )}
            </React.Fragment>
          );
        })}

        {/* Drop zone at end of assets */}
        {track.assets.length > 0 && (
          <div
            className="track-end-drop"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.stopPropagation(); handleDrop(e, track.assets.length - 1); }}
          />
        )}
      </div>
    </div>
  );
}

// Calculate absolute X position of the playhead within the track body
function calcPlayheadX(track, activeAssetIdx, elapsedMs) {
  let x = 0;
  for (let i = 0; i <= activeAssetIdx && i < track.assets.length; i++) {
    const asset = track.assets[i];
    const w = Math.max(ASSET_MIN_PX, (asset.durationMs / 1000) * PX_PER_SEC);
    if (i < activeAssetIdx) {
      x += w + GAP_PX;
    } else {
      x += (elapsedMs / asset.durationMs) * w;
    }
  }
  return x;
}
