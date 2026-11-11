import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runViewerNavigation } from '../player/src/course-player/immersive-navigation.js'
import { resolveCatalogProgress } from '../player/src/catalog-progress.js'

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


// A certificate proves overall course completion even after an editor replaces
// the current slides. Keep the original slide audit count separate.
const requiredBlocks = Array.from({ length: 11 }, (_, i) => ({ id: 'slide-' + i }))
const noneSaved = resolveCatalogProgress({
  requiredBlocks, completedBlockIds: new Set(), enrollmentStatus: 'completed', hasCertificate: true,
})
assert.equal(noneSaved.progress, 100, 'Yuli-like case: certified course must not return 0%')
assert.equal(noneSaved.completedCount, 0, 'Never forge progress rows for revised slides')
assert.equal(noneSaved.requiredCount, 11)
assert.equal(noneSaved.progressLabel, 'Certificación aprobada')

const partiallySaved = resolveCatalogProgress({
  requiredBlocks, completedBlockIds: new Set(['slide-0', 'slide-1']),
  enrollmentStatus: 'in_progress', hasCertificate: true,
})
assert.equal(partiallySaved.progress, 100)
assert.equal(partiallySaved.completedCount, 2)

const learnerStillStudying = resolveCatalogProgress({
  requiredBlocks, completedBlockIds: new Set(['slide-0', 'slide-1']),
  enrollmentStatus: 'in_progress',
})
assert.equal(learnerStillStudying.progress, 18, '2/11 must stay a true partial progress')
assert.equal(learnerStillStudying.completedCount, 2)
assert.equal(learnerStillStudying.isCompleted, false)

const savedWithoutCertificate = resolveCatalogProgress({
  requiredBlocks, completedBlockIds: new Set(), enrollmentStatus: 'completed',
})
assert.equal(savedWithoutCertificate.progress, 100, 'Completed enrollment is final')
assert.equal(savedWithoutCertificate.progressLabel, 'Capacitación completada')

const unsignedEnrollment = resolveCatalogProgress({
  requiredBlocks, completedBlockIds: new Set(), enrollmentStatus: 'assigned',
})
assert.equal(unsignedEnrollment.progress, 0)
assert.equal(unsignedEnrollment.progressLabel, '0 de 11 contenidos obligatorios')

const catalog = await readFile(new URL('../player/src/CatalogPage.jsx', import.meta.url), 'utf8')
assert.match(catalog, /resolveCatalogProgress\(/, 'Catalog uses unified completion logic')
assert.match(catalog, /\{item\.progressLabel\}/, 'Catalog must not show 0 of 11 beside a certificate')

console.log('Course immersive carousel and checkpoint contract passed.')
