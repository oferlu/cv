/**
 * Parse vMix XML state into a flat array of inputs.
 * vMix HTTP API returns XML like:
 *   <vmix><inputs>
 *     <input key="abc" number="1" type="Camera" title="Cam 1" duration="0" ... />
 *     <input key="xyz" number="3" type="Video"  title="clip.mp4" duration="30000" ... />
 *     <input key="pqr" number="5" type="VideoList" title="My List" duration="0" ...>
 *       <list>
 *         <item>C:\Videos\clip1.mp4</item>
 *         <item>C:\Videos\clip2.mp4</item>
 *       </list>
 *     </input>
 *   </inputs></vmix>
 */
export function parseVmixXML(xml) {
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xml, 'text/xml');

    // Detect XML parse errors (DOMParser returns an error document instead of throwing)
    if (doc.querySelector('parsererror')) return [];

    const results = [];
    const inputEls = doc.getElementsByTagName('input');

    for (let i = 0; i < inputEls.length; i++) {
      const el     = inputEls[i];
      const type   = el.getAttribute('type') || 'Camera';
      const number = parseInt(el.getAttribute('number'), 10);

      // Use the input NUMBER as the vMix command key — it's universally accepted
      // by all vMix API commands (ActiveInput, Play, Pause, etc.) across all
      // versions. GUIDs from the 'key' attribute work in modern vMix but cause
      // routing failures in some configurations.
      const inputKey = String(number);

      // Use only attributes for title — el.textContent includes child item filenames
      const title = el.getAttribute('title') || el.getAttribute('name') || `Input ${number}`;

      results.push({
        key:        inputKey,
        number,
        title,
        shortTitle: el.getAttribute('shortTitle') || title,
        type,
        durationMs: parseInt(el.getAttribute('duration'), 10) || 0,
        state:      el.getAttribute('state') || 'Running',
      });

      // Expand VideoList (real vMix) and List (legacy/mock) inputs.
      // Item filename lives in textContent: <item>C:\path\to\file.mp4</item>
      if (type === 'VideoList' || type === 'List') {
        const parentDurationMs = parseInt(el.getAttribute('duration'), 10) || 0;
        const itemEls = el.getElementsByTagName('item');

        for (let j = 0; j < itemEls.length; j++) {
          const item = itemEls[j];
          const rawPath = (item.textContent || '').trim()
                       || item.getAttribute('filename')
                       || item.getAttribute('name')
                       || `Item ${j + 1}`;
          const shortName = rawPath.split(/[\\/]/).pop(); // basename only
          if (!shortName) continue; // skip empty entries

          results.push({
            key:        `${inputKey}_item_${j}`,
            number,
            title:      `${title} - ${shortName}`,
            shortTitle: shortName,
            type:       'Video',
            durationMs: parseInt(item.getAttribute('duration'), 10) || 0,
            state:      'Paused',
            isListItem: true,
            listKey:    inputKey,  // parent's number string — used in SelectIndex + ActiveInput
            listIndex:  j,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}


// Map vMix input type → our category
const CAMERA_TYPES  = new Set(['Camera', 'NDI', 'Capture', 'Stream', 'VirtualSet', 'Mix', 'Colour']);
const MEDIA_TYPES   = new Set(['Video', 'DVD', 'MP4', 'AVI', 'WMV', 'MP3', 'Audio', 'List', 'VideoList']);
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
  { key: '8', number: 8, title: 'Lower Third',  shortTitle: 'L3',    type: 'Title', durationMs: 0 },
  { key: '9', number: 9, title: 'Slide 01.png', shortTitle: 'Slide', type: 'Image', durationMs: 0 },
  // Mock VideoList input (matches real vMix type="VideoList")
  { key: 'L1', number: 10, title: 'Playlist', shortTitle: 'Playlist', type: 'VideoList', durationMs: 0 },
  // Mock list items (pre-expanded — same shape parseVmixXML produces from real XML)
  { key: 'L1_item_0', number: 10, title: 'Playlist - bumper_open.mp4',  shortTitle: 'bumper_open',  type: 'Video', durationMs: 8000,  isListItem: true, listKey: 'L1', listIndex: 0 },
  { key: 'L1_item_1', number: 10, title: 'Playlist - segment_a.mp4',    shortTitle: 'segment_a',    type: 'Video', durationMs: 45000, isListItem: true, listKey: 'L1', listIndex: 1 },
  { key: 'L1_item_2', number: 10, title: 'Playlist - bumper_close.mp4', shortTitle: 'bumper_close', type: 'Video', durationMs: 6000,  isListItem: true, listKey: 'L1', listIndex: 2 },
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
