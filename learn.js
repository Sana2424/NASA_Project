/* Mission Control: Space Today
   Every panel reads real NASA data. Live panels call NASA services straight from the browser;
   JPL Horizons and OSDR block browser calls, so their data is saved in /data and labelled that way. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => iso(new Date(Date.now() - n * 864e5));
  const nice = (s, withTime) => {
    const d = new Date(s);
    if (isNaN(d)) return esc(s);
    return d.toLocaleDateString(undefined, withTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", year: "numeric" });
  };
  async function getJSON(url, ms = 12000) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const txt = await r.text();
      return txt.trim() ? JSON.parse(txt) : [];
    } finally { clearTimeout(t); }
  }
  const DONKI = (type, from, to, extra = "") => `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/${type}?startDate=${from}&endDate=${to}${extra}`;
  const fail = (id, msg) => { $(id).innerHTML = `<p class="mc-fail">${msg || "NASA's service didn't answer right now. Try again in a few minutes."}</p>`; };
  const score = (c) => ({ C: 0.1, M: 1, X: 10 }[(c || "")[0]] || 0) * (parseFloat((c || "").slice(1)) || 1);

  /* ---------- 1. The Sun this week (DONKI FLR + SEP + CME) ---------- */
  async function sun() {
    const from = daysAgo(6), to = daysAgo(0);
    try {
      const [flr, sep, cme] = await Promise.all([getJSON(DONKI("FLR", from, to)), getJSON(DONKI("SEP", from, to)), getJSON(DONKI("CME", from, to)).catch(() => [])]);
      const big = flr.filter((f) => /^[MX]/.test(f.classType || ""));
      const top = big.reduce((b, f) => (score(f.classType) > score(b) ? f.classType : b), "");
      const xCount = big.filter((f) => f.classType[0] === "X").length;
      const status = sep.length ? ["storm", "Radiation storm!", "Astronauts would head for the storm shelter."]
        : xCount ? ["hot", "Very active", "Huge X-class flares this week."]
        : big.length ? ["warm", "Active", "Some medium (M-class) flares this week."]
        : ["calm", "Calm", "A quiet week: good for spacewalks."];
      const bars = Array.from({ length: 7 }, (_, i) => {
        const d = daysAgo(6 - i);
        const day = flr.filter((f) => (f.peakTime || f.beginTime || "").startsWith(d));
        const mx = day.reduce((b, f) => (score(f.classType) > score(b) ? f.classType : b), "");
        const h = mx ? Math.min(100, 18 + Math.log10(score(mx) * 10 + 1) * 34) : 6;
        const cls = mx[0] === "X" ? "x" : mx[0] === "M" ? "m" : mx ? "c" : "n";
        const lbl = new Date(d + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
        return `<div class="mc-bar"><i class="${cls}" style="height:${h}%" title="${esc(d)}: ${esc(mx || "no big flare")}"></i><span>${lbl}</span><b>${esc(mx || "")}</b></div>`;
      }).join("");
      $("mcSun").innerHTML = `
        <div class="mc-status ${status[0]}"><span class="dot"></span><div><b>${status[1]}</b><small>${status[2]}</small></div></div>
        <div class="mc-stats">
          <div><b>${big.length}</b><span>big flares</span></div>
          <div><b>${esc(top || "–")}</b><span>largest</span></div>
          <div><b>${cme.length}</b><span>eruptions (CMEs)</span></div>
          <div><b>${sep.length}</b><span>radiation storms</span></div>
        </div>
        <div class="mc-bars" aria-label="Biggest flare each day this week">${bars}</div>
        <p class="mc-key"><i class="m"></i> M-class (medium) <i class="x"></i> X-class (huge)</p>`;
    } catch (e) { fail("mcSun"); }
  }

  /* ---------- 2. Eruptions on the move (DONKI WSA-ENLIL model) ---------- */
  const PLACE = {
    "Earth": "🌍 Earth", "Mars": "🔴 Mars", "STEREO A": "🛰️ STEREO-A, a Sun-watching spacecraft",
    "Europa Clipper": "🛰️ Europa Clipper, on its way to Jupiter", "Parker Solar Probe": "☀️ Parker Solar Probe, which flies closest to the Sun",
    "OSIRIS-APEX": "🛰️ OSIRIS-APEX, on its way to an asteroid", "Psyche": "🛰️ Psyche, on its way to a metal asteroid",
    "Lucy": "🛰️ Lucy, exploring Jupiter's asteroids", "Juno": "🪐 Juno at Jupiter", "Solar Orbiter": "☀️ Solar Orbiter",
    "BepiColombo": "🛰️ BepiColombo, on its way to Mercury", "Messenger": "🛰️ Messenger", "Dawn": "🛰️ Dawn",
  };
  async function eruptions() {
    try {
      const sims = await getJSON(DONKI("WSAEnlilSimulations", daysAgo(10), daysAgo(0)));
      const latest = {};
      sims.forEach((s) => (s.impactList || []).forEach((im) => {
        const key = im.location;
        if (!latest[key] || (s.modelCompletionTime || "") > latest[key].run) latest[key] = { where: key, at: im.arrivalTime, glance: im.isGlancingBlow, run: s.modelCompletionTime, speed: (s.cmeInputs || [])[0] && s.cmeInputs[0].speed };
      }));
      (sims.length ? sims : []).forEach((s) => { if (s.estimatedShockArrivalTime) { const k = "Earth"; if (!latest[k] || s.modelCompletionTime > latest[k].run) latest[k] = { where: k, at: s.estimatedShockArrivalTime, glance: false, run: s.modelCompletionTime, speed: (s.cmeInputs || [])[0] && s.cmeInputs[0].speed }; } });
      const list = Object.values(latest).sort((a, b) => (a.at > b.at ? -1 : 1)).slice(0, 4);
      const now = new Date().toISOString();
      $("mcEnlil").innerHTML = list.length ? `<ul class="mc-list">${list.map((x) => `
        <li class="${x.where === "Mars" ? "mars" : ""}">
          <div><b>${esc(PLACE[x.where] || "🛰️ " + x.where)}</b>
          <small>${x.glance ? "A side swipe" : "A direct hit"}${x.speed ? ` · launched at ${Math.round(x.speed).toLocaleString()} km/s` : ""}</small></div>
          <span class="mc-when ${x.at > now ? "upcoming" : ""}">${x.at > now ? "arrives" : "arrived"}<br><b>${nice(x.at, true)}</b></span>
        </li>`).join("")}</ul>
        <p class="mc-note">${list.some((x) => x.where === "Mars") ? "🔴 One is heading for Mars! A Mars crew would get ready to shelter." : "None of these are aimed at Mars, so a Mars crew would be safe from them."}</p>`
        : `<p class="mc-empty">No solar eruptions are predicted to hit planets or spacecraft in the last 10 days.</p>`;
    } catch (e) { fail("mcEnlil"); }
  }

  /* ---------- 3. Latest alert from NASA forecasters (DONKI notifications) ---------- */
  const TYPE = {
    FLR: ["☀️", "Solar flare", "A sudden, super-bright flash of energy on the Sun."],
    SEP: ["☢️", "Radiation storm", "Super-fast particles from the Sun are racing through space. Astronauts take shelter!"],
    CME: ["💥", "Solar eruption (CME)", "The Sun threw a giant cloud of hot gas into space. Forecasters are working out where it will go."],
    GST: ["🌌", "Geomagnetic storm", "Solar gas hit Earth's magnetic field. Look out for auroras!"],
    IPS: ["🌊", "Shock wave in space", "A wave of solar wind just swept past a spacecraft."],
    RBE: ["🔋", "Earth's radiation belts boosted", "The zones of radiation around Earth got stronger. Satellites there can be affected."],
    HSS: ["💨", "Fast solar wind", "A stream of extra-fast solar wind is blowing past Earth."],
    MPC: ["🛡️", "Earth's magnetic shield squeezed", "Solar wind pushed Earth's magnetic shield inward."],
    Report: ["📋", "Weekly space weather report", "NASA's team summed up everything the Sun did this week."]
  };
  async function alerts() {
    try {
      const msgs = await getJSON(DONKI("notifications", daysAgo(7), daysAgo(0), "&type=all"));
      msgs.sort((a, b) => (a.messageIssueTime > b.messageIssueTime ? -1 : 1));
      if (!msgs.length) { $("mcAlert").innerHTML = `<p class="mc-empty">No alerts from NASA's space weather team in the last 7 days.</p>`; return; }
      const m = msgs[0], t = TYPE[m.messageType] || ["📡", m.messageType, "A new message from NASA's space weather team."];
      const body = m.messageBody || "";
      let summary = (body.split(/##\s*Summary:/i)[1] || body).split(/\n##|Activity ID|NOTES?:/i)[0].replace(/\s+/g, " ").trim();
      const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary];
      summary = sentences.slice(0, 2).join(" ").slice(0, 320);
      const others = msgs.slice(1, 4).map((x) => { const tt = TYPE[x.messageType] || ["📡", x.messageType]; return `<li>${tt[0]} ${esc(tt[1])} <small>${nice(x.messageIssueTime, true)}</small></li>`; }).join("");
      $("mcAlert").innerHTML = `
        <div class="mc-alert-head"><span class="big">${t[0]}</span><div><b>${esc(t[1])}</b><small>Sent ${nice(m.messageIssueTime, true)}</small></div></div>
        <p class="mc-kid">${esc(t[2] || "")}</p>
        <blockquote><span>What the forecaster wrote:</span> "${esc(summary)}"</blockquote>
        <a class="mc-link" href="${esc(m.messageURL)}" target="_blank" rel="noopener">Read the real alert ↗</a>
        ${others ? `<p class="mc-sub">Earlier this week (${msgs.length} alerts in total):</p><ul class="mc-mini">${others}</ul>` : ""}`;
    } catch (e) { fail("mcAlert"); }
  }

  /* ---------- 4. Weather on Mars (Curiosity REMS) ---------- */
  async function marsWeather() {
    try {
      const data = await getJSON("https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json", 20000);
      const s = (data.soles || []).find((x) => x.min_temp !== "--" && x.max_temp !== "--");
      if (!s) throw new Error("no data");
      const pa = Number(s.pressure);
      $("mcMars").innerHTML = `
        <p class="mc-sub">Sol ${esc(s.sol)} at Gale Crater · ${nice(s.terrestrial_date + "T12:00:00Z")}</p>
        <div class="mc-temps"><div><span>Day high</span><b>${esc(s.max_temp)}°C</b></div><div><span>Night low</span><b class="cold">${esc(s.min_temp)}°C</b></div></div>
        <ul class="mc-facts">
          <li>🌅 Sunrise ${esc(s.sunrise)} · Sunset ${esc(s.sunset)}</li>
          <li>☁️ Sky: ${esc(s.atmo_opacity || "–")}</li>
          ${pa ? `<li>🎈 Air pressure ${pa.toLocaleString()} Pa, under 1% of Earth's (101,325 Pa)</li>` : ""}
        </ul>
        <p class="mc-note">${Number(s.min_temp) < -60 ? "Colder than almost anywhere on Earth: an outpost needs heaters running all night." : "Still freezing at night: heaters stay on."}</p>`;
    } catch (e) { fail("mcMars"); }
  }

  /* ---------- 5. Newest photo from Mars (Perseverance raw images) ---------- */
  async function marsPhoto() {
    try {
      const data = await getJSON("https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=50&page=0");
      const imgs = data.images || [];
      const pick = imgs.find((i) => /^MCZ/.test(i.camera && i.camera.instrument) && i.sample_type === "Full") || imgs[0];
      if (!pick) throw new Error("no image");
      const src = pick.image_files.large || pick.image_files.medium;
      const cam = (pick.camera && pick.camera.instrument || "").startsWith("MCZ") ? "Mastcam-Z, the rover's zoom 'eyes'" : (pick.camera && pick.camera.instrument) || "camera";
      $("mcPhoto").innerHTML = `
        <a href="https://mars.nasa.gov/mars2020/multimedia/raw-images/${esc(pick.imageid)}" target="_blank" rel="noopener" class="mc-photo"><img src="${esc(src)}" alt="Raw image from NASA's Perseverance rover on Mars, sol ${esc(pick.sol)}" loading="lazy"></a>
        <p class="mc-sub">Sol ${esc(pick.sol)} · ${nice(pick.date_taken_utc)} · ${esc(cam)}</p>
        <p class="mc-note">This is a raw image, straight from Mars and not cleaned up yet.</p>`;
    } catch (e) { fail("mcPhoto"); }
  }

  /* ---------- 6. How far is Mars today? (JPL Horizons, saved table) ---------- */
  function distance() {
    const rows = window.HORIZONS_MARS || [];
    const today = iso(new Date());
    const r = rows.find((x) => x[0] === today);
    if (!r) { fail("mcDist", "The saved JPL Horizons table doesn't cover today's date yet."); return; }
    const km = r[1] * 149597870.7, min = (r[1] * 499.004784) / 60;
    const close = rows.reduce((b, x) => (x[1] < b[1] ? x : b), rows[0]);
    const daysTo = Math.round((Date.parse(close[0]) - Date.parse(today)) / 864e5);
    const pct = Math.max(4, Math.min(100, (r[1] / 2.7) * 100));
    $("mcDist").innerHTML = `
      <div class="mc-big"><b>${Math.round(km / 1e6).toLocaleString()} million km</b><span>from Earth today</span></div>
      <div class="mc-track" aria-hidden="true"><span>🌍</span><i style="width:${pct}%"></i><span>🔴</span></div>
      <ul class="mc-facts">
        <li>📡 A radio message takes <b>${min.toFixed(1)} minutes</b> to get there</li>
        <li>⏳ Asking a question and getting an answer: <b>${(min * 2).toFixed(0)} minutes</b></li>
        ${daysTo > 0 ? `<li>🔭 Closest to Earth on <b>${nice(close[0] + "T12:00:00Z")}</b>, in ${daysTo} days (${(close[1] * 149.6).toFixed(0)} million km)</li>` : ""}
      </ul>
      ${chart(rows, r, close)}`;
  }
  function chart(rows, r, close) {
    const W = 640, H = 170, L = 44, R = 12, T = 14, B = 30;
    const maxA = Math.max(...rows.map((x) => x[1])), minA = 0;
    const X = (i) => L + (i / (rows.length - 1)) * (W - L - R);
    const Y = (a) => T + (1 - (a - minA) / (maxA - minA)) * (H - T - B);
    const pts = rows.map((x, i) => `${X(i).toFixed(1)},${Y(x[1]).toFixed(1)}`).join(" ");
    const iT = rows.indexOf(r), iC = rows.indexOf(close);
    const mk = (s) => new Date(s + "T12:00:00Z").toLocaleDateString(undefined, { month: "short", year: "2-digit", timeZone: "UTC" });
    const ticks = rows.map((x, i) => [x, i]).filter(([x]) => x[0].endsWith("-01") && (x[0].slice(5, 7) % 3 === 1)).map(([x, i]) => `<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${H - B}" class="g"/><text x="${X(i)}" y="${H - 10}" text-anchor="middle">${mk(x[0])}</text>`).join("");
    const ys = [0, 100, 200, 300].filter((m) => m <= maxA * 149.6).map((m) => `<text x="${L - 6}" y="${Y(m / 149.6) + 4}" text-anchor="end">${m}</text>`).join("");
    return `<figure class="mc-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Earth to Mars distance from ${rows[0][0]} to ${rows[rows.length - 1][0]}, closest on ${close[0]}">
      ${ticks}${ys}
      <polyline points="${pts}" fill="none" stroke="#b69bff" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="${X(iC)}" cy="${Y(close[1])}" r="6" fill="#ff6b3d"/><text x="${X(iC)}" y="${Y(close[1]) + 22}" text-anchor="middle" class="hl">closest</text>
      <circle cx="${X(iT)}" cy="${Y(r[1])}" r="7" fill="#ffcf4a" stroke="#1a1440" stroke-width="2"/><text x="${X(iT) + 10}" y="${Y(r[1]) - 10}" class="hl">today</text>
    </svg><figcaption>Distance in millions of km, every day until 2028 (NASA JPL Horizons)</figcaption></figure>`;
  }

  /* ---------- 7. Earth from a million miles (EPIC) ---------- */
  async function epic() {
    try {
      const list = await getJSON("https://epic.gsfc.nasa.gov/api/natural");
      if (!list.length) throw new Error("none");
      const p = list[Math.floor(list.length / 2)];
      const [d] = p.date.split(" "), [y, m, dd] = d.split("-");
      const src = `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${dd}/jpg/${p.image}.jpg`;
      $("mcEpic").innerHTML = `
        <a class="mc-earth" href="https://epic.gsfc.nasa.gov/" target="_blank" rel="noopener"><img src="${esc(src)}" alt="Photo of the whole Earth taken by NASA's EPIC camera on ${esc(d)}" loading="lazy"></a>
        <p class="mc-sub">${nice(p.date.replace(" ", "T") + "Z", true)} UTC · DSCOVR spacecraft, 1.5 million km away</p>
        <p class="mc-note">From Mars, this whole planet would look like a bright blue star.</p>`;
    } catch (e) { fail("mcEpic"); }
  }

  /* ---------- 8. Real space biology (OSDR, saved) ---------- */
  function biology() {
    const cards = window.OSDR_CARDS || [];
    $("mcBio").innerHTML = cards.map((c) => `
      <article class="bio">
        <div class="bio-top"><span class="bio-ic">${c.ic}</span><span class="chip">${esc(c.topic)}</span></div>
        <h4>${esc(c.title)}</h4>
        <p>${esc(c.kid)}</p>
        <a href="https://osdr.nasa.gov/bio/repo/data/studies/${esc(c.id)}" target="_blank" rel="noopener" title="${esc(c.official)}">NASA study ${esc(c.id)} ↗</a>
      </article>`).join("");
  }

  function start() {
    distance(); biology();
    sun(); eruptions(); alerts(); marsWeather(); marsPhoto(); epic();
    $("mcUpdated").textContent = new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  // Load when the dashboard comes into view, so the top of the page stays fast.
  const sec = document.getElementById("science");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: "600px" });
    io.observe(sec);
  } else start();
  const rb = $("mcRefresh"); if (rb) rb.addEventListener("click", () => { ["mcSun", "mcEnlil", "mcAlert", "mcMars", "mcPhoto", "mcEpic"].forEach((id) => ($(id).innerHTML = '<p class="mc-loading">Asking NASA…</p>')); start(); });
})();
