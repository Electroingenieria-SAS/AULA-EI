import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildDevelopmentSnapshot } from '../player/src/development/development-data.js'
import { buildTrainingPlan, filterTrainingPlan } from '../player/src/training-plan/training-plan-model.js'

const now = new Date('2026-10-08T12:00:00Z')
const snapshot = {
  training_profile: { paths: [{
    id: 'required', name: 'Ruta institucional', required: true,
    courses: [
      { course_id:'done',title:'Introducción',completed:true,unlocked:true,required:true,sort_order:1 },
      { course_id:'blocked',title:'Nivel avanzado',completed:false,unlocked:false,required:true,sort_order:3 },
      { course_id:'due',title:'Ruta próxima',completed:false,unlocked:true,required:true,sort_order:2 },
    ],
  }]},
  enrollments: [
    { id:'1',course:{id:'done',title:'Introducción'},status:'completed',due_at:'2026-10-01' },
    { id:'2',course:{id:'blocked',title:'Nivel avanzado'},status:'assigned',due_at:'2026-10-07' },
    { id:'3',course:{id:'late',title:'Revisión de seguridad'},status:'assigned',due_at:'2026-10-07' },
    { id:'4',course:{id:'due',title:'Normas internas'},status:'assigned',due_at:'2026-10-12' },
    { id:'5',course:{id:'active',title:'Trabajo colaborativo'},status:'in_progress',due_at:null },
    { id:'6',course:{id:'future',title:'Formación general'},status:'assigned',due_at:'2026-11-01' },
    { id:'7',course:{id:'undated',title:'Otro curso'},status:'assigned',due_at:null },
    { id:'hidden',course:null,status:'assigned' },
  ],
  certificates:[],
}
const dev=buildDevelopmentSnapshot(snapshot,now)
assert.equal(dev.next.course.id,'late','Blocked required-route course must never be next.')
assert.equal(dev.upcoming.find((row)=>row.course.id==='blocked').routeLocked,true)

const plan=buildTrainingPlan(dev)
assert.equal(plan.counts.total,7)
assert.equal(plan.counts.complete,1)
assert.equal(plan.counts.pending,6)
assert.equal(plan.counts.blocked,1)
assert.equal(plan.counts.attention,2,'Blocked overdue course is not falsely counted as open urgent work.')
assert.equal(plan.counts.active,1)
assert.equal(plan.next.id,'late')
assert.equal(plan.items.find((item)=>item.id==='blocked').openable,false)
assert.equal(plan.items.find((item)=>item.id==='blocked').type,'locked')
assert.equal(plan.items.find((item)=>item.id==='blocked').pathNames[0],'Ruta institucional')
assert.equal(plan.items.find((item)=>item.id==='done').openable,false)
assert.equal(plan.items.find((item)=>item.id==='due').type,'due')
assert.equal(plan.items.find((item)=>item.id==='active').type,'active')
assert.equal(plan.items.find((item)=>item.id==='future').type,'scheduled')
assert.equal(plan.items.find((item)=>item.id==='undated').type,'pending')
assert.deepEqual(filterTrainingPlan(plan.items,'attention').map(x=>x.id),['late','due'])
assert.equal(filterTrainingPlan(plan.items,'locked').length,1)
assert.equal(filterTrainingPlan(plan.items,'complete').length,1)
assert.equal(filterTrainingPlan(plan.items,'invalid').length,plan.items.length)
assert.equal(buildTrainingPlan({}).counts.total,0)
assert.equal(buildTrainingPlan({}).next,null)

const read=(path)=>readFile(new URL('../'+path,import.meta.url),'utf8')
const [page,route,shell,home,devPage,sections,css,pkg,main]=await Promise.all([
  read('player/src/TrainingPlanPage.jsx'),read('player/src/LearnerApp.jsx'),
  read('player/src/LearnerShell.jsx'),read('player/src/HomePage.jsx'),
  read('player/src/DevelopmentPage.jsx'),read('player/src/development/DevelopmentSections.jsx'),
  read('player/src/styles/training-plan.css'),read('package.json'),read('src/main.jsx'),
])
assert.match(page,/get_my_home_snapshot/)
assert.match(page,/home:snapshot:/)
assert.match(page,/buildDevelopmentSnapshot/)
assert.match(page,/buildTrainingPlan/)
assert.match(page,/aria-pressed=\{filter === item\.id\}/)
assert.match(page,/if \(error && !snapshot\)/)
assert.match(page,/item\.openable \?/)
assert.match(page,/role="progressbar"/)
assert.match(page,/Sin capacitaciones en este filtro/)
assert.match(route,/const loadTrainingPlanPage = \(\) => import\('\.\/TrainingPlanPage\.jsx'\)/)
assert.match(route,/route\.type === 'plan'/)
assert.match(shell,/label="Mi plan"/)
assert.match(shell,/navigateLearner\('\/plan'\)/)
assert.match(home,/aria-label="Mi plan de formación"/)
assert.match(devPage,/Abrir mi plan/)
assert.match(sections,/!item\.routeLocked/)
assert.match(css,/@media\(max-width:480px\)/)
assert.match(css,/:focus-visible/)
assert.doesNotMatch(main,/styles\/training-plan\.css/,'Plan CSS must remain lazy.')
for(const source of [page,devPage])assert.doesNotMatch(source,
  /\.from\('question_options'\)|\.from\('exam_attempts'\)|\.upsert\(|\.insert\(|\.delete\(|\.update\(/,
  'Plan must be read only and preserve official LMS records.')
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase71-plan/)
console.log('Fase 7.1: priorización determinista, requisitos bloqueados, filtros, rutas y responsive OK.')
