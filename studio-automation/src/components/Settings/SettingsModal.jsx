import React, { useState } from 'react';
import { useStore } from '../../store';
import './SettingsModal.css';

export default function SettingsModal({ onClose }) {
  const { vmix, setVmixHost, settings, updateSettings } = useStore();

  const [host, setHost]             = useState(vmix.host);
  const [port, setPort]             = useState(String(vmix.port));
  const [previewDelay, setPreviewDelay] = useState(String(settings.previewDelay));
  const [cameraDur, setCameraDur]   = useState(String(settings.cameraDuration / 1000));
  const [saved, setSaved]           = useState(false);

  const handleSave = () => {
    const parsedPort = parseInt(port, 10);
    const parsedDelay = parseInt(previewDelay, 10);
    const parsedCamDur = parseFloat(cameraDur);

    if (!host.trim() || isNaN(parsedPort)) return;

    setVmixHost(host.trim(), parsedPort);
    updateSettings({
      previewDelay: isNaN(parsedDelay) ? 1000 : parsedDelay,
      cameraDuration: isNaN(parsedCamDur) ? 5000 : Math.round(parsedCamDur * 1000),
    });

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
          {/* vMix Connection */}
          <section className="settings-section">
            <h3>vMix Connection</h3>
            <label className="settings-field">
              <span>IP Address</span>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" spellCheck={false} />
            </label>
            <label className="settings-field">
              <span>TCP Port</span>
              <input type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="8099" min="1" max="65535" />
            </label>
            <p className="settings-hint">
              Default: <code>127.0.0.1 : 8099</code> — same machine.<br />
              Change IP if vMix is on a different machine on your network.
            </p>
          </section>

          {/* Playback */}
          <section className="settings-section">
            <h3>Playback</h3>
            <label className="settings-field">
              <span>Preview Delay (ms)</span>
              <input type="number" value={previewDelay} onChange={(e) => setPreviewDelay(e.target.value)} min="0" max="10000" />
            </label>
            <p className="settings-hint">
              Time after an asset starts before the <em>next</em> asset is set to vMix Preview (Output 2).<br />
              Default: <code>1000</code> ms (1 second).
            </p>

            <label className="settings-field">
              <span>Camera Default Duration (seconds)</span>
              <input type="number" value={cameraDur} onChange={(e) => setCameraDur(e.target.value)} min="1" max="3600" step="0.5" />
            </label>
            <p className="settings-hint">
              How long a live camera asset plays before pausing. Default: <code>5</code> sec.
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
