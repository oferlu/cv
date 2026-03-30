import React, { useState } from 'react';
import { useStore } from '../../store';
import './SettingsModal.css';

export default function SettingsModal({ onClose }) {
  const { vmix, setVmixHost } = useStore();

  const [host, setHost] = useState(vmix.host);
  const [port, setPort] = useState(String(vmix.port));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const parsedPort = parseInt(port, 10);
    if (!host.trim() || isNaN(parsedPort)) return;
    setVmixHost(host.trim(), parsedPort);
    // persist so settings survive app restart
    localStorage.setItem('vmix_host', host.trim());
    localStorage.setItem('vmix_port', String(parsedPort));
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Settings</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <section className="settings-section">
            <h3>vMix Connection</h3>

            <label className="settings-field">
              <span>IP Address</span>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="127.0.0.1"
                spellCheck={false}
              />
            </label>

            <label className="settings-field">
              <span>TCP Port</span>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8099"
                min="1"
                max="65535"
              />
            </label>

            <p className="settings-hint">
              Default: <code>127.0.0.1 : 8099</code> — use this when vMix runs on the same PC.<br />
              Change IP if vMix is on a different machine on your network.
            </p>
          </section>
        </div>

        <div className="modal-footer">
          <button className="tb-btn" onClick={onClose}>Cancel</button>
          <button className={`tb-btn btn-primary ${saved ? 'saved' : ''}`} onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
