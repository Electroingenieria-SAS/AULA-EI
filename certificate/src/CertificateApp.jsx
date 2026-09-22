import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2, ClipboardPaste, Download, FileImage, FileText, Loader2,
  Printer, ShieldCheck, Trash2, Upload, XCircle,
} from 'lucide-react'
import QRCode from 'qrcode'
import CertificateTemplate from './CertificateTemplate.jsx'
import { supabase } from './supabase.js'
import { appUrl, assetUrl } from '../../src/paths.js'

export default function CertificateApp({ sessionUser = null }) {
  const svgRef = useRef(null)
  const [row, setRow] = useState(null)
  const [participantSignature, setParticipantSignature] = useState('')
  const [adminSignature, setAdminSignature] = useState('')
  const [logoData, setLogoData] = useState('')
  const [sealData, setSealData] = useState('')
  const [qrData, setQrData] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingSignature, setWorkingSignature] = useState(null)
  const [exporting, setExporting] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const code = useMemo(() => {
    const match = window.location.hash.match(/^#\/certificate\/([^/?#]+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : ''
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        if (!code) throw new Error('No se recibió el código del certificado.')
        if (!sessionUser) throw new Error('Debes iniciar sesión para abrir este certificado.')

        const [{ data: certificateData, error: certificateError }, { data: signatureData, error: signatureError }] = await Promise.all([
          supabase.rpc('get_certificate_by_code', { p_certificate_code: code }),
          supabase.rpc('get_certificate_signatures', { p_certificate_code: code }),
        ])
        if (certificateError) throw certificateError

        const certificateRows = Array.isArray(certificateData) ? certificateData : certificateData ? [certificateData] : []
        if (!certificateRows.length) throw new Error('No se encontró el certificado o no tienes permiso para verlo.')

        const certificateRow = certificateRows[0]
        const signatures = normalizeRpcRow(signatureData)
        const verificationUrl = new URL(appUrl('/certificate/' + encodeURIComponent(certificateRow.certificate_code || code)), window.location.origin).href

        const [logo, seal, qr] = await Promise.all([
          assetToDataUrl(assetUrl('brand/logo-aula-ei.png')),
          assetToDataUrl(assetUrl('brand/certificate-sello-ei.png')),
          QRCode.toDataURL(verificationUrl, {
            width: 480,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#0030A0', light: '#FFFFFF' },
          }),
        ])

        if (!active) return
        setRow(certificateRow)
        setParticipantSignature(signatures?.participant_signature_data || '')
        setAdminSignature(signatures?.admin_signature_data || '')
        setLogoData(logo)
        setSealData(seal)
        setQrData(qr)
        if (signatureError) setMessage('El certificado abrió, pero no fue posible cargar las firmas guardadas.')
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'No fue posible abrir el certificado.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [code, sessionUser?.id])

  const certificate = useMemo(() => {
    if (!row || !logoData || !sealData || !qrData) return null
    return {
      participant: row.user_full_name || row.user_email || 'Participante',
      course: row.course_title || 'Capacitación Aula EI',
      hours: row.hours || row.duration_hours || row.course_hours || '',
      date: longDate(row.issued_at),
      code: row.certificate_code || code,
      score: Number(row.score ?? 0),
      logoData,
      sealData,
      qrData,
      participantSignature,
      adminSignature,
      responsibleName: row.responsible_name || row.admin_full_name || row.signer_name || 'Electroingeniería S.A.S.',
      responsibleRole: row.responsible_role || row.admin_role || row.signer_role || 'Responsable de formación',
    }
  }, [row, logoData, sealData, qrData, participantSignature, adminSignature, code])

  const complete = Boolean(participantSignature && adminSignature)

  const saveSignature = async (dataUrl, type) => {
    if (!code) return
    setWorkingSignature(type)
    setMessage('Guardando firma…')
    try {
      const { data, error: rpcError } = await supabase.rpc('save_certificate_signature', {
        p_certificate_code: code,
        p_signature_type: type,
        p_signature_data: dataUrl,
      })
      if (rpcError) throw rpcError
      const saved = normalizeRpcRow(data)
      setParticipantSignature(saved?.participant_signature_data || (type === 'participant' ? dataUrl : participantSignature))
      setAdminSignature(saved?.admin_signature_data || (type === 'admin' ? dataUrl : adminSignature))
      setMessage('Firma guardada correctamente.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible guardar la firma.')
    } finally {
      setWorkingSignature(null)
    }
  }

  const uploadSignature = async (event, type) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const dataUrl = await optimizeSignature(file)
      await saveSignature(dataUrl, type)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible procesar la firma.')
    }
  }

  const pasteSignature = async (type) => {
    try {
      if (!navigator.clipboard || !('read' in navigator.clipboard)) throw new Error('Este navegador no permite pegar imágenes. Usa Subir.')
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const mime = item.types.find((value) => value.startsWith('image/'))
        if (!mime) continue
        const blob = await item.getType(mime)
        const file = new File([blob], 'firma.png', { type: mime })
        const dataUrl = await optimizeSignature(file)
        await saveSignature(dataUrl, type)
        return
      }
      throw new Error('No encontré una imagen de firma en el portapapeles.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible pegar la firma.')
    }
  }

  const clearSignature = async (type) => {
    if (!window.confirm('¿Quitar esta firma del certificado?')) return
    setWorkingSignature(type)
    try {
      const { data, error: rpcError } = await supabase.rpc('clear_certificate_signature', {
        p_certificate_code: code,
        p_signature_type: type,
      })
      if (rpcError) throw rpcError
      const saved = normalizeRpcRow(data)
      setParticipantSignature(saved?.participant_signature_data || '')
      setAdminSignature(saved?.admin_signature_data || '')
      setMessage('Firma retirada correctamente.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible quitar la firma.')
    } finally {
      setWorkingSignature(null)
    }
  }

  const ensureComplete = () => {
    if (complete) return true
    setMessage('Para descargar el certificado completo deben estar guardadas la firma del participante y la firma del responsable.')
    return false
  }

  const downloadPng = async () => {
    if (!ensureComplete()) return
    setExporting('png')
    setMessage('Generando imagen en alta resolución…')
    try {
      const canvas = await renderSvgToCanvas(svgRef.current)
      const blob = await canvasToBlob(canvas, 'image/png')
      downloadBlob(blob, fileBase(certificate) + '.png')
      setMessage('Imagen PNG descargada en 3300 × 2550 px.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible generar la imagen.')
    } finally {
      setExporting(null)
    }
  }

  const downloadPdf = async () => {
    if (!ensureComplete()) return
    setExporting('pdf')
    setMessage('Generando PDF de una sola página…')
    try {
      const canvas = await renderSvgToCanvas(svgRef.current)
      const image = canvas.toDataURL('image/png')
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'letter',
        compress: true,
        putOnlyUsedFonts: true,
      })
      const width = pdf.internal.pageSize.getWidth()
      const height = pdf.internal.pageSize.getHeight()
      pdf.addImage(image, 'PNG', 0, 0, width, height, undefined, 'FAST')
      pdf.setProperties({
        title: `Certificado Aula EI - ${certificate.participant}`,
        subject: certificate.course,
        author: 'Electroingeniería S.A.S. · Aula EI',
        creator: 'Aula EI',
        keywords: `Aula EI, certificado, ${certificate.code}`,
      })
      pdf.save(fileBase(certificate) + '.pdf')
      setMessage('PDF descargado correctamente: una sola página Carta horizontal.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible generar el PDF.')
    } finally {
      setExporting(null)
    }
  }

  if (loading) return <StatePage icon={Loader2} spin title="Cargando certificado…" text="Validando el certificado, las firmas y sus recursos." />
  if (error || !certificate) return <StatePage icon={XCircle} title="No fue posible abrir el certificado" text={error || 'No se recibió información suficiente.'} error />

  return <main className="certificate-export-page">
    <header className="certificate-export-toolbar">
      <div className="certificate-toolbar-brand">
        <img src={assetUrl('brand/logo-aula-ei.png')} alt="Aula EI" />
        <div><strong>Certificado Aula EI</strong><span>{certificate.code}</span></div>
      </div>

      <div className="certificate-export-actions">
        <button className="export-button png" onClick={downloadPng} disabled={!complete || exporting !== null}>
          {exporting === 'png' ? <Loader2 className="spin" size={17} /> : <FileImage size={17} />}
          PNG · Alta calidad
        </button>
        <button className="export-button pdf" onClick={downloadPdf} disabled={!complete || exporting !== null}>
          {exporting === 'pdf' ? <Loader2 className="spin" size={17} /> : <FileText size={17} />}
          PDF · 1 página
        </button>
        <button className="toolbar-icon-button" title="Imprimir en una página" onClick={() => complete ? window.print() : ensureComplete()} disabled={exporting !== null}>
          <Printer size={18} />
        </button>
      </div>
    </header>

    <section className="certificate-signature-bar">
      <SignatureControl
        label="Firma participante"
        type="participant"
        value={participantSignature}
        working={workingSignature}
        onUpload={uploadSignature}
        onPaste={pasteSignature}
        onClear={clearSignature}
      />
      <SignatureControl
        label="Firma responsable"
        type="admin"
        value={adminSignature}
        working={workingSignature}
        onUpload={uploadSignature}
        onPaste={pasteSignature}
        onClear={clearSignature}
      />
      <div className={'certificate-completeness ' + (complete ? 'complete' : 'incomplete')}>
        {complete ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
        <div><strong>{complete ? 'Certificado listo' : 'Firmas pendientes'}</strong><span>{complete ? 'PDF y PNG habilitados' : 'Completa ambas firmas para exportar'}</span></div>
      </div>
    </section>

    {message && <div className="certificate-export-message">{message}</div>}

    <section className="certificate-preview-stage">
      <div className="certificate-paper">
        <CertificateTemplate ref={svgRef} certificate={certificate} />
      </div>
      <div className="certificate-output-note">
        <span><FileText size={16} /> PDF: Carta horizontal · una sola página</span>
        <span><FileImage size={16} /> PNG: 3300 × 2550 px</span>
      </div>
    </section>
  </main>
}

