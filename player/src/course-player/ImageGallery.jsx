import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, ArrowRight, ExternalLink, Images, Maximize2, Minimize2, RotateCcw, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { exitBrowserFullscreen, runViewerNavigation } from './immersive-navigation.js'
import { ReadingContent } from './CoursePlayerViews.jsx'
import '../styles/gallery.css'

export default function ImageGallery({ src, alt, description = '', originalUrl, close, previousTitle, nextTitle, canPrevious, canNext, previous, next, mediaType = 'image', isExternalEmbed = false, fallbackText = '', practiceStep = false, practiceNode = null }) {
  const viewerRef = useRef(null)
  const stageRef = useRef(null)
  const imageRef = useRef(null)
  const pointersRef = useRef(new Map())
  const navigationBusyRef = useRef(false)
  const viewRef = useRef({ scale: 1, x: 0, y: 0 })
  const gestureRef = useRef({
    mode: 'idle',
    startedAt: 0,
    startPoint: null,
    startCenter: null,
    startDistance: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    moved: false,
    lastTapAt: 0,
    lastTapPoint: null,
  })
  const [view, setView] = useState(viewRef.current)
  const [showHint, setShowHint] = useState(mediaType === 'image')
  const [browserFullscreen, setBrowserFullscreen] = useState(Boolean(document.fullscreenElement || document.webkitFullscreenElement))

  const clampScale = (value) => Math.min(6, Math.max(1, Number(value) || 1))

  const clampView = (candidate) => {
    const stage = stageRef.current
    const image = imageRef.current
    const scale = clampScale(candidate.scale)

    if (!stage || !image || scale <= 1.001) return { scale: 1, x: 0, y: 0 }

    const imageWidth = image.offsetWidth || stage.clientWidth
    const imageHeight = image.offsetHeight || stage.clientHeight
    const maxX = Math.max(0, (imageWidth * scale - stage.clientWidth) / 2)
    const maxY = Math.max(0, (imageHeight * scale - stage.clientHeight) / 2)

    return {
      scale,
      x: Math.max(-maxX, Math.min(maxX, Number(candidate.x) || 0)),
      y: Math.max(-maxY, Math.min(maxY, Number(candidate.y) || 0)),
    }
  }

  const applyView = (candidate) => {
    const nextView = clampView(candidate)
    viewRef.current = nextView
    setView(nextView)
  }

  const resetView = () => applyView({ scale: 1, x: 0, y: 0 })

  const zoomAt = (requestedScale, clientX = null, clientY = null) => {
    const current = viewRef.current
    const scale = clampScale(requestedScale)
    if (scale <= 1.001) return resetView()

    let x = current.x
    let y = current.y
    const stage = stageRef.current

    if (stage && Number.isFinite(clientX) && Number.isFinite(clientY)) {
      const rect = stage.getBoundingClientRect()
      const anchorX = clientX - (rect.left + rect.width / 2)
      const anchorY = clientY - (rect.top + rect.height / 2)
      const ratio = scale / current.scale
      x = anchorX - (anchorX - current.x) * ratio
      y = anchorY - (anchorY - current.y) * ratio
    } else if (current.scale > 0) {
      const ratio = scale / current.scale
      x = current.x * ratio
      y = current.y * ratio
    }

    applyView({ scale, x, y })
  }

  const pointerCenter = (values) => ({
    x: (values[0].x + values[1].x) / 2,
    y: (values[0].y + values[1].y) / 2,
  })

  const pointerDistance = (values) => Math.hypot(
    values[0].x - values[1].x,
    values[0].y - values[1].y,
  )

  const rememberGestureStart = (mode, point = null) => {
    const current = viewRef.current
    gestureRef.current = {
      ...gestureRef.current,
      mode,
      startedAt: Date.now(),
      startPoint: point,
      startCenter: null,
      startDistance: 0,
      startScale: current.scale,
      startX: current.x,
      startY: current.y,
      moved: false,
    }
  }

  const startPinch = () => {
    const values = [...pointersRef.current.values()].slice(0, 2)
    if (values.length < 2) return
    const current = viewRef.current
    gestureRef.current = {
      ...gestureRef.current,
      mode: 'pinch',
      startedAt: Date.now(),
      startPoint: null,
      startCenter: pointerCenter(values),
      startDistance: Math.max(1, pointerDistance(values)),
      startScale: current.scale,
      startX: current.x,
      startY: current.y,
      moved: true,
    }
  }

  const toggleBrowserFullscreen = async () => {
    const fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement
    try {
      if (fullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen()
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      } else {
        const root = document.documentElement
        if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' })
        else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen()
      }
    } catch {}
  }

  const closeViewer = async () => {
    await exitBrowserFullscreen()
    close()
  }

  const navigateFromViewer = (action) => runViewerNavigation({ action, navigationBusyRef })

  useEffect(() => {
    document.body.classList.add('aula-media-viewer-open')
    const timer = window.setTimeout(() => setShowHint(false), mediaType === 'image' ? 3200 : 0)

    const onKey = (event) => {
      if (event.key === 'Escape' && !(document.fullscreenElement || document.webkitFullscreenElement)) close()
      if (practiceStep || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return
      if (event.key === 'ArrowLeft' && canPrevious) {
        event.preventDefault()
        void navigateFromViewer(previous)
      }
      if (event.key === 'ArrowRight' && canNext) {
        event.preventDefault()
        void navigateFromViewer(next)
      }
      if ((event.key === '+' || event.key === '=') && !event.ctrlKey) zoomAt(viewRef.current.scale + .5)
      if (event.key === '-' && !event.ctrlKey) zoomAt(viewRef.current.scale - .5)
      if (event.key === '0' && !event.ctrlKey) resetView()
    }

    const reclamp = () => applyView(viewRef.current)
    const syncFullscreen = () => setBrowserFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement))
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', syncFullscreen)
    document.addEventListener('webkitfullscreenchange', syncFullscreen)
    window.addEventListener('resize', reclamp, { passive: true })
    window.visualViewport?.addEventListener('resize', reclamp, { passive: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', reclamp)
      window.visualViewport?.removeEventListener('resize', reclamp)
      document.removeEventListener('fullscreenchange', syncFullscreen)
      document.removeEventListener('webkitfullscreenchange', syncFullscreen)
      document.body.classList.remove('aula-media-viewer-open')
    }
  }, [src, canPrevious, canNext, previous, next, close, practiceStep])

  useEffect(() => {
    pointersRef.current.clear()
    viewRef.current = { scale: 1, x: 0, y: 0 }
    setView({ scale: 1, x: 0, y: 0 })
    setShowHint(mediaType === 'image')
  }, [src, mediaType])

  const onPointerDown = (event) => {
    if (mediaType !== 'image') return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    setShowHint(false)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      startPinch()
      event.preventDefault()
      return
    }

    rememberGestureStart(viewRef.current.scale > 1.001 ? 'pan' : 'swipe', {
      x: event.clientX,
      y: event.clientY,
    })
  }

  const onPointerMove = (event) => {
    if (mediaType !== 'image') return
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      if (gestureRef.current.mode !== 'pinch') startPinch()
      const gesture = gestureRef.current
      const values = [...pointersRef.current.values()].slice(0, 2)
      const center = pointerCenter(values)
      const distance = Math.max(1, pointerDistance(values))
      const scale = clampScale(gesture.startScale * (distance / gesture.startDistance))
      const stage = stageRef.current
      const rect = stage?.getBoundingClientRect()

      if (rect && gesture.startCenter) {
        const startAnchorX = gesture.startCenter.x - (rect.left + rect.width / 2)
        const startAnchorY = gesture.startCenter.y - (rect.top + rect.height / 2)
        const currentAnchorX = center.x - (rect.left + rect.width / 2)
        const currentAnchorY = center.y - (rect.top + rect.height / 2)
        const ratio = scale / gesture.startScale

        applyView({
          scale,
          x: currentAnchorX - (startAnchorX - gesture.startX) * ratio,
          y: currentAnchorY - (startAnchorY - gesture.startY) * ratio,
        })
      } else {
        applyView({ scale, x: gesture.startX, y: gesture.startY })
      }

      event.preventDefault()
      return
    }

    const gesture = gestureRef.current
    if (!gesture.startPoint) return

    const dx = event.clientX - gesture.startPoint.x
    const dy = event.clientY - gesture.startPoint.y
    if (Math.hypot(dx, dy) > 6) gesture.moved = true

    if (gesture.mode === 'pan' && viewRef.current.scale > 1.001) {
      applyView({
        scale: viewRef.current.scale,
        x: gesture.startX + dx,
        y: gesture.startY + dy,
      })
      event.preventDefault()
    }
  }

  const registerTap = (event) => {
    if (mediaType !== 'image' || event.pointerType === 'mouse') return false
    const gesture = gestureRef.current
    if (gesture.moved || Date.now() - gesture.startedAt > 320) return false

    const now = Date.now()
    const point = { x: event.clientX, y: event.clientY }
    const previousTap = gesture.lastTapPoint
    const nearPrevious = previousTap
      ? Math.hypot(point.x - previousTap.x, point.y - previousTap.y) < 36
      : false

    if (gesture.lastTapAt && now - gesture.lastTapAt < 320 && nearPrevious) {
      if (viewRef.current.scale > 1.15) resetView()
      else zoomAt(2.5, point.x, point.y)
      gesture.lastTapAt = 0
      gesture.lastTapPoint = null
      return true
    }

    gesture.lastTapAt = now
    gesture.lastTapPoint = point
    return false
  }

  const finishSinglePointerGesture = (event) => {
    const gesture = gestureRef.current
    if (!gesture.startPoint) return

    const dx = event.clientX - gesture.startPoint.x
    const dy = event.clientY - gesture.startPoint.y
    const isSwipe = viewRef.current.scale <= 1.001
      && Math.abs(dx) >= 62
      && Math.abs(dx) > Math.abs(dy) * 1.25

    if (isSwipe) {
      if (dx < 0 && canNext) void navigateFromViewer(next)
      if (dx > 0 && canPrevious) void navigateFromViewer(previous)
      gesture.lastTapAt = 0
      gesture.lastTapPoint = null
      return
    }

    registerTap(event)
  }

  const onPointerUp = (event) => {
    if (mediaType !== 'image') return
    const wasSinglePointer = pointersRef.current.size === 1
    if (wasSinglePointer) finishSinglePointerGesture(event)

    pointersRef.current.delete(event.pointerId)
    event.currentTarget.releasePointerCapture?.(event.pointerId)

    if (pointersRef.current.size === 1 && viewRef.current.scale > 1.001) {
      const [remaining] = pointersRef.current.values()
      rememberGestureStart('pan', remaining)
      return
    }

    if (!pointersRef.current.size) {
      applyView(viewRef.current)
      gestureRef.current.mode = 'idle'
      gestureRef.current.startPoint = null
      gestureRef.current.startCenter = null
    }
  }

  const onPointerCancel = (event) => {
    if (mediaType !== 'image') return
    pointersRef.current.delete(event.pointerId)
    if (!pointersRef.current.size) {
      applyView(viewRef.current)
      gestureRef.current.mode = 'idle'
      gestureRef.current.startPoint = null
      gestureRef.current.startCenter = null
    }
  }

  const viewer = <div
    ref={viewerRef}
    className={'image-lightbox gallery-viewer-v7 immersive-media-viewer media-' + mediaType}
    role="dialog"
    aria-modal="true"
    aria-label={practiceStep ? 'Pregunta de transición de la capacitación' : 'Contenido inmersivo: ' + alt}
  >
    <div className="lightbox-toolbar gallery-toolbar">
      <div className="gallery-toolbar-title"><Images size={17} /><strong>{practiceStep ? 'Pregunta rápida' : alt}</strong></div>
      <div className="gallery-toolbar-actions">
        {mediaType === 'image' && !practiceStep && <button type="button" onClick={() => zoomAt(viewRef.current.scale - .5)} title="Alejar" aria-label="Alejar imagen"><ZoomOut size={18} /></button>}
        {mediaType === 'image' && !practiceStep && <span className="gallery-zoom-badge">{Math.round(view.scale * 100)}%</span>}
        {mediaType === 'image' && !practiceStep && <button type="button" onClick={() => zoomAt(viewRef.current.scale + .5)} title="Acercar" aria-label="Acercar imagen"><ZoomIn size={18} /></button>}
        {mediaType === 'image' && !practiceStep && <button type="button" onClick={resetView} title="Restablecer zoom" aria-label="Restablecer imagen"><RotateCcw size={17} /></button>}
        <button type="button" onClick={toggleBrowserFullscreen} title={browserFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} aria-label={browserFullscreen ? 'Salir de pantalla completa' : 'Abrir pantalla completa'}>{browserFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
        {originalUrl && !practiceStep && <a href={originalUrl} target="_blank" rel="noreferrer" title="Abrir original" aria-label="Abrir imagen original"><ExternalLink size={17} /></a>}
        <button type="button" className="gallery-close-button" onClick={closeViewer} title="Cerrar" aria-label="Cerrar visor"><X size={20} /></button>
      </div>
    </div>

    <div
      ref={stageRef}
      className={'lightbox-canvas touch-zoom-canvas gallery-stage ' + (view.scale > 1.001 ? 'is-zoomed' : 'is-fitted')}
      onPointerDown={practiceStep ? undefined : onPointerDown}
      onPointerMove={practiceStep ? undefined : onPointerMove}
      onPointerUp={practiceStep ? undefined : onPointerUp}
      onPointerCancel={practiceStep ? undefined : onPointerCancel}
      onDoubleClick={(event) => {
        if (!practiceStep && window.matchMedia('(min-width: 901px) and (pointer: fine)').matches) {
          event.preventDefault()
          void toggleBrowserFullscreen()
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {practiceStep ? <div className="gallery-question-stage">{practiceNode}</div> : <>
      {mediaType === 'image' && !src && <div className="gallery-media-loading" role="status">Preparando imagen…</div>}
      {mediaType === 'image' && src && <img
        ref={imageRef}
        src={src}
        alt={alt}
        draggable="false"
        decoding="async"
        onLoad={() => applyView(viewRef.current)}
        style={{
          '--gallery-x': view.x + 'px',
          '--gallery-y': view.y + 'px',
          '--gallery-scale': String(view.scale),
        }}
      />}

      {mediaType === 'video' && !src && <div className="gallery-media-loading" role="status">Preparando video…</div>}
      {mediaType === 'video' && src && <div className="immersive-video-frame">
        {isExternalEmbed
          ? <iframe src={src} title={alt} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          : <video src={src} controls autoPlay playsInline />}
      </div>}

      {mediaType === 'presentation' && !src && <div className="gallery-media-loading" role="status">Preparando presentación…</div>}
      {mediaType === 'presentation' && src && <div className="immersive-presentation-frame">
        <iframe src={src} title={alt} allowFullScreen />
      </div>}

      {!['image', 'video', 'presentation'].includes(mediaType) && <div className="gallery-other-content">
        <h2>{alt}</h2>
        {description && <p>{description}</p>}
        {mediaType === 'text' ? <ReadingContent value={fallbackText} /> : <p>Este paso requiere interacción en el reproductor normal. Puedes volver usando Cerrar visor.</p>}
      </div>}
      {showHint && mediaType === 'image' && <div className="gallery-gesture-hint" role="status">
        <strong>Pellizca para ampliar</strong>
        <span>Arrastra para recorrer · doble toque para zoom · desliza a los lados para avanzar.</span>
      </div>}
      </>}
    </div>

    {!practiceStep && <nav className="lightbox-course-nav gallery-course-nav" aria-label="Navegación de la capacitación">
      <button
        type="button"
        className="gallery-nav-button gallery-nav-previous"
        disabled={!canPrevious}
        onClick={() => void navigateFromViewer(previous)}
        aria-label={'Contenido anterior: ' + previousTitle}
      >
        <ArrowLeft size={24} />
        <span><small>Anterior</small><strong>{previousTitle}</strong></span>
      </button>
      <div className="gallery-navigation-status">
        <span>{mediaType === 'image' ? (view.scale > 1.001 ? 'Imagen ampliada' : 'Imagen ajustada') : mediaType === 'video' ? 'Video inmersivo' : 'Presentación inmersiva'}</span>
        <small>{mediaType === 'image' ? (view.scale > 1.001 ? 'Arrastra para recorrerla' : 'Doble clic: pantalla completa · desliza para cambiar') : 'Doble clic: pantalla completa · usa los botones para avanzar'}</small>
      </div>
      <button
        type="button"
        className="gallery-nav-button gallery-nav-next"
        disabled={!canNext}
        onClick={() => void navigateFromViewer(next)}
        aria-label={'Siguiente contenido: ' + nextTitle}
      >
        <span><small>Siguiente</small><strong>{nextTitle}</strong></span>
        <ArrowRight size={24} />
      </button>
    </nav>}
  </div>

  return createPortal(viewer, document.body)
}
