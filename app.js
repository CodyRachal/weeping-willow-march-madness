const DATA = {
  bracket: "./data/bracket.json",
  paid: "./data/paid.json",
  entries: "./data/entries.json",
  results: "./data/results.json",
};

const PAYOUT_PCT = { R64:0.05, R32:0.05, S16:0.075, E8:0.075, F4:0.10, CHAMP:0.65 };

let bracketData = null;
let paidData = null;
let entriesData = null;
let resultsData = null;

const $ = (id) => document.getElementById(id);

function money(n) { return `$${Math.round(n)}`; }

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

function setStatus(text) {
  $("status").textContent = text;
}

function normalizeName(s) {
  return (s || "").trim().toLowerCase();
}

function isPaidName(name) {
  const set = new Set((paidData?.paidNames || []).map(normalizeName));
  return set.has(normalizeName(name));
}

function getRoundWeight(roundKey) {
  const r = bracketData?.rounds?.find(x => x.key === roundKey);
  return r ? r.weight : 0;
}

function computeScores() {
  const entries = (entriesData?.entries || []).filter(e => e.paid);
  const winners = resultsData?.winners || {};

  const scored = entries.map(e => ({ name: e.name, total: 0 }));
  const byName = new Map(scored.map(s => [normalizeName(s.name), s]));

  for (const game of (bracketData?.games || [])) {
    const winner = winners[game.id];
    if (!winner) continue;

    const weight = getRoundWeight(game.round);
    for (const e of entries) {
      const pick = e.picks?.[game.id];
      if (pick && pick === winner) {
        byName.get(normalizeName(e.name)).total += weight;
      }
    }
  }

  scored.sort((a,b) => b.total - a.total);
  return scored;
}

function renderTop3() {
  const scored = computeScores();
  const top = [scored[0], scored[1], scored[2]].filter(Boolean);

  if (!top.length) {
    $("top3").innerHTML = `<div class="small">No paid entries scored yet (or results not updated).</div>`;
    return;
  }

  const labels = ["🥇 1st", "🥈 2nd", "🥉 3rd"];
  $("top3").innerHTML = top.map((p, i) => `
    <div class="top3Item">
      <div><span class="rank">${labels[i]}</span> — ${p.name}</div>
      <div class="points">${p.total} pts</div>
    </div>
  `).join("");
}

function renderBracket() {
  const rounds = bracketData?.rounds || [];
  const games = bracketData?.games || [];

  const byRound = new Map(rounds.map(r => [r.key, []]));
  for (const g of games) byRound.get(g.round)?.push(g);

  $("bracket").innerHTML = rounds.map(r => {
    const list = byRound.get(r.key) || [];
    return `
      <div class="roundBlock">
        <div class="roundTitle">${r.name} (x${r.weight})</div>
        ${list.length ? list.map(g => `
          <div class="gameRow">
            <div class="team">${g.teamA ?? "TBD"}</div>
            <div class="team">${g.teamB ?? "TBD"}</div>
            <div class="small">Game ID: <span style="font-family:ui-monospace">${g.id}</span></div>
          </div>
        `).join("") : `<div class="small">Games will populate after Selection Sunday.</div>`}
      </div>
    `;
  }).join("");
}

function renderRules() {
  const buyIn = bracketData?.buyIn ?? 20;
  const paidCount = (paidData?.paidNames || []).length;
  const pot = paidCount * buyIn;

  const metaLine = document.getElementById("metaLine");
  if (metaLine) metaLine.textContent = `Players: ${paidCount} • Pot: ${money(pot)}`;

  $("rules").innerHTML = `
    <div><b>Buy-in:</b> $${buyIn} per person</div>
    <div><b>Paid entries (so far):</b> ${paidCount}</div>
    <div><b>Current pot (paid only):</b> ${money(pot)}</div>
    <hr />
    ...
  `;
}

  $("rules").innerHTML = `
    <div><b>Buy-in:</b> $${buyIn} per person</div>
    <div><b>Paid entries (so far):</b> ${paidCount}</div>
    <div><b>Current pot (paid only):</b> ${money(pot)}</div>
    <hr />
    <div><b>Weighted scoring:</b></div>
    <ul>
      ${(bracketData?.rounds || []).map(r => `<li>${r.name}: ${r.weight} point(s) per correct pick</li>`).join("")}
    </ul>
    <div><b>Payouts (percent of pot):</b></div>
    <ul>
      <li>Round of 64 leader: ${money(pot * PAYOUT_PCT.R64)} (5%)</li>
      <li>Round of 32 leader: ${money(pot * PAYOUT_PCT.R32)} (5%)</li>
      <li>Sweet 16 leader: ${money(pot * PAYOUT_PCT.S16)} (7.5%)</li>
      <li>Elite 8 leader: ${money(pot * PAYOUT_PCT.E8)} (7.5%)</li>
      <li>Final Four leader: ${money(pot * PAYOUT_PCT.F4)} (10%)</li>
      <li><b>Overall champion:</b> ${money(pot * PAYOUT_PCT.CHAMP)} (65%)</li>
    </ul>
    <div class="small">Ties split that round’s bonus evenly. Tiebreaker is Championship total points.</div>
  `;
}

