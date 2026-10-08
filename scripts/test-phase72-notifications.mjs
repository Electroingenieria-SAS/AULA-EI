import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { notificationDestination, notificationUrgency, organizeTrainingNotifications } from '../player/src/notifications/notification-priority.js'

const now = new Date('2026-10-08T12:00:00Z').getTime()
const items = [
 { id:'oldread',created_at:'2026-10-08T11:00:00Z',read_at:'2026-10-08T11:10:00Z',course_id:'alpha' },
 { id:'recent',created_at:'2026-10-08T11:50:00Z',read_at:null },
 { id:'soon',created_at:'2026-10-06T12:00:00Z',read_at:null,path_id:'route-a',due_at:'2026-10-09T12:00:00Z' },
 { id:'late',created_at:'2026-10-05T12:00:00Z',read_at:null,course_id:'beta',due_at:'2026-10-07T12:00:00Z' },
 { id:'future',created_at:'2026-10-08T11:10:00Z',read_at:null,course_id:'delta',due_at:'2026-11-08T12:00:00Z' },
 { id:'invalid',created_at:'2026-10-08T11:10:00Z',read_at:null,path_id:'route-z',due_at:'not-a-date' },
]
assert.equal(notificationUrgency(items[3],now),'overdue')
assert.equal(notificationUrgency(items[2],now),'due')
assert.equal(notificationUrgency(items[4],now),null)
assert.equal(notificationUrgency(items[0],now),null,'Read alerts are not urgent badges')
assert.equal(notificationUrgency(items[5],now),null,'Invalid dates cannot become urgent')
assert.equal(notificationUrgency({due_at:'2026-10-07'},now),null,'Non-course general alerts cannot become due courses')
assert.equal(notificationDestination({course_id:'a b/ñ'}),'/course/a%20b%2F%C3%B1')
assert.equal(notificationDestination({path_id:'p1'}),'/plan')
assert.equal(notificationDestination({notification_type:'system'}),null)

const all=organizeTrainingNotifications(items,'all',now)
assert.deepEqual(all.items.map(x=>x.id),['late','soon','recent','future','invalid','oldread'])
assert.deepEqual(all.counts,{total:6,unread:5,priority:2})
assert.deepEqual(organizeTrainingNotifications(items,'priority',now).items.map(x=>x.id),['late','soon'])
assert.equal(organizeTrainingNotifications(items,'unread',now).items.length,5)
assert.equal(organizeTrainingNotifications(null,'all',now).items.length,0)

const read=(path)=>readFile(new URL('../'+path,import.meta.url),'utf8')
const [center,styles,plan,pkg]=await Promise.all([
 read('player/src/NotificationCenter.jsx'),
 read('player/src/styles/notifications.css'),
 read('player/src/TrainingPlanPage.jsx'),
 read('package.json'),
])
assert.match(center,/organizeTrainingNotifications\(items, view\)/)
assert.match(center,/notificationDestination\(item\)/)
assert.match(center,/navigateLearner\('\/plan'\)/)
assert.match(center,/aria-pressed=\{view === 'priority'\}/)
assert.match(center,/\.eq\('user_id', profile\.id\)/)
assert.match(center,/POLL_INTERVAL = 180000/)
assert.match(styles,/\.training-notification-panel\{display:flex;flex-direction:column/)
assert.match(styles,/\.training-notification-footer/)
assert.match(styles,/@media\(max-width:410px\)/)
assert.match(plan,/get_my_home_snapshot/)
assert.doesNotMatch(center,/setInterval\((?!refresh, POLL_INTERVAL)/,'No extra polling loops.')
assert.doesNotMatch(center,/\.from\('question_options'\)|from\('exam_attempts'\)/)
assert.match(JSON.parse(pkg).scripts.build,/npm run test:phase72-notifications/)
console.log('Fase 7.2: alertas filtradas, prioridades, navegación a plan y polling único OK.')
