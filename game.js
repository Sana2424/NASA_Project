/* Outpost Commander — a power-budget survival game grounded in real NASA data.
   No build step, no libraries. Open index.html in any modern browser. */
"use strict";

/* ================= helpers ================= */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const isoDay = (d) => d.toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return isoDay(d); };
const prettyDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };

function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?'%:;()-]/gu, " "));
    u.rate = 0.95; speechSynthesis.speak(u);
  } catch (e) { }
}

/* ================= game constants ================= */
const CREW = 4;
const AIR_USE = 12, AIR_PER_CELL = 5;        // crew breathes 12 air-units per sol; each ⚡ makes 5
const FOOD_USE = 8, FOOD_PER_CELL = 4;       // crew eats 8 food-units per sol; each ⚡ grows 4 (ready in 3 sols)
const GROW_SOLS = 3;
const MAX_SOL = 20, SCIENCE_GOAL = 40, SHIELD_MAX = 10;
const LIMITS = { air: 5, green: 4, sci: 5, shield: 3, radio: 1 };

const SITES = {
  mars: {
    key: "mars", name: "Mars", place: "Jezero Crater", icon: "🔴",
    photo: "assets/mars_jezero_PIA24264.jpg", photoCredit: "Real photo: Perseverance rover's first 360° view of Jezero Crater (NASA/JPL-Caltech/ASU/MSSS, PIA24264)",
    basePower: 7, bgDose: 1.3, stormDose: [0, 4, 8, 14],
    airMaker: "Oxygen maker (pulls O₂ out of Mars' CO₂ air, like NASA's MOXIE)",
    bullets: ["Sunlight is only about 43% as strong as on Earth", "Dust storms can block the Sun for days", "Thin air blocks some radiation", "Radio messages take minutes to reach Earth"],
  },
  moon: {
    key: "moon", name: "Moon", place: "South Pole, Shackleton crater rim", icon: "🌕",
    photo: "assets/moon_southpole_PIA13523.jpg", photoCredit: "Real image: Lunar Reconnaissance Orbiter mosaic of the Moon's south pole (NASA/GSFC/Arizona State University, PIA13523)",
    basePower: 11, bgDose: 2.8, stormDose: [0, 12, 24, 38],
    airMaker: "Oxygen maker (melts polar ice and splits water into O₂)",
    bullets: ["Strong sunlight on the crater rims", "Shadows from mountains bring dark days (but they're predictable!)", "No air at all: radiation hits hard", "Earth is only 1.3 light-seconds away"],
  },
};

const CARGO = [
  { id: "solar", ic: "☀️", name: "Extra solar panels", cost: 1, txt: "+3 ⚡ every sunny sol. Dust and shadows cut it down." },
  { id: "reactor", ic: "⚛️", name: "Small fission reactor", cost: 2, txt: "+2 ⚡ every sol, even in dust storms or darkness. Heavy: takes 2 slots." },
  { id: "battery", ic: "🔋", name: "Big battery", cost: 1, txt: "Store up to 10 ⚡ for later (normally 4). Lands with 6 ⚡ charged." },
  { id: "food", ic: "🥫", name: "Food crates", cost: 1, txt: "+40 food when you land." },
  { id: "oxygen", ic: "🫧", name: "Oxygen tanks", cost: 1, txt: "+35 air when you land." },
  { id: "water", ic: "💧", name: "Water-wall tanks", cost: 1, txt: "Water blocks radiation! Start with shielding 4 / 10." },
  { id: "lab", ic: "🔬", name: "Science lab", cost: 1, txt: "Every ⚡ you give science makes 1.5× more data." },
];
const CARGO_SLOTS = 4;

const GLOSSARY = {
  sol: "A <b>sol</b> is one day on Mars: 24 hours, 39 minutes and 35 seconds. In this game we call every mission day a sol, even on the Moon.",
  dose: "<b>Radiation dose</b> is how much energy from space radiation your body soaks up. Small amounts every day add up, so mission planners keep a budget, like a piggy bank you must not overfill.",
  flare: "A <b>solar flare</b> is a sudden flash of energy on the Sun. Scientists rank them by size: C (small), M (medium, 10× bigger) and X (huge, 100× bigger than C).",
  sep: "A <b>radiation storm</b> (scientists say <i>solar energetic particle event</i>, or SEP) is a blast of super-fast particles from the Sun. They can travel from the Sun to Mars in under an hour.",
  regolith: "<b>Regolith</b> is the loose dust, sand and rocks covering the Moon and Mars. Piled up thick, it makes a great radiation shield, and it's free!",
  eva: "An <b>EVA</b> (extravehicular activity) is a spacewalk or moonwalk: going outside in a spacesuit. A suit protects much less than the habitat walls.",
  delay: "Radio waves travel at the speed of light, but space is huge. A message takes about <b>1.3 seconds</b> to reach Earth from the Moon, and between about <b>3 and 22 minutes</b> from Mars, depending on where the planets are.",
  conj: "Every 26 months, Mars goes behind the Sun as seen from Earth. This is called <b>solar conjunction</b>. The Sun blocks radio messages for about two weeks, so missions plan ahead.",
  greenhouse: "Plants need light and power every day. NASA's <b>Veggie</b> garden on the Space Station grew lettuce that astronauts ate in 2015. Plants take time to grow, so food you plant today feeds you later.",
};

const FACTS = {
  radMars: { t: "On the surface of Mars, NASA's Curiosity rover measured about <b>0.64 millisieverts of radiation per sol</b>. That's roughly 80 times more than a typical day on Earth.", s: "Hassler et al., Science (2014), Curiosity RAD instrument" },
  radMoon: { t: "On the Moon, a lander measured about <b>1.37 millisieverts per day</b>, about 2× Mars, because the Moon has no air or magnetic field. That's why this game's Moon radiation is about 2× Mars'.", s: "Zhang et al., Science Advances (2020), Chang'e-4 LND instrument" },
  limit: "NASA limits each astronaut's career radiation to <b>600 millisieverts</b>. Mission planners count every dose to stay well under it.",
  limitS: "NASA-STD-3001 Vol. 1 (2022)",
  o2: { t: "One person breathes about <b>0.84 kg of oxygen every day</b>. A crew of 4 needs over 3 kg a day, so making oxygen is the most important job on any outpost.", s: "NASA Life Support Baseline Values and Assumptions Document" },
  moxie: { t: "NASA's <b>MOXIE</b> experiment on Perseverance made 122 grams of oxygen from Mars' air between 2021 and 2023. That's about what a small dog breathes in 10 hours. A real outpost needs something hundreds of times bigger!", s: "NASA JPL, MOXIE mission results (2023)" },
  opp: { t: "In June 2018 a planet-wide dust storm blocked so much sunlight that NASA's solar-powered <b>Opportunity</b> rover lost power. It never woke up again, after almost 15 years on Mars.", s: "NASA JPL, Opportunity mission (2019)" },
  sun43: { t: "Mars is 1.5× farther from the Sun than Earth, so its sunlight is only <b>about 43%</b> as strong. Solar panels on Mars make less than half the power they would on Earth or the Moon.", s: "NASA Mars Fact Sheet" },
  veggie: { t: "In August 2015, astronauts on the International Space Station ate red romaine lettuce grown in NASA's <b>Veggie</b> garden, the first food NASA astronauts grew and ate in space.", s: "NASA Veggie experiment (VEG-01)" },
  osdr: { t: "NASA's <b>Open Science Data Repository (OSDR)</b> stores results from hundreds of space-biology experiments with plants, mice, microbes and people. Anyone in the world can download them for free.", s: "osdr.nasa.gov" },
  twins: { t: "In the NASA <b>Twins Study</b>, astronaut Scott Kelly spent 340 days in space while his twin Mark stayed on Earth. Most of the changes in Scott's body went back to normal after he came home.", s: "Garrett-Bakelman et al., Science (2019)" },
  bones: { t: "In low gravity, astronauts can lose about <b>1–1.5% of their bone mass every month</b> unless they exercise every day. Mars gravity is 38% of Earth's; the Moon's is just 16%.", s: "NASA Human Research Program" },
  ice: { t: "In 2009 NASA's <b>LCROSS</b> spacecraft crashed into Cabeus crater near the Moon's south pole on purpose. The plume it kicked up contained water ice! Ice means drinking water, oxygen and even rocket fuel.", s: "Colaprete et al., Science (2010)" },
  helga: { t: "On Artemis I (2022), two mannequins named <b>Helga and Zohar</b> flew around the Moon packed with radiation sensors. Zohar wore a radiation-protection vest to test how well it worked.", s: "NASA/DLR/ISA Matroshka AstroRad Radiation Experiment" },
  cycle: { t: "The Sun has an <b>11-year cycle</b>. At solar maximum it throws many more flares and radiation storms. NASA and NOAA announced in 2024 that the Sun had reached its maximum period of Solar Cycle 25.", s: "NASA / NOAA Solar Cycle 25 announcement (Oct 2024)" },
  fission: { t: "NASA is developing <b>Fission Surface Power</b>, small nuclear reactors for the Moon and Mars that work day and night, in dust or darkness. A test reactor called KRUSTY ran successfully in 2018.", s: "NASA Fission Surface Power project" },
  lro: { t: "NASA's <b>Lunar Reconnaissance Orbiter</b> has mapped exactly when sunlight hits each spot near the Moon's south pole. Some crater rims are sunny most of the year, so dark spells can be predicted far ahead.", s: "NASA LRO / LROC" },
  delayF: { t: "Because of the radio delay, Mars crews can't wait for Earth to help in an emergency. They'll need to make big decisions on their own, just like you!", s: "NASA Human Research Program, 'Isolation & Distance from Earth'" },
  water: { t: "Water and plastic are some of the best radiation shields, because they're full of hydrogen. Future habitats may put water tanks in the walls around where the crew sleeps.", s: "NASA Space Radiation Analysis Group" },
};
FACTS.limit = { t: FACTS.limit, s: FACTS.limitS }; delete FACTS.limitS;

