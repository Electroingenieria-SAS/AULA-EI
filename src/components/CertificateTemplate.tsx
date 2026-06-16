import type { CertificateTemplateData } from '../lib/certificateTools'

export function CertificateTemplate({ certificado }: { certificado: CertificateTemplateData }) {
  const companyLogoUrl = `${import.meta.env.BASE_URL}brand/certificate-sello-ei.png`
  const participantFont = certificado.participante.length > 34 ? 78 : certificado.participante.length > 26 ? 88 : 98
  const courseFont = certificado.curso.length > 42 ? 44 : certificado.curso.length > 30 ? 52 : 62

  return (
    <div className="svg-certificate-wrapper">
      <svg className="svg-certificate" viewBox="0 0 3300 2550" role="img" aria-label={`Certificado ${certificado.codigo}`}>
        <defs>
          <linearGradient id="eiBlueGradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#00236F" />
            <stop offset="55%" stopColor="#0030A0" />
            <stop offset="100%" stopColor="#174DB3" />
          </linearGradient>
          <linearGradient id="paperGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FBFAF6" />
          </linearGradient>
          <pattern id="paperTexture" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M0 14 H28 M14 0 V28" stroke="#E7DFCF" strokeWidth="0.8" opacity="0.20" />
            <path d="M0 0 L28 28 M28 0 L0 28" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.22" />
          </pattern>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="18" dy="20" stdDeviation="18" floodColor="#000000" floodOpacity="0.16" />
          </filter>
        </defs>

        <rect x="0" y="0" width="3300" height="2550" fill="url(#paperGradient)" />
        <rect x="0" y="0" width="3300" height="2550" fill="url(#paperTexture)" />

        <rect x="26" y="26" width="3248" height="2498" fill="none" stroke="#00236F" strokeWidth="10" />
        <rect x="54" y="54" width="3192" height="2442" fill="none" stroke="#F8D000" strokeWidth="3" />
        <rect x="78" y="78" width="3144" height="2394" fill="none" stroke="#0030A0" strokeWidth="5" />
        <rect x="102" y="102" width="3096" height="2346" fill="none" stroke="#F8D000" strokeWidth="2" opacity="0.85" />

        <path d="M0 0 H720 L0 530 Z" fill="url(#eiBlueGradient)" filter="url(#softShadow)" />
        <path d="M45 45 H650 L45 455 Z" fill="none" stroke="#F8D000" strokeWidth="5" />
        <path d="M3300 2550 H2580 L3300 2020 Z" fill="url(#eiBlueGradient)" />
        <path d="M3255 2505 H2650 L3255 2095 Z" fill="none" stroke="#F8D000" strokeWidth="5" />

        <g opacity="0.11" fill="#A0A8B0">
          <circle cx="2870" cy="300" r="26" />
          <circle cx="2810" cy="345" r="26" />
          <circle cx="2930" cy="345" r="26" />
          <circle cx="2750" cy="410" r="26" />
          <circle cx="2870" cy="410" r="26" fill="#F8D000" />
          <circle cx="2990" cy="410" r="26" />
          <circle cx="2810" cy="475" r="26" />
          <circle cx="2870" cy="475" r="26" fill="#F8D000" />
          <circle cx="2930" cy="475" r="26" />
          <circle cx="2840" cy="550" r="26" />
          <circle cx="2900" cy="550" r="26" />
        </g>

        <g opacity="0.12" fill="none" stroke="#C99A22" strokeWidth="4">
          <path d="M370 455 C170 790 170 1730 430 2055" />
          <path d="M315 455 C115 790 115 1730 375 2055" />
          <path d="M2920 455 C3130 790 3130 1730 2870 2055" />
          <path d="M2985 455 C3195 790 3195 1730 2935 2055" />
        </g>

        <image href={certificado.logoUrl} x="1035" y="135" width="1230" height="310" preserveAspectRatio="xMidYMid meet" />

        <g stroke="#C99A22" strokeWidth="4" fill="none">
          <line x1="1120" y1="500" x2="1560" y2="500" />
          <line x1="1740" y1="500" x2="2180" y2="500" />
          <polygon points="1650,482 1668,500 1650,518 1632,500" />
          <circle cx="1095" cy="500" r="7" fill="#C99A22" />
          <circle cx="2205" cy="500" r="7" fill="#C99A22" />
        </g>

        <text x="1650" y="650" textAnchor="middle" className="svg-pretitle">Se otorga el presente</text>
        <text x="1650" y="820" textAnchor="middle" className="svg-title">CERTIFICADO</text>

        <g stroke="#C99A22" strokeWidth="4" fill="none">
          <line x1="1285" y1="910" x2="1550" y2="910" />
          <line x1="1750" y1="910" x2="2015" y2="910" />
        </g>
        <text x="1650" y="932" textAnchor="middle" className="svg-to">a</text>

        <text x="1650" y="1090" textAnchor="middle" className="svg-participant" style={{ fontSize: participantFont }}>
          {certificado.participante}
        </text>

        <g stroke="#C99A22" strokeWidth="4" fill="none">
          <line x1="820" y1="1172" x2="1608" y2="1172" />
          <line x1="1692" y1="1172" x2="2480" y2="1172" />
          <polygon points="1650,1155 1667,1172 1650,1189 1633,1172" />
        </g>

        <text x="1650" y="1290" textAnchor="middle" className="svg-achievement">
          Por haber completado satisfactoriamente la formación:
        </text>

        <text x="1650" y="1405" textAnchor="middle" className="svg-course" style={{ fontSize: courseFont }}>
          “{certificado.curso}”
        </text>

        <text x="1650" y="1525" textAnchor="middle" className="svg-detail">
          <tspan x="1650" dy="0">Desarrollada a través de Aula EI, con una intensidad de {certificado.horas || '00'} horas,</tspan>
          <tspan x="1650" dy="62">bajo los lineamientos internos de formación de Electroingeniería S.A.S.</tspan>
        </text>

        <g stroke="#C99A22" strokeWidth="3" fill="none" opacity="0.86">
          <line x1="1240" y1="1694" x2="1545" y2="1694" />
          <path d="M1565 1694 C1590 1660 1618 1660 1635 1694 C1618 1728 1590 1728 1565 1694 Z" />
          <path d="M1665 1694 C1682 1660 1710 1660 1735 1694 C1710 1728 1682 1728 1665 1694 Z" />
          <line x1="1755" y1="1694" x2="2060" y2="1694" />
        </g>

        <text x="1650" y="1810" textAnchor="middle" className="svg-date">Emitido el {certificado.fecha}</text>

        <g className="svg-signature">
          <g transform="translate(480 1945)">
            {certificado.participantSignatureUrl ? (
              <image href={certificado.participantSignatureUrl} x="80" y="-135" width="600" height="130" preserveAspectRatio="xMidYMid meet" />
            ) : (
              <text x="380" y="-48" textAnchor="middle" className="svg-signature-placeholder">Firma del participante</text>
            )}
            <line x1="0" y1="0" x2="760" y2="0" />
            <text x="380" y="58" textAnchor="middle" className="svg-signature-name">{certificado.participante}</text>
            <text x="380" y="105" textAnchor="middle" className="svg-signature-role">Participante</text>
          </g>

          <g transform="translate(2060 1945)">
            {certificado.adminSignatureUrl ? (
              <image href={certificado.adminSignatureUrl} x="80" y="-135" width="600" height="130" preserveAspectRatio="xMidYMid meet" />
            ) : (
              <text x="380" y="-48" textAnchor="middle" className="svg-signature-placeholder">Firma del responsable</text>
            )}
            <line x1="0" y1="0" x2="760" y2="0" />
            <text x="380" y="58" textAnchor="middle" className="svg-signature-name">
              {certificado.responsable2?.nombre || certificado.responsable1?.nombre || 'Nombre del Responsable'}
            </text>
            <text x="380" y="105" textAnchor="middle" className="svg-signature-role">
              {certificado.responsable2?.cargo || certificado.responsable1?.cargo || 'Cargo'}
            </text>
          </g>
        </g>

        <g transform="translate(175 2205)">
          <rect x="0" y="0" width="640" height="165" rx="18" fill="#FFFFFF" fillOpacity="0.55" stroke="#C99A22" strokeWidth="4" />
          <text x="320" y="62" textAnchor="middle" className="svg-code-label">Código de certificado</text>
          <text x="320" y="118" textAnchor="middle" className="svg-code-value">{certificado.codigo}</text>
        </g>

        <image href={companyLogoUrl} x="1140" y="2138" width="1020" height="165" preserveAspectRatio="xMidYMid meet" />

        <g transform="translate(2915 2180)">
          <rect x="0" y="0" width="230" height="230" rx="14" fill="#FFFFFF" stroke="#0030A0" strokeWidth="6" />
          <image href={certificado.qrUrl} x="18" y="18" width="194" height="194" preserveAspectRatio="xMidYMid meet" />
        </g>

        <g stroke="#C99A22" strokeWidth="3" fill="none">
          <line x1="910" y1="2385" x2="1540" y2="2385" />
          <line x1="1760" y1="2385" x2="2390" y2="2385" />
          <polygon points="1650,2372 1663,2385 1650,2398 1637,2385" />
        </g>
        <text x="1650" y="2440" textAnchor="middle" className="svg-footer">
          Electroingeniería S.A.S. · Plataforma interna de formación · Aula EI
        </text>
      </svg>
    </div>
  )
}
