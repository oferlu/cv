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