/* ======= random event cards: every option costs something ======= */
const EVENTS = [
  { id: "rock", site: "both", ic: "🪨", title: "Strange shiny rock spotted!", text: "The rover camera spotted an unusual rock 3 km away. Scientists back home are excited!",
    hint: "Flight Director: 'A spacewalk is worth it if radiation is low and no storm is coming.'",
    opts: [
      { b: "Drive out and grab a sample (EVA)", c: "−1 ⚡ today · +3% radiation · +4 data", f: (S) => { S.eventCost += 1; S.dose += 3; S.data += 4; return "The crew drove out and grabbed the sample. Great science, but they soaked up extra radiation outside."; } },
      { b: "Zoom in with the long-range camera", c: "−1 ⚡ today · +1 data", f: (S) => { S.eventCost += 1; S.data += 1; return "The camera took some fuzzy photos. Safe, but not much science."; } },
    ] },
  { id: "scrubber", site: "both", ic: "🌬️", title: "Air filter clogged!", text: "The filter that removes the carbon dioxide (CO₂) the crew breathes out is clogged. Too much CO₂ gives astronauts headaches.",
    hint: "Flight Director: 'If your air tank is above half full, the spare cartridge buys time. If not, fix it now.'",
    opts: [
      { b: "Run the self-cleaning cycle", c: "−2 ⚡ today", f: (S) => { S.eventCost += 2; return "The filter cleaned itself. It took a big bite out of today's power."; } },
      { b: "Swap in a spare cartridge", c: "−10 air", f: (S) => { S.air -= 10; return "The spare worked, but some air was vented during the swap."; } },
    ] },
  { id: "blight", site: "both", ic: "🥀", title: "Sick plants in the greenhouse", text: "Some lettuce leaves have brown spots. A plant disease might be spreading.",
    hint: "Flight Director: 'Losing a harvest is OK if you have plenty of food. If food is low, treat the plants.'",
    opts: [
      { b: "Treat with UV light", c: "−2 ⚡ today", f: (S) => { S.eventCost += 2; return "The UV lamps killed the germs. The plants are healthy again."; } },
      { b: "Pull out the sick plants", c: "Lose your next harvest", f: (S) => { const lost = S.grow[0]; S.grow[0] = 0; return `The crew pulled the sick plants. ${lost} food from the next harvest is gone.`; } },
    ] },
  { id: "school", site: "both", ic: "🏫", title: "Students on Earth want to talk!", text: "1,000 students want to ask your crew questions. Sharing your mission inspires the next explorers.",
    hint: "Flight Director: 'Outreach counts as mission science too, but don't do it if power is tight.'",
    opts: [
      { b: "Record a video answer show", c: "−2 ⚡ today · +3 data", f: (S) => { S.eventCost += 2; S.data += 3; return S.site === "mars" ? "Because of the radio delay, a live chat from Mars is impossible. The crew recorded their answers instead. The students loved it!" : "With only 1.3 seconds of delay, the crew chatted almost live with the students!"; } },
      { b: "Send a short text message", c: "−1 ⚡ today · +1 data", f: (S) => { S.eventCost += 1; S.data += 1; return "The crew sent a quick hello."; } },
    ] },
  { id: "recycler", site: "both", ic: "🚰", title: "Water recycler broken!", text: "Your oxygen maker needs water. The recycler that cleans used water has broken down.",
    hint: "Flight Director: 'Draining the water walls weakens your radiation shield. Check the space weather first!'",
    opts: [
      { b: "Repair it now", c: "−2 ⚡ today", f: (S) => { S.eventCost += 2; return "Fixed! Water is flowing again."; } },
      { b: "Borrow water from the shield walls", c: "−1 shielding · −5 air", f: (S) => { S.shield = Math.max(0, S.shield - 1); S.air -= 5; return "You drained some water from the walls. Your radiation shield is a little thinner now."; } },
    ] },
  { id: "leak", site: "moon", ic: "☄️", title: "Micrometeorite hit!", text: "A speck of space rock smaller than a grain of sand hit the habitat at 30,000 km/h and made a tiny leak. With no air on the Moon, nothing slows these down.",
    hint: "Flight Director: 'Patch it from outside if you can afford the radiation. Closing the module costs air.'",
    opts: [
      { b: "Patch it from outside (EVA)", c: "−1 ⚡ today · +2% radiation", f: (S) => { S.eventCost += 1; S.dose += 2; return "Patched! The crew got a little extra radiation outside."; } },
      { b: "Seal off that module", c: "−8 air", f: (S) => { S.air -= 8; return "The crew sealed the room. The air inside it is lost."; } },
    ] },
  { id: "ice", site: "moon", ic: "🧊", title: "Ice found in a dark crater!", text: "Your rover detected water ice in a crater that never sees sunlight. Ice can be turned into water and oxygen!",
    hint: "Flight Director: 'The crater is freezing cold and dark. Only go if you can spare the power.'",
    opts: [
      { b: "Mine the ice", c: "−2 ⚡ today · +3% radiation · +20 air", f: (S) => { S.eventCost += 2; S.dose += 3; S.air += 20; return "The crew dug up ice and turned it into oxygen. Living off the land!"; } },
      { b: "Map it for future missions", c: "−1 ⚡ today · +2 data", f: (S) => { S.eventCost += 1; S.data += 2; return "You mapped the ice so future crews can find it."; } },
    ] },
  { id: "dusty", site: "mars", ic: "🌫️", title: "Dusty solar panels", text: "Fine red dust has settled on your solar panels. They now make 1 ⚡ less every sol.",
    hint: "Flight Director: 'NASA's Spirit and Opportunity rovers were saved many times by lucky gusts of wind. But you can't count on luck.'",
    opts: [
      { b: "Send a crew member to brush them (EVA)", c: "+2% radiation", f: (S) => { S.dose += 2; return "Sparkling clean panels!"; } },
      { b: "Wait for a wind gust to clean them", c: "−1 ⚡ every sol until the wind comes", f: (S) => { S.dirty = true; return "You're waiting for a lucky gust of wind. Each sol there's a 1 in 4 chance."; } },
    ] },
];

/* ================= orbit math (approximate, for comm delay & Earth–Mars geometry) ================= */
function helio(iso, p) {
  const d = (Date.parse(iso + "T12:00:00Z") - Date.parse("2000-01-01T12:00:00Z")) / 864e5;
  const L = (p.L0 + p.n * d) % 360;
  const M = ((L - p.peri) * Math.PI) / 180;
  const lon = (((L + ((2 * p.e * Math.sin(M) + 1.25 * p.e * p.e * Math.sin(2 * M)) * 180) / Math.PI) % 360) + 360) % 360;
  const r = p.a * (1 - p.e * Math.cos(M));
  return { lon, r };
}
const EARTH = { L0: 100.464, n: 0.9856474, peri: 102.937, e: 0.0167, a: 1 };
const MARS = { L0: 355.433, n: 0.5240208, peri: 336.06, e: 0.0934, a: 1.5237 };
function marsGeometry(iso) {
  const E = helio(iso, EARTH), M = helio(iso, MARS);
  const ex = E.r * Math.cos(E.lon * Math.PI / 180), ey = E.r * Math.sin(E.lon * Math.PI / 180);
  const mx = M.r * Math.cos(M.lon * Math.PI / 180), my = M.r * Math.sin(M.lon * Math.PI / 180);
  const dx = mx - ex, dy = my - ey, dist = Math.hypot(dx, dy);
  let sep = Math.abs(E.lon - M.lon) % 360; if (sep > 180) sep = 360 - sep;
  // elongation: angle at Earth between Sun and Mars
  const cosEl = ((-ex) * dx + (-ey) * dy) / (E.r * dist);
  const elong = Math.acos(clamp(cosEl, -1, 1)) * 180 / Math.PI;
  return { dist, sep, elong, delayMin: dist * 8.317, eLon: E.lon, mLon: M.lon, eR: E.r, mR: M.r };
}

/* ================= NASA DONKI data ================= */
const DATA = { live: null, liveStatus: "loading", liveSource: "" };

async function fetchJSON(url, ms = 9000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    const j = txt.trim() ? JSON.parse(txt) : [];
    if (!Array.isArray(j)) throw new Error("bad data");
    return j;
  } finally { clearTimeout(t); }
}
function flareScore(c) { if (!c) return 0; const k = { C: 0.1, M: 1, X: 10 }[c[0]] || 0; return k * (parseFloat(c.slice(1)) || 1); }
function buildDays(start, n, flr, sep) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(start, i);
    const fl = flr.filter((f) => (f.peakTime || f.beginTime || "").startsWith(d) && /^[MX]/.test(f.classType || ""));
    const sp = sep.filter((s) => (s.eventTime || "").startsWith(d));
    const big = fl.reduce((b, f) => (flareScore(f.classType) > flareScore(b) ? f.classType : b), "");
    const hi = sp.some((s) => (s.instruments || []).some((x) => /100 ?MeV/.test(x.displayName || "")));
    days.push([d, big, fl.length, sp.length, hi ? 1 : 0]);
  }
  return days;
}
async function loadLive() {
  const end = addDays(isoDay(new Date()), -1), start = addDays(end, -(MAX_SOL - 1));
  const key = window.NASA_API_KEY || "DEMO_KEY";
  const sources = [
    { name: "NASA CCMC DONKI", url: (t) => `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/${t}?startDate=${start}&endDate=${end}` },
    { name: "api.nasa.gov DONKI", url: (t) => `https://api.nasa.gov/DONKI/${t}?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(key)}` },
  ];
  for (const src of sources) {
    try {
      const [sep, flr] = await Promise.all([fetchJSON(src.url("SEP")), fetchJSON(src.url("FLR")).catch(() => null)]);
      DATA.live = { start, name: "The real Sun, right now", blurb: `The last ${MAX_SOL} days of real space weather, downloaded live just now (${prettyDate(start)} – ${prettyDate(end)}).`, marsExtra: [], days: buildDays(start, MAX_SOL, flr || [], sep), live: true, noFlares: !flr };
      DATA.liveStatus = "ok"; DATA.liveSource = src.name; return;
    } catch (e) { /* try next source */ }
  }
  DATA.liveStatus = "fail";
}

