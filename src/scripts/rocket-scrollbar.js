import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Scrollbar custom con forma de cohete + telemetría.
 *
 * El cohete sube mientras el usuario baja: la nave gana altitud igual que
 * la página avanza. Es la metáfora que hace que se entienda sin explicarlo.
 */

// Valores objetivo al 100% de scroll (órbita terrestre baja, redondeado).
const MAX_SPEED = 27600;   // km/h
const MAX_ALTITUDE = 420;  // km

export function initRocketScrollbar({
  track,          // contenedor del raíl (posicionado fixed en el HTML)
  rocket,         // el elemento cohete que se desplaza
  speedEl,        // <span> del contador de velocidad
  altitudeEl,     // <span> del contador de altitud
  trailEl,        // opcional: estela que crece bajo el cohete
} = {}) {
  if (!track || !rocket) return;

  const readout = { speed: 0, altitude: 0 };
  const formatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });

  function paintReadout() {
    if (speedEl) speedEl.textContent = formatter.format(Math.round(readout.speed));
    if (altitudeEl) altitudeEl.textContent = formatter.format(Math.round(readout.altitude));
  }

  function place(progress) {
    // El recorrido útil es la altura del raíl menos el alto del cohete.
    const travel = track.clientHeight - rocket.offsetHeight;
    // progress 0 -> abajo del todo; progress 1 -> arriba del todo.
    gsap.set(rocket, { y: travel * (1 - progress) });
    if (trailEl) gsap.set(trailEl, { scaleY: progress, transformOrigin: 'bottom center' });
  }

  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress;
      place(p);

      // Curva de aceleración: al principio sube despacio (max-Q), luego dispara.
      readout.speed = MAX_SPEED * Math.pow(p, 1.6);
      readout.altitude = MAX_ALTITUDE * Math.pow(p, 1.25);
      paintReadout();

      // Inclinación sutil según la dirección del scroll.
      gsap.to(rocket, {
        rotate: self.direction === 1 ? 0 : 8,
        duration: 0.3,
        overwrite: 'auto',
      });
    },
  });

  place(0);
  paintReadout();
  window.addEventListener('resize', () => ScrollTrigger.refresh(), { passive: true });
}
