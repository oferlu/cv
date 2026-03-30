import React from 'react';
import { useStore } from '../../store';
import './DevicePanel.css';

const TYPE_ICONS = { vmix: '🎬', atem: '🔀', obs: '⬤' };

export default function DevicePanel() {
  const { devices } = useStore();

  return (
    <aside className="device-panel">
      <div className="panel-header">DEVICES</div>
      <div className="device-list">
        {devices.map((d) => (
          <DeviceCard key={d.id} device={d} />
        ))}
        <button className="add-device-btn">+ Add Device</button>
      </div>
    </aside>
  );
}

function DeviceCard({ device }) {
  return (
    <div className={`device-card ${device.status}`}>
      <span className="device-icon">{TYPE_ICONS[device.type] || '⬤'}</span>
      <div className="device-info">
        <span className="device-name">{device.name}</span>
        <span className={`device-status badge ${device.status === 'connected' ? 'badge-green' : 'badge-red'}`}>
          {device.status}
        </span>
      </div>
    </div>
  );
}
