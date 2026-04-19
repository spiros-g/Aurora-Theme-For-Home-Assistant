console.info(
  `%c  BACKGROUND-ANIMATIONS  %c  By Spiros G.  `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

let vantaEffect = null;
const MAX_RETRIES = 25;
let retryCount = 0;
const isMobile = window.innerWidth < 768;

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
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

function fixVantaCanvas() {
  const canvas = document.querySelector('body > canvas');
  if (!canvas) return;
  canvas.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 0 !important;
    pointer-events: none !important;
  `;
}

function initVanta() {
  if (document.body.dataset.vantaInitialized) return;

  if (!isWebGLAvailable()) {
    console.warn('[VANTA] WebGL not available. Skipping.');
    return;
  }

  if (!window.VANTA || !isTHREEReady() || !document.body) {
    if (++retryCount > MAX_RETRIES) {
      console.warn('[VANTA] Dependencies never loaded. Giving up.');
      return;
    }
    setTimeout(initVanta, 200);
    return;
  }

  document.body.style.background = '#000000';
  document.body.dataset.vantaInitialized = "true";

  try {
    vantaEffect = VANTA.CELLS({
      el: document.body,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      backgroundColor: 0x000000,
      scale: 1.00,
      color1: 0x18701,
      color2: 0x4035f2,
      size: isMobile ? 0.80 : 1.40,
      speed: isMobile ? 2.00 : 4.10,
      THREE: window.THREE,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2)
    });

    fixVantaCanvas();
    setTimeout(fixVantaCanvas, 500);
    setTimeout(fixVantaCanvas, 1500);

  } catch (err) {
    console.warn('[VANTA] Init failed, will retry:', err.message);
    delete document.body.dataset.vantaInitialized;
    retryCount = 0;
    setTimeout(initVanta, 500);
    return;
  }

  window.addEventListener("resize", () => {
    vantaEffect?.resize?.();
    fixVantaCanvas();
  });
}

function destroyVanta() {
  if (vantaEffect) {
    vantaEffect.destroy();
    vantaEffect = null;
    delete document.body.dataset.vantaInitialized;
  }
}

if (document.readyState === 'complete') {
  initVanta();
} else {
  window.addEventListener("load", initVanta);
}

const observer = new MutationObserver(() => {
  if (!document.body.dataset.vantaInitialized) {
    initVanta();
  } else {
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: false });
