// src/App.jsx — Prono Coupe du Monde 2026
// Connecté à Supabase pour un accès multi-joueurs depuis n'importe où

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ─── DATA 2026 ────────────────────────────────────────────────────────────────

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

const KO_ROUNDS = ["32èmes","16èmes","Quarts","Demies","Finale"];
const KO_COUNTS = { "32èmes":16, "16èmes":8, Quarts:4, Demies:2, Finale:1 };

function emptyKO() {
  return Object.fromEntries(
    KO_ROUNDS.map(r => [r, Array.from({ length: KO_COUNTS[r] }, (_, i) => ({
      id:`${r}_${i}`, home:"?", away:"?", homeScore:"", awayScore:"",
    }))])
  );
}

// ─── SCORING ──────────────────────────────────────────────────────────────────

function getResult(h, a) {
  if (h===""||a==="") return null;
  const hn=parseInt(h), an=parseInt(a);
  return hn>an?"H":an>hn?"A":"D";
}

function calcScore(prono, real) {
  let pts=0, exact=0, bons=0;
  Object.entries(prono).forEach(([g,matches]) => {
    matches.forEach((m,idx) => {
      const r = real[g]?.[idx];
      if (!r||m.homeScore===""||m.awayScore==="") return;
      const ph=parseInt(m.homeScore), pa=parseInt(m.awayScore);
      const rh=parseInt(r.homeScore), ra=parseInt(r.awayScore);
      if (isNaN(ph)||isNaN(pa)||isNaN(rh)||isNaN(ra)) return;
      if (ph===rh&&pa===ra) { pts+=3; exact++; return; }
      if (getResult(ph,pa)===getResult(rh,ra)) { pts+=1; bons++; }
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
          <select className="team-select" value={match.home} onChange={e=>onChange("home",e.target.value)}>
            {["?",...ALL_TEAMS].map(t=><option key={t} value={t}>{FLAGS[t]||"❓"} {t}</option>)}
          </select>
          <span className="vs-lbl">vs</span>
          <select className="team-select" value={match.away} onChange={e=>onChange("away",e.target.value)}>
            {["?",...ALL_TEAMS].map(t=><option key={t} value={t}>{FLAGS[t]||"❓"} {t}</option>)}
          </select>
        </div>
      )}
      <div className="match-scores">
        <span className="team home">{FLAGS[match.home]||"❓"} <span className="tname">{match.home}</span></span>
        <div className="score-inputs">
          <input type="number" min="0" max="99" value={match.homeScore}
            onChange={e=>onChange("homeScore",e.target.value)} placeholder="–"/>
          <span className="colon">:</span>
          <input type="number" min="0" max="99" value={match.awayScore}
            onChange={e=>onChange("awayScore",e.target.value)} placeholder="–"/>
        </div>
        <span className="team away"><span className="tname">{match.away}</span> {FLAGS[match.away]||"❓"}</span>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("home");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"

  // Auth admin
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  // Real results
  const [realGroups, setRealGroups] = useState(EMPTY_GROUPS);
  const [realKO, setRealKO] = useState(emptyKO());

  // Players list (for leaderboard)
  const [allPlayers, setAllPlayers] = useState([]);

  // Current player
  const [currentPlayer, setCurrentPlayer] = useState(null); // { name, groups, ko }
  const [newPlayerName, setNewPlayerName] = useState("");

  // UI
  const [tab, setTab] = useState("A");
  const [koTab, setKoTab] = useState(null);

  // ── Load real results on mount ────────────────────────────────────────────
  useEffect(() => {
    loadRealResults();
    loadLeaderboard();
  }, []);

  async function loadRealResults() {
    const { data, error } = await supabase
      .from("real_results")
      .select("groups, ko")
      .eq("id", 1)
      .single();
    if (error || !data) return;
    if (data.groups && Object.keys(data.groups).length > 0) setRealGroups(data.groups);
    if (data.ko && Object.keys(data.ko).length > 0) setRealKO(data.ko);
  }

  async function loadLeaderboard() {
    const { data } = await supabase.from("players").select("name, groups");
    if (data) setAllPlayers(data);
  }

  // ── Load or create player ─────────────────────────────────────────────────
  async function joinPlayer() {
    const name = newPlayerName.trim();
    if (!name) return;
    setLoading(true);

    // Check if exists
    const { data: existing } = await supabase
      .from("players")
      .select("*")
      .eq("name", name)
      .single();

    if (existing) {
      setCurrentPlayer(existing);
    } else {
      // Create new
      const newP = { name, groups: EMPTY_GROUPS, ko: emptyKO() };
      const { data: created, error } = await supabase
        .from("players")
        .insert(newP)
        .select()
        .single();
      if (!error && created) setCurrentPlayer(created);
    }
    setNewPlayerName("");
    setLoading(false);
    setView("prono");
    loadLeaderboard();
  }

  // ── Auto-save player pronos (debounced) ───────────────────────────────────
  const savePlayer = useCallback(async (updated) => {
    if (!updated?.name) return;
    setSaveStatus("saving");
    const { error } = await supabase
      .from("players")
      .update({ groups: updated.groups, ko: updated.ko })
      .eq("name", updated.name);
    setSaveStatus(error ? "error" : "saved");
    setTimeout(() => setSaveStatus(""), 2000);
    loadLeaderboard();
  }, []);

  // ── Update helpers ────────────────────────────────────────────────────────
  function updateGroup(g, idx, field, val) {
    const updated = {
      ...currentPlayer,
      groups: {
        ...currentPlayer.groups,
        [g]: currentPlayer.groups[g].map((m,i) => i===idx ? {...m,[field]:val} : m)
      }
    };
    setCurrentPlayer(updated);
    savePlayer(updated);
  }

  function updateKO(round, idx, field, val) {
    const updated = {
      ...currentPlayer,
      ko: {
        ...currentPlayer.ko,
        [round]: currentPlayer.ko[round].map((m,i) => i===idx ? {...m,[field]:val} : m)
      }
    };
    setCurrentPlayer(updated);
    savePlayer(updated);
  }

  // ── Admin: update real results ────────────────────────────────────────────
  async function updateRealGroup(g, idx, field, val) {
    const next = {
      ...realGroups,
      [g]: realGroups[g].map((m,i) => i===idx ? {...m,[field]:val} : m)
    };
    setRealGroups(next);
    setSaveStatus("saving");
    const { error } = await supabase
      .from("real_results")
      .update({ groups: next })
      .eq("id", 1);
    setSaveStatus(error ? "error" : "saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }

  async function updateRealKO(round, idx, field, val) {
    const next = {
      ...realKO,
      [round]: realKO[round].map((m,i) => i===idx ? {...m,[field]:val} : m)
    };
    setRealKO(next);
    setSaveStatus("saving");
    const { error } = await supabase
      .from("real_results")
      .update({ ko: next })
      .eq("id", 1);
    setSaveStatus(error ? "error" : "saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }

  function tryUnlock() {
    if (pwdInput === "admin2026") { setAdminUnlocked(true); setView("admin"); setPwdError(false); }
    else setPwdError(true);
  }

  // ── Leaderboard calc ──────────────────────────────────────────────────────
  const leaderboard = allPlayers
    .map(p => ({ ...p, ...calcScore(p.groups || {}, realGroups) }))
    .sort((a,b) => b.pts - a.pts);

  const scoreInfo = currentPlayer
    ? calcScore(currentPlayer.groups || {}, realGroups)
    : null;

  // ── CSS ───────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#060d1a;--card:#0d1828;--card2:#122035;--border:#1c2f4a;
      --gold:#f0b429;--gold2:#d49a1a;--blue:#60a5fa;--red:#f87171;--green:#34d399;
      --text:#e2e8f3;--muted:#5a7a9f;
      --fh:'Bebas Neue',sans-serif;--fb:'DM Sans',sans-serif;--r:14px;
    }
    body{background:var(--bg);color:var(--text);font-family:var(--fb);min-height:100vh}
    .nav{
      position:sticky;top:0;z-index:100;
      background:rgba(6,13,26,.96);backdrop-filter:blur(16px);
      border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;
      padding:0 20px;height:58px;
    }
    .logo{font-family:var(--fh);font-size:21px;letter-spacing:3px;color:var(--gold)}
    .logo span{color:var(--text)}
    .nav-right{display:flex;align-items:center;gap:8px}
    .save-status{font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600}
    .save-status.saving{background:rgba(96,165,250,.15);color:var(--blue)}
    .save-status.saved{background:rgba(52,211,153,.15);color:var(--green)}
    .save-status.error{background:rgba(248,113,113,.15);color:var(--red)}
    .nav-links{display:flex;gap:4px;flex-wrap:wrap}
    .nav-btn{
      background:none;border:1px solid transparent;color:var(--muted);
      font-family:var(--fb);font-size:11px;font-weight:700;
      padding:5px 12px;border-radius:8px;cursor:pointer;transition:all .18s;
      text-transform:uppercase;letter-spacing:.5px;
    }
    .nav-btn:hover{color:var(--text);border-color:var(--border)}
    .nav-btn.active{color:var(--gold);border-color:var(--gold);background:rgba(240,180,41,.07)}
    .content{max-width:920px;margin:0 auto;padding:28px 16px 80px}
    .hero{text-align:center;padding:48px 0 36px}
    .trophy{font-size:64px;line-height:1;margin-bottom:10px}
    .hero-title{font-family:var(--fh);font-size:clamp(36px,8vw,76px);letter-spacing:4px;color:var(--gold);line-height:1}
    .hero-sub{color:var(--muted);font-size:15px;margin-top:6px;margin-bottom:40px;font-weight:300}
    .rules{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:480px;margin:0 auto 40px}
    @media(max-width:480px){.rules{grid-template-columns:1fr}}
    .rule-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:22px 16px;text-align:center}
    .rule-pts{font-family:var(--fh);font-size:54px;line-height:1}
    .rule-pts.gold{color:var(--gold)}.rule-pts.blue{color:var(--blue)}
    .rule-tag{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--muted);margin:4px 0}
    .rule-desc{font-size:13px;color:#8ca5c4}
    .player-box{background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:26px;max-width:460px;margin:0 auto}
    .player-box h3{font-size:14px;font-weight:600;margin-bottom:14px}
    .row{display:flex;gap:8px}
    .input{
      flex:1;background:var(--bg);border:1px solid var(--border);border-radius:8px;
      padding:10px 14px;color:var(--text);font-family:var(--fb);font-size:14px;
      outline:none;transition:border .18s;
    }
    .input:focus{border-color:var(--gold)}
    .btn{
      background:var(--gold);color:#060d1a;border:none;border-radius:8px;
      padding:10px 20px;font-family:var(--fb);font-weight:700;font-size:13px;
      cursor:pointer;transition:background .18s,transform .1s;white-space:nowrap;
      text-transform:uppercase;letter-spacing:.5px;
    }
    .btn:hover{background:var(--gold2)}.btn:active{transform:scale(.97)}
    .btn:disabled{opacity:.5;cursor:not-allowed}
    .section-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:22px}
    .section-title{font-family:var(--fh);font-size:26px;letter-spacing:2px;color:var(--gold)}
    .sub-info{font-size:13px;color:var(--muted)}
    .score-badge{background:linear-gradient(135deg,var(--gold),var(--gold2));border-radius:10px;padding:10px 18px;display:inline-flex;align-items:baseline;gap:6px}
    .badge-pts{font-family:var(--fh);font-size:36px;color:#060d1a;line-height:1}
    .badge-label{font-size:12px;font-weight:700;color:rgba(6,13,26,.6);text-transform:uppercase}
    .badge-detail{font-size:11px;color:rgba(6,13,26,.5)}
    .tabs{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:18px}
    .tab{
      background:var(--card);border:1px solid var(--border);color:var(--muted);
      font-family:var(--fb);font-size:12px;font-weight:700;
      padding:6px 13px;border-radius:8px;cursor:pointer;transition:all .15s;
      text-transform:uppercase;letter-spacing:.6px;
    }
    .tab:hover{color:var(--text)}.tab.active{background:var(--gold);color:#060d1a;border-color:var(--gold)}
    .group-bar{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:10px 16px;margin-bottom:14px;font-size:13px;color:var(--muted)}
    .group-bar strong{color:var(--text)}
    .matches{display:flex;flex-direction:column;gap:8px}
    .match-card{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:10px 14px;transition:border-color .18s}
    .match-card:hover{border-color:#2a4060}
    .match-selects{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)}
    .team-select{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:5px 8px;color:var(--text);font-family:var(--fb);font-size:12px;outline:none;cursor:pointer}
    .team-select:focus{border-color:var(--gold)}
    .vs-lbl{color:var(--muted);font-size:11px;font-weight:700;flex-shrink:0}
    .match-scores{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}
    .team{font-size:13px;font-weight:500}.team.home{text-align:right}.team.away{text-align:left}
    @media(max-width:420px){.tname{display:none}}
    .score-inputs{display:flex;align-items:center;gap:5px}
    .score-inputs input{
      width:42px;background:var(--bg);border:1px solid var(--border);border-radius:7px;
      color:var(--gold);font-family:var(--fh);font-size:22px;text-align:center;
      padding:4px 0;outline:none;-moz-appearance:textfield;
    }
    .score-inputs input::-webkit-outer-spin-button,
    .score-inputs input::-webkit-inner-spin-button{-webkit-appearance:none}
    .score-inputs input:focus{border-color:var(--gold)}
    .colon{color:var(--muted);font-weight:800;font-size:16px}
    .lb-list{display:flex;flex-direction:column;gap:7px}
    .lb-row{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:13px 18px;display:flex;align-items:center;gap:14px;transition:all .18s}
    .lb-row:hover{border-color:#2a4060;transform:translateX(3px)}
    .lb-row.me{border-color:rgba(240,180,41,.35);background:rgba(240,180,41,.04)}
    .lb-rank{font-family:var(--fh);font-size:22px;min-width:30px;text-align:center}
    .lb-name{flex:1;font-weight:600;font-size:15px}
    .lb-pts{font-family:var(--fh);font-size:30px;color:var(--gold);line-height:1}
    .admin-notice{background:rgba(240,180,41,.07);border:1px solid rgba(240,180,41,.2);border-radius:10px;padding:12px 18px;font-size:13px;color:var(--gold);margin-bottom:22px}
    .login-card{max-width:340px;margin:70px auto;background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:34px;text-align:center}
    .login-card h2{font-family:var(--fh);font-size:26px;letter-spacing:2px;color:var(--gold);margin-bottom:4px}
    .login-card p{color:var(--muted);font-size:13px;margin-bottom:22px}
    .err{color:var(--red);font-size:12px;margin-top:8px}
    .hint{margin-top:10px;font-size:11px;color:var(--muted)}
    .divider{height:1px;background:var(--border);margin:26px 0}
    .footer-note{font-size:12px;color:var(--muted)}
    .groups-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px;margin-top:8px}
    .group-mini{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
    .group-mini-title{font-family:var(--fh);font-size:16px;color:var(--gold);margin-bottom:6px;letter-spacing:1px}
    .group-mini-team{font-size:12px;color:var(--text);padding:2px 0}
    .section-label{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px}
    .spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(240,180,41,.3);border-top-color:var(--gold);border-radius:50%;animation:spin .6s linear infinite;margin-right:8px;vertical-align:middle}
    @keyframes spin{to{transform:rotate(360deg)}}
    .empty-state{text-align:center;padding:80px 0;color:var(--muted)}
  `;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{css}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="logo">⚽ PRONO <span>2026</span></div>
        <div className="nav-right">
          {saveStatus && (
            <span className={`save-status ${saveStatus}`}>
              {saveStatus==="saving"?"⏳ Sauvegarde…":saveStatus==="saved"?"✅ Sauvegardé":"❌ Erreur"}
            </span>
          )}
          <div className="nav-links">
            <button className={`nav-btn ${view==="home"?"active":""}`} onClick={()=>setView("home")}>Accueil</button>
            {currentPlayer && <button className={`nav-btn ${view==="prono"?"active":""}`} onClick={()=>setView("prono")}>Mes pronos</button>}
            <button className={`nav-btn ${view==="leaderboard"?"active":""}`} onClick={()=>{loadLeaderboard();setView("leaderboard")}}>Classement</button>
            <button className={`nav-btn ${view==="admin"||view==="admin_login"?"active":""}`}
              onClick={()=>adminUnlocked?setView("admin"):setView("admin_login")}>Admin</button>
          </div>
        </div>
      </nav>

      <div className="content">

        {/* ── HOME ── */}
        {view==="home" && <>
          <div className="hero">
            <div className="trophy">🏆</div>
            <div className="hero-title">COUPE DU MONDE 2026</div>
            <div className="hero-sub">Canada · Mexique · États-Unis — 11 juin au 19 juillet 2026</div>
            <div className="rules">
              <div className="rule-card">
                <div className="rule-pts gold">3</div>
                <div className="rule-tag">Points</div>
                <div className="rule-desc">Prono exact<br/>(score parfait)</div>
              </div>
              <div className="rule-card">
                <div className="rule-pts blue">1</div>
                <div className="rule-tag">Point</div>
                <div className="rule-desc">Bon pronostic<br/>(bon vainqueur ou nul)</div>
              </div>
            </div>
          </div>

          <div className="player-box">
            <h3>👤 Entrer / Retrouver mon profil</h3>
            <div className="row">
              <input className="input" placeholder="Ton prénom" value={newPlayerName}
                onChange={e=>setNewPlayerName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&joinPlayer()} />
              <button className="btn" onClick={joinPlayer} disabled={loading||!newPlayerName.trim()}>
                {loading ? <><span className="spinner"/>...</> : "Entrer"}
              </button>
            </div>
            <div style={{marginTop:12,fontSize:12,color:"var(--muted)"}}>
              ✅ Si ton prénom existe déjà, tu retrouveras tes pronos. Sinon, un profil est créé.
            </div>
          </div>

          <div className="divider"/>
          <div className="section-label">Les 12 groupes — 48 équipes</div>
          <div className="groups-grid">
            {Object.entries(GROUPS).map(([g,teams])=>(
              <div key={g} className="group-mini">
                <div className="group-mini-title">Groupe {g}</div>
                {teams.map(t=><div key={t} className="group-mini-team">{FLAGS[t]} {t}</div>)}
              </div>
            ))}
          </div>
        </>}

        {/* ── PRONOS ── */}
        {view==="prono" && currentPlayer && <>
          <div className="section-head">
            <div>
              <div className="section-title">🎯 MES PRONOS</div>
              <div className="sub-info">Joueur : <strong style={{color:"var(--text)"}}>{currentPlayer.name}</strong></div>
            </div>
            {scoreInfo && (
              <div className="score-badge">
                <span className="badge-pts">{scoreInfo.pts}</span>
                <div>
                  <div className="badge-label">pts</div>
                  <div className="badge-detail">{scoreInfo.exact} exact · {scoreInfo.bons} bon</div>
                </div>
              </div>
            )}
          </div>

          <div className="tabs">
            {Object.keys(GROUPS).map(g=>(
              <button key={g} className={`tab ${tab===g&&koTab===null?"active":""}`}
                onClick={()=>{setTab(g);setKoTab(null)}}>Gr.{g}</button>
            ))}
            <button className={`tab ${koTab!==null?"active":""}`}
              onClick={()=>{setTab(null);setKoTab("32èmes")}}>🏆 Phases finales</button>
          </div>

          {koTab===null && tab && <>
            <div className="group-bar">
              <strong>Groupe {tab}</strong> · {GROUPS[tab].map(t=>`${FLAGS[t]} ${t}`).join("  ·  ")}
            </div>
            <div className="matches">
              {(currentPlayer.groups[tab]||[]).map((m,idx)=>(
                <MatchRow key={idx} match={m} onChange={(f,v)=>updateGroup(tab,idx,f,v)}/>
              ))}
            </div>
          </>}

          {koTab!==null && <>
            <div className="tabs">
              {KO_ROUNDS.map(r=>(
                <button key={r} className={`tab ${koTab===r?"active":""}`} onClick={()=>setKoTab(r)}>{r}</button>
              ))}
            </div>
            <div className="sub-info" style={{marginBottom:12}}>Sélectionne les équipes et saisis ton score prévu.</div>
            <div className="matches">
              {(currentPlayer.ko[koTab]||[]).map((m,idx)=>(
                <MatchRow key={idx} match={m} showSelects onChange={(f,v)=>updateKO(koTab,idx,f,v)}/>
              ))}
            </div>
          </>}
        </>}

        {view==="prono" && !currentPlayer && (
          <div className="empty-state">← Saisis ton prénom sur l'accueil pour commencer</div>
        )}

        {/* ── LEADERBOARD ── */}
        {view==="leaderboard" && <>
          <div className="section-head">
            <div className="section-title">🏅 CLASSEMENT</div>
            <div className="sub-info">{leaderboard.length} participant{leaderboard.length>1?"s":""}</div>
          </div>
          {leaderboard.length===0 ? (
            <div className="empty-state">Aucun joueur pour l'instant</div>
          ) : (
            <div className="lb-list">
              {leaderboard.map((p,i)=>(
                <div key={p.name} className={`lb-row ${p.name===currentPlayer?.name?"me":""}`}>
                  <div className="lb-rank">{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
                  <div>
                    <div className="lb-name">{p.name}{p.name===currentPlayer?.name?" · moi":""}</div>
                    <div className="footer-note">{p.exact} exact · {p.bons} bon</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div className="lb-pts">{p.pts}</div>
                    <div className="footer-note">pts</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ── ADMIN LOGIN ── */}
        {view==="admin_login" && (
          <div className="login-card">
            <h2>🔐 ADMIN</h2>
            <p>Accès réservé à l'organisateur pour saisir les vrais résultats</p>
            <input className="input" type="password" placeholder="Mot de passe"
              value={pwdInput} onChange={e=>setPwdInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&tryUnlock()}
              style={{width:"100%",marginBottom:10}}/>
            <button className="btn" style={{width:"100%"}} onClick={tryUnlock}>Accéder</button>
            {pwdError && <div className="err">Mot de passe incorrect</div>}
            <div className="hint">Mot de passe par défaut : <strong>admin2026</strong></div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {view==="admin" && adminUnlocked && <>
          <div className="section-head">
            <div className="section-title">⚙️ RÉSULTATS RÉELS</div>
          </div>
          <div className="admin-notice">
            Saisissez les vrais résultats ici. Le classement se met à jour pour tous les joueurs en temps réel.
          </div>
          <div className="tabs">
            {Object.keys(GROUPS).map(g=>(
              <button key={g} className={`tab ${tab===g&&koTab===null?"active":""}`}
                onClick={()=>{setTab(g);setKoTab(null)}}>Gr.{g}</button>
            ))}
            <button className={`tab ${koTab!==null?"active":""}`}
              onClick={()=>{setTab(null);setKoTab("32èmes")}}>🏆 Phases finales</button>
          </div>

          {koTab===null && tab && <>
            <div className="group-bar">
              <strong>Groupe {tab}</strong> · {GROUPS[tab].map(t=>`${FLAGS[t]} ${t}`).join("  ·  ")}
            </div>
            <div className="matches">
              {realGroups[tab].map((m,idx)=>(
                <MatchRow key={idx} match={m} onChange={(f,v)=>updateRealGroup(tab,idx,f,v)}/>
              ))}
            </div>
          </>}

          {koTab!==null && <>
            <div className="tabs">
              {KO_ROUNDS.map(r=>(
                <button key={r} className={`tab ${koTab===r?"active":""}`} onClick={()=>setKoTab(r)}>{r}</button>
              ))}
            </div>
            <div className="matches">
              {realKO[koTab].map((m,idx)=>(
                <MatchRow key={idx} match={m} showSelects onChange={(f,v)=>updateRealKO(koTab,idx,f,v)}/>
              ))}
            </div>
          </>}

          <div className="divider"/>
          <div className="footer-note">{allPlayers.length} joueur(s) enregistré(s) en base.</div>
        </>}
      </div>
    </div>
  );
}
