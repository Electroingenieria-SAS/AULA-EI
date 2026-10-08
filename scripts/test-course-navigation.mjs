import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runViewerNavigation } from '../player/src/course-player/immersive-navigation.js'

const gallery = await readFile(new URL('../player/src/course-player/ImageGallery.jsx', import.meta.url), 'utf8')
const content = await readFile(new URL('../player/src/course-player/CourseContentViews.jsx', import.meta.url), 'utf8')
const player = await readFile(new URL('../player/src/CoursePlayer.jsx', import.meta.url), 'utf8')
const views = await readFile(new URL('../player/src/course-player/CoursePlayerViews.jsx', import.meta.url), 'utf8')
const navigation = await readFile(new URL('../player/src/course-player/immersive-navigation.js', import.meta.url), 'utf8')

assert.match(player, /immersiveOpen && currentBlock/, 'Un único visor debe pertenecer al reproductor y sobrevivir al cambio de bloque.')
assert.match(player, /practiceNode=\{practiceGateOpen/, 'La pregunta debe aparecer como paso del carrusel.')
assert.match(player, /practiceGateOpen && !immersiveOpen/, 'Fuera del visor sigue disponible el checkpoint convencional.')
assert.match(views, /export function PracticeGateContent/, 'El checkpoint debe reutilizar un componente de contenido.')
assert.match(gallery, /gallery-question-stage/, 'El visor debe mostrar la pregunta dentro de su escenario.')
assert.match(gallery, /!practiceStep && <nav/, 'El carrusel bloquea flechas durante una pregunta.')
assert.match(content, /export function useCourseAsset/, 'El recurso multimedia debe compartirse entre pantalla y visor.')
assert.doesNotMatch(content, /setMediaViewerOpen/, 'Las tarjetas no deben montar sus propios visores.')
assert.doesNotMatch(navigation, /close\(\)/, 'Siguiente/Anterior no debe cerrar la galería.')
assert.match(gallery, /exitBrowserFullscreen\(\)/, 'El cierre explícito sale del fullscreen.')

let count = 0
let closed = false
const navigationBusyRef = { current: false }
await Promise.all([
  runViewerNavigation({ action: async () => { count += 1; await Promise.resolve() }, navigationBusyRef }),
  runViewerNavigation({ action: async () => { count += 100 }, navigationBusyRef, close: () => { closed = true } }),
])
assert.equal(count, 1, 'Los clics simultáneos no deben saltarse diapositivas.')
assert.equal(closed, false, 'La navegación conserva el visor activo.')
assert.equal(navigationBusyRef.current, false, 'La navegación debe liberar el bloqueo al finalizar.')

console.log('Course immersive carousel and checkpoint contract passed.')