function SignatureControl({ label, type, value, working, onUpload, onPaste, onClear }) {
  const busy = working !== null
  return <div className="signature-export-control">
    <div className="signature-export-title"><span>{label}</span>{value ? <strong>Guardada</strong> : <em>Pendiente</em>}</div>
    <div>
      <label className="small-action-button">
        {working === type ? <Loader2 className="spin" size={15} /> : <Upload size={15} />}
        Subir
        <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={(event) => onUpload(event, type)} />
      </label>
      <button className="small-action-button" disabled={busy} onClick={() => onPaste(type)}><ClipboardPaste size={15} /> Pegar</button>
      {value && <button className="small-action-button danger" disabled={busy} onClick={() => onClear(type)}><Trash2 size={15} /> Quitar</button>}
    </div>
  </div>
}

function StatePage({ icon: Icon, title, text, spin, error }) {
  return <main className="certificate-state-page"><section aria-busy={spin ? 'true' : undefined}>
    {spin ? <div className="certificate-state-loader" aria-hidden="true"><i /><i /><i /></div> : <Icon size={34} className={error ? 'state-error' : ''} />}
    <h1>{title}</h1><p>{text}</p>{error && <a href={appUrl('/')}>Volver a Aula EI</a>}
  </section></main>
}

function normalizeRpcRow(value) {
  return Array.isArray(value) ? value[0] || null : value || null
}

