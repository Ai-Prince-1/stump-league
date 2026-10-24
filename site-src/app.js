/* ===== Stump League — app =====
   Stats, not standings: five KPIs per candidate, peer-relative category labels, no overall grade.
   A ranking appears only when a voter asks for one, using only stats every candidate in the race has. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sl2:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("sl2:" + k, JSON.stringify(v)); } catch (e) {} }
  };
  const REPO_URL = "https://github.com/Ai-Prince-1/stump-league";
  const ASOF = typeof DATA_AS_OF !== "undefined" ? DATA_AS_OF : AS_OF;

  const SRC_IDS = Object.keys(SOURCES);
  const srcNum = (id) => SRC_IDS.indexOf(id) + 1;
  function sup(id) {
    if (!id || !SOURCES[id]) return "";
    const s = SOURCES[id];
    return `<a class="sup" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.pub + " — " + s.title + " (" + s.date + ")")}">[${srcNum(id)}]</a>`;
  }
  const sups = (o) => (o ? sup(o.src) + sup(o.src2) : "");

  /* ---------- races ---------- */
  const LEVELS = { congress: ["Arkansas · Congress", 1], statewide: ["Arkansas · Statewide offices", 2], issues: ["Arkansas · Ballot issues", 3], "state-senate": ["Arkansas · State Senate", 4], "state-house": ["Arkansas · State House", 5], pilot: ["Other pilot races", 6] };
  if (typeof AR_RACES !== "undefined") {
    const congressOrder = ["ar-sen", "ar1", "ar2", "ar3", "ar4"];
    const all = RACES.concat(AR_RACES);
    const key = (r) => [LEVELS[r.level || "pilot"][1], r.level === "congress" ? congressOrder.indexOf(r.id) : 0, parseInt((r.short.match(/\d+/) || [0])[0], 10) + (/SPECIAL/.test(r.short) ? 0.5 : 0)];
    all.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
    RACES.length = 0; RACES.push(...all);
  }
  const RACE = (id) => RACES.find((r) => r.id === id);
  const AR = RACES.filter((r) => r.state === "Arkansas");
  const AR_CONTESTED = AR.filter((r) => !r.issues);
  const AR_CANDS = AR_CONTESTED.reduce((a, r) => a + r.candidates.length, 0);
  const UNOPP_N = typeof AR_UNOPPOSED !== "undefined" ? Object.values(AR_UNOPPOSED).reduce((a, v) => a + v.length, 0) : 0;
  const lastName = (n) => n.replace(/ (Jr\.|Sr\.|II|III)$/, "").split(" ").pop();

  /* ---------- stats ---------- */
  const statFor = (c, key) => (c.kpi && c.kpi[key]) || { status: "pending" };
  const BADGE = { official: ["o", "Official record"], draft: ["d", "Draft"], pending: ["p", "Not collected yet"], na: ["na", "Doesn't apply"], sample: ["s", "Sample"] };
  const scored = (st, incDraft) => typeof st.norm === "number" && (st.status === "official" || st.status === "sample" || (incDraft && st.status === "draft"));
  function leader(st) {
    if (typeof st.pct !== "number") return "";
    const band = LEADER_BANDS.find(([t]) => st.pct >= t)[1];
    return `<span class="leader">${band}</span> <small>of ${esc(st.peer || "peers")}</small>`;
  }

  /* ---------- ranking state ---------- */
  const DEFAULT_ON = Object.fromEntries(STATS.map((s) => [s.key, !!s.defaultOn]));
  let on = Object.assign({}, DEFAULT_ON, store.get("on", {}));
  let weights = Object.assign(Object.fromEntries(STATS.map((s) => [s.key, 5])), store.get("weights", {}));
  let incDraft = store.get("incdraft", false);
  let showRank = false;
  let raceId = store.get("race", "ar3");
  if (!RACE(raceId)) raceId = "ar3";

  function yourRanking(race) {
    const cands = race.candidates.map((id) => [id, CANDS[id]]);
    const shared = STATS.filter((s) => on[s.key] && weights[s.key] > 0 && cands.every(([, c]) => scored(statFor(c, s.key), incDraft)));
    if (!shared.length) return { shared, rows: null };
    const rows = cands.map(([id, c]) => {
      let sw = 0, sv = 0;
      shared.forEach((s) => { sw += weights[s.key]; sv += weights[s.key] * statFor(c, s.key).norm; });
      return { id, c, score: sv / sw };
    }).sort((a, b) => b.score - a.score);
    return { shared, rows };
  }
  window.__sl = { yourRanking, statFor };

  /* ---------- routing: handle clicks directly so tabs work in every host ---------- */
  const VIEWS = ["scout", "races", "h2h", "learn", "play", "method", "about"];
  let current = "scout";
  function show(view, scroll = true) {
    if (!VIEWS.includes(view)) view = "scout";
    current = view;
    $$("section[data-view]").forEach((s) => (s.hidden = s.dataset.view !== view));
    $$("nav.tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === view ? "page" : "false"));
    if (view === "races") renderRaces();
    if (view === "h2h") renderH2H();
    if (view === "play") renderPlay();
    if (scroll) window.scrollTo({ top: 0 });
  }
  function go(view) {
    show(view);
    try { if (location.hash.slice(1) !== view) history.replaceState(null, "", "#" + view); } catch (e) {}
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-tab]");
    if (!a) return;
    e.preventDefault(); go(a.dataset.tab);
  });
  window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== current) show(v); });

  /* ---------- scout ---------- */
  const STATE_NAMES = { AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",PR:"Puerto Rico" };
  const ZIPIDX = {};
  Object.entries(ZIPS).forEach(([st, str]) => str.split(",").forEach((e) => { const [z, d] = e.split(":"); (ZIPIDX[z] = ZIPIDX[z] || []).push([st, d.split(".")]); }));
  const ord = (n) => { n = +n; if (n === 0) return "At-large"; const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  function lookup(zip) {
    const out = { where: "", pilot: [], other: [] };
    if (!/^\d{5}$/.test(zip)) { out.where = "Enter a 5-digit ZIP code."; return out; }
    const hits = ZIPIDX[zip];
    if (!hits) { out.where = "ZIP " + zip + " isn't in the Census ZIP table (it may be a PO box or business ZIP). Try your home ZIP."; return out; }
    hits.forEach(([st, cds]) => {
      const name = STATE_NAMES[st] || st;
      const dists = cds.map((d) => (d === "0" ? "at-large" : ord(d))).join(" or ");
      out.where = name + " · ZIP " + zip + " · " + (cds.length > 1 ? "this ZIP spans the " + dists + " districts; confirm with your county clerk" : (cds[0] === "0" ? "at-large district" : ord(cds[0]) + " Congressional District"));
      if (st === "AR") {
        out.state = "AR";
        out.pilot.push("ar-sen");
        cds.forEach((d) => { if (RACE("ar" + d)) out.pilot.push("ar" + d); });
        out.pilot.push("ar-gov", "ar-ltgov", "ar-sos", "ar-lands", "ar-issues");
        out.other.push(["Arkansas legislature", "Your state House and Senate districts don't follow ZIP codes. Every contested legislative race is listed below; find your district with Voter View on the Secretary of State's site."]);
        return;
      }
      if (st === "OH") out.pilot.push("ohgov");
      cds.forEach((d) => out.other.push(["U.S. House · " + name + " " + (d === "0" ? "at-large" : ord(d) + " District"), "Not in the prototype yet"]));
      out.other.push(["Statewide races · " + name, "Senate, governor and other statewide races where on the ballot · not in the prototype yet"]);
    });
    return out;
  }
  function renderBallot(zip) {
    const r = lookup(zip);
    $("#ballot-where").textContent = r.where;
    const items = r.pilot.map((id) => {
      const race = RACE(id);
      const n = race.issues ? race.issues.length + " issues" : race.candidates.length + " candidates";
      return `<a class="ballot-item" href="#races" data-race="${id}"><span class="code">${esc(race.short)}</span><span><b>${esc(race.name)}</b><br><span class="dim" style="font-size:13.5px">${n} · ${esc(race.blurb)}</span></span><span class="btn small">Open</span></a>`;
    });
    r.other.forEach(([t, s]) => items.push(`<div class="ballot-item off"><span class="code">—</span><span><b>${esc(t)}</b><br><span class="dim" style="font-size:13.5px">${esc(s)}</span></span><span></span></div>`));
    items.push(`<a class="ballot-item" href="#races" data-race="demo"><span class="code">DEMO</span><span><b>See a race with every stat filled in</b><br><span class="dim" style="font-size:13.5px">An invented sample, labeled Sample everywhere</span></span><span class="btn small">Open</span></a>`);
    $("#ballot").innerHTML = items.join("");
    $("#arkansas").hidden = r.state !== "AR";
    if (r.state === "AR") renderArkansas();
  }
  function renderArkansas() {
    $("#ar-count").textContent = AR_CONTESTED.length + " contested races · " + AR_CANDS + " candidates";
    const groups = {};
    AR.forEach((x) => (groups[x.level] = groups[x.level] || []).push(x));
    $("#ar-list").innerHTML = Object.keys(groups).sort((a, b) => LEVELS[a][1] - LEVELS[b][1]).map((lv) => `<div class="arlevel"><h3>${esc(LEVELS[lv][0].replace("Arkansas · ", ""))} <span class="cov">(${groups[lv].length})</span></h3>` +
      groups[lv].map((x) => {
        const who = x.issues ? x.issues.map((i) => "Issue " + i.n + ": " + i.title).join(" · ") :
          x.candidates.map((id) => { const c = CANDS[id]; return esc(c.name) + " (" + esc(c.party[0]) + ")" + (/Incumbent|since/.test(c.role) ? "*" : ""); }).join(" · ");
        const cov = x.issues ? "Explainer" : x.candidates.map((id) => STATS.filter((s) => statFor(CANDS[id], s.key).status === "official").length).reduce((a, b) => a + b, 0) + " official stats";
        return `<a class="arrow" href="#races" data-race="${x.id}"><span class="code">${esc(x.short)}</span><span class="who">${who}</span><span class="cov">${cov}</span></a>`;
      }).join("") + `</div>`).join("") + `<p class="dim" style="font-size:12.5px">* incumbent</p>`;
    $("#ar-unopp-sum").textContent = "The other " + UNOPP_N + " Arkansas seats on the ballot are unopposed";
    $("#ar-unopp-body").innerHTML = `<p class="dim" style="font-size:13px">These candidates face no opponent on Nov 3, so there's no choice to compare. * incumbent</p>` +
      Object.entries(AR_UNOPPOSED).map(([lv, rows]) => `<h3 style="font-size:16px">${esc(lv)} (${rows.length})</h3><div class="unopp">${rows.map(([seat, w]) => `<div><span class="lbl">${esc(seat)}</span><span>${esc(w)}</span></div>`).join("")}</div>`).join("") +
      `<p class="srcs">Sources: ${sup("wiki_arhouse")} ${sup("wiki_arsen")} ${sup("greenpapers_ar")}</p>`;
  }
  $("#zipform").addEventListener("submit", (e) => { e.preventDefault(); renderBallot($("#zip").value.trim()); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-race]");
    if (!a) return;
    e.preventDefault(); setRace(a.dataset.race); go("races");
  });
  $("#kpilist").innerHTML = STATS.map((s) => `<li><b>${esc(s.label)}</b> <small>· ${esc(s.q)} · ${esc(s.who)}</small></li>`).join("");

  /* ---------- race pages ---------- */
  function setRace(id) { raceId = id; store.set("race", id); showRank = false; }
  function raceOptions(sel, filter) {
    const groups = {};
    RACES.filter(filter || (() => true)).forEach((r) => (groups[r.level || "pilot"] = groups[r.level || "pilot"] || []).push(r));
    return Object.keys(groups).sort((a, b) => LEVELS[a][1] - LEVELS[b][1]).map((lv) => `<optgroup label="${esc(LEVELS[lv][0])}">` +
      groups[lv].map((r) => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(r.short)} · ${esc(r.name.replace(/ · Arkansas$/, "").replace(/^Arkansas (House|Senate) · /, ""))}${r.sample ? " (sample)" : ""}</option>`).join("") + `</optgroup>`).join("");
  }
  function renderRacePick() {
    const i = RACES.findIndex((r) => r.id === raceId);
    $("#racepick").innerHTML = `<div class="stack" style="flex:1 1 320px;min-width:0;gap:4px"><label class="lab" for="racesel">Race</label><select class="input" id="racesel">${raceOptions(raceId)}</select></div>
      <button class="btn small" type="button" data-step="-1" ${i <= 0 ? "disabled" : ""}>◀ Previous</button><button class="btn small" type="button" data-step="1" ${i >= RACES.length - 1 ? "disabled" : ""}>Next ▶</button>`;
  }
  $("#racepick").addEventListener("change", (e) => { if (e.target.id === "racesel") { setRace(e.target.value); renderRaces(); } });
  $("#racepick").addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (!b) return; const i = RACES.findIndex((r) => r.id === raceId) + +b.dataset.step; if (RACES[i]) { setRace(RACES[i].id); renderRaces(); } });

  function renderRaceHead(race) {
    const can = race.can.map((t) => `<li>${esc(t)}</li>`).join(""), cant = race.cant.map((t) => `<li>${esc(t)}</li>`).join("");
    const lvl = (LEVELS[race.level || "pilot"] || ["Pilot race"])[0].replace("Arkansas · ", "").replace("Other pilot races", "Pilot race");
    $("#racehead").innerHTML = `
      <div class="racehead">
        <div class="row"><span class="tag">${esc(race.state)}</span>${race.sample ? '<span class="tag sample">Invented sample data</span>' : `<span class="tag">Election ${esc(race.election)}</span><span class="tag">${esc(lvl)}</span>`}</div>
        <h1>${esc(race.name)}</h1>
        <p class="lede">${esc(race.blurb)}</p>
      </div>
      ${race.issues ? `<div class="panel" style="margin-top:16px"><div class="eyebrow">About these explainers</div>${race.context.map((c) => `<p class="ctx">${esc(c.text)} ${sups(c)}</p>`).join("")}<p class="dim" style="font-size:13px">Ballot issues aren't candidates, so nothing here is scored. Each card shows what the measure does, current law, what FOR and AGAINST mean, and one line from each side.</p></div>` : `<div class="twocol" style="margin-top:16px">
        <div class="panel"><div class="eyebrow">What this office can do ${(race.canSrc || []).map(sup).join("")}</div><ul>${can}</ul><div class="eyebrow" style="margin-top:6px">What it can't</div><ul>${cant}</ul></div>
        <div class="panel"><div class="eyebrow">Race context</div>${race.context.map((c) => `<p class="ctx">${esc(c.text)} ${sups(c)}</p>`).join("")}</div>
      </div>`}`;
  }
  function renderIssues(race) {
    $("#issuesbox").innerHTML = race.issues.map((i) => `<article class="issue"><div class="top"><span class="num">${i.n}</span><div><h3>${esc(i.title)}</h3><small>${esc(i.route)}</small></div></div>
      <div class="body"><p>${esc(i.does)}</p><p class="ctx"><b>Current law:</b> ${esc(i.now)}</p>
      <div class="yn"><div><b>Vote FOR</b><span>${esc(i.yes)}</span></div><div><b>Vote AGAINST</b><span>${esc(i.no)}</span></div></div>
      <div class="args"><p>${esc(i.pro)}</p><p>${esc(i.con)}</p></div><p class="srcs">Source: ${sup("uaex_guide")}</p></div></article>`).join("");
  }

  function sheetCell(st) {
    if (st.status === "na") return `<td class="dimcell">—</td>`;
    if (st.status === "pending") return `<td class="dimcell">Not collected yet</td>`;
    const b = BADGE[st.status];
    return `<td>${esc(st.display || "")}${st.status !== "official" ? ` <span class="badge ${b[0]}">${b[1]}</span>` : ""}${typeof st.pct === "number" ? `<br>${leader(st)}` : ""}</td>`;
  }
  function renderSheet(race) {
    const ids = race.candidates.slice().sort((a, b) => lastName(CANDS[a].name).localeCompare(lastName(CANDS[b].name)));
    $("#sheet").innerHTML = `<tr><th>Candidate</th>${STATS.map((s) => `<th>${esc(s.label)}<small>${esc(s.q)}</small></th>`).join("")}</tr>` +
      ids.map((id) => { const c = CANDS[id];
        return `<tr><td><button class="who" type="button" data-card="${id}"><span class="av">${esc(c.initials)}</span><span><b>${esc(c.name)}</b><small>${esc(c.party)} · ${esc(c.role)}</small></span></button></td>${STATS.map((s) => sheetCell(statFor(c, s.key))).join("")}</tr>`; }).join("");
    const official = ids.reduce((a, id) => a + STATS.filter((s) => statFor(CANDS[id], s.key).status === "official").length, 0);
    $("#sheet-note").textContent = race.sample ? "Invented sample" : official + " official stats across " + ids.length + " candidates";
  }
  $("#sheet").addEventListener("click", (e) => { const b = e.target.closest("[data-card]"); if (b) jumpCard(b.dataset.card); });
  function jumpCard(id) { const el = document.getElementById("card-" + id); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }); }

  function renderSliders() {
    $("#sliders").innerHTML = STATS.map((s) => `<div class="sl"><input type="checkbox" id="on-${s.key}" data-on="${s.key}" ${on[s.key] ? "checked" : ""}><label for="on-${s.key}">${esc(s.label)}${s.valueLaden ? ' <span class="vl">values</span>' : ""}</label><output id="o-${s.key}">${weights[s.key]}</output>
      <input type="range" min="0" max="10" step="1" id="w-${s.key}" data-k="${s.key}" value="${weights[s.key]}" aria-label="How much ${esc(s.label)} counts" ${on[s.key] ? "" : "disabled"}></div>`).join("") +
      `<p class="dim" style="font-size:12px"><span class="vl">values</span> = starts switched off because voters disagree about whether it matters.</p>`;
    $("#incdraft").checked = incDraft;
  }
  $("#sliders").addEventListener("input", (e) => {
    const k = e.target.dataset.k, o = e.target.dataset.on;
    if (k) { weights[k] = +e.target.value; $("#o-" + k).textContent = e.target.value; store.set("weights", weights); }
    if (o) { on[o] = e.target.checked; $("#w-" + o).disabled = !on[o]; store.set("on", on); }
    if (showRank) renderRankOut(RACE(raceId));
  });
  $("#incdraft").addEventListener("change", (e) => { incDraft = e.target.checked; store.set("incdraft", incDraft); if (showRank) renderRankOut(RACE(raceId)); });
  $("#reset-w").addEventListener("click", () => { on = Object.assign({}, DEFAULT_ON); weights = Object.fromEntries(STATS.map((s) => [s.key, 5])); store.set("on", on); store.set("weights", weights); renderSliders(); if (showRank) renderRankOut(RACE(raceId)); });
  $("#show-rank").addEventListener("click", () => { showRank = true; renderRankOut(RACE(raceId)); });
  function renderRankOut(race) {
    const { shared, rows } = yourRanking(race);
    if (!rows) {
      $("#rank-out").innerHTML = `<p class="banner">A fair ranking isn't possible yet: these candidates don't share any switched-on stat. ${race.candidates.length > 1 ? "Challengers have no voting record, so only stats like Answers to voters can compare everyone." : ""}</p>`;
      return;
    }
    $("#rank-out").innerHTML = `<div class="eyebrow">Your ranking${race.sample ? " · sample" : ""}</div>` +
      rows.map((r, i) => `<div class="rankrow"><span class="n">${rows.findIndex((x) => Math.round(x.score * 100) === Math.round(r.score * 100)) + 1}${rows.filter((x) => Math.round(x.score * 100) === Math.round(r.score * 100)).length > 1 ? "<small>T</small>" : ""}</span><span><b>${esc(r.c.name)}</b> <small class="dim">${esc(r.c.party)}</small></span><span class="cov">${Math.round(r.score * 100)}</span></div>`).join("") +
      (rows.every((x) => Math.round(x.score * 100) === Math.round(rows[0].score * 100)) ? `<p class="banner">Everyone is tied on the stats you chose, so this ranking doesn't separate them. Names are listed by score, then in ballot order.</p>` : "") +
      `<p class="dim" style="font-size:12.5px">T = tied. Based only on: ${shared.map((s) => esc(s.label)).join(", ")}. This reflects the weights you chose, not an endorsement.</p>`;
  }

  function kpiRow(c, def) {
    const st = statFor(c, def.key);
    const [cls, lab] = BADGE[st.status] || BADGE.pending;
    let main;
    if (st.status === "na") main = esc(st.note || "Doesn't apply");
    else if (st.status === "pending") main = esc(st.note || "Not collected yet");
    else main = esc(st.display || "");
    const parts = st.parts ? `<ul class="parts">${st.parts.map((p) => `<li class="${p.state}"><span class="mk">${{ yes: "✓", no: "✗", pending: "·", na: "–" }[p.state]}</span><span><b>${esc(p.label)}:</b> ${esc(p.value)} ${sups(p)}</span></li>`).join("")}</ul>` : "";
    return `<div class="kpirow ${st.status}"><div class="k">${esc(def.short)}<b>${esc(def.label)}</b><details class="explain"><summary aria-label="What ${esc(def.label)} means">?</summary><p>${esc(def.explain)}</p></details></div>
      <div class="v"><span class="main">${main} <span class="badge ${cls}">${lab}</span> ${st.status === "na" || st.status === "pending" ? "" : sups(st)}</span>
      ${typeof st.pct === "number" ? `<span>${leader(st)}</span>` : ""}${st.sub ? `<small>${esc(st.sub)}</small>` : ""}${st.note && st.status !== "na" && st.status !== "pending" ? `<small>${esc(st.note)}</small>` : ""}${parts}</div></div>`;
  }
  function planHTML(p) {
    const s = p.checks || { m: 0, t: 0, c: 0, p: 0 };
    const chk = [["M", s.m, "Measurable"], ["T", s.t, "Has a timeline"], ["C", s.c, "Says what it costs"], ["P", s.p, "Within the office's power"]]
      .map(([l, v, t]) => `<span class="${v ? "on" : ""}" title="${t}: ${v ? "yes" : "no"}">${l}</span>`).join("");
    const notes = (p.notes || []).map((n) => `<div class="dim" style="font-size:12.5px">↳ ${esc(n.text)} ${sups(n)}</div>`).join("");
    return `<div class="promise"><div>${esc(p.text)} ${sups(p)}</div><div class="st"><span class="checks" aria-label="Checklist">${chk}</span><span class="badge d">Draft checklist</span></div>${notes}</div>`;
  }
  function factcheckHTML(c) {
    if (!c.ids || !c.ids.factcheck || typeof FACTCHECKS === "undefined") return "";
    const list = FACTCHECKS[c.ids.factcheck] || [];
    const body = list.length ? `<div class="fclist">${list.map((r) => `<div><span class="d">${esc(r.d || "undated")}</span><span><b>${esc(r.r)}</b> · ${esc(r.pub)}${r.claim ? ` · <span class="dim">"${esc(r.claim)}"</span>` : ""} ${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Read</a>` : ""}</span></div>`).join("")}</div>`
      : `<p class="dim" style="font-size:13px">No rulings found in the shared fact-check database (ClaimReview).</p>`;
    return `<details class="drawer"><summary>Fact-check rulings (${list.length}) <span class="ctxonly">Listed, never scored</span></summary><div><p class="dim" style="font-size:12.5px">Every ruling the shared fact-check database attributes to this person, newest first. Fact-checkers choose which claims to check, so the count reflects attention as well as accuracy. ${sup("claimreview_src")}</p>${body}</div></details>`;
  }
  function renderCards(race) {
    $("#cards").innerHTML = race.candidates.map((id) => {
      const c = CANDS[id];
      const facts = (c.facts || []).map((f) => `<div><span class="lbl">${esc(f.label)}</span><span>${esc(f.text)} ${sups(f)}</span></div>`).join("");
      const funds = c.funds ? `<details class="drawer"><summary>Funds for the district <span class="ctxonly">Context only · never scored</span></summary><div>
          <div class="funds">${c.funds.items.map((i) => `<div><small>${esc(i.label)}</small><b>${esc(i.value)}</b><small>${esc(i.sub)} ${sups(i)}</small></div>`).join("")}</div>
          ${c.funds.context.map((x) => `<p class="ctx" style="font-size:13px">${esc(x.text)} ${sups(x)}</p>`).join("")}<p class="dim" style="font-size:12.5px">${esc(c.funds.peer)}</p></div></details>` : "";
      const plans = `<details class="drawer"><summary>Plans (${(c.plans || []).length}) <span class="ctxonly">Their words · not scored</span></summary><div>${(c.plans || []).length ? c.plans.map(planHTML).join("") + `<p class="dim" style="font-size:12px">Checklist: M measurable · T has a timeline · C says what it costs · P within the office's power. Drafted with AI help; not yet reviewed.</p>` : `<p class="dim" style="font-size:13px">No plans collected yet. Contributions are welcome through the project's GitHub page.</p>`}</div></details>`;
      return `<article class="pcard" id="card-${id}">
        <div class="top"><span class="av">${esc(c.initials)}</span><div><h3>${esc(c.name)}</h3><small>${esc(c.party)} · ${esc(c.role)}</small></div>${c.sample ? '<span class="badge s">Sample</span>' : ""}</div>
        <div class="body"><div class="statline">${STATS.map((d) => kpiRow(c, d)).join("")}</div>
          <div class="facts">${facts}</div>${funds}${plans}${factcheckHTML(c)}
          <div class="row"><button class="btn small" type="button" data-cmp="${id}">Compare head-to-head</button></div></div></article>`;
    }).join("");
  }
  $("#cards").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cmp]"); if (!b) return;
    h2hState = { race: raceId, a: b.dataset.cmp, b: RACE(raceId).candidates.find((x) => x !== b.dataset.cmp) };
    go("h2h");
  });
  function renderRaces() {
    let race = RACE(raceId);
    if (!race) { raceId = RACES[0].id; race = RACES[0]; }
    renderRacePick(); renderRaceHead(race);
    const isIssues = !!race.issues;
    $("#issuesbox").hidden = !isIssues; $("#rankarea").hidden = isIssues; $("#cardarea").hidden = isIssues;
    if (isIssues) { renderIssues(race); return; }
    renderSheet(race); renderSliders(); renderCards(race);
    $("#rank-out").innerHTML = showRank ? "" : `<p class="dim" style="font-size:12.5px">No ranking is shown until you ask for one.</p>`;
    if (showRank) renderRankOut(race);
  }

  /* ---------- head to head: no winners declared ---------- */
  let h2hState = null;
  function renderH2H() {
    if (!h2hState || !RACE(h2hState.race)) { const r = RACE(raceId) && !RACE(raceId).issues && RACE(raceId).candidates.length > 1 ? RACE(raceId) : RACE("ar3"); h2hState = { race: r.id, a: r.candidates[0], b: r.candidates[1] }; }
    const race = RACE(h2hState.race);
    $("#h2h-race").innerHTML = raceOptions(race.id, (r) => !r.issues && r.candidates.length > 1);
    const opts = (sel) => race.candidates.map((id) => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(CANDS[id].name)} (${esc(CANDS[id].party)})</option>`).join("");
    $("#h2h-a").innerHTML = opts(h2hState.a); $("#h2h-b").innerHTML = opts(h2hState.b);
    const A = CANDS[h2hState.a], B = CANDS[h2hState.b];
    const cell = (st, right) => {
      let txt;
      if (st.status === "na") txt = `<span class="dim">Doesn't apply</span>`;
      else if (st.status === "pending") txt = `<span class="dim">Not collected yet</span>`;
      else txt = `${esc(st.display)} ${sups(st)}${st.status !== "official" ? ` <span class="badge ${BADGE[st.status][0]}">${BADGE[st.status][1]}</span>` : ""}${typeof st.pct === "number" ? "<br>" + leader(st) : ""}`;
      return `<div class="${right ? "r" : ""}">${txt}</div>`;
    };
    const has = (st) => st.status !== "na" && st.status !== "pending";
    const both = STATS.filter((s) => has(statFor(A, s.key)) && has(statFor(B, s.key)));
    const rest = STATS.filter((s) => !both.includes(s));
    let html = `<div class="hd"><div><h3>${esc(A.name)}</h3><small style="color:var(--board-muted)">${esc(A.party)} · ${esc(A.role)}</small></div><div class="mid">${race.sample ? "SAMPLE" : esc(race.short)}</div><div class="r"><h3>${esc(B.name)}</h3><small style="color:var(--board-muted)">${esc(B.party)} · ${esc(B.role)}</small></div></div>`;
    html += `<div class="sec">Stats both have <small>(${both.length})</small></div>`;
    html += both.length ? both.map((s) => `<div class="ln">${cell(statFor(A, s.key))}<div class="mid">${esc(s.label)}</div>${cell(statFor(B, s.key), true)}</div>`).join("") : `<div class="ln"><div class="dim">None yet</div><div class="mid">—</div><div class="r dim">None yet</div></div>`;
    html += `<div class="sec">Other stats</div>` + rest.map((s) => `<div class="ln">${cell(statFor(A, s.key))}<div class="mid">${esc(s.label)}</div>${cell(statFor(B, s.key), true)}</div>`).join("");
    html += `<div class="sec">Background</div>`;
    const bg = (c, right) => `<div class="${right ? "r" : ""}" style="font-size:13px">${(c.facts || []).slice(0, 2).map((f) => `<div>${esc(f.text)} ${sups(f)}</div>`).join("")}</div>`;
    html += `<div class="ln">${bg(A)}<div class="mid">Record</div>${bg(B, true)}</div>`;
    const pl = (c, right) => `<div class="${right ? "r" : ""}" style="font-size:13px">${(c.plans || []).length ? c.plans.slice(0, 3).map((p) => `<div>${esc(p.text)} ${sups(p)}</div>`).join("") : '<span class="dim">None collected yet</span>'}</div>`;
    html += `<div class="ln">${pl(A)}<div class="mid">Plans · their words</div>${pl(B, true)}</div>`;
    const topics = POSITION_TOPICS[race.office] || [];
    if (topics.length) {
      html += `<div class="sec">Positions · side by side, never scored</div>`;
      topics.forEach((t) => {
        const pc = (p, right) => `<div class="${right ? "r" : ""}">${p ? esc(p.text) + " " + sups(p) : '<span class="dim">Not yet sourced</span>'}</div>`;
        html += `<div class="ln">${pc(A.positions && A.positions[t.key])}<div class="mid">${esc(t.label)}</div>${pc(B.positions && B.positions[t.key], true)}</div>`;
      });
    }
    $("#h2h").innerHTML = html;
  }
  $("#h2h-race").addEventListener("change", (e) => { const r = RACE(e.target.value); h2hState = { race: r.id, a: r.candidates[0], b: r.candidates[1] }; renderH2H(); });
  $("#h2h-a").addEventListener("change", (e) => { h2hState.a = e.target.value; renderH2H(); });
  $("#h2h-b").addEventListener("change", (e) => { h2hState.b = e.target.value; renderH2H(); });

  /* ---------- learn ---------- */
  const doy = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 864e5);
  let qi = doy % DAILY.length;
  function renderDaily() {
    const d = DAILY[qi];
    const streak = store.get("streak", 0);
    $("#daily").innerHTML = `<div class="row" style="justify-content:space-between"><span class="eyebrow">Daily question</span><span class="streak">Correct answers on this device: ${streak}</span></div>
      <h3>${esc(d.q)}</h3><div class="opts">${d.opts.map((o, i) => `<button type="button" data-i="${i}">${esc(o)}</button>`).join("")}</div>
      <p class="why" id="why" hidden></p><div><button class="btn small" type="button" id="nextq">Another question</button></div>`;
    $$("#daily .opts button").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.i;
      $$("#daily .opts button").forEach((x) => { x.disabled = true; if (+x.dataset.i === d.a) x.classList.add("right"); });
      if (i !== d.a) b.classList.add("wrong"); else store.set("streak", streak + 1);
      const w = $("#why"); w.hidden = false; w.textContent = (i === d.a ? "Correct. " : "Not quite. ") + d.why;
    }));
    $("#nextq").addEventListener("click", () => { qi = (qi + 1) % DAILY.length; renderDaily(); });
  }
  function renderLearn() {
    renderDaily();
    $("#lessons").innerHTML = LESSONS.map((l, i) => `<details class="lesson"${i === 0 ? " open" : ""}><summary><b>${esc(l.t)}</b><span>${esc(l.m)}</span></summary><div>${l.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div></details>`).join("");
    const G = [["Earmark", "Money a member requests for a specific local project inside a spending bill; the House calls it Community Project Funding."],
      ["Cosponsor", "A member who formally signs on to support another member's bill."], ["Veto", "A governor's or president's rejection of a bill; legislatures can override it."],
      ["Mill", "One-tenth of a cent per dollar of assessed property value, the unit of property tax rates."], ["LES", "Legislative Effectiveness Score from the Center for Effective Lawmaking; 1.0 is the chamber average."],
      ["Benchmark", "The score expected for a member with the same party status, seniority and committee role."], ["Percentile", "The share of peers in the same chamber an official does better than on one stat."]];
    $("#glossary").innerHTML = G.map(([k, v]) => `<div><span class="lbl">${k}</span><span>${v}</span></div>`).join("");
  }

  /* ---------- play (fictional) ---------- */
  PLAYERS.forEach((p) => (p.pts = Math.round(p.events.reduce((a, e) => a + e[1], 0) * 10) / 10));
  const P = (id) => PLAYERS.find((p) => p.id === id);
  let roster = Object.assign({}, DEFAULT_ROSTER, store.get("roster", {}));
  let posFilter = "All";
  const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);
  function renderPlay() {
    const mine = SLOTS.map(([k]) => roster[k]).filter(Boolean).map(P);
    const theirs = OPPONENT.roster.map(P);
    const ms = mine.reduce((a, p) => a + p.pts, 0), ts = theirs.reduce((a, p) => a + p.pts, 0);
    $("#scoreboard").innerHTML = `<div class="team"><b>Civic Sundays</b><small>You · fictional</small><span class="pts ${ms >= ts ? "lead" : ""} num">${fmt(ms)}</span></div>
      <div class="mid">Week 6<br>Demo</div><div class="team r"><b>${esc(OPPONENT.name)}</b><small>Fictional</small><span class="pts ${ts > ms ? "lead" : ""} num">${fmt(ts)}</span></div>`;
    $("#roster").innerHTML = SLOTS.map(([k, pos]) => {
      const p = roster[k] && P(roster[k]);
      if (!p) return `<div class="slot empty"><span class="pos">${pos}</span><span class="nm dim">Empty · draft a ${pos === "FLEX" ? "player" : pos}</span><span></span><span></span></div>`;
      return `<div class="slot"><span class="pos">${pos}</span><span class="nm">${esc(p.name)}<small>Party ${p.party} · ${p.team}</small></span><span class="status ${p.status}">${p.status}</span><span class="row" style="gap:4px"><span class="p">${fmt(p.pts)}</span><button class="x" type="button" data-drop="${k}" aria-label="Drop ${esc(p.name)}">×</button></span></div>`;
    }).join("");
    const feed = [];
    mine.forEach((p) => p.events.forEach(([t, v]) => feed.push({ who: p.name, t, v })));
    $("#feed").innerHTML = feed.length ? feed.map((e) => `<div><span><b>${esc(e.who)}</b> · ${esc(e.t)}</span><span class="${e.v >= 0 ? "pl" : "mi"}">${e.v >= 0 ? "+" : ""}${fmt(e.v)}</span></div>`).join("") : `<div><span class="dim">Draft players to see their scoring plays.</span><span></span></div>`;
    const taken = new Set(Object.values(roster).concat(OPPONENT.roster));
    const pool = PLAYERS.filter((p) => !taken.has(p.id) && (posFilter === "All" || p.pos === posFilter)).sort((a, b) => b.pts - a.pts);
    $("#posfilter").innerHTML = ["All", "QB", "WR", "RB"].map((f) => `<button type="button" aria-pressed="${f === posFilter}" data-f="${f}">${{ QB: "QB · Governors", WR: "WR · Senators", RB: "RB · House", All: "All" }[f]}</button>`).join("");
    $("#pool").innerHTML = pool.length ? pool.map((p) => `<div class="slot"><span class="pos">${p.pos}</span><span class="nm">${esc(p.name)}<small>Party ${p.party} · ${p.team} · ${fmt(p.pts)} pts</small></span><span class="status ${p.status}">${p.status}</span><button class="btn small" type="button" data-draft="${p.id}">Draft</button></div>`).join("") : `<p class="dim">No available players at this position.</p>`;
    $("#scoretable").innerHTML = SCORING.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("");
  }
  $("#roster").addEventListener("click", (e) => { const b = e.target.closest("[data-drop]"); if (!b) return; roster[b.dataset.drop] = null; store.set("roster", roster); $("#draftmsg").textContent = ""; renderPlay(); });
  $("#posfilter").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; posFilter = b.dataset.f; renderPlay(); });
  $("#pool").addEventListener("click", (e) => {
    const b = e.target.closest("[data-draft]"); if (!b) return;
    const p = P(b.dataset.draft);
    const slot = SLOTS.filter(([, pos]) => pos === p.pos).map(([k]) => k).concat(["FLEX"]).find((k) => !roster[k]);
    if (!slot) { $("#draftmsg").textContent = `No open ${p.pos} or FLEX slot. Drop someone first.`; return; }
    roster[slot] = p.id; store.set("roster", roster); $("#draftmsg").textContent = `Drafted ${p.name} into ${slot.replace(/\d/, "")}.`; renderPlay();
  });
  $("#reset-roster").addEventListener("click", () => { roster = Object.assign({}, DEFAULT_ROSTER); store.set("roster", roster); $("#draftmsg").textContent = "Demo reset."; renderPlay(); });

  /* ---------- methodology ---------- */
  let feedState = {};
  function renderMethod() {
    const kpiRows = STATS.map((s) => `<tr><td><b>${esc(s.label)}</b><br><span class="dim" style="font-size:12.5px">${esc(s.q)}</span></td><td>${esc(s.who)}</td><td style="font-size:13px">${esc(s.explain)}</td><td>${s.defaultOn ? "On" : "Off"}</td></tr>`).join("");
    const srcList = SRC_IDS.map((id, i) => { const s = SOURCES[id]; return `<div><span class="id">[${i + 1}]</span><span>${esc(s.pub)}, “${esc(s.title)},” ${esc(s.date)}. <a href="${esc(s.url)}" target="_blank" rel="noopener">Link</a></span></div>`; }).join("");
    const feedRows = FEEDS.map((f) => {
      const e = feedState[f.key];
      let label, cls;
      if (f.next) { label = "Not connected"; cls = "next"; }
      else if (f.manualDraft) { label = "AI draft"; cls = "manual"; }
      else if (f.manual) { label = "Imported by hand"; cls = "manual"; }
      else if (e && e.state === "error") { label = "Last run failed"; cls = "partial"; }
      else { label = "Nightly"; cls = "live"; }
      const last = e && e.last ? e.last : (f.next || f.manualDraft ? "—" : ASOF);
      return `<tr><td><b>${esc(f.name)}</b><br><span class="dim" style="font-size:12.5px">${esc(f.org)} · ${esc(f.how)}</span></td><td>${esc(f.stat)}</td><td><span class="feed ${cls}">${label}</span></td><td class="cov">${esc(last)}</td></tr><tr class="sub"><td colspan="4" class="dim" style="font-size:12.5px;padding-top:0">${esc(f.note)}</td></tr>`;
    }).join("");
    $("#methodbody").innerHTML = `
      <h3 id="m-principles">Principles</h3>
      <ol>
        <li><b>Stats, not standings.</b> Candidates get box scores and category labels, never one overall grade. In sports everyone agrees the goal is winning; in politics there's no shared goal, so any single ranking builds in someone's values.</li>
        <li>Measure whether people face voters and do the job. Never score policy positions or how anyone voted on an issue.</li>
        <li>Every number links to a public source. Anything that took judgment is labeled Draft until reviewed.</li>
        <li>Compare officials with peers in the same chamber, and show the peer group beside every comparison.</li>
        <li>Rank only when a voter asks, using only stats every candidate in the race has.</li>
      </ol>
      <h3 id="m-kpis">The five stats</h3>
      <div class="tablebox"><table class="rank-table"><tr><th>Stat</th><th>Applies to</th><th>How it's measured</th><th>In Your ranking by default</th></tr>${kpiRows}</table></div>
      <div class="formula" tabindex="0" role="region" aria-label="Formulas">Shows up, Gets results, Works across lines: the stat used for ranking is the official's percentile in their peer group
  (1.0 = best in the chamber, 0.5 = middle). Gets results compares LES ÷ benchmark across the chamber.
Answers to voters: share of collected parts the candidate did (debates accepted, questionnaires answered, ...).
Who funds them: average of small-donor share, in-state share (when available) and (1 − PAC share).</div>
      <h3 id="m-answers">Answers to voters: what counts</h3>
      <ul>
        <li><b>Debates</b> count only when a nonpartisan host invited every qualifying candidate. Accepting counts; declining counts against. Invitations that left out a qualifying candidate are listed but not counted.</li>
        <li><b>Questionnaires</b> count when a nonpartisan voter guide sent the same questions to every candidate on the ballot: the League of Women Voters' Vote411, Ballotpedia's Candidate Connection, or a nonprofit or newspaper guide that publishes which candidates didn't respond.</li>
        <li><b>Town halls</b> count when announced publicly at least two days ahead and open to any constituent, in person or online.</li>
        <li><b>Disclosures</b> count when a required financial-disclosure report was filed by its legal deadline.</li>
        <li>Each card lists every part, including parts not collected yet. Today only debates (and one Ohio questionnaire) are collected.</li>
      </ul>
      <h3 id="m-leaders">Category leaders</h3>
      <p>Labels compare an official with everyone in the same peer group on one stat: Top 10%, Top 25%, Middle 50%, Bottom 25% or Bottom 10%. Peer groups: every House member or senator with recorded votes in the 119th Congress (attendance); every member scored in the 118th Congress (effectiveness); every member ranked in the 2023 Bipartisan Index; every Arkansas House or Senate member scored for 2023–24 (state effectiveness).</p>
      <h3 id="m-ranking">Your ranking</h3>
      <ul>
        <li>Appears only after you select "Show my ranking."</li>
        <li>Uses only stats you switched on <i>and</i> every candidate in the race has. Challengers usually have only Answers to voters and Who funds them, so they're never ranked on a voting record they can't have.</li>
        <li>Who funds them and Works across lines start switched off because voters disagree about whether they matter.</li>
        <li>Drafts are left out unless you include them.</li>
      </ul>
      <h3 id="m-plans">Plans and fact-checks</h3>
      <p><b>Plans</b> are each candidate's own statements with links, plus a four-point checklist: measurable, has a timeline, says what it costs, within the office's power. There are no kept-or-broken verdicts. The checklists are AI-drafted and unreviewed.</p>
      <p><b>Fact-checks</b> appear as a dated list of every ruling the shared ClaimReview database attributes to a person. They're never turned into a rate or a score, because fact-checkers choose which claims to check.</p>
      <h3 id="m-review">Who reviews</h3>
      <p>No one yet. This is an AI-assisted prototype. Official-record stats are imported automatically by code anyone can read. Everything that took judgment (plan checklists, backgrounds, debate classifications) is marked Draft. The proposed review protocol, borrowed from Wikipedia's model of public sourcing, public edit history and extra protection for pages about living people, is in the contributor guide: <a href="${REPO_URL}/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener">CONTRIBUTING.md</a>.</p>
      <h3 id="m-evidence">Evidence behind the design</h3>
      <ul>
        <li>Pew Research Center (2023): 80% of Americans say big campaign donors have too much influence on Congress, and 85% say elected officials don't care what people like them think. These findings shaped Who funds them and Answers to voters.</li>
        <li>A 2020 national poll split exactly evenly on whether lawmakers should compromise or hold firm, with 72% of liberals and 35% of conservatives preferring compromisers. That's why Works across lines starts switched off.</li>
        <li>Vote Smart's candidate questionnaire response rate fell from 72% in 1996 to 24% in 2020, which is why answering voters is the lead stat.</li>
        <li>Frese, Hix and Lachat (British Journal of Political Science, 2025) ran field experiments with 6,501 voters in three countries: a voting-advice tool didn't change turnout or push users toward any camp, and made them up to 6 points more likely to vote for the party closest to their own views. Your ranking is inspired by that approach; it isn't the same tool.</li>
        <li>Fowler and Hall's reassessment found little evidence for the claim that shark attacks swing elections, but the broader lesson stands: voters struggle to separate what officials did from what happened on their watch. So every stat here is about an official's own actions.</li>
        <li>A University of Georgia study, "Pick Your Poison: On Selecting Roll Calls to Say Whatever You Want," shows how choosing which votes to highlight can produce almost any picture of a lawmaker. That's why key votes will only appear on topics a voter picks.</li>
      </ul>
      <h3 id="m-limits">Limitations</h3>
      <ul>
        <li>Answers to voters has only one of four parts collected for most candidates (debates).</li>
        <li>Effectiveness scores cover 2023–24; the current term's scores publish after it ends. Majority-party members advance more bills; benchmarks reduce that advantage but don't remove it.</li>
        <li>The Bipartisan Index is the 2023 release and covers members of Congress only.</li>
        <li>Arkansas legislature votes, state campaign finance and executive records (budgets, vetoes) aren't connected, so state and executive cards are thin.</li>
        <li>Constituent service matters to voters but has no public data; it isn't measured.</li>
        <li>ZIP lookup uses Census ZIP areas; about 15% of ZIPs span two districts and the page asks you to confirm.</li>
      </ul>
      <h3 id="m-feeds">Data feeds</h3>
      <div class="tablebox"><table class="rank-table feeds"><tr><th>Feed</th><th>Feeds</th><th>Status</th><th>Last pulled</th></tr>${feedRows}</table></div>
      <h3 id="m-corr">Corrections</h3>
      <p>Corrections happen in public on GitHub: every report is an issue anyone can read, and every change is a commit anyone can inspect. <a href="${REPO_URL}/issues" target="_blank" rel="noopener">See open corrections</a> · <a href="${REPO_URL}/commits/main" target="_blank" rel="noopener">See the change history</a></p>
      <form class="corr" id="corrform">
        <div class="g">
          <div class="stack" style="gap:4px"><label class="lab" for="c-who">Candidate</label><select class="input" id="c-who">${Object.values(CANDS).filter((c) => !c.sample).map((c) => `<option>${esc(c.name)}</option>`).join("")}</select></div>
          <div class="stack" style="gap:4px"><label class="lab" for="c-stat">Stat or fact</label><select class="input" id="c-stat">${STATS.map((s) => `<option>${esc(s.label)}</option>`).join("")}<option>Plans</option><option>Background fact</option></select></div>
        </div>
        <div class="stack" style="gap:4px"><label class="lab" for="c-text">What should change</label><input class="input" id="c-text" required placeholder="Describe the correction"></div>
        <div class="stack" style="gap:4px"><label class="lab" for="c-url">Source link (required)</label><input class="input" id="c-url" type="url" required placeholder="https://"></div>
        <div class="row"><button class="btn primary" type="submit">Prepare GitHub issue</button><span class="toast" id="c-msg" aria-live="polite"></span></div>
        <p class="dim" style="font-size:12.5px">Opens a pre-filled public issue on GitHub (free account required). Nothing is saved here.</p>
      </form>
      <h3 id="m-src">Sources</h3>
      <div class="srclist">${srcList}</div>`;
    $("#corrform").addEventListener("submit", (e) => {
      e.preventDefault();
      const who = $("#c-who").value, stat = $("#c-stat").value, text = $("#c-text").value.trim(), url = $("#c-url").value.trim();
      if (!text || !url) return;
      const href = `${REPO_URL}/issues/new?labels=correction&title=${encodeURIComponent("Correction: " + who + " · " + stat)}&body=${encodeURIComponent("**Candidate:** " + who + "\n**Stat or fact:** " + stat + "\n**What should change:** " + text + "\n**Source:** " + url)}`;
      $("#c-msg").innerHTML = `<a href="${esc(href)}" target="_blank" rel="noopener">Open the pre-filled issue on GitHub</a>`;
    });
  }
  $(".toc").addEventListener("click", (e) => { const a = e.target.closest("[data-jump]"); if (!a) return; e.preventDefault(); document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" }); });

  /* ---------- about ---------- */
  function renderAbout() {
    $("#about-real").innerHTML = [
      `Every contested race on Arkansas's Nov 3 ballot: ${AR_CONTESTED.length} races and ${AR_CANDS} candidates, plus the ${UNOPP_N} unopposed seats and plain-language explainers for the 4 statewide ballot issues.`,
      "Ohio's governor race as a second pilot: three first-time candidates, shown as profiles and plans.",
      "Official data refreshed nightly: congressional and state legislative effectiveness, House and Senate roll calls, FEC campaign money, fact-check rulings, and the Census ZIP-to-district map. The Bipartisan Index is imported by hand.",
      "The page itself is rebuilt from that data every night, so the numbers shown match the latest pull."
    ].map((t) => `<li>${esc(t)}</li>`).join("");
    $("#repo-link").href = REPO_URL;
  }

  /* ---------- boot ---------- */
  $("#tk-races").textContent = AR_CONTESTED.length;
  $("#asof").textContent = "data as of " + ASOF; $$(".asof2").forEach((x) => (x.textContent = "Data as of " + ASOF));
  renderBallot($("#zip").value); renderLearn(); renderMethod(); renderAbout();
  show(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "scout", false);

  /* On GitHub Pages the nightly job publishes data/manifest.json next to the page; show each feed's real status. */
  fetch("data/manifest.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((m) => {
    if (!m) return;
    const fmtDate = (d) => { try { return new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch (e) { return d; } };
    Object.entries(m).forEach(([k, v]) => { if (!k.startsWith("_")) feedState[k] = { state: v.state, last: v.last ? fmtDate(v.last) : (v.checked ? fmtDate(v.checked) : null) }; });
    $("#tk-mode").textContent = "Nightly";
    if (m._run) $("#asof").textContent = "refreshed " + fmtDate(m._run.date);
    renderMethod();
  }).catch(() => {});
})();
