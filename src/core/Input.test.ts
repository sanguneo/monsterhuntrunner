import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

// Real EventTarget dispatch at the browser boundary; capture ownership is modeled.
class CanvasTarget extends EventTarget {
  style = { touchAction: '' };
  captures = new Set<number>();
  getBoundingClientRect() { return { left: 100, top: 50, width: 300, height: 600 }; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
}

let clock = 0;
let canvas: CanvasTarget;
let input: Input;
function pointer(type: string, x: number, y: number, id = 1, primary = true) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { clientX: x, clientY: y, pointerId: id, isPrimary: primary, button: 0 });
  canvas.dispatchEvent(event);
}
function consume() { return input.consumeAny(['left', 'right', 'jump', 'slide']); }

beforeEach(() => {
  clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock * 1000);
  vi.stubGlobal('window', new EventTarget());
  canvas = new CanvasTarget();
  input = new Input(canvas);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('pointer intent', () => {
  it('fires at 24px before release, exactly once despite further movement', () => {
    pointer('pointerdown', 195, 500);
    pointer('pointermove', 218, 500);
    expect(consume()).toBeNull();
    pointer('pointermove', 219, 500);
    expect(consume()).toBe('right');
    pointer('pointermove', 100, 400);
    pointer('pointerup', 100, 400);
    expect(consume()).toBeNull();
    expect(canvas.captures.size).toBe(0);
  });
  it.each(['pointercancel', 'lostpointercapture'])('does not finish a gesture after %s', (event) => {
    pointer('pointerdown', 200, 300);
    pointer(event, 200, 300);
    pointer('pointermove', 280, 300);
    pointer('pointerup', 280, 300);
    expect(consume()).toBeNull();
    pointer('pointerdown', 200, 300);
    pointer('pointermove', 160, 300);
    expect(consume()).toBe('left');
  });
  it('invalidates a gesture on multitouch and never promotes the secondary pointer', () => {
    pointer('pointerdown', 200, 300);
    pointer('pointerdown', 210, 300, 2, false);
    pointer('pointermove', 100, 300);
    pointer('pointerup', 100, 300);
    pointer('pointermove', 290, 300, 2, false);
    pointer('pointerup', 290, 300, 2, false);
    expect(consume()).toBeNull();
    pointer('pointerdown', 200, 300);
    pointer('pointermove', 200, 260);
    expect(consume()).toBe('jump');
  });
  it('clear releases capture and drops both buffered and unfinished gesture input', () => {
    input.push('jump');
    pointer('pointerdown', 200, 300);
    expect(canvas.captures.has(1)).toBe(true);
    input.clear();
    pointer('pointerup', 200, 300);
    expect(consume()).toBeNull();
    expect(canvas.captures.size).toBe(0);
  });
  it.each([[120, 'left'], [250, 'jump'], [380, 'right']] as const)('maps offset canvas tap %s to %s', (x, action) => {
    pointer('pointerdown', x, 300);
    pointer('pointerup', x, 300);
    expect(consume()).toBe(action);
  });
  it('keeps the original timestamp when consumed near expiry', () => {
    clock = 1;
    input.push('jump');
    clock = 1.14;
    expect(input.consumeEntry(['jump'])).toEqual({ action: 'jump', time: 1 });
    input.push('slide');
    clock = 1.291;
    expect(input.consumeEntry(['slide'])).toBeNull();
  });
});

describe('keyboard boundary', () => {
  it('does not shorten the combat buffer when Player consumes movement first', () => {
    input.push('skill1');
    clock = 0.2;
    expect(input.consumeEntry(['left', 'right', 'jump', 'slide'])).toBeNull();
    expect(input.consume('skill1', 0.3)).toBe(true);
  });
  it('keeps movement and pause shortcuts available after clicking a skill button', () => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { code: 'ArrowLeft' });
    Object.defineProperty(event, 'target', {
      value: { closest: (selector: string) => selector.includes('button') ? {} : null },
    });
    window.dispatchEvent(event);
    expect(input.consume('left')).toBe(true);
  });
  it.each([
    ['ArrowLeft', 'left'], ['KeyA', 'left'], ['ArrowRight', 'right'], ['KeyD', 'right'],
    ['ArrowUp', 'jump'], ['KeyW', 'jump'], ['Space', 'jump'], ['ArrowDown', 'slide'],
    ['KeyS', 'slide'], ['KeyQ', 'skill1'], ['KeyE', 'skill2'], ['KeyR', 'skill3'],
    ['KeyF', 'skill4'], ['Escape', 'pause'], ['KeyP', 'pause'],
  ] as const)('preserves %s -> %s and prevents browser scrolling', (code, action) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { code, repeat: false });
    window.dispatchEvent(event);
    expect(input.consume(action)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });
  it('ignores keyboard input owned by focused UI and browser shortcuts', () => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { code: 'Space', repeat: false });
    Object.defineProperty(event, 'target', { value: { closest: () => ({}) } });
    window.dispatchEvent(event);
    expect(consume()).toBeNull();
    const shortcut = new Event('keydown', { cancelable: true });
    Object.assign(shortcut, { code: 'KeyR', ctrlKey: true });
    window.dispatchEvent(shortcut);
    expect(input.consume('skill3')).toBe(false);
  });
});
