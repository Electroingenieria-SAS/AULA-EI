import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildAutomationReadiness } from '../studio/src/compliance/automation-readiness.js'
const read = p=>readFile(new URL('../'+p,import.meta.url),'utf8')

const dataset={
  people:[
    {id:'u1',full_name:'Ana',is_active:true,job_position_id:'p1'},
    {id:'u2',full_name:'Beto',is_active:true,job_position_id:'p1'},
    {id:'u3',full_name:'Carla',is_active:true,job_position_id:null},
    {id:'u4',full_name:'Inactivo',is_active:false,job_position_id:'p1'},
  ],
  positions:[{id:'p1',name:'Operaciones'}],
  paths:[{id:'path1',name:'Seguridad',is_active:true}],
  positionPaths:[{position_id:'p1',path_id:'path1',required:true},{position_id:'p1',path_id:'path1',required:true}],
  pathCourses:[
    {path_id:'path1',course_id:'course1',required:true},
    {path_id:'path1',course_id:'course1',required:true},
    {path_id:'path1',course_id:'course2',required:false},
    {path_id:'path1',course_id:'draft',required:true},
  ],
  courses:[{id:'course1',title:'Inducción',status:'published'},
           {id:'course2',title:'Optativo',status:'published'},
           {id:'draft',title:'Borrador',status:'draft'}],
  rules:[{code:'AUTO_CARGO_RUTA',is_active:true},{code:'RECERTIFICACION',is_active:true}],
  complianceRows:[{compliance_state:'not_assigned'}],
}
const good=buildAutomationReadiness(dataset)
assert.equal(good.ready,true)
assert.equal(good.counts.activePeople,3)
assert.equal(good.counts.positioned,2)
assert.equal(good.counts.linkedPeople,2)
assert.equal(good.counts.candidatePairs,2,'Duplicated routes and courses are deduplicated per learner.')
assert.equal(good.counts.matrixMissing,1)
assert.equal(good.peopleWithoutPosition,1)
assert.deepEqual(good.preview.map(p=>p.courses.map(x=>x.title)),[['Inducción'],['Inducción']])
assert.equal(good.counts.activeRules,2)
assert.equal(buildAutomationReadiness({}).ready,false)
assert.equal(buildAutomationReadiness({...dataset,pathCourses:[]}).ready,false)
assert.ok(buildAutomationReadiness({...dataset,pathCourses:[]}).missing.some(x=>x.code==='missing-courses'))
assert.ok(buildAutomationReadiness({...dataset,people:[]}).missing.some(x=>x.code==='missing-positions'))
assert.ok(buildAutomationReadiness({...dataset,rules:[]}).missing.some(x=>x.code==='rule-inactive'))
assert.equal(buildAutomationReadiness({...dataset,positionPaths:[]}).counts.candidatePairs,0)
assert.equal(buildAutomationReadiness({...dataset,positionPaths:[]}).ready,false)
assert.equal(buildAutomationReadiness({...dataset,paths:[{id:'path1',is_active:false}]}).ready,false)

const [parent,component,panels,engine,css,html,pkg] = await Promise.all([
  read('studio/src/ComplianceCenter.jsx'),
  read('studio/src/compliance/AutomationReadiness.jsx'),
  read('studio/src/compliance/CompliancePanels.jsx'),
  read('supabase/migrations/20260922130500_training_compliance_engine_v2.sql'),
  read('studio/src/styles/automation-readiness.css'),
  read('index.html'),
  read('package.json'),
])
assert.match(parent,/buildAutomationReadiness/)
assert.match(parent,/section === 'automation' && <>/)
assert.match(parent,/<AutomationReadiness readiness=\{readiness\}/)
assert.match(parent,/if \(!readiness\.ready \|\| busy\)/)
assert.match(parent,/window\.confirm\(/)
assert.match(parent,/supabase\.rpc\('admin_sync_training_engine'\)/)
assert.match(panels,/Revisar antes de sincronizar/)
assert.doesNotMatch(panels,/Ejecutar sincronización ahora/)
assert.match(component,/checked=\{acknowledged\}/)
assert.match(component,/disabled=\{!ready \|\| !acknowledged \|\| syncing\}/)
assert.match(component,/simulación/)
assert.match(component,/Las excepciones individuales justificadas/)
assert.match(engine,/on conflict\(course_id,user_id\) do update/i)
assert.match(engine,/training_course_is_unlocked/)
assert.match(css,/@media\(max-width:700px\)/)
assert.match(css,/:focus-visible/)
assert.doesNotMatch(html,/rel=["']preload["'][^>]*brand\/fondo\.jpg/i)
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase91-automation/)
console.log('Fase 9.1: cargo-ruta-curso, candidatos deduplicados, requisitos, bloqueos y sincronización confirmada OK.')
