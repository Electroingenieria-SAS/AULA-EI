import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Eye, ShieldCheck, X } from 'lucide-react'
import { navigateLearner } from './navigation.js'
import { supabase } from './supabase.js'
import { ContentExperience, useCourseAsset } from './course-player/CourseContentViews.jsx'
import ImageGallery from './course-player/ImageGallery.jsx'

/**
 * Administrative preview of saved training content. This view deliberately does
 * not load enrollments, create block progress, request exam questions or submit
 * evaluation answers. Database RLS remains the authority for course visibility.
 */
export default function CoursePreview({ profile, courseId }) {
  const allowed = ['admin', 'super_admin'].includes(String(profile?.role || ''))
  const [course, setCourse] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [immersiveOpen, setImmersiveOpen] = useState(false)
  const blocks = useMemo(() => (course?.phases || []).flatMap((phase) =>
    [...(phase.blocks || [])]
      .sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((block) => ({ ...block, phaseTitle: phase.title }))
  ), [course])
  const block = blocks[index] || null
  const asset = useCourseAsset(block)

  useEffect(() => {
    let active = true
    setCourse(null)
    setError('')
    setIndex(0)
    setLoading(true)
    if (!allowed || !courseId) {
      setError('No tienes permiso para consultar esta vista previa.')
      setLoading(false)
      return () => { active = false }
    }
    ;(async () => {
      try {
        const result = await supabase.from('courses')
          .select('id,title,description,status,passing_score,phases:course_phases(id,title,sort_order,blocks:content_blocks(*))')
          .eq('id', courseId).single()
        if (result.error) throw result.error
        if (!active) return
        const value = result.data
        setCourse({ ...value, phases: [...(value.phases || [])].sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)) })
      } catch (cause) {
        if (active) setError(cause?.message || 'No fue posible consultar este curso con tus permisos actuales.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [allowed, courseId])

  const next = () => setIndex((value) => Math.min(blocks.length - 1, value + 1))
  const previous = () => setIndex((value) => Math.max(0, value - 1))

  if (loading) return <main className="course-preview-state" role="status">Preparando la vista previa del curso…</main>
  if (error || !course) return <main className="course-preview-state" role="alert">
    <ShieldCheck size={28} /><h1>Vista previa no disponible</h1><p>{error}</p>
    <button type="button" onClick={() => navigateLearner('/studio')}>Volver a Gestión Aula EI</button>
  </main>

  return <main className="course-preview-page">
    <header className="course-preview-head">
      <div>
        <span className="course-preview-eyebrow"><Eye size={16}/> Simulación administrativa · Solo lectura</span>
        <h1>{course.title}</h1>
        <p>{course.description || 'Consulta los contenidos guardados antes de publicar la capacitación.'}</p>
      </div>
      <button type="button" onClick={() => navigateLearner('/studio')}><ArrowLeft size={17}/> Volver a gestión</button>
    </header>
    <div className="course-preview-notice" role="status">
      <ShieldCheck size={18}/>
      <span>Estás revisando la versión guardada, no un intento de aprendizaje. No se registran avances, respuestas, calificaciones ni certificados.</span>
      <strong>{course.status === 'published' ? 'Publicado' : 'Sin publicar'}</strong>
    </div>
    {blocks.length ? <div className="course-preview-workspace">
      <nav className="course-preview-outline" aria-label="Contenido del curso">
        <strong><BookOpen size={17}/> Estructura ({blocks.length})</strong>
        {blocks.map((item, position) => <button key={item.id}
          type="button" className={position === index ? 'active' : ''}
          aria-current={position === index ? 'step' : undefined}
          onClick={() => setIndex(position)}>
          <small>{item.phaseTitle}</small><span>{position + 1}. {item.title}</span>
        </button>)}
      </nav>
      <div className="course-preview-lesson">
        {block && <ContentExperience block={block} completed={false} asset={asset} openImmersive={() => setImmersiveOpen(true)}/>}
        <nav className="course-preview-nav" aria-label="Recorrido de vista previa">
          <button type="button" disabled={index === 0} onClick={previous}><ArrowLeft size={17}/> Anterior</button>
          <span>{index + 1} / {blocks.length}</span>
          <button type="button" disabled={index >= blocks.length - 1} onClick={next}>Siguiente <ArrowRight size={17}/></button>
        </nav>
      </div>
    </div> : <section className="course-preview-empty">
      <BookOpen size={30}/><h2>El curso todavía no tiene contenidos</h2>
      <p>Agrega fases y bloques desde el constructor para visualizar cómo los verá un colaborador.</p>
    </section>}
    {immersiveOpen && block && <ImageGallery
      src={asset.displayUrl}
      assetError={asset.assetError}
      alt={block.title}
      description={block.description || ''}
      originalUrl={asset.originalUrl}
      mediaType={block.type}
      isExternalEmbed={asset.isExternalEmbed}
      fallbackText={String(block.content?.html ?? block.content?.text ?? '')}
      close={() => setImmersiveOpen(false)}
      previousTitle={blocks[index - 1]?.title || ''}
      nextTitle={blocks[index + 1]?.title || ''}
      canPrevious={index > 0}
      canNext={index < blocks.length - 1}
      previous={previous}
      next={next}
    />}
  </main>
}
