// The Last Train — the world: four carriages, the thief, patrolling guards with
// vision cones, sweeping cameras, glowing loot, the vault safe, smoke pellets
// and decoy coins, the alarm meter and the journey timer. Everything here is
// pure rules; render.js paints it and main.js drives it.
import { ALARM, CAMERA, CARRIAGES, GUARD, JOURNEY_SECONDS, LOOT, THIEF, TOOLS, TRAIN } from './config.js';
import { randomFloat } from './random.js';

export const EVENT_LOOT = 1;
export const EVENT_CRACKED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WON = 8;
export const EVENT_TIMEUP = 16;
export const EVENT_SMOKE = 32;
export const EVENT_DECOY = 64;
export const EVENT_SPOTTED = 128;

const CARRIAGE_STEP = TRAIN.carriageWidth + TRAIN.carriageGap;

export function carriageAt(x) {
  for (let i = 0; i < CARRIAGES.length; i += 1) {
    const left = TRAIN.x + i * CARRIAGE_STEP;
    const right = left + TRAIN.carriageWidth;
    if (x >= left - 2 && x < right + 2) return i;
  }
  return -1;
}

export function carriageBounds(i) {
  const left = TRAIN.x + i * CARRIAGE_STEP + 14;
  const right = TRAIN.x + i * CARRIAGE_STEP + TRAIN.carriageWidth - 14;
  return { left, right };
}

function makeGuard(random, carriage, label, patrolMargin, startRight, rightFraction) {
  const bounds = carriageBounds(carriage);
  const left = bounds.left + patrolMargin;
  // The vault-car security guard only patrols the left part of the car: the
  // corner by the great safe is a blind spot, so cracking it is tense but fair.
  const right = rightFraction === undefined
    ? bounds.right - patrolMargin
    : bounds.left + (bounds.right - bounds.left) * rightFraction;
  return {
    label,
    carriage,
    // The conductor starts at the far end of the luggage car, so the thief is
    // never caught in the doorway in the first seconds of a run.
    x: startRight ? right - 10 : randomFloat(random, left, right),
    y: TRAIN.floorY,
    facing: startRight ? -1 : random() < 0.5 ? -1 : 1,
    left,
    right,
    speed: GUARD.patrolSpeed,
    state: 'patrol', // patrol | chase | lured
    lureX: 0,
    lureTtl: 0,
    sweepPhase: random() * Math.PI * 2,
    seenFlash: 0,
  };
}

function makeCamera(random, carriage) {
  const bounds = carriageBounds(carriage);
  return {
    carriage,
    // The vault car's camera is mounted at the left end of the car, so its
    // cone never reaches the great safe in the far corner.
    x: carriage === 3 ? bounds.left + 20 : (bounds.left + bounds.right) / 2,
    y: TRAIN.y + 26,
    angle: 0,
    phase: random() * Math.PI * 2,
    sweepSpeed: CAMERA.sweepSpeed,
  };
}

function makeLoot(random, carriage, index) {
  const bounds = carriageBounds(carriage);
  const kinds = ['safe', 'case', 'bag'];
  return {
    carriage,
    kind: kinds[(carriage + index) % kinds.length],
    x: randomFloat(random, bounds.left + 40, bounds.right - 40),
    y: TRAIN.floorY,
    value: LOOT.smallValue,
    taken: false,
    glowPhase: random() * Math.PI * 2,
  };
}

