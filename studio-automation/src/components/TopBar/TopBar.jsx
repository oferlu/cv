import React, { useEffect, useRef } from 'react';
import { useStore } from '../../store';
import './TopBar.css';

function formatTime(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function TopBar() {
  const { showClock, setShowClock, rundown, setElapsed } = useStore();
  const intervalRef = useRef(null);

  const toggleClock = () => {
    setShowClock({ ...showClock, running: !showClock.running });
  };

  const resetClock = () => {
    setShowClock({ running: false, seconds: 0 });
    setElapsed(0);
  };

  useEffect(() => {
    if (showClock.running) {
      intervalRef.current = setInterval(() => {
        setShowClock((prev) => ({ ...prev, seconds: prev.seconds + 1 }));
        setElapsed(rundown.elapsed + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [showClock.running]); // eslint-disable-line

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-label">SHOW CLOCK</span>
        <span className="topbar-clock">{formatTime(showClock.seconds)}</span>
        <button className={`tb-btn ${showClock.running ? 'active' : ''}`} onClick={toggleClock}>
          {showClock.running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button className="tb-btn" onClick={resetClock}>↺ Reset</button>
      </div>

      <div className="topbar-center">
        <span className="topbar-label">Item Countdown</span>
        <span className="topbar-countdown">00:31:05</span>
      </div>

      <div className="topbar-right">
        <VmixStatus />
      </div>
    </header>
  );
}

function VmixStatus() {
  const { vmix, setVmixConnected, setVmixTally, setVmixState } = useStore();

  useEffect(() => {
    if (!window.studioAPI) return;
    const api = window.studioAPI.vmix;
    api.onConnected(() => setVmixConnected(true));
    api.onDisconnected(() => setVmixConnected(false));
    api.onTally((t) => setVmixTally(t));
    api.onState((s) => setVmixState(s));
    return () => {
      ['vmix:connected','vmix:disconnected','vmix:tally','vmix:state']
        .forEach((ch) => api.removeAllListeners(ch));
    };
  }, []); // eslint-disable-line

  const connect = async () => {
    if (!window.studioAPI) return;
    await window.studioAPI.vmix.connect(vmix.host, vmix.port);
  };

  return (
    <div className="vmix-status">
      <span className={`status-dot ${vmix.connected ? 'on' : 'off'}`} />
      <span>vMix</span>
      {!vmix.connected && (
        <button className="tb-btn" onClick={connect}>Connect</button>
      )}
    </div>
  );
}
