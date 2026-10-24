/* ===== Stump League — app ===== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("sl:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("sl:" + k, JSON.stringify(v)); } catch (e) {} }
  };

  const SRC_IDS = Object.keys(SOURCES);
  /* Merge Arkansas races into the race list, ordered the way they appear on the ballot. */
  const LEVELS = { congress: ["Arkansas · Congress", 1], statewide: ["Arkansas · Statewide offices", 2], issues: ["Arkansas · Ballot issues", 3], "state-senate": ["Arkansas · State Senate", 4], "state-house": ["Arkansas · State House", 5], pilot: ["Other pilot races", 6] };
  if (typeof AR_RACES !== "undefined") {
    const congressOrder = ["ar-sen", "ar1", "ar2", "ar3", "ar4"];
    const all = RACES.concat(AR_RACES);
    const key = (r) => [LEVELS[r.level || "pilot"][1], r.level === "congress" ? congressOrder.indexOf(r.id) : 0, parseInt((r.short.match(/\d+/) || [0])[0], 10) + (/SPECIAL/.test(r.short) ? 0.5 : 0)];
    all.sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
    RACES.length = 0; RACES.push(...all);
  }
  const srcNum = (id) => SRC_IDS.indexOf(id) + 1;
  function sup(id) {
    if (!id || !SOURCES[id]) return "";
    const s = SOURCES[id];
    return `<a class="sup" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.pub + " — " + s.title + " (" + s.date + ")")}">[${srcNum(id)}]</a>`;
  }
  const sups = (o) => (o ? sup(o.src) + sup(o.src2) : "");
  const RACE = (id) => RACES.find((r) => r.id === id);

  /* ---------- scoring engine ---------- */
  const OUTCOME_VAL = { Kept: 1, Compromise: 0.5, Broken: 0 };
  const specOf = (p) => p.spec ? p.spec.m + p.spec.t + p.spec.c + p.spec.p : 0;

  function derived(c, key) {
    const ps = c.promises || [];
    if (key === "specificity") {
      if (!ps.length) return null;
      const avg = ps.reduce((a, p) => a + specOf(p), 0) / ps.length;
      return { norm: avg / 4, display: avg.toFixed(1) + " / 4", sub: "Across " + ps.length + " sourced promise" + (ps.length === 1 ? "" : "s") };
    }
    if (key === "promises") {
      const rated = ps.filter((p) => p.outcome in OUTCOME_VAL);
      if (!rated.length) return null;
      let w = 0, v = 0;
      rated.forEach((p) => { const wt = 1 + specOf(p) / 4; w += wt; v += wt * OUTCOME_VAL[p.outcome]; });
      const n = (o) => rated.filter((p) => p.outcome === o).length;
      return { norm: v / w, display: `${n("Kept")} kept · ${n("Compromise")} compromise · ${n("Broken")} broken`, sub: `of ${rated.length} tracked, weighted by specificity` };
    }
    return null;
  }

  /* returns {status, norm, display, sub, note, src, src2} with draft values filled in */
  function statFor(c, key) {
    const s = (c.stats && c.stats[key]) || { status: "pending" };
    if (s.from) {
      const d = derived(c, s.from === "promises" && key === "specificity" ? "specificity" : key);
      if (!d) return { status: "pending", note: "No sourced promises collected yet." };
      return Object.assign({}, s, d);
    }
    return s;
  }
  function counts(st, incDraft) { return st.status === "verified" || (incDraft && st.status === "draft"); }

  function composite(c, weights, incDraft) {
    let sw = 0, sv = 0, n = 0, drafts = 0;
    STATS.forEach((d) => {
      const st = statFor(c, d.key);
      if (!counts(st, incDraft) || typeof st.norm !== "number") return;
      n++; if (st.status === "draft") drafts++;
      const w = weights[d.key] || 0;
      sw += w; sv += w * st.norm;
    });
    const score = sw > 0 ? sv / sw : null;
    const verified = n - drafts;
    const enough = verified >= 4 && score != null; /* drafts can move a score but never unlock a tier */
    let tier = null;
    if (enough) tier = score >= 0.75 ? "Elite" : score >= 0.55 ? "Starter" : score >= 0.35 ? "Developing" : "Bench";
    let conf = n >= 7 ? "high" : n >= 5 ? "med" : "low";
    if (drafts) conf = "low";
    return { score, n, tier, conf, drafts, verified };
  }
  window.__sl = { composite, statFor, derived };

  /* ---------- state ---------- */
  const DEFAULT_W = Object.fromEntries(STATS.map((s) => [s.key, 5]));
  let weights = Object.assign({}, DEFAULT_W, store.get("weights", {}));
  let incDraft = store.get("incdraft", false);
  let raceId = store.get("race", "ar3");
  if (!RACE(raceId)) raceId = "ar3";

  /* ---------- routing ---------- */
  const VIEWS = ["scout", "races", "h2h", "learn", "play", "method", "about"];
  function show(view) {
    if (!VIEWS.includes(view)) view = "scout";
    $$("section[data-view]").forEach((s) => (s.hidden = s.dataset.view !== view));
    $$("nav.tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === view ? "page" : "false"));
    if (view === "races") renderRaces();
    if (view === "h2h") renderH2H();
    if (view === "play") renderPlay();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));
  function go(view) { if (location.hash.slice(1) === view) show(view); else location.hash = view; }

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
        out.other.push(["Arkansas legislature", "Your state House and Senate districts don't follow ZIP codes. All 41 contested legislative races are listed below; find your district with Voter View on the Secretary of State's site."]);
        return;
      }
      if (st === "OH") out.pilot.push("ohgov");
      cds.forEach((d) => out.other.push(["U.S. House · " + name + " " + (d === "0" ? "at-large" : ord(d) + " District"), "Not in the prototype yet · coming in phase 2"]));
      out.other.push(["Statewide races · " + name, "Senate, governor and other statewide races where on the ballot · coming in phase 2"]);
      out.other.push([name + " legislature", "Coming in phase 4"]);
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
    items.push(`<a class="ballot-item" href="#races" data-race="demo"><span class="code">DEMO</span><span><b>See a fully populated race</b><br><span class="dim" style="font-size:13.5px">Fictional sample with every stat filled in</span></span><span class="btn small">Open</span></a>`);
    $("#ballot").innerHTML = items.join("");
    $("#arkansas").hidden = r.state !== "AR";
    if (r.state === "AR") renderArkansas();
  }
  function renderArkansas() {
    const ar = RACES.filter((x) => x.state === "Arkansas");
    const contested = ar.filter((x) => !x.issues);
    $("#ar-count").textContent = contested.length + " contested races · " + contested.reduce((a, x) => a + x.candidates.length, 0) + " candidates";
    const groups = {};
    ar.forEach((x) => (groups[x.level] = groups[x.level] || []).push(x));
    $("#ar-list").innerHTML = Object.keys(groups).sort((a, b) => LEVELS[a][1] - LEVELS[b][1]).map((lv) => `<div class="arlevel"><h3>${esc(LEVELS[lv][0].replace("Arkansas · ", ""))} <span class="cov">(${groups[lv].length})</span></h3>` +
      groups[lv].map((x) => {
        const who = x.issues ? x.issues.map((i) => "Issue " + i.n + ": " + i.title).join(" · ") :
          x.candidates.map((id) => { const c = CANDS[id]; return esc(c.name) + " (" + esc(c.party[0]) + ")" + (c.track === "veteran" && /Incumbent|since/.test(c.role) ? "*" : ""); }).join(" · ");
        const scored = x.issues ? "Explainer" : x.candidates.filter((id) => STATS.some((d) => statFor(CANDS[id], d.key).status === "verified")).length + " of " + x.candidates.length + " with verified stats";
        return `<a class="arrow" href="#races" data-race="${x.id}"><span class="code">${esc(x.short)}</span><span class="who">${who}</span><span class="cov">${scored}</span></a>`;
      }).join("") + `</div>`).join("") + `<p class="dim" style="font-size:12.5px">* incumbent</p>`;
    const U = typeof AR_UNOPPOSED !== "undefined" ? AR_UNOPPOSED : {};
    const total = Object.values(U).reduce((a, v) => a + v.length, 0);
    $("#ar-unopp-sum").textContent = "The other " + total + " Arkansas seats on the ballot are unopposed";
    $("#ar-unopp-body").innerHTML = `<p class="dim" style="font-size:13px">These candidates face no opponent on Nov 3, so there's no choice to compare. * incumbent</p>` +
      Object.entries(U).map(([lv, rows]) => `<h3 style="font-size:16px">${esc(lv)} (${rows.length})</h3><div class="unopp">${rows.map(([seat, who]) => `<div><span class="lbl">${esc(seat)}</span><span>${esc(who)}</span></div>`).join("")}</div>`).join("") +
      `<p class="srcs">Source: ${sup("wiki_arhouse")} ${sup("wiki_arsen")} ${sup("greenpapers_ar")}</p>`;
  }
  $("#ar-list").addEventListener("click", (e) => { const a = e.target.closest("[data-race]"); if (!a) return; e.preventDefault(); setRace(a.dataset.race); go("races"); });
  $("#zipform").addEventListener("submit", (e) => { e.preventDefault(); renderBallot($("#zip").value.trim()); });
  $("#ballot").addEventListener("click", (e) => {
    const a = e.target.closest("[data-race]"); if (!a) return;
    e.preventDefault(); setRace(a.dataset.race); go("races");
  });

  /* ---------- rankings ---------- */
  function setRace(id) { raceId = id; store.set("race", id); }
  function raceOptions(sel, filter) {
    const groups = {};
    RACES.filter(filter || (() => true)).forEach((r) => (groups[r.level || "pilot"] = groups[r.level || "pilot"] || []).push(r));
    return Object.keys(groups).sort((a, b) => LEVELS[a][1] - LEVELS[b][1]).map((lv) => `<optgroup label="${esc(LEVELS[lv][0])}">` +
      groups[lv].map((r) => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(r.short)} · ${esc(r.name.replace(/ · Arkansas$/, "").replace(/^Arkansas (House|Senate) · /, ""))}${r.sample ? " (sample)" : ""}</option>`).join("") + `</optgroup>`).join("");
  }
  function renderRacePick() {
    const i = RACES.findIndex((r) => r.id === raceId);
    $("#racepick").innerHTML = `<label class="lab" style="flex:1 1 320px;min-width:0">Race <select class="input" id="racesel">${raceOptions(raceId)}</select></label>
      <button class="btn small" type="button" data-step="-1" ${i <= 0 ? "disabled" : ""}>◀ Previous</button><button class="btn small" type="button" data-step="1" ${i >= RACES.length - 1 ? "disabled" : ""}>Next ▶</button>`;
  }
  $("#racepick").addEventListener("change", (e) => { if (e.target.id === "racesel") { setRace(e.target.value); renderRaces(); } });
  $("#racepick").addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (!b) return; const i = RACES.findIndex((r) => r.id === raceId) + +b.dataset.step; if (RACES[i]) { setRace(RACES[i].id); renderRaces(); } });

  function renderRaceHead(race) {
    const can = race.can.map((t) => `<li>${esc(t)}</li>`).join("");
    const cant = race.cant.map((t) => `<li>${esc(t)}</li>`).join("");
    const canSrc = (race.canSrc || []).map(sup).join("");
    $("#racehead").innerHTML = `
      <div class="racehead">
        <div class="row"><span class="tag">${esc(race.state)}</span>${race.sample ? "" : `<span class="tag">Election ${esc(race.election)}</span>`}${race.sample ? '<span class="tag sample">Fictional sample data</span>' : `<span class="tag">${esc((LEVELS[race.level || "pilot"] || ["Pilot race"])[0].replace("Arkansas · ", "").replace("Other pilot races", "Pilot race"))}</span>`}</div>
        <h1>${esc(race.name)}</h1>
        <p class="lede">${esc(race.blurb)}</p>
      </div>
      ${race.issues ? `<div class="panel" style="margin-top:16px"><div class="eyebrow">About these explainers</div>${race.context.map((c) => `<p class="ctx">${esc(c.text)} ${sups(c)}</p>`).join("")}<p class="dim" style="font-size:13px">Ballot issues aren't candidates, so nothing here is scored or ranked. Each card shows what the measure does, current law, what FOR and AGAINST mean, and one line from each side.</p></div>` : `<div class="twocol" style="margin-top:16px">
        <div class="panel"><div class="eyebrow">What this office can do ${canSrc}</div><ul>${can}</ul><div class="eyebrow" style="margin-top:6px">What it can't</div><ul>${cant}</ul></div>
        <div class="panel"><div class="eyebrow">Race context</div>${race.context.map((c) => `<p class="ctx">${esc(c.text)} ${sups(c)}</p>`).join("")}</div>
      </div>`}`;
  }

  function renderSliders() {
    $("#sliders").innerHTML = STATS.map((s) => `<label class="sl" for="w-${s.key}"><span>${esc(s.label)}</span><output id="o-${s.key}">${weights[s.key]}</output><input type="range" min="0" max="10" step="1" id="w-${s.key}" data-k="${s.key}" value="${weights[s.key]}"></label>`).join("");
    $("#incdraft").checked = incDraft;
  }
  $("#sliders").addEventListener("input", (e) => {
    const k = e.target.dataset.k; if (!k) return;
    weights[k] = +e.target.value; $("#o-" + k).textContent = e.target.value; store.set("weights", weights); renderRank(RACE(raceId));
  });
  $("#incdraft").addEventListener("change", (e) => { incDraft = e.target.checked; store.set("incdraft", incDraft); renderRank(RACE(raceId)); renderCards(RACE(raceId)); });
  $("#reset-w").addEventListener("click", () => { weights = Object.assign({}, DEFAULT_W); store.set("weights", weights); renderSliders(); renderRank(RACE(raceId)); });

  const QUIZ = [
    { q: "Does it matter to you whether officials keep their word?", keys: ["promises", "specificity"] },
    { q: "Do you care whether they show up for votes?", keys: ["attendance"] },
    { q: "Do you want leaders who work across party lines?", keys: ["bipartisan"] },
    { q: "Should candidates face voters in debates and town halls?", keys: ["access", "transparency"] },
    { q: "How much do accurate claims matter to you?", keys: ["factcheck"] },
    { q: "Do you care whether lawmakers actually move bills?", keys: ["effectiveness"] }
  ];
  $("#open-quiz").addEventListener("click", () => {
    const box = $("#quizbox"); box.hidden = !box.hidden;
    if (box.hidden) return;
    box.innerHTML = QUIZ.map((q, i) => `<div class="qrow"><span>${esc(q.q)}</span><select id="qz-${i}" aria-label="${esc(q.q)}"><option value="8">A lot</option><option value="5" selected>Some</option><option value="2">A little</option><option value="0">Not at all</option></select></div>`).join("") + `<button class="btn small primary" type="button" id="apply-quiz">Apply to sliders</button>`;
    $("#apply-quiz").onclick = () => {
      QUIZ.forEach((q, i) => q.keys.forEach((k) => (weights[k] = +$("#qz-" + i).value)));
      store.set("weights", weights); renderSliders(); renderRank(RACE(raceId)); box.hidden = true;
    };
  });

  function tierHTML(r) {
    if (!r.tier) return `<span class="tier none">Not enough verified data · ${r.verified} of 4</span>`;
    return `<span class="tier ${r.tier.toLowerCase()}">${r.tier}</span>`;
  }
  function renderRank(race) {
    const rows = race.candidates.map((id) => ({ id, c: CANDS[id], r: composite(CANDS[id], weights, incDraft) }));
    rows.sort((a, b) => (b.r.tier ? 1 : 0) - (a.r.tier ? 1 : 0) || (b.r.score || 0) - (a.r.score || 0));
    let rank = 0;
    const tiered = rows.filter((x) => x.r.tier).length;
    $("#rank-note").textContent = tiered ? `${tiered} of ${rows.length} ranked` : "No tiers yet: not enough verified stats";
    $("#rank-caveat").hidden = !!race.sample || !tiered;
    $("#ranktable").innerHTML = `<tr><th>#</th><th>Candidate</th><th>Tier</th><th>Score</th><th>Scored stats</th><th>Confidence</th></tr>` +
      rows.map(({ id, c, r }) => {
        const pct = r.tier ? Math.round(r.score * 100) : 0;
        return `<tr class="click" data-id="${id}" tabindex="0"><td class="rk">${r.tier ? ++rank : "—"}</td>
          <td><div class="who"><span class="av">${esc(c.initials)}</span><span><b>${esc(c.name)}</b><small>${esc(c.party)} · ${esc(c.role)}</small></span></div></td>
          <td>${tierHTML(r)}</td>
          <td>${r.tier ? `<div class="meter" title="Weighted score"><i style="width:${pct}%"></i></div>` : '<span class="cov">—</span>'}</td>
          <td class="cov">${r.n} of ${STATS.length}${r.drafts ? ` · ${r.drafts} draft` : ""}</td>
          <td class="conf ${r.conf}">${r.conf === "med" ? "Medium" : r.conf[0].toUpperCase() + r.conf.slice(1)}</td></tr>`;
      }).join("");
  }
  $("#ranktable").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) jumpCard(tr.dataset.id); });
  $("#ranktable").addEventListener("keydown", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr && e.key === "Enter") jumpCard(tr.dataset.id); });
  function jumpCard(id) { const el = document.getElementById("card-" + id); if (el) { el.scrollIntoView({ block: "start", behavior: "smooth" }); el.querySelector("details")?.setAttribute("open", ""); } }

  const BADGE = { verified: ["v", "Verified"], draft: ["d", "Draft"], pending: ["p", "Not collected yet"], na: ["na", "Not applicable"], fact: ["f", "Fact · not scored"] };
  function statRow(c, def) {
    const st = statFor(c, def.key);
    const [cls, lab] = BADGE[st.status] || BADGE.pending;
    let main, sub = "";
    if (st.status === "na") { main = "Applies to " + def.who.toLowerCase(); }
    else if (st.status === "pending") { main = st.note || "Not collected yet"; }
    else { main = esc(st.display); const base = esc(st.sub || ""); sub = base + (st.status === "draft" ? (base ? " · " : "") + "Awaiting reviewer sign-off" : ""); }
    const meter = typeof st.norm === "number" && (st.status === "verified" || st.status === "draft") ? `<div class="meter"><i style="width:${Math.round(st.norm * 100)}%"></i></div>` : "";
    const note = st.note && st.status !== "pending" ? `<small>${esc(st.note)}</small>` : "";
    return `<div class="stat ${st.status}" title="${esc(def.explain)}"><span class="k">${esc(def.short)}</span><div class="v"><b>${st.status === "na" || st.status === "pending" ? esc(main) : main} <span class="badge ${cls}">${lab}</span> ${sups(st)}</b>${sub ? `<small>${sub}</small>` : ""}${note}${meter}</div></div>`;
  }
  function promiseHTML(p) {
    const cls = { Kept: "kept", Compromise: "comp", Broken: "broken" }[p.outcome] || "";
    const s = p.spec || { m: 0, t: 0, c: 0, p: 0 };
    const chk = [["M", s.m, "Measurable"], ["T", s.t, "Time-bound"], ["C", s.c, "Costed"], ["P", s.p, "Within the office's power"]]
      .map(([l, on, t]) => `<span class="${on ? "on" : ""}" title="${t}: ${on ? "yes" : "no"}">${l}</span>`).join("");
    const eff = p.effort === true ? '<span class="pill">Effort: yes</span>' : "";
    const ev = (p.evidence || []).map((e) => `<div class="dim" style="font-size:12.5px">↳ ${esc(e.text)} ${sups(e)}</div>`).join("");
    return `<div class="promise"><div>${esc(p.text)} ${sups(p)}</div><div class="st"><span class="pill ${cls}">${esc(p.outcome)}</span>${eff}<span class="checks" aria-label="Specificity ${specOf(p)} of 4">${chk}</span><span class="badge d">Draft</span></div>${ev}</div>`;
  }
  function renderCards(race) {
    $("#cards").innerHTML = race.candidates.map((id) => {
      const c = CANDS[id];
      const facts = (c.facts || []).map((f) => `<div><span class="lbl">${esc(f.label)}</span><span>${esc(f.text)} ${sups(f)}</span></div>`).join("");
      const funds = c.funds ? `<details class="drawer"><summary>Funds for the district <span class="ctxonly">Context only · never scored</span></summary><div>
          <div class="funds">${c.funds.items.map((i) => `<div><small>${esc(i.label)}</small><b>${esc(i.value)}</b><small>${esc(i.sub)} ${sups(i)}</small></div>`).join("")}</div>
          ${c.funds.context.map((x) => `<p class="ctx" style="font-size:13px">${esc(x.text)} ${sups(x)}</p>`).join("")}
          <p class="dim" style="font-size:12.5px">${esc(c.funds.peer)}</p></div></details>` : "";
      const pr = c.promises && c.promises.length
        ? `<details class="drawer"><summary>Promise ledger (${c.promises.length})</summary><div>${c.promises.map(promiseHTML).join("")}<p class="dim" style="font-size:12px">M measurable · T time-bound · C costed · P within the office's power</p></div></details>`
        : `<details class="drawer"><summary>Promise ledger (0)</summary><div><p class="dim" style="font-size:13px">No sourced promises collected yet. Submit one through the corrections form on the Methodology page.</p></div></details>`;
      return `<article class="pcard" id="card-${id}">
        <div class="top"><span class="av">${esc(c.initials)}</span><div><h3>${esc(c.name)}</h3><small>${esc(c.party)} · ${esc(c.role)}</small></div><span class="tier ${c.track === "veteran" ? "starter" : "developing"}">${c.track === "veteran" ? "Veteran" : "Rookie"}</span></div>
        <div class="body">
          <div class="statline">${STATS.map((d) => statRow(c, d)).join("")}</div>
          <div class="facts">${facts}</div>
          ${funds}${c.money ? `<details class="drawer"><summary>Campaign money <span class="ctxonly">Context only · never scored</span></summary><div>
            <div class="funds">${c.money.items.map((i) => `<div><small>${esc(i.label)}</small><b>${esc(i.value)}</b>${i.sub ? `<small>${esc(i.sub)}</small>` : ""}</div>`).join("")}</div>
            <p class="dim" style="font-size:12.5px">${esc(c.money.note)} Through ${esc(c.money.asOf)}. ${sup(c.money.src)}</p></div></details>` : ""}${pr}
          <div class="row"><button class="btn small" type="button" data-cmp="${id}">Compare head-to-head</button></div>
        </div></article>`;
    }).join("");
  }
  $("#cards").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cmp]"); if (!b) return;
    h2hState = { race: raceId, a: b.dataset.cmp, b: RACE(raceId).candidates.find((x) => x !== b.dataset.cmp) };
    go("h2h");
  });
  function renderIssues(race) {
    $("#issuesbox").innerHTML = race.issues.map((i) => `<article class="issue"><div class="top"><span class="num">${i.n}</span><div><h3>${esc(i.title)}</h3><small>${esc(i.route)}</small></div></div>
      <div class="body"><p>${esc(i.does)}</p><p class="ctx"><b>Current law:</b> ${esc(i.now)}</p>
      <div class="yn"><div><b>Vote FOR</b><span>${esc(i.yes)}</span></div><div><b>Vote AGAINST</b><span>${esc(i.no)}</span></div></div>
      <div class="args"><p>${esc(i.pro)}</p><p>${esc(i.con)}</p></div><p class="srcs">Source: ${sup("uaex_guide")}</p></div></article>`).join("");
  }
  function renderRaces() {
    let race = RACE(raceId);
    if (!race) { raceId = RACES[0].id; race = RACES[0]; }
    renderRacePick(); renderRaceHead(race);
    const isIssues = !!race.issues;
    $("#issuesbox").hidden = !isIssues; $("#rankarea").hidden = isIssues; $("#cardarea").hidden = isIssues;
    if (isIssues) { renderIssues(race); return; }
    renderSliders(); renderRank(race); renderCards(race);
  }

  /* ---------- head to head ---------- */
  let h2hState = null;
  function renderH2H() {
    if (!h2hState) { const r = RACE(raceId) && !RACE(raceId).issues ? RACE(raceId) : RACE("ar3"); h2hState = { race: r.id, a: r.candidates[0], b: r.candidates[1] }; }
    const race = RACE(h2hState.race);
    $("#h2h-race").innerHTML = raceOptions(race.id, (r) => !r.issues && r.candidates.length > 1);
    const opts = (sel) => race.candidates.map((id) => `<option value="${id}" ${id === sel ? "selected" : ""}>${esc(CANDS[id].name)} (${esc(CANDS[id].party)})</option>`).join("");
    $("#h2h-a").innerHTML = opts(h2hState.a); $("#h2h-b").innerHTML = opts(h2hState.b);
    const A = CANDS[h2hState.a], B = CANDS[h2hState.b];
    const cell = (c, st, right) => {
      let txt;
      if (st.status === "na") txt = '<span class="dim">Not applicable</span>';
      else if (st.status === "pending") txt = '<span class="dim">Not collected yet</span>';
      else txt = `${esc(st.display)} ${sups(st)}${st.status === "draft" ? ' <span class="badge d">Draft</span>' : ""}${st.status === "fact" ? ' <span class="badge f">Not scored</span>' : ""}`;
      const m = typeof st.norm === "number" && counts(st, true) ? `<div class="bar2"><div class="meter"><i style="width:${Math.round(st.norm * 100)}%"></i></div></div>` : "";
      return `<div class="${right ? "r" : ""}">${txt}${m}</div>`;
    };
    let html = `<div class="hd"><div><h3>${esc(A.name)}</h3><small style="color:var(--board-muted)">${esc(A.party)} · ${esc(A.role)}</small></div><div class="mid">${race.sample ? "SAMPLE" : esc(race.short)}</div><div class="r"><h3>${esc(B.name)}</h3><small style="color:var(--board-muted)">${esc(B.party)} · ${esc(B.role)}</small></div></div>`;
    html += `<div class="sec">Track record</div>`;
    let ea = 0, eb = 0;
    STATS.forEach((d) => {
      const sa = statFor(A, d.key), sb = statFor(B, d.key);
      let mid = esc(d.label);
      if (counts(sa, incDraft) && counts(sb, incDraft) && Math.abs(sa.norm - sb.norm) > 0.05) {
        if (sa.norm > sb.norm) { mid = `<span class="edge">◀ edge</span><br>${mid}`; ea++; } else { mid = `<span class="edge">edge ▶</span><br>${mid}`; eb++; }
      }
      html += `<div class="ln">${cell(A, sa, false)}<div class="mid">${mid}</div>${cell(B, sb, true)}</div>`;
    });
    html += `<div class="ln"><div><b class="num">${ea}</b> edges</div><div class="mid">Scored edges</div><div class="r"><b class="num">${eb}</b> edges</div></div>`;
    html += `<div class="sec">Background</div>`;
    const bg = (c, right) => `<div class="${right ? "r" : ""}" style="font-size:13px">${(c.facts || []).slice(0, 2).map((f) => `<div>${esc(f.text)} ${sups(f)}</div>`).join("")}</div>`;
    html += `<div class="ln">${bg(A)}<div class="mid">Record</div>${bg(B, true)}</div>`;
    html += `<div class="sec">Positions · side by side, never scored</div>`;
    const topics = POSITION_TOPICS[race.office] || [];
    if (!topics.length) html += `<div class="ln"><div class="dim">Not yet sourced</div><div class="mid">Positions</div><div class="r dim">Not yet sourced</div></div>`;
    topics.forEach((t) => {
      const pa = A.positions && A.positions[t.key], pb = B.positions && B.positions[t.key];
      const pc = (p, right) => `<div class="${right ? "r" : ""}">${p ? esc(p.text) + " " + sups(p) : '<span class="dim">Not yet sourced</span>'}</div>`;
      html += `<div class="ln">${pc(pa)}<div class="mid">${esc(t.label)}</div>${pc(pb, true)}</div>`;
    });
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
      ["Cosponsor", "A member who formally signs on to support another member's bill."], ["Veto", "A governor's or president's rejection of a bill; legislatures can override with a supermajority."],
      ["Mill", "One-tenth of a cent per dollar of assessed property value, the unit of property tax rates."], ["LES", "Legislative Effectiveness Score from the Center for Effective Lawmaking; 1.0 is average."],
      ["Benchmark", "The score expected for a member with the same party status, seniority and committee role."]];
    $("#glossary").innerHTML = G.map(([k, v]) => `<div><span class="lbl">${k}</span><span>${v}</span></div>`).join("");
  }

  /* ---------- play ---------- */
  PLAYERS.forEach((p) => (p.pts = Math.round(p.events.reduce((a, e) => a + e[1], 0) * 10) / 10));
  const P = (id) => PLAYERS.find((p) => p.id === id);
  let roster = Object.assign({}, DEFAULT_ROSTER, store.get("roster", {}));
  let posFilter = "All";
  const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1);
  function renderPlay() {
    const mine = SLOTS.map(([k]) => roster[k]).filter(Boolean).map(P);
    const theirs = OPPONENT.roster.map(P);
    const ms = mine.reduce((a, p) => a + p.pts, 0), ts = theirs.reduce((a, p) => a + p.pts, 0);
    $("#scoreboard").innerHTML = `<div class="team"><b>Civic Sundays</b><small>You · 4–1 · Midwest Division</small><span class="pts ${ms >= ts ? "lead" : ""} num">${fmt(ms)}</span></div>
      <div class="mid">Week 6<br>Final Friday</div>
      <div class="team r"><b>${esc(OPPONENT.name)}</b><small>3–2 · South Division</small><span class="pts ${ts > ms ? "lead" : ""} num">${fmt(ts)}</span></div>`;
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
    $("#posfilter").innerHTML = ["All", "QB", "WR", "RB"].map((f) => `<button type="button" aria-pressed="${f === posFilter}" data-f="${f}">${f === "QB" ? "QB · Governors" : f === "WR" ? "WR · Senators" : f === "RB" ? "RB · House" : "All"}</button>`).join("");
    $("#pool").innerHTML = pool.length ? pool.map((p) => `<div class="slot"><span class="pos">${p.pos}</span><span class="nm">${esc(p.name)}<small>Party ${p.party} · ${p.team} · ${fmt(p.pts)} pts last week</small></span><span class="status ${p.status}">${p.status}</span><button class="btn small" type="button" data-draft="${p.id}">Draft</button></div>`).join("") : `<p class="dim">No available players at this position.</p>`;
    $("#scoretable").innerHTML = SCORING.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("");
  }
  $("#roster").addEventListener("click", (e) => { const b = e.target.closest("[data-drop]"); if (!b) return; roster[b.dataset.drop] = null; store.set("roster", roster); $("#draftmsg").textContent = ""; renderPlay(); });
  $("#posfilter").addEventListener("click", (e) => { const b = e.target.closest("[data-f]"); if (!b) return; posFilter = b.dataset.f; renderPlay(); });
  $("#pool").addEventListener("click", (e) => {
    const b = e.target.closest("[data-draft]"); if (!b) return;
    const p = P(b.dataset.draft);
    const order = SLOTS.filter(([, pos]) => pos === p.pos).map(([k]) => k).concat(["FLEX"]);
    const slot = order.find((k) => !roster[k]);
    if (!slot) { $("#draftmsg").textContent = `No open ${p.pos} or FLEX slot. Drop someone first.`; return; }
    roster[slot] = p.id; store.set("roster", roster);
    $("#draftmsg").textContent = `Drafted ${p.name} into ${slot.replace(/\d/, "")}.`; renderPlay();
  });
  $("#reset-roster").addEventListener("click", () => { roster = Object.assign({}, DEFAULT_ROSTER); store.set("roster", roster); $("#draftmsg").textContent = "Demo reset."; renderPlay(); });

  /* ---------- method ---------- */
  function renderMethod() {
    const statsList = STATS.map((s) => `<li><b>${esc(s.label)}</b> (${esc(s.who)}): ${esc(s.explain)}</li>`).join("");
    const srcList = SRC_IDS.map((id, i) => { const s = SOURCES[id]; return `<div><span class="id">[${i + 1}]</span><span>${esc(s.pub)}, “${esc(s.title)},” ${esc(s.date)}. <a href="${esc(s.url)}" target="_blank" rel="noopener">Link</a></span></div>`; }).join("");
    const subs = store.get("corrections", []);
    $("#methodbody").innerHTML = `
      <h3 id="m-principles">Principles</h3>
      <ol>
        <li>Score performance and transparency, never policy positions or the direction of any vote.</li>
        <li>No editorial "best candidate." Rankings come from the weights each visitor chooses; the default weighs every category equally.</li>
        <li>Every number links to a source. Unsourced values are labeled and left out of scores.</li>
        <li>Show context with every number: league average, peers, and the predecessor in the seat when available.</li>
        <li>Show sample sizes. Don't grade a candidate until there is enough verified data to do it honestly.</li>
      </ol>
      <h3 id="m-stats">The stats</h3>
      <ul>${statsList}</ul>
      <p>Governors and legislators get different stat sets. In the full build, governors are measured on budgets proposed against those enacted, vetoes, executive actions and appointments tied to promises, rather than bills sponsored.</p>
      <h3 id="m-score">Scoring and tiers</h3>
      <p>Each stat is scaled from 0 to 1 against a league baseline. The composite is the weighted average of every scored stat the candidate has:</p>
      <div class="formula">composite = Σ (weightᵢ × statᵢ) / Σ weightᵢ     over scored stats only

tier:  ≥ 0.75 Elite · ≥ 0.55 Starter · ≥ 0.35 Developing · otherwise Bench
gate:  no tier until at least 4 verified stats exist (draft ratings never count toward it)
confidence:  7–8 stats High · 5–6 Medium · 4 Low · any draft stat → Low</div>
      <p>How raw numbers become 0–1 stats:</p>
      <div class="formula">effectiveness = min(1, (LES ÷ CEL benchmark) ÷ 2)     meeting the benchmark = 0.50
attendance    = max(0, 1 − missed% ÷ 20)            league median (2.2% missed) ≈ 0.89
fact-checks   = average of ratings, where True 1 · Mostly True 0.75 · Half True 0.5
                · Mostly False 0.25 · False 0 · Pants on Fire 0
specificity   = average promise checklist score ÷ 4</div>
      <p>This prototype scales stats against fixed league baselines. The production method computes z-scores within peer groups of the same chamber, majority or minority status and seniority band, the way the Center for Effective Lawmaking compares each member to a benchmark ${sup("cel_faq")}.</p>
      <h3 id="m-promises">Promise rules</h3>
      <ul>
        <li>A promise is a specific, verifiable statement of a future action or outcome, sourced to the candidate's own words.</li>
        <li><b>Outcome</b> uses established fact-checking categories: Kept, Compromise, In progress, Stalled, Broken, Not yet rated ${sup("pf_promise")}.</li>
        <li><b>Effort</b> is tracked separately (introduced the bill, voted for it, issued an order, publicly pushed), because minority-party members can't control outcomes.</li>
        <li>Each promise gets a 0–4 specificity score: measurable, time-bound, costed, within the office's power. Promises are weighted by it, so a few vague promises can't inflate a kept rate.</li>
        <li>Every ledger entry in this prototype is a <b>draft</b> awaiting two-reviewer sign-off.</li>
      </ul>
      <h3 id="m-fair">Fairness rules</h3>
      <ul>
        <li><b>Debates</b> count only when a recognized nonpartisan host formally invited every qualifying candidate. Otherwise the debate history is shown as a fact. In the Ohio governor's race, that's why debate history appears on every card but scores no one.</li>
        <li><b>Earmark dollars</b> are context only. Totals track seniority and committee seats, and some members refuse earmarks on principle.</li>
        <li><b>Attendance</b> counts officially recorded roll calls. When an official has a documented family or medical absence, the stat is held as a draft until reviewers label those votes, so caregiving isn't silently penalized.</li>
        <li><b>Fact-check rates</b> appear only after 5 rated claims. The pilot uses PolitiFact rulings; the full build adds other fact-checkers through the shared ClaimReview format. Fact-checkers choose which claims to check, so every fact-check stat carries that caveat.</li>
        <li>Campaigns may submit a sourced response to any stat, shown beside it after review.</li>
      </ul>
      <h3 id="m-audit">Symmetry audit</h3>
      <p>The same code path scores every candidate; there is no party input anywhere in the scoring function. The full build will publish an audit each cycle that runs the rules on candidates from every party and reports the distribution of tiers, so anyone can check the rules treat them alike.</p>
      <h3 id="m-limits">Limitations of this prototype</h3>
      <ul>
        <li>Only two real races, sourced by hand from news coverage and campaign sites on ${AS_OF}.</li>
        <li>Promise ledgers are incomplete and unreviewed.</li>
        <li>Effectiveness, campaign finance and fact-check data are now imported for the pilot. Bipartisanship, direct House Clerk vote records and questionnaires are not connected yet, so real candidates still show "Not enough verified data." That is the method working as designed.</li>
        <li>CEL scores cover the 118th Congress (2023–24). Scores for the current Congress publish after it ends.</li>
        <li>Tiers for real candidates come from prototype formulas that haven't had outside review. Incumbents can be graded before challengers because they have public records, so a missing tier says nothing about a candidate.</li>
        <li>Arkansas legislative attendance and bill records aren't connected yet, so state legislators are scored on effectiveness only for now.</li>
        <li>ZIP lookup uses Census ZIP tabulation areas, which don't match postal ZIPs exactly. ZIPs that span two districts ask you to confirm with your county clerk.</li>
      </ul>
      <h3 id="m-feeds">Data feeds</h3>
      <div class="tablebox"><table class="rank-table feeds">
        <tr><th>Feed</th><th>Feeds this stat</th><th>Status</th><th>Last pulled</th></tr>
        ${FEEDS.map((f) => `<tr><td><b>${esc(f.name)}</b><br><span class="dim" style="font-size:12.5px">${esc(f.org)} · ${esc(f.how)}</span></td><td>${esc(f.stat)}</td><td><span class="feed ${f.state}">${{ live: "Live", partial: "Partial", next: "Next", manual: "Reviewed by hand" }[f.state]}</span></td><td class="cov">${esc(f.last)}</td></tr><tr class="sub"><td colspan="4" class="dim" style="font-size:12.5px;padding-top:0">${esc(f.note)}</td></tr>`).join("")}
      </table></div>
      <h3 id="m-corr">Corrections</h3>
      <p>Anyone can submit a sourced correction. Every change is reviewed and logged publicly.</p>
      <div class="log">
        <div><span class="d">Oct 23, 2026</span><span>Corrected Womack's attendance. The card showed only his 8,823-vote career streak; it now shows the current term (72 of 676 roll calls missed), held as draft until absences tied to his wife's illness are labeled from official records.</span></div>
        <div><span class="d">Oct 23, 2026</span><span>Imported CEL effectiveness scores, FEC campaign summaries, PolitiFact rulings and the Census ZIP-to-district map. Renamed to Stump League.</span></div>
        <div><span class="d">Oct 23, 2026</span><span>Prototype launched with AR-3 and OH-GOV pilot data. All promise ratings marked draft.</span></div>
        ${subs.map((s) => `<div><span class="d">Your draft</span><span>${esc(s.who)} · ${esc(s.stat)}: ${esc(s.text)} ${s.url ? `(<a href="${esc(s.url)}" target="_blank" rel="noopener">source</a>)` : ""}</span></div>`).join("")}
      </div>
      <form class="corr" id="corrform">
        <div class="g">
          <label class="lab">Candidate <select class="input" id="c-who">${Object.entries(CANDS).filter(([, c]) => !c.sample).map(([id, c]) => `<option>${esc(c.name)}</option>`).join("")}</select></label>
          <label class="lab">Stat or fact <select class="input" id="c-stat">${STATS.map((s) => `<option>${esc(s.label)}</option>`).join("")}<option>Promise ledger</option><option>Background fact</option></select></label>
        </div>
        <label class="lab">What should change <input class="input" id="c-text" required placeholder="Describe the correction"></label>
        <label class="lab">Source link <input class="input" id="c-url" type="url" placeholder="https://"></label>
        <div class="row"><button class="btn primary" type="submit">Save correction</button><span class="toast" id="c-msg" aria-live="polite"></span></div>
        <p class="dim" style="font-size:12.5px">In this prototype, corrections are saved on this device only. In the full build they go to the public review queue.</p>
      </form>
      <h3 id="m-src">Sources</h3>
      <div class="srclist">${srcList}</div>
      <p class="dim" style="font-size:12.5px">Election totals in the ticker: NCSL reports 6,139 of 7,386 state legislative seats and 36 governorships on the ballot ${sup("ballotpedia_counts")}.</p>`;
    $("#corrform").addEventListener("submit", (e) => {
      e.preventDefault();
      const s = { who: $("#c-who").value, stat: $("#c-stat").value, text: $("#c-text").value.trim(), url: $("#c-url").value.trim() };
      if (!s.text) return;
      const all = store.get("corrections", []); all.push(s); store.set("corrections", all);
      renderMethod(); $("#c-msg").textContent = "Saved on this device and added to the log above.";
    });
  }
  $(".toc").addEventListener("click", (e) => { const a = e.target.closest("[data-jump]"); if (!a) return; e.preventDefault(); document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" }); });

  /* ---------- boot ---------- */
  $("#asof").textContent = AS_OF; $$(".asof2").forEach((x) => (x.textContent = AS_OF));
  renderBallot($("#zip").value);
  renderLearn(); renderMethod();
  show(location.hash.slice(1) || "scout");

  /* When hosted next to the pipeline's output (GitHub Pages), read the latest nightly files and
     update feed status and candidate stats. Elsewhere the files aren't there and the embedded
     data stays as is. Live data never upgrades a draft to verified: review rules still apply. */
  const FEED_KEYS = { members: "Member IDs", zips: "ZIP to district", cel: "Legislative Effectiveness Scores", cel_state: "State legislative effectiveness", fec: "Campaign finance", votes: "Roll-call votes", senate_votes: "Senate roll-call votes", bills: "Bills and cosponsors", factchecks: "Fact-check rulings" };
  const fmtDate = (d) => { try { return new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch (e) { return d; } };
  const getJSON = (f) => fetch("data/" + f + ".json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const pct = (x, d = 0) => (100 * x).toFixed(d) + "%";
  const money = (x) => (x >= 1e6 ? "$" + (x / 1e6).toFixed(2) + "M" : "$" + (x / 1e3).toFixed(1) + "K");
  function liveSource(key, dp, title) {
    if (!SOURCES[key]) SRC_IDS.push(key);
    SOURCES[key] = { pub: dp.publisher, title: title, date: "retrieved " + fmtDate(dp.retrieved_at), url: dp.source_url };
    return key;
  }
  function setStat(c, key, upd) {
    const cur = c.stats[key] || {};
    c.stats[key] = Object.assign({}, cur, upd, { status: cur.status === "draft" ? "draft" : "verified" });
  }
  Promise.all(["manifest", "cel", "attendance", "bipartisanship", "fec", "factchecks", "cel_state", "senate_attendance"].map(getJSON)).then(([m, cel, att, bip, fec, fc, cels, satt]) => {
    if (!m) return;
    Object.entries(FEED_KEYS).forEach(([k, name]) => {
      const f = FEEDS.find((x) => x.name === name), e = m[k];
      if (!f || !e) return;
      if (e.state === "live") { f.state = "live"; f.last = fmtDate(e.last); }
      else if (e.state === "error") { f.state = "partial"; f.note = "Last nightly run couldn't reach this source (" + fmtDate(e.checked) + "). Showing the most recent good data. " + f.note; }
    });
    if (m._run) { const a = $("#asof"); if (a) a.textContent = fmtDate(m._run.date); $$(".asof2").forEach((x) => (x.textContent = fmtDate(m._run.date))); }
    Object.entries(CANDS).forEach(([id, c]) => {
      const ids = c.ids; if (!ids) return;
      const b = ids.bioguide;
      if (b && cel && cel[b]) {
        const v = cel[b].value, word = { MEETS: "meets", EXCEEDS: "exceeds", BELOW: "below" }[v.expectation] + " expectations";
        setStat(c, "effectiveness", { norm: v.norm, display: v.les.toFixed(2) + " LES · " + word,
          sub: "Benchmark for members like this: " + v.benchmark.toFixed(2) + " · " + ord(v.party_rank) + " of " + v.party_total + " in the same party · " + v.congress + "th Congress",
          src: liveSource("live_cel", cel[b], "Legislative Effectiveness Scores, " + v.congress + "th Congress") });
      }
      if (b && att && att[b]) {
        const v = att[b].value;
        setStat(c, "attendance", { norm: v.norm, display: v.missed + " of " + v.total + " roll calls missed (" + pct(v.missed / v.total, 1) + ")",
          src: liveSource("live_votes", att[b], "Roll-call votes, " + v.years.join("–")) });
      } else if (b && satt && satt[b]) {
        const v = satt[b].value;
        setStat(c, "attendance", { norm: v.norm, display: v.missed + " of " + v.total + " roll calls missed (" + pct(v.missed / v.total, 1) + ")",
          src: liveSource("live_svotes", satt[b], "Senate roll-call votes, " + v.congress + "th Congress") });
      }
      if (ids.sles && cels && cels[ids.sles]) {
        const v = cels[ids.sles].value, word = { MEETS: "meets", EXCEEDS: "exceeds", BELOW: "below" }[v.expectation] + " expectations";
        setStat(c, "effectiveness", { norm: v.norm, display: v.sles.toFixed(2) + " SLES · " + word,
          sub: "Benchmark " + v.benchmark.toFixed(2) + " · " + ord(v.party_rank) + " of " + v.party_total + " " + (v.majority ? "majority" : "minority") + "-party members · Arkansas " + (v.chamber === "lower" ? "House" : "Senate") + " " + v.term.replace("-", "–"),
          src: liveSource("live_cels", cels[ids.sles], "State Legislative Effectiveness Scores, Arkansas " + v.term) });
      }
      if (b && bip && bip[b]) {
        const v = bip[b].value, n = Math.round(v.share * v.bills);
        setStat(c, "bipartisan", { norm: v.share, display: pct(v.share) + " of bills",
          sub: n + " of " + v.bills + " bills and joint resolutions drew a cosponsor from another party · " + v.congress + "th Congress",
          src: liveSource("live_bills_" + b, bip[b], "Sponsored legislation and cosponsors, " + v.congress + "th Congress") });
      }
      if (ids.fec && fec && fec[ids.fec] && c.money) {
        const v = fec[ids.fec].value, r = v.receipts;
        c.money.items = [
          { label: "Raised this cycle", value: money(r) },
          { label: "From PACs and party committees", value: pct(v.pac_share, 1), sub: money(r * v.pac_share) },
          { label: "From donors giving $200 or less", value: pct(v.small_donor_share, 1), sub: money(r * v.small_donor_share) } ];
        c.money.note = "Larger individual donors gave " + pct(v.large_donor_share) + " (" + money(r * v.large_donor_share) + ").";
        c.money.asOf = fmtDate(v.coverage_end_date);
        c.money.src = liveSource("live_fec_" + ids.fec, fec[ids.fec], "Campaign finance summary, 2025–2026");
      }
      if (ids.factcheck && fc && fc[ids.factcheck] && fc[ids.factcheck].value.norm != null) {
        const v = fc[ids.factcheck].value, pubs = {};
        let good = 0;
        v.reviews.forEach((r) => { const t = (r.rating || "").toLowerCase(); if (["true", "mostly true", "correct", "accurate", "mostly correct", "mostly accurate", "geppetto checkmark", "one pinocchio"].includes(t)) good++; pubs[r.publisher] = (pubs[r.publisher] || 0) + 1; });
        setStat(c, "factcheck", { norm: v.norm, display: good + " of " + v.n + " rated mostly true or better",
          sub: v.n + " scored rulings from " + Object.keys(pubs).join(", ") + (v.unmapped ? " · " + v.unmapped + " more use labels outside the standard scale and aren't scored" : ""),
          src: liveSource("live_fc_" + id, fc[ids.factcheck], "Fact-check rulings on " + c.name), src2: null });
      }
    });
    renderMethod();
    const v = location.hash.slice(1);   // re-render in place, without scrolling the reader
    if (v === "races") renderRaces(); else if (v === "h2h") renderH2H();
  }).catch(() => {});
})();
