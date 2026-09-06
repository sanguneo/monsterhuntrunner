// Keyboard and pointer input share one timestamped, consumable buffer.
import { CONFIG } from '../data/config';

export type Action = 'left' | 'right' | 'jump' | 'slide' | 'skill1' | 'skill2' | 'skill3' | 'skill4' | 'pause';

export interface BufferedAction {
  readonly action: Action;
  readonly time: number;
}

type InputSurface = Pick<HTMLElement,
  'addEventListener' | 'setPointerCapture' | 'hasPointerCapture' | 'releasePointerCapture'> & {
  readonly style: Pick<CSSStyleDeclaration, 'touchAction'>;
  getBoundingClientRect(): Pick<DOMRect, 'left' | 'width'>;
};

const KEY_ACTIONS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'slide', KeyS: 'slide',
  KeyQ: 'skill1', KeyE: 'skill2', KeyR: 'skill3', KeyF: 'skill4', Escape: 'pause', KeyP: 'pause',
};

export class Input {
  private buffer: BufferedAction[] = [];
  onAction: ((a: Action) => void) | null = null;
  private gesture: { id: number; x: number; y: number; time: number; fired: boolean } | null = null;

  constructor(private target: InputSurface) {
    target.style.touchAction = 'none';
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('blur', () => this.clear());
    target.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    target.addEventListener('pointermove', (e) => this.onPointerMove(e));
    target.addEventListener('pointerup', (e) => this.onPointerUp(e));
    target.addEventListener('pointercancel', (e) => this.cancelPointer(e));
    target.addEventListener('lostpointercapture', (e) => this.cancelPointer(e));
  }

  private now(): number { return performance.now() / 1000; }

  push(action: Action): void {
    this.buffer.push({ action, time: this.now() });
    if (this.buffer.length > 8) this.buffer.shift();
    this.onAction?.(action);
  }

  consume(action: Action, maxAge: number = CONFIG.accessibility.inputBuffer): boolean {
    return this.consumeEntry([action], maxAge) !== null;
  }

  consumeAny(actions: readonly Action[], maxAge: number = CONFIG.accessibility.inputBuffer): Action | null {
    return this.consumeEntry(actions, maxAge)?.action ?? null;
  }

  /** Keep the original age when intent moves into Player's landing queue. */
  consumeEntry(actions: readonly Action[], maxAge: number = CONFIG.accessibility.inputBuffer): BufferedAction | null {
    const now = this.now();
    const index = this.buffer.findIndex((entry) => actions.includes(entry.action) && now - entry.time <= maxAge);
    return index < 0 ? null : this.buffer.splice(index, 1)[0];
  }

  clear(): void {
    this.buffer = [];
    this.clearGesture();
  }

  private clearGesture(): void {
    const gesture = this.gesture;
    this.gesture = null; // release can synchronously dispatch lostpointercapture
    if (gesture && this.target.hasPointerCapture(gesture.id)) this.target.releasePointerCapture(gesture.id);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const target = e.target;
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (target && 'closest' in target && typeof target.closest === 'function') {
      if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      // Space still activates a focused button; movement/pause shortcuts remain
      // available after a pointer click on a HUD skill.
      if (e.code === 'Space' && target.closest('button, a, [role="button"]')) return;
    }
    const action = KEY_ACTIONS[e.code];
    if (!action) return;
    e.preventDefault();
    this.push(action);
  }

  private onPointerDown(e: PointerEvent): void {
    if (!e.isPrimary || (this.gesture && this.gesture.id !== e.pointerId)) {
      this.clearGesture();
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();
    this.gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, time: this.now(), fired: false };
    this.target.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || gesture.id !== e.pointerId || gesture.fired) return;
    e.preventDefault();
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    if (Math.hypot(dx, dy) < 24) return;
    gesture.fired = true;
    this.push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'jump' : 'slide'));
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.gesture?.id !== e.pointerId) return;
    this.onPointerMove(e); // also handles a final coalesced displacement
    const gesture = this.gesture;
    if (!gesture) return; // onAction may clear input during a state transition
    e.preventDefault();
    this.clearGesture();
    if (!gesture.fired && this.now() - gesture.time < 0.35) {
      const rect = this.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this.push(x < rect.width / 3 ? 'left' : x > rect.width * 2 / 3 ? 'right' : 'jump');
    }
  }

  private cancelPointer(e: PointerEvent): void {
    if (this.gesture?.id === e.pointerId) this.clearGesture();
  }
}
