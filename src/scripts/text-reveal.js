import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Fade-in + subida suave de cada bloque .reveal al entrar en viewport.
 * Un solo ScrollTrigger por elemento; sin scrub, para que no dependa de la
 * velocidad del scroll y siempre termine la animación.
 */
export function initTextReveal(selector = '.reveal') {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = gsap.utils.toArray(selector);

  items.forEach((el) => {
    if (prefersReduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 82%',
        end: 'bottom 20%',
        toggleActions: 'play reverse play reverse',
      },
    });
  });
}
