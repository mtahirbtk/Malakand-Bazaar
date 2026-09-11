import "@testing-library/jest-dom/vitest";

// Radix primitives rely on browser APIs jsdom does not implement.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ??
  (class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver);

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom implements no media query engine at all — window.matchMedia is
// simply absent. Default every query to "not matching" (desktop-first
// components like useMediaQuery("(min-width: 768px)") read as mobile,
// carousel's prefers-reduced-motion reads as motion allowed) unless a test
// overrides window.matchMedia itself, as the carousel and media-query specs do.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
