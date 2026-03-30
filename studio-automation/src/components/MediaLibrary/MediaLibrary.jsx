import React, { useState } from 'react';
import { useStore } from '../../store';
import './MediaLibrary.css';

const TYPE_COLORS = { VID: 'badge-blue', AUD: 'badge-amber', SFX: 'badge-green', IMG: 'badge-green' };

export default function MediaLibrary() {
  const { media } = useStore();
  const [selected, setSelected] = useState(null);

  return (
    <aside className="media-library">
      <div className="panel-header">MEDIA</div>
      <div className="media-list">
        {media.map((item) => (
          <div
            key={item.id}
            className={`media-item ${selected === item.id ? 'selected' : ''}`}
            onClick={() => setSelected(item.id)}
            onDoubleClick={() => console.log('Load to timeline:', item.name)}
          >
            <span className={`badge ${TYPE_COLORS[item.type] || 'badge-blue'}`}>{item.type}</span>
            <span className="media-name">{item.name}</span>
            <span className="media-dur">{item.duration}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