/* ================= title screen ================= */
const setup = { site: "mars", wx: "random", cargo: new Set(["solar", "food", "oxygen"]) };

function renderTitle() {
  $("#sitePicks").innerHTML = Object.values(SITES).map((s) => `
    <button class="pick ${setup.site === s.key ? "on" : ""}" data-site="${s.key}" aria-pressed="${setup.site === s.key}">
      <div class="ph" style="background-image:url('${s.photo}')"></div>
      <div class="bd"><h3>${s.icon} ${s.name}</h3><div class="chip">${esc(s.place)}</div>
      <ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul></div>
    </button>`).join("");
  document.querySelectorAll("[data-site]").forEach((b) => b.onclick = () => { setup.site = b.dataset.site; renderTitle(); });

  const arch = window.DONKI_ARCHIVE || [];
  const items = [];
  if (DATA.liveStatus === "ok") items.push({ id: "live", h: "🔴 LIVE: the last 20 days", p: `Straight from ${DATA.liveSource}. What would the real Sun have done to your base this month?`, chip: '<span class="chip live">live</span>' });
  else if (DATA.liveStatus === "loading") items.push({ id: "live", h: "🔴 LIVE: the last 20 days", p: "Connecting to NASA…", chip: '<span class="chip">loading</span>', dis: true });
  else items.push({ id: "live", h: "🔴 LIVE: the last 20 days", p: "Couldn't reach NASA right now (are you offline?). Pick a historic storm instead.", chip: '<span class="chip">offline</span>', dis: true });
  items.push({ id: "random", h: "🎲 Surprise me", p: "A random real stretch of space weather from NASA's archive. You'll find out which one at the end!", chip: '<span class="chip arch">archive</span>' });
  arch.forEach((w, i) => items.push({ id: "a" + i, h: w.name, p: w.blurb, chip: `<span class="chip arch">${prettyDate(w.start)}</span>` }));
  $("#wxPicks").innerHTML = items.map((it) => `
    <button class="wx ${setup.wx === it.id ? "on" : ""}" data-wx="${it.id}" ${it.dis ? "disabled" : ""} aria-pressed="${setup.wx === it.id}">
      <h4>${it.h} ${it.chip}</h4><p>${esc(it.p)}</p></button>`).join("");
  document.querySelectorAll("[data-wx]").forEach((b) => b.onclick = () => { setup.wx = b.dataset.wx; renderTitle(); });

  const used = [...setup.cargo].reduce((a, id) => a + CARGO.find((c) => c.id === id).cost, 0);
  $("#cargoMeter").innerHTML = `Cargo slots used: <b>${"📦".repeat(used)}${"⬜".repeat(Math.max(0, CARGO_SLOTS - used))}</b> ${used}/${CARGO_SLOTS}`;
  $("#cargoPicks").innerHTML = CARGO.map((c) => {
    const on = setup.cargo.has(c.id);
    return `<button class="cg ${on ? "on" : ""}" data-cg="${c.id}" aria-pressed="${on}"><span class="cost chip">${"📦".repeat(c.cost)}</span>
      <div class="ic">${c.ic}</div><h4>${c.name}</h4><p>${c.txt}</p></button>`;
  }).join("");
  document.querySelectorAll("[data-cg]").forEach((b) => b.onclick = () => {
    const id = b.dataset.cg, c = CARGO.find((x) => x.id === id);
    if (setup.cargo.has(id)) setup.cargo.delete(id);
    else if (used + c.cost <= CARGO_SLOTS) setup.cargo.add(id);
    else { toastModal("📦 Lander is full!", "Take something out first. Every rocket has a weight limit, so engineers have to choose what's most important."); return; }
    renderTitle();
  });
}

function renderLiveSun() {
  const el = $("#liveSunText");
  if (DATA.liveStatus === "loading") { el.textContent = "Checking the real Sun with NASA's space weather database…"; return; }
  if (DATA.liveStatus !== "ok") { el.innerHTML = "Couldn't reach NASA's live space weather right now. No problem: the game includes real archived NASA data, so you can still play."; return; }
  const last7 = DATA.live.days.slice(-7);
  const fl = last7.reduce((a, d) => a + d[2], 0), sp = last7.filter((d) => d[3] > 0).length;
  const big = last7.reduce((b, d) => (flareScore(d[1]) > flareScore(b) ? d[1] : b), "");
  el.innerHTML = `<b>The real Sun this past week</b> <span class="chip live">LIVE · ${esc(DATA.liveSource)}</span><br>
    ${DATA.live.noFlares ? "Flare list unavailable right now · " : `${fl} big flare${fl === 1 ? "" : "s"} (M or X class)${big ? `, the largest was <b>${big}</b>` : ""} · `}
    radiation storms on <b>${sp}</b> of the last 7 days. ${sp ? "Astronauts would be watching closely!" : "A calm week for astronauts."}`;
}

/* ================= game state ================= */
let S = null;

function pickWeather(rng) {
  const arch = window.DONKI_ARCHIVE;
  const roll = rng(); // always consume one roll so replays with the same seed match
  if (setup.wx === "live" && DATA.live) return DATA.live;
  if (setup.wx.startsWith("a")) return arch[+setup.wx.slice(1)];
  return arch[Math.floor(roll * arch.length)];
}

function newGame(seed) {
  seed = seed ?? Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);
  const site = SITES[setup.site];
  const W = pickWeather(rng);
  const cargo = new Set(setup.cargo);
  const midDay = W.days[Math.floor(MAX_SOL / 2)][0];
  const geo = marsGeometry(midDay);

  S = {
    seed, rng, site: site.key, W, cargo, geo, sol: 1,
    air: 60 + (cargo.has("oxygen") ? 35 : 0),
    food: 40 + (cargo.has("food") ? 40 : 0),
    dose: 0, science: 0, data: 0,
    battery: cargo.has("battery") ? 6 : 2, batteryCap: cargo.has("battery") ? 10 : 4,
    shield: cargo.has("water") ? 4 : 0,
    grow: [6, 4, 4], // food already growing at landing (seeded by the pre-landing robots)
    alloc: { air: 0, green: 0, sci: 0, shield: 0, radio: 0 }, shelter: false, eva: false,
    eventCost: 0, dirty: false, usedEvents: new Set(), pendingReply: null,
    history: [], storms: [], log: [], facts: new Set(), ended: false, wxRevealed: setup.wx !== "random",
  };

  // ---- pre-roll the mission's hidden schedule (deterministic per seed) ----
  // Radiation storms from real DONKI data. On Mars, storms seen near Earth may miss Mars
  // depending on where the planets are (we use their real positions on that date).
  const hitChance = S.site === "moon" ? 1 : clamp(0.9 - 0.6 * (geo.sep / 180), 0.3, 0.9);
  S.schedule = W.days.map((d, i) => {
    const [date, flare, nfl, nsep, hi] = d;
    let level = nsep > 0 ? (hi ? (nsep >= 4 ? 3 : 2) : 1) : 0;
    let note = "";
    if (S.site === "mars" && level && rng() > hitChance) { note = "missedMars"; level = 0; }
    const extra = S.site === "mars" ? (W.marsExtra || []).find((x) => x[0] === i) : null;
    if (extra) { level = Math.max(level, extra[1]); note = extra[2]; }
    // Forecasters see flares, and spacecraft see particle levels rising; but forecasts aren't perfect.
    const warned = flare !== "" || (nsep > 0 && rng() < 0.7);
    const farside = !!(extra && extra[3]);
    return { date, flare, nfl, nsep, hi, level, note, warned: farside ? false : warned, extra: !!extra, farside };
  });
  // Mars: dust storm (some missions). Moon: predictable shadow spells. Mars: real solar conjunction days.
  S.dust = []; S.shadow = []; S.conj = [];
  if (S.site === "mars" && rng() < 0.7) { const st = 5 + Math.floor(rng() * 10), len = 3 + Math.floor(rng() * 3); for (let k = st; k < st + len && k <= MAX_SOL; k++) S.dust.push(k); }
  if (S.site === "moon") { [[5, 4], [13, 4]].forEach(([a, b]) => { const st = a + Math.floor(rng() * b), len = 2 + Math.floor(rng() * 2); for (let k = st; k < st + len && k <= MAX_SOL; k++) S.shadow.push(k); }); }
  if (S.site === "mars") W.days.forEach((d, i) => { if (marsGeometry(d[0]).elong < 3) S.conj.push(i + 1); });

  showScreen("game");
  startSol();
  if (!store.get("oc_seenHelp", false)) { store.set("oc_seenHelp", true); showHelp(); }
}

