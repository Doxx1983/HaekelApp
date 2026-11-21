'use strict';
// Die PWA bringt eine Kopie des gemeinsamen Kerns mit (damit sie allein gehostet werden kann). Muss identisch sein.
const assert = require('assert'), fs = require('fs'), path = require('path');
const r = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
assert.strictEqual(r('shared/core.js'), r('pwa/core.js'), 'pwa/core.js ist veraltet: npm run sync');
console.log('Kern-Kopie aktuell');
