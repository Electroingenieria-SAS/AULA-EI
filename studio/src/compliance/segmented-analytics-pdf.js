/**
 * A compact, aggregate-only export. The module and jsPDF are dynamically loaded
 * only when an authorized administrator requests a PDF.
 */
export async function exportSegmentedPdf(report,filename) {
  const {jsPDF}=await import('jspdf')
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true})
  const margin=16,pageHeight=297
  let y=22
  const safe=val=>String(val??'').replace(/[\u0000-\u001f]/g,' ').slice(0,350)
  function pageBreak(height=12){
    if(y+height<pageHeight-19)return
    pdf.addPage()
    y=20
  }
  function line(text,{size=10,bold=false,indent=0}={}){
    pdf.setFont('helvetica',bold?'bold':'normal')
    pdf.setFontSize(size)
    const parts=pdf.splitTextToSize(safe(text),210-2*margin-indent)
    pageBreak(parts.length*5+5)
    pdf.text(parts,margin+indent,y)
    y+=parts.length*5+3
  }
  pdf.setTextColor(17,64,107)
  line('Aula EI | Indicadores de cumplimiento',{size:16,bold:true})
  line('Reporte de corte actual por dependencia y cargo',{size:10})
  line('Generado: '+new Date().toLocaleString('es-CO',{timeZone:'America/Bogota'}),{size:9})
  line('Area: '+(report.scope.department==='all'?'Todas':report.scope.department),{size:9})
  line('Cargo: '+(report.scope.position==='all'?'Todos':report.scope.position),{size:9})
  y+=5
  const summary=report.summary
  if(summary.enoughSample){
    line('Requisitos: '+summary.requirements+' | Conformes: '+summary.compliant+' | En riesgo: '+summary.atRisk,{bold:true})
    line('Vencidos: '+summary.overdue+' | Sin matricula: '+summary.withoutEnrollment+' | Cumplimiento: '+summary.coverage+'%')
  }else line('Muestra reducida: resumen numerico no disponible (menos de 3 personas).',{bold:true})
  y+=5
  for(const [title,groups] of [['Comparativo por area',report.areaGroups],['Comparativo por cargo',report.positionGroups]]) {
    if(!groups.length)continue
    pageBreak(20)
    line(title,{size:12,bold:true})
    for(const group of groups){
      pageBreak(20)
      line(group.label,{bold:true})
      if(!group.enoughSample)line('Menos de 3 personas: sin desglose numerico.',{size:9,indent:3})
      else line(group.people+' personas | '+group.requirements+' requisitos | '+group.compliant+' al dia | '+
        group.atRisk+' en riesgo | '+group.withoutEnrollment+' sin matricula | '+group.coverage+'%',{size:9,indent:3})
    }
    y+=3
  }
  pageBreak(22)
  line('Metodologia y restricciones',{bold:true})
  line('Se cuenta un unico requisito por usuario-capacitacion, sin duplicar rutas. Los porcentajes usan requisitos como denominador.',{size:9})
  line('No contiene nombres, correos, identificadores ni respuestas individuales. La muestra inferior a 3 personas se oculta.',{size:9})
  line('El presente corte no equivale a tendencia historica ni certificacion institucional.',{size:9})
  const pages=pdf.getNumberOfPages()
  for(let i=1;i<=pages;i++){
    pdf.setPage(i)
    pdf.setFont('helvetica','normal')
    pdf.setFontSize(8)
    pdf.setTextColor(95,115,135)
    pdf.text('Aula EI | Uso administrativo autorizado',margin,pageHeight-12)
    pdf.text(i+' / '+pages,188,pageHeight-12)
  }
  pdf.save(filename)
}