/* ================= sol flow ================= */
const today = () => S.schedule[S.sol - 1];
const isDust = (sol = S.sol) => S.dust.includes(sol);
const isShadow = (sol = S.sol) => S.shadow.includes(sol);
const isConj = (sol = S.sol) => S.conj.includes(sol);

function computePower() {
  const site = SITES[S.site];
  let solar = site.basePower + (S.cargo.has("solar") ? 3 : 0);
  if (isDust()) solar *= 0.35;
  if (isShadow()) solar *= 0.1;
  solar = Math.round(solar);
  if (S.dirty) solar = Math.max(0, solar - 1);
  const reactor = S.cargo.has("reactor") ? 2 : 0;
  return { solar, reactor, battery: S.battery, total: solar + reactor + S.battery };
}

function startSol() {
  S.power = computePower();
  S.eventCost = 0;
  S.alloc = { air: 0, green: 0, sci: 0, shield: 0, radio: 0 };
  S.shelter = false; S.eva = false;
  S.solLog = [];
  if (S.pendingReply) { addLog(`📨 Reply from Earth arrived (it took ${Math.round(S.geo.delayMin * 2)} minutes): ${S.pendingReply}`); S.pendingReply = null; }
  if (S.sol === 1) addLog(`🛬 Landed at ${SITES[S.site].place} on ${SITES[S.site].name}. Crew of ${CREW} ready!`);
  if (isDust() && !isDust(S.sol - 1)) addLog("🌪️ A dust storm has arrived! Solar power is way down.");
  if (isShadow() && !isShadow(S.sol - 1)) addLog("🌑 Your base is in a mountain's shadow. Solar panels are almost useless.");
  if (S.dirty && S.sol > 1 && S.rng() < 0.25) { S.dirty = false; addLog("💨 A lucky gust of wind blew your solar panels clean!"); S.power = computePower(); }
  renderGame();
  // Random event card
  if (S.sol > 1 && S.rng() < 0.42) {
    const pool = EVENTS.filter((e) => (e.site === "both" || e.site === S.site) && !S.usedEvents.has(e.id));
    if (pool.length) { const ev = pool[Math.floor(S.rng() * pool.length)]; S.usedEvents.add(ev.id); setTimeout(() => showEvent(ev), 250); }
  }
}

function available() { return S.power.total - S.eventCost; }
function usedPower() { const a = S.alloc; return a.air + a.green + a.sci + a.shield + a.radio; }

function endSol() {
  const site = SITES[S.site], t = today(), rows = [];
  const a = S.alloc;
  const lines = [];
  // Air
  const airMade = a.air * AIR_PER_CELL;
  S.air = S.air + airMade - AIR_USE;
  rows.push(["🫁", `Air: made <b class="cost-good">+${airMade}</b>, crew breathed <b class="cost-bad">−${AIR_USE}</b>`, Math.max(0, Math.round(S.air))]);
  // Food
  let harvest = S.grow[0];
  if (S.shelter && harvest) harvest = Math.floor(harvest * 0.75);
  let wilt = 0;
  if (a.green === 0 && S.grow[1] + S.grow[2] > 0) { wilt = Math.ceil(S.grow[1] / 2) + Math.ceil(S.grow[2] / 2); S.grow[1] = Math.floor(S.grow[1] / 2); S.grow[2] = Math.floor(S.grow[2] / 2); }
  S.grow = [S.grow[1], S.grow[2], a.green * FOOD_PER_CELL];
  S.food = S.food + harvest - FOOD_USE;
  rows.push(["🌱", `Food: harvested <b class="cost-good">+${harvest}</b>, crew ate <b class="cost-bad">−${FOOD_USE}</b>${wilt ? ` · <b class="cost-bad">${wilt} growing food wilted</b> with no greenhouse power!` : ""}`, Math.max(0, Math.round(S.food))]);
  // Shield building
  if (a.shield) S.shield = Math.min(SHIELD_MAX, S.shield + a.shield);
  // Radiation
  const bg = site.bgDose * (1 - S.shield * 0.04) * (S.eva ? 2 : 1);
  let storm = 0;
  if (t.level) {
    storm = site.stormDose[t.level] * (1 - S.shield * 0.05) * (S.shelter ? 0.25 : 1) * (S.eva ? 2 : 1);
    S.storms.push({ sol: S.sol, date: t.date, level: t.level, flare: t.flare, sheltered: S.shelter, eva: S.eva, dose: r1(storm), note: t.note, warned: t.warned });
  } else if (t.warned && S.shelter) {
    S.storms.push({ sol: S.sol, date: t.date, level: 0, flare: t.flare, sheltered: true, falseAlarm: true, note: t.note });
  }
  S.dose += bg + storm;
  rows.push(["☢️", `Radiation: everyday space radiation <b class="cost-bad">+${r1(bg)}%</b>${storm ? ` · ⚡ STORM <b class="cost-bad">+${r1(storm)}%</b>` : ""}`, Math.round(S.dose) + "%"]);
  // Science
  let made = 0;
  if (!S.shelter) made = a.sci * (S.cargo.has("lab") ? 1.5 : 1) * (S.eva ? 2 : 1);
  S.data += made;
  let sent = 0;
  if (a.radio && !isConj()) { sent = S.data; S.science += S.data; S.data = 0; }
  rows.push(["🔬", `Science: collected <b class="cost-good">+${r1(made)}</b> data${sent ? `, beamed <b>${r1(sent)}</b> home to Earth` : S.data ? ` (${r1(S.data)} waiting to be sent, turn on the radio!)` : ""}`, r1(S.science) + " / " + SCIENCE_GOAL]);
  // Battery
  const left = Math.max(0, available() - usedPower());
  const stored = Math.min(S.batteryCap, left);
  S.battery = stored;
  rows.push(["🔋", `Battery: saved <b>${stored}</b> ⚡ for next sol${left > stored ? ` (${left - stored} ⚡ wasted, battery full)` : ""}`, `${stored}/${S.batteryCap}`]);

  // Storm story
  let story = "", ic = "🌙", title = `Sol ${S.sol} complete`;
  if (t.level) {
    ic = "⚡"; title = `Radiation storm on sol ${S.sol}!`;
    story = S.shelter ? `A real radiation storm hit, and your crew was safe inside the storm shelter. Good call!` :
      S.eva ? `A radiation storm hit while your crew was OUTSIDE on a spacewalk! They got a big dose.` :
        `A radiation storm hit and your crew wasn't in the shelter. They got an extra dose.`;
    if (t.farside) story += ` <b>Earth's satellites didn't see this one coming:</b> it came from the far side of the Sun, facing Mars.`;
    else if (t.extra) story += ` <b>This really happened on Mars:</b> NASA's Curiosity rover measured this storm on the surface.`;
  } else if (t.note === "missedMars") {
    story = "A radiation storm blasted past Earth today, but it missed Mars. The planets were in different places around the Sun.";
  } else if (t.warned && S.shelter) {
    story = "False alarm: the flare didn't send a radiation storm your way. Forecasting space weather is hard, even for NASA!";
  }
  if (S.shelter) lines.push("Crew stayed in the shelter: no science today, and the greenhouse got less care.");
  if (S.eva && !S.shelter) lines.push("The spacewalk doubled science, and doubled radiation.");
  if (isConj() && a.radio) lines.push("The Sun is between Earth and Mars (solar conjunction): the radio couldn't get through.");

  S.history.push({ sol: S.sol, air: clamp(S.air, 0, 100), food: clamp(S.food, 0, 120), dose: clamp(S.dose, 0, 100), sci: S.science, storm: t.level, sheltered: S.shelter });
  addLog(`Sol ${S.sol}: air ${Math.max(0, Math.round(S.air))}, food ${Math.max(0, Math.round(S.food))}, radiation ${Math.round(S.dose)}%${t.level ? " · radiation storm!" : ""}`);
  S.air = Math.min(S.air, 100); S.food = Math.min(S.food, 120);

  const fail = S.air <= 0 ? "air" : S.food <= 0 ? "food" : S.dose >= 100 ? "rad" : null;
  if (t.level) { const g = $("#sceneStorm"); g.classList.remove("on"); void g.offsetWidth; g.classList.add("on"); }
  showReport({ ic, title, story, rows, lines, t, fail });
}

function pickFact(t) {
  const want = [];
  if (t.level || t.warned) want.push(S.site === "mars" ? "radMars" : "radMoon", "limit", "helga", "water", "cycle");
  if (isDust()) want.push("opp", "sun43");
  if (isShadow()) want.push("lro", "fission");
  if (S.alloc.green) want.push("veggie", "osdr");
  if (S.alloc.air) want.push(S.site === "mars" ? "moxie" : "ice", "o2");
  want.push("o2", "twins", "bones", "osdr", "delayF", "sun43", "lro", "water", "cycle", "fission", "veggie");
  const k = want.find((x) => !S.facts.has(x) && !(S.site === "moon" && ["opp", "sun43", "moxie"].includes(x)) && !(S.site === "mars" && ["lro", "ice"].includes(x)));
  if (!k) return null; S.facts.add(k); return FACTS[k];
}

