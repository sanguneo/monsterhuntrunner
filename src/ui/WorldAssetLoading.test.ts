import { afterEach, describe, expect, it, vi } from 'vitest';
import { hideWorldAssetLoading, showWorldAssetLoading } from './WorldAssetLoading';
class Element {
  id = '';
  type = '';
  textContent = '';
  style = {};
  attributes: Record<string, string> = {};
  children: Element[] = [];
  parent?: Element;
  onclick?: () => void;
  focused = false;
  onkeydown?: (event: { key: string; shiftKey: boolean; target: Element; preventDefault: () => void }) => void;
  constructor(readonly tag: string) {}
  append(child: Element) {
    child.parent = this;
    this.children.push(child);
  }
  setAttribute(key: string, value: string) {
    this.attributes[key] = value;
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
  }
  querySelector(tag: string) {
    return this.children.find((c) => c.tag === tag);
  }
  querySelectorAll(tag: string) {
    return this.children.filter((c) => c.tag === tag);
  }
  focus() {
    this.focused = true;
  }
}
afterEach(() => vi.unstubAllGlobals());
describe('world loading and recoverable error UI', () => {
  it('blocks the screen with accessible status, exposes explicit retry/cancel and removes cleanly', () => {
    const body = new Element('body');
    vi.stubGlobal('document', {
      body,
      createElement: (tag: string) => new Element(tag),
      getElementById: (id: string) => body.children.find((c) => c.id === id),
    });
    const cancel = vi.fn(),
      retry = vi.fn();
    showWorldAssetLoading(cancel);
    expect(body.children).toHaveLength(1);
    expect(body.children[0].attributes).toMatchObject({ role: 'dialog', 'aria-modal': 'true', 'aria-busy': 'true' });
    expect(body.children[0].children[0].textContent).toContain('Loading world');
    showWorldAssetLoading(cancel, retry);
    expect(body.children).toHaveLength(1);
    const overlay = body.children[0];
    expect(overlay.attributes).toMatchObject({ role: 'alertdialog', 'aria-busy': 'false' });
    expect(overlay.children[0].textContent).toContain('Unable to load');
    expect(overlay.children[1].focused).toBe(true);
    const preventDefault = vi.fn();
    overlay.onkeydown!({ key: 'Tab', shiftKey: true, target: overlay.children[1], preventDefault });
    expect(overlay.children[2].focused).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    overlay.children[1].onclick!();
    expect(retry).toHaveBeenCalledTimes(1);
    overlay.children[2].onclick!();
    expect(cancel).toHaveBeenCalledTimes(1);
    overlay.onkeydown!({ key: 'Escape', shiftKey: false, target: overlay.children[1], preventDefault });
    expect(cancel).toHaveBeenCalledTimes(2);
    hideWorldAssetLoading();
    expect(body.children).toHaveLength(0);
  });
});
