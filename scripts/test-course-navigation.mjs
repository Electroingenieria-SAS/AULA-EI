import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const gallery = await readFile(new URL('../player/src/course-player/ImageGallery.jsx', import.meta.url), 'utf8')
const content = await readFile(new URL('../player/src/course-player/CourseContentViews.jsx', import.meta.url), 'utf8')
const navigation = await readFile(new URL('../player/src/course-player/immersive-navigation.js', import.meta.url), 'utf8')

assert.match(gallery, /navigateFromViewer/, 'El visor inmersivo debe usar una transición de navegación única.')
assert.match(
  gallery,
  /onClick=\{\(\) => void navigateFromViewer\(next\)\}/,
  'El botón Siguiente del visor debe cerrar/sincronizar el visor antes de avanzar.',
)
const viewerNavigationBody = navigation.match(/export async function runViewerNavigation[\s\S]*?\n}\n?$/)?.[0] || ''
assert.doesNotMatch(
  viewerNavigationBody,
  /exitBrowserFullscreen\(/,
  'Siguiente/Anterior debe conservar el fullscreen durante la transición.',
)
assert.match(
  viewerNavigationBody,
  /close\(\)[\s\S]*requestAnimationFrame/,
  'La navegación inmersiva debe cerrar solo el visor y luego avanzar.',
)
assert.match(
  gallery,
  /const closeViewer = async \(\) => \{[\s\S]*exitBrowserFullscreen\(\)[\s\S]*close\(\)/,
  'Cerrar explícitamente el visor sí debe permitir salir de fullscreen.',
)
assert.match(
  content,
  /setMediaViewerOpen\(false\)[\s\S]*\}, \[block\.id\]\)/,
  'Cambiar de bloque debe limpiar el estado del visor para impedir repetir la imagen anterior.',
)

console.log('Course immersive navigation tests passed.')
