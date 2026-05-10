// src/App.jsx — Prono Coupe du Monde 2026
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── DATA ────────────────────────────────────────────────────────────────────

const GROUPS = {
  A: ["Mexique", "Afrique du Sud", "Corée du Sud", "Rép. Tchèque"],
  B: ["Canada", "Bosnie-Herzégovine", "Qatar", "Suisse"],
  C: ["Brésil", "Maroc", "Haïti", "Écosse"],
  D: ["États-Unis", "Paraguay", "Australie", "Turquie"],
  E: ["Allemagne", "Curaçao", "Côte d'Ivoire", "Équateur"],
  F: ["Pays-Bas", "Japon", "Suède", "Tunisie"],
  G: ["Belgique", "Égypte", "Iran", "Nouvelle-Zélande"],
  H: ["Espagne", "Uruguay", "Arabie Saoudite", "Cap-Vert"],
  I: ["France", "Sénégal", "Irak", "Norvège"],
  J: ["Argentine", "Algérie", "Autriche", "Jordanie"],
  K: ["Portugal", "Colombie", "RD Congo", "Ouzbékistan"],
  L: ["Angleterre", "Croatie", "Ghana", "Panama"],
};

const FLAGS = {
  Mexique:"🇲🇽","Afrique du Sud":"🇿🇦","Corée du Sud":"🇰🇷","Rép. Tchèque":"🇨🇿",
  Canada:"🇨🇦","Bosnie-Herzégovine":"🇧🇦",Qatar:"🇶🇦",Suisse:"🇨🇭",
  Brésil:"🇧🇷",Maroc:"🇲🇦",Haïti:"🇭🇹",Écosse:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "États-Unis":"🇺🇸",Paraguay:"🇵🇾",Australie:"🇦🇺",Turquie:"🇹🇷",
  Allemagne:"🇩🇪",Curaçao:"🇨🇼","Côte d'Ivoire":"🇨🇮",Équateur:"🇪🇨",
  "Pays-Bas":"🇳🇱",Japon:"🇯🇵",Suède:"🇸🇪",Tunisie:"🇹🇳",
  Belgique:"🇧🇪",Égypte:"🇪🇬",Iran:"🇮🇷","Nouvelle-Zélande":"🇳🇿",
  Espagne:"🇪🇸",Uruguay:"🇺🇾","Arabie Saoudite":"🇸🇦","Cap-Vert":"🇨🇻",
  France:"🇫🇷",Sénégal:"🇸🇳",Irak:"🇮🇶",Norvège:"🇳🇴",
  Argentine:"🇦🇷",Algérie:"🇩🇿",Autriche:"🇦🇹",Jordanie:"🇯🇴",
  Portugal:"🇵🇹",Colombie:"🇨🇴","RD Congo":"🇨🇩",Ouzbékistan:"🇺🇿",
  Angleterre:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Croatie:"🇭🇷",Ghana:"🇬🇭",Panama:"🇵🇦",
  "?":"❓",
};

const ALL_TEAMS = Object.values(GROUPS).flat();

function makeGroupMatches(teams) {
  const m = [];
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++)
      m.push({ home: teams[i], away: teams[j], homeScore: "", awayScore: "" });
  return m;
}

const EMPTY_GROUPS = Object.fromEntries(
  Object.entries(GROUPS).map(([g, t]) => [g, makeGroupMatches(t)])
);

const KO_ROUNDS = ["32èmes", "16èmes", "Quarts", "Demies", "Finale"];
const KO_COUNTS = { "32èmes": 16, "16èmes": 8, Quarts: 4, Demies: 2, Finale: 1 };

function emptyKO() {
  return Object.fromEntries(
    KO_ROUNDS.map(r => [r, Array.from({ length: KO_COUNTS[r] }, (_, i) => ({
      id: `${r}_${i}`, home: "?", away: "?", homeScore: "", awayScore: "",
    }))])
  );
}

// ─── SCORING ─────────────────────────────────────────────────────────────────

function getResult(h, a) {
  if (h === "" || a === "") return null;
  const hn = parseInt(h), an = parseInt(a);
  return hn > an ? "H" : an > hn ? "A" : "D";
}

