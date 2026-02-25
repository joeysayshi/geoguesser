const MAX_POINTS = 5000;
const AUTO_ADVANCE_MS = 2200;
const SESSION_KEY = "geoguesser_session_v1";
const LEADERBOARD_KEY = "geoguesser_leaderboard_v1";

const MODE_CONFIGS = {
  easy: { name: "Easy", rounds: 5, time: 120, cluePenalty: 0.08 },
  normal: { name: "Normal", rounds: 5, time: 90, cluePenalty: 0.12 },
  hard: { name: "Hard", rounds: 6, time: 60, cluePenalty: 0.18 },
  blitz: { name: "Blitz", rounds: 7, time: 45, cluePenalty: 0.2 }
};

const COUNTRY_BANK = [
  { country: "Australia", clues: ["Southern Hemisphere", "Drives on the left", "English road signs"], spots: [{ lat: -33.8688, lng: 151.2093, heading: 210 }, { lat: -37.8136, lng: 144.9631, heading: 35 }, { lat: -27.4698, lng: 153.0251, heading: 105 }] },
  { country: "Japan", clues: ["East Asia", "Drives on the left", "Uses yen"], spots: [{ lat: 35.6762, lng: 139.6503, heading: 120 }, { lat: 34.6937, lng: 135.5023, heading: 80 }, { lat: 43.0618, lng: 141.3545, heading: 165 }] },
  { country: "Canada", clues: ["North America", "Right-side driving", "English/French signage"], spots: [{ lat: 49.2827, lng: -123.1207, heading: 140 }, { lat: 43.6532, lng: -79.3832, heading: 300 }, { lat: 45.5017, lng: -73.5673, heading: 55 }] },
  { country: "Brazil", clues: ["South America", "Portuguese language", "Right-side driving"], spots: [{ lat: -22.9068, lng: -43.1729, heading: 15 }, { lat: -23.5505, lng: -46.6333, heading: 245 }, { lat: -12.9777, lng: -38.5016, heading: 60 }] },
  { country: "Spain", clues: ["Southwestern Europe", "Uses euro", "Spanish language"], spots: [{ lat: 40.4168, lng: -3.7038, heading: 40 }, { lat: 41.3851, lng: 2.1734, heading: 215 }, { lat: 37.3891, lng: -5.9845, heading: 120 }] },
  { country: "Iceland", clues: ["North Atlantic island", "Volcanic landscapes", "Right-side driving"], spots: [{ lat: 64.1466, lng: -21.9426, heading: 30 }, { lat: 63.985, lng: -22.6056, heading: 200 }, { lat: 64.2615, lng: -15.213, heading: 355 }] },
  { country: "Mexico", clues: ["North America", "Spanish language", "Right-side driving"], spots: [{ lat: 19.4326, lng: -99.1332, heading: 145 }, { lat: 20.6597, lng: -103.3496, heading: 85 }, { lat: 21.1619, lng: -86.8515, heading: 200 }] },
  { country: "Italy", clues: ["Southern Europe", "Uses euro", "Right-side driving"], spots: [{ lat: 41.9028, lng: 12.4964, heading: 170 }, { lat: 45.4642, lng: 9.19, heading: 95 }, { lat: 40.8518, lng: 14.2681, heading: 250 }] }
];

const streetViewEl = document.getElementById("streetView");
const userLabel = document.getElementById("userLabel");
const logoutBtn = document.getElementById("logoutBtn");
const modeSelect = document.getElementById("modeSelect");
const startBtn = document.getElementById("startBtn");
const dailyBtn = document.getElementById("dailyBtn");
const scoreLabel = document.getElementById("scoreLabel");
const clueBtn = document.getElementById("clueBtn");
const clueList = document.getElementById("clueList");
const penaltyLabel = document.getElementById("penaltyLabel");
const modeMeta = document.getElementById("modeMeta");
const timerLabel = document.getElementById("timerLabel");
const roundLabel = document.getElementById("roundLabel");
const streakLabel = document.getElementById("streakLabel");
const leaderboardMode = document.getElementById("leaderboardMode");
const leaderboardList = document.getElementById("leaderboardList");
const bestLabel = document.getElementById("bestLabel");
const toggleBoardBtn = document.getElementById("toggleBoardBtn");
const closeBoardBtn = document.getElementById("closeBoardBtn");
const leaderboardPanel = document.getElementById("leaderboardPanel");
const mapEl = document.getElementById("map");
const recenterBtn = document.getElementById("recenterBtn");
const clearGuessBtn = document.getElementById("clearGuessBtn");
const guessBtn = document.getElementById("guessBtn");
const statusLabel = document.getElementById("statusLabel");
const scorePop = document.getElementById("scorePop");
const progressFill = document.getElementById("roundProgress");
const restartBtn = document.getElementById("restartBtn");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");

