import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * Keeps a map drawn when the page comes back from the background.
 *
 * Phones (Android Chrome and Brave above all) take the GPU memory of a hidden tab: the map's WebGL context is
 * lost. MapLibre 4 asks for it back, but the tiles it had uploaded belong to the old context, so the canvas can
 * stay blank while the HTML markers on top still show. A map whose context was lost is therefore rebuilt
 * ([rebuild], at the same view) once the page is visible again; a map that kept its context is only resized
 * and redrawn, which covers a canvas that was cleared or sized while hidden.
 *
 * Returns a function that stops watching.
 */
export function keepMapDrawn(map: MapLibreMap, rebuild: () => void): () => void {
  const canvas = map.getCanvas();
  let lost = false;
  let timer: number | undefined;

  const contextLost = () => {
    const gl = (map as unknown as { painter?: { context?: { gl?: WebGLRenderingContext } } }).painter?.context?.gl;
    return lost || Boolean(gl?.isContextLost?.());
  };
  const rebuildSoon = (ms: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (document.visibilityState === "visible" && contextLost()) rebuild();
    }, ms);
  };

  const onLost = () => {
    lost = true;
    // Lost while on screen (a GPU reset): give the browser a moment to hand it back, then rebuild.
    if (document.visibilityState === "visible") rebuildSoon(1500);
  };
  const onBack = () => {
    if (document.visibilityState !== "visible") return;
    if (contextLost()) return rebuildSoon(150);
    try {
      map.resize();
      map.triggerRepaint();
    } catch {
      /* removed meanwhile */
    }
  };

  canvas.addEventListener("webglcontextlost", onLost);
  document.addEventListener("visibilitychange", onBack);
  // Back/forward cache and some app switchers restore the page without a visibility change.
  window.addEventListener("pageshow", onBack);
  window.addEventListener("focus", onBack);
  return () => {
    window.clearTimeout(timer);
    canvas.removeEventListener("webglcontextlost", onLost);
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("pageshow", onBack);
    window.removeEventListener("focus", onBack);
  };
}
