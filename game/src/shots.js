// The screenshot scenes behind ?shot=cover|sneak|alarm|win. Each one plays the
// real rules forward from a fresh world, steered by an autopilot that reads the
// guards' cones before it steps (like a careful player), so the frame is what
// a short real game looks like and the same seed always gives the same frame.
import { STEP, TRAIN } from './config.js';
import { EVENT_CAUGHT, EVENT_WON } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const SAMPLE = STEP;
const CARRIAGE_STEP = TRAIN.carriageWidth + TRAIN.carriageGap;

/** The x of the ladder junction at the left edge of carriage `index`. */
function junctionX(index) {
  return TRAIN.x + index * CARRIAGE_STEP - TRAIN.carriageGap / 2;
}

/**
 * One autopilot decision: where the thief wants to go, whether to climb, and
 * whether to hold E. Careless pilots ignore cones entirely (they get caught);
 * careful pilots wait out a sweeping cone, sneak past guards, and take the
 * roof walkway for long legs between carriages.
 */
function autopilot(world, options) {
  const state = world.state;
  const thief = state.thief;
  const input = { dx: 0, sneak: false, up: false, down: false, interact: false, smoke: false, decoy: false };

  // Goal: the nearest loot still on the floor, then the vault safe, then the rear door.
  let goalX;
  if (!state.vaultCracked) {
    let loot = null;
    for (const item of state.loot) {
      if (item.taken) continue;
      if (loot === null || Math.abs(item.x - thief.x) < Math.abs(loot.x - thief.x)) loot = item;
    }
    goalX = loot ? loot.x : state.vault.x;
  } else {
    goalX = TRAIN.x + 20;
  }

  // Flee: a guard is chasing. On the roof the chase cannot follow, so run for
  // the nearest ladder and climb; up top, keep clear of the guard's carriage.
  let chaser = null;
  for (const guard of state.guards) {
    if (guard.state === 'chase') chaser = guard;
  }
  if (chaser) {
    if (!thief.onRoof) {
      const ladder = world.nearLadder(thief.x);
      if (ladder) {
        input.up = true;
        return input;
      }
      const nearest = [junctionX(1), junctionX(2), junctionX(3)].reduce((a, b) =>
        (Math.abs(b - thief.x) < Math.abs(a - thief.x) ? b : a));
      input.dx = nearest > thief.x ? 1 : -1;
      return input;
    }
    input.dx = thief.x > chaser.x ? 1 : -1;
    return input;
  }

  // The roof walkway is the fast, unseen route for long legs — but never for the cover shot.
  const goalCarriage = Math.max(0, Math.min(3, Math.floor((goalX - TRAIN.x) / CARRIAGE_STEP)));
  if (!options.noRoof && Math.abs(goalX - thief.x) > 320 && !thief.onRoof) {
    const ladder = world.nearLadder(thief.x);
    if (ladder) {
      input.up = true;
      return input;
    }
    const j1 = junctionX(1);
    const j2 = junctionX(2);
    const j3 = junctionX(3);
    const nearest = [j1, j2, j3].reduce((a, b) => (Math.abs(b - thief.x) < Math.abs(a - thief.x) ? b : a));
    input.dx = nearest > thief.x ? 1 : -1;
    return input;
  }
  if (thief.onRoof) {
    // Up here no cone can reach the thief, so let the heat die down before
    // dropping back inside.
    if (state.alarm > 40) return input;
    const target = junctionX(Math.max(1, goalCarriage));
    const near = Math.abs(thief.x - target) < 14;
    if (near && world.nearLadder(thief.x)) {
      input.down = true;
      return input;
    }
    input.dx = target > thief.x ? 1 : -1;
    return input;
  }

  // Inside: crack the safe or jump when the goal is reached.
  if (!state.vaultCracked && Math.abs(state.vault.x - thief.x) < 40) {
    // If a cone watches the safe, smoke it first — the cloud covers the crack.
    if (world.seenAt(state.vault.x, false, false) && state.smokeLeft > 0 && state.lootTotal >= 1 && state.smoke.length === 0) {
      input.smoke = true;
      return input;
    }
    input.interact = true;
    return input;
  }
  if (state.vaultCracked && thief.x <= TRAIN.x + 26) {
    input.interact = true;
    return input;
  }

  const wanted = goalX > thief.x + 6 ? 1 : goalX < thief.x - 6 ? -1 : 0;
  if (wanted === 0) return input;

  if (options.careless) {
    input.dx = wanted;
    return input;
  }

  // Sneak when a guard is close by in this carriage.
  let guardNear = false;
  for (const guard of state.guards) {
    if (Math.abs(guard.x - thief.x) < 280) guardNear = true;
  }
  input.sneak = guardNear;

  // Standing in a cone already: back away from the nearest guard first, never
  // stand still in the light hoping it sweeps away.
  if (world.seenAt(thief.x, false, guardNear)) {
    let nearestGuard = null;
    for (const guard of state.guards) {
      if (nearestGuard === null || Math.abs(guard.x - thief.x) < Math.abs(nearestGuard.x - thief.x)) nearestGuard = guard;
    }
    input.dx = nearestGuard && thief.x > nearestGuard.x ? 1 : -1;
    input.sneak = true;
    return input;
  }

  // The alarm is hot and a ladder is close: climb out to the roof and let it cool.
  if (state.alarm > 60 && !thief.onRoof) {
    const ladder = world.nearLadder(thief.x);
    if (ladder) {
      input.up = true;
      return input;
    }
    const junctions = [junctionX(1), junctionX(2), junctionX(3)];
    const nearest = junctions.reduce((a, b) => (Math.abs(b - thief.x) < Math.abs(a - thief.x) ? b : a));
    if (Math.abs(nearest - thief.x) < 140) {
      input.dx = nearest > thief.x ? 1 : -1;
      return input;
    }
  }

  // Read the next step: if it walks into a cone, wait for the sweep to pass.
  const stepSize = (guardNear ? 105 : 210) * SAMPLE;
  const nextX = thief.x + wanted * stepSize;
  if (world.seenAt(nextX, false, guardNear)) {
    // Smoke out if the alarm is already hot and we can afford it.
    if (state.alarm > 50 && state.smokeLeft > 0 && state.lootTotal >= 1) input.smoke = true;
    return input; // dx 0: hold position until the cone sweeps away
  }
  input.dx = wanted;
  return input;
}

