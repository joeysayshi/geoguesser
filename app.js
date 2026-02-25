const TOTAL_ROUNDS = 5;
const MAX_POINTS = 5000;
const ROUND_TIME_SECONDS = 45;
const CLUE_PENALTY_STEP = 0.12;
const AUTO_ADVANCE_MS = 2200;

const COUNTRY_SPOTS = [
  {
    country: "Iceland",
    lat: 64.1466,
    lng: -21.9426,
    heading: 35,
    clues: ["North Atlantic island nation", "Drives on the right", "Volcanic terrain"]
  },
  {
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    heading: 125,
    clues: ["Island country in East Asia", "Drives on the left", "Yen currency"]
  },
  {
    country: "Australia",
    lat: -33.8688,
    lng: 151.2093,
    heading: 205,
    clues: ["Southern Hemisphere", "Drives on the left", "Common road signs in English"]
  },
  {
    country: "Brazil",
    lat: -22.9068,
    lng: -43.1729,
    heading: 15,
    clues: ["Largest country in South America", "Portuguese language", "Drives on the right"]
  },
  {
    country: "South Africa",
    lat: -33.9249,
    lng: 18.4241,
    heading: 70,
    clues: ["At Africa's southern tip", "Drives on the left", "Multiple official languages"]
  },
  {
    country: "Canada",
    lat: 49.2827,
    lng: -123.1207,
    heading: 135,
    clues: ["North America", "Drives on the right", "English and French appear on signage"]
  },
  {
    country: "Italy",
    lat: 41.9028,
    lng: 12.4964,
    heading: 180,
    clues: ["Southern Europe", "Uses the euro", "Drives on the right"]
  },
  {
    country: "Germany",
    lat: 52.52,
    lng: 13.405,
    heading: 40,
    clues: ["Central Europe", "Uses the euro", "Drives on the right"]
  },
  {
    country: "United States",
    lat: 37.7749,
    lng: -122.4194,
    heading: 295,
    clues: ["North America", "Drives on the right", "Miles are used for roads"]
  },
  {
    country: "New Zealand",
    lat: -36.8509,
    lng: 174.7645,
    heading: 10,
    clues: ["Island nation in Oceania", "Drives on the left", "Southern Hemisphere"]
  },
  {
    country: "Spain",
    lat: 40.4168,
    lng: -3.7038,
    heading: 50,
    clues: ["Southwestern Europe", "Uses the euro", "Spanish language"]
  },
  {
    country: "Mexico",
    lat: 19.4326,
    lng: -99.1332,
    heading: 140,
    clues: ["North America", "Spanish language", "Drives on the right"]
  },
  {
    country: "Norway",
    lat: 59.9139,
    lng: 10.7522,
    heading: 220,
    clues: ["Nordic country", "Long coastlines and fjords", "Drives on the right"]
  },
  {
    country: "Chile",
    lat: -33.4489,
    lng: -70.6693,
    heading: 80,
    clues: ["Long Pacific coastline", "South America", "Spanish language"]
  }
];

const streetViewEl = document.getElementById("streetView");
const roundLabel = document.getElementById("roundLabel");
const scoreLabel = document.getElementById("scoreLabel");
const timerLabel = document.getElementById("timerLabel");
const statusLabel = document.getElementById("statusLabel");
const clueList = document.getElementById("clueList");
const clueBtn = document.getElementById("clueBtn");
const penaltyLabel = document.getElementById("penaltyLabel");
const recenterBtn = document.getElementById("recenterBtn");
const clearGuessBtn = document.getElementById("clearGuessBtn");
const guessBtn = document.getElementById("guessBtn");
const restartBtn = document.getElementById("restartBtn");
const roundProgress = document.getElementById("roundProgress");

const map = L.map("map", {
  worldCopyJump: true,
  zoomControl: true,
  attributionControl: false
}).setView([22, 0], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18
}).addTo(map);

let guessMarker = null;
let answerMarker = null;
let lineToAnswer = null;
let timerInterval = null;
let autoAdvanceTimeout = null;
let gameState;

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
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

