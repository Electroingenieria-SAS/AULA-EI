import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { segmentedCompliance,segmentedComplianceCsv } from '../studio/src/compliance/segmented-analytics.js'

const positions=[
 {id:'p1',name:'Operaciones',department:'Planta'},
 {id:'p2',name:'Calidad',department:'Planta'},
 {id:'p3',name:'Administración',department:'Administración'},
]
const rows=[
 {user_id:'u1',course_id:'c1',position_id:'p1',position_name:'Operaciones',compliance_state:'compliant'},
 {user_id:'u1',course_id:'c1',position_id:'p1',position_name:'Operaciones',compliance_state:'compliant',path_id:'path2'},
 {user_id:'u2',course_id:'c1',position_id:'p1',position_name:'Operaciones',compliance_state:'overdue'},
 {user_id:'u3',course_id:'c1',position_id:'p1',position_name:'Operaciones',compliance_state:'assigned'},
 {user_id:'u4',course_id:'c2',position_id:'p2',position_name:'Calidad',compliance_state:'expiring'},
 {user_id:'u5',course_id:'c2',position_id:'p2',position_name:'Calidad',compliance_state:'expired'},
 {user_id:'u6',course_id:'c3',position_id:'p3',position_name:'Administración',compliance_state:'not_assigned'},
]
const all=segmentedCompliance(rows,positions)
assert.equal(all.summary.people,6)
assert.equal(all.summary.requirements,6,'one user+course counted only once despite duplicate paths')
assert.equal(all.summary.compliant,1)
assert.equal(all.summary.overdue,2,'overdue includes expired evidence')
assert.equal(all.summary.atRisk,3,'expiring also contributes to risk')
assert.equal(all.summary.withoutEnrollment,1)
assert.equal(all.areaGroups.length,2)
assert.equal(all.areaGroups[0].label,'Planta')
assert.equal(all.areaGroups[0].people,5)
assert.equal(all.areaGroups[0].coverage,20)
assert.equal(all.areaGroups[0].enoughSample,true)
assert.equal(all.areaGroups[1].enoughSample,false)
const subset=segmentedCompliance(rows,positions,{department:'Planta'})
assert.equal(subset.summary.requirements,5)
assert.equal(subset.positionGroups.length,2)
const single=segmentedCompliance(rows,positions,{department:'Planta',position:'p1'})
assert.equal(single.summary.people,3)
assert.equal(single.summary.requirements,3)
assert.equal(single.summary.coverage,33.3)
assert.equal(single.rankings.length,1)
const privateGroup=segmentedCompliance(rows,positions,{department:'Administración'})
assert.equal(privateGroup.summary.people,1)
assert.equal(privateGroup.summary.enoughSample,false)
const privateCsv=segmentedComplianceCsv(privateGroup,new Date('2026-10-09T12:00:00Z'))
assert.ok(privateCsv.includes('Muestra inferior al mínimo'))
assert.ok(!privateCsv.includes('u6'))
assert.ok(!privateCsv.includes('1;1;0;0;1'), 'individual data cannot escape through summary CSV')
assert.ok(!privateCsv.includes('user_id'))
assert.ok(!privateCsv.includes('email'))
const malicious=segmentedCompliance([{user_id:'u1',course_id:'c1',position_id:'pX',position_name:'=SUM(1,2)',compliance_state:'assigned'},
  {user_id:'u2',course_id:'c1',position_id:'pX',position_name:'=SUM(1,2)',compliance_state:'assigned'},
  {user_id:'u3',course_id:'c1',position_id:'pX',position_name:'=SUM(1,2)',compliance_state:'assigned'}],[])
assert.ok(segmentedComplianceCsv(malicious).includes("'=SUM(1,2)"), 'prevent CSV formula injection')
assert.equal(segmentedCompliance([],positions).summary.coverage,null)
assert.equal(segmentedCompliance([],positions).hasData,false)
assert.equal(segmentedCompliance(rows,positions,{department:'missing'}).hasData,false)

const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
const [center,component,pdf,workbench,css,pkg,html] = await Promise.all([
  read('studio/src/ComplianceCenter.jsx'),read('studio/src/compliance/SegmentedAnalytics.jsx'),
  read('studio/src/compliance/segmented-analytics-pdf.js'),
  read('studio/src/compliance/AnalyticsWorkbench.jsx'),
  read('studio/src/styles/segmented-analytics.css'),read('package.json'),read('index.html'),
])
assert.match(center,/<SegmentedAnalytics complianceRows=\{complianceRows\} positions=\{positions\}/)
assert.match(center,/<ComplianceAnalytics setMessage=\{setMessage\}/)
assert.match(component,/segmentedCompliance\(complianceRows,positions/)
assert.match(component,/less|menos de tres personas/i)
assert.match(component,/data\.summary\.enoughSample/)
assert.match(component,/import\('\.\/segmented-analytics-pdf\.js'\)/)
assert.match(pdf,/await import\('jspdf'\)/)
assert.match(pdf,/!group\.enoughSample/)
assert.match(component,/role="region"/)
assert.match(css,/@media\(max-width:650px\)/)
assert.match(css,/:focus-visible/)
assert.match(workbench,/admin_training_analytics/)
assert.match(workbench,/admin_question_analytics/)
assert.match(workbench,/admin_content_block_analytics/)
assert.match(html,/phase-9\.3-2026-10-09/)
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase92-analytics/)
for(const forbidden of [/\.rpc\(/,/\.from\(/,/\.insert\(/,/\.update\(/,/\.upsert\(/,/\.delete\(/]){
  assert.doesNotMatch(component,forbidden,'segment UI must not request or modify database')
}
console.log('Phase 9.2: deduplicated admin-only segmentation, small-group suppression, CSV/PDF and responsive contracts PASS')
