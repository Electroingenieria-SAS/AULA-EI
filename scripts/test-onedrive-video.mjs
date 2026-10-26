import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { oneDriveVideoInfo } from '../src/onedrive-video.js'

const host = 'electroingenierias-my.sharepoint.com'
const share = 'https://' + host + '/:v:/g/personal/test/XYZ?e=ABC'
const embed = 'https://' + host + '/personal/test/_layouts/15/embed.aspx?UniqueId=ABCD&authkey=KEY'
const iframe = '<iframe src="' + embed.replace('&', '&amp;') + '" width="640" height="360" allowfullscreen></iframe>'
assert.equal(oneDriveVideoInfo(share).kind, 'share', 'OneDrive corporate share URL cannot play as MP4')
assert.equal(oneDriveVideoInfo(embed).kind, 'embed', 'Official Microsoft embed URL must use iframe')
assert.deepEqual(oneDriveVideoInfo(iframe), { kind: 'embed', url: embed }, 'Editor must extract only the trusted iframe src')
assert.equal(oneDriveVideoInfo('https://1drv.ms/v/test').kind, 'share')
assert.equal(oneDriveVideoInfo('https://onedrive.live.com/embed?resid=ABCD').kind, 'embed')
assert.equal(oneDriveVideoInfo('https://drive.google.com/file/d/demo/preview').kind, 'other')
assert.equal(oneDriveVideoInfo('<iframe src="javascript:alert(1)"></iframe>').kind, 'invalid')
assert.equal(oneDriveVideoInfo('<iframe src="https://notonedrive.example/embed"></iframe>').kind, 'invalid')
assert.equal(oneDriveVideoInfo('http://' + host + '/personal/test/_layouts/15/embed.aspx').kind, 'invalid')
assert.equal(oneDriveVideoInfo('https://evilsharepoint.com/embed.aspx').kind, 'other')
assert.equal(oneDriveVideoInfo('<script>alert(1)</script>').kind, 'invalid')
const load = (f) => readFile(new URL('../' + f, import.meta.url), 'utf8')
const [player, studio, html, vercel] = await Promise.all([
  load('player/src/course-player/CourseContentViews.jsx'),
  load('studio/src/course-editor/CourseBuilderPanels.jsx'),
  load('index.html'),
  load('vercel.json'),
])
assert.match(player, /needsOneDriveEmbed/)
assert.match(player, /Abrir en OneDrive/)
assert.match(studio, /videoInfo\?\.kind === 'share'/)
assert.match(studio, /videoInfo\.url/)
assert.match(html, /frame-src[^"]*https:\/\/electroingenierias-my\.sharepoint\.com/)
assert.match(JSON.parse(vercel).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value, /frame-src.*electroingenierias-my\.sharepoint\.com/)
console.log('Corporate OneDrive videos: embed support, user fallback, secure editor and CSP OK')