function scoreFromDistance(distanceKm, revealedClues) {
  const base = Math.max(0, Math.round(MAX_POINTS * Math.exp(-distanceKm / 2200)));
  const cluePenaltyFactor = Math.max(0, 1 - (revealedClues - 1) * CLUE_PENALTY_STEP);
  return Math.max(0, Math.round(base * cluePenaltyFactor));
}

function buildStreetViewUrl(lat, lng, heading) {
  const pitch = 0;
  const zoom = 0;
  return `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=12,${heading},${zoom},${pitch},0&output=svembed`;
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
  if (guessMarker) {
    map.removeLayer(guessMarker);
    guessMarker = null;
  }
  if (answerMarker) {
    map.removeLayer(answerMarker);
    answerMarker = null;
  }
  if (lineToAnswer) {
    map.removeLayer(lineToAnswer);
    lineToAnswer = null;
  }
}

function updatePenaltyLabel() {
  const penaltyPercent = Math.max(0, (gameState.revealedClues - 1) * CLUE_PENALTY_STEP * 100);
  penaltyLabel.textContent = `Clue penalty: ${penaltyPercent.toFixed(0)}%`;
}

function renderClues() {
  const roundData = gameState.rounds[gameState.round - 1];
  const visible = roundData.clues.slice(0, gameState.revealedClues);
  clueList.innerHTML = visible.map((clue) => `<li>${clue}</li>`).join("");
  clueBtn.disabled = gameState.revealedClues >= roundData.clues.length || gameState.submitted;
  updatePenaltyLabel();
}

function updateHud() {
  roundLabel.textContent = `${gameState.round}/${TOTAL_ROUNDS}`;
  scoreLabel.textContent = gameState.score.toLocaleString();
  roundProgress.style.width = `${(gameState.round / TOTAL_ROUNDS) * 100}%`;
}

function updateTimerLabel(secondsRemaining) {
  timerLabel.textContent = `${Math.max(0, Math.ceil(secondsRemaining))}s`;
  timerLabel.classList.toggle("warn", secondsRemaining <= 10);
}

function finishRoundDueToTimeout() {
  if (gameState.submitted) {
    return;
  }

  if (!gameState.guessedLatLng) {
    gameState.submitted = true;
    const answer = gameState.rounds[gameState.round - 1];

    answerMarker = L.circleMarker([answer.lat, answer.lng], {
      radius: 8,
      color: "#f43f5e",
      weight: 2,
      fillColor: "#f43f5e",
      fillOpacity: 0.35
    }).addTo(map);

    map.setView([answer.lat, answer.lng], 3);
    statusLabel.innerHTML = `Time up. Answer: <strong>${answer.country}</strong>. Round score: <strong>0</strong>.`;
    clueBtn.disabled = true;
    guessBtn.disabled = true;
    clearGuessBtn.disabled = true;
    autoAdvanceTimeout = setTimeout(advanceRound, AUTO_ADVANCE_MS);
    return;
  }

  submitGuess(true);
}

function startRoundTimer() {
  gameState.roundEndsAt = Date.now() + ROUND_TIME_SECONDS * 1000;
  updateTimerLabel(ROUND_TIME_SECONDS);

  timerInterval = setInterval(() => {
    const secondsRemaining = (gameState.roundEndsAt - Date.now()) / 1000;
    updateTimerLabel(secondsRemaining);

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      finishRoundDueToTimeout();
    }
  }, 200);
}

function loadRoundView() {
  const roundData = gameState.rounds[gameState.round - 1];
  streetViewEl.src = buildStreetViewUrl(roundData.lat, roundData.lng, roundData.heading);
  gameState.revealedClues = 1;
  gameState.guessedLatLng = null;
  gameState.submitted = false;

  guessBtn.disabled = true;
  clearGuessBtn.disabled = true;
  renderClues();
  statusLabel.textContent = "Look around, then click your country on the mini map.";
  startRoundTimer();
}

