# Fotogramas de la secuencia

Aquí van `frame-001.webp` … `frame-200.webp`.

Genéralos desde un vídeo con:

```
node scripts/extract-frames.mjs ./raw/starship.mp4
```

Fuentes libres de derechos para el vídeo base: la galería de SpaceX en Flickr
(dominio público) y el archivo de NASA.

Si cambias el número de fotogramas, actualiza `FRAME_COUNT` en
`src/scripts/canvas-sequence.js` y `FRAMES` en el script de extracción.