function showReport({ ic, title, story, rows, lines, t, fail }) {
  const fact = pickFact(t);
  const html = `
    <div class="big-ic">${ic}</div><h2>${title}</h2>
    <div class="src">Real date on the Sun: <b>${prettyDate(t.date)}</b>${t.flare ? ` · biggest flare: <b>${t.flare}</b>` : ""} · radiation storm records: <b>${t.nsep}</b></div>
    ${story ? `<p>${story}</p>` : ""}
    <div class="rows">${rows.map((r) => `<div class="row"><span>${r[0]}</span><span>${r[1]}</span><span class="d">${r[2]}</span></div>`).join("")}</div>
    ${lines.map((l) => `<p class="src">• ${l}</p>`).join("")}
    ${fact ? `<div class="fact">💡 <b>Real NASA science:</b> ${fact.t}<small>Source: ${fact.s}</small></div>` : ""}
    <p class="center" style="margin-top:16px"><button class="big-btn" id="nextSol">${fail ? "See what happened" : S.sol >= MAX_SOL ? "🏁 Finish mission" : `Start sol ${S.sol + 1} ▶`}</button></p>`;
  openModal(html, () => {
    $("#nextSol").onclick = () => {
      closeModal();
      if (fail) return endGame(fail);
      if (S.sol >= MAX_SOL) return endGame(null);
      S.sol++; startSol();
    };
  });
}

/* ================= events & Mission Control ================= */
function showEvent(ev) {
  const html = `
    <div class="big-ic">${ev.ic}</div><h2>${ev.title}</h2><p>${ev.text}</p>
    <div class="opts">${ev.opts.map((o, i) => `<button class="opt" data-opt="${i}"><b>${o.b}</b><span>${o.c}</span></button>`).join("")}</div>
    <div class="ask-mc"><button class="ghost" id="askMC">📡 Ask Mission Control on Earth for advice</button><div id="mcOut"></div></div>`;
  openModal(html, () => {
    document.querySelectorAll("[data-opt]").forEach((b) => b.onclick = () => {
      const o = ev.opts[+b.dataset.opt];
      if (/⚡ today/.test(o.c)) {
        const need = +(o.c.match(/−(\d) ⚡ today/) || [0, 0])[1];
        if (need > available() - usedPower()) {
          $("#mcOut").innerHTML = `<p class="cost-bad">Not enough free power for that! Free ⚡: ${available() - usedPower()}.</p>${ev.opts.every((x) => +((x.c.match(/−(\d) ⚡ today/) || [0, 0])[1]) > available() - usedPower()) ? `<button class="ghost" id="skipEv">We can't afford either choice: skip it</button>` : ""}`;
          const sk = $("#skipEv"); if (sk) sk.onclick = () => { addLog(`${ev.ic} ${ev.title}: no power to deal with it today.`); closeModal(); renderGame(); };
          return;
        }
      }
      const msg = o.f(S); addLog(`${ev.ic} ${ev.title} → ${o.b}. ${msg}`); closeModal(); renderGame();
      toastModal(ev.ic + " " + o.b, msg);
    });
    $("#askMC").onclick = () => askMissionControl(ev);
  });
}

function askMissionControl(ev) {
  const out = $("#mcOut"); $("#askMC").disabled = true;
  if (S.site === "moon") {
    out.innerHTML = `<div class="sig"><i id="sigBar"></i></div><p class="src">Sending… (Moon → Earth takes 1.3 seconds)</p>`;
    requestAnimationFrame(() => { const b = $("#sigBar"); b.style.transitionDuration = "2.6s"; b.style.width = "100%"; });
    setTimeout(() => { out.innerHTML = `<div class="fact">📨 <b>Reply in 2.6 seconds:</b> ${ev.hint}</div>`; }, 2700);
  } else {
    const m = Math.round(S.geo.delayMin);
    out.innerHTML = `<div class="sig"><i id="sigBar"></i></div><p class="src">Sending… Mars is <b>${m} light-minutes</b> from Earth right now.</p>`;
    requestAnimationFrame(() => { const b = $("#sigBar"); b.style.transitionDuration = "3s"; b.style.width = "50%"; });
    setTimeout(() => {
      out.innerHTML = `<div class="fact">⏳ Your question will reach Earth in <b>${m} minutes</b>. Their answer needs another <b>${m} minutes</b> to come back. That's <b>${m * 2} minutes</b> of waiting. This decision can't wait that long. <b>You're the commander: you decide!</b> (Earth's reply will show up in your log next sol.)<small>That's why NASA trains Mars crews to solve problems on their own. <button class="term" data-term="delay">Why the delay?</button></small></div>`;
      S.pendingReply = ev.hint; bindTerms(out);
    }, 3100);
  }
}

/* ================= rendering ================= */
function addLog(t) { S.log.unshift(t); }

function renderGame() {
  renderHud(); renderScene(); renderGauges(); renderWeather(); renderPower();
  $("#log").innerHTML = S.log.slice(0, 40).map((l) => `<li>${l}</li>`).join("");
}

function renderHud() {
  const site = SITES[S.site], t = today();
  const delay = S.site === "moon" ? "1.3 seconds" : `${Math.round(S.geo.delayMin)} minutes`;
  $("#hud").innerHTML = `
    <span class="sol">${site.icon} <button class="term" data-term="sol">Sol</button> ${S.sol} <small>of ${MAX_SOL}</small></span>
    <span class="chip">${site.name} · ${esc(site.place)}</span>
    <span class="grow"></span>
    <span class="chip ${S.W.live ? "live" : "arch"}" title="Real space weather for this sol">☀️ Sun date: ${S.wxRevealed ? prettyDate(t.date) : "secret until the end!"} · ${S.W.live ? "LIVE NASA data" : "NASA archive"}</span>
    <span class="chip">📡 Earth is <button class="term" data-term="delay">${delay}</button> away</span>`;
  bindTerms($("#hud"));
}

function renderScene() {
  const site = SITES[S.site];
  const mars = S.site === "mars";
  $("#scenePhoto").style.backgroundImage = mars ? `url('${site.photo}')` : "none";
  $("#sceneDust").style.opacity = isDust() ? 0.75 : 0;
  $("#sceneShade").style.opacity = isShadow() ? 0.6 : 0;
  $("#sceneTag").textContent = mars ? site.photoCredit : "Base art; south-pole map: NASA LRO (PIA13523)";
  const ground = mars ? "#a4532c" : "#8d8d93", ground2 = mars ? "#7d3c20" : "#5f5f66";
  const sky = mars ? `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3b48a" stop-opacity=".55"/><stop offset="1" stop-color="#c48155" stop-opacity=".25"/></linearGradient></defs><rect width="800" height="250" fill="url(#sk)"/>`
    : `<rect width="800" height="400" fill="#03040a"/>` + Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 137) % 800}" cy="${(i * 53) % 230}" r="${i % 5 ? 1 : 1.8}" fill="#fff" opacity="${0.4 + (i % 3) * 0.2}"/>`).join("") +
      `<image href="${site.photo}" x="640" y="14" width="140" height="140" opacity=".85"/><text x="710" y="168" fill="#bbb" font-size="11" text-anchor="middle">LRO map: you are here ✕</text><text x="710" y="85" fill="#ff5d73" font-size="18" text-anchor="middle" font-weight="900">✕</text>`;
  const sun = isShadow() || isDust() ? "" : `<circle cx="${mars ? 90 : 70}" cy="60" r="${mars ? 16 : 24}" fill="#fff4c2" opacity=".95"/>`;
  const earth = !mars ? `<circle cx="560" cy="70" r="16" fill="#3b82f6"/><path d="M548 66q8-8 14 0t10 4" stroke="#7ee07e" stroke-width="4" fill="none"/>` : "";
  const bermH = 8 + S.shield * 5;
  const solarCount = 3 + (S.cargo.has("solar") ? 2 : 0);
  const panels = Array.from({ length: solarCount }, (_, i) => `<g transform="translate(${470 + i * 58},250)"><line x1="22" y1="30" x2="22" y2="55" stroke="#ccc" stroke-width="4"/><polygon points="0,30 48,30 40,5 -8,5" fill="${S.dirty ? "#6b5a4a" : "#2b4fa8"}" stroke="#9fb6ff" stroke-width="2"/></g>`).join("");
  const reactor = S.cargo.has("reactor") ? `<g transform="translate(40,250)"><rect x="0" y="10" width="34" height="45" rx="4" fill="#ddd"/><polygon points="17,-12 30,10 4,10" fill="#bbb"/><text x="17" y="42" font-size="16" text-anchor="middle">⚛</text></g>` : "";
  const glowGreen = S.alloc.green ? "#9cff9c" : "#6a8f6a";
  const astronauts = S.eva && !S.shelter ? `<g font-size="28"><text x="380" y="345">🧑‍🚀</text><text x="420" y="350">🧑‍🚀</text></g>` : "";
  const dish = `<g transform="translate(300,180)"><line x1="20" y1="30" x2="20" y2="105" stroke="#ccc" stroke-width="5"/><path d="M0 30 Q20 55 40 30 Z" fill="#eee" transform="rotate(-25 20 30)"/>${S.alloc.radio ? `<g stroke="#5ec8ff" fill="none" stroke-width="3"><path d="M50 10 q10 10 0 20"/><path d="M60 0 q18 18 0 40"/></g>` : ""}</g>`;
  $("#sceneSvg").innerHTML = `${sky}${sun}${earth}
    <path d="M0 270 Q200 240 400 262 T800 255 V400 H0Z" fill="${ground}" opacity="${mars ? 0.75 : 1}"/>
    <path d="M0 320 Q250 300 520 318 T800 315 V400 H0Z" fill="${ground2}" opacity="${mars ? 0.7 : 1}"/>
    ${reactor}${panels}${dish}
    <g transform="translate(110,0)">
      <path d="M0 ${305 - bermH} Q95 ${235 - bermH} 190 ${305 - bermH} L190 312 L0 312Z" fill="${ground2}" stroke="#0004"/>
      <path d="M15 305 Q95 215 175 305Z" fill="#e9eef7" stroke="#9aa6c4" stroke-width="3"/>
      <rect x="80" y="282" width="30" height="23" rx="6" fill="#ffb547"/>
      ${S.shelter ? `<text x="95" y="260" font-size="24" text-anchor="middle">🏠</text>` : `<circle cx="60" cy="270" r="8" fill="#ffd54a" opacity=".8"/><circle cx="130" cy="270" r="8" fill="#ffd54a" opacity=".8"/>`}
    </g>
    <g transform="translate(330,268)"><path d="M0 40 Q45 -5 90 40Z" fill="${glowGreen}" opacity=".85" stroke="#cfe" stroke-width="2"/><text x="45" y="34" font-size="18" text-anchor="middle">🌱</text></g>
    ${astronauts}`;
  const al = [];
  const t = today();
  if (S.alloc.radio && !isConj() && t.warned) al.push(`⚠️ Storm watch from Earth: ${t.flare ? `${t.flare} solar flare spotted!` : "particle levels rising!"}`);
  if (isDust()) al.push("🌪️ Dust storm: solar power way down");
  if (isShadow()) al.push("🌑 In shadow: solar power almost zero");
  $("#sceneAlert").innerHTML = al.map((x) => `<div>${x}</div>`).join("");
}

