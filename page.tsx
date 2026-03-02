"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ACCOUNTS_KEY = "geoguesser_accounts_v1";
const SESSION_KEY = "geoguesser_session_v1";

type Account = {
  password: string;
  email: string;
  newsletter: boolean;
  xp: number;
  level: number;
  coins: number;
  newsletterLog: Array<{ date: string; subject: string; body: string }>;
};

function getAccounts(): Record<string, Account> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [status, setStatus] = useState("Use a new username/email to register.");

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY)) router.replace("/home");
  }, [router]);

  const saveAccounts = (accounts: Record<string, Account>) => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  };

  const goHome = (user: string) => {
    localStorage.setItem(SESSION_KEY, user);
    router.push("/home");
  };

  const register = () => {
    const u = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    if (!u || !e || !password) return setStatus("Username, email, and password are required.");
    const accounts = getAccounts();
    if (accounts[u]) return setStatus("Username already exists.");
    const exists = Object.values(accounts).some((a) => a.email === e);
    if (exists) return setStatus("Email already in use.");
    accounts[u] = { password, email: e, newsletter, xp: 0, level: 1, coins: 0, newsletterLog: [] };
    saveAccounts(accounts);
    goHome(u);
  };

  const signIn = () => {
    const u = username.trim().toLowerCase();
    const accounts = getAccounts();
    if (!accounts[u] || accounts[u].password !== password) return setStatus("Invalid username or password.");
    goHome(u);
  };

  return (
    <div className="container">
      <div className="card">
        <h1>GeoGuesser Login</h1>
        <div className="row"><input placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div className="row"><input placeholder="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="row"><input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <label className="row small"><input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} /> Daily newsletter updates</label>
        <div className="row">
          <button onClick={signIn}>Sign In</button>
          <button onClick={register}>Register</button>
        </div>
        <p className="small">{status}</p>
      </div>
    </div>
  );
}
