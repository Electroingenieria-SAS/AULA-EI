import React, { useEffect, useState } from 'react'
import {
  BookOpen, BrainCircuit, Check, CheckCircle2, ChevronRight, CircleAlert, ExternalLink, File, FileAudio, FileText, Gamepad2, GraduationCap, Image as ImageIcon, Link2, Loader2, LockKeyhole, Maximize2, PlayCircle, Presentation, ShieldCheck, Video, X,
} from 'lucide-react'
import { safeExternalUrl } from '../../../src/security.js'
import { signedAsset } from '../supabase.js'
import { ReadingContent } from './CoursePlayerViews.jsx'
import ImageGallery from './ImageGallery.jsx'
import '../styles/immersive.css'

export function CourseOutline({ course, allBlocks, currentBlockId, completed, examUnlocked, examLoading, phaseStats, isLockedAtIndex, selectBlock, startExam, open, close }) {
  return <>
    {open && <button className="outline-backdrop" aria-label="Cerrar ruta" onClick={close} />}
    <aside className={'learner-outline ' + (open ? 'mobile-open' : '')}>
      <div className="outline-header">
        <div><span>Tu ruta</span><strong>Contenido de la capacitación</strong></div>
        <button className="outline-close" onClick={close}><X size={18} /></button>
      </div>
      <div className="outline-scroll">
        {course.phases.map((phase, phaseIndex) => {
          const stats = phaseStats(phase)
          return <section className="outline-phase-card" key={phase.id}>
            <div className="outline-phase-heading">
              <span className={stats.complete ? 'complete' : ''}>{stats.complete ? <Check size={13} /> : phaseIndex + 1}</span>
              <div><strong>{phase.title}</strong><small>{stats.done.length}/{stats.blocks.length} contenidos · {stats.percent}%</small></div>
            </div>
            <div className="outline-block-list">
              {stats.blocks.map((block) => {
                const index = allBlocks.findIndex((item) => item.id === block.id)
                const locked = isLockedAtIndex(index)
                const done = completed.has(block.id)
                const Icon = typeIcon(block.type)
                return <button key={block.id} disabled={locked} className={(currentBlockId === block.id ? 'active ' : '') + (done ? 'done ' : '')} onClick={() => selectBlock(block.id)}>
                  <span>{done ? <CheckCircle2 size={16} /> : locked ? <LockKeyhole size={15} /> : <Icon size={15} />}</span>
                  <div><strong>{block.title}</strong><small>{typeLabel(block.type)} · Disponible</small></div>
                </button>
              })}
            </div>
          </section>
        })}

        <button className={'outline-exam-card ' + (examUnlocked ? 'unlocked' : '')} disabled={!examUnlocked || examLoading} onClick={startExam}>
          <span>{examLoading ? <Loader2 className="spin" size={19} /> : examUnlocked ? <GraduationCap size={20} /> : <LockKeyhole size={18} />}</span>
          <div><strong>Examen final</strong><small>{examUnlocked ? `Desbloqueado · aprobar con ${course.passing_score || 80}%` : 'Completa los contenidos obligatorios'}</small></div>
          {examUnlocked && <ChevronRight size={17} />}
        </button>
      </div>
    </aside>
  </>
}