function gauge(icon, name, val, max, color, note, danger, termKey) {
  const pct = clamp((val / max) * 100, 0, 100);
  return `<div class="g ${danger ? "danger" : ""}"><div class="top"><span>${icon} ${termKey ? `<button class="term" data-term="${termKey}">${name}</button>` : name}</span><span>${typeof val === "number" ? Math.round(val) : val}${max === 100 && name.includes("Radiation") ? "%" : ""}</span></div>
    <div class="bar"><i style="width:${pct}%;background:${color}"></i></div><small>${note}</small></div>`;
}

function renderGauges() {
  const airSols = Math.floor(S.air / AIR_USE), foodSols = Math.floor(S.food / FOOD_USE);
  $("#gauges").innerHTML =
    gauge("🫁", "Air (oxygen)", S.air, 100, "var(--air)", `Crew breathes ${AIR_USE} per sol → enough for <b>${airSols}</b> sol${airSols === 1 ? "" : "s"}`, airSols < 2) +
    gauge("🍅", "Food", S.food, 120, "var(--food)", `Crew eats ${FOOD_USE} per sol → <b>${foodSols}</b> sols left · growing: ${S.grow.join(" → ")}`, foodSols < 2, "greenhouse") +
    gauge("☢️", "Radiation dose", S.dose, 100, S.dose > 75 ? "var(--bad)" : "var(--rad)", `Mission budget used. At 100% the crew must go home. Shielding: <b>${S.shield}/${SHIELD_MAX}</b>`, S.dose > 80, "dose") +
    gauge("🔬", "Science sent home", S.science, SCIENCE_GOAL, "var(--sci)", `Goal: ${SCIENCE_GOAL}. Waiting to send: <b>${r1(S.data)}</b>${S.data ? " (needs radio)" : ""}`, false);
  bindTerms($("#gauges"));
}

function renderWeather() {
  const t = today(), site = SITES[S.site];
  let msg;
  if (isConj()) msg = `<div class="msg dark">☀️🚫 <b>Solar conjunction:</b> the Sun is between Earth and Mars. No radio contact, no forecasts, no sending data. <button class="term" data-term="conj">What's that?</button></div>`;
  else if (!S.alloc.radio) msg = `<div class="msg dark">📻 <b>Radio is off.</b> Turn it on (1 ⚡) to hear Earth's space weather forecast and send your science data home.</div>`;
  else if (t.warned) msg = `<div class="msg warn">⚠️ <b>STORM WATCH</b> from NASA forecasters: ${t.flare ? `a <b>${t.flare}</b> <button class="term" data-term="flare">solar flare</button> erupted today!` : `spacecraft near Earth see fast particles rising!`} A <button class="term" data-term="sep">radiation storm</button> may hit. ${S.site === "mars" ? `(This message took ${Math.round(S.geo.delayMin)} min to reach you. And storms seen from Earth might miss Mars.)` : ""} Should the crew take shelter?</div>`;
  else msg = `<div class="msg calm">😎 <b>Forecast:</b> no big flares seen today. ${S.site === "mars" ? "But Earth can't see the side of the Sun that faces away from it..." : "Looks calm."}</div>`;
  // Upcoming predictable things
  const up = [];
  if (S.site === "moon") { const n = S.shadow.find((x) => x > S.sol && x <= S.sol + 3); if (n && !isShadow()) up.push(`🌑 <b>Shadow coming in ${n - S.sol} sol${n - S.sol > 1 ? "s" : ""}</b> (predicted by NASA's LRO lighting maps). Charge your battery!`); }
  if (S.site === "mars" && S.alloc.radio && !isConj()) { const n = S.dust.find((x) => x > S.sol && x <= S.sol + 2); if (n && !isDust()) up.push(`🌪️ <b>Dust storm spotted</b> by Mars Reconnaissance Orbiter. Arrives in ${n - S.sol} sol${n - S.sol > 1 ? "s" : ""}!`); }
  if (S.site === "mars") { const n = S.conj.find((x) => x > S.sol && x <= S.sol + 3); if (n) up.push(`☀️ Solar conjunction (radio blackout) begins in ${n - S.sol} sol(s).`); }

  let orbit = "";
  if (S.site === "mars") {
    const g = S.geo, cx = 40, cy = 40, toXY = (lon, r) => [cx + Math.cos(lon * Math.PI / 180) * r, cy - Math.sin(lon * Math.PI / 180) * r];
    const [ex, ey] = toXY(g.eLon, 16), [mx, my] = toXY(g.mLon, 32);
    orbit = `<div class="orbit"><svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label="Positions of Earth and Mars around the Sun">
      <circle cx="40" cy="40" r="16" fill="none" stroke="#2c376a"/><circle cx="40" cy="40" r="32" fill="none" stroke="#2c376a"/>
      <circle cx="40" cy="40" r="5" fill="#ffb547"/><line x1="${ex}" y1="${ey}" x2="${mx}" y2="${my}" stroke="#5ec8ff" stroke-dasharray="2 2"/>
      <circle cx="${ex}" cy="${ey}" r="4" fill="#3b82f6"/><circle cx="${mx}" cy="${my}" r="4" fill="#ff6b3d"/></svg>
      <span>Where the planets really were${S.wxRevealed ? "" : " during your mission"}: Earth 🔵 and Mars 🔴 are <b>${Math.round(g.sep)}°</b> apart around the Sun, ${r1(g.dist)} AU away (1 AU = Earth–Sun distance). ${g.sep > 90 ? "Mars is on the far side, so Earth can't see many of the flares aimed at Mars." : "Mars is on our side of the Sun, so Earth's forecasts work pretty well."}</span></div>`;
  }
  $("#wxPanel").innerHTML = `<h2>🛰️ Space weather & Earth contact</h2>${msg}${up.map((u) => `<div class="msg warn" style="margin-top:8px">${u}</div>`).join("")}${orbit}
    <div class="realdata">Data: ${S.W.live ? `<span class="chip live">LIVE</span> NASA DONKI via ${esc(DATA.liveSource)}` : `<span class="chip arch">ARCHIVE</span> real NASA DONKI records, downloaded Nov 14, 2026 (not live)`}. Storms on Mars use the real positions of Earth and Mars on that date.</div>`;
  bindTerms($("#wxPanel"));
}