function runFor(world, seconds, options) {
  let events = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    events = world.step(STEP, autopilot(world, options), false);
    if (events & (EVENT_CAUGHT | EVENT_WON)) break;
  }
  return events;
}

/**
 * Raise the alarm to `target` by standing under the nearest camera: its cone
 * sweeps across the thief in pulses, so the meter climbs without the guards
 * ever getting close enough to chase. Used to stage the cover and sneak
 * frames with a live, mid-range alarm meter.
 */
function peekIntoCone(world, target) {
  let camera = null;
  for (const c of world.state.cameras) {
    if (camera === null || Math.abs(c.x - world.state.thief.x) < Math.abs(camera.x - world.state.thief.x)) camera = c;
  }
  if (!camera) return;
  const walk = { dx: 0, sneak: false, up: false, down: false, interact: false, smoke: false, decoy: false };
  for (let i = 0; i < 300 && Math.abs(world.state.thief.x - camera.x) > 12 && world.state.phase === 'play'; i += 1) {
    walk.dx = camera.x > world.state.thief.x ? 1 : -1;
    world.step(STEP, walk, false);
  }
  const idle = { dx: 0, sneak: false, up: false, down: false, interact: false, smoke: false, decoy: false };
  for (let i = 0; i < 1500 && world.state.alarm < target && world.state.phase === 'play'; i += 1) {
    world.step(STEP, idle, false);
  }
}

/** Set `world` to the named scene and return the screen to draw over it. */
export function stageShot(name, world) {
  world.reset();
  if (name === 'cover') {
    // A short careful run through the first carriages — loot still glowing,
    // the thief mid-train — then a peek into a cone so the alarm meter reads
    // mid-range in the frame.
    runFor(world, 8, { noRoof: true });
    if (world.state.phase === 'play' && world.state.alarm < 28) peekIntoCone(world, 30);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'sneak') {
    // A careful run, then a peek until a cone first catches the thief, then a
    // beat of the dodge.
    runFor(world, 12, { noRoof: true });
    if (world.state.phase === 'play' && !world.state.spotted) {
      peekIntoCone(world, 15);
      for (let j = 0; j < 24 && world.state.phase === 'play'; j += 1) world.step(STEP, autopilot(world, {}), false);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // A hurried pilot that walks straight through the cones. If somehow the
    // run still ends in a getaway, reset and stand in the open in the dining
    // car until the patrols catch the thief out.
    runFor(world, 120, { careless: true });
    if (world.state.phase !== 'caught') {
      world.reset();
      runFor(world, 4, { noRoof: true, careless: true });
      const idle = { dx: 0, sneak: false, up: false, down: false, interact: false, smoke: false, decoy: false };
      for (let i = 0; i < 60 / STEP && world.state.phase === 'play'; i += 1) world.step(STEP, idle, false);
    }
    return { screen: world.state.phase === 'caught' ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    runFor(world, 145, {});
    return { screen: world.state.phase === 'won' ? SCREEN_WIN : SCREEN_PLAY, best: world.state.lootTotal };
  }
  // Anything else is the title screen over a live train.
  runFor(world, 4, { noRoof: true });
  return { screen: SCREEN_TITLE, best: 0 };
}
