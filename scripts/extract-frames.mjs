#!/usr/bin/env node
/**
 * Extrae los fotogramas .webp de un vídeo y los deja en public/frames/.
 * Requiere ffmpeg en el PATH.
 *
 *   node scripts/extract-frames.mjs ./raw/starship.mp4
 *
 * Ajusta FRAMES y WIDTH según lo que pese la secuencia:
 *  - 480 frames a 1280px q62 ≈ 24 MB. Es el equilibrio entre fluidez y peso.
 *  - Bajar FRAMES se nota como tirones; bajar WIDTH solo se nota como
 *    suavidad, y el fondo va detrás de un velo oscuro. Si tienes que
 *    recortar peso, recorta WIDTH antes que FRAMES.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const FRAMES = 480;
const WIDTH = 1280;
const QUALITY = 62;                       // calidad webp 0-100
const OUT_DIR = resolve('public/frames');

/**
 * Localiza ffmpeg/ffprobe.
 *
 * winget instala Gyan.FFmpeg en una ruta con la versión en el nombre y el shim
 * en Links\, que solo entra en el PATH de terminales abiertas DESPUÉS de la
 * instalación. Si el binario no está en el PATH actual, lo buscamos ahí antes
 * de rendirnos.
 */
function findBinary(name) {
  try {
    execFileSync(name, ['-version'], { stdio: 'ignore' });
    return name;                                    // está en el PATH
  } catch {}

  const wingetPackages = join(
    homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages'
  );
  if (existsSync(wingetPackages)) {
    for (const dir of readdirSync(wingetPackages)) {
      if (!dir.startsWith('Gyan.FFmpeg')) continue;
      const pkg = join(wingetPackages, dir);
      for (const build of readdirSync(pkg)) {
        const candidate = join(pkg, build, 'bin', `${name}.exe`);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  console.error(
    `No se encontró ${name}. Instálalo con:  winget install Gyan.FFmpeg
` +
    'Si ya lo instalaste, abre una terminal nueva para que se recargue el PATH.'
  );
  process.exit(1);
}

const FFMPEG = findBinary('ffmpeg');
const FFPROBE = findBinary('ffprobe');

const input = process.argv[2];
if (!input) {
  console.error('Uso: node scripts/extract-frames.mjs <video>');
  process.exit(1);
}

// Duración del vídeo, para repartir los 200 fotogramas de forma uniforme.
const duration = Number(
  execFileSync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    input,
  ]).toString().trim()
);

if (!Number.isFinite(duration) || duration <= 0) {
  console.error('No se pudo leer la duración del vídeo.');
  process.exit(1);
}

const fps = FRAMES / duration;

mkdirSync(OUT_DIR, { recursive: true });
for (const f of readdirSync(OUT_DIR)) {
  if (f.endsWith('.webp')) rmSync(resolve(OUT_DIR, f));
}

console.log(`Duración ${duration.toFixed(2)}s → ${fps.toFixed(3)} fps para ${FRAMES} fotogramas`);

execFileSync(FFMPEG, [
  '-i', input,
  '-vf', `fps=${fps},scale=${WIDTH}:-2`,
  '-frames:v', String(FRAMES),
  '-c:v', 'libwebp',
  '-quality', String(QUALITY),
  '-compression_level', '6',
  resolve(OUT_DIR, 'frame-%03d.webp'),
], { stdio: 'inherit' });

console.log(`\nListo: ${FRAMES} fotogramas en ${OUT_DIR}`);