export function ContentExperience({ block, completed, previousTitle, nextTitle, canPrevious, canNext, previous, next }) {
  const [assetUrl, setAssetUrl] = useState(null)
  const [assetError, setAssetError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false)
  const content = block.content || {}
  const externalUrl = String(content.url || '').trim()

  useEffect(() => {
    let active = true
    setAssetUrl(null)
    setAssetError('')
    if (!block.asset_path) return () => { active = false }
    signedAsset(block.asset_path)
      .then((url) => { if (active) setAssetUrl(url) })
      .catch((error) => { if (active) setAssetError(error.message) })
    return () => { active = false }
  }, [block.id, block.asset_path])

  const displayUrl = externalUrl ? normalizeExternalUrl(externalUrl, block.type) : assetUrl
  const originalUrl = externalUrl || assetUrl
  const isExternalEmbed = Boolean(displayUrl && isEmbedProvider(displayUrl))

  const validate = () => {
    const correct = Number(content.correctIndex ?? -1)
    if (selectedOption === correct) setFeedback('¡Respuesta correcta! Puedes continuar cuando quieras.')
    else setFeedback('Respuesta marcada. Puedes seguir avanzando o revisar el contenido e intentarlo otra vez.')
  }

  const TypeIcon = typeIcon(block.type)
  const visualMedia = ['image', 'video', 'presentation'].includes(block.type)

  const openImmersive = async ({ fullscreen = false } = {}) => {
    if (fullscreen && window.matchMedia('(min-width: 901px) and (pointer: fine)').matches) {
      try {
        const root = document.documentElement
        if (!(document.fullscreenElement || document.webkitFullscreenElement)) {
          if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
          else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen()
        }
      } catch {}
    }
    setMediaViewerOpen(true)
  }


  return <article className="content-experience">
    <header className="content-experience-header">
      <div className="content-type-mark"><TypeIcon size={22} /></div>
      <div className="content-title-copy">
        <span>{typeLabel(block.type)} · {block.required ? 'Obligatorio' : 'Opcional'}</span>
        <h2>{block.title}</h2>
        {block.description && <p>{block.description}</p>}
      </div>
      {completed && <span className="content-completed-badge"><CheckCircle2 size={15} /> Completado</span>}
    </header>

    <div className="content-experience-body">
      {block.type === 'text' && <ReadingContent value={String(content.html ?? content.text ?? '')} />}

      {block.type === 'video' && displayUrl && (
        <div className="immersive-media-preview video-preview" onDoubleClick={() => openImmersive({ fullscreen: true })}>
          <div className="immersive-media-placeholder">
            <span className="immersive-media-icon"><PlayCircle size={42} /></span>
            <div><small>Video de la capacitación</small><strong>{block.title}</strong><p>Ábrelo en el visor inmersivo para reproducirlo con la navegación del curso siempre disponible.</p></div>
          </div>
          <div className="immersive-media-preview-actions">
            <span>Doble clic en PC: pantalla completa del navegador.</span>
            <button type="button" className="primary" onClick={() => openImmersive()}><Maximize2 size={16} /> Abrir vista inmersiva</button>
          </div>
        </div>
      )}

      {block.type === 'audio' && displayUrl && (
        <div className="audio-experience">
          <span><FileAudio size={30} /></span>
          <div><strong>{block.title}</strong><small>Escucha el audio a tu ritmo. El avance se registra al responder la pregunta de transición.</small><audio controls src={displayUrl} /></div>
        </div>
      )}

      {block.type === 'image' && displayUrl && (
        <div className="immersive-media-preview image-preview">
          <div
            className="immersive-image-preview-canvas"
            role="button"
            tabIndex={0}
            aria-label="Abrir imagen en vista inmersiva"
            onClick={() => {
              if (window.matchMedia('(max-width: 900px), (pointer: coarse)').matches) void openImmersive()
            }}
            onDoubleClick={() => openImmersive({ fullscreen: true })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                void openImmersive()
              }
            }}
          >
            <img src={displayUrl} alt={block.title} />
            <span className="immersive-image-preview-badge"><Maximize2 size={16} /> Doble clic: pantalla completa</span>
          </div>
          <div className="immersive-media-preview-actions">
            <span>Visor tipo galería · zoom, paneo y navegación flotante.</span>
            <div>
              {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Original</a>}
              <button type="button" className="primary" onClick={() => openImmersive()}><Maximize2 size={16} /> Abrir vista inmersiva</button>
            </div>
          </div>
        </div>
      )}

      {block.type === 'presentation' && displayUrl && (
        <div className="immersive-media-preview presentation-preview" onDoubleClick={() => openImmersive({ fullscreen: true })}>
          <div className="immersive-media-placeholder">
            <span className="immersive-media-icon"><Presentation size={40} /></span>
            <div><small>Presentación</small><strong>{block.title}</strong><p>Revisa las diapositivas dentro del visor inmersivo sin abandonar la ruta de aprendizaje.</p></div>
          </div>
          <div className="immersive-media-preview-actions">
            <span>Doble clic en PC: pantalla completa del navegador.</span>
            <div>
              {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Original</a>}
              <button type="button" className="primary" onClick={() => openImmersive()}><Maximize2 size={16} /> Abrir vista inmersiva</button>
            </div>
          </div>
        </div>
      )}

      {block.type === 'file' && displayUrl && (
        <div className="file-learning-card">
          <span><File size={28} /></span>
          <div><strong>{block.title}</strong><small>Revisa el recurso antes de continuar.</small></div>
          <a href={displayUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir archivo</a>
        </div>
      )}

      {block.type === 'link' && (
        <div className="file-learning-card link-card">
          <span><Link2 size={28} /></span>
          <div><strong>Recurso externo</strong><small>Se abrirá en una pestaña nueva para que no pierdas tu posición en Aula EI.</small></div>
          <a href={safeExternalUrl(String(content.url || '')) || '#'} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Abrir recurso</a>
        </div>
      )}

      {block.type === 'game' && (
        <div className="activity-experience">
          <span><Gamepad2 size={34} /></span>
          <h3>{content.gameTitle || block.title || 'Actividad interactiva'}</h3>
          <p>{content.instructions || 'Completa la actividad y confirma cuando hayas terminado.'}</p>
          <div className="activity-progress-note"><BrainCircuit size={16} /> El avance de este contenido se registra al responder la pregunta rápida de “Siguiente”.</div>
        </div>
      )}

      {block.type === 'validation' && (
        <div className="validation-experience">
          <div className="validation-question-heading"><ShieldCheck size={24} /><div><span>Validación rápida</span><h3>{String(content.prompt || 'Pregunta de validación')}</h3></div></div>
          <div className="validation-answer-grid">
            {(Array.isArray(content.options) ? content.options : []).map((option, index) => <button key={index} className={selectedOption === index ? 'selected' : ''} onClick={() => setSelectedOption(index)}><span>{String.fromCharCode(65 + index)}</span><strong>{String(option)}</strong>{selectedOption === index && <Check size={16} />}</button>)}
          </div>
          <button className="validation-submit" disabled={selectedOption === null} onClick={validate}><ShieldCheck size={16} /> Revisar respuesta</button>
        </div>
      )}

      {!displayUrl && ['video','audio','image','presentation','file'].includes(block.type) && <div className="asset-unavailable"><CircleAlert size={24} /><strong>Recurso no disponible</strong><span>{assetError || 'No fue posible cargar el archivo asociado a este contenido.'}</span></div>}

      {mediaViewerOpen && visualMedia && displayUrl && <ImageGallery
        src={displayUrl}
        alt={block.title}
        originalUrl={originalUrl}
        mediaType={block.type}
        isExternalEmbed={isExternalEmbed}
        close={() => setMediaViewerOpen(false)}
        previousTitle={previousTitle}
        nextTitle={nextTitle}
        canPrevious={canPrevious}
        canNext={canNext}
        previous={previous}
        next={next}
      />}

      {feedback && <div className={'content-feedback ' + (feedback.startsWith('¡') ? 'success' : '')}>{feedback}</div>}
    </div>

  </article>
}