async function assetToDataUrl(url) {
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error('No fue posible cargar un recurso gráfico del certificado.')
  return blobToDataUrl(await response.blob())
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No fue posible leer un recurso gráfico.'))
    reader.readAsDataURL(blob)
  })
}

async function optimizeSignature(file) {
  if (!file.type.startsWith('image/')) throw new Error('La firma debe ser una imagen PNG, JPG o WEBP.')
  const source = await blobToDataUrl(file)
  const image = await loadImage(source)
  const maxWidth = 900
  const maxHeight = 260
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = maxWidth
  canvas.height = maxHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No fue posible optimizar la firma.')
  context.clearRect(0, 0, maxWidth, maxHeight)
  context.drawImage(image, Math.round((maxWidth - width) / 2), Math.round((maxHeight - height) / 2), width, height)
  const result = canvas.toDataURL('image/png')
  if (result.length > 1200000) throw new Error('La firma es demasiado pesada. Usa una imagen más liviana.')
  return result
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No fue posible procesar una imagen del certificado.'))
    image.src = source
  })
}

async function renderSvgToCanvas(svg) {
  if (!svg) throw new Error('El certificado aún no está listo para exportar.')
  if (document.fonts?.ready) await document.fonts.ready
  const serialized = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = 3300
    canvas.height = 2550
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('No fue posible crear el archivo del certificado.')
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No fue posible generar el archivo.')), type, 1)
  })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fileBase(certificate) {
  const person = `${certificate.participant}-${certificate.course}-${certificate.code}`
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
  return 'Certificado-Aula-EI-' + person
}

function longDate(value) {
  const date = value ? new Date(value) : new Date()
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}
