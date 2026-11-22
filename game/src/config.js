// The Last Train — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size. The train is four
// carriages seen from the side, a cutaway view: luggage, dining, sleeper, vault.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The journey: seconds from departure until the train reaches the terminus. */
export const JOURNEY_SECONDS = 150;

export const TRAIN = {
  x: 40, // left edge of the first carriage
  y: 150, // roof line of the carriages
  floorY: 560, // interior floor the thief and guards walk on
  roofY: 150, // walkway along the roof
  carriageWidth: 300,
  height: 410, // roof line to floor line
  carriageGap: 4,
};

// Carriages, left to right. The rear of the train (the getaway door) is at the
// far left of the luggage car; the vault car is at the far right.
export const CARRIAGES = [
  { name: 'Luggage Car', kind: 'luggage', loot: 2 },
  { name: 'Dining Car', kind: 'dining', loot: 2 },
  { name: 'Sleeper Car', kind: 'sleeper', loot: 2 },
  { name: 'Vault Car', kind: 'vault', loot: 1 },
];

export const THIEF = {
  width: 26,
  height: 44,
  walkSpeed: 210,
  sneakSpeed: 105,
  roofSpeed: 260,
  // Sneaking halves how far a guard or camera can spot the thief.
  sneakSpotFactor: 0.55,
};

export const GUARD = {
  width: 28,
  height: 48,
  patrolSpeed: 70,
  chaseSpeed: 165,
  // How far a guard's vision cone reaches, and its half-angle in radians.
  coneRange: 230,
  coneHalfAngle: 0.52,
  // Alarm per second while the thief is inside a guard's cone.
  alarmRate: 60,
};

export const CAMERA = {
  coneRange: 210,
  coneHalfAngle: 0.6,
  sweepSpeed: 0.55, // radians per second
  sweepArc: 0.85, // radians each side of straight down
  alarmRate: 55,
};

export const ALARM = {
  max: 100,
  decayPerSecond: 16, // falls while the thief is unseen
  chaseAt: 55, // guards start chasing above this
};

export const LOOT = {
  // The big vault safe, cracked by holding E beside it.
  vaultValue: 500,
  smallValue: 50,
  crackSeconds: 3,
};

export const TOOLS = {
  smokeStart: 3,
  smokeCostLoot: 1, // a smoke pellet costs 1 loot
  smokeRadius: 95,
  smokeSeconds: 4,
  decoyStart: 3,
  decoyThrowSpeed: 420,
  decoyLureSeconds: 3.5,
};

export const PALETTE = {
  sky: '#070b1d',
  skyLow: '#101736',
  moon: '#f5edd0',
  hillFar: '#131a33',
  hillNear: '#0c1226',
  trainBody: '#1c2340',
  trainRoof: '#232c52',
  trainTrim: '#c9a24b',
  windowGlow: '#ffd98a',
  windowDark: '#2a3358',
  floor: '#3a2f22',
  floorRoof: '#2c355e',
  wall: '#232c52',
  door: '#39447a',
  thief: '#e8e4d8',
  thiefCoat: '#20242e',
  guard: '#3f5a3a',
  guardUniform: '#46543f',
  cone: 'rgba(255, 214, 90, 0.20)',
  coneHot: 'rgba(255, 80, 60, 0.30)',
  cameraCone: 'rgba(120, 200, 255, 0.16)',
  loot: '#ffd94d',
  vault: '#d8b25e',
  smoke: 'rgba(200, 205, 220, 0.55)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  alarm: '#ff5340',
  alarmTrack: '#3a2028',
  panel: 'rgba(10, 14, 30, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best loot is kept between visits (this browser only). */
export const BEST_KEY = 'last-train.best-loot';
