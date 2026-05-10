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