function startGame() {
  clearTimers();

  gameState = {
    round: 1,
    score: 0,
    rounds: shuffle(COUNTRY_SPOTS).slice(0, TOTAL_ROUNDS),
    guessedLatLng: null,
    submitted: false,
    revealedClues: 1,
    roundEndsAt: 0
  };

  restartBtn.hidden = true;

  resetMapOverlays();
  map.setView([22, 0], 2);
  updateHud();
  loadRoundView();

  setTimeout(() => map.invalidateSize(), 80);
}

function advanceRound() {
  clearTimers();

  const nextRound = gameState.round + 1;
  if (nextRound > TOTAL_ROUNDS) {
    statusLabel.innerHTML = `<strong>Game complete.</strong> Final score: <strong>${gameState.score.toLocaleString()}</strong>.`;
    guessBtn.disabled = true;
    clueBtn.disabled = true;
    clearGuessBtn.disabled = true;
    restartBtn.hidden = false;
    updateTimerLabel(0);
    return;
  }

  gameState.round = nextRound;

  resetMapOverlays();
  map.setView([22, 0], 2);

  updateHud();
  loadRoundView();
}

function submitGuess(isAuto = false) {
  if (gameState.submitted || !gameState.guessedLatLng) {
    return;
  }

  clearTimers();

  const answer = gameState.rounds[gameState.round - 1];
  const guess = gameState.guessedLatLng;

  const distanceKm = haversineKm(guess, answer);
  const points = scoreFromDistance(distanceKm, gameState.revealedClues);

  gameState.score += points;
  gameState.submitted = true;

  answerMarker = L.circleMarker([answer.lat, answer.lng], {
    radius: 8,
    color: "#f43f5e",
    weight: 2,
    fillColor: "#f43f5e",
    fillOpacity: 0.35
  }).addTo(map);

  lineToAnswer = L.polyline(
    [
      [guess.lat, guess.lng],
      [answer.lat, answer.lng]
    ],
    {
      color: "#60a5fa",
      weight: 3,
      dashArray: "7 8"
    }
  ).addTo(map);

  map.fitBounds(
    L.latLngBounds([
      [guess.lat, guess.lng],
      [answer.lat, answer.lng]
    ]).pad(0.4)
  );

  clueBtn.disabled = true;
  guessBtn.disabled = true;
  clearGuessBtn.disabled = true;

  statusLabel.innerHTML =
    `Answer: <strong>${answer.country}</strong>. Distance: <strong>${distanceKm.toFixed(0)} km</strong>. ` +
    `Round score: <strong>${points.toLocaleString()}</strong>. ${isAuto ? "Time ran out." : ""} Loading next round...`;

  updateHud();
  autoAdvanceTimeout = setTimeout(advanceRound, AUTO_ADVANCE_MS);
}

map.on("click", (event) => {
  if (gameState.submitted) {
    return;
  }

  const { lat, lng } = event.latlng;
  gameState.guessedLatLng = { lat, lng };

  if (guessMarker) {
    guessMarker.setLatLng([lat, lng]);
  } else {
    guessMarker = L.marker([lat, lng]).addTo(map);
  }

  statusLabel.textContent = `Pinned at ${lat.toFixed(2)}, ${lng.toFixed(2)}. Press GUESS.`;
  guessBtn.disabled = false;
  clearGuessBtn.disabled = false;
});

clueBtn.addEventListener("click", () => {
  const roundData = gameState.rounds[gameState.round - 1];
  if (gameState.submitted || gameState.revealedClues >= roundData.clues.length) {
    return;
  }

  gameState.revealedClues += 1;
  renderClues();
});

clearGuessBtn.addEventListener("click", () => {
  if (gameState.submitted || !gameState.guessedLatLng) {
    return;
  }

  gameState.guessedLatLng = null;
  if (guessMarker) {
    map.removeLayer(guessMarker);
    guessMarker = null;
  }

  guessBtn.disabled = true;
  clearGuessBtn.disabled = true;
  statusLabel.textContent = "Pin cleared. Click the map to place a new guess.";
});

recenterBtn.addEventListener("click", () => {
  map.setView([22, 0], 2);
});

guessBtn.addEventListener("click", () => submitGuess(false));
restartBtn.addEventListener("click", startGame);
window.addEventListener("resize", () => map.invalidateSize());

startGame();
