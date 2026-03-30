import React from 'react';
import { useStore } from '../../store';
import './Timeline.css';

const TRACKS = [
  { id: 'video',   label: 'Video',   type: 'video'   },
  { id: 'overlay', label: 'Overlay', type: 'overlay' },
  { id: 'audio',   label: 'Audio',   type: 'audio'   },
  { id: 'graphic', label: 'CG',      type: 'graphic' },
  { id: 'script',  label: 'Script',  type: 'script'  },
];

export default function Timeline() {
  const { rundown, setActiveRundownItem } = useStore();

  return (
    <section className="timeline">
      {/* Ruler */}
      <div className="tl-ruler-row">
        <div className="tl-track-label" />
        <div className="tl-ruler">
          {[0,1,2,3,4,5,6,7,8].map((m) => (
            <div key={m} className="tl-ruler-mark" style={{ left: `${m * 12.5}%` }}>
              {m * 5}:00
            </div>
          ))}
        </div>
      </div>

      {/* Tracks */}
      {TRACKS.map((track) => (
        <div key={track.id} className="tl-row">
          <div className="tl-track-label">
            <div className="tl-track-controls">
              <button className="tl-ctrl" title="Play">▶</button>
              <button className="tl-ctrl" title="Stop">■</button>
              <button className="tl-ctrl" title="Rewind">⏮</button>
              <button className="tl-ctrl" title="Mute">◉</button>
            </div>
            <span className="tl-track-name">{track.label}</span>
          </div>
          <div className="tl-track-body">
            {track.type === 'video' && rundown.items.map((item) => (
              <RundownBlock
                key={item.id}
                item={item}
                active={rundown.activeId === item.id}
                onClick={() => setActiveRundownItem(item.id)}
              />
            ))}
            {track.type === 'overlay' && (
              <div className="tl-block tl-block-overlay" style={{ left: '34%', width: '12%' }}>
                rollover
              </div>
            )}
            {track.type === 'audio' && (
              <div className="tl-block tl-block-audio" style={{ left: '0%', width: '100%' }} />
            )}
            {track.type === 'graphic' && (
              <div className="tl-block tl-block-graphic" style={{ left: '12%', width: '80%' }}>
                <span>VIDEO PACKAGE</span>
              </div>
            )}
            {track.type === 'script' && (
              <>
                <div className="tl-block tl-block-script" style={{ left: '12%', width: '18%' }}>Welcome...</div>
                <div className="tl-block tl-block-script" style={{ left: '31%', width: '18%' }}>Today we...</div>
                <div className="tl-block tl-block-script" style={{ left: '50%', width: '18%' }}>As you can...</div>
                <div className="tl-block tl-block-script" style={{ left: '69%', width: '18%' }}>In summary</div>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Playhead */}
      <div className="tl-playhead" style={{ left: `calc(120px + 0%)` }} />
    </section>
  );
}

function RundownBlock({ item, active, onClick }) {
  const widthMap = { intro: '8%', main: '24%', roll: '16%', talk: '14%' };
  const leftMap  = { intro: '0%', main: '8%',  roll: '32%', talk: '48%' };

  return (
    <div
      className={`tl-block tl-block-rundown ${active ? 'active' : ''}`}
      style={{
        left: leftMap[item.type]  || '0%',
        width: widthMap[item.type] || '10%',
        background: item.color,
      }}
      onClick={onClick}
    >
      {item.label}
    </div>
  );
}
