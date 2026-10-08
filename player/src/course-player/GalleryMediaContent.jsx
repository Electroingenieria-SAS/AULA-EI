import React from 'react'
import { ReadingContent } from './CoursePlayerViews.jsx'

/** Stateless slide content. ImageGallery owns gestures and navigation. */
export default function GalleryMediaContent({
  mediaType, src, alt, description, fallbackText, isExternalEmbed,
  imageRef, view, onImageLoad, showHint,
}) {
  return <>
      {mediaType === 'image' && !src && <div className="gallery-media-loading" role="status">Preparando imagen…</div>}
      {mediaType === 'image' && src && <img
        ref={imageRef}
        src={src}
        alt={alt}
        draggable="false"
        decoding="async"
        onLoad={onImageLoad}
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
  </>
}
