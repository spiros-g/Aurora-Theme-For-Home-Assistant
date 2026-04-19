console.info(
  `%c  BACKGROUND-ANIMATIONS  %c  By Spiros G.  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let vantaEffect      = null;
let canvasMutObs     = null;  // watches the Vanta canvas for style changes
let resizeController = null;  // AbortController so we can remove the resize listener cleanly
let retryCount       = 0;
const MAX_RETRIES    = 25;

// ---------------------------------------------------------------------------
// Environment checks
// ---------------------------------------------------------------------------

function isWebGLAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

function isTHREEReady() {
  try {
    return (
      window.THREE &&
      typeof window.THREE.Color === 'function' &&
      typeof window.THREE.WebGLRenderer === 'function'
    );
  } catch (e) {
    return false;
  }
}

// Evaluated live so it's correct after orientation changes.
function isMobileViewport() {
  return window.innerWidth < 768;
}

// ---------------------------------------------------------------------------
// Canvas size management
//
// Vanta writes its own inline styles on the canvas both after init and on
// every resize. Left unchecked it ends up with wrong dimensions on mobile.
// We override those styles back to full viewport after Vanta finishes.
//
// Critical detail: we disconnect the MutationObserver before writing cssText
// and re-attach immediately after. Without this, our write triggers the
// observer which calls fixVantaCanvas again — infinite loop, browser dies.
// ---------------------------------------------------------------------------

function fixVantaCanvas() {
  const canvas = document.querySelector('body > canvas');
  if (!canvas) return;

  canvasMutObs?.disconnect();

  canvas.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 0 !important;
    pointer-events: none !important;
    touch-action: none !important;
  `;

  if (canvasMutObs) {
    canvasMutObs.observe(canvas, {
      attributes: true,
      attributeFilter: ['style', 'width', 'height'],
    });
  }
}

function attachCanvasObserver() {
  if (canvasMutObs) {
    canvasMutObs.disconnect();
    canvasMutObs = null;
  }
  const canvas = document.querySelector('body > canvas');
  if (!canvas) return;
  canvasMutObs = new MutationObserver(fixVantaCanvas);
  canvasMutObs.observe(canvas, {
    attributes: true,
    attributeFilter: ['style', 'width', 'height'],
  });
}

function detachCanvasObserver() {
  canvasMutObs?.disconnect();
  canvasMutObs = null;
}

// ---------------------------------------------------------------------------
// Vanta configuration
//
// Kept as a function so getVantaConfig() can be called both at init time
// and from the resize handler to update options when the viewport changes.
//
// pixelRatio is capped at 2 — going higher on 3x/4x screens burns GPU
// for no perceptible visual difference on an animated background.
// ---------------------------------------------------------------------------

function getVantaConfig() {
  return {
    size:       isMobileViewport() ? 1.00 : 1.50,
    speed:      1.10,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  };
}

// ---------------------------------------------------------------------------
// Page visibility — pause Vanta when the tab is hidden, resume on return.
// This stops the WebGL renderer burning GPU while you're on another tab.
// ---------------------------------------------------------------------------

function handleVisibilityChange() {
  if (!vantaEffect) return;
  if (document.hidden) {
    // Vanta doesn't have a built-in pause, but stopping the animation loop
    // is enough. We do this by freezing Three.js's renderer.
    vantaEffect.renderer?.setAnimationLoop?.(null);
  } else {
    // Resume by letting Vanta restart its own loop.
    vantaEffect.restart?.() || vantaEffect.resize?.();
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function initVanta() {
  if (document.body?.dataset.vantaInitialized) return;

  if (!isWebGLAvailable()) {
    console.warn('[VANTA] WebGL not available. Skipping.');
    return;
  }

  // THREE.js and VANTA load asynchronously after HA boots.
  // Retry every 200ms until they're ready or we hit the ceiling.
  if (!window.VANTA || !isTHREEReady() || !document.body) {
    if (++retryCount > MAX_RETRIES) {
      console.warn('[VANTA] Dependencies never loaded. Giving up.');
      return;
    }
    setTimeout(initVanta, 200);
    return;
  }

  retryCount = 0;
  document.body.style.background = '#000000';
  document.body.dataset.vantaInitialized = 'true';

  try {
    vantaEffect = VANTA.CELLS({
      el:             document.body,
      mouseControls:  true,
      touchControls:  true,
      gyroControls:   false,
      backgroundColor: 0x000000,
      scale:          1.00,
      color1:         0x222222,
      color2:         0x784bc3,
      THREE:          window.THREE,
      ...getVantaConfig(),
    });
  } catch (err) {
    console.warn('[VANTA] Init failed, will retry:', err.message);
    delete document.body.dataset.vantaInitialized;
    setTimeout(initVanta, 500);
    return;
  }

  // Vanta does its own internal async resize right after CELLS() returns.
  // Waiting 300ms lets it finish before we lock the canvas and start watching.
  setTimeout(() => {
    fixVantaCanvas();
    attachCanvasObserver();
  }, 300);

  // Resize: update cell size if we cross the mobile breakpoint, then
  // re-lock the canvas after Vanta's own resize handler runs.
  resizeController = new AbortController();
  window.addEventListener('resize', () => {
    vantaEffect?.setOptions?.(getVantaConfig());
    vantaEffect?.resize?.();
    requestAnimationFrame(fixVantaCanvas);
  }, { signal: resizeController.signal });

  // Pause/resume based on tab visibility to save GPU when not in view.
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// ---------------------------------------------------------------------------
// Destroy
//
// Called if you want to cleanly tear down the effect — for example if you
// switch to a different theme at runtime or the HA frontend hot-reloads.
// ---------------------------------------------------------------------------

function destroyVanta() {
  detachCanvasObserver();
  resizeController?.abort();
  resizeController = null;
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  if (vantaEffect) {
    vantaEffect.destroy();
    vantaEffect = null;
  }
  if (document.body) {
    delete document.body.dataset.vantaInitialized;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

if (document.readyState === 'complete') {
  initVanta();
} else {
  window.addEventListener('load', initVanta);
}

// HA is a single-page app. When it navigates between views it replaces
// body children, which can clear vantaInitialized. This observer watches
// permanently and re-triggers init if the flag disappears.
const bodyObserver = new MutationObserver(() => {
  if (!document.body?.dataset.vantaInitialized) {
    initVanta();
  }
});
bodyObserver.observe(document.body, { childList: true, subtree: false });
