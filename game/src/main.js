// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, caught/time-up and getaway.
//
// ?seed=N fixes the night. ?shot=cover|sneak|alarm|win (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CRACKED, EVENT_LOOT, EVENT_TIMEUP, EVENT_WON } from './world.js';
import { ACTION_CONFIRM, ACTION_DECOY, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, ACTION_SMOKE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best loot then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let wasSpotted = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each stash.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    wasSpotted = false;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Crack the vault safe, then jump off at the rear door before the terminus.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.lootTotal > best) {
      best = world.state.lootTotal;
      saveBest(best);
    }
    announce(won ? `Clean getaway! Loot $${world.state.lootTotal}.` : `Caught. Loot $${world.state.lootTotal}. Best $${best}.`);
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const nowMuted = audio.toggleMute();
      announce(nowMuted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, sneak: false, up: false, down: false, interact: false, smoke: false, decoy: false }, true);
      return;
    }
    const frameInput = input.read();
    frameInput.smoke = frameInput.smoke || !!(actions & ACTION_SMOKE);
    frameInput.decoy = frameInput.decoy || !!(actions & ACTION_DECOY);
    if (frameInput.decoy) {
      const click = input.takeClick();
      if (click) {
        frameInput.decoyX = click.x;
        frameInput.decoyY = click.y;
      }
    }
    const events = world.step(STEP, frameInput, false);
    if (events & EVENT_LOOT) audio.loot();
    if (events & EVENT_CRACKED) audio.crack();
    if (events & EVENT_WON) {
      audio.win();
      endGame(true);
    } else if (events & (EVENT_CAUGHT | EVENT_TIMEUP)) {
      audio.caught();
      endGame(false);
    }
    if (world.state.spotted && !wasSpotted) audio.alarm();
    wasSpotted = world.state.spotted;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the alarm rise unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Last Train. Press Space or click to board.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
