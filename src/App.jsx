// src/App.jsx — Prono Coupe du Monde 2026
import { useState, useEffect, useRef } from "react";
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

const AVATAR_COLORS = [
  "#f0b429","#60a5fa","#34d399","#f87171","#a78bfa",
  "#fb923c","#38bdf8","#4ade80","#f472b6","#facc15",
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

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

const KO_ROUNDS = ["Seizièmes", "Huitièmes", "Quarts", "Demies", "Finale"];
const KO_COUNTS = { "16èmes": 16, "8èmes": 8, Quarts: 4, Demies: 2, Finale: 1 };

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

function countFilled(groups) {
  let filled = 0, total = 0;
  Object.values(groups).forEach(matches => {
    matches.forEach(m => {
      total++;
      if (m.homeScore !== "" && m.awayScore !== "") filled++;
    });
  });
  return { filled, total };
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Avatar({ name, size = 32 }) {
  const color = getAvatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", border: `2px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0,
      fontFamily: "var(--fb)",
    }}>
      {getInitials(name)}
    </div>
  );
}

function ProgressBar({ filled, total }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <div className="progress-wrap">
      <div className="progress-header">
        <span>Progression phase de poule</span>
        <span className="progress-count">{filled}/{total} matchs · {pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MatchRow({ match, onChange, showSelects, highlight }) {
  const hasScore = match.homeScore !== "" && match.awayScore !== "";
  return (
    <div className={`match-card ${hasScore ? "filled" : ""} ${highlight ? "highlight" : ""}`}>
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
          <span className="flag">{FLAGS[match.home] || "❓"}</span>
          <span className="tname">{match.home}</span>
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
          <span className="tname">{match.away}</span>
          <span className="flag">{FLAGS[match.away] || "❓"}</span>
        </span>
      </div>
    </div>
  );
}

function GroupSection({ groupKey, matches, onChange }) {
  const teams = GROUPS[groupKey];
  return (
    <div className="group-section">
      <div className="group-header">
        <span className="group-letter">Groupe {groupKey}</span>
        <span className="group-teams">
          {teams.map(t => (
            <span key={t} className="group-team-chip">
              {FLAGS[t]} {t}
            </span>
          ))}
        </span>
      </div>
      <div className="matches">
        {matches.map((m, idx) => (
          <MatchRow key={idx} match={m}
            onChange={(f, v) => onChange(groupKey, idx, f, v)} />
        ))}
      </div>
    </div>
  );
}

// ─── CHAT ────────────────────────────────────────────────────────────────────

function Chat({ currentPlayerName }) {
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchComments();
    // Realtime subscription
    const channel = supabase
      .channel("comments-channel")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "comments"
      }, payload => {
        setComments(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  async function fetchComments() {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setComments(data);
  }

  async function sendMessage() {
    const msg = message.trim();
    if (!msg || !currentPlayerName) return;
    setSending(true);
    await supabase.from("comments").insert({
      author: currentPlayerName,
      message: msg,
    });
    setMessage("");
    setSending(false);
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  }

  return (
    <div className="chat-wrap">
      <div className="chat-messages">
        {comments.length === 0 && (
          <div className="chat-empty">Soyez le premier à commenter ! 💬</div>
        )}
        {comments.map((c, i) => {
          const isMe = c.author === currentPlayerName;
          return (
            <div key={c.id || i} className={`chat-msg ${isMe ? "me" : "other"}`}>
              {!isMe && <Avatar name={c.author} size={30} />}
              <div className="chat-bubble-wrap">
                {!isMe && <div className="chat-author">{c.author}</div>}
                <div className={`chat-bubble ${isMe ? "bubble-me" : "bubble-other"}`}>
                  {c.message}
                </div>
                <div className="chat-time">{formatTime(c.created_at)}</div>
              </div>
              {isMe && <Avatar name={c.author} size={30} />}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {currentPlayerName ? (
        <div className="chat-input-wrap">
          <Avatar name={currentPlayerName} size={32} />
          <input
            className="chat-input"
            placeholder="Ton message…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            maxLength={300}
          />
          <button className="chat-send" onClick={sendMessage} disabled={sending || !message.trim()}>
            {sending ? "…" : "↑"}
          </button>
        </div>
      ) : (
        <div className="chat-login-hint">
          ← Connecte-toi sur l'accueil pour participer au tchat
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const [realGroups, setRealGroups] = useState(EMPTY_GROUPS);
  const [realKO, setRealKO] = useState(emptyKO());
  const [allPlayers, setAllPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");

  // Pronos navigation
  const [pronosSection, setPronosSection] = useState("poule"); // "poule" | "finale"
  const [koTab, setKoTab] = useState("32èmes");

  // Admin navigation
  const [adminSection, setAdminSection] = useState("poule");
  const [adminKoTab, setAdminKoTab] = useState("32èmes");
  const [adminGroupTab, setAdminGroupTab] = useState("A");

  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    fetchRealResults();
    fetchLeaderboard();
  }, []);

  async function fetchRealResults() {
    const { data } = await supabase
      .from("real_results").select("groups, ko").eq("id", 1).single();
    if (data?.groups && Object.keys(data.groups).length > 0) setRealGroups(data.groups);
    if (data?.ko && Object.keys(data.ko).length > 0) setRealKO(data.ko);
  }

  async function fetchLeaderboard() {
    const { data } = await supabase.from("players").select("name, groups");
    if (data) setAllPlayers(data);
  }

  async function joinPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setLoading(true);
    setLoginError("");
    try {
      const { data: existing } = await supabase
        .from("players").select("*").eq("name", name).maybeSingle();
      if (existing) {
        setCurrentPlayer({
          ...existing,
          groups: existing.groups && Object.keys(existing.groups).length > 0
            ? existing.groups : EMPTY_GROUPS,
          ko: existing.ko && Object.keys(existing.ko).length > 0
            ? existing.ko : emptyKO(),
        });
      } else {
        const newP = { name, groups: EMPTY_GROUPS, ko: emptyKO() };
        const { data: created, error } = await supabase
          .from("players").insert(newP).select().single();
        if (error) throw error;
        setCurrentPlayer(created);
        fetchLeaderboard();
      }
      setNewPlayerName("");
      setView("prono");
    } catch (err) {
      setLoginError("Erreur : " + (err.message || "connexion impossible"));
    } finally {
      setLoading(false);
    }
  }

  function scheduleSave(updated) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from("players")
        .update({ groups: updated.groups, ko: updated.ko })
        .eq("name", updated.name);
      setSaveStatus(error ? "error" : "saved");
      setTimeout(() => setSaveStatus(""), 2500);
      fetchLeaderboard();
    }, 700);
  }

  function updateGroup(g, idx, field, val) {
    if (!currentPlayer) return;
    const updated = {
      ...currentPlayer,
      groups: {
        ...currentPlayer.groups,
        [g]: currentPlayer.groups[g].map((m, i) =>
          i === idx ? { ...m, [field]: val } : m),
      },
    };
    setCurrentPlayer(updated);
    scheduleSave(updated);
  }

  function updateKO(round, idx, field, val) {
    if (!currentPlayer) return;
    const updated = {
      ...currentPlayer,
      ko: {
        ...currentPlayer.ko,
        [round]: currentPlayer.ko[round].map((m, i) =>
          i === idx ? { ...m, [field]: val } : m),
      },
    };
    setCurrentPlayer(updated);
    scheduleSave(updated);
  }

  async function saveReal(newGroups, newKO) {
    setSaveStatus("saving");
    const { error } = await supabase
      .from("real_results").update({ groups: newGroups, ko: newKO }).eq("id", 1);
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
      setAdminUnlocked(true); setView("admin"); setPwdError(false); fetchRealResults();
    } else setPwdError(true);
  }

  const leaderboard = [...allPlayers]
    .map(p => ({ name: p.name, ...calcScore(p.groups || {}, realGroups) }))
    .sort((a, b) => b.pts - a.pts);

  const scoreInfo = currentPlayer
    ? calcScore(currentPlayer.groups || {}, realGroups) : null;

  const progress = currentPlayer
    ? countFilled(currentPlayer.groups || {}) : { filled: 0, total: 0 };

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #060d1a; --card: #0d1828; --card2: #0f1f35; --border: #1c2f4a;
      --gold: #f0b429; --gold2: #d49a1a; --blue: #60a5fa; --red: #f87171;
      --green: #34d399; --purple: #a78bfa;
      --text: #e2e8f3; --muted: #5a7a9f; --muted2: #3a5270;
      --fh: 'Bebas Neue', sans-serif; --fb: 'DM Sans', sans-serif; --r: 14px;
    }
    body { background: var(--bg); color: var(--text); font-family: var(--fb); min-height: 100vh; }

    /* ── NAV ── */
    .nav {
      position: sticky; top: 0; z-index: 200;
      background: rgba(6,13,26,.97); backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 20px; height: 58px;
    }
    .logo { font-family: var(--fh); font-size: 20px; letter-spacing: 3px; color: var(--gold); }
    .logo span { color: var(--text); }
    .nav-right { display: flex; align-items: center; gap: 10px; }
    .save-pill { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
    .save-pill.saving { background: rgba(96,165,250,.15); color: var(--blue); }
    .save-pill.saved  { background: rgba(52,211,153,.15);  color: var(--green); }
    .save-pill.error  { background: rgba(248,113,113,.15); color: var(--red); }
    .nav-links { display: flex; gap: 3px; }
    .nbtn {
      background: none; border: 1px solid transparent; color: var(--muted);
      font-family: var(--fb); font-size: 11px; font-weight: 700;
      padding: 5px 12px; border-radius: 8px; cursor: pointer; transition: all .15s;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .nbtn:hover { color: var(--text); border-color: var(--border); }
    .nbtn.active { color: var(--gold); border-color: var(--gold); background: rgba(240,180,41,.07); }

    /* ── LAYOUT ── */
    .content { max-width: 960px; margin: 0 auto; padding: 32px 16px 80px; }

    /* ── HOME ── */
    .hero { text-align: center; padding: 48px 0 32px; }
    .trophy { font-size: 64px; line-height: 1; margin-bottom: 12px; }
    .hero-title { font-family: var(--fh); font-size: clamp(36px,8vw,80px); letter-spacing: 4px; color: var(--gold); }
    .hero-sub { color: var(--muted); font-size: 14px; margin-top: 6px; margin-bottom: 36px; letter-spacing: .3px; }

    .rules { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 420px; margin: 0 auto 36px; }
    @media(max-width:420px) { .rules { grid-template-columns: 1fr; } }
    .rule-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 20px 14px; text-align: center; }
    .rule-pts { font-family: var(--fh); font-size: 52px; line-height: 1; }
    .rule-pts.gold { color: var(--gold); }
    .rule-pts.blue { color: var(--blue); }
    .rule-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin: 4px 0; }
    .rule-desc { font-size: 13px; color: #8ca5c4; line-height: 1.4; }

    /* ── LOGIN BOX ── */
    .pbox { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 26px; max-width: 460px; margin: 0 auto 36px; }
    .pbox h3 { font-size: 14px; font-weight: 600; margin-bottom: 14px; }
    .row { display: flex; gap: 8px; }
    .input {
      flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      padding: 11px 14px; color: var(--text); font-family: var(--fb); font-size: 14px; outline: none;
      transition: border .18s;
    }
    .input:focus { border-color: var(--gold); }
    .btn {
      background: var(--gold); color: #060d1a; border: none; border-radius: 8px;
      padding: 11px 20px; font-family: var(--fb); font-weight: 700; font-size: 13px;
      cursor: pointer; transition: background .15s, transform .1s; white-space: nowrap;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .btn:hover { background: var(--gold2); }
    .btn:active { transform: scale(.97); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .hint-text { margin-top: 10px; font-size: 12px; color: var(--muted); line-height: 1.6; }
    .err-text  { margin-top: 8px; font-size: 12px; color: var(--red); }

    /* ── GROUPS GRID (home) ── */
    .groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 10px; }
    .gmini { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
    .gmini-title { font-family: var(--fh); font-size: 15px; color: var(--gold); margin-bottom: 8px; letter-spacing: 1px; }
    .gmini-team { font-size: 12px; padding: 3px 0; display: flex; align-items: center; gap: 6px; }

    /* ── SECTION ── */
    .shead { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
    .stitle { font-family: var(--fh); font-size: 26px; letter-spacing: 2px; color: var(--gold); }
    .sinfo  { font-size: 13px; color: var(--muted); }
    .divider { height: 1px; background: var(--border); margin: 28px 0; }
    .section-lbl { font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 12px; }
    .muted { font-size: 12px; color: var(--muted); }

    /* ── SCORE BADGE ── */
    .sbadge { background: linear-gradient(135deg, var(--gold), var(--gold2)); border-radius: 12px; padding: 12px 18px; display: inline-flex; align-items: center; gap: 10px; }
    .sbadge-pts { font-family: var(--fh); font-size: 42px; color: #060d1a; line-height: 1; }
    .sbadge-right {}
    .sbadge-lbl { font-size: 12px; font-weight: 700; color: rgba(6,13,26,.65); text-transform: uppercase; letter-spacing: .5px; }
    .sbadge-det { font-size: 11px; color: rgba(6,13,26,.5); margin-top: 2px; }

    /* ── PROGRESS ── */
    .progress-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 18px; margin-bottom: 22px; }
    .progress-header { display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
    .progress-count { color: var(--text); }
    .progress-track { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold2)); border-radius: 3px; transition: width .4s ease; }

    /* ── SECTION SWITCHER (poule / finale) ── */
    .section-switcher { display: flex; gap: 0; margin-bottom: 24px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 4px; width: fit-content; }
    .switcher-btn {
      background: none; border: none; color: var(--muted);
      font-family: var(--fb); font-size: 13px; font-weight: 700;
      padding: 8px 20px; border-radius: 7px; cursor: pointer; transition: all .15s;
    }
    .switcher-btn.active { background: var(--gold); color: #060d1a; }
    .switcher-btn:not(.active):hover { color: var(--text); }

    /* ── TABS ── */
    .tabs { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 16px; }
    .tab {
      background: var(--card); border: 1px solid var(--border); color: var(--muted);
      font-family: var(--fb); font-size: 12px; font-weight: 700;
      padding: 6px 13px; border-radius: 8px; cursor: pointer; transition: all .14s;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .tab:hover { color: var(--text); }
    .tab.active { background: var(--gold); color: #060d1a; border-color: var(--gold); }

    /* ── GROUP SECTION ── */
    .group-section { margin-bottom: 28px; }
    .group-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
    .group-letter { font-family: var(--fh); font-size: 20px; color: var(--gold); letter-spacing: 1px; white-space: nowrap; min-width: 80px; }
    .group-teams { display: flex; flex-wrap: wrap; gap: 6px; }
    .group-team-chip { font-size: 12px; background: var(--card2); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; color: var(--muted); }

    /* ── MATCH CARD ── */
    .matches { display: flex; flex-direction: column; gap: 7px; }
    .match-card {
      background: var(--card); border: 1px solid var(--border); border-radius: 11px;
      padding: 10px 14px; transition: border-color .15s;
    }
    .match-card:hover { border-color: var(--muted2); }
    .match-card.filled { border-color: rgba(240,180,41,.2); }
    .match-selects { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .team-select { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 5px 8px; color: var(--text); font-family: var(--fb); font-size: 12px; outline: none; }
    .team-select:focus { border-color: var(--gold); }
    .vs-lbl { color: var(--muted); font-size: 11px; font-weight: 700; }
    .match-scores { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
    .team { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .team.home { justify-content: flex-end; flex-direction: row; }
    .team.away { justify-content: flex-start; flex-direction: row-reverse; }
    .flag { font-size: 18px; flex-shrink: 0; }
    @media(max-width:420px) { .tname { display: none; } }
    .score-inputs { display: flex; align-items: center; gap: 5px; justify-content: center; }
    .score-inputs input {
      width: 44px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
      color: var(--gold); font-family: var(--fh); font-size: 24px; text-align: center;
      padding: 5px 0; outline: none; -moz-appearance: textfield; transition: border .15s;
    }
    .score-inputs input::-webkit-outer-spin-button,
    .score-inputs input::-webkit-inner-spin-button { -webkit-appearance: none; }
    .score-inputs input:focus { border-color: var(--gold); background: rgba(240,180,41,.05); }
    .colon { color: var(--muted); font-weight: 900; font-size: 18px; }

    /* ── LEADERBOARD ── */
    .lb-list { display: flex; flex-direction: column; gap: 8px; }
    .lb-row {
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: all .15s;
    }
    .lb-row:hover { border-color: var(--muted2); transform: translateX(4px); }
    .lb-row.me { border-color: rgba(240,180,41,.35); background: rgba(240,180,41,.03); }
    .lb-row.first { border-color: rgba(240,180,41,.5); background: rgba(240,180,41,.06); }
    .lb-rank { font-family: var(--fh); font-size: 22px; min-width: 32px; text-align: center; }
    .lb-info { flex: 1; }
    .lb-name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
    .lb-me-tag { font-size: 10px; background: rgba(240,180,41,.15); color: var(--gold); padding: 2px 7px; border-radius: 10px; font-weight: 700; }
    .lb-detail { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .lb-score { text-align: right; }
    .lb-pts { font-family: var(--fh); font-size: 32px; color: var(--gold); line-height: 1; }

    /* ── CHAT ── */
    .chat-wrap { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); display: flex; flex-direction: column; height: 500px; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .chat-messages::-webkit-scrollbar { width: 4px; }
    .chat-messages::-webkit-scrollbar-track { background: transparent; }
    .chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
    .chat-empty { text-align: center; color: var(--muted); font-size: 14px; padding: 40px 0; }
    .chat-msg { display: flex; align-items: flex-end; gap: 8px; }
    .chat-msg.me { flex-direction: row-reverse; }
    .chat-bubble-wrap { display: flex; flex-direction: column; max-width: 70%; }
    .chat-msg.me .chat-bubble-wrap { align-items: flex-end; }
    .chat-author { font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 3px; padding: 0 6px; }
    .chat-bubble { padding: 9px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; word-break: break-word; }
    .bubble-other { background: var(--card2); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
    .bubble-me { background: linear-gradient(135deg, var(--gold), var(--gold2)); color: #060d1a; font-weight: 500; border-bottom-right-radius: 4px; }
    .chat-time { font-size: 10px; color: var(--muted); margin-top: 3px; padding: 0 6px; }
    .chat-input-wrap {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px; border-top: 1px solid var(--border);
    }
    .chat-input {
      flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 20px;
      padding: 9px 16px; color: var(--text); font-family: var(--fb); font-size: 14px; outline: none;
      transition: border .18s;
    }
    .chat-input:focus { border-color: var(--gold); }
    .chat-send {
      width: 36px; height: 36px; border-radius: 50%; background: var(--gold); border: none;
      color: #060d1a; font-size: 18px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, transform .1s; flex-shrink: 0;
    }
    .chat-send:hover { background: var(--gold2); }
    .chat-send:active { transform: scale(.93); }
    .chat-send:disabled { opacity: .4; cursor: not-allowed; }
    .chat-login-hint { padding: 14px 16px; border-top: 1px solid var(--border); font-size: 13px; color: var(--muted); text-align: center; }

    /* ── ADMIN ── */
    .admin-notice { background: rgba(240,180,41,.06); border: 1px solid rgba(240,180,41,.2); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: var(--gold); margin-bottom: 20px; }

    /* ── LOGIN ── */
    .login-card { max-width: 320px; margin: 70px auto; background: var(--card); border: 1px solid var(--border); border-radius: var(--r); padding: 32px; text-align: center; }
    .login-card h2 { font-family: var(--fh); font-size: 24px; letter-spacing: 2px; color: var(--gold); margin-bottom: 4px; }
    .login-card p { color: var(--muted); font-size: 13px; margin-bottom: 20px; }

    /* ── MISC ── */
    .empty { text-align: center; padding: 80px 0; color: var(--muted); }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(240,180,41,.3); border-top-color: var(--gold); border-radius: 50%; animation: spin .6s linear infinite; vertical-align: middle; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{css}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="logo">⚽ PRONO <span>2026</span></div>
        <div className="nav-right">
          {saveStatus && (
            <span className={`save-pill ${saveStatus}`}>
              {saveStatus === "saving" ? "⏳ Sauvegarde…"
               : saveStatus === "saved" ? "✅ Sauvegardé" : "❌ Erreur"}
            </span>
          )}
          <div className="nav-links">
            <button className={`nbtn ${view === "home" ? "active" : ""}`}
              onClick={() => setView("home")}>Accueil</button>
            {currentPlayer && (
              <button className={`nbtn ${view === "prono" ? "active" : ""}`}
                onClick={() => setView("prono")}>
                🎯 {currentPlayer.name}
              </button>
            )}
            <button className={`nbtn ${view === "leaderboard" ? "active" : ""}`}
              onClick={() => { fetchLeaderboard(); setView("leaderboard"); }}>
              Classement
            </button>
            <button className={`nbtn ${view === "chat" ? "active" : ""}`}
              onClick={() => setView("chat")}>
              💬 Tchat
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
        {view === "home" && <>
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
              <input className="input" placeholder="Ton prénom"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && joinPlayer()}
                autoFocus />
              <button className="btn" onClick={joinPlayer}
                disabled={loading || !newPlayerName.trim()}>
                {loading ? <><span className="spinner" />…</> : "Entrer →"}
              </button>
            </div>
            {loginError && <div className="err-text">⚠️ {loginError}</div>}
            <div className="hint-text">
              ✅ Prénom existant → tu retrouves tes pronos<br />
              🆕 Nouveau prénom → un profil est créé automatiquement
            </div>
          </div>

          <div className="section-lbl">Les 12 groupes — 48 équipes</div>
          <div className="groups-grid">
            {Object.entries(GROUPS).map(([g, teams]) => (
              <div key={g} className="gmini">
                <div className="gmini-title">Groupe {g}</div>
                {teams.map(t => (
                  <div key={t} className="gmini-team">
                    <span>{FLAGS[t]}</span><span>{t}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>}

        {/* ── PRONOS ── */}
        {view === "prono" && currentPlayer && <>
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
                <div className="sbadge-right">
                  <div className="sbadge-lbl">points</div>
                  <div className="sbadge-det">{scoreInfo.exact} exact · {scoreInfo.bons} bon</div>
                </div>
              </div>
            )}
          </div>

          <ProgressBar filled={progress.filled} total={progress.total} />

          {/* Section switcher */}
          <div className="section-switcher">
            <button className={`switcher-btn ${pronosSection === "poule" ? "active" : ""}`}
              onClick={() => setPronosSection("poule")}>
              ⚽ Phase de poule
            </button>
            <button className={`switcher-btn ${pronosSection === "finale" ? "active" : ""}`}
              onClick={() => setPronosSection("finale")}>
              🏆 Phase finale
            </button>
          </div>

          {/* POULE — tous les groupes d'affilée */}
          {pronosSection === "poule" && (
            <div>
              {Object.keys(GROUPS).map(g => (
                <GroupSection
                  key={g}
                  groupKey={g}
                  matches={currentPlayer.groups[g] || []}
                  onChange={updateGroup}
                />
              ))}
            </div>
          )}

          {/* FINALE */}
          {pronosSection === "finale" && <>
            <div className="tabs">
              {KO_ROUNDS.map(r => (
                <button key={r} className={`tab ${koTab === r ? "active" : ""}`}
                  onClick={() => setKoTab(r)}>{r}</button>
              ))}
            </div>
            <div className="sinfo" style={{ marginBottom: 14 }}>
              Sélectionne les équipes et saisis ton score prévu pour chaque match.
            </div>
            <div className="matches">
              {(currentPlayer.ko[koTab] || []).map((m, idx) => (
                <MatchRow key={idx} match={m} showSelects
                  onChange={(f, v) => updateKO(koTab, idx, f, v)} />
              ))}
            </div>
          </>}
        </>}

        {view === "prono" && !currentPlayer && (
          <div className="empty">← Entre ton prénom sur l'accueil pour commencer</div>
        )}

        {/* ── LEADERBOARD ── */}
        {view === "leaderboard" && <>
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
                  className={`lb-row ${i === 0 ? "first" : ""} ${p.name === currentPlayer?.name ? "me" : ""}`}>
                  <div className="lb-rank">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </div>
                  <Avatar name={p.name} size={36} />
                  <div className="lb-info">
                    <div className="lb-name">
                      {p.name}
                      {p.name === currentPlayer?.name && <span className="lb-me-tag">moi</span>}
                    </div>
                    <div className="lb-detail">{p.exact} pronos exacts · {p.bons} bons</div>
                  </div>
                  <div className="lb-score">
                    <div className="lb-pts">{p.pts}</div>
                    <div className="muted">pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ── CHAT ── */}
        {view === "chat" && <>
          <div className="shead">
            <div className="stitle">💬 TCHAT</div>
            <div className="sinfo">Échangez entre participants</div>
          </div>
          <Chat currentPlayerName={currentPlayer?.name || null} />
        </>}

        {/* ── ADMIN LOGIN ── */}
        {view === "admin_login" && (
          <div className="login-card">
            <h2>🔐 ADMIN</h2>
            <p>Accès réservé à l'organisateur pour saisir les vrais résultats</p>
            <input className="input" type="password" placeholder="Mot de passe"
              value={pwdInput} onChange={e => setPwdInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && tryUnlock()}
              style={{ width: "100%", marginBottom: 10 }} />
            <button className="btn" style={{ width: "100%" }} onClick={tryUnlock}>Accéder</button>
            {pwdError && <div className="err-text">Mot de passe incorrect</div>}
            <div className="hint-text">Mot de passe par défaut : <strong>admin2026</strong></div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {view === "admin" && adminUnlocked && <>
          <div className="shead">
            <div className="stitle">⚙️ RÉSULTATS RÉELS</div>
            <div className="sinfo">{allPlayers.length} joueur(s) en base</div>
          </div>
          <div className="admin-notice">
            Saisissez les vrais résultats ici — le classement se met à jour automatiquement.
          </div>

          <div className="section-switcher">
            <button className={`switcher-btn ${adminSection === "poule" ? "active" : ""}`}
              onClick={() => setAdminSection("poule")}>⚽ Phase de poule</button>
            <button className={`switcher-btn ${adminSection === "finale" ? "active" : ""}`}
              onClick={() => setAdminSection("finale")}>🏆 Phase finale</button>
          </div>

          {adminSection === "poule" && (
            <>
              <div className="tabs">
                {Object.keys(GROUPS).map(g => (
                  <button key={g} className={`tab ${adminGroupTab === g ? "active" : ""}`}
                    onClick={() => setAdminGroupTab(g)}>Gr.{g}</button>
                ))}
              </div>
              <div className="matches">
                {realGroups[adminGroupTab]?.map((m, idx) => (
                  <MatchRow key={idx} match={m}
                    onChange={(f, v) => updateRealGroup(adminGroupTab, idx, f, v)} />
                ))}
              </div>
            </>
          )}

          {adminSection === "finale" && <>
            <div className="tabs">
              {KO_ROUNDS.map(r => (
                <button key={r} className={`tab ${adminKoTab === r ? "active" : ""}`}
                  onClick={() => setAdminKoTab(r)}>{r}</button>
              ))}
            </div>
            <div className="matches">
              {realKO[adminKoTab]?.map((m, idx) => (
                <MatchRow key={idx} match={m} showSelects
                  onChange={(f, v) => updateRealKO(adminKoTab, idx, f, v)} />
              ))}
            </div>
          </>}
        </>}

      </div>
    </div>
  );
}
