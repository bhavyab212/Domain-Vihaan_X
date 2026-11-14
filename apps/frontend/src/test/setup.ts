import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * jsdom has no layout engine. React Flow needs ResizeObserver and DOMMatrixReadOnly to mount; these minimal
 * shims let it render (nodes/edges/controls appear in the DOM) without pretending to measure real pixels.
 */
class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target, contentRect: { width: 1000, height: 520 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

class DOMMatrixReadOnlyStub {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1];
    this.m22 = scale ? Number(scale) : 1;
  }
}

if (!('ResizeObserver' in globalThis)) vi.stubGlobal('ResizeObserver', ResizeObserverStub);
if (!('DOMMatrixReadOnly' in globalThis)) vi.stubGlobal('DOMMatrixReadOnly', DOMMatrixReadOnlyStub);

/**
 * d3-drag (React Flow's node-drag engine) reads `event.view.document` on mousedown. Browsers always set
 * `UIEvent.view` to the window. user-event, however, does NOT pass a view: it calls
 * `Object.defineProperty(event, 'view', { get: () => null })` on every synthetic event, so under jsdom d3-drag
 * throws an uncaught TypeError, and vitest exits 1 even though every assertion passed.
 *
 * That per-instance property shadows anything on the prototype, so the only effective fix is to intercept that
 * exact call and substitute `window` for a null view. Scope is deliberately narrow: only a UIEvent, only the
 * `view` key, only when the value would be null. Everything else goes through untouched.
 */
const nativeDefineProperty = Object.defineProperty;
Object.defineProperty = function patchedDefineProperty<T>(target: T, key: PropertyKey, descriptor: PropertyDescriptor & ThisType<unknown>): T {
  if (key === 'view' && target instanceof UIEvent && typeof descriptor.get === 'function') {
    const original = descriptor.get;
    return nativeDefineProperty(target, key, { ...descriptor, get: () => original.call(target) ?? window }) as T;
  }
  return nativeDefineProperty(target, key, descriptor) as T;
} as typeof Object.defineProperty;

Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 520 });
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 1000 });
(SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;

afterEach(() => {
  cleanup();
  // Restore only per-test stubs (fetch, matchMedia); the layout shims above must persist across tests.
  window.localStorage.clear();
});
