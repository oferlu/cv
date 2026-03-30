import { create } from 'zustand';

export const useStore = create((set) => ({
  // ── vMix connection ────────────────────────────────────────────────────
  vmix: {
    connected: false,
    host: '127.0.0.1',
    port: 8099,
    tally: [],    // array of 0/1/2 per input (0=off, 1=program, 2=preview)
    state: null,  // raw XML string
  },
  setVmixConnected: (connected) =>
    set((s) => ({ vmix: { ...s.vmix, connected } })),
  setVmixHost: (host, port) =>
    set((s) => ({ vmix: { ...s.vmix, host, port } })),
  setVmixTally: (tally) =>
    set((s) => ({ vmix: { ...s.vmix, tally } })),
  setVmixState: (state) =>
    set((s) => ({ vmix: { ...s.vmix, state } })),

  // ── Timeline / Rundown ─────────────────────────────────────────────────
  rundown: {
    items: [
      { id: 1, label: 'intro_shot',   duration: 30,  type: 'intro',  color: 'var(--track-intro)' },
      { id: 2, label: 'main_talk',    duration: 180, type: 'main',   color: 'var(--track-main)'  },
      { id: 3, label: 'b_roll_v1',    duration: 90,  type: 'roll',   color: 'var(--track-roll)'  },
      { id: 4, label: 'main_talk (2)',duration: 120, type: 'main',   color: 'var(--track-main)'  },
    ],
    activeId: null,
    elapsed: 0,
  },
  setActiveRundownItem: (id) =>
    set((s) => ({ rundown: { ...s.rundown, activeId: id } })),
  setElapsed: (elapsed) =>
    set((s) => ({ rundown: { ...s.rundown, elapsed } })),

  // ── Devices ────────────────────────────────────────────────────────────
  devices: [
    { id: 'vmix1',  name: 'vMix',       type: 'vmix',    status: 'disconnected' },
    { id: 'atem1',  name: 'ATEM Mini',  type: 'atem',    status: 'disconnected' },
    { id: 'obs1',   name: 'OBS Studio', type: 'obs',     status: 'disconnected' },
  ],
  setDeviceStatus: (id, status) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, status } : d)),
    })),

  // ── Media Library ──────────────────────────────────────────────────────
  media: [
    { id: 1, name: 'intro_shot.mp4',  type: 'VID', duration: '0:22' },
    { id: 2, name: 'main_talk.mp4',   type: 'VID', duration: '0:18' },
    { id: 3, name: 'b_roll_01.mp4',   type: 'SFX', duration: '1:05' },
    { id: 4, name: 'bg_music.mp3',    type: 'AUD', duration: 'loop' },
    { id: 5, name: 'slide_01.png',    type: 'IMG', duration: '—'    },
  ],

  // ── Clock / Show timer ─────────────────────────────────────────────────
  showClock: { running: false, seconds: 0 },
  setShowClock: (clock) => set({ showClock: clock }),
}));
