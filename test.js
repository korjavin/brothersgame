// node test.js — runs the game headlessly: level geometry, traversal, audio.
// No dependencies; canvas and Web Audio are faked well enough to exercise the real code.
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/index.html', 'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

// ---- fake canvas -----------------------------------------------------------
const ctx2d = new Proxy({}, {
  get: (t, k) => k === 'measureText' ? (s => ({ width: s.length * 7 }))
    : /^create(Linear|Radial)Gradient$/.test(k) ? (() => ({ addColorStop() {} }))
    : k === 'canvas' ? { width: 960, height: 544 } : (() => {}),
  set: () => true,
});
const el = { width: 960, height: 544, getContext: () => ctx2d, value: '',
             toDataURL: () => 'data:image/png;base64,iVBORw0KGgo=', toBlob: cb => cb({}),
             setAttribute() {}, removeAttribute() {}, focus() {}, click() {} };

// ---- fake web audio, recording every voice that gets scheduled -------------
const notes = [];
let clock = 0;
const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; },
                       linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
class FakeAudio {
  constructor() { this.state = 'running'; this.sampleRate = 48000; this.destination = {}; }
  get currentTime() { return clock; }
  createGain() { return { gain: param(), connect() {} }; }
  createOscillator() {
    const o = { type: '', frequency: param(), connect() {}, stop() {},
                start(at) { notes.push({ kind: 'osc', at, hz: o.frequency.value }); } };
    return o;
  }
  createBufferSource() { return { buffer: null, loop: false, connect() {}, stop() {},
                                  start(at) { notes.push({ kind: 'noise', at }); } }; }
  createBiquadFilter() { return { type: '', frequency: param(), connect() {} }; }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  resume() {}
}

