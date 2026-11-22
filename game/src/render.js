// The Last Train — paints the world on a 2D canvas: the night rushing past the
// windows, the four carriages in cutaway, the thief, the guards and their
// vision cones, the sweeping cameras, glowing loot, the alarm meter and the
// title / caught / getaway screens.
import { ALARM, CAMERA, CARRIAGES, FIELD, FONT, GUARD, JOURNEY_SECONDS, LOOT, PALETTE, THIEF, TOOLS, TRAIN } from './config.js';
import { createRandom } from './random.js';
import { carriageBounds } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const CARRIAGE_STEP = TRAIN.carriageWidth + TRAIN.carriageGap;

// Stars and hills are fixed for the life of the page, so the night never flickers.
const starRandom = createRandom(20261122);
const STARS = [];
for (let i = 0; i < 110; i += 1) STARS.push({ x: starRandom() * 1600, y: starRandom() * 170, r: 0.5 + starRandom() * 1.3, tw: starRandom() * Math.PI * 2 });
const HILLS_FAR = [];
for (let i = 0; i < 14; i += 1) HILLS_FAR.push({ x: i * 170, w: 120 + starRandom() * 120, h: 30 + starRandom() * 55 });
const HILLS_NEAR = [];
for (let i = 0; i < 12; i += 1) HILLS_NEAR.push({ x: i * 210, w: 150 + starRandom() * 130, h: 45 + starRandom() * 60 });

function conePath(ctx, x, y, axis, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, axis - halfAngle, axis + halfAngle);
  ctx.closePath();
}