function renderPower() {
  const site = SITES[S.site], p = S.power, a = S.alloc;
  const avail = available(), used = usedPower(), free = avail - used;
  const cells = [];
  for (let i = 0; i < p.solar; i++) cells.push("sol");
  for (let i = 0; i < p.reactor; i++) cells.push("react");
  for (let i = 0; i < p.battery; i++) cells.push("batt");
  let spend = used + S.eventCost;
  const cellHtml = cells.map((c, i) => {
    const isUsed = i < spend;
    const isEvent = i < S.eventCost;
    return `<span class="cell ${c === "sol" ? "" : c} ${isUsed ? "used" : ""}" title="${c === "sol" ? "solar" : c === "react" ? "reactor" : "battery"}">${isEvent ? "🛠" : c === "sol" ? "☀" : c === "react" ? "⚛" : "🔋"}</span>`;
  }).join("");
  const sys = [
    { k: "air", ic: "🫁", h: "Make air", p: `${site.airMaker}. Each ⚡ makes ${AIR_PER_CELL} air. Crew breathes ${AIR_USE} per sol.`, out: `+${a.air * AIR_PER_CELL} air` },
    { k: "green", ic: "🌱", h: "Greenhouse", p: `Each ⚡ grows ${FOOD_PER_CELL} food, ready in ${GROW_SOLS} sols. With 0 ⚡, growing plants wilt!`, out: `+${a.green * FOOD_PER_CELL} food in ${GROW_SOLS} sols` },
    { k: "shield", ic: "🛡️", h: "Build shielding", p: `Rover piles <button class="term" data-term="regolith">regolith</button> on the habitat. +1 shield per ⚡ (forever). Each point blocks some radiation.`, out: `shield ${S.shield}/${SHIELD_MAX}`, max: Math.min(LIMITS.shield, SHIELD_MAX - S.shield) },
    { k: "sci", ic: "🔬", h: "Science", p: `Each ⚡ collects ${S.cargo.has("lab") ? "1.5" : "1"} data. Data only counts once the radio sends it home.`, out: `+${r1(a.sci * (S.cargo.has("lab") ? 1.5 : 1) * (S.eva ? 2 : 1) * (S.shelter ? 0 : 1))} data` },
    { k: "radio", ic: "📡", h: "Radio to Earth", p: isConj() ? "Blocked by the Sun (solar conjunction)." : "Hear the space weather forecast and send data home.", out: a.radio ? "ON" : "off", max: isConj() ? 0 : 1 },
  ];
  const t = today();
  $("#powerPanel").innerHTML = `
    <h2>⚡ Today's power: ${avail} cell${avail === 1 ? "" : "s"}</h2>
    <div class="powerbar" aria-label="power cells">${cellHtml}</div>
    <div class="src">☀ solar ${p.solar}${isDust() ? " (dust storm!)" : ""}${isShadow() ? " (shadow!)" : ""}${S.dirty ? " (dusty panels −1)" : ""}${p.reactor ? ` · ⚛ reactor ${p.reactor}` : ""} · 🔋 battery ${p.battery}${S.eventCost ? ` · 🛠 repairs −${S.eventCost}` : ""}</div>
    ${sys.map((s) => {
      const max = s.max ?? LIMITS[s.k];
      return `<div class="sys"><div class="ic">${s.ic}</div><div><h3>${s.h} <span class="chip">${s.out}</span></h3><p>${s.p}</p></div>
        <div class="ctr"><button data-m="${s.k}" aria-label="less power to ${s.h}" ${a[s.k] <= 0 ? "disabled" : ""}>−</button><span class="n">${a[s.k]}</span><button data-p="${s.k}" aria-label="more power to ${s.h}" ${a[s.k] >= max || free <= 0 ? "disabled" : ""}>+</button></div></div>`;
    }).join("")}
    <div class="toggles">
      <button class="tg ${S.shelter ? "on" : ""}" id="tgShelter" aria-pressed="${S.shelter}"><b>🏠 Shelter crew</b><span>Hide in the shielded core. Blocks 75% of a storm's radiation. But: no science, less greenhouse care.</span></button>
      <button class="tg ${S.eva ? "on" : ""}" id="tgEva" aria-pressed="${S.eva}" ${S.shelter ? "disabled" : ""}><b>🧑‍🚀 Go exploring (<span class="term" data-term="eva" role="button" tabindex="0">EVA</span>)</b><span>2× science, but 2× radiation outside.</span></button>
    </div>
    <div class="endrow"><span class="leftover">${free > 0 ? `${free} ⚡ unused → battery (holds ${S.batteryCap})${free > S.batteryCap ? ` · ${free - S.batteryCap} will be wasted!` : ""}` : "All power assigned."}</span>
      <button class="big-btn" id="endSolBtn">End sol ${S.sol} ▶</button></div>`;
  document.querySelectorAll("[data-p]").forEach((b) => b.onclick = () => { S.alloc[b.dataset.p]++; renderGame(); });
  document.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => { S.alloc[b.dataset.m]--; renderGame(); });
  $("#tgShelter").onclick = () => { S.shelter = !S.shelter; if (S.shelter) S.eva = false; renderGame(); };
  $("#tgEva").onclick = (e) => { if (e.target.closest(".term")) return; S.eva = !S.eva; renderGame(); };
  $("#endSolBtn").onclick = () => confirmEnd();
  bindTerms($("#powerPanel"));
}

function confirmEnd() {
  const warn = [];
  const airAfter = S.air + S.alloc.air * AIR_PER_CELL - AIR_USE;
  if (airAfter < AIR_USE) warn.push(`🫁 Air will be down to <b>${Math.max(0, airAfter)}</b>. That's less than one sol of breathing!`);
  if (S.alloc.green === 0 && S.grow[1] + S.grow[2] > 0) warn.push("🌱 The greenhouse has no power. Growing plants will wilt.");
  if (S.food + S.grow[0] - FOOD_USE < FOOD_USE) warn.push("🍅 Food is about to run out.");
  if (S.alloc.sci && S.shelter) warn.push("🔬 Your crew is in the shelter, so science power will be wasted.");
  if (!warn.length) return endSol();
  openModal(`<div class="big-ic">🤔</div><h2>Are you sure, Commander?</h2>${warn.map((w) => `<p>${w}</p>`).join("")}
    <div class="opts"><button class="opt" id="goBack"><b>Go back and change my plan</b></button><button class="opt" id="goOn"><b>End the sol anyway</b></button></div>`, () => {
    $("#goBack").onclick = closeModal; $("#goOn").onclick = () => { closeModal(); endSol(); };
  });
}

/* ================= endings ================= */
function endGame(fail) {
  S.ended = true; S.wxRevealed = true;
  const survived = !fail;
  const stars = survived ? 1 + (S.science >= SCIENCE_GOAL ? 1 : 0) + (S.dose < 50 ? 1 : 0) : 0;
  const best = store.get("oc_best_" + S.site, 0); if (stars > best) store.set("oc_best_" + S.site, stars);
  const reasons = {
    air: ["🫁 The air ran low", "Your crew used their emergency oxygen and flew home safely, but the outpost had to be left behind. Air is the #1 priority: real outposts keep extra oxygen in reserve for bad days."],
    food: ["🍅 The food ran out", "Your crew packed up and flew home safely. Remember: plants take sols to grow, so you have to plant before you get hungry."],
    rad: ["☢️ Radiation budget used up", "Mission doctors called the crew home to keep them healthy for the rest of their lives. Shielding and sheltering during storms protect your radiation budget."],
  };
  const lessons = [];
  const storms = S.storms.filter((s) => s.level > 0), unshel = storms.filter((s) => !s.sheltered);
  if (storms.length) lessons.push(`Real radiation storms hit your base <b>${storms.length}</b> time${storms.length > 1 ? "s" : ""}. You sheltered for <b>${storms.length - unshel.length}</b>.${unshel.length ? " Each unsheltered storm cost a lot of your radiation budget." : " Great storm discipline!"}`);
  else lessons.push("No radiation storms reached your base this time. Try a different storm period to test your shelter skills!");
  const fa = S.storms.filter((s) => s.falseAlarm).length;
  if (fa) lessons.push(`You sheltered for <b>${fa}</b> false alarm${fa > 1 ? "s" : ""}. That's normal: a big flare doesn't always cause a radiation storm. Real forecasters face the same problem!`);
  if (S.site === "mars" && S.schedule.some((d) => d.farside)) lessons.push("A storm hit Mars that Earth didn't see coming. Mars needs its own space-weather sensors!");
  if (S.site === "mars" && S.schedule.some((d) => d.note === "missedMars")) lessons.push("Some storms that hit Earth missed Mars, because the planets were in different spots around the Sun.");
  if (S.science < SCIENCE_GOAL) lessons.push(`Science sent home: <b>${r1(S.science)}</b> of ${SCIENCE_GOAL}. Remember that data only counts once the radio sends it!`);
  if (S.dust.length) lessons.push("A dust storm cut your solar power, just like the 2018 storm that ended NASA's Opportunity rover. Batteries and reactors help you survive dark days.");
  if (S.shadow.length) lessons.push("Lunar shadows were predictable: charging the battery before the dark is a real Moon-base strategy.");
  if (S.shield >= 6) lessons.push(`You built shielding to <b>${S.shield}/10</b>. Every point cut everyday radiation for the whole rest of the mission: an investment that pays off over time.`);

  const W = S.W;
  const stormList = S.schedule.map((d, i) => ({ ...d, sol: i + 1 })).filter((d) => d.level || d.flare || d.note === "missedMars")
    .map((d) => `<li>Sol ${d.sol} = <b>${prettyDate(d.date)}</b>: ${d.flare ? `${d.flare} flare` : "no big flare"}${d.nsep ? `, ${d.nsep} radiation-storm record${d.nsep > 1 ? "s" : ""}${d.hi ? " (very fast >100 MeV particles)" : ""}` : ""}${d.note === "missedMars" ? " · missed Mars" : ""}${d.extra ? ` · <i>${esc(d.note)}</i>` : ""}</li>`).join("");

  openModal(`
    <div class="center"><div class="stars">${survived ? "⭐".repeat(stars) + "☆".repeat(3 - stars) : "🚀"}</div>
    <h2>${survived ? "Mission complete!" : reasons[fail][0] + " on sol " + S.sol}</h2></div>
    <p>${survived ? `Your crew survived all ${MAX_SOL} sols on ${SITES[S.site].name}! ${stars === 3 ? "Perfect mission: safe crew, low radiation AND great science." : ""}` : reasons[fail][1]}</p>
    <div class="rows">
      <div class="row"><span>⭐</span><span>Crew survived ${MAX_SOL} sols</span><span class="d">${survived ? "✅" : "❌"}</span></div>
      <div class="row"><span>⭐</span><span>Science goal (${SCIENCE_GOAL} data sent home)</span><span class="d">${r1(S.science)} ${survived && S.science >= SCIENCE_GOAL ? "✅" : "❌"}</span></div>
      <div class="row"><span>⭐</span><span>Radiation below 50% of budget</span><span class="d">${r1(S.dose)}% ${survived && S.dose < 50 ? "✅" : "❌"}</span></div>
    </div>
    ${chartSVG()}
    <h3>What you learned</h3><ul class="lessons">${lessons.map((l) => `<li>${l}</li>`).join("")}</ul>
    <h3>☀️ Your space weather was real!</h3>
    <p class="src">Your mission used <b>${esc(W.name)}</b> (${prettyDate(W.days[0][0])} – ${prettyDate(W.days[MAX_SOL - 1][0])}). ${esc(W.blurb)}</p>
    <ul class="src">${stormList || "<li>A quiet Sun: no big flares or radiation storms in these 20 days.</li>"}</ul>
    <p class="src">Check these dates yourself in NASA's space weather database: <a href="https://ccmc.gsfc.nasa.gov/DONKI/" target="_blank" rel="noopener">DONKI</a>.</p>
    <div class="opts">
      <button class="opt" id="again"><b>🔁 Try the same mission again</b><span>Same storms, same events. Can you do better?</span></button>
      <button class="opt" id="newMis"><b>🆕 New mission</b><span>Pick a different place, storm period or cargo.</span></button>
    </div>`, () => {
    $("#again").onclick = () => { closeModal(); setupFromState(); newGame(S.seed); };
    $("#newMis").onclick = () => { closeModal(); showScreen("title"); };
  });
}
function setupFromState() { setup.site = S.site; setup.cargo = new Set(S.cargo); if (setup.wx === "random") setup.wx = "a" + window.DONKI_ARCHIVE.indexOf(S.W); }

