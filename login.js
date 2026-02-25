const ACCOUNTS_KEY = "geoguesser_accounts_v1";
const SESSION_KEY = "geoguesser_session_v1";

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const signInBtn = document.getElementById("signInBtn");
const registerBtn = document.getElementById("registerBtn");
const authStatus = document.getElementById("authStatus");

if (localStorage.getItem(SESSION_KEY)) {
  window.location.href = "./home.html";
}

function getAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function setStatus(text) {
  authStatus.textContent = text;
}

function goGame(username) {
  localStorage.setItem(SESSION_KEY, username);
  window.location.href = "./home.html";
}

registerBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!username || !password) {
    setStatus("Username and password are required.");
    return;
  }

  const accounts = getAccounts();
  if (accounts[username]) {
    setStatus("User already exists.");
    return;
  }

  accounts[username] = { password };
  saveAccounts(accounts);
  goGame(username);
});

signInBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const accounts = getAccounts();

  if (!accounts[username] || accounts[username].password !== password) {
    setStatus("Invalid username or password.");
    return;
  }

  goGame(username);
});
