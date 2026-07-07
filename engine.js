// Times Table Gym - Level 2 webapp: pure rules engine (no DOM).
// Ported 1:1 from workspace/tables.py (the source of truth). Kept DOM-free so it
// can be unit-tested in Node against the CLI for exact parity. Consumed by app.js
// in the browser (window.Engine) and by tests in Node (module.exports).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const GRID_MIN = 2, GRID_MAX = 25;

  // ---- Mastery model (mirrors tables.py) ---------------------------------
  // mastery = accuracy * (ACC_W + SPD_W * speed_score)
  //   accuracy    = correct / attempts
  //   speed_score = 1 if avg <= FAST_S, 0 if avg >= SLOW_S, linear between.
  // Accuracy is the ceiling; speed only scales an already-earned score, so a
  // fast-but-wrong cell gets no speed credit: 0% accuracy => 0% mastery (#9).
  // "mastered" needs MIN_MASTER_ATTEMPTS correct answers so one lucky fast
  // answer is not mistaken for mastery.
  const FAST_S = 2.0, SLOW_S = 8.0;
  const ACC_W = 0.7, SPD_W = 0.3;
  const MIN_MASTER_ATTEMPTS = 3;

  // Section-challenge pass bar.
  const PASS_ACCURACY = 0.80;
  const PASS_AVG_TIME = 6.0;

  // Lesson practice / puzzle sizing (mirrors tables.py defaults).
  const LESSON_PRACTICE_COUNT = 5;
  const PUZZLE_WEAK_COUNT = 10;
  const RACE_QUESTIONS = 15;
  const SECTION_MAX_CELLS = 30;

  const BINS = ["unseen", "weak", "ok", "strong", "mastered"];
  const BIN_LABEL = {
    unseen: "not practised", weak: "weak", ok: "ok",
    strong: "strong", mastered: "mastered",
  };
  const BIN_SYMBOL = { unseen: "·", weak: "░", ok: "▒", strong: "▓", mastered: "█" };

  function grid() {
    const out = [];
    for (let n = GRID_MIN; n <= GRID_MAX; n++) out.push(n);
    return out;
  }

  function speedScore(avg) {
    if (avg <= FAST_S) return 1.0;
    if (avg >= SLOW_S) return 0.0;
    return 1.0 - (avg - FAST_S) / (SLOW_S - FAST_S);
  }

  function emptyCell() {
    return { attempts: 0, correct: 0, total_time: 0.0, last_seen: 0 };
  }

  // Returns mastery in [0,1], or null if the cell has never been attempted.
  function cellMastery(cell) {
    const a = cell && cell.attempts ? cell.attempts : 0;
    if (a === 0) return null;
    const acc = cell.correct / a;
    const avg = cell.total_time / a;
    return acc * (ACC_W + SPD_W * speedScore(avg));
  }

  function masteryBin(cell) {
    const a = cell && cell.attempts ? cell.attempts : 0;
    if (a === 0) return "unseen";
    const m = cellMastery(cell);
    if (m >= 0.9 && cell.correct >= MIN_MASTER_ATTEMPTS) return "mastered";
    if (m >= 0.75) return "strong";
    if (m >= 0.5) return "ok";
    return "weak";
  }

  // ---- Technique mapping (mirrors tables.py map_technique) ----------------
  // Most-specific first. Used for puzzle/gym per-cell miss feedback. During
  // `lesson practice <id>` the caller forces the practised id instead (#6).
  function mapTechnique(i, j) {
    const a = i, b = j;
    if (a === b) return "squares-as-anchors";
    if (Math.abs(a - b) === 2) return "difference-of-squares-near-squares";
    if (a === 9 || b === 9) return "x9-digit-pattern";
    if (a === 11 || b === 11) return "x11-two-digit-trick";
    if (a === 25 || b === 25) return "x25-quarter-of-x100";
    if (a === 12 || b === 12) return "x12-is-x10-plus-x2";
    if (a === 5 || b === 5) return "x5-is-half-of-x10";
    if (a === 4 || b === 4) return "x4-double-double";
    if (a % 2 === 0 || b % 2 === 0) return "even-times-anything-is-even";
    return "break-into-easy-products";
  }

  // ---- User data model (mirrors tables.py new_user_data) ------------------
  function newUserData(user) {
    return {
      user: user,
      cells: {},            // "i,j" -> cell
      streak_current: 0,
      streak_best: 0,
      lessons: {},          // id -> {state, best_accuracy, attempts}
      rivals: {},           // rival id -> {wins, losses, best_time}
      settings: {},         // gamification module id -> enabled bool (default from registry)
      game: {},             // gamification module id -> module state
      last_play_date: null,  // ISO date of last session (drives onDailyFirstPlay)
      log: [],
    };
  }

  // fill in any missing top-level keys (tolerate older stored blobs)
  function normalizeUser(data, user) {
    const base = newUserData(user);
    if (!data || typeof data !== "object") return base;
    for (const k of Object.keys(base)) {
      if (!(k in data)) data[k] = base[k];
    }
    data.user = user;
    return data;
  }

  const cellKey = (i, j) => i + "," + j;

  function getCell(data, i, j) {
    const k = cellKey(i, j);
    if (!data.cells[k]) data.cells[k] = emptyCell();
    return data.cells[k];
  }

  function peekCell(data, i, j) {
    return data.cells[cellKey(i, j)] || emptyCell();
  }

  // Record one answer into the user blob (mirrors tables.py record()).
  // nowSec: integer epoch seconds (caller supplies, keeps engine testable).
  function record(data, i, j, correct, rt, nowSec) {
    const c = getCell(data, i, j);
    const oldBin = masteryBin(c);          // for onMasteryChange (gamification)
    c.attempts += 1;
    if (correct) c.correct += 1;
    c.total_time += rt;
    c.last_seen = nowSec;
    if (correct) data.streak_current = (data.streak_current || 0) + 1;
    else data.streak_current = 0;
    data.streak_best = Math.max(data.streak_best || 0, data.streak_current);
    data.log.push({ i, j, correct: !!correct, rt: Math.round(rt * 100) / 100, t: nowSec });
    if (data.log.length > 2000) data.log = data.log.slice(-2000);
    // gamification events (no-ops if registry unset or all modules off)
    if (correct) emit(data, "onCorrectAnswer", { i, j, rt });
    const newBin = masteryBin(c);
    if (newBin !== oldBin) emit(data, "onMasteryChange", { i, j, newBin });
  }

  // ---- Weakest cells (mirrors tables.py weakest_cells) --------------------
  function weakestCells(data, limit) {
    limit = limit == null ? PUZZLE_WEAK_COUNT : limit;
    const seen = [];
    for (const k of Object.keys(data.cells)) {
      if (data.cells[k].attempts > 0) seen.push([k, data.cells[k]]);
    }
    seen.sort((x, y) => cellMastery(x[1]) - cellMastery(y[1]));
    return seen.slice(0, limit).map(([k]) => k.split(",").map(Number));
  }

  // ---- Pass bar (mirrors tables.py report_pass_bar) -----------------------
  function passBar(score, total, n) {
    const acc = n ? score / n : 0;
    const avg = n ? total / n : 0;
    const okAcc = acc >= PASS_ACCURACY;
    const okTime = avg <= PASS_AVG_TIME;
    return {
      accuracy: acc, avgTime: avg,
      okAccuracy: okAcc, okTime: okTime,
      passed: okAcc && okTime,
      needAccuracy: PASS_ACCURACY, needTime: PASS_AVG_TIME,
    };
  }

  // ---- Lesson progress rule (mirrors cmd_lesson_practice) -----------------
  // >=80% accuracy -> mastered, else practicing.
  function lessonStateFromAccuracy(acc) {
    return acc >= 0.8 ? "mastered" : "practicing";
  }
  function lessonState(data, id) {
    return (data.lessons[id] && data.lessons[id].state) || "not started";
  }
  function applyLessonResult(data, id, acc) {
    const prev = data.lessons[id] || {};
    const state = lessonStateFromAccuracy(acc);
    data.lessons[id] = {
      state: state,
      best_accuracy: Math.max(prev.best_accuracy || 0, Math.round(acc * 100) / 100),
      attempts: (prev.attempts || 0) + 1,
    };
    return data.lessons[id];
  }

  // ---- Overall mastery for gym (mirrors cmd_gym) --------------------------
  function overallMastery(data) {
    const seen = [];
    for (const k of Object.keys(data.cells)) {
      if (data.cells[k].attempts > 0) seen.push(data.cells[k]);
    }
    const totalCells = grid().length * grid().length;
    // Labels are the technical bins, 1:1 with tables.py cmd_gym (parity contract).
    // The Gym tile shows friendlier copy for this one verdict, but that mapping
    // lives in the view (app.js OVERALL_LABEL) — the engine stays pure.
    if (!seen.length) return { score: 0, label: "not started", coverage: 0, totalCells };
    const score = seen.reduce((s, c) => s + cellMastery(c), 0) / seen.length;
    const label = score >= 0.9 ? "mastered" : score >= 0.75 ? "strong"
      : score >= 0.5 ? "ok" : "weak";
    return { score, label, coverage: seen.length, totalCells };
  }

  // ---- Section-puzzle cell sets (mirrors _section_cells) ------------------
  function rowCells(n) {
    if (!(n >= GRID_MIN && n <= GRID_MAX)) return null;
    return grid().map((j) => [n, j]);
  }
  function diagonalCells() {
    return grid().map((n) => [n, n]);
  }
  // spec like "12-15x2-9"
  function blockCells(spec) {
    const m = /^\s*(\d+)\s*-\s*(\d+)\s*x\s*(\d+)\s*-\s*(\d+)\s*$/i.exec(spec || "");
    if (!m) return null;
    let [r1, r2] = [Number(m[1]), Number(m[2])].sort((a, b) => a - b);
    let [c1, c2] = [Number(m[3]), Number(m[4])].sort((a, b) => a - b);
    if (!(r1 >= GRID_MIN && r2 <= GRID_MAX && c1 >= GRID_MIN && c2 <= GRID_MAX)) return null;
    const cells = [];
    for (let i = r1; i <= r2; i++) for (let j = c1; j <= c2; j++) cells.push([i, j]);
    return cells;
  }

  // ---- Match code (copy-paste two-player, replaces file-backed race) ------
  // Encodes a fixed question set + the creator's result into a shareable
  // string. base64(JSON) with unicode-safe wrapping.
  function b64encode(str) {
    if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(str)));
    return Buffer.from(str, "utf-8").toString("base64");
  }
  function b64decode(str) {
    if (typeof atob === "function") return decodeURIComponent(escape(atob(str)));
    return Buffer.from(str, "base64").toString("utf-8");
  }
  function encodeMatch(match) {
    return "TTG1." + b64encode(JSON.stringify(match));
  }
  function decodeMatch(code) {
    code = (code || "").trim();
    if (code.startsWith("TTG1.")) code = code.slice(5);
    let obj;
    try { obj = JSON.parse(b64decode(code)); } catch (e) { return null; }
    if (!obj || !Array.isArray(obj.questions) || !obj.by || !obj.result) return null;
    // Reject garbage-but-parseable codes: questions must be in-grid int pairs
    // and the result must carry numeric score/time.
    const inGrid = (v) => Number.isInteger(v) && v >= GRID_MIN && v <= GRID_MAX;
    const okQs = obj.questions.length > 0 && obj.questions.every(
      (q) => Array.isArray(q) && q.length === 2 && inGrid(q[0]) && inGrid(q[1]));
    const okResult = typeof obj.result.score === "number" && typeof obj.result.time === "number";
    if (!okQs || !okResult) return null;
    return obj;
  }

  // Winner decision (mirrors race status: higher score, tie-break faster time)
  // ---- Gamification (Phase 5) — mirror of tables.py -----------------------
  // Registry is injected by app.js (setGamification(window.GAMIFICATION)); left
  // null, emit() is a graceful no-op (keeps engine loadable/testable standalone).
  let _gami = null;
  function setGamification(reg) { _gami = reg; }
  function gameModule(mid) { return _gami ? _gami.modules.find((m) => m.id === mid) : null; }
  function moduleEnabled(data, mid) {
    if (data.settings && Object.prototype.hasOwnProperty.call(data.settings, mid)) {
      return !!data.settings[mid];
    }
    const m = gameModule(mid);
    return m ? !!m.default : false;
  }
  function gameState(data, mid) {
    if (!data.game) data.game = {};
    if (!data.game[mid]) data.game[mid] = {};
    return data.game[mid];
  }
  function emit(data, event, payload) {
    if (!_gami) return;
    for (const m of _gami.modules) {
      if (!(m.hooks || []).includes(event)) continue;
      if (!moduleEnabled(data, m.id)) continue;
      const h = GAME_HANDLERS[m.id];
      if (h) h(data, event, payload, m);
    }
  }
  function xpLevel(xp) { return 1 + Math.floor(xp / 100); }
  function rowFullyMastered(data, n) {
    return grid().every((j) => masteryBin(peekCell(data, n, j)) === "mastered");
  }
  function isoWeek(iso) {
    const d = new Date(iso + "T00:00:00Z");
    const day = (d.getUTCDay() + 6) % 7;         // Mon=0
    d.setUTCDate(d.getUTCDate() - day + 3);       // nearest Thursday
    const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return d.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
  }
  const GAME_HANDLERS = {
    xp: function (data, event, payload) {
      const st = gameState(data, "xp");
      if (st.xp == null) st.xp = 0;
      if (event === "onCorrectAnswer") st.xp += 5;
      else if (event === "onSessionEnd") st.xp += 10 + Math.round((payload.accuracy || 0) * 10);
      else if (event === "onLadderWin") st.xp += 50;
    },
    achievements: function (data, event, payload, cfg) {
      const st = gameState(data, "achievements");
      if (!st.unlocked) st.unlocked = [];
      for (const b of (cfg.config && cfg.config.badges) || []) {
        if (st.unlocked.includes(b.id) || b.event !== event) continue;
        let hit = false;
        if (b.check === "mastered_cell") hit = payload.newBin === "mastered";
        else if (b.check === "full_row") hit = payload.newBin === "mastered" && rowFullyMastered(data, payload.i);
        else if (b.check === "ladder_champion") {
          const rivals = (typeof window !== "undefined" && window.RIVALS) ? window.RIVALS : null;
          hit = rivals ? (payload.newRank || 0) >= rivals.ladder.length : false;
        }
        else if (b.check === "perfect_drill") hit = payload.mode === "drill" && payload.perfect;
        if (hit) st.unlocked.push(b.id);
      }
    },
    "daily-streak": function (data, event, payload) {
      if (event !== "onDailyFirstPlay") return;
      const st = gameState(data, "daily-streak");
      const last = st.last_date, today = payload.date;
      if (last == null) st.current = 1;
      else {
        const gap = Math.round((new Date(today + "T00:00:00Z") - new Date(last + "T00:00:00Z")) / 86400000);
        if (gap === 1) st.current = (st.current || 0) + 1;
        else if (gap !== 0) st.current = 1;
      }
      st.last_date = today;
      st.best = Math.max(st.best || 0, st.current || 0);
    },
    quests: function (data, event, payload, cfg) {
      const st = gameState(data, "quests");
      const quests = (cfg.config && cfg.config.quests) || [];
      if (!quests.length) return;
      if (event === "onDailyFirstPlay") {
        const wk = isoWeek(payload.date);
        if (st.week !== wk) {
          const idx = ((st.index == null ? -1 : st.index) + 1) % quests.length;
          st.week = wk; st.index = idx; st.progress = 0; st.done = false;
        }
        return;
      }
      if (st.index == null) { st.week = null; st.index = 0; st.progress = 0; st.done = false; }
      const q = quests[st.index];
      let inc = 0;
      if (q.metric === "correct" && event === "onCorrectAnswer") inc = 1;
      else if (q.metric === "mastered" && event === "onMasteryChange" && payload.newBin === "mastered") inc = 1;
      else if (q.metric === "ladder" && event === "onLadderWin") inc = 1;
      if (inc && !st.done) {
        st.progress = (st.progress || 0) + inc;
        if (st.progress >= q.target) st.done = true;
      }
    },
    "daily-challenge": function (data, event, payload, cfg) {
      // Rotates each CALENDAR DAY (vs quests' weekly), keyed off onDailyFirstPlay.
      // Completing it grants a small XP bonus (only if the XP module is on).
      const st = gameState(data, "daily-challenge");
      const challenges = (cfg.config && cfg.config.challenges) || [];
      if (!challenges.length) return;
      if (event === "onDailyFirstPlay") {
        const today = payload.date;
        if (st.date !== today) {
          const idx = ((st.index == null ? -1 : st.index) + 1) % challenges.length;
          st.date = today; st.index = idx; st.progress = 0; st.done = false;
        }
        return;
      }
      if (st.index == null) { st.date = null; st.index = 0; st.progress = 0; st.done = false; }
      const c = challenges[st.index];
      let inc = 0;
      if (c.metric === "correct" && event === "onCorrectAnswer") inc = 1;
      else if (c.metric === "mastered" && event === "onMasteryChange" && payload.newBin === "mastered") inc = 1;
      else if (c.metric === "ladder" && event === "onLadderWin") inc = 1;
      if (inc && !st.done) {
        st.progress = (st.progress || 0) + inc;
        if (st.progress >= c.target) {
          st.done = true;
          if (moduleEnabled(data, "xp")) {
            const xs = gameState(data, "xp");
            xs.xp = (xs.xp || 0) + (c.reward_xp || 0);
          }
        }
      }
    },
  };
  function beginSession(data, todayISO) {
    // Daily rollover at session START, before any answers are recorded (#59), so
    // the day's first session counts toward TODAY's freshly-rotated quest /
    // daily-challenge instead of being wiped by a rotation at endSession.
    if (data.last_play_date !== todayISO) {
      emit(data, "onDailyFirstPlay", { date: todayISO });
      data.last_play_date = todayISO;
    }
  }
  function endSession(data, mode, score, total, n) {
    const acc = n ? score / n : 0;
    emit(data, "onSessionEnd", { mode, score, total, n, accuracy: acc, perfect: n > 0 && score === n });
  }

  // ---- AI rivals (Phase 4) ----------------------------------------------
  // Deterministic bots; identical FNV-1a model to tables.py so a rival + a
  // fixed question set always behave the same (no wall-clock/Math.random).
  function fnv() {
    const s = Array.prototype.join.call(arguments, "|");
    let h = 2166136261;
    for (let k = 0; k < s.length; k++) {
      h ^= s.charCodeAt(k);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function rivalById(rivals, key) {
    key = String(key || "").trim().toLowerCase();
    return rivals.rivals.find((r) => r.id === key || r.name.toLowerCase() === key) || null;
  }
  function rivalIsSpecialty(rival, i, j) {
    const sp = rival.specialty;
    if (!sp) return false;
    if (sp.type === "squares") return i === j;
    if (sp.type === "row") return i === sp.n || j === sp.n;
    return false;
  }
  function rivalPlay(rival, questions) {
    let score = 0, total = 0;
    const per = [], timeline = [];
    questions.forEach((q, k) => {
      const i = q[0], j = q[1];
      const acc = rivalIsSpecialty(rival, i, j) ? rival.specialty_accuracy : rival.accuracy;
      const correct = (fnv(rival.id, "a", i, j, k) % 10000) < acc * 10000;
      const jitter = ((fnv(rival.id, "t", i, j, k) % 201) - 100) / 100;
      const t = Math.max(0.2, rival.speed + jitter * rival.variance);
      if (correct) score++;
      total += t;
      per.push(!!correct);
      timeline.push({ i, j, correct: !!correct, t: Math.round(t * 100) / 100 });
    });
    return { score, time: Math.round(total * 100) / 100, per, timeline };
  }
  function ladderRank(data, rivals) {
    let rank = 0;
    for (const rid of rivals.ladder) {
      if ((data.rivals[rid] && data.rivals[rid].wins) > 0) rank++;
      else break;
    }
    return rank;
  }
  function recordRivalResult(data, rivalId, won, youTime) {
    const st = data.rivals[rivalId] || { wins: 0, losses: 0, best_time: null };
    if (won) st.wins++; else st.losses++;
    if (st.best_time === null || youTime < st.best_time) st.best_time = Math.round(youTime * 100) / 100;
    data.rivals[rivalId] = st;
    return st;
  }

  function decideWinner(aName, aRes, bName, bRes) {
    if (aRes.score !== bRes.score) {
      return { winner: aRes.score > bRes.score ? aName : bName, reason: "higher score", draw: false };
    }
    if (aRes.time !== bRes.time) {
      return { winner: aRes.time < bRes.time ? aName : bName, reason: "same score, faster time", draw: false };
    }
    return { winner: null, reason: "identical score and time", draw: true };
  }

  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function randCell() { return [randInt(GRID_MIN, GRID_MAX), randInt(GRID_MIN, GRID_MAX)]; }
  function randQuestions(n) {
    const out = [];
    for (let k = 0; k < n; k++) out.push(randCell());
    return out;
  }
  function sample(arr, k) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(k, a.length));
  }
  function shuffle(arr) { return sample(arr, arr.length); }

  return {
    GRID_MIN, GRID_MAX, FAST_S, SLOW_S, ACC_W, SPD_W, MIN_MASTER_ATTEMPTS,
    PASS_ACCURACY, PASS_AVG_TIME, LESSON_PRACTICE_COUNT, PUZZLE_WEAK_COUNT,
    RACE_QUESTIONS, SECTION_MAX_CELLS, BINS, BIN_LABEL, BIN_SYMBOL,
    grid, speedScore, emptyCell, cellMastery, masteryBin, mapTechnique,
    newUserData, normalizeUser, cellKey, getCell, peekCell, record,
    weakestCells, passBar, lessonStateFromAccuracy, lessonState,
    applyLessonResult, overallMastery, rowCells, diagonalCells, blockCells,
    encodeMatch, decodeMatch, decideWinner,
    fnv, rivalById, rivalIsSpecialty, rivalPlay, ladderRank, recordRivalResult,
    setGamification, gameModule, moduleEnabled, gameState, emit, xpLevel,
    beginSession, endSession, isoWeek,
    randInt, randCell, randQuestions, sample, shuffle,
  };
});
