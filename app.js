/* Times Table Gym - Level 2 webapp UI (no framework, no build step).
   All scoring/technique/mastery rules come from engine.js (parity-tested vs
   tables.py). Lesson content comes from lessons.js (generated from lessons.json).
   Persistence: localStorage, one blob per profile. */
(function () {
  "use strict";
  const E = window.Engine;
  const LESSONS = window.LESSONS;
  const $ = (sel, el = document) => el.querySelector(sel);
  const view = $("#view");

  const nowSec = () => Math.floor(Date.now() / 1000);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---- storage ----------------------------------------------------------
  const LS = {
    profiles() { try { return JSON.parse(localStorage.getItem("ttg.profiles") || "[]"); } catch (e) { return []; } },
    setProfiles(a) { localStorage.setItem("ttg.profiles", JSON.stringify(a)); },
    active() { return localStorage.getItem("ttg.active") || ""; },
    setActive(n) { localStorage.setItem("ttg.active", n); },
    key(n) { return "ttg.user." + n; },
    load(n) {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(this.key(n))); } catch (e) { d = null; }
      return E.normalizeUser(d, n);
    },
    save(d) { localStorage.setItem(this.key(d.user), JSON.stringify(d)); },
    // Most-recently-created match-by-code, kept per creator so a lost code is
    // recoverable from the Two-player landing (task #22).
    lastMatchKey(n) { return "ttg.lastmatch." + n; },
    loadLastMatch(n) {
      try { return JSON.parse(localStorage.getItem(this.lastMatchKey(n))); } catch (e) { return null; }
    },
    saveLastMatch(n, obj) { localStorage.setItem(this.lastMatchKey(n), JSON.stringify(obj)); },
  };

  function ensureProfile(name) {
    const ps = LS.profiles();
    if (!ps.includes(name)) { ps.push(name); LS.setProfiles(ps); }
    if (!localStorage.getItem(LS.key(name))) LS.save(E.newUserData(name));
  }
  function activeUser() { return LS.load(LS.active()); }

  // Robust click-to-copy for the match codes. The async Clipboard API is often
  // unavailable when the app is opened from file:// (not a secure context), so
  // the old handler fell through to "press Ctrl/Cmd+C" and users manually
  // drag-selected a long code and clipped the end -> "invalid code" (task #25).
  // Now: try the Clipboard API, then a real execCommand('copy') that works on
  // file://, and ALWAYS leave the full code selected so even a manual copy
  // grabs everything. Shows an explicit success/needs-manual state.
  async function copyCodeFrom(ta, msgEl, btn) {
    if (!ta) return false;
    ta.focus();
    ta.select();
    try { ta.setSelectionRange(0, ta.value.length); } catch (e) { /* older engines */ }
    let ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) { ok = false; }
    }
    if (!ok) { try { ok = document.execCommand("copy"); } catch (e) { ok = false; } }
    if (msgEl) {
      msgEl.textContent = ok
        ? "Copied to clipboard."
        : "Full code selected — press Ctrl/Cmd+C to copy it all.";
      // .err suppresses theo's green ✓ and shows honest red guidance on true
      // failure; cleared on success since the element persists (failure→success).
      msgEl.classList.toggle("err", !ok);
    }
    if (btn) {
      const orig = btn.dataset.label || btn.textContent;
      btn.dataset.label = orig;
      btn.textContent = ok ? "Copied ✓" : "Copy failed — press Ctrl/C";
      setTimeout(() => { btn.textContent = btn.dataset.label; }, 1600);
    }
    return ok;
  }

  // ---- shared quiz runner ----------------------------------------------
  let lastFeedback = "";

  function askQuestion(host, i, j, label) {
    return new Promise((resolve) => {
      host.innerHTML =
        `<div class="quiz-meta">${esc(label || "")}</div>
         <div class="quiz-q">${i} &times; ${j}</div>
         <div class="quiz-answer">
           <input id="ans" type="number" inputmode="numeric" autocomplete="off" aria-label="your answer">
           <button id="go" class="primary" type="button">Enter</button>
         </div>
         <div class="feedback">${lastFeedback}</div>`;
      const input = $("#ans", host), go = $("#go", host);
      input.focus();
      const t0 = Date.now();
      let done = false;
      function submit() {
        if (done) return; done = true;
        const raw = input.value.trim();
        let given = null;
        if (raw !== "" && /^-?\d+$/.test(raw)) given = parseInt(raw, 10);
        resolve({ given, rt: (Date.now() - t0) / 1000 });
      }
      go.addEventListener("click", submit);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    });
  }

  function feedbackHTML(correct, given, i, j, rt, nameTech, forceTech) {
    if (correct) return `<span class="good">&#10003; ${i}&times;${j} = ${i * j} &mdash; correct (${rt.toFixed(1)}s)</span>`;
    const said = given === null ? "no answer" : "you said " + given;
    let h = `<span class="bad">&#10007; ${said}; ${i}&times;${j} = ${i * j}</span>`;
    if (nameTech) {
      const tid = forceTech || E.mapTechnique(i, j);
      const l = LESSONS.find((x) => x.id === tid);
      h += `<span class="tech">&rarr; technique: ${esc(l ? l.title : tid)}`
        + ` <button type="button" class="linkish" data-showlesson="${esc(tid)}">learn it</button></span>`;
    }
    return h;
  }

  // Runs a quiz. `next(n)` returns [i,j] or null to stop.
  async function quizLoop(host, next, opts) {
    opts = opts || {};
    let score = 0, total = 0, n = 0;
    const results = [];
    let missedAt = null;
    lastFeedback = "";
    while (true) {
      const q = next(n);
      if (!q) break;
      const [i, j] = q;
      const { given, rt } = await askQuestion(host, i, j, opts.labeler ? opts.labeler(n) : "");
      const correct = given === i * j;
      n++; total += rt; if (correct) score++;
      results.push({ i, j, correct, rt });
      if (opts.user) E.record(opts.user, i, j, correct, rt, nowSec());
      lastFeedback = feedbackHTML(correct, given, i, j, rt, opts.nameTechnique, opts.forceTechnique);
      if (opts.stopOnMiss && !correct) { missedAt = [i, j]; break; }
    }
    return { score, total, n, results, missedAt };
  }

  // ---- small render helpers --------------------------------------------
  function pct(x) { return Math.round(x * 100); }

  function summaryPanel(res, extraHTML) {
    const acc = res.n ? res.score / res.n : 0;
    const avg = res.n ? res.total / res.n : 0;
    return `<div class="panel">
      <div class="feedback">${lastFeedback}</div>
      <h2>Summary</h2>
      <p class="big">${res.score}/${res.n}</p>
      <p>Accuracy ${pct(acc)}% &middot; Avg time ${avg.toFixed(1)}s</p>
      ${extraHTML || ""}
      <button class="primary" id="doneBtn" type="button">Done</button>
    </div>`;
  }

  // ---- VIEWS ------------------------------------------------------------
  const views = {};

  // Friendly, motivational copy for the ONE headline "overall mastery" verdict
  // on the Gym tile (elle: a bare "weak" under a big number reads as a
  // judgement). View-layer only: engine.js keeps the technical bins 1:1 with
  // tables.py (parity), and the heatmap legend still shows the technical scale.
  const OVERALL_LABEL = {
    "not started": "just starting",
    weak: "warming up",
    ok: "getting there",
    strong: "strong",
    mastered: "mastered",
  };

  views.gym = function () {
    const u = activeUser();
    const om = E.overallMastery(u);
    const cols = E.grid();
    // heatmap
    let head = '<tr><th></th>' + cols.map((c) => `<th>${c}</th>`).join("") + "</tr>";
    let rows = "";
    for (const i of cols) {
      let tds = "";
      for (const j of cols) {
        const cell = E.peekCell(u, i, j);
        const bin = E.masteryBin(cell);
        const m = E.cellMastery(cell);
        const title = m === null
          ? `${i}×${j}=${i * j} — not practised`
          : `${i}×${j}=${i * j} — ${E.BIN_LABEL[bin]}, mastery ${pct(m)}%, `
            + `acc ${pct(cell.correct / cell.attempts)}%, avg ${(cell.total_time / cell.attempts).toFixed(1)}s`;
        tds += `<td class="b-${bin}" title="${esc(title)}">${E.BIN_SYMBOL[bin]}</td>`;
      }
      rows += `<tr><th class="rowh">${i}</th>${tds}</tr>`;
    }
    const legend = E.BINS.map((b) =>
      `<span><span class="swatch b-${b}">${E.BIN_SYMBOL[b]}</span>${E.BIN_LABEL[b]}</span>`).join("");
    // lessons
    const lessonList = LESSONS.map((l) => {
      const st = E.lessonState(u, l.id);
      const cls = st === "mastered" ? "mastered" : st === "practicing" ? "practicing" : "";
      return `<li><span class="badge ${cls}">${st}</span> ${esc(l.title)}</li>`;
    }).join("");
    // weakest
    const weak = E.weakestCells(u, 10);
    const weakList = weak.length ? weak.map(([i, j]) => {
      const c = E.peekCell(u, i, j);
      const m = E.cellMastery(c);
      return `<li><span class="code">${i}×${j}=${i * j}</span> &mdash; mastery ${pct(m)}%, `
        + `acc ${pct(c.correct / c.attempts)}%, avg ${(c.total_time / c.attempts).toFixed(1)}s `
        + `<span class="muted">[${esc(E.mapTechnique(i, j))}]</span></li>`;
    }).join("") : `<li class="muted">Nothing yet &mdash; play Drill or Tablerun to build a profile.</li>`;

    view.innerHTML = `<h1>Gym &mdash; ${esc(u.user)}</h1>
      <div class="tiles">
        <div class="tile"><div class="k">Overall mastery</div><div class="v">${pct(om.score)}%</div><div class="muted">${esc(OVERALL_LABEL[om.label] || om.label)}</div></div>
        <div class="tile"><div class="k">Coverage</div><div class="v">${om.coverage}/${om.totalCells}</div><div class="muted">cells seen</div></div>
        <div class="tile"><div class="k">Streak</div><div class="v">${u.streak_current || 0}</div><div class="muted">best ${u.streak_best || 0}</div></div>
      </div>
      <div class="panel">
        <h2>Mastery heatmap</h2>
        <p class="muted">Rows = left number, columns = right number. Hover a cell for its stats.</p>
        <div class="heatwrap"><table class="heat">${head}${rows}</table></div>
        <div class="legend">${legend}</div>
      </div>
      <div class="panel"><h2>Lesson progress</h2><ul class="list">${lessonList}</ul></div>
      <div class="panel"><h2>Top 10 weakest cells</h2><ul class="list">${weakList}</ul></div>`;
  };

  views.play = function () {
    view.innerHTML = `<h1>Play</h1>
      <div class="panel">
        <h2>Drill &mdash; quick-fire sprint</h2>
        <div class="row">
          <label><input type="radio" name="dmode" value="time" checked> Time</label>
          <input id="dtime" type="number" value="60" min="1" style="width:80px"> s
          <label><input type="radio" name="dmode" value="count"> Count</label>
          <input id="dcount" type="number" value="15" min="1" style="width:80px"> questions
          <button class="primary" id="startDrill" type="button">Start drill</button>
        </div>
      </div>
      <div class="panel">
        <h2>Survival &mdash; until first miss</h2>
        <button class="primary" id="startSurv" type="button">Start survival</button>
      </div>
      <div class="panel">
        <h2>Tablerun &mdash; one full row</h2>
        <div class="row">
          <label>Row N (2&ndash;25): <input id="trn" type="number" value="7" min="2" max="25" style="width:80px"></label>
          <button class="primary" id="startTr" type="button">Start tablerun</button>
        </div>
      </div>`;

    $("#startDrill").onclick = () => {
      const mode = view.querySelector('input[name="dmode"]:checked').value;
      const u = activeUser();
      let next, labeler, timerDeadline;
      if (mode === "count") {
        const count = Math.max(1, parseInt($("#dcount").value, 10) || 15);
        next = (n) => (n < count ? E.randCell() : null);
        labeler = (n) => `[${n + 1}/${count}]  answer as many as you can`;
      } else {
        const secs = Math.max(1, parseInt($("#dtime").value, 10) || 60);
        timerDeadline = Date.now() + secs * 1000;
        next = () => (Date.now() < timerDeadline ? E.randCell() : null);
        labeler = (n) => `[${n + 1}]  keep going until time runs out`;
      }
      runAndSummarize(u, next, { user: u, labeler, timerDeadline }, () => "");
    };
    $("#startSurv").onclick = () => {
      const u = activeUser();
      runAndSummarize(u, () => E.randCell(), {
        user: u, stopOnMiss: true, labeler: (n) => `streak ${n}`,
      }, (res) => res.missedAt
        ? `<p>Survival streak: <b>${res.score}</b> (missed on ${res.missedAt[0]}×${res.missedAt[1]}). Best ever: ${u.streak_best}.</p>`
        : "");
    };
    $("#startTr").onclick = () => {
      const n = parseInt($("#trn").value, 10);
      if (!(n >= 2 && n <= 25)) { alert("Row N must be 2..25"); return; }
      const u = activeUser();
      const cells = E.rowCells(n);
      runAndSummarize(u, (k) => (k < cells.length ? cells[k] : null),
        { user: u, labeler: (k) => `[${k + 1}/${cells.length}]  the ${n} row` }, () => "");
    };
  };

  // run a single-player quiz then show summary + save.
  // opts.timerDeadline (epoch ms): renders a live countdown element (#drillClock)
  // that lives OUTSIDE the per-question host (which askQuestion overwrites), so a
  // time-boxed sprint has visible urgency. theo styles .drill-clock / #drillClock.
  async function runAndSummarize(u, next, opts, extra) {
    view.innerHTML = "";
    let clock = null, timer = null;
    if (opts.timerDeadline) {
      clock = document.createElement("div");
      clock.className = "drill-clock";
      clock.id = "drillClock";
      const tick = () => {
        const remMs = Math.max(0, opts.timerDeadline - Date.now());
        const s = Math.ceil(remMs / 1000);
        clock.textContent = s + "s left";
        clock.classList.toggle("ending", remMs <= 10000);
      };
      tick();
      timer = setInterval(tick, 250);
      view.appendChild(clock);
    }
    const host = document.createElement("div");
    host.className = "panel";
    view.appendChild(host);
    try {
      const res = await quizLoop(host, next, opts);
      if (opts.user) LS.save(opts.user);
      host.innerHTML = summaryPanel(res, extra(res));
      $("#doneBtn", host).onclick = () => render();
    } finally {
      if (timer) clearInterval(timer);
      if (clock) clock.remove();
    }
  }

  views.lessons = function (arg) {
    if (arg && arg.show) return renderLessonShow(arg.show);
    const u = activeUser();
    const items = LESSONS.map((l) => {
      const st = E.lessonState(u, l.id);
      const cls = st === "mastered" ? "mastered" : st === "practicing" ? "practicing" : "";
      return `<li>
        <span class="badge ${cls}">${st}</span> <b>${esc(l.title)}</b>
        <span class="row" style="float:right">
          <button type="button" data-show="${esc(l.id)}">Show</button>
          <button type="button" class="primary" data-practice="${esc(l.id)}">Practice</button>
        </span></li>`;
    }).join("");
    view.innerHTML = `<h1>Lessons</h1><div class="panel"><ul class="list">${items}</ul></div>`;
    view.querySelectorAll("[data-show]").forEach((b) =>
      b.onclick = () => renderLessonShow(b.getAttribute("data-show")));
    view.querySelectorAll("[data-practice]").forEach((b) =>
      b.onclick = () => startPractice(b.getAttribute("data-practice")));
  };

  function renderLessonShow(id) {
    const l = LESSONS.find((x) => x.id === id);
    if (!l) return views.lessons();
    const ex = l.examples.map((e) => `<li>${esc(e)}</li>`).join("");
    view.innerHTML = `<h1>${esc(l.title)}</h1>
      <div class="panel">
        <p>${esc(l.explanation)}</p>
        <h2>Worked examples</h2><ul>${ex}</ul>
        <div class="row">
          <button class="primary" data-practice="${esc(l.id)}" type="button">Practice this</button>
          <button data-back="1" type="button">Back to lessons</button>
        </div>
      </div>`;
    $("[data-practice]").onclick = () => startPractice(l.id);
    $("[data-back]").onclick = () => views.lessons();
  }

  async function startPractice(id) {
    const l = LESSONS.find((x) => x.id === id);
    const u = activeUser();
    const pool = l.pool.map((c) => [c[0], c[1]]);
    const cells = E.sample(pool, E.LESSON_PRACTICE_COUNT);
    const host = document.createElement("div");
    host.className = "panel";
    view.innerHTML = `<h1>Practice &mdash; ${esc(l.title)}</h1><p class="panel">${esc(l.explanation)}</p>`;
    view.appendChild(host);
    const res = await quizLoop(host, (k) => (k < cells.length ? cells[k] : null), {
      user: u, nameTechnique: true, forceTechnique: id,
      labeler: (k) => `[${k + 1}/${cells.length}]`,
    });
    const acc = res.n ? res.score / res.n : 0;
    const prog = E.applyLessonResult(u, id, acc);
    LS.save(u);
    host.innerHTML = summaryPanel(res,
      `<p>Lesson progress: <b>${prog.state}</b> (best accuracy ${pct(prog.best_accuracy)}%)</p>`);
    $("#doneBtn", host).onclick = () => views.lessons();
  }

  views.puzzles = function () {
    view.innerHTML = `<h1>Puzzles</h1>
      <div class="panel">
        <h2>Weakness puzzle</h2>
        <p class="muted">Quizzes your weakest recorded cells; each miss names the technique.</p>
        <button class="primary" id="pWeak" type="button">Start weak puzzle</button>
      </div>
      <div class="panel">
        <h2>Section challenges</h2>
        <p class="muted">Pass bar: &ge;${pct(E.PASS_ACCURACY)}% accuracy AND avg &lt; ${E.PASS_AVG_TIME}s.</p>
        <div class="row">
          <label>Row N: <input id="pRowN" type="number" value="9" min="2" max="25" style="width:70px"></label>
          <button class="primary" id="pRow" type="button">Row</button>
        </div>
        <div class="row" style="margin-top:8px">
          <label>Block: <input id="pBlock" type="text" value="12-15x2-9" style="width:130px" class="code"></label>
          <button class="primary" id="pBlockGo" type="button">Block</button>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="primary" id="pDiag" type="button">Diagonal (squares)</button>
        </div>
      </div>`;

    $("#pWeak").onclick = () => {
      const u = activeUser();
      const cells = E.weakestCells(u, E.PUZZLE_WEAK_COUNT);
      if (!cells.length) { alert("No recorded cells yet. Play Drill or Tablerun first."); return; }
      runAndSummarize(u, (k) => (k < cells.length ? cells[k] : null),
        { user: u, nameTechnique: true, labeler: (k) => `[${k + 1}/${cells.length}] weakest cells` }, () => "");
    };
    $("#pRow").onclick = () => {
      const n = parseInt($("#pRowN").value, 10);
      const cells = E.rowCells(n);
      if (!cells) { alert("Row N must be 2..25"); return; }
      runSection(`Row ${n}`, cells);
    };
    $("#pBlockGo").onclick = () => {
      const cells = E.blockCells($("#pBlock").value);
      if (!cells) { alert("Bad block spec. Example: 12-15x2-9"); return; }
      runSection(`Block ${$("#pBlock").value}`, cells);
    };
    $("#pDiag").onclick = () => runSection("Squares diagonal", E.diagonalCells());
  };

  async function runSection(label, cells) {
    const u = activeUser();
    let note = "";
    if (cells.length > E.SECTION_MAX_CELLS) { cells = E.sample(cells, E.SECTION_MAX_CELLS); note = " (30 sampled)"; }
    cells = E.shuffle(cells);
    const host = document.createElement("div");
    host.className = "panel";
    view.innerHTML = `<h1>Section challenge</h1><p class="panel">${esc(label)}${note}</p>`;
    view.appendChild(host);
    const res = await quizLoop(host, (k) => (k < cells.length ? cells[k] : null),
      { user: u, nameTechnique: true, labeler: (k) => `[${k + 1}/${cells.length}] ${label}` });
    LS.save(u);
    const pb = E.passBar(res.score, res.total, res.n);
    const bar = `<p>Accuracy ${pct(pb.accuracy)}% (need &ge;${pct(pb.needAccuracy)}%) ${pb.okAccuracy ? "OK" : "MISS"}<br>`
      + `Avg time ${pb.avgTime.toFixed(1)}s (need &lt;${pb.needTime}s) ${pb.okTime ? "OK" : "MISS"}</p>`
      + `<p class="${pb.passed ? "pass" : "fail"}">RESULT: ${pb.passed ? "PASS" : "FAIL"}</p>`;
    host.innerHTML = summaryPanel(res, bar);
    $("#doneBtn", host).onclick = () => views.puzzles();
  }

  // ---- Two-player -------------------------------------------------------
  function recallCardHTML() {
    const lm = LS.loadLastMatch(LS.active());
    if (!lm || !lm.code) return "";
    let when = "";
    try { when = new Date(lm.created * 1000).toLocaleString(); } catch (e) { when = ""; }
    return `<div class="panel" id="lastMatch">
        <h2>Your last match code</h2>
        <p class="muted">Created <span>${esc(when)}</span> &middot; you scored ${lm.score}/${lm.total}. Share it or play a rematch.</p>
        <textarea id="lastMatchCode" readonly>${esc(lm.code)}</textarea>
        <div class="row"><button class="primary" id="copyLastCode" type="button">Copy code</button></div>
        <div id="lastCopyMsg" class="muted"></div>
      </div>`;
  }

  views.twoplayer = function () {
    view.innerHTML = `<h1>Two-player</h1>
      ${recallCardHTML()}
      <div class="panel">
        <h2>Hot-seat</h2>
        <p class="muted">Both players play the same ${E.RACE_QUESTIONS} questions on this device, in turn.</p>
        <div class="row">
          <label>Player 1: <input id="hsP1" type="text" value="${esc(LS.active())}" style="width:120px"></label>
          <label>Player 2: <input id="hsP2" type="text" value="player2" style="width:120px"></label>
          <button class="primary" id="hsGo" type="button">Start hot-seat</button>
        </div>
      </div>
      <div class="panel">
        <h2>Match by code</h2>
        <p class="muted">No server: generate a code, share it, opponent pastes it in to play the same set and see the comparison.</p>
        <div class="row">
          <label>Your name: <input id="mcName" type="text" value="${esc(LS.active())}" style="width:120px"></label>
          <button class="primary" id="mcCreate" type="button">Create &amp; play a match</button>
        </div>
        <hr>
        <p>Received a code? Paste it here to play the same questions:</p>
        <textarea id="mcPaste" placeholder="paste match code (starts with TTG1.)"></textarea>
        <div class="row"><label>Your name: <input id="mcPlayName" type="text" value="${esc(LS.active())}" style="width:120px"></label>
          <button class="primary" id="mcPlay" type="button">Load &amp; play</button></div>
        <div id="mcErr" class="err"></div>
      </div>`;

    const copyLast = $("#copyLastCode");
    if (copyLast) copyLast.onclick = () => copyCodeFrom($("#lastMatchCode"), $("#lastCopyMsg"), copyLast);
    $("#hsGo").onclick = () => {
      const p1 = ($("#hsP1").value || "").trim(), p2 = ($("#hsP2").value || "").trim();
      if (!p1 || !p2) { alert("Enter both player names."); return; }
      if (p1 === p2) { alert("Players need different names."); return; }
      startHotSeat(p1, p2);
    };
    $("#mcCreate").onclick = () => {
      const name = ($("#mcName").value || "").trim();
      if (!name) { alert("Enter your name."); return; }
      startCreateMatch(name);
    };
    $("#mcPlay").onclick = () => {
      const name = ($("#mcPlayName").value || "").trim();
      const match = E.decodeMatch($("#mcPaste").value);
      if (!match) { $("#mcErr").textContent = "That doesn't look like a valid match code."; return; }
      if (!name) { alert("Enter your name."); return; }
      if (name === match.by) { $("#mcErr").textContent = "Use a different name than the match creator (" + match.by + ")."; return; }
      startPlayMatch(name, match);
    };
  };

  async function playFixedSet(title, playerName, questions) {
    ensureProfile(playerName);
    const u = LS.load(playerName);
    const host = document.createElement("div");
    host.className = "panel";
    view.innerHTML = `<h1>${esc(title)}</h1>`;
    view.appendChild(host);
    const res = await quizLoop(host, (k) => (k < questions.length ? [questions[k][0], questions[k][1]] : null),
      { user: u, labeler: (k) => `${playerName} — [${k + 1}/${questions.length}]` });
    LS.save(u);
    return { name: playerName, score: res.score, time: Math.round(res.total * 100) / 100, res };
  }

  async function startHotSeat(p1, p2) {
    const questions = E.randQuestions(E.RACE_QUESTIONS);
    const r1 = await playFixedSet(`Hot-seat — ${p1}'s turn`, p1, questions);
    await handoff(p2);
    const r2 = await playFixedSet(`Hot-seat — ${p2}'s turn`, p2, questions);
    showComparison(p1, r1, p2, r2);
  }

  function handoff(nextName) {
    return new Promise((resolve) => {
      view.innerHTML = `<div class="panel">
        <h2>Pass the device</h2>
        <p>Player 1 is done. Hand over to <b>${esc(nextName)}</b> and press start when ready.</p>
        <button class="primary" id="hsNext" type="button">${esc(nextName)}, start my turn</button>
      </div>`;
      $("#hsNext").onclick = resolve;
    });
  }

  async function startCreateMatch(name) {
    const questions = E.randQuestions(E.RACE_QUESTIONS);
    const r = await playFixedSet(`Match by ${name} — your turn`, name, questions);
    const match = { by: name, questions, result: { score: r.score, time: r.time } };
    const code = E.encodeMatch(match);
    // Persist so the code survives navigating away before copying (task #22):
    // recoverable from the Two-player landing's "Your last match code" card.
    // Keyed by the ACTIVE profile (not the typed creator name) so the recall
    // card, which loads by active profile, always surfaces it — even if the
    // creator typed a name different from the active profile (omar's edge note).
    LS.saveLastMatch(LS.active(), { code, score: r.score, total: questions.length, created: nowSec() });
    view.innerHTML = `<h1>Match created</h1>
      <div class="panel">
        <p>You scored <b>${r.score}/${questions.length}</b> in ${r.time}s. Send this code to your opponent &mdash;
        they paste it into <b>Two-player &rarr; Match by code</b> to play the same questions:</p>
        <textarea id="outCode" readonly>${esc(code)}</textarea>
        <div class="row">
          <button class="primary" id="copyCode" type="button">Copy code</button>
        </div>
        <div id="copyMsg" class="muted"></div>
        <p class="muted">Saved to <b>Two-player</b> as your last match code &mdash; you can copy it later if you navigate away.
          <button type="button" class="linkish" id="backTp">Back to Two-player</button></p>
      </div>`;
    $("#copyCode").onclick = () => copyCodeFrom($("#outCode"), $("#copyMsg"), $("#copyCode"));
    $("#backTp").onclick = () => views.twoplayer();
  }

  async function startPlayMatch(name, match) {
    const r = await playFixedSet(`Match vs ${match.by} — your turn`, name, match.questions);
    showComparison(name, r, match.by, { name: match.by, score: match.result.score, time: match.result.time });
  }

  function showComparison(aName, a, bName, b) {
    const w = E.decideWinner(aName, { score: a.score, time: a.time }, bName, { score: b.score, time: b.time });
    const n = (a.res ? a.res.n : E.RACE_QUESTIONS);
    const verdict = w.draw ? `<p class="big">Draw</p><p class="muted">${w.reason}</p>`
      : `<p class="big">Winner: ${esc(w.winner)}</p><p class="muted">${w.reason}</p>`;
    view.innerHTML = `<h1>Match result</h1>
      <div class="panel">
        ${verdict}
        <ul class="list">
          <li><b>${esc(aName)}</b>: ${a.score}/${n} in ${a.time}s</li>
          <li><b>${esc(bName)}</b>: ${b.score}/${n} in ${b.time}s</li>
        </ul>
        <button class="primary" id="tpDone" type="button">Done</button>
      </div>`;
    $("#tpDone").onclick = () => views.twoplayer();
  }

  // ---- shell / routing --------------------------------------------------
  let currentView = "gym";

  function render() {
    document.querySelectorAll("#nav button").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === currentView));
    (views[currentView] || views.gym)();
  }

  function refreshProfiles() {
    const sel = $("#profileSelect");
    const ps = LS.profiles();
    sel.innerHTML = ps.map((p) => `<option ${p === LS.active() ? "selected" : ""}>${esc(p)}</option>`).join("");
  }

  function init() {
    // ensure at least one profile
    if (!LS.profiles().length) { ensureProfile("player1"); LS.setActive("player1"); }
    if (!LS.active() || !LS.profiles().includes(LS.active())) LS.setActive(LS.profiles()[0]);
    refreshProfiles();

    $("#profileSelect").onchange = (e) => { LS.setActive(e.target.value); render(); };
    $("#newProfileBtn").onclick = () => {
      const name = (prompt("New profile name:") || "").trim();
      if (!name) return;
      if (LS.profiles().includes(name)) { alert("That profile already exists."); return; }
      ensureProfile(name); LS.setActive(name); refreshProfiles(); render();
    };
    document.querySelectorAll("#nav button").forEach((b) =>
      b.onclick = () => { currentView = b.dataset.view; render(); });

    // delegate "learn it" / lesson links from feedback
    view.addEventListener("click", (e) => {
      const t = e.target.closest("[data-showlesson]");
      if (t) { currentView = "lessons"; render(); renderLessonShow(t.getAttribute("data-showlesson")); }
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
