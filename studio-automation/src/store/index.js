import { create } from 'zustand';
import { STANDARD_TRANSITIONS } from '../utils/vmixParser';

let _id = 1;
const uid = () => `id_${++_id}_${Date.now()}`;

const newTrack = (n) => ({ id: uid(), name: `Track ${n}`, assets: [] });

export const useStore = create((set) => ({
  // ── View ─────────────────────────────────────────────────────────────────
  view: 'rundown', // 'rundown' | 'script'
  setView: (view) => set({ view }),

  // ── vMix connection ───────────────────────────────────────────────────────
  vmix: { connected: false, host: '127.0.0.1', port: 8099, tally: [] },
  setVmixConnected: (connected) => set((s) => ({ vmix: { ...s.vmix, connected } })),
  setVmixHost: (host, port) => set((s) => ({ vmix: { ...s.vmix, host, port } })),
  setVmixTally: (tally) => set((s) => ({ vmix: { ...s.vmix, tally } })),

  // ── vMix inputs (fetched on connect) ─────────────────────────────────────
  vmixInputs: [],
  setVmixInputs: (inputs) => set({ vmixInputs: inputs }),

  // ── vMix transitions — seeded immediately so gap dropdowns work offline ──
  vmixTransitions: STANDARD_TRANSITIONS, // augmented with stingers on vMix connect
  setVmixTransitions: (transitions) => set({ vmixTransitions: transitions }),

  // ── Tracks ────────────────────────────────────────────────────────────────
  tracks: [newTrack(1)],

  addTrack: () => set((s) => {
    const n = s.tracks.length + 1;
    return { tracks: [...s.tracks, newTrack(n)] };
  }),

  renameTrack: (id, name) => set((s) => ({
    tracks: s.tracks.map((t) => (t.id === id ? { ...t, name } : t)),
  })),

  removeTrack: (id) => set((s) => ({
    tracks: s.tracks.filter((t) => t.id !== id),
  })),

  addAssetToTrack: (trackId, assetData, insertAfterIdx = -1) => set((s) => ({
    tracks: s.tracks.map((t) => {
      if (t.id !== trackId) return t;
      const asset = { ...assetData, id: uid() };
      const assets = [...t.assets];
      insertAfterIdx >= 0 ? assets.splice(insertAfterIdx + 1, 0, asset) : assets.push(asset);
      return { ...t, assets };
    }),
  })),

  removeAssetFromTrack: (trackId, assetId) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id !== trackId ? t : { ...t, assets: t.assets.filter((a) => a.id !== assetId) }
    ),
  })),

  // Update the transition on the gap BEFORE this asset
  updateAssetTransition: (trackId, assetId, transition, transitionDuration) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id !== trackId ? t : {
        ...t,
        assets: t.assets.map((a) =>
          a.id !== assetId ? a : { ...a, transition, transitionDuration }
        ),
      }
    ),
  })),

  // ── Zoom / Scroll ─────────────────────────────────────────────────────────
  zoom: 40, // px per second
  setZoom: (z) => set({ zoom: Math.max(5, Math.min(400, z)) }),

  rulerScrollLeft: 0,
  setRulerScrollLeft: (x) => set({ rulerScrollLeft: x }),

  // Update duration of an asset in a track (used by resize handles)
  updateAssetDuration: (trackId, assetId, durationMs) => set((s) => ({
    tracks: s.tracks.map((t) =>
      t.id !== trackId ? t : {
        ...t,
        assets: t.assets.map((a) =>
          a.id !== assetId ? a : { ...a, durationMs: Math.max(500, durationMs) }
        ),
      }
    ),
  })),

  // Move an asset between tracks or reorder within a track
  moveAsset: (fromTrackId, assetId, toTrackId, insertAfterIdx) => set((s) => {
    const fromTrack = s.tracks.find((t) => t.id === fromTrackId);
    const asset = fromTrack?.assets.find((a) => a.id === assetId);
    if (!asset) return s;

    const tracks = s.tracks.map((t) => {
      if (t.id === fromTrackId && t.id === toTrackId) {
        // Same track — reorder
        const assets = t.assets.filter((a) => a.id !== assetId);
        const insertIdx = insertAfterIdx >= 0 ? insertAfterIdx : assets.length;
        // Adjust for the removed element
        const adjusted = assets.indexOf(asset) <= insertAfterIdx ? insertIdx - 1 : insertIdx;
        assets.splice(Math.max(0, adjusted + 1), 0, asset);
        return { ...t, assets };
      }
      if (t.id === fromTrackId) return { ...t, assets: t.assets.filter((a) => a.id !== assetId) };
      if (t.id === toTrackId) {
        const assets = [...t.assets];
        insertAfterIdx >= 0 ? assets.splice(insertAfterIdx + 1, 0, asset) : assets.push(asset);
        return { ...t, assets };
      }
      return t;
    });
    return { tracks };
  }),

  // ── Playback ──────────────────────────────────────────────────────────────
  playback: {
    activeTrackId: null,
    activeAssetIdx: -1,
    playing: false,
    pausedBetween: false, // paused at gap between assets — waiting for Continue
    trackDone: false,     // last asset of track finished
    elapsedMs: 0,
  },
  setPlayback: (update) => set((s) => ({
    playback: typeof update === 'function' ? update(s.playback) : { ...s.playback, ...update },
  })),

  // ── Script ────────────────────────────────────────────────────────────────
  scriptItems: [{ id: uid(), type: 'text', content: '' }],
  setScriptItems: (items) => set({ scriptItems: items }),
  updateScriptText: (id, content) => set((s) => ({
    scriptItems: s.scriptItems.map((i) => (i.id === id ? { ...i, content } : i)),
  })),
  addScriptAsset: (afterId, assetData) => set((s) => {
    const idx = s.scriptItems.findIndex((i) => i.id === afterId);
    const items = [...s.scriptItems];
    items.splice(idx + 1, 0,
      { id: uid(), type: 'asset', ...assetData },
      { id: uid(), type: 'text', content: '' }
    );
    return { scriptItems: items };
  }),
  removeScriptItem: (id) => set((s) => ({
    scriptItems: s.scriptItems.filter((i) => i.id !== id),
  })),

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    previewDelay: 1000,    // ms after asset starts before setting next to Preview
    cameraDuration: 5000,  // default duration for live camera assets (ms)
  },
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  // ── Show clock ────────────────────────────────────────────────────────────
  showClock: { running: false, seconds: 0 },
  setShowClock: (update) => set((s) => ({
    showClock: typeof update === 'function' ? update(s.showClock) : { ...s.showClock, ...update },
  })),
}));