function calcScore(prono, real) {
  let pts = 0, exact = 0, bons = 0;
  if (!prono || !real) return { pts, exact, bons };
  Object.entries(prono).forEach(([g, matches]) => {
    if (!Array.isArray(matches)) return;
    matches.forEach((m, idx) => {
      const r = real[g]?.[idx];
      if (!r || m.homeScore === "" || m.awayScore === "") return;
      const ph = parseInt(m.homeScore), pa = parseInt(m.awayScore);
      const rh = parseInt(r.homeScore), ra = parseInt(r.awayScore);
      if (isNaN(ph) || isNaN(pa) || isNaN(rh) || isNaN(ra)) return;
      if (ph === rh && pa === ra) { pts += 3; exact++; return; }
      if (getResult(ph, pa) === getResult(rh, ra)) { pts += 1; bons++; }
    });
  });
  return { pts, exact, bons };
}

// ─── MATCH ROW ────────────────────────────────────────────────────────────────

function MatchRow({ match, onChange, showSelects }) {
  return (
    <div className="match-card">
      {showSelects && (
        <div className="match-selects">
          <select className="team-select" value={match.home}
            onChange={e => onChange("home", e.target.value)}>
            {["?", ...ALL_TEAMS].map(t => (
              <option key={t} value={t}>{FLAGS[t] || "❓"} {t}</option>
            ))}
          </select>
          <span className="vs-lbl">vs</span>
          <select className="team-select" value={match.away}
            onChange={e => onChange("away", e.target.value)}>
            {["?", ...ALL_TEAMS].map(t => (
              <option key={t} value={t}>{FLAGS[t] || "❓"} {t}</option>
            ))}
          </select>
        </div>
      )}
      <div className="match-scores">
        <span className="team home">
          {FLAGS[match.home] || "❓"} <span className="tname">{match.home}</span>
        </span>
        <div className="score-inputs">
          <input type="number" min="0" max="99"
            value={match.homeScore}
            onChange={e => onChange("homeScore", e.target.value)}
            placeholder="–" />
          <span className="colon">:</span>
          <input type="number" min="0" max="99"
            value={match.awayScore}
            onChange={e => onChange("awayScore", e.target.value)}
            placeholder="–" />
        </div>
        <span className="team away">
          <span className="tname">{match.away}</span> {FLAGS[match.away] || "❓"}
        </span>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [view, setView] = useState("home"); // home | prono | leaderboard | admin_login | admin
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState(""); // "" | saving | saved | error

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const [realGroups, setRealGroups] = useState(EMPTY_GROUPS);
  const [realKO, setRealKO] = useState(emptyKO());

  const [allPlayers, setAllPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null); // full player object from DB

  const [newPlayerName, setNewPlayerName] = useState("");
  const [groupTab, setGroupTab] = useState("A");
  const [koTab, setKoTab] = useState(null); // null = showing groups, string = KO round

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRealResults();
    fetchLeaderboard();
  }, []);

  async function fetchRealResults() {
    const { data, error } = await supabase
      .from("real_results")
      .select("groups, ko")
      .eq("id", 1)
      .single();
    if (error) { console.error("fetchRealResults:", error); return; }
    if (data?.groups && Object.keys(data.groups).length > 0) setRealGroups(data.groups);
    if (data?.ko && Object.keys(data.ko).length > 0) setRealKO(data.ko);
  }

  async function fetchLeaderboard() {
    const { data, error } = await supabase.from("players").select("name, groups");
    if (error) { console.error("fetchLeaderboard:", error); return; }
    if (data) setAllPlayers(data);
  }

  // ── Join / Create player ──────────────────────────────────────────────────
  async function joinPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;

    setLoading(true);
    setError("");

    try {
      // 1. Try to find existing player
      const { data: existing, error: fetchError } = await supabase
        .from("players")
        .select("*")
        .eq("name", name)
        .maybeSingle(); // returns null if not found, no error

      if (fetchError) throw fetchError;

      if (existing) {
        // Player found — make sure groups/ko are properly structured
        const player = {
          ...existing,
          groups: existing.groups && Object.keys(existing.groups).length > 0
            ? existing.groups : EMPTY_GROUPS,
          ko: existing.ko && Object.keys(existing.ko).length > 0
            ? existing.ko : emptyKO(),
        };
        setCurrentPlayer(player);
        setNewPlayerName("");
        setView("prono");
      } else {
        // New player — create in DB
        const newP = {
          name,
          groups: EMPTY_GROUPS,
          ko: emptyKO(),
        };
        const { data: created, error: insertError } = await supabase
          .from("players")
          .insert(newP)
          .select()
          .single();

        if (insertError) throw insertError;

        setCurrentPlayer(created);
        setNewPlayerName("");
        setView("prono");
        fetchLeaderboard();
      }
    } catch (err) {
      console.error("joinPlayer:", err);
      setError("Erreur : " + (err.message || "impossible de se connecter"));
    } finally {
      setLoading(false);
    }
  }

  // ── Save player to DB (debounced via setTimeout) ──────────────────────────
  const saveTimeout = { current: null };

  function scheduleSave(updated) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setSaveStatus("saving");
    saveTimeout.current = setTimeout(async () => {
      const { error } = await supabase
        .from("players")
        .update({ groups: updated.groups, ko: updated.ko })
        .eq("name", updated.name);
      if (error) {
        console.error("save:", error);
        setSaveStatus("error");
      } else {
        setSaveStatus("saved");
        fetchLeaderboard();
      }
      setTimeout(() => setSaveStatus(""), 2500);
    }, 800);
  }

  // ── Update player group prono ─────────────────────────────────────────────
  function updateGroup(g, idx, field, val) {
    if (!currentPlayer) return;
    const updated = {
      ...currentPlayer,
      groups: {
        ...currentPlayer.groups,
        [g]: currentPlayer.groups[g].map((m, i) =>
          i === idx ? { ...m, [field]: val } : m
        ),
      },
    };
    setCurrentPlayer(updated);
    scheduleSave(updated);
  }

  // ── Update player KO prono ────────────────────────────────────────────────
  function updateKO(round, idx, field, val) {
    if (!currentPlayer) return;
    const updated = {
      ...currentPlayer,
      ko: {
        ...currentPlayer.ko,
        [round]: currentPlayer.ko[round].map((m, i) =>
          i === idx ? { ...m, [field]: val } : m
        ),
      },
    };
    setCurrentPlayer(updated);
    scheduleSave(updated);
  }

  // ── Admin: save real results ──────────────────────────────────────────────
  async function saveReal(newGroups, newKO) {
    setSaveStatus("saving");
    const { error } = await supabase
      .from("real_results")
      .update({ groups: newGroups, ko: newKO })
      .eq("id", 1);
    setSaveStatus(error ? "error" : "saved");
    setTimeout(() => setSaveStatus(""), 2500);
  }

  function updateRealGroup(g, idx, field, val) {
    const next = {
      ...realGroups,
      [g]: realGroups[g].map((m, i) => i === idx ? { ...m, [field]: val } : m),
    };
    setRealGroups(next);
    saveReal(next, realKO);
  }

  function updateRealKO(round, idx, field, val) {
    const next = {
      ...realKO,
      [round]: realKO[round].map((m, i) => i === idx ? { ...m, [field]: val } : m),
    };
    setRealKO(next);
    saveReal(realGroups, next);
  }

  function tryUnlock() {
    if (pwdInput === "admin2026") {
      setAdminUnlocked(true);
      setView("admin");
      setPwdError(false);
      fetchRealResults();
    } else {
      setPwdError(true);
    }
  }

  // ── Leaderboard ───────────────────────────────────────────────────────────
  const leaderboard = [...allPlayers]
    .map(p => ({ name: p.name, ...calcScore(p.groups || {}, realGroups) }))
    .sort((a, b) => b.pts - a.pts);

  const scoreInfo = currentPlayer
    ? calcScore(currentPlayer.groups || {}, realGroups)
    : null;

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #060d1a; --card: #0d1828; --card2: #122035; --border: #1c2f4a;
      --gold: #f0b429; --gold2: #d49a1a; --blue: #60a5fa; --red: #f87171; --green: #34d399;
      --text: #e2e8f3; --muted: #5a7a9f;
      --fh: 'Bebas Neue', sans-serif; --fb: 'DM Sans', sans-serif; --r: 14px;
    }
    body { background: var(--bg); color: var(--text); font-family: var(--fb); min-height: 100vh; }

    /* NAV */
    .nav {
      position: sticky; top: 0; z-index: 100;
      background: rgba(6,13,26,.97); backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; height: 56px; gap: 12px;
    }
    .logo { font-family: var(--fh); font-size: 20px; letter-spacing: 3px; color: var(--gold); white-space: nowrap; }
    .logo span { color: var(--text); }
    .nav-right { display: flex; align-items: center; gap: 8px; }
    .save-pill {
      font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; white-space: nowrap;
    }
    .save-pill.saving { background: rgba(96,165,250,.15); color: var(--blue); }
    .save-pill.saved  { background: rgba(52,211,153,.15);  color: var(--green); }
    .save-pill.error  { background: rgba(248,113,113,.15); color: var(--red); }
    .nav-links { display: flex; gap: 4px; }
    .nbtn {
      background: none; border: 1px solid transparent; color: var(--muted);
      font-family: var(--fb); font-size: 11px; font-weight: 700;
      padding: 5px 11px; border-radius: 8px; cursor: pointer; transition: all .15s;
      text-transform: uppercase; letter-spacing: .5px; white-space: nowrap;
    }
    .nbtn:hover { color: var(--text); border-color: var(--border); }
    .nbtn.active { color: var(--gold); border-color: var(--gold); background: rgba(240,180,41,.07); }

    /* LAYOUT */
    .content { max-width: 920px; margin: 0 auto; padding: 28px 16px 80px; }

    /* HERO */
    .hero { text-align: center; padding: 48px 0 32px; }
    .trophy { font-size: 60px; line-height: 1; margin-bottom: 10px; }
    .hero-title { font-family: var(--fh); font-size: clamp(34px,8vw,72px); letter-spacing: 4px; color: var(--gold); }
    .hero-sub { color: var(--muted); font-size: 14px; margin-top: 6px; margin-bottom: 36px; }

    /* RULES */
    .rules { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 440px; margin: 0 auto 36px; }
    @media(max-width:440px) { .rules { grid-template-columns: 1fr; } }
    .rule-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 20px 14px; text-align: center; }
    .rule-pts { font-family: var(--fh); font-size: 52px; line-height: 1; }
    .rule-pts.gold { color: var(--gold); }
    .rule-pts.blue { color: var(--blue); }
    .rule-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin: 4px 0; }
    .rule-desc { font-size: 13px; color: #8ca5c4; }

    /* PLAYER BOX */
    .pbox { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 24px; max-width: 440px; margin: 0 auto; }
    .pbox h3 { font-size: 14px; font-weight: 600; margin-bottom: 14px; }
    .row { display: flex; gap: 8px; }
    .input {
      flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 14px; color: var(--text); font-family: var(--fb); font-size: 14px; outline: none;
      transition: border .18s;
    }
    .input:focus { border-color: var(--gold); }
    .btn {
      background: var(--gold); color: #060d1a; border: none; border-radius: 8px;
      padding: 10px 18px; font-family: var(--fb); font-weight: 700; font-size: 13px;
      cursor: pointer; transition: background .15s, transform .1s; white-space: nowrap;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .btn:hover { background: var(--gold2); }
    .btn:active { transform: scale(.97); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .hint-text { margin-top: 10px; font-size: 12px; color: var(--muted); line-height: 1.5; }
    .err-text { margin-top: 8px; font-size: 12px; color: var(--red); }

    /* SECTION */
    .shead { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .stitle { font-family: var(--fh); font-size: 24px; letter-spacing: 2px; color: var(--gold); }
    .sinfo { font-size: 13px; color: var(--muted); }

    /* SCORE BADGE */
    .sbadge { background: linear-gradient(135deg, var(--gold), var(--gold2)); border-radius: 10px; padding: 10px 16px; display: inline-flex; align-items: baseline; gap: 6px; }
    .sbadge-pts { font-family: var(--fh); font-size: 34px; color: #060d1a; line-height: 1; }
    .sbadge-lbl { font-size: 12px; font-weight: 700; color: rgba(6,13,26,.6); text-transform: uppercase; }
    .sbadge-det { font-size: 11px; color: rgba(6,13,26,.5); }

    /* TABS */
    .tabs { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 16px; }
    .tab {
      background: var(--card); border: 1px solid var(--border); color: var(--muted);
      font-family: var(--fb); font-size: 12px; font-weight: 700;
      padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all .14s;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .tab:hover { color: var(--text); }
    .tab.active { background: var(--gold); color: #060d1a; border-color: var(--gold); }

    /* GROUP BAR */
    .gbar { background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: var(--muted); }
    .gbar strong { color: var(--text); }

    /* MATCHES */
    .matches { display: flex; flex-direction: column; gap: 8px; }
    .match-card { background: var(--card); border: 1px solid var(--border); border-radius: 11px; padding: 10px 14px; transition: border-color .15s; }
    .match-card:hover { border-color: #2a4060; }
    .match-selects { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .team-select { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 5px 8px; color: var(--text); font-family: var(--fb); font-size: 12px; outline: none; cursor: pointer; }
    .team-select:focus { border-color: var(--gold); }
    .vs-lbl { color: var(--muted); font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .match-scores { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
    .team { font-size: 13px; font-weight: 500; }
    .team.home { text-align: right; }
    .team.away { text-align: left; }
    @media(max-width:400px) { .tname { display: none; } }
    .score-inputs { display: flex; align-items: center; gap: 5px; }
    .score-inputs input {
      width: 42px; background: var(--bg); border: 1px solid var(--border); border-radius: 7px;
      color: var(--gold); font-family: var(--fh); font-size: 22px; text-align: center;
      padding: 4px 0; outline: none; -moz-appearance: textfield;
    }
    .score-inputs input::-webkit-outer-spin-button,
    .score-inputs input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .score-inputs input:focus { border-color: var(--gold); }
    .colon { color: var(--muted); font-weight: 800; font-size: 16px; }

    /* LEADERBOARD */
    .lb-list { display: flex; flex-direction: column; gap: 7px; }
    .lb-row { background: var(--card); border: 1px solid var(--border); border-radius: 11px; padding: 12px 16px; display: flex; align-items: center; gap: 14px; transition: all .15s; }
    .lb-row:hover { border-color: #2a4060; transform: translateX(3px); }
    .lb-row.me { border-color: rgba(240,180,41,.4); background: rgba(240,180,41,.04); }
    .lb-rank { font-family: var(--fh); font-size: 22px; min-width: 28px; text-align: center; }
    .lb-name { flex: 1; font-weight: 600; font-size: 15px; }
    .lb-pts { font-family: var(--fh); font-size: 28px; color: var(--gold); line-height: 1; }

    /* ADMIN */
    .admin-notice { background: rgba(240,180,41,.07); border: 1px solid rgba(240,180,41,.2); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: var(--gold); margin-bottom: 20px; }

    /* LOGIN */
    .login-card { max-width: 320px; margin: 70px auto; background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 32px; text-align: center; }
    .login-card h2 { font-family: var(--fh); font-size: 24px; letter-spacing: 2px; color: var(--gold); margin-bottom: 4px; }
    .login-card p { color: var(--muted); font-size: 13px; margin-bottom: 20px; }

    /* MISC */
    .divider { height: 1px; background: var(--border); margin: 24px 0; }
    .muted { font-size: 12px; color: var(--muted); }
    .empty { text-align: center; padding: 80px 0; color: var(--muted); }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(240,180,41,.3); border-top-color: var(--gold); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 10px; }
    .gmini { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
    .gmini-title { font-family: var(--fh); font-size: 15px; color: var(--gold); margin-bottom: 6px; letter-spacing: 1px; }
    .gmini-team { font-size: 12px; padding: 2px 0; }
    .section-lbl { font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 10px; }
  `;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{css}</style>

      {/* ── NAV ── */}
      <nav className="nav">
        <div className="logo">⚽ PRONO <span>2026</span></div>
        <div className="nav-right">
          {saveStatus && (
            <span className={`save-pill ${saveStatus}`}>
              {saveStatus === "saving" ? "⏳ Sauvegarde…"
               : saveStatus === "saved" ? "✅ Sauvegardé"
               : "❌ Erreur"}
            </span>
          )}
          <div className="nav-links">
            <button className={`nbtn ${view === "home" ? "active" : ""}`}
              onClick={() => setView("home")}>Accueil</button>
            {currentPlayer && (
              <button className={`nbtn ${view === "prono" ? "active" : ""}`}
                onClick={() => setView("prono")}>
                {currentPlayer.name}
              </button>
            )}
            <button className={`nbtn ${view === "leaderboard" ? "active" : ""}`}
              onClick={() => { fetchLeaderboard(); setView("leaderboard"); }}>
              Classement
            </button>
            <button className={`nbtn ${view === "admin" || view === "admin_login" ? "active" : ""}`}
              onClick={() => adminUnlocked ? setView("admin") : setView("admin_login")}>
              Admin
            </button>
          </div>
        </div>
      </nav>

      <div className="content">

        {/* ── HOME ── */}
        {view === "home" && (
          <>
            <div className="hero">
              <div className="trophy">🏆</div>
              <div className="hero-title">COUPE DU MONDE 2026</div>
              <div className="hero-sub">Canada · Mexique · États-Unis — 11 juin au 19 juillet 2026</div>
              <div className="rules">
                <div className="rule-card">
                  <div className="rule-pts gold">3</div>
                  <div className="rule-tag">Points</div>
                  <div className="rule-desc">Prono exact<br />(score parfait)</div>
                </div>
                <div className="rule-card">
                  <div className="rule-pts blue">1</div>
                  <div className="rule-tag">Point</div>
                  <div className="rule-desc">Bon pronostic<br />(bon vainqueur ou nul)</div>
                </div>
              </div>
            </div>

            <div className="pbox">
              <h3>👤 Entre ton prénom pour accéder à tes pronos</h3>
              <div className="row">
                <input
                  className="input"
                  placeholder="Ton prénom"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !loading && joinPlayer()}
                  autoFocus
                />
                <button className="btn" onClick={joinPlayer}
                  disabled={loading || !newPlayerName.trim()}>
                  {loading ? <><span className="spinner" />Chargement</> : "Entrer →"}
                </button>
              </div>
              {error && <div className="err-text">⚠️ {error}</div>}
              <div className="hint-text">
                ✅ Profil existant → tu retrouves tes pronos<br />
                🆕 Nouveau prénom → un profil est créé
              </div>
            </div>

            <div className="divider" />
            <div className="section-lbl">Les 12 groupes — 48 équipes</div>
            <div className="groups-grid">
              {Object.entries(GROUPS).map(([g, teams]) => (
                <div key={g} className="gmini">
                  <div className="gmini-title">Groupe {g}</div>
                  {teams.map(t => (
                    <div key={t} className="gmini-team">{FLAGS[t]} {t}</div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PRONOS ── */}
        {view === "prono" && currentPlayer && (
          <>
            <div className="shead">
              <div>
                <div className="stitle">🎯 MES PRONOS</div>
                <div className="sinfo">
                  Joueur : <strong style={{ color: "var(--text)" }}>{currentPlayer.name}</strong>
                </div>
              </div>
              {scoreInfo && (
                <div className="sbadge">
                  <span className="sbadge-pts">{scoreInfo.pts}</span>
                  <div>
                    <div className="sbadge-lbl">pts</div>
                    <div className="sbadge-det">{scoreInfo.exact} exact · {scoreInfo.bons} bon</div>
                  </div>
                </div>
              )}
            </div>

            {/* Group / KO selector */}
            <div className="tabs">
              {Object.keys(GROUPS).map(g => (
                <button key={g}
                  className={`tab ${groupTab === g && koTab === null ? "active" : ""}`}
                  onClick={() => { setGroupTab(g); setKoTab(null); }}>
                  Gr.{g}
                </button>
              ))}
              <button
                className={`tab ${koTab !== null ? "active" : ""}`}
                onClick={() => { setKoTab("32èmes"); }}>
                🏆 Phases finales
              </button>
            </div>

            {/* Group matches */}
            {koTab === null && (
              <>
                <div className="gbar">
                  <strong>Groupe {groupTab}</strong>
                  {" · "}
                  {GROUPS[groupTab].map(t => `${FLAGS[t]} ${t}`).join("  ·  ")}
                </div>
                <div className="matches">
                  {(currentPlayer.groups[groupTab] || []).map((m, idx) => (
                    <MatchRow key={idx} match={m}
                      onChange={(f, v) => updateGroup(groupTab, idx, f, v)} />
                  ))}
                </div>
              </>
            )}

            {/* KO matches */}
            {koTab !== null && (
              <>
                <div className="tabs">
                  {KO_ROUNDS.map(r => (
                    <button key={r}
                      className={`tab ${koTab === r ? "active" : ""}`}
                      onClick={() => setKoTab(r)}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="sinfo" style={{ marginBottom: 12 }}>
                  Sélectionne les équipes et saisis ton score prévu.
                </div>
                <div className="matches">
                  {(currentPlayer.ko[koTab] || []).map((m, idx) => (
                    <MatchRow key={idx} match={m} showSelects
                      onChange={(f, v) => updateKO(koTab, idx, f, v)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {view === "prono" && !currentPlayer && (
          <div className="empty">← Entre ton prénom sur l'accueil pour commencer</div>
        )}

        {/* ── LEADERBOARD ── */}
        {view === "leaderboard" && (
          <>
            <div className="shead">
              <div className="stitle">🏅 CLASSEMENT</div>
              <div className="sinfo">{leaderboard.length} participant{leaderboard.length > 1 ? "s" : ""}</div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty">Aucun joueur pour l'instant</div>
            ) : (
              <div className="lb-list">
                {leaderboard.map((p, i) => (
                  <div key={p.name}
                    className={`lb-row ${p.name === currentPlayer?.name ? "me" : ""}`}>
                    <div className="lb-rank">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </div>
                    <div>
                      <div className="lb-name">
                        {p.name}{p.name === currentPlayer?.name ? " · moi" : ""}
                      </div>
                      <div className="muted">{p.exact} exact · {p.bons} bon</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="lb-pts">{p.pts}</div>
                      <div className="muted">pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ADMIN LOGIN ── */}
        {view === "admin_login" && (
          <div className="login-card">
            <h2>🔐 ADMIN</h2>
            <p>Accès réservé à l'organisateur</p>
            <input className="input" type="password" placeholder="Mot de passe"
              value={pwdInput} onChange={e => setPwdInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && tryUnlock()}
              style={{ width: "100%", marginBottom: 10 }} />
            <button className="btn" style={{ width: "100%" }} onClick={tryUnlock}>
              Accéder
            </button>
            {pwdError && <div className="err-text">Mot de passe incorrect</div>}
            <div className="hint-text">Mot de passe par défaut : <strong>admin2026</strong></div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {view === "admin" && adminUnlocked && (
          <>
            <div className="shead">
              <div className="stitle">⚙️ RÉSULTATS RÉELS</div>
            </div>
            <div className="admin-notice">
              Saisissez les vrais résultats ici. Le classement se met à jour automatiquement.
            </div>

            <div className="tabs">
              {Object.keys(GROUPS).map(g => (
                <button key={g}
                  className={`tab ${groupTab === g && koTab === null ? "active" : ""}`}
                  onClick={() => { setGroupTab(g); setKoTab(null); }}>
                  Gr.{g}
                </button>
              ))}
              <button className={`tab ${koTab !== null ? "active" : ""}`}
                onClick={() => setKoTab("32èmes")}>
                🏆 Phases finales
              </button>
            </div>

            {koTab === null && (
              <>
                <div className="gbar">
                  <strong>Groupe {groupTab}</strong>
                  {" · "}
                  {GROUPS[groupTab].map(t => `${FLAGS[t]} ${t}`).join("  ·  ")}
                </div>
                <div className="matches">
                  {realGroups[groupTab].map((m, idx) => (
                    <MatchRow key={idx} match={m}
                      onChange={(f, v) => updateRealGroup(groupTab, idx, f, v)} />
                  ))}
                </div>
              </>
            )}

            {koTab !== null && (
              <>
                <div className="tabs">
                  {KO_ROUNDS.map(r => (
                    <button key={r}
                      className={`tab ${koTab === r ? "active" : ""}`}
                      onClick={() => setKoTab(r)}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="matches">
                  {realKO[koTab].map((m, idx) => (
                    <MatchRow key={idx} match={m} showSelects
                      onChange={(f, v) => updateRealKO(koTab, idx, f, v)} />
                  ))}
                </div>
              </>
            )}

            <div className="divider" />
            <div className="muted">{allPlayers.length} joueur(s) enregistré(s) en base.</div>
          </>
        )}

      </div>
    </div>
  );
}
