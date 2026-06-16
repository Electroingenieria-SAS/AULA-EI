import { useEffect, useRef } from 'react'
import type { CertificateTemplateData } from '../lib/certificateTools'

export function CertificateTemplate({ certificado }: { certificado: CertificateTemplateData }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const certificateRef = useRef<HTMLDivElement | null>(null)
  const companyLogoUrl = `${import.meta.env.BASE_URL}brand/certificate-sello-ei.png`

  useEffect(() => {
    const wrapper = wrapperRef.current
    const certificate = certificateRef.current
    if (!wrapper || !certificate) return

    const scaleCertificate = () => {
      const ratio = wrapper.clientWidth / 3300
      certificate.style.transform = `scale(${ratio})`
      wrapper.style.height = `${2550 * ratio}px`
    }

    scaleCertificate()

    const observer = new ResizeObserver(scaleCertificate)
    observer.observe(wrapper)
    window.addEventListener('resize', scaleCertificate)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', scaleCertificate)
    }
  }, [])

  return (
    <div className="clean-certificate-wrapper" ref={wrapperRef}>
      <div className="clean-certificate" ref={certificateRef}>
        <div className="clean-border-outer" />
        <div className="clean-border-inner" />
        <div className="clean-corner clean-corner-left" />
        <div className="clean-corner clean-corner-right" />

        <header className="clean-cert-header">
          <img className="clean-aula-logo" src={certificado.logoUrl} alt="Aula EI" />
        </header>

        <main className="clean-cert-body">
          <p className="clean-pretitle">Se otorga el presente</p>
          <h1>CERTIFICADO</h1>
          <p className="clean-to">a</p>
          <h2>{certificado.participante}</h2>
          <div className="clean-name-line" />

          <p className="clean-achievement">Por haber completado satisfactoriamente la formación:</p>
          <h3>“{certificado.curso}”</h3>

          <p className="clean-detail">
            Desarrollada a través de Aula EI, con una intensidad de {certificado.horas || '00'} horas,<br />
            bajo los lineamientos internos de formación de Electroingeniería S.A.S.
          </p>

          <p className="clean-date">Emitido el {certificado.fecha}</p>
        </main>

        <section className="clean-signatures">
          <div className="clean-signature-block">
            <div className="clean-signature-image">
              {certificado.participantSignatureUrl ? (
                <img src={certificado.participantSignatureUrl} alt="Firma del participante" />
              ) : (
                <span>Firma del participante</span>
              )}
            </div>
            <div className="clean-signature-line" />
            <strong>{certificado.participante}</strong>
            <small>Participante</small>
          </div>

          <div className="clean-signature-block">
            <div className="clean-signature-image">
              {certificado.adminSignatureUrl ? (
                <img src={certificado.adminSignatureUrl} alt="Firma del responsable" />
              ) : (
                <span>Firma del responsable</span>
              )}
            </div>
            <div className="clean-signature-line" />
            <strong>{certificado.responsable2?.nombre || certificado.responsable1?.nombre || 'Nombre del Responsable'}</strong>
            <small>{certificado.responsable2?.cargo || certificado.responsable1?.cargo || 'Cargo'}</small>
          </div>
        </section>

        <footer className="clean-cert-footer">
          <div className="clean-validation">
            <span>Código de certificado</span>
            <strong>{certificado.codigo}</strong>
          </div>

          <img className="clean-company-logo" src={companyLogoUrl} alt="Electroingeniería" />

          <div className="clean-qr">
            <img src={certificado.qrUrl} alt="QR de verificación" />
          </div>
        </footer>

        <p className="clean-footer-text">Electroingeniería S.A.S. · Plataforma interna de formación · Aula EI</p>
      </div>
    </div>
  )
}