export function createWorld(random) {
  const state = {
    thief: null,
    guards: [],
    cameras: [],
    loot: [],
    vault: null,
    alarm: 0,
    timeLeft: JOURNEY_SECONDS,
    elapsed: 0,
    scrollX: 0,
    lootTotal: 0,
    lootCount: 0,
    smoke: [],
    decoys: [],
    coins: [],
    smokeLeft: TOOLS.smokeStart,
    decoysLeft: TOOLS.decoyStart,
    vaultCracked: false,
    phase: 'play', // play | caught | won | timeup
    spotted: false,
    objective: 'Sneak through the train and crack the vault safe.',
    message: '',
    messageTtl: 0,
    best: 0,
  };

  function reset() {
    state.thief = {
      x: TRAIN.x + 22,
      y: TRAIN.floorY,
      onRoof: false,
      sneaking: false,
      facing: 1,
      crack: 0,
      bobPhase: 0,
    };
    state.guards = [
      makeGuard(random, 0, 'Conductor', 20, true),
      makeGuard(random, 1, 'Guard', 10),
      makeGuard(random, 2, 'Guard', 10),
      makeGuard(random, 3, 'Security', 30, false, 0.55),
    ];
    state.cameras = [0, 1, 2, 3].map((c) => makeCamera(random, c));
    state.loot = [];
    for (let c = 0; c < CARRIAGES.length; c += 1) {
      for (let i = 0; i < CARRIAGES[c].loot; i += 1) state.loot.push(makeLoot(random, c, i));
    }
    const vaultBounds = carriageBounds(3);
    state.vault = {
      x: vaultBounds.right - 34,
      y: TRAIN.floorY,
      cracked: false,
      crack: 0,
    };
    state.alarm = 0;
    state.timeLeft = JOURNEY_SECONDS;
    state.elapsed = 0;
    state.scrollX = 0;
    state.lootTotal = 0;
    state.lootCount = 0;
    state.smoke = [];
    state.decoys = [];
    state.coins = [];
    state.smokeLeft = TOOLS.smokeStart;
    state.decoysLeft = TOOLS.decoyStart;
    state.vaultCracked = false;
    state.phase = 'play';
    state.spotted = false;
    state.grace = 2.5; // opening seconds: the alarm cannot rise yet
    state.objective = 'Sneak through the train and crack the vault safe.';
    state.message = '';
    state.messageTtl = 0;
  }

  /** True when a straight look from (x1,y1) to (x2,y2) passes through smoke. */
  function blockedBySmoke(x1, y1, x2, y2) {
    for (const cloud of state.smoke) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq === 0 ? 0 : ((cloud.x - x1) * dx + (cloud.y - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const ddx = cloud.x - px;
      const ddy = cloud.y - py;
      if (ddx * ddx + ddy * ddy < cloud.radius * cloud.radius) return true;
    }
    return false;
  }

  function inCone(watcherX, watcherY, axisAngle, range, halfAngle, targetX, targetY, sneak) {
    const dx = targetX - watcherX;
    const dy = targetY - watcherY;
    const dist = Math.hypot(dx, dy);
    const limit = range * (sneak ? THIEF.sneakSpotFactor : 1);
    if (dist > limit || dist < 4) return false;
    let angle = Math.atan2(dy, dx) - axisAngle;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return Math.abs(angle) < halfAngle;
  }

  /** The great safe shields the thief: hugging it, a watcher on its far side
   * cannot see the thief at all. That is the one safe place to crack it. */
  function hiddenBySafe(watcherX) {
    const vault = state.vault;
    if (vault.cracked) return false;
    const thief = state.thief;
    return watcherX < vault.x - 40 && Math.abs(thief.x - vault.x) < 50 && !thief.onRoof;
  }

  function guardSeesThief(guard) {
    const thief = state.thief;
    if (thief.onRoof) return false;
    if (carriageAt(thief.x) !== guard.carriage) return false;
    if (hiddenBySafe(guard.x)) return false;
    const eyeY = guard.y - GUARD.height + 10;
    const sweep = Math.sin(guard.sweepPhase) * 0.35;
    const axis = guard.facing > 0 ? sweep : Math.PI - sweep;
    if (!inCone(guard.x, eyeY, axis, GUARD.coneRange, GUARD.coneHalfAngle, thief.x, thief.y - 22, thief.sneaking)) return false;
    return !blockedBySmoke(guard.x, eyeY, thief.x, thief.y - 22);
  }

  function cameraSeesThief(camera) {
    const thief = state.thief;
    if (thief.onRoof) return false;
    if (carriageAt(thief.x) !== camera.carriage) return false;
    if (hiddenBySafe(camera.x)) return false;
    const axis = Math.PI / 2 + Math.sin(camera.phase) * CAMERA.sweepArc;
    if (!inCone(camera.x, camera.y, axis, CAMERA.coneRange, CAMERA.coneHalfAngle, thief.x, thief.y - 22, thief.sneaking)) return false;
    return !blockedBySmoke(camera.x, camera.y, thief.x, thief.y - 22);
  }

  /** The ladder junctions between carriages: x positions the thief can climb at. */
  function nearLadder(x) {
    for (let i = 1; i < CARRIAGES.length; i += 1) {
      const junction = TRAIN.x + i * CARRIAGE_STEP - TRAIN.carriageGap / 2;
      if (Math.abs(x - junction) < 26) return junction;
    }
    return 0;
  }

  /** Would the thief be spotted standing at (x, onRoof) right now? Used by the
   * screenshot autopilot to read a cone before stepping into it. */
  function seenAt(x, onRoof, sneaking) {
    const thief = state.thief;
    const savedX = thief.x;
    const savedRoof = thief.onRoof;
    const savedSneak = thief.sneaking;
    thief.x = x;
    thief.onRoof = onRoof;
    thief.sneaking = sneaking;
    let seen = false;
    for (const guard of state.guards) {
      if (guardSeesThief(guard)) {
        seen = true;
        break;
      }
    }
    if (!seen) {
      for (const camera of state.cameras) {
        if (cameraSeesThief(camera)) {
          seen = true;
          break;
        }
      }
    }
    thief.x = savedX;
    thief.onRoof = savedRoof;
    thief.sneaking = savedSneak;
    return seen;
  }

  function step(dt, input, attract) {
    if (state.phase !== 'play') return 0;
    let events = 0;
    const thief = state.thief;
    state.elapsed += dt;
    state.timeLeft -= dt;
    state.scrollX += 130 * dt; // the night scenery slides past the windows
    if (state.messageTtl > 0) {
      state.messageTtl -= dt;
      if (state.messageTtl <= 0) state.message = '';
    }

    // --- the thief moves ---
    thief.sneaking = !!input.sneak;
    const speed = thief.onRoof ? THIEF.roofSpeed : thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
    if (input.dx !== 0) {
      thief.facing = input.dx > 0 ? 1 : -1;
      thief.x += input.dx * speed * dt;
      thief.bobPhase += dt * (thief.sneaking ? 6 : 11);
    }
    const minX = TRAIN.x + 8;
    const maxX = TRAIN.x + CARRIAGES.length * CARRIAGE_STEP - TRAIN.carriageGap - 8;
    thief.x = Math.max(minX, Math.min(maxX, thief.x));

    // Ladders at the carriage junctions: up climbs to the roof walkway, down drops back inside.
    const ladder = nearLadder(thief.x);
    if (ladder && input.up && !thief.onRoof) {
      thief.onRoof = true;
      thief.x = ladder;
    } else if (ladder && input.down && thief.onRoof) {
      thief.onRoof = false;
      thief.x = ladder;
    }
    thief.y = thief.onRoof ? TRAIN.roofY : TRAIN.floorY;

    // --- tools ---
    if (input.smoke && state.smokeLeft > 0 && state.lootTotal >= TOOLS.smokeCostLoot) {
      state.smokeLeft -= 1;
      state.lootTotal -= TOOLS.smokeCostLoot;
      state.smoke.push({ x: thief.x, y: (thief.onRoof ? TRAIN.roofY : TRAIN.floorY) - 22, radius: TOOLS.smokeRadius, ttl: TOOLS.smokeSeconds });
      events |= EVENT_SMOKE;
    }
    if (input.decoy && state.decoysLeft > 0) {
      state.decoysLeft -= 1;
      const targetX = input.decoyX !== undefined ? input.decoyX : thief.x + thief.facing * 160;
      const targetY = input.decoyY !== undefined ? input.decoyY : TRAIN.floorY;
      state.coins.push({ x: thief.x, y: (thief.onRoof ? TRAIN.roofY : TRAIN.floorY) - 30, vx: (targetX - thief.x) * 2.2, vy: -260, ttl: 6, landed: false, targetX, targetY });
      events |= EVENT_DECOY;
    }

    // --- smoke fades, coins fly and land ---
    for (const cloud of state.smoke) cloud.ttl -= dt;
    state.smoke = state.smoke.filter((c) => c.ttl > 0);
    for (const coin of state.coins) {
      if (!coin.landed) {
        coin.vy += 900 * dt;
        coin.x += coin.vx * dt;
        coin.y += coin.vy * dt;
        if (coin.y >= TRAIN.floorY - 4) {
          coin.y = TRAIN.floorY - 4;
          coin.landed = true;
          coin.ttl = TOOLS.decoyLureSeconds;
        }
      } else {
        coin.ttl -= dt;
      }
    }
    state.coins = state.coins.filter((c) => c.ttl > 0);

    // --- loot: walk over a glowing case to pocket it ---
    if (!thief.onRoof) {
      for (const item of state.loot) {
        if (!item.taken && Math.abs(item.x - thief.x) < 30) {
          item.taken = true;
          state.lootTotal += item.value;
          state.lootCount += 1;
          events |= EVENT_LOOT;
        }
      }
    }

    // --- the vault safe: hold E beside it to crack it ---
    const vault = state.vault;
    const nearVault = !thief.onRoof && Math.abs(vault.x - thief.x) < 46 && !vault.cracked;
    if (nearVault && input.interact) {
      vault.crack += dt;
      thief.crack = vault.crack / LOOT.crackSeconds;
      if (vault.crack >= LOOT.crackSeconds) {
        vault.cracked = true;
        state.vaultCracked = true;
        state.lootTotal += LOOT.vaultValue;
        state.lootCount += 1;
        state.objective = 'Vault cracked! Get back to the rear door and jump off.';
        state.message = 'VAULT CRACKED — $500! Now reach the rear door!';
        state.messageTtl = 4;
        events |= EVENT_CRACKED;
      }
    } else {
      vault.crack = Math.max(0, vault.crack - dt * 2);
      thief.crack = vault.crack / LOOT.crackSeconds;
    }

    // --- the getaway: the rear door, far left, once the vault is cracked ---
    if (state.vaultCracked && !thief.onRoof && thief.x <= TRAIN.x + 26 && input.interact) {
      state.phase = 'won';
      state.objective = 'You jumped clear with the loot as the train rolled on.';
      return events | EVENT_WON;
    }

    // --- guards patrol, chase, or walk to a decoy coin ---
    let seen = false;
    let seenRate = 0;
    for (const guard of state.guards) {
      guard.sweepPhase += dt * 0.9;
      guard.seenFlash = Math.max(0, guard.seenFlash - dt * 2);
      const landedCoin = state.coins.find((c) => c.landed && carriageAt(c.x) === guard.carriage);
      if (landedCoin) {
        guard.state = 'lured';
        guard.lureX = landedCoin.x;
        guard.lureTtl = landedCoin.ttl;
      } else if (guard.state === 'lured' && guard.lureTtl <= 0) {
        guard.state = 'patrol';
      }
      if (guard.state === 'lured') guard.lureTtl -= dt;
      if (guard.state === 'chase' && state.alarm < ALARM.chaseAt) guard.state = 'patrol';

      if (guard.state === 'lured') {
        const dir = guard.lureX > guard.x ? 1 : -1;
        guard.facing = dir;
        guard.x += dir * GUARD.patrolSpeed * 1.4 * dt;
        if (Math.abs(guard.lureX - guard.x) < 8) guard.x = guard.lureX;
      } else if (guard.state === 'chase') {
        const dir = thief.x > guard.x ? 1 : -1;
        guard.facing = dir;
        guard.x += dir * GUARD.chaseSpeed * dt;
        guard.x = Math.max(guard.left, Math.min(guard.right, guard.x));
        if (Math.abs(thief.x - guard.x) < 26 && !thief.onRoof) {
          state.phase = 'caught';
          state.objective = 'A guard grabbed you in the aisle.';
          return events | EVENT_CAUGHT;
        }
      } else {
        guard.x += guard.facing * guard.speed * dt;
        if (guard.x >= guard.right) {
          guard.x = guard.right;
          guard.facing = -1;
        } else if (guard.x <= guard.left) {
          guard.x = guard.left;
          guard.facing = 1;
        }
      }

      if (guardSeesThief(guard)) {
        seen = true;
        seenRate = Math.max(seenRate, GUARD.alarmRate * (guard.state === 'chase' ? 1.4 : 1));
        guard.seenFlash = 1;
      }
    }

    // --- cameras sweep ---
    for (const camera of state.cameras) {
      camera.phase += dt * camera.sweepSpeed;
      if (cameraSeesThief(camera)) {
        seen = true;
        seenRate = Math.max(seenRate, CAMERA.alarmRate);
      }
    }

    // --- the alarm meter ---
    state.spotted = seen && state.grace <= 0;
    if (state.grace > 0) state.grace -= dt;
    if (seen && state.grace <= 0) {
      state.alarm += seenRate * dt;
      events |= EVENT_SPOTTED;
    } else {
      state.alarm -= ALARM.decayPerSecond * dt;
    }
    state.alarm = Math.max(0, Math.min(ALARM.max, state.alarm));
    if (state.alarm >= ALARM.chaseAt) {
      for (const guard of state.guards) {
        if (guard.state === 'patrol' && carriageAt(thief.x) === guard.carriage && !thief.onRoof) guard.state = 'chase';
      }
    }
    if (state.alarm >= ALARM.max) {
      state.phase = 'caught';
      state.objective = 'The alarm hit the roof — security swarmed the car.';
      return events | EVENT_CAUGHT;
    }

    // --- the journey ends at the terminus ---
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.phase = 'timeup';
      state.objective = 'The train pulled into the terminus with you still aboard.';
      return events | EVENT_TIMEUP;
    }
    return events;
  }

  reset();
  return { state, reset, step, carriageAt, nearLadder, seenAt };
}
