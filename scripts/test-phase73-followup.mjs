import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prioritizedComplianceFollowups } from '../studio/src/compliance/followup-model.js'

const rows = [
 { user_id:'u1',full_name:'Ana',email:'ana@ei.com',position_name:'Operaria',course_title:'Curso 1',compliance_state:'overdue' },
 { user_id:'u1',full_name:'Ana',email:'ana@ei.com',position_name:'Operaria',course_title:'Curso 2',compliance_state:'expiring' },
 { user_id:'u2',full_name:'Bernardo',email:'bernardo@ei.com',position_name:'Logística',course_title:'Curso 3',compliance_state:'overdue' },
 { user_id:'u2',full_name:'Bernardo',email:'bernardo@ei.com',position_name:'Logística',course_title:'Curso 4',compliance_state:'expired' },
 { user_id:'u3',full_name:'Carlos',email:'carlos@ei.com',position_name:'Calidad',course_title:'Curso 5',compliance_state:'compliant' },
 { user_id:'u4',full_name:'Diana',email:'diana@ei.com',position_name:'Compras',course_title:'Curso 6',compliance_state:'not_assigned' },
 { user_id:'u4',full_name:'Diana',email:'diana@ei.com',position_name:'Compras',course_title:'Curso 7',compliance_state:'in_progress' },
]
const view=prioritizedComplianceFollowups(rows)
assert.deepEqual(view.map((item)=>item.name),['Bernardo','Ana','Diana'])
assert.equal(view[0].critical,2)
assert.equal(view[1].critical,1)
assert.equal(view[1].soon,1)
assert.equal(view[2].pending,2)
assert.equal(view[1].cases[0].course,'Curso 1')
assert.equal(prioritizedComplianceFollowups(rows,1).length,1)
assert.equal(prioritizedComplianceFollowups(rows,0).length,0)
assert.deepEqual(prioritizedComplianceFollowups(null),[])
assert.deepEqual(prioritizedComplianceFollowups([{compliance_state:'overdue',full_name:'Sin ID'}]),[],
 'A row without stable person identity must not be pooled under a fake user.')

const read=(path)=>readFile(new URL('../'+path,import.meta.url),'utf8')
const [component,panels,center,studio,style,pkg]=await Promise.all([
 read('studio/src/compliance/ComplianceFollowup.jsx'),
 read('studio/src/compliance/CompliancePanels.jsx'),
 read('studio/src/ComplianceCenter.jsx'),
 read('studio/src/App.jsx'),
 read('studio/src/styles/compliance-followup.css'),
 read('package.json'),
])
assert.match(component,/prioritizedComplianceFollowups\(rows\)/)
assert.match(component,/onFocus\(person\.email \|\| person\.name\)/)
assert.match(component,/Uso exclusivo de gestión autorizada/)
assert.match(panels,/<ComplianceFollowup rows=\{rows\}/)
assert.match(panels,/setStatusFilter\('all'\)/)
assert.match(center,/supabase\.rpc\('admin_training_compliance_rows'\)/)
assert.match(center,/section === 'compliance' && <CompliancePanel/)
assert.match(studio,/tab === 'compliance' && canAdmin && <ComplianceCenter/)
assert.match(style,/@media\(max-width:530px\)/)
assert.match(style,/:focus-visible/)
for (const source of [component,panels]){
  assert.doesNotMatch(source,/admin_training_compliance_rows.*fetch|\.from\('profiles'\)|\.update\(|\.upsert\(/,
    'Fase 7.3 is strictly a read-only presentation of the existing admin rows.')
}
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase73-followup/)
console.log('Fase 7.3: seguimiento admin de casos sin consultas extras, ámbitos ni mutaciones: OK.')
