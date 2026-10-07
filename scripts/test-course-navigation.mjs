import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const gallery = await readFile(new URL('../player/src/course-player/ImageGallery.jsx', import.meta.url), 'utf8')
const content = await readFile(new URL('../player/src/course-player/CourseContentViews.jsx', import.meta.url), 'utf8')

assert.match(gallery, /navigateFromViewer/, 'El visor inmersivo debe usar una transición de navegación única.')
assert.match(
  gallery,
  /onClick=\{\(\) => void navigateFromViewer\(next\)\}/,
  'El botón Siguiente del visor debe cerrar/sincronizar el visor antes de avanzar.',
)
assert.match(
  gallery,
  /await exitBrowserFullscreen\(\)[\s\S]*close\(\)[\s\S]*requestAnimationFrame/,
  'La navegación inmersiva debe salir de fullscreen, cerrar el visor y luego avanzar.',
)
assert.match(
  content,
  /setMediaViewerOpen\(false\)[\s\S]*\}, \[block\.id\]\)/,
  'Cambiar de bloque debe limpiar el estado del visor para impedir repetir la imagen anterior.',
)

console.log('Course immersive navigation tests passed.')
