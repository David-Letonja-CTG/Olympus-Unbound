import type { CutsceneDefinition } from '../../engine';

const FIRE = { radius: 220, color: 0xff8a3d, intensity: 0.9, flicker: 0.35 };
const DIVINE = { radius: 170, color: 0xfff1b0, intensity: 0.8 };

/**
 * The opening scene (spec: intro-cutscene): Olympus at night, the hordes breaking through, the gods falling, and
 * Zeus taking up the storm. Positions are relative to the arena's central plaza. Original story text.
 */
export const INTRO: CutsceneDefinition = {
  id: 'intro',
  realmId: 'mount_olympus',
  seed: 1977,
  duration: 54,
  ambient: 0.38,
  captions: [
    { at: 1.5, duration: 5, text: 'OLYMPUS UNBOUND', style: 'title' },
    { at: 7, duration: 6, text: 'For an age beyond counting, the gods kept the mountain.' },
    {
      at: 14,
      duration: 6.5,
      text: 'Then the old darkness woke beneath the world — and it came for Olympus.',
    },
    {
      at: 22,
      duration: 6.5,
      text: 'The gates broke. The temples burned. One by one, the gods fell.',
    },
    { at: 31, duration: 4.5, text: 'Only the Thunderer remained.' },
    { at: 36.5, duration: 6.5, text: 'Bound no longer by oath or throne, Zeus took up the storm.' },
    { at: 45, duration: 7, text: 'Unleash the gods. Survive the divine war.', style: 'title' },
  ],
  cues: [
    // The council at the altar.
    { at: 0, type: 'camera', x: 0, y: 30, zoom: 1.45, duration: 0 },
    { at: 0, type: 'fade', to: 1, duration: 3.5 },
    {
      at: 0,
      type: 'spawn',
      actor: { id: 'zeus', sprite: 'zeus', x: 0, y: 0, scale: 1.3, light: DIVINE },
    },
    {
      at: 0,
      type: 'spawn',
      actor: {
        id: 'warrior',
        sprite: 'ally_warrior',
        x: -110,
        y: 40,
        scale: 1.25,
        facing: 'right',
      },
    },
    {
      at: 0,
      type: 'spawn',
      actor: { id: 'maiden', sprite: 'ally_maiden', x: 110, y: 40, scale: 1.25, facing: 'left' },
    },
    {
      at: 0,
      type: 'spawn',
      actor: { id: 'smith', sprite: 'ally_smith', x: 0, y: 120, scale: 1.25 },
    },
    { at: 0, type: 'light', id: 'altar', x: 0, y: 60, light: FIRE },
    { at: 1, type: 'camera', x: 0, y: 10, zoom: 1.3, duration: 9 },

    // Something stirs in the north.
    { at: 10, type: 'sound', cue: 'bossRoar' },
    { at: 10, type: 'shake', duration: 1.2, intensity: 0.006 },
    { at: 11, type: 'camera', x: 0, y: -520, zoom: 0.95, duration: 4 },
    {
      at: 11,
      type: 'horde',
      sprite: 'satyr',
      count: 22,
      fromX: 0,
      fromY: -1150,
      toX: 0,
      toY: -380,
      spread: 260,
      duration: 10,
    },
    {
      at: 12.5,
      type: 'horde',
      sprite: 'corrupted_hoplite',
      count: 10,
      fromX: 0,
      fromY: -1250,
      toX: 0,
      toY: -470,
      spread: 200,
      duration: 10,
    },
    { at: 13, type: 'light', id: 'gate_fire_w', x: -300, y: -620, light: FIRE },
    { at: 13.6, type: 'light', id: 'gate_fire_e', x: 300, y: -640, light: FIRE },
    { at: 13, type: 'burst', x: -300, y: -620, color: 0xff7a2e, count: 30 },
    { at: 13.6, type: 'burst', x: 300, y: -640, color: 0xff7a2e, count: 30 },
    {
      at: 15,
      type: 'horde',
      sprite: 'harpy',
      count: 14,
      fromX: -900,
      fromY: -500,
      toX: -260,
      toY: -180,
      spread: 200,
      duration: 9,
    },
    {
      at: 16,
      type: 'horde',
      sprite: 'harpy',
      count: 14,
      fromX: 900,
      fromY: -520,
      toX: 260,
      toY: -200,
      spread: 200,
      duration: 9,
    },

    // The gods stand and fall.
    { at: 19, type: 'camera', x: 0, y: -60, zoom: 1.15, duration: 3 },
    { at: 19.5, type: 'move', actor: 'warrior', x: -150, y: -150, duration: 2 },
    { at: 19.5, type: 'move', actor: 'maiden', x: 150, y: -150, duration: 2 },
    { at: 21, type: 'strike', x: -180, y: -300, radius: 90 },
    { at: 21.6, type: 'strike', x: 170, y: -320, radius: 90 },
    {
      at: 23,
      type: 'horde',
      sprite: 'marble_sentinel',
      count: 4,
      fromX: 0,
      fromY: -900,
      toX: 0,
      toY: -260,
      spread: 220,
      duration: 7,
    },
    { at: 24.5, type: 'remove', actor: 'warrior', color: 0xc0392b },
    { at: 24.5, type: 'sound', cue: 'impact' },
    { at: 26.5, type: 'remove', actor: 'maiden', color: 0x4fb3e8 },
    { at: 26.5, type: 'sound', cue: 'impact' },
    { at: 27, type: 'move', actor: 'smith', x: 0, y: -90, duration: 1.5 },
    { at: 28.8, type: 'remove', actor: 'smith', color: 0xd9b27c },
    { at: 28.8, type: 'sound', cue: 'impact' },
    { at: 28.8, type: 'shake', duration: 0.5, intensity: 0.008 },

    // Only the Thunderer remains.
    { at: 30, type: 'camera', x: 0, y: -10, zoom: 1.75, duration: 4 },
    { at: 34, type: 'sound', cue: 'charge' },
    {
      at: 35,
      type: 'light',
      id: 'storm',
      x: 0,
      y: 0,
      light: { radius: 420, color: 0xbfe6ff, intensity: 1 },
    },
    { at: 35.2, type: 'strike', x: 0, y: 0, radius: 60 },
    { at: 35.5, type: 'shake', duration: 0.8, intensity: 0.01 },

    // The storm answers.
    { at: 37, type: 'camera', x: 0, y: -260, zoom: 1.05, duration: 3 },
    { at: 38, type: 'strike', x: -120, y: -320, radius: 140 },
    { at: 38.5, type: 'strike', x: 140, y: -360, radius: 140 },
    { at: 39, type: 'strike', x: 0, y: -460, radius: 160 },
    { at: 39.6, type: 'strike', x: -260, y: -220, radius: 160 },
    { at: 40.1, type: 'strike', x: 260, y: -240, radius: 160 },
    { at: 40.6, type: 'strike', x: 0, y: -260, radius: 220 },
    { at: 41.2, type: 'strike', x: -150, y: -560, radius: 200 },
    { at: 41.8, type: 'strike', x: 150, y: -560, radius: 200 },
    // The last of them, wherever they stand.
    { at: 42.3, type: 'strike', x: -270, y: -170, radius: 200 },
    { at: 42.6, type: 'strike', x: 270, y: -190, radius: 200 },
    { at: 42.9, type: 'strike', x: -120, y: -120, radius: 170 },
    { at: 43.2, type: 'strike', x: 120, y: -130, radius: 170 },
    { at: 43.5, type: 'strike', x: -60, y: -400, radius: 220 },
    { at: 43.8, type: 'strike', x: 80, y: -420, radius: 220 },
    { at: 42, type: 'shake', duration: 1, intensity: 0.012 },

    // Unbound.
    { at: 44, type: 'camera', x: 0, y: -40, zoom: 0.85, duration: 6 },
    { at: 51.5, type: 'fade', to: 0, duration: 2.5 },
  ],
};