function buildPickUI(name, unlocked) {
  const games = bracketData?.games || [];
  const optionsForGame = (g) => {
    const teams = [g.teamA, g.teamB].filter(Boolean);
    // If teams not loaded yet, allow placeholders
    if (!teams.length) return [`TBD_A (${g.id})`, `TBD_B (${g.id})`];
    return teams;
  };

  // Load local draft if exists
  const key = `wwmm_draft_${normalizeName(name)}`;
  const draft = JSON.parse(localStorage.getItem(key) || "null") || { picks:{}, tiebreaker:null };

  $("tiebreakerInput").value = draft.tiebreaker ?? "";

  $("picks").innerHTML = games.map(g => {
    const opts = optionsForGame(g);
    const current = draft.picks?.[g.id] ?? "";
    return `
      <div class="gameRow">
        <div class="team">${g.teamA ?? "TBD"}</div>
        <div class="team">${g.teamB ?? "TBD"}</div>
        <select class="select" data-game="${g.id}" ${unlocked ? "" : "disabled"}>
          <option value="">-- pick winner --</option>
          ${opts.map(t => `<option value="${t}" ${t === current ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
    `;
  }).join("");

  const notice = $("payNotice");
  if (!unlocked) {
    notice.classList.remove("hidden");
    notice.textContent = `Picks are locked until the commissioner marks "${name}" as PAID.`;
  } else {
    notice.classList.add("hidden");
    notice.textContent = "";
  }

  // Save draft on change
  $("picks").querySelectorAll("select[data-game]").forEach(sel => {
    sel.addEventListener("change", () => {
      const gameId = sel.getAttribute("data-game");
      draft.picks[gameId] = sel.value;
      localStorage.setItem(key, JSON.stringify(draft));
    });
  });

  $("tiebreakerInput").addEventListener("input", () => {
    draft.tiebreaker = Number($("tiebreakerInput").value || 0) || null;
    localStorage.setItem(key, JSON.stringify(draft));
  });

  $("saveLocalBtn").onclick = () => {
    localStorage.setItem(key, JSON.stringify(draft));
    alert("Saved locally on your device.");
  };

  $("exportBtn").onclick = () => {
    const payload = {
      name,
      tiebreaker: draft.tiebreaker,
      picks: draft.picks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g,"_")}_weeping_willow_picks.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.getAttribute("data-tab");
      document.querySelectorAll(".tabpanel").forEach(p => p.classList.add("hidden"));
      $(`tab-${target}`).classList.remove("hidden");
    });
  });
}

function setupPickFlow() {
  $("checkNameBtn").onclick = () => {
    const name = $("nameInput").value.trim();
    if (!name) return alert("Enter your name first.");
    const unlocked = isPaidName(name);
    buildPickUI(name, unlocked);
  };
}

async function init() {
  setupTabs();
  setupPickFlow();

  setStatus("Loading data…");
  try {
    [bracketData, paidData, entriesData, resultsData] = await Promise.all([
      fetchJSON(DATA.bracket),
      fetchJSON(DATA.paid),
      fetchJSON(DATA.entries),
      fetchJSON(DATA.results),
    ]);

    renderTop3();
    renderBracket();
    renderRules();

    setStatus(`Updated: ${new Date().toLocaleString()}`);
  } catch (e) {
    console.error(e);
    setStatus("Load failed (check console)");
    $("top3").innerHTML = `<div class="small">Couldn’t load data files. Check file paths and hosting.</div>`;
  }
}

init();
