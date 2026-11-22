// Keyboard and mouse for The Last Train. Movement keys are read every frame;
// confirm / pause / tool keys are latched as one-shot actions the loop takes.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_DECOY = 8;
export const ACTION_RESTART = 16;
export const ACTION_MUTE = 32;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null; // {x, y} in logical field coordinates, consumed by the loop

  function logicalPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  function onKeyDown(event) {
    const code = event.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(code);
    if (code === 'Space' || code === 'Enter') actions |= ACTION_CONFIRM;
    if (code === 'KeyP' || code === 'Escape') actions |= ACTION_PAUSE;
    if (code === 'KeyQ') actions |= ACTION_SMOKE;
    if (code === 'KeyF') actions |= ACTION_DECOY;
    if (code === 'KeyR') actions |= ACTION_RESTART;
    if (code === 'KeyM') actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  // Losing the window clears held keys, so the thief never walks on alone.
  function onBlur() {
    keys.clear();
  }

  function onMouseDown(event) {
    click = logicalPoint(event);
    actions |= ACTION_CONFIRM; // clicking also starts the game from the title screen
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);

  function direction() {
    let dx = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
    return dx;
  }

  /** The full per-frame input the world steps on. */
  function read() {
    const up = keys.has('ArrowUp') || keys.has('KeyW');
    const down = keys.has('ArrowDown') || keys.has('KeyS');
    return {
      dx: direction(),
      sneak: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      up,
      down,
      interact: keys.has('KeyE'),
      smoke: !!(actions & ACTION_SMOKE),
      decoy: !!(actions & ACTION_DECOY),
      decoyX: click ? click.x : undefined,
      decoyY: click ? click.y : undefined,
    };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  function takeClick() {
    const taken = click;
    click = null;
    return taken;
  }

  return { read, takeActions, takeClick, direction };
}
