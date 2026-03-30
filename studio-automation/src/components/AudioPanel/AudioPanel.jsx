import React, { useState } from 'react';
import './AudioPanel.css';

const CHANNELS = [
  { id: 1, label: 'Master',  level: 85, muted: false },
  { id: 2, label: 'Mic 1',   level: 70, muted: false },
  { id: 3, label: 'Mic 2',   level: 45, muted: true  },
  { id: 4, label: 'BG Music',level: 30, muted: false },
];

export default function AudioPanel() {
  const [channels, setChannels] = useState(CHANNELS);

  const setLevel = (id, level) =>
    setChannels((ch) => ch.map((c) => (c.id === id ? { ...c, level } : c)));

  const toggleMute = (id) =>
    setChannels((ch) => ch.map((c) => (c.id === id ? { ...c, muted: !c.muted } : c)));

  return (
    <div className="audio-panel">
      <div className="panel-header">AUDIO</div>
      <div className="audio-channels">
        {channels.map((ch) => (
          <div key={ch.id} className={`audio-channel ${ch.muted ? 'muted' : ''}`}>
            <div className="audio-fader-wrap">
              <div className="audio-meter">
                <div className="audio-meter-fill" style={{ height: `${ch.muted ? 0 : ch.level}%` }} />
              </div>
              <input
                type="range"
                className="audio-fader"
                min="0" max="100"
                value={ch.level}
                onChange={(e) => setLevel(ch.id, Number(e.target.value))}
                orient="vertical"
              />
            </div>
            <button
              className={`mute-btn ${ch.muted ? 'active' : ''}`}
              onClick={() => toggleMute(ch.id)}
            >M</button>
            <span className="audio-label">{ch.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
