import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildDevelopmentSnapshot } from '../player/src/development/development-data.js'
import { generateCourseReviewGames } from '../player/src/games/course-game-generator.js'
import { knowledgeCards, answerFromCourse, deriveBadges, rankedReviewRounds,
  recordPractice, readPractice, recommendedLearning } from '../player/src/intelligence/intelligence-model.js'

const block = (id,title,description,type='text',status='published') =>
  ({ id, title,description,type,status,sort_order:Number(id.replace(/\D/g,'')) || 0 })
const course={id:'course-a',phases:[
  {id:'p1',title:'Seguridad',sort_order:1,blocks:[
    block('b1','Protección personal','Utiliza elementos de protección personal para cada tarea.'),
    block('b2','Señales de seguridad','Las señales advierten peligros existentes en el lugar de trabajo.'),
    block('b3','Procedimientos','Los procedimientos establecen pasos claros para realizar tareas seguras.'),
    block('b4','No estudiado','Información confidencial que no se ha revisado.'),
    block('b5','Documento oculto','Material en borrador que no debe mostrarse.','text','draft'),
  ]},
  {id:'p2',title:'Inspección',sort_order:2,blocks:[
    block('b6','Registro de inspección','Conserva evidencia documentada de las inspecciones realizadas.'),
    block('b7','Control documental','Evita cambios no autorizados sobre los registros oficiales.'),
    block('b8','Validación','Respuesta que debe permanecer fuera de tutor','validation'),
  ]},
]}
const completed=new Set(['b1','b2','b3','b5','b6','b7','b8'])
const cards=knowledgeCards(course,completed)
assert.equal(cards.length,5)
assert.ok(!cards.some(x=>x.title==='No estudiado' || x.title==='Documento oculto' || x.title==='Validación'))
assert.equal(answerFromCourse('protección personal',cards)?.title,'Protección personal')
assert.match(answerFromCourse('seguridad señales',cards)?.description || '',/señales|peligros/i)
assert.equal(answerFromCourse('contraseña de administración',cards),null)
assert.equal(answerFromCourse('qué es esto',cards),null)
assert.equal(answerFromCourse('Protección personal',[{id:'b1',title:'Protección personal',description:'Ejemplo'}])?.description,'Ejemplo')
const groups=generateCourseReviewGames(course,completed)
assert.ok(groups.some(g=>g.rounds.length))
const store = new Map()
const mock={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}
const user='test-user',id='course-a'
let practice=recordPractice(user,id,'memory-0',true,3,mock)
assert.equal(practice.courses[id].rounds['memory-0'].attempts,1)
assert.equal(practice.courses[id].rounds['memory-0'].solved,1)
assert.equal(practice.courses[id].rounds['memory-0'].mistakes,3)
practice=recordPractice(user,id,'memory-0',true,1,mock)
assert.equal(practice.courses[id].rounds['memory-0'].solved,2)
assert.equal(practice.courses[id].rounds['memory-0'].mistakes,4)
assert.deepEqual(readPractice('other-user',mock),{courses:{}})
assert.equal([...store.values()][0].includes('Protección personal'),false, 'No se almacena el texto de los ejercicios.')
const sorted=rankedReviewRounds(groups,practice.courses[id])
assert.equal(sorted[0].id,'memory-0','Los ejercicios difíciles deben tener prioridad.')
const develop=buildDevelopmentSnapshot({
  training_profile:{competencies:[{id:'c1',name:'Seguridad',required_level:3,achieved_level:1}],
    paths:[{id:'p1',name:'Ruta de calidad',required:true,progress_percent:30,
      courses:[{course_id:'course-a',title:'Seguridad',unlocked:true,completed:false,required:true,sort_order:1},
      {course_id:'locked',title:'Restringido',unlocked:false,completed:false,required:true,sort_order:2}]}]},
  enrollments:[{id:'e1',status:'in_progress',due_at:'2026-10-08T00:00:00Z',course:{id:'course-a',title:'Seguridad'}}],
}, new Date('2026-10-09T12:00:00Z'))
const suggestions=recommendedLearning(develop)
assert.equal(suggestions.length,1)
assert.equal(suggestions[0].courseId,'course-a')
assert.ok(!suggestions.some(x=>x.courseId==='locked'),'Nunca recomendar contenidos bloqueados.')
assert.equal(develop.competencies[0].gap,2)
const badges=deriveBadges({completedCount:1},practice)
assert.equal(badges.find(x=>x.id==='first-training').achieved,true)
assert.equal(badges.find(x=>x.id==='first-review').achieved,true)
assert.equal(badges.find(x=>x.id==='review-champion').achieved,false)
assert.equal(badges.length,5)
assert.equal(deriveBadges({completedCount:0},{courses:{}}).filter(x=>x.achieved).length,0)

const read=(file)=>readFile(new URL('../'+file,import.meta.url),'utf8')
const [page,app,shell,home,games,game,adaptive,tutor,rewards,paths,style,initial] = await Promise.all([
  read('player/src/IntelligencePage.jsx'),
  read('player/src/LearnerApp.jsx'),read('player/src/LearnerShell.jsx'),
  read('player/src/HomePage.jsx'),read('player/src/GamesPage.jsx'),
  read('player/src/games/LearningGame.jsx'),
  read('player/src/intelligence/AdaptivePanel.jsx'),read('player/src/intelligence/TutorPanel.jsx'),
  read('player/src/intelligence/RewardsPanel.jsx'),read('player/src/intelligence/RoutesPanel.jsx'),
  read('player/src/styles/intelligence.css'),read('src/main.jsx'),
])
assert.match(page,/get_my_home_snapshot/)
assert.match(page,/get_my_catalog_snapshot/)
assert.match(page,/get_my_course_route_access/)
assert.match(page,/supabase\.from\('courses'\)/)
assert.match(page,/catalog\?\.progress/)
assert.match(page,/onPracticeResult/)
for(const marker of ['TutorPanel','AdaptivePanel','RewardsPanel','RoutesPanel'])assert.match(page,new RegExp(marker))
assert.match(app,/loadIntelligencePage/)
assert.match(app,/route\.type === 'coach'/)
assert.match(shell,/label="Mi entrenador"/)
assert.match(home,/Entrenador inteligente de Aula EI/)
assert.match(games,/recordPractice\(/)
assert.match(game,/onResult/)
assert.match(adaptive,/rankedReviewRounds/)
assert.match(adaptive,/setPinnedId/)
assert.match(tutor,/answerFromCourse/)
assert.match(rewards,/deriveBadges/)
assert.match(paths,/recommendedLearning/)
assert.match(style,/@media\(max-width:480px\)/)
assert.match(style,/:focus-visible/)
assert.doesNotMatch(initial,/styles\/intelligence\.css/,'La nueva vista no debe cargar estilos en el arranque.')
for(const component of [page,adaptive,tutor,rewards,paths]) {
  assert.doesNotMatch(component,/\.insert\(|\.upsert\(|\.update\(|\.delete\(|from\('exam_attempts'\)|from\('question_options'\)/)
}
console.log('Fase 6: tutor contextual, recomendaciones, práctica adaptativa, insignias, RLS y responsive: OK.')