const currentUser = localStorage.getItem(SESSION_KEY);
if (!currentUser) {
  window.location.href = "./login.html";
}

const map = L.map(mapEl, {
  worldCopyJump: true,
  zoomControl: false,
  attributionControl: true
}).setView([16, 12], 2);

L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles © Esri"
}).addTo(map);

let gameState = null;
let guessMarker = null;
let answerMarker = null;
let lineToAnswer = null;
let timerInterval = null;
let autoAdvanceTimeout = null;
let displayedScore = 0;

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededRandom(seedRef) {
  seedRef.value = (1664525 * seedRef.value + 1013904223) % 4294967296;
  return seedRef.value / 4294967296;
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatTimer(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function clearTimers() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (autoAdvanceTimeout) {
    clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = null;
  }
}

function resetMapOverlays() {
  if (guessMarker) map.removeLayer(guessMarker);
  if (answerMarker) map.removeLayer(answerMarker);
  if (lineToAnswer) map.removeLayer(lineToAnswer);
  guessMarker = null;
  answerMarker = null;
  lineToAnswer = null;
}

function animateScore(target) {
  const start = displayedScore;
  const delta = target - start;
  const started = performance.now();
  const duration = 420;
  function tick(now) {
    const t = Math.min(1, (now - started) / duration);
    displayedScore = Math.round(start + delta * (1 - (1 - t) ** 3));
    scoreLabel.textContent = displayedScore.toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showScorePop(points) {
  scorePop.textContent = `+${points.toLocaleString()}`;
  scorePop.hidden = false;
  scorePop.classList.remove("show");
  void scorePop.offsetWidth;
  scorePop.classList.add("show");
  setTimeout(() => {
    scorePop.hidden = true;
  }, 820);
}

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function renderLeaderboard() {
  const mode = leaderboardMode.value;
  const rows = getLeaderboard()
    .filter((x) => mode === "all" || x.mode === mode)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  leaderboardList.innerHTML = rows.length
    ? rows.map((r) => `<li>${r.user} · ${r.score.toLocaleString()} · ${r.mode}</li>`).join("")
    : "<li>No entries yet</li>";

  const mine = getLeaderboard()
    .filter((x) => x.user === currentUser && (mode === "all" || x.mode === mode))
    .sort((a, b) => b.score - a.score)[0];

  bestLabel.textContent = mine ? `Personal best: ${mine.score.toLocaleString()}` : "Personal best: -";
}

function setModeMeta() {
  const cfg = MODE_CONFIGS[modeSelect.value];
  modeMeta.textContent = `${cfg.name}: ${cfg.rounds} rounds • ${cfg.time}s • clue penalty ${Math.round(cfg.cluePenalty * 100)}%`;
  leaderboardMode.value = modeSelect.value;
  renderLeaderboard();
}

function buildRounds(roundCount, daily = false) {
  const pool = shuffle(COUNTRY_BANK);
  const rounds = [];
  const seedRef = { value: hashSeed(new Date().toISOString().slice(0, 10) + modeSelect.value) };

  for (let i = 0; i < roundCount; i += 1) {
    const country = pool[i % pool.length];
    const index = daily
      ? Math.floor(seededRandom(seedRef) * country.spots.length)
      : Math.floor(Math.random() * country.spots.length);
    const spot = country.spots[index];
    const hDelta = daily ? Math.floor(seededRandom(seedRef) * 80) - 40 : Math.floor(Math.random() * 80) - 40;
    rounds.push({
      country: country.country,
      clues: country.clues,
      lat: spot.lat,
      lng: spot.lng,
      heading: spot.heading + hDelta
    });
  }

  return rounds;
}

function updateHud() {
  if (!gameState) return;
  const total = MODE_CONFIGS[gameState.mode].rounds;
  roundLabel.textContent = `${gameState.round} / ${total}`;
  streakLabel.textContent = `Streak: ${gameState.streak}`;
  progressFill.style.width = `${(gameState.round / total) * 100}%`;
}

function updateClues() {
  const round = gameState.rounds[gameState.round - 1];
  const visible = round.clues.slice(0, gameState.revealedClues);
  clueList.innerHTML = visible.map((c) => `<li>${c}</li>`).join("");
  const p = (gameState.revealedClues - 1) * MODE_CONFIGS[gameState.mode].cluePenalty;
  penaltyLabel.textContent = `Penalty: ${Math.round(p * 100)}%`;
  clueBtn.disabled = gameState.submitted || gameState.revealedClues >= round.clues.length;
}

function scoreFromDistance(distance) {
  const cfg = MODE_CONFIGS[gameState.mode];
  const base = Math.max(0, Math.round(MAX_POINTS * Math.exp(-distance / 2200)));
  const factor = Math.max(0, 1 - (gameState.revealedClues - 1) * cfg.cluePenalty);
  return Math.round(base * factor);
}

function startRoundTimer() {
  const seconds = MODE_CONFIGS[gameState.mode].time;
  gameState.roundEndsAt = Date.now() + seconds * 1000;
  timerLabel.textContent = formatTimer(seconds);

  timerInterval = setInterval(() => {
    const remaining = (gameState.roundEndsAt - Date.now()) / 1000;
    timerLabel.textContent = formatTimer(remaining);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      if (!gameState.guessedLatLng) {
        gameState.submitted = true;
        statusLabel.textContent = "Time up. 0 points.";
        autoAdvanceTimeout = setTimeout(advanceRound, AUTO_ADVANCE_MS);
      } else {
        submitGuess(true);
      }
    }
  }, 250);
}

function loadRoundView() {
  const round = gameState.rounds[gameState.round - 1];
  streetViewEl.src =
    `https://maps.google.com/maps?q=&layer=c&cbll=${round.lat},${round.lng}` +
    `&cbp=12,${round.heading},0,0,0&output=svembed`;

  gameState.revealedClues = 1;
  gameState.guessedLatLng = null;
  gameState.submitted = false;
  guessBtn.disabled = true;
  clearGuessBtn.disabled = true;

  map.setView([16, 12], 2);
  updateClues();
  startRoundTimer();
  statusLabel.textContent = "Place your pin on the map.";
}

function startSession(daily = false) {
  clearTimers();
  resetMapOverlays();
  const mode = modeSelect.value;
  const cfg = MODE_CONFIGS[mode];

  gameState = {
    mode,
    round: 1,
    score: 0,
    rounds: buildRounds(cfg.rounds, daily),
    daily,
    revealedClues: 1,
    guessedLatLng: null,
    submitted: false,
    streak: 0,
    totalDistance: 0
  };

  displayedScore = 0;
  animateScore(0);
  restartBtn.hidden = true;
  updateHud();
  loadRoundView();
}

function finishGame() {
  clearTimers();
  const cfg = MODE_CONFIGS[gameState.mode];
  const avg = gameState.totalDistance / cfg.rounds;
  statusLabel.textContent = `Done. Score ${gameState.score.toLocaleString()} | Avg ${Math.round(avg)} km`;

  const entries = getLeaderboard();
  entries.push({
    user: currentUser,
    mode: gameState.mode,
    score: gameState.score,
    avgDistance: Math.round(avg),
    daily: gameState.daily,
    at: new Date().toISOString()
  });
  saveLeaderboard(entries);
  renderLeaderboard();

  clueBtn.disabled = true;
  guessBtn.disabled = true;
  clearGuessBtn.disabled = true;
  restartBtn.hidden = false;
  timerLabel.textContent = "00:00";
}

function advanceRound() {
  clearTimers();
  resetMapOverlays();

  if (gameState.round >= MODE_CONFIGS[gameState.mode].rounds) {
    finishGame();
    return;
  }

  gameState.round += 1;
  updateHud();
  loadRoundView();
}

function submitGuess(isAuto = false) {
  if (gameState.submitted || !gameState.guessedLatLng) return;

  clearTimers();

  const ans = gameState.rounds[gameState.round - 1];
  const guess = gameState.guessedLatLng;
  const dist = haversineKm(guess, ans);
  const points = scoreFromDistance(dist);

  gameState.score += points;
  gameState.totalDistance += dist;
  gameState.streak = dist < 1000 ? gameState.streak + 1 : 0;
  gameState.submitted = true;

  answerMarker = L.circleMarker([ans.lat, ans.lng], {
    radius: 8,
    color: "#ff4f7d",
    fillColor: "#ff4f7d",
    fillOpacity: 0.35
  }).addTo(map);

  lineToAnswer = L.polyline(
    [[guess.lat, guess.lng], [ans.lat, ans.lng]],
    { color: "#67a8ff", dashArray: "7 8" }
  ).addTo(map);

  map.fitBounds(L.latLngBounds([[guess.lat, guess.lng], [ans.lat, ans.lng]]).pad(0.3));

  animateScore(gameState.score);
  showScorePop(points);
  updateHud();

  statusLabel.textContent =
    `${ans.country} · ${Math.round(dist)} km · +${points.toLocaleString()} points` +
    (isAuto ? " (time)" : "");

  guessBtn.disabled = true;
  clearGuessBtn.disabled = true;
  clueBtn.disabled = true;

  autoAdvanceTimeout = setTimeout(advanceRound, AUTO_ADVANCE_MS);
}

map.on("click", (e) => {
  if (!gameState || gameState.submitted) return;

  gameState.guessedLatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
  if (guessMarker) guessMarker.setLatLng(e.latlng);
  else guessMarker = L.marker(e.latlng).addTo(map);

  guessBtn.disabled = false;
  clearGuessBtn.disabled = false;
  statusLabel.textContent = `Pinned ${e.latlng.lat.toFixed(2)}, ${e.latlng.lng.toFixed(2)}`;
});

function bindEvents() {
  userLabel.textContent = currentUser;

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "./login.html";
  });

  modeSelect.addEventListener("change", setModeMeta);
  leaderboardMode.addEventListener("change", renderLeaderboard);

  startBtn.addEventListener("click", () => startSession(false));
  dailyBtn.addEventListener("click", () => startSession(true));
  restartBtn.addEventListener("click", () => startSession(false));

  clueBtn.addEventListener("click", () => {
    if (!gameState || gameState.submitted) return;
    const round = gameState.rounds[gameState.round - 1];
    if (gameState.revealedClues < round.clues.length) {
      gameState.revealedClues += 1;
      updateClues();
    }
  });

  toggleBoardBtn.addEventListener("click", () => {
    leaderboardPanel.hidden = !leaderboardPanel.hidden;
  });

  closeBoardBtn.addEventListener("click", () => {
    leaderboardPanel.hidden = true;
  });

  recenterBtn.addEventListener("click", () => map.setView([16, 12], 2));
  zoomInBtn.addEventListener("click", () => map.zoomIn());
  zoomOutBtn.addEventListener("click", () => map.zoomOut());

  clearGuessBtn.addEventListener("click", () => {
    if (!guessMarker || !gameState || gameState.submitted) return;
    map.removeLayer(guessMarker);
    guessMarker = null;
    gameState.guessedLatLng = null;
    guessBtn.disabled = true;
    clearGuessBtn.disabled = true;
  });

  guessBtn.addEventListener("click", () => submitGuess(false));

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "g" && !guessBtn.disabled) submitGuess(false);
    if (key === "l") leaderboardPanel.hidden = !leaderboardPanel.hidden;
  });

  window.addEventListener("resize", () => map.invalidateSize());

  window.render_game_to_text = () =>
    JSON.stringify({
      mode: gameState ? gameState.mode : null,
      round: gameState ? gameState.round : null,
      score: gameState ? gameState.score : 0,
      timer: timerLabel.textContent,
      guessed: Boolean(gameState && gameState.guessedLatLng),
      user: currentUser,
      coords_note: "lat/lng geographic coordinates"
    });

  window.advanceTime = (ms) => {
    if (!gameState || !gameState.roundEndsAt) return;
    gameState.roundEndsAt -= ms;
  };
}

setModeMeta();
renderLeaderboard();
bindEvents();
statusLabel.textContent = "Choose mode and start.";
clueBtn.disabled = true;
guessBtn.disabled = true;
restartBtn.hidden = true;

const urlParams = new URLSearchParams(window.location.search);
const forcedMode = urlParams.get("mode");
if (forcedMode && MODE_CONFIGS[forcedMode]) {
  modeSelect.value = forcedMode;
  setModeMeta();
}
const autoDaily = urlParams.get("daily") === "1";
startSession(autoDaily);