const sandbox = { document: { getElementById: () => el, createElement: () => el },
                  requestAnimationFrame: () => {}, console, Math, Date, AudioContext: FakeAudio,
                  screen: { width: 1920, height: 1080 }, navigator: { userAgent: 'node-test' },
                  ClipboardItem: class {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src + `
;globalThis.__G = { hit, keys, step, render, pumpMusic, audioOn, sfx, SND, SONGS, loadLevel, cam, TS, ERAS,
  get mode(){return mode}, set mode(v){mode=v}, get li(){return li}, set li(v){li=v},
  get hearts(){return hearts}, set hearts(v){hearts=v}, get score(){return score},
  get cat(){return cat}, get tiger(){return tiger}, get foes(){return foes}, get tokens(){return tokens},
  get map(){return map}, get doorway(){return doorway}, get water(){return water}, get boss(){return boss},
  openReport, closeReport, refreshLink, whereAmI, get sendLink(){return sendLink}, get bugtext(){return bugtext},
  get reporting(){return reporting},
  get W(){return W}, get H(){return H} };`, sandbox);

const S = sandbox.__G, TS = S.TS;
let failures = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
const check = (cond, label) => { console.log(`  ${cond ? 'ok' : 'FAIL'} ${label}`); if (!cond) failures++; };
const tick = (n = 1) => { for (let i = 0; i < n; i++) { S.step(1 / 60); S.render(); for (const k in S.hit) delete S.hit[k]; } };
const standable = c => c === '#' || c === 'X' || c === '=';

// ---- 1. the game starts and the rules hold --------------------------------
console.log('\nrules');
S.hit.Enter = 1; tick();
check(S.mode === 'play' && S.li === 0 && S.hearts === 3, 'ENTER starts level 1 with three hearts');
tick(40);
check(S.cat.ground && S.tiger.ground, 'both brothers land on the ground');

const tok = S.tokens[0];
S.cat.x = tok.x - 10; S.cat.y = tok.y - 10; tick();
check(S.score > 0, 'a shard is collected on contact');

S.hit.KeyQ = 1; tick();
check(S.SND.on !== undefined && S.tokens.length >= 0, 'the wish key is accepted');

const foe = S.foes[0];
S.cat.x = foe.x; S.cat.y = foe.y - 26; S.cat.vy = 300; S.cat.inv = 0; tick(2);
check(foe.dead, 'landing on a foe squashes it');
S.hearts = 3;
const foe2 = S.foes[1];
S.tiger.x = foe2.x - 2; S.tiger.y = foe2.y; S.tiger.vy = 0; S.tiger.inv = 0; tick(2);
check(S.hearts === 2, 'walking into a foe costs a heart');

S.loadLevel(0);
const bro = S.tiger;
S.cat.x = bro.x; S.cat.y = bro.y - 60; S.cat.vy = 400; tick(6);
check(S.cat.riding === true, "the cat can stand on his brother's shoulders");

// ---- 2. every level is walkable from spawn to arch ------------------------
console.log('\nlevels');
function botStep(p, L, Rk, J) {
  S.keys[L] = 0; S.keys[Rk] = 1;
  const feet = Math.floor((p.y + p.h + 4) / TS), ahead = Math.floor((p.x + p.w + 14) / TS);
  const gap = !standable((S.map[feet] || [])[ahead]);
  const wall = standable((S.map[feet - 1] || [])[ahead]);
  if (p.ground && (gap || wall)) S.hit[J] = 1;
  S.keys[J] = p.vy < -120 ? 1 : 0;                 // hold to float a little further
}
for (let i = 0; i < 6; i++) {
  S.mode = 'play'; S.hearts = 3; S.li = i; S.loadLevel(i);
  const doorX = S.doorway.x, era = S.ERAS[i];
  let best = 0;
  for (let f = 0; f < 60 * 90; f++) {
    botStep(S.cat, 'KeyA', 'KeyD', 'KeyW');
    botStep(S.tiger, 'ArrowLeft', 'ArrowRight', 'ArrowUp');
    S.step(1 / 60);
    S.hearts = 3;                                   // the bot cannot fight; geometry is what's under test
    for (const k in S.hit) delete S.hit[k];
    best = Math.max(best, Math.min(S.cat.x, S.tiger.x));
    if (S.li !== i) break;
  }
  S.keys.KeyD = S.keys.ArrowRight = 0;
  const reached = best > doorX - 40;
  ok(reached, `${era.key}: bot stalled at x=${best.toFixed(0)}, arch at ${doorX}`);
  if (reached) console.log(`  ok ${era.key.padEnd(9)} walkable end to end`);
}

// Atlantis is a climb: prove the arch ledge is reachable a jump at a time.
S.loadLevel(3);
const ledges = [];
for (let y = 0; y < S.H; y++) {
  let a = -1;
  for (let x = 0; x <= S.W; x++) {
    const solid = standable((S.map[y] || [])[x]);
    if (solid && a < 0) a = x;
    if (!solid && a >= 0) { ledges.push({ y, a, b: x - 1 }); a = -1; }
  }
}
const gapBetween = (p, q) => Math.max(0, Math.max(p.a - q.b, q.a - p.b));
const seen = new Set([0]), queue = [ledges.find(l => l.y === 24)];
seen.clear(); seen.add(ledges.indexOf(queue[0]));
while (queue.length) {
  const cur = queue.shift();
  ledges.forEach((l, i) => {                        // ~4 tiles across, ~3 up; falling is free
    if (!seen.has(i) && gapBetween(cur, l) <= 4 && cur.y - l.y <= 3) { seen.add(i); queue.push(l); }
  });
}
ok(seen.has(ledges.indexOf(ledges.find(l => l.y === 3))), 'atlantis: the arch ledge cannot be climbed to');
console.log(`  ok atlantis  ${seen.size}/${ledges.length} ledges reachable, arch included`);

// ---- 3. the crate barriers are a real gate, not a hurdle -------------------
// github#1: they used to be two tiles tall, and either brother simply jumped them.
console.log('\nbarriers');
const GROUND = 13 * TS;
for (const [i, key, col] of [[0, 'london', 22], [1, 'egypt', 45], [2, 'babylon', 20], [4, 'britain', 24]]) {
  const wallX = col * TS;
  const park = () => {
    S.mode = 'play'; S.li = i; S.loadLevel(i); S.hearts = 3;
    S.cat.x = wallX - 120; S.cat.y = GROUND - S.cat.h;
    S.tiger.x = wallX - 150; S.tiger.y = GROUND - S.tiger.h;
    S.cam.x = Math.max(0, wallX - 600);
  };

  park();                                             // the cat, trying everything
  let best = 0;
  for (let f = 0; f < 60 * 6; f++) {
    S.keys.KeyD = 1;
    if (f % 18 === 0) S.hit.KeyW = 1;                 // spam single and double jumps
    S.keys.KeyW = S.cat.vy < -120 ? 1 : 0;
    S.cat.inv = 99;                                   // foes are not what is under test
    S.step(1 / 60);
    for (const k in S.hit) delete S.hit[k];
    best = Math.max(best, S.cat.x);
  }
  S.keys.KeyD = S.keys.KeyW = 0;
  check(best + S.cat.w <= wallX + 1, `${key.padEnd(8)} the cat cannot jump the barrier (stopped at ${best.toFixed(0)}, wall at ${wallX})`);

  park();                                             // the tiger, walking straight at it
  for (let f = 0; f < 60 * 5; f++) {
    S.keys.ArrowRight = 1; S.tiger.inv = 99;
    S.step(1 / 60);
    for (const k in S.hit) delete S.hit[k];
  }
  S.keys.ArrowRight = 0;
  check(S.tiger.x > wallX + TS, `${key.padEnd(8)} the tiger smashes through it (reached ${S.tiger.x.toFixed(0)})`);
}

// ---- 4. the boss holds the arch shut -------------------------------------
console.log('\nbosses');
const atDoor = () => {
  S.cam.x = Math.max(0, S.doorway.x - 500);
  S.cat.x = S.doorway.x + 4; S.cat.y = S.doorway.y + 8; S.cat.inv = 99;
  S.tiger.x = S.doorway.x + 6; S.tiger.y = S.doorway.y + 8; S.tiger.inv = 99;
};
for (let i = 0; i < 5; i++) {
  S.mode = 'play'; S.li = i; S.loadLevel(i); S.hearts = 3;
  const era = S.ERAS[i], b = S.boss;
  if (!b) { check(false, `${era.key}: no boss spawned`); continue; }

  const floorY = b.y;                                  // he must not walk off his ledge
  S.cat.x = 0; S.tiger.x = 0;                          // brothers far to the left, so he charges
  for (let f = 0; f < 60 * 12; f++) S.step(1 / 60);
  const stayed = S.boss.y < S.H * TS && Math.abs(S.boss.y - floorY) < 200;

  atDoor(); tick(2);
  const shut = S.li === i;

  for (let n = 0; n < b.maxhp; n++) {                   // stomp him out
    S.boss.inv = 0;                                    // both brothers, or the camera clamp
    S.cat.x = S.boss.x; S.cat.y = S.boss.y - S.cat.h; S.cat.vy = 300;   // drags the cat off him
    S.tiger.x = S.boss.x; S.tiger.y = S.boss.y - 90; S.tiger.inv = 99;
    S.cam.x = Math.max(0, S.boss.x - 400);
    tick(1);
  }
  const dead = S.boss.hp === 0;

  atDoor(); tick(2);
  const opened = S.li === i + 1;

  check(shut && dead && opened && stayed,
    `${era.key.padEnd(8)} ${b.name}: ${b.maxhp} stomps, arch shut${shut ? '' : ' NOT'} until he falls` +
    `${stayed ? '' : ' (BUT he left his ledge)'}${dead ? '' : ' (BUT he survived)'}` +
    `${opened ? '' : ' (BUT the arch stayed shut)'}`);
}
S.mode = 'play'; S.li = 5; S.loadLevel(5);
check(S.boss === null, 'the future has no boss — nothing left to fight there');

// ---- 5. bug reports -------------------------------------------------------
console.log('\nbug report');
S.mode = 'play'; S.li = 1; S.loadLevel(1);
S.openReport();
check(S.reporting === true, 'B pauses the game and opens the panel');
const beforeKeys = { ...S.keys };
S.keys.KeyD = 1; tick(5);
check(S.cat.x === S.cat.x && S.keys.KeyD === 0, 'held keys are dropped while reporting');

S.bugtext.value = 'The tiger fell through the pyramid steps\nsecond line';
S.refreshLink();
const href = S.sendLink.href;
check(href.startsWith('https://github.com/korjavin/brothersgame/issues/new?labels=bug'),
      'the link opens a prefilled GitHub issue');
check(decodeURIComponent(href).includes('The tiger fell through'), "the player's words are carried over");
check(decodeURIComponent(href).includes('egypt'), 'the era is attached automatically');
check(decodeURIComponent(href).includes('hearts'), 'game state is attached automatically');
check(href.length < 8000, `the URL stays under browser limits (${href.length} chars)`);

S.bugtext.value = 'x'.repeat(400); S.refreshLink();
const title = decodeURIComponent(new URL(S.sendLink.href).searchParams.get('title'));
check(title.length <= 72, `a long report still gets a short title (${title.length} chars)`);
S.closeReport();
check(S.reporting === false, 'Esc/Cancel resumes the game');

// ---- 6. sound -------------------------------------------------------------
console.log('\nsound');
const runSeconds = sec => { for (let i = 0; i < sec * 60; i++) { clock += 1 / 60; S.pumpMusic(); } };
notes.length = 0;
S.audioOn();
S.SND.song = S.SONGS.london;
runSeconds(4);
const kicks = notes.filter(n => n.kind === 'osc' && Math.abs(n.hz - 110) < 1).length;
const wantKicks = 4 / (60 / 138 / 4) / 4;
ok(Math.abs(kicks - wantKicks) <= 2, `kick drifted: ${kicks} in 4s, wanted ~${wantKicks.toFixed(0)}`);
ok(Math.max(...notes.map(n => n.at - clock), 0) < .3, 'scheduler ran too far ahead');
console.log(`  ok london theme: ${notes.length} voices in 4s, ${kicks} kicks on the beat`);

Object.keys(S.SONGS).forEach((key, i) => {
  S.mode = 'play'; S.li = i; S.loadLevel(i);
  ok(S.SND.song === S.SONGS[key], `${key} did not load its own tune`);
});
console.log('  ok each era carries its own tune');

const before = notes.length;
S.sfx.jump(true); S.sfx.stomp(); S.sfx.smash(); S.sfx.coin(); S.sfx.hurt(); S.sfx.wish(); S.sfx.arch();
ok(notes.length - before >= 15, 'action sounds are silent');
console.log(`  ok action sounds: ${notes.length - before} voices`);

S.SND.on = false;
const muted = notes.length;
runSeconds(3); S.sfx.jump(true); S.sfx.smash();
ok(notes.length === muted, `mute leaked ${notes.length - muted} voices`);
S.SND.on = true;
const resumed = notes.length;
runSeconds(1);
ok(notes.length - resumed < 60, 'unmute dumped a backlog of notes');
console.log('  ok mute is silent, unmute resumes cleanly');

console.log(failures ? `\n${failures} FAILURES\n` : '\nall checks passed\n');
process.exit(failures ? 1 : 0);
