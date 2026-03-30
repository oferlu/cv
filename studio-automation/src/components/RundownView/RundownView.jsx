import React from 'react';
import { useStore } from '../../store';
import PlaybackControls from './PlaybackControls';
import TrackRow from './TrackRow';
import './RundownView.css';

export default function RundownView() {
  const { tracks, addTrack } = useStore();

  // Drop handler for the phantom "new track" zone
  const handlePhantomDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/studio-asset');
    if (!raw) return;
    // Create new track, then add asset to it
    const { addTrack: at, tracks: currentTracks, addAssetToTrack, settings } = useStore.getState();
    at();
    // After addTrack the new track is last
    setTimeout(() => {
      const { tracks: updated, addAssetToTrack: aat, settings: s } = useStore.getState();
      const newTrack = updated[updated.length - 1];
      if (!newTrack) return;
      const assetData = JSON.parse(raw);
      if (assetData.assetType === 'camera' || assetData.durationMs === 0) {
        assetData.durationMs = s.cameraDuration;
      }
      aat(newTrack.id, assetData);
    }, 0);
  };

  return (
    <div className="rundown-view">
      <PlaybackControls />

      <div className="rundown-tracks">
        {tracks.map((track) => (
          <TrackRow key={track.id} track={track} />
        ))}

        {/* Phantom track — always at bottom, creates new track on drop */}
        <div
          className="phantom-track"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handlePhantomDrop}
        >
          <div className="phantom-label">
            <span className="phantom-hint">↓ Drop here to add new track</span>
          </div>
          <div className="phantom-body" />
        </div>
      </div>

      <div className="rundown-footer">
        <button className="add-track-btn" onClick={addTrack}>+ Add Track</button>
      </div>
    </div>
  );
}