function drawScenery(ctx, state) {
  const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  sky.addColorStop(0, PALETTE.sky);
  sky.addColorStop(0.55, PALETTE.skyLow);
  sky.addColorStop(1, '#1a1430');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Stars, drifting slowly with the train's motion.
  for (const star of STARS) {
    const sx = ((star.x - state.scrollX * 0.04) % 1600 + 1600) % 1600 - 160;
    const twinkle = 0.55 + 0.45 * Math.sin(state.elapsed * 2 + star.tw);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#dfe6ff';
    ctx.fillRect(sx, star.y, star.r, star.r);
  }
  ctx.globalAlpha = 1;

  // The moon, high and nearly still, clear of the HUD bar.
  const moonX = 100 - (state.scrollX * 0.01) % 40;
  ctx.fillStyle = PALETTE.moon;
  ctx.beginPath();
  ctx.arc(moonX, 102, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190, 180, 150, 0.5)';
  ctx.beginPath();
  ctx.arc(moonX - 9, 93, 6, 0, Math.PI * 2);
  ctx.arc(moonX + 7, 110, 4, 0, Math.PI * 2);
  ctx.fill();

  // Two ridges of hills, nearer ones sliding faster.
  ctx.fillStyle = PALETTE.hillFar;
  for (const hill of HILLS_FAR) {
    const hx = ((hill.x - state.scrollX * 0.15) % 2400 + 2400) % 2400 - 240;
    ctx.beginPath();
    ctx.moveTo(hx, 430);
    ctx.quadraticCurveTo(hx + hill.w / 2, 430 - hill.h, hx + hill.w, 430);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.hillNear;
  for (const hill of HILLS_NEAR) {
    const hx = ((hill.x - state.scrollX * 0.35) % 2520 + 2520) % 2520 - 240;
    ctx.beginPath();
    ctx.moveTo(hx, 470);
    ctx.quadraticCurveTo(hx + hill.w / 2, 470 - hill.h, hx + hill.w, 470);
    ctx.closePath();
    ctx.fill();
  }

  // Telegraph poles flashing past, fastest of all.
  ctx.strokeStyle = '#05070f';
  ctx.lineWidth = 5;
  for (let i = 0; i < 9; i += 1) {
    const px = ((i * 260 - state.scrollX * 1.0) % 2340 + 2340) % 2340 - 260;
    ctx.beginPath();
    ctx.moveTo(px, 430);
    ctx.lineTo(px, 300);
    ctx.moveTo(px - 26, 318);
    ctx.lineTo(px + 26, 318);
    ctx.stroke();
  }
}

function drawCarriageFurniture(ctx, carriage, index) {
  const bounds = carriageBounds(index);
  const floorY = TRAIN.floorY;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  if (carriage.kind === 'luggage') {
    // Stacked trunks and suitcases along the wall.
    for (let i = 0; i < 4; i += 1) {
      const lx = bounds.left + 30 + i * 62;
      ctx.fillStyle = i % 2 ? '#5a4632' : '#6b543a';
      ctx.fillRect(lx, floorY - 46 - (i % 2) * 22, 52, 46 + (i % 2) * 22);
      ctx.fillStyle = PALETTE.trainTrim;
      ctx.fillRect(lx, floorY - 24 - (i % 2) * 22, 52, 4);
    }
  } else if (carriage.kind === 'dining') {
    // Round tables with lamps and chairs.
    for (let i = 0; i < 3; i += 1) {
      const tx = bounds.left + 55 + i * 88;
      ctx.fillStyle = '#4a3423';
      ctx.fillRect(tx - 4, floorY - 34, 8, 34);
      ctx.beginPath();
      ctx.ellipse(tx + 22, floorY - 34, 30, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#6b4a2f';
      ctx.fill();
      ctx.fillStyle = PALETTE.windowGlow;
      ctx.beginPath();
      ctx.arc(tx + 22, floorY - 52, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c2a1c';
      ctx.fillRect(tx + 44, floorY - 22, 14, 22);
    }
  } else if (carriage.kind === 'sleeper') {
    // Bunk beds with curtains and pillows.
    for (let i = 0; i < 3; i += 1) {
      const bx = bounds.left + 34 + i * 86;
      ctx.fillStyle = '#31405e';
      ctx.fillRect(bx, floorY - 58, 74, 58);
      ctx.fillStyle = '#24304a';
      ctx.fillRect(bx, floorY - 30, 74, 4);
      ctx.fillStyle = '#d8cfb8';
      ctx.fillRect(bx + 6, floorY - 56, 20, 12);
      ctx.fillStyle = '#7a2f35';
      ctx.fillRect(bx, floorY - 58, 74, 8);
    }
  } else {
    // Vault car: the great safe, rivets and all.
    const vx = bounds.right - 34;
    ctx.fillStyle = '#20242e';
    ctx.fillRect(vx - 46, floorY - 118, 92, 118);
    ctx.fillStyle = PALETTE.vault;
    ctx.fillRect(vx - 46, floorY - 118, 92, 8);
    ctx.beginPath();
    ctx.arc(vx, floorY - 62, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#8a6d2f';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(vx, floorY - 62, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#d8b25e';
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.fillRect(vx - 3, floorY - 74, 6, 24);
    for (let i = 0; i < 4; i += 1) {
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(vx - 40, floorY - 110 + i * 26, 6, 6);
      ctx.fillRect(vx + 34, floorY - 110 + i * 26, 6, 6);
    }
  }
}

function drawTrain(ctx, state) {
  const top = TRAIN.y;
  const floorY = TRAIN.floorY;

  // Roof and the walkway along it.
  ctx.fillStyle = PALETTE.trainRoof;
  ctx.fillRect(TRAIN.x - 6, top - 10, CARRIAGES.length * CARRIAGE_STEP + 6, 22);
  ctx.fillStyle = PALETTE.trainTrim;
  ctx.fillRect(TRAIN.x - 6, top + 10, CARRIAGES.length * CARRIAGE_STEP + 6, 3);
  // Roof hatch ladders at each junction.
  for (let i = 1; i < CARRIAGES.length; i += 1) {
    const jx = TRAIN.x + i * CARRIAGE_STEP - TRAIN.carriageGap / 2;
    ctx.strokeStyle = PALETTE.trainTrim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(jx - 8, top + 12);
    ctx.lineTo(jx - 8, floorY);
    ctx.moveTo(jx + 8, top + 12);
    ctx.lineTo(jx + 8, floorY);
    ctx.stroke();
    ctx.fillStyle = PALETTE.trainTrim;
    for (let r = 0; r < 8; r += 1) ctx.fillRect(jx - 8, top + 22 + r * 48, 16, 3);
  }

  // Carriage bodies.
  for (let i = 0; i < CARRIAGES.length; i += 1) {
    const left = TRAIN.x + i * CARRIAGE_STEP;
    const right = left + TRAIN.carriageWidth;
    ctx.fillStyle = PALETTE.trainBody;
    ctx.fillRect(left, top + 12, TRAIN.carriageWidth, floorY - top - 12);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(left, top + 12, TRAIN.carriageWidth, 10);
    // Windows: warm lamplight inside, a slice of night sky at the top and a
    // dark hill sliding past at the bottom.
    for (let w = 0; w < 3; w += 1) {
      const wx = left + 22 + w * 92;
      ctx.fillStyle = PALETTE.windowGlow;
      ctx.fillRect(wx, top + 40, 64, 54);
      ctx.fillStyle = 'rgba(16, 22, 48, 0.9)';
      ctx.fillRect(wx, top + 40, 64, 16);
      ctx.fillStyle = '#241d33';
      ctx.beginPath();
      ctx.moveTo(wx, top + 94);
      ctx.quadraticCurveTo(wx + 32, top + 78, wx + 64, top + 94);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.trainBody;
      ctx.fillRect(wx + 30, top + 40, 4, 54);
    }
    // Carriage name plate.
    ctx.fillStyle = PALETTE.trainTrim;
    ctx.font = '600 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(CARRIAGES[i].name.toUpperCase(), (left + right) / 2, top + 116);
    // Sliding doors between carriages.
    if (i < CARRIAGES.length - 1) {
      ctx.fillStyle = PALETTE.door;
      ctx.fillRect(right - 2, top + 120, 8, floorY - top - 120);
      ctx.fillStyle = PALETTE.trainTrim;
      ctx.fillRect(right + 1, top + 120, 2, floorY - top - 120);
    }
    // Interior floor.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(left, floorY - 6, TRAIN.carriageWidth, 10);
    drawCarriageFurniture(ctx, CARRIAGES[i], i);
  }

  // The rear getaway door, far left, glowing green once the vault is cracked.
  ctx.fillStyle = state.vaultCracked ? '#3fae5a' : PALETTE.door;
  ctx.fillRect(TRAIN.x + 2, TRAIN.floorY - 150, 26, 150);
  ctx.fillStyle = '#d8cfb8';
  ctx.font = '700 11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', TRAIN.x + 15, TRAIN.floorY - 158);
  if (state.vaultCracked) {
    ctx.fillStyle = 'rgba(63, 174, 90, 0.25)';
    ctx.fillRect(TRAIN.x - 8, TRAIN.floorY - 160, 46, 170);
  }

  // Bogies and wheels under the floor, with motion streaks.
  ctx.fillStyle = '#0d1020';
  for (let i = 0; i < CARRIAGES.length; i += 1) {
    const cx = TRAIN.x + i * CARRIAGE_STEP + TRAIN.carriageWidth / 2;
    ctx.beginPath();
    ctx.arc(cx - 70, floorY + 34, 22, 0, Math.PI * 2);
    ctx.arc(cx + 70, floorY + 34, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#39447a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx - 70, floorY + 34, 12, 0, Math.PI * 2);
    ctx.arc(cx + 70, floorY + 34, 12, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i += 1) {
    const sx = ((i * 170 - state.scrollX * 2.4) % 1700 + 1700) % 1700 - 200;
    ctx.beginPath();
    ctx.moveTo(sx, floorY + 66);
    ctx.lineTo(sx + 60, floorY + 66);
    ctx.stroke();
  }
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, floorY + 72, FIELD.width, 6);
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const pulse = 0.6 + 0.4 * Math.sin(state.elapsed * 4 + item.glowPhase);
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.arc(item.x, item.y - 24, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.loot;
    if (item.kind === 'safe') {
      ctx.fillRect(item.x - 14, item.y - 26, 28, 22);
      ctx.fillStyle = '#8a6d2f';
      ctx.beginPath();
      ctx.arc(item.x, item.y - 15, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'case') {
      ctx.fillRect(item.x - 15, item.y - 18, 30, 14);
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(item.x - 15, item.y - 12, 30, 3);
    } else {
      ctx.beginPath();
      ctx.ellipse(item.x, item.y - 12, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6d2f';
      ctx.fillRect(item.x - 6, item.y - 24, 12, 5);
    }
    ctx.fillStyle = '#20242e';
    ctx.font = '700 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('$' + item.value, item.x, item.y - 34);
  }
  // The vault safe's crack progress ring.
  const vault = state.vault;
  if (!vault.cracked && state.thief.crack > 0) {
    ctx.strokeStyle = PALETTE.loot;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(vault.x, vault.y - 62, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.thief.crack);
    ctx.stroke();
  }
  if (vault.cracked) {
    ctx.fillStyle = PALETTE.loot;
    ctx.font = '700 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('CRACKED +$500', vault.x - 10, vault.y - 132);
  }
}

function drawFigure(ctx, x, feetY, height, facing, coat, skin, hat, bob) {
  const w = 13;
  const bobY = Math.sin(bob) * 2;
  ctx.fillStyle = coat;
  // Coat.
  ctx.fillRect(x - w, feetY - height + 8 + bobY, w * 2, height - 16);
  // Legs.
  ctx.fillStyle = '#14161f';
  ctx.fillRect(x - w + 2, feetY - 10, 8, 10);
  ctx.fillRect(x + w - 10, feetY - 10, 8, 10);
  // Head.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, feetY - height + 2 + bobY, 9, 0, Math.PI * 2);
  ctx.fill();
  // Hat.
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.ellipse(x, feetY - height - 2 + bobY, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 7, feetY - height - 12 + bobY, 14, 9);
  // Facing eye.
  ctx.fillStyle = '#14161f';
  ctx.fillRect(x + facing * 4 - 1, feetY - height + 1 + bobY, 2, 2);
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    const eyeY = guard.y - GUARD.height + 10;
    const sweep = Math.sin(guard.sweepPhase) * 0.35;
    const axis = guard.facing > 0 ? sweep : Math.PI - sweep;
    const hot = guard.state === 'chase' || guard.seenFlash > 0.3;
    ctx.fillStyle = hot ? PALETTE.coneHot : PALETTE.cone;
    conePath(ctx, guard.x, eyeY, axis, GUARD.coneRange, GUARD.coneHalfAngle);
    ctx.fill();
    ctx.strokeStyle = hot ? 'rgba(255,80,60,0.5)' : 'rgba(255,214,90,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawFigure(ctx, guard.x, guard.y, GUARD.height, guard.facing, PALETTE.guardUniform, '#d8b48f', '#2e3a2a', guard.sweepPhase * 2);
    // A small torch dot at the cone's origin.
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath();
    ctx.arc(guard.x + guard.facing * 12, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff5340';
      ctx.font = '700 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - GUARD.height - 10);
    }
  }
}

function drawCameras(ctx, state) {
  for (const camera of state.cameras) {
    const axis = Math.PI / 2 + Math.sin(camera.phase) * CAMERA.sweepArc;
    ctx.fillStyle = PALETTE.cameraCone;
    conePath(ctx, camera.x, camera.y, axis, CAMERA.coneRange, CAMERA.coneHalfAngle);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Mount and lens.
    ctx.fillStyle = '#39447a';
    ctx.fillRect(camera.x - 4, camera.y - 16, 8, 16);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.rotate(axis - Math.PI / 2);
    ctx.fillStyle = '#c9cede';
    ctx.fillRect(-7, -4, 14, 12);
    ctx.fillStyle = '#ff5340';
    ctx.beginPath();
    ctx.arc(0, 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawThief(ctx, state) {
  const thief = state.thief;
  const feetY = thief.onRoof ? TRAIN.roofY + 2 : TRAIN.floorY;
  const bob = thief.sneaking ? thief.bobPhase : thief.bobPhase;
  drawFigure(ctx, thief.x, feetY, THIEF.height, thief.facing, PALETTE.thiefCoat, '#e8c9a0', '#20242e', bob);
  // A pale scarf so the thief reads at a glance.
  ctx.fillStyle = PALETTE.thief;
  ctx.fillRect(thief.x - 9, feetY - THIEF.height + 10, 18, 5);
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(238,241,245,0.8)';
    ctx.font = '600 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('sneaking…', thief.x, feetY - THIEF.height - 16);
  }
  if (thief.onRoof) {
    ctx.fillStyle = 'rgba(238,241,245,0.8)';
    ctx.font = '600 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('on the roof — unseen', thief.x, feetY - THIEF.height - 16);
  }
}

function drawSmokeAndCoins(ctx, state) {
  for (const coin of state.coins) {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.landed ? 5 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6d2f';
    ctx.font = '700 8px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('$', coin.x, coin.y + 3);
  }
  for (const cloud of state.smoke) {
    ctx.fillStyle = PALETTE.smoke;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + cloud.ttl;
      ctx.beginPath();
      ctx.arc(cloud.x + Math.cos(a) * cloud.radius * 0.45, cloud.y + Math.sin(a) * cloud.radius * 0.3, cloud.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 64);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 20px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('THE LAST TRAIN', 16, 26);
  ctx.font = '400 12px ' + FONT;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(state.objective, 16, 46);

  // Alarm meter.
  const ax = 560;
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 12px ' + FONT;
  ctx.fillText('ALARM', ax, 20);
  ctx.fillStyle = PALETTE.alarmTrack;
  ctx.fillRect(ax, 28, 200, 14);
  const alarmW = 200 * (state.alarm / ALARM.max);
  ctx.fillStyle = state.alarm > 65 ? PALETTE.alarm : state.alarm > 35 ? '#ffb03a' : '#3fae5a';
  ctx.fillRect(ax, 28, alarmW, 14);
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, 28, 200, 14);
  if (state.spotted) {
    ctx.fillStyle = PALETTE.alarm;
    ctx.font = '700 12px ' + FONT;
    ctx.fillText('SPOTTED!', ax + 208, 40);
  }

  // Loot.
  ctx.fillStyle = PALETTE.loot;
  ctx.font = '700 20px ' + FONT;
  ctx.textAlign = 'right';
  ctx.fillText('$' + state.lootTotal, 1000, 28);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '400 12px ' + FONT;
  ctx.fillText(state.lootCount + ' stashes', 1000, 46);

  // Journey timer: a progress bar to the terminus.
  const tx = 1030;
  const left = Math.max(0, Math.ceil(state.timeLeft));
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 12px ' + FONT;
  ctx.textAlign = 'left';
  ctx.fillText('TERMINUS ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), tx, 20);
  ctx.fillStyle = PALETTE.alarmTrack;
  ctx.fillRect(tx, 28, 190, 10);
  ctx.fillStyle = '#7ab8ff';
  ctx.fillRect(tx, 28, 190 * (1 - state.timeLeft / JOURNEY_SECONDS), 10);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '400 11px ' + FONT;
  ctx.fillText('smoke Q ×' + state.smokeLeft + '   decoy F ×' + state.decoysLeft, tx, 52);

  // Context prompt near the thief.
  const thief = state.thief;
  const nearVault = !thief.onRoof && Math.abs(state.vault.x - thief.x) < 46 && !state.vault.cracked;
  const nearExit = state.vaultCracked && !thief.onRoof && thief.x <= TRAIN.x + 26;
  let nearLadderX = false;
  for (let i = 1; i < CARRIAGES.length; i += 1) {
    if (Math.abs(thief.x - (TRAIN.x + i * CARRIAGE_STEP - TRAIN.carriageGap / 2)) < 26) nearLadderX = true;
  }
  const ladder = !thief.onRoof && nearLadderX;
  let prompt = '';
  if (nearVault) prompt = state.thief.crack > 0 ? 'Cracking the safe…' : 'Hold E to crack the safe';
  else if (nearExit) prompt = 'Press E — jump to the getaway!';
  else if (ladder) prompt = 'W — climb to the roof';
  if (prompt) {
    ctx.fillStyle = PALETTE.panel;
    const w = ctx.measureText(prompt).width + 24;
    ctx.fillRect(thief.x - w / 2, (thief.onRoof ? TRAIN.roofY : TRAIN.floorY) - 96, w, 26);
    ctx.fillStyle = PALETTE.loot;
    ctx.font = '700 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(prompt, thief.x, (thief.onRoof ? TRAIN.roofY : TRAIN.floorY) - 78);
  }

  // A flashed message (vault cracked, etc.).
  if (state.message) {
    ctx.fillStyle = PALETTE.loot;
    ctx.font = '700 22px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(state.message, FIELD.width / 2, 100);
  }
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = accent;
  ctx.font = '700 52px ' + FONT;
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, 300);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '400 19px ' + FONT;
  let y = 350;
  for (const line of lines) {
    ctx.fillText(line, FIELD.width / 2, y);
    y += 30;
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
  }

  function draw(state, screen, best) {
    fit();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawScenery(ctx, state);
    drawTrain(ctx, state);
    drawLoot(ctx, state);
    drawCameras(ctx, state);
    drawGuards(ctx, state);
    drawSmokeAndCoins(ctx, state);
    drawThief(ctx, state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, state);

    if (screen === SCREEN_TITLE) {
      drawOverlay(ctx, 'THE LAST TRAIN', [
        'A night-train heist. Four carriages, one vault safe, one getaway.',
        'WASD / arrows to move · Shift to sneak · W / S at ladders for the roof',
        'E to crack the safe and to jump · Q smoke (costs $1 loot) · F throw a decoy coin',
        'Dodge the cones. Crack the vault. Jump at the rear door before the terminus.',
        'The great safe shields you from the guard — crack it from behind it.',
      ], PALETTE.loot);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '700 20px ' + FONT;
      ctx.fillText('Press SPACE or click to board', FIELD.width / 2, 540);
      if (best > 0) {
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '400 15px ' + FONT;
        ctx.fillText('Best loot so far: $' + best, FIELD.width / 2, 570);
      }
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, 'PAUSED', ['The train rolls on without you.', 'Press P or SPACE to keep moving.'], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      drawOverlay(ctx, state.phase === 'timeup' ? 'THE TERMINUS' : 'CAUGHT!', [
        state.objective,
        'Loot pocketed: $' + state.lootTotal + '  ·  Best: $' + Math.max(best, state.lootTotal),
        'Press SPACE or R to try the run again.',
      ], PALETTE.alarm);
    } else if (screen === SCREEN_WIN) {
      drawOverlay(ctx, 'CLEAN GETAWAY!', [
        'You jumped clear at the rear as the train rolled into the night.',
        'Loot pocketed: $' + state.lootTotal + '  ·  Best: $' + Math.max(best, state.lootTotal),
        'Press SPACE or R to run it again.',
      ], '#3fae5a');
    }
  }

  return { draw };
}
