/**
 * Parse vMix XML state into a flat array of inputs.
 * vMix HTTP API returns XML like:
 *   <vmix><inputs>
 *     <input key="abc" number="1" type="Camera" title="Cam 1" duration="0" ... />
 *     <input key="xyz" number="3" type="Video"  title="clip.mp4" duration="30000" ... />
 *   </inputs></vmix>
 */
export function parseVmixXML(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    return Array.from(doc.querySelectorAll('input')).map((el) => ({
      key:        el.getAttribute('key') || el.getAttribute('number'),
      number:     parseInt(el.getAttribute('number'), 10),
      title:      el.getAttribute('title') || el.textContent.trim(),
      shortTitle: el.getAttribute('shortTitle') || el.getAttribute('title'),
      type:       el.getAttribute('type') || 'Camera',
      durationMs: parseInt(el.getAttribute('duration'), 10) || 0,
      state:      el.getAttribute('state') || 'Running',
    }));
  } catch {
    return [];
  }
}

// Map vMix input type → our category
const CAMERA_TYPES  = new Set(['Camera', 'NDI', 'Capture', 'Stream', 'VirtualSet', 'Mix', 'Colour']);
const MEDIA_TYPES   = new Set(['Video', 'DVD', 'MP4', 'AVI', 'WMV', 'MP3', 'Audio', 'List']);
const GRAPHIC_TYPES = new Set(['Title', 'XAML', 'GT', 'Browser', 'PowerPoint', 'Image', 'Photos']);

export function inputCategory(vmixType) {
  if (CAMERA_TYPES.has(vmixType))  return 'general';
  if (MEDIA_TYPES.has(vmixType))   return 'media';
  if (GRAPHIC_TYPES.has(vmixType)) return 'graphics';
  return 'general';
}

// Map vMix type → our asset type (used for icon/styling)
export function inputAssetType(vmixType) {
  if (CAMERA_TYPES.has(vmixType))  return 'camera';
  if (MEDIA_TYPES.has(vmixType))   return 'clip';
  if (GRAPHIC_TYPES.has(vmixType)) return 'graphic';
  return 'camera';
}

// Mock inputs shown when not connected to vMix
export const MOCK_INPUTS = [
  { key: '1', number: 1, title: 'Camera 1',    shortTitle: 'Cam 1', type: 'Camera',  durationMs: 0 },
  { key: '2', number: 2, title: 'Camera 2',    shortTitle: 'Cam 2', type: 'Camera',  durationMs: 0 },
  { key: '3', number: 3, title: 'NDI Source',  shortTitle: 'NDI 1', type: 'NDI',     durationMs: 0 },
  { key: '4', number: 4, title: 'intro.mp4',   shortTitle: 'intro', type: 'Video',   durationMs: 22000 },
  { key: '5', number: 5, title: 'main_talk.mp4', shortTitle: 'talk', type: 'Video',  durationMs: 180000 },
  { key: '6', number: 6, title: 'b_roll.mp4',  shortTitle: 'broll', type: 'Video',   durationMs: 65000 },
  { key: '7', number: 7, title: 'bg_music.mp3', shortTitle: 'BGM',  type: 'Audio',   durationMs: 0 },
  { key: '8', number: 8, title: 'Lower Third', shortTitle: 'L3',   type: 'Title',   durationMs: 0 },
  { key: '9', number: 9, title: 'Slide 01.png', shortTitle: 'Slide',type: 'Image',   durationMs: 0 },
];

// ── Transitions ─────────────────────────────────────────────────────────────

/**
 * All transition effects built into every vMix installation.
 * These are always available regardless of what vMix has configured.
 */
export const STANDARD_TRANSITIONS = [
  { effect: 'Cut',               label: 'Cut',              defaultDuration: 0   },
  { effect: 'Fade',              label: 'Fade',             defaultDuration: 500 },
  { effect: 'Zoom',              label: 'Zoom',             defaultDuration: 500 },
  { effect: 'Wipe',              label: 'Wipe',             defaultDuration: 500 },
  { effect: 'Slide',             label: 'Slide',            defaultDuration: 500 },
  { effect: 'Fly',               label: 'Fly',              defaultDuration: 500 },
  { effect: 'CrossZoom',         label: 'Cross Zoom',       defaultDuration: 500 },
  { effect: 'FlyRotate',         label: 'Fly Rotate',       defaultDuration: 500 },
  { effect: 'Cube',              label: 'Cube',             defaultDuration: 500 },
  { effect: 'CubeZoom',         label: 'Cube Zoom',        defaultDuration: 500 },
  { effect: 'VerticalWipe',      label: 'Vertical Wipe',    defaultDuration: 500 },
  { effect: 'VerticalSlide',     label: 'Vertical Slide',   defaultDuration: 500 },
  { effect: 'Merge',             label: 'Merge',            defaultDuration: 500 },
  { effect: 'WipeReverse',       label: 'Wipe Reverse',     defaultDuration: 500 },
  { effect: 'SlideReverse',      label: 'Slide Reverse',    defaultDuration: 500 },
  { effect: 'VerticalWipeReverse',  label: 'V.Wipe Reverse',  defaultDuration: 500 },
  { effect: 'VerticalSlideReverse', label: 'V.Slide Reverse', defaultDuration: 500 },
];

/**
 * Parse the <transitions> block from vMix XML state.
 * Returns any Stinger or custom transitions configured in vMix buttons 1-4,
 * merged with the standard list (standard takes precedence for built-ins).
 *
 * vMix XML format:
 *   <transitions>
 *     <transition number="1" effect="Fade" duration="500" />
 *     <transition number="2" effect="Stinger1" duration="1000" />
 *   </transitions>
 */
export function parseVmixTransitions(xml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const configured = Array.from(doc.querySelectorAll('transition')).map((el) => ({
      effect:          el.getAttribute('effect') || '',
      label:           el.getAttribute('effect') || '',
      defaultDuration: parseInt(el.getAttribute('duration'), 10) || 500,
    })).filter((t) => t.effect);

    // Merge: start with standard list, add any custom stingers from vMix config
    const standardEffects = new Set(STANDARD_TRANSITIONS.map((t) => t.effect));
    const extras = configured.filter((t) => !standardEffects.has(t.effect));
    return [...STANDARD_TRANSITIONS, ...extras];
  } catch {
    return STANDARD_TRANSITIONS;
  }
}
