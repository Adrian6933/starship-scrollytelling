# Starship · Scrollytelling

Experiencia de scroll narrativo sobre el lanzamiento de la Starship.
Astro + Tailwind CSS v4 + GSAP/ScrollTrigger, sin frameworks de UI: **0 KB de JS de framework**.

## Arranque

```
npm install
npm run dev
```

Antes de abrirlo necesitas los fotogramas en `public/frames/`:

```
node scripts/extract-frames.mjs ./raw/starship.mp4
```

## Estructura

```
starship-scrollytelling/
├─ astro.config.mjs            # Tailwind v4 vía plugin de Vite
├─ scripts/
│  └─ extract-frames.mjs       # vídeo -> 480 .webp con ffmpeg
├─ raw/                        # clips originales + concatenado (fuera de git)
│  ├─ clip-01-ignicion.mp4 … clip-06-aterrizaje.mp4
│  └─ starship.mp4             # los seis pegados, 48 s
├─ public/frames/              # frame-001.webp … frame-480.webp
└─ src/
   ├─ layouts/Layout.astro
   ├─ components/
   │  ├─ RocketScrollbar.astro # scrollbar-cohete + telemetría
   │  └─ StoryChapter.astro    # sección de texto reutilizable
   ├─ scripts/
   │  ├─ canvas-sequence.js    # precarga + dibujo + scrub del canvas
   │  ├─ rocket-scrollbar.js   # posición del cohete y contadores
   │  └─ text-reveal.js        # fade-in de los bloques
   ├─ styles/global.css
   └─ pages/index.astro
```

## Decisiones técnicas

**Canvas en vez de `<video>`.** Hacer scrub de un `<video>` con `currentTime`
salta entre keyframes y en iOS el navegador bloquea la reproducción
programática. Con una secuencia de imágenes precargadas el fotograma exacto
está siempre en memoria, así que subir y bajar es simétrico y fluido.

**Precarga con concurrencia limitada (12) y arranque al 25%.** Lanzar 480
peticiones a la vez satura la cola HTTP y el navegador las serializa igual,
pero con peor latencia inicial. Con 12 workers el primer fotograma llega en
milisegundos. Además el scroll se suelta al 25% cargado y el resto sigue
descargando de fondo: como la carga es secuencial y el usuario baja, la
descarga siempre va por delante de él. Esperar al 100% son varios segundos de
pantalla de carga, y en un portafolio eso es una pestaña cerrada.

**Interpolación entre fotogramas, no `Math.round()`.** GSAP calcula unos 60
valores de índice por segundo. Si los redondeas a entero, todos esos valores
colapsan en un puñado de fotogramas y la secuencia se ve a tirones aunque el
scroll sea suave. Aquí la parte decimal del índice se usa como opacidad del
fotograma siguiente, así que hay una fusión continua entre vecinos. Cuesta un
`drawImage` extra por frame, que en GPU no se nota.

**480 fotogramas, no 200.** Con 48 s de vídeo, 200 fotogramas son 4 fps de
muestreo y se nota. 480 son 10 fps, y con la interpolación encima el resultado
es continuo. Para compensar el peso, la extracción baja a 1280px y calidad 62:
22 MB en total. El fondo va detrás de un velo oscuro, así que la resolución se
nota mucho menos que la fluidez.

**`scrub: 0.6` en lugar de `scrub: true`.** Alarga el recorrido del índice tras
soltar la rueda, que es justo donde más se notaban los saltos.

**DPR limitado a 2.** En pantallas 3x el canvas a resolución nativa dispara el
coste de `drawImage` sin ganancia visual apreciable.

**Scrollbar nativa oculta, no scroll secuestrado.** Se oculta visualmente pero
el scroll sigue siendo el del documento: la rueda, el teclado, el trackpad y
los lectores de pantalla funcionan igual. El cohete es solo un indicador.

**`prefers-reduced-motion`.** Los bloques de texto aparecen sin animación si el
sistema lo pide.

## Personalizar

| Qué | Dónde |
|---|---|
| Número de fotogramas | `FRAME_COUNT` en `src/scripts/canvas-sequence.js` **y** `FRAMES` en `scripts/extract-frames.mjs` (deben coincidir) |
| Velocidad/altitud máximas | `MAX_SPEED`, `MAX_ALTITUDE` en `src/scripts/rocket-scrollbar.js` |
| Curva de aceleración | los exponentes `Math.pow(p, 1.6)` / `1.25` |
| Colores | bloque `@theme` en `src/styles/global.css` |
| Capítulos de la historia | `<StoryChapter>` en `src/pages/index.astro` |