function chartSVG() {
  const H = S.history; if (H.length < 2) return "";
  const w = 560, h = 180, px = (i) => 30 + (i / (MAX_SOL - 1)) * (w - 40), py = (v, m) => h - 20 - (clamp(v, 0, m) / m) * (h - 40);
  const line = (k, m, c) => `<polyline fill="none" stroke="${c}" stroke-width="3" points="${H.map((x, i) => `${px(i)},${py(x[k], m)}`).join(" ")}"/>`;
  const storms = H.map((x, i) => x.storm ? `<g><line x1="${px(i)}" x2="${px(i)}" y1="16" y2="${h - 20}" stroke="#c78bff" stroke-dasharray="3 3"/><text x="${px(i)}" y="14" font-size="12" text-anchor="middle">${x.sheltered ? "🏠" : "⚡"}</text></g>` : "").join("");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Chart of air, food and radiation over the mission">
    <line x1="30" x2="${w - 10}" y1="${h - 20}" y2="${h - 20}" stroke="#2c376a"/>${storms}
    ${line("air", 100, "#5ec8ff")}${line("food", 120, "#7ee07e")}${line("dose", 100, "#c78bff")}
    <text x="30" y="${h - 4}" font-size="12" fill="#a9b3d6">Sol 1</text><text x="${w - 10}" y="${h - 4}" font-size="12" fill="#a9b3d6" text-anchor="end">Sol ${MAX_SOL}</text>
    <text x="${w / 2}" y="${h - 4}" font-size="12" text-anchor="middle"><tspan fill="#5ec8ff">■ air</tspan> <tspan fill="#7ee07e">■ food</tspan> <tspan fill="#c78bff">■ radiation</tspan> <tspan fill="#a9b3d6">⚡/🏠 storm</tspan></text></svg>`;
}

/* ================= modals ================= */
let modalOnClose = null;
function openModal(html, bind) {
  const root = $("#modalRoot");
  root.innerHTML = `<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true"><button class="speak" id="speakBtn" aria-label="Read this out loud">🔊 Read to me</button>${html}</div></div>`;
  $("#speakBtn").onclick = () => speak(root.querySelector(".modal").innerText.replace("🔊 Read to me", ""));
  bindTerms(root);
  if (bind) bind();
  const first = root.querySelector(".modal button:not(.speak)"); if (first) first.focus();
}
function closeModal() { $("#modalRoot").innerHTML = ""; try { speechSynthesis.cancel(); } catch (e) { } }
function toastModal(title, body) {
  openModal(`<h2>${title}</h2><p>${body}</p><p class="center"><button class="big-btn" id="okBtn">OK</button></p>`, () => { $("#okBtn").onclick = closeModal; });
}
function bindTerms(root) {
  root.querySelectorAll(".term[data-term]").forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const k = b.dataset.term;
    const pop = document.createElement("div");
    pop.className = "modal-bg"; pop.style.zIndex = 60;
    pop.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h2>📖 Word helper</h2><p>${GLOSSARY[k]}</p><p class="center"><button class="big-btn">Got it!</button></p></div>`;
    pop.querySelector(".big-btn").onclick = () => pop.remove();
    pop.onclick = (ev) => { if (ev.target === pop) pop.remove(); };
    document.body.appendChild(pop); pop.querySelector(".big-btn").focus();
  });
}

function showHelp() {
  openModal(`<div class="big-ic">🧑‍🚀</div><h2>How to be a great Commander</h2>
    <p>Each <button class="term" data-term="sol">sol</button> you get some <b>⚡ power cells</b>. Use <b>+</b> and <b>−</b> to give them to your systems. <b>There's never enough for everything.</b> That's the real challenge of living in space!</p>
    <div class="rows">
      <div class="row"><span>🫁</span><span><b>Air</b>: your crew breathes ${AIR_USE} every sol. Each ⚡ makes ${AIR_PER_CELL}. Never let it hit zero!</span><span></span></div>
      <div class="row"><span>🌱</span><span><b>Greenhouse</b>: food you plant today is ready in ${GROW_SOLS} sols. Plan ahead!</span><span></span></div>
      <div class="row"><span>☢️</span><span><b>Radiation</b> adds up every sol. Build 🛡️ shielding, and hide in the 🏠 shelter when a storm is coming.</span><span></span></div>
      <div class="row"><span>📡</span><span><b>Radio</b> lets you hear Earth's storm warnings and send your 🔬 science home.</span><span></span></div>
      <div class="row"><span>🔋</span><span>Unused ⚡ charges your battery for tomorrow.</span><span></span></div>
    </div>
    <div class="fact">☀️ <b>The space weather is real.</b> Every solar flare and radiation storm comes from NASA's DONKI database. Each sol of your mission is one real day on the Sun.</div>
    <p class="center" style="margin-top:14px"><button class="big-btn" id="okHelp">Let's go!</button></p>`, () => { $("#okHelp").onclick = closeModal; });
}

function showAbout() {
  const live = DATA.liveStatus === "ok" ? `✅ Connected live to <b>${esc(DATA.liveSource)}</b> right now.` : DATA.liveStatus === "loading" ? "Connecting…" : "❌ Live connection unavailable right now; the game uses its embedded NASA archive.";
  openModal(`<div class="big-ic">📊</div><h2>The real NASA data in this game</h2>
    <h3>☀️ Space weather: NASA DONKI</h3>
    <p class="src">The Space Weather Database Of Notifications, Knowledge, Information (DONKI) is run by NASA's Community Coordinated Modeling Center. We use its <b>solar flare (FLR)</b> and <b>solar energetic particle (SEP)</b> records. Each mission sol = one real day. A day with SEP records = a radiation storm in the game. Flares and rising particle levels give storm warnings, so you'll get some false alarms, just like real forecasters. ${live}</p>
    <p class="src">The 10 historic storm periods were downloaded from DONKI on Nov 14, 2026 and are stored in the game (labelled "archive", never shown as live). Two Mars-only storms come from NASA reports of Curiosity's RAD instrument (Sept 2017, May 2024).</p>
    <h3>🪐 Where the planets were</h3>
    <p class="src">For Mars missions we calculate the approximate real positions of Earth and Mars on your mission's dates. That sets the radio delay, whether storms seen from Earth also reach Mars, and solar conjunction blackouts.</p>
    <h3>☢️ Radiation numbers</h3>
    <p class="src">Everyday radiation on the Moon is set to about 2× Mars, matching real measurements: ~1.37 mSv/day on the Moon (Chang'e-4 LND, 2020) vs ~0.64 mSv/day on Mars (Curiosity RAD, 2014). Mars' thin air blocks more storm particles than the airless Moon. The mission "radiation budget" is a game scale: the <i>ratios</i> are real, the totals are sped up so you can see choices matter in 20 sols.</p>
    <h3>🫁 Life support & 🌱 food</h3>
    <p class="src">Crew needs are based on NASA's Life Support Baseline Values (≈0.84 kg O₂ per person per day). Growing time, power costs and amounts are simplified for play. Facts cite NASA Veggie, MOXIE, the Twins Study, OSDR (osdr.nasa.gov), LRO and Opportunity.</p>
    <h3>📷 Photos</h3><p class="src">Perseverance Mastcam-Z panorama of Jezero Crater (PIA24264) and LRO south pole mosaic (PIA13523), from images.nasa.gov.</p>
    <p class="center"><button class="big-btn" id="okAbout">Close</button></p>`, () => { $("#okAbout").onclick = closeModal; });
}

function showScreen(id) { $("#title").classList.toggle("hidden", id !== "title"); $("#game").classList.toggle("hidden", id !== "game"); window.scrollTo(0, 0); if (id === "title") renderTitle(); }

/* ================= boot ================= */
$("#launchBtn").onclick = () => {
  const used = [...setup.cargo].reduce((a, id) => a + CARGO.find((c) => c.id === id).cost, 0);
  if (used === 0) return toastModal("📦 Empty lander?", "Pick at least one thing to pack!");
  newGame();
};
["#howBtn", "#howBtn2"].forEach((s) => $(s).onclick = showHelp);
["#aboutBtn", "#aboutBtn2"].forEach((s) => $(s).onclick = showAbout);
$("#quitBtn").onclick = () => openModal(`<h2>Leave this mission?</h2><p>Your progress on this mission will be lost.</p><div class="opts"><button class="opt" id="qy"><b>Yes, back to the main menu</b></button><button class="opt" id="qn"><b>No, keep playing</b></button></div>`, () => { $("#qy").onclick = () => { closeModal(); showScreen("title"); }; $("#qn").onclick = closeModal; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { const pops = document.querySelectorAll("body > .modal-bg"); if (pops.length) pops[pops.length - 1].remove(); } });

renderTitle();
renderLiveSun();
loadLive().then(() => { renderLiveSun(); if (!$("#title").classList.contains("hidden")) renderTitle(); });