function typeLabel(type) {
  return {
    text: 'Lectura',
    video: 'Video',
    presentation: 'Presentación',
    image: 'Imagen / infografía',
    audio: 'Audio',
    file: 'Archivo',
    link: 'Recurso externo',
    game: 'Actividad',
    validation: 'Validación',
  }[type] || 'Contenido'
}

function typeIcon(type) {
  return {
    text: FileText,
    video: Video,
    presentation: Presentation,
    image: ImageIcon,
    audio: FileAudio,
    file: File,
    link: Link2,
    game: Gamepad2,
    validation: ShieldCheck,
  }[type] || BookOpen
}

function googleDriveId(url) {
  const direct = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (direct?.[1]) return direct[1]
  try { return new URL(url).searchParams.get('id') || '' } catch { return '' }
}

function oneDriveEmbed(url) {
  try {
    const parsed = new URL(url)
    const resid = parsed.searchParams.get('resid')
    const authkey = parsed.searchParams.get('authkey')
    if (parsed.hostname.includes('onedrive.live.com') && resid) {
      const embed = new URL('https://onedrive.live.com/embed')
      embed.searchParams.set('resid', resid)
      if (authkey) embed.searchParams.set('authkey', authkey)
      return embed.toString()
    }
  } catch {}
  return url
}

function youtubeEmbed(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '')
      return id ? 'https://www.youtube.com/embed/' + id : url
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.match(/\/embed\/([^/?#]+)/)?.[1]
      return id ? 'https://www.youtube.com/embed/' + id : url
    }
  } catch {}
  return url
}

function normalizeExternalUrl(url, type) {
  const raw = url.trim()
  if (!raw) return ''
  const driveId = googleDriveId(raw)
  if (driveId) return type === 'image' ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w2400` : `https://drive.google.com/file/d/${driveId}/preview`
  if (/youtube\.com|youtu\.be/i.test(raw)) return safeExternalUrl(youtubeEmbed(raw))
  if (/onedrive\.live\.com|1drv\.ms/i.test(raw)) return safeExternalUrl(oneDriveEmbed(raw))
  return safeExternalUrl(raw)
}

function isEmbedProvider(url) {
  return /drive\.google\.com|onedrive\.live\.com|1drv\.ms|youtube\.com\/embed/i.test(url)
}
