import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runViewerNavigation } from '../player/src/course-player/immersive-navigation.js'

const gallery = await readFile(new URL('../player/src/course-player/ImageGallery.jsx', import.meta.url), 'utf8')
const content = await readFile(new URL('../player/src/course-player/CourseContentViews.jsx', import.meta.url), 'utf8')
const player = await readFile(new URL('../player/src/CoursePlayer.jsx', import.meta.url), 'utf8')
const views = await readFile(new URL('../player/src/course-player/CoursePlayerViews.jsx', import.meta.url), 'utf8')
const navigation = await readFile(new URL('../player/src/course-player/immersive-navigation.js', import.meta.url), 'utf8')
const courseStyles = await readFile(new URL('../player/src/styles/course.css', import.meta.url), 'utf8')

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

// Route layout regression: the global sidebar must not cover the course outline.
assert.match(player, /route-open/, 'El Player debe reservar una columna real para la ruta cuando está abierta.')
assert.match(player, /aria-expanded=\{outlineOpen\}/, 'El control debe reflejar el estado abierto/cerrado.')
assert.match(content, /createPortal\(/, 'La ruta móvil debe salir del contexto visual de la barra global.')
assert.match(content, /compactRoute\s*\?\s*createPortal/, 'El portal se usa solo en pantallas compactas.')
assert.match(content, /role=\{compactRoute \? 'dialog' : 'complementary'\}/, 'La ruta debe distinguir panel de escritorio y diálogo móvil.')
assert.match(content, /document\.body\.classList\.add\('course-route-open'\)/, 'La ruta móvil bloquea el scroll del fondo.')
assert.match(courseStyles, /\.course-workspace\.route-open\s*\{grid-template-columns:/, 'Al abrir ruta se reserva espacio junto al escenario.')
assert.match(courseStyles, /\.course-route-drawer\s*\{[\s\S]*?position:sticky/, 'La ruta de escritorio se ancla en la columna, no flota sobre la barra global.')
assert.match(courseStyles, /@media\(max-width:900px\)\s*\{[\s\S]*?\.course-route-drawer\s*\{[\s\S]*?position:fixed;z-index:6001/, 'La ruta móvil debe estar por encima de la interfaz institucional.')

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
