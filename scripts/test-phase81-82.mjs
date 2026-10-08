import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { cachedQuery, clearDataCache, invalidateCache } from '../src/data-cache.js'

const read = file => readFile(new URL('../'+file, import.meta.url),'utf8')
const [app,home,cache,notifications,legal,player,training] = await Promise.all([
  read('src/App.jsx'),read('player/src/HomePage.jsx'),read('src/data-cache.js'),
  read('player/src/NotificationCenter.jsx'),read('src/legal/LegalGate.jsx'),
  read('player/src/LearnerApp.jsx'),read('player/src/TrainingPlanPage.jsx'),
])
assert.match(app,/profileUserId !== session\.user\.id/)
assert.match(app,/setProfileUserId\(user\.id\)/)
assert.match(app,/key=\{session\.user\.id\} profile=\{profile\}/)
assert.match(app,/clearDataCache\(\)/)
assert.match(app,/AdminMfaGate/)
assert.match(app,/LegalGate/)
assert.match(home,/catch \(cause\)/)
assert.match(home,/setError\(cause\?\.message/)
assert.match(home,/role="alert"/)
assert.match(home,/Reintentar/)
assert.match(home,/get_my_home_snapshot/)
assert.match(home,/home:snapshot:/)
assert.match(training,/get_my_home_snapshot/)
assert.match(notifications,/\.eq\('user_id', profile\.id\)/)
assert.match(notifications,/POLL_INTERVAL = 180000/)
assert.match(cache,/generation \+= 1/)
assert.match(cache,/generation === version/)
assert.match(legal,/accepted/)
assert.match(player,/route\.type === 'plan'/)

// A response that started before sign-out must never repopulate shared cache.
clearDataCache()
let release
const pending = cachedQuery('home:snapshot:user-a', () => new Promise(resolve => {release = resolve}), {ttl:100000})
await Promise.resolve()
clearDataCache()
release({user:'a'})
assert.deepEqual(await pending,{user:'a'})
let calls = 0
const result = await cachedQuery('home:snapshot:user-a', async () => { calls++; return {user:'a',fresh:true} },{ttl:100000})
assert.equal(calls,1,'An invalidated response cannot satisfy a later user query.')
assert.equal(result.fresh,true)
const cached = await cachedQuery('home:snapshot:user-a', async () => { calls++; return {} },{ttl:100000})
assert.equal(calls,1,'Fresh response may be reused for same user and TTL.')
assert.equal(cached.fresh,true)
invalidateCache('home:snapshot:user-a')
await cachedQuery('home:snapshot:user-a', async () => { calls++; return {user:'a',fresh:2} },{ttl:100000})
assert.equal(calls,2)
clearDataCache()
console.log('Fase 8.1–8.2: error states, account-scoped profile, session remount and cache invalidation passed.')
