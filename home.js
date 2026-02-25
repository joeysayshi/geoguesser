const SESSION_KEY = "geoguesser_session_v1";

const homeUserLabel = document.getElementById("homeUserLabel");
const homeLogoutBtn = document.getElementById("homeLogoutBtn");
const searchBtn = document.getElementById("searchBtn");
const profileBtn = document.getElementById("profileBtn");
const continueBtn = document.getElementById("continueBtn");
const dailyPlayBtn = document.getElementById("dailyPlayBtn");
const exploreBtn = document.getElementById("exploreBtn");
const duelBtn = document.getElementById("duelBtn");

const user = localStorage.getItem(SESSION_KEY);
if (!user) {
  window.location.href = "./login.html";
}

homeUserLabel.textContent = user;

homeLogoutBtn.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "./login.html";
});

continueBtn.addEventListener("click", () => {
  window.location.href = "./game.html";
});

dailyPlayBtn.addEventListener("click", () => {
  window.location.href = "./game.html?daily=1";
});

exploreBtn.addEventListener("click", () => {
  window.location.href = "./game.html";
});

duelBtn.addEventListener("click", () => {
  window.location.href = "./game.html?mode=blitz";
});

searchBtn.addEventListener("click", () => {
  window.location.href = "./game.html";
});

profileBtn.addEventListener("click", () => {
  window.location.href = "./game.html";
});
