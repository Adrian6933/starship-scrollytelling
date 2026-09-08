import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Secuencia de imágenes dibujada en <canvas> y controlada por el scroll.
 *
 * Por qué canvas y no <video>:
 *  - El scrubbing de un <video> con currentTime es irregular (keyframes) y en
 *    iOS directamente se bloquea. Con una secuencia de imágenes el fotograma
 *    exacto siempre está disponible en memoria.
 */

const FRAME_COUNT = 480;
const FRAME_PATH = (i) => `/frames/frame-${String(i).padStart(3, '0')}.webp`;

// Cuántas imágenes pedimos a la vez. Más alto satura la cola HTTP del navegador.
const CONCURRENCY = 12;

// Porcentaje que hace falta para soltar el scroll. El resto sigue cargando de
// fondo: con 480 fotogramas, esperar al 100% son varios segundos de pantalla
// de carga, y nadie espera tanto en un portafolio. Como la carga es secuencial
// y el usuario scrollea hacia abajo, siempre va por delante de él.
const READY_AT = 0.25;

export function initCanvasSequence({
  canvas,
  progressEl,          // opcional: barra/porcentaje de precarga
  onReady,             // opcional: callback cuando ya se puede scrollear
} = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const images = new Array(FRAME_COUNT);
  const state = { frame: 0 };   // objeto que tweenea GSAP (valor decimal)

  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ------------------------------------------------------------------ */
  /* 1. Precarga                                                         */
  /* ------------------------------------------------------------------ */

  function loadImage(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = FRAME_PATH(index + 1);
      img.onload = () => { images[index] = img; resolve(img); };
      img.onerror = () => { images[index] = null; resolve(null); };  // hueco tolerado
    });
  }

  function preload() {
    let loaded = 0;
    let cursor = 0;
    let released = false;
    let release;
    const ready = new Promise((r) => { release = r; });

    const worker = async () => {
      while (cursor < FRAME_COUNT) {
        const index = cursor++;
        await loadImage(index);
        loaded++;

        if (progressEl) {
          const pct = Math.min(100, Math.round((loaded / (FRAME_COUNT * READY_AT)) * 100));
          progressEl.textContent = `${pct}%`;
          progressEl.style.setProperty('--pct', String(pct));
        }

        // El primer fotograma se pinta en cuanto llega: nada de pantalla negra.
        if (index === 0) render();

        if (!released && loaded >= FRAME_COUNT * READY_AT) {
          released = true;
          release();
        }
      }
      if (!released) { released = true; release(); }   // secuencia muy corta
    };

    Array.from({ length: Math.min(CONCURRENCY, FRAME_COUNT) }, worker);
    return ready;
  }

  /* ------------------------------------------------------------------ */
  /* 2. Dibujo (object-fit: cover a mano)                                */
  /* ------------------------------------------------------------------ */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    render();
  }

  /** Devuelve la imagen del índice pedido, o la última válida hacia atrás. */
  function imageAt(index) {
    for (let i = index; i >= 0; i--) if (images[i]) return images[i];
    return null;
  }

  /** Pinta una imagen en modo cover con la opacidad dada. */
  function paint(img, alpha) {
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.width, ch / img.height);
    const w = img.width * scale;
    const h = img.height * scale;

    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }

  /**
   * Render con interpolación entre los dos fotogramas vecinos.
   *
   * Antes esto hacía Math.round() sobre el índice, así que los ~60 valores por
   * segundo que calcula GSAP colapsaban en un puñado de fotogramas enteros y se
   * veía a saltos. Ahora la parte decimal del índice se usa como opacidad del
   * fotograma siguiente: el resultado es una fusión continua en vez de una
   * escalera. Cuesta un drawImage extra, que en GPU no se nota.
   */
  function render() {
    const f = Math.min(FRAME_COUNT - 1, Math.max(0, state.frame));
    const i0 = Math.floor(f);
    const t = f - i0;

    const a = imageAt(i0);
    if (!a) return;

    ctx.fillStyle = '#05070d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    paint(a, 1);

    // Solo mezclamos si el vecino ya está cargado y la fracción es apreciable.
    if (t > 0.01 && i0 + 1 < FRAME_COUNT) {
      const b = images[i0 + 1];
      if (b) paint(b, t);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Scroll -> fotograma                                              */
  /* ------------------------------------------------------------------ */

  function bindScroll() {
    gsap.to(state, {
      frame: FRAME_COUNT - 1,
      ease: 'none',
      // Sin snap: queremos el índice decimal para poder interpolar.
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,               // inercia: alarga el recorrido y suaviza la rueda
        invalidateOnRefresh: true,
      },
      onUpdate: render,
    });
  }

  /* ------------------------------------------------------------------ */

  resize();
  window.addEventListener('resize', resize, { passive: true });

  preload().then(() => {
    render();
    bindScroll();
    ScrollTrigger.refresh();
    onReady?.();
  });

  return { render, resize, get frameCount() { return FRAME_COUNT; } };
}
