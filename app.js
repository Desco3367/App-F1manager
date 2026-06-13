const $ = (id) => document.getElementById(id);

const els = {
  setupWarning: $("setupWarning"),
  authBadge: $("authBadge"),
  logoutBtn: $("logoutBtn"),
  loginForm: $("loginForm"),
  emailInput: $("emailInput"),
  passwordInput: $("passwordInput"),
  authMessage: $("authMessage"),
  publicView: $("publicView"),
  loginView: $("loginView"),
  teamView: $("teamView"),
  adminView: $("adminView"),
  teamNavBtn: $("teamNavBtn"),
  adminNavBtn: $("adminNavBtn")
};

let currentUser = null;
let currentProfile = null;
let currentView = "public";
let currentPublicTab = "inicio";
let currentAdminTab = "base";
let currentAdminCarTab = "resumen";
let currentAdminCarRequestTeamFilter = "";
let currentAdminWeightRequestTeamFilter = "";
let currentAdminEngineRequestTeamFilter = "";
let currentTeamTab = "resumen";
const AUTO_REFRESH_MS = 10000;
let autoRefreshTimer = null;
let autoRefreshInFlight = false;
let cache = {
  seasonId: "t7",
  seasons: [],
  season: null,
  teams: [],
  teamMap: new Map(),
  headquarters: new Map(),
  calendar: [],
  carDocs: new Map(),
  carSelections: new Map(),
  carLoadError: "",
  carSelectionLoadError: "",
  engines: new Map(),
  engineLoadError: "",
  pendingEngineImport: null,
  pendingMoneyImport: null,
  awardSettings: null,
  raceAwards: [],
  awardsLoadError: "",
  regulation: null,
  regulationLoadError: "",
  motoristChampionship: null,
  motoristChampionshipLoadError: "",
  constructorChampionship: null,
  constructorChampionshipLoadError: "",
  constructorPointSystem: null,
  constructorPointSystemLoadError: "",
  constructorPredictions: null,
  constructorPredictionVotes: [],
  constructorPredictionsLoadError: "",
  personnel: new Map(),
  personnelLoadError: "",
  movements: [],
  teamMovements: new Map(),
  profiles: []
};

function activeSeasonId() {
  return cache.seasonId || window.LFM_SEED.season?.id || "t7";
}

function seasonIdFromNumber(number) {
  const n = Number(number || 0);
  return Number.isInteger(n) && n > 0 ? `t${n}` : "";
}

function raceIdForSeason(seasonId, round) {
  return `${seasonId}-r${String(round).padStart(2, "0")}`;
}

function calendarForSeason(sourceCalendar, seasonId, completed = false) {
  return (sourceCalendar || []).map((race, index) => {
    const round = Number(race.round || index + 1);
    return {
      ...race,
      id: raceIdForSeason(seasonId, round),
      seasonId,
      round,
      completed
    };
  });
}

function trackCatalog() {
  return window.LFM_SEED.trackCatalog2024 || [];
}

function trackById(trackId) {
  return trackCatalog().find((track) => track.id === trackId) || null;
}

function trackIdForRace(race) {
  if (race?.trackId && trackById(race.trackId)) return race.trackId;
  const key = normalizeKey(race?.gp || race?.trackName || "");
  const aliases = {
    arabia: "saudi-arabia",
    arabiasaudita: "saudi-arabia",
    saudiarabia: "saudi-arabia",
    silverstone: "great-britain",
    granbretana: "great-britain",
    uk: "great-britain",
    espana: "spain",
    spa: "belgium",
    belgium: "belgium",
    belgica: "belgium",
    paisesbajos: "netherlands",
    zandvoort: "netherlands",
    eeuu: "united-states",
    estadosunidos: "united-states",
    usa: "united-states",
    cota: "united-states",
    saopaulo: "brazil",
    brazil: "brazil",
    brasil: "brazil",
    interlagos: "brazil",
    abudhabi: "abu-dhabi",
    lasvegas: "las-vegas",
    azerbaiyan: "azerbaijan"
  };
  if (aliases[key]) return aliases[key];
  return trackCatalog().find((track) => [
    track.id,
    track.gp,
    track.country,
    track.circuit
  ].some((value) => normalizeKey(value) === key))?.id || "";
}

function seasonCalendarFromTrackRows(seasonId) {
  const rows = Array.from(document.querySelectorAll("[data-new-season-calendar-row]"));
  const seen = new Set();
  const selected = [];

  rows.forEach((row) => {
    const enabled = row.querySelector("[data-new-season-calendar-enabled]")?.checked;
    if (!enabled) return;

    const trackId = row.querySelector("[data-new-season-calendar-track]")?.value || "";
    const track = trackById(trackId);
    if (!track) throw new Error("Todos los GPs seleccionados necesitan circuito.");
    if (seen.has(trackId)) throw new Error(`Circuito repetido: ${track.gp}.`);
    seen.add(trackId);

    const round = selected.length + 1;
    selected.push({
      id: raceIdForSeason(seasonId, round),
      seasonId,
      round,
      gp: track.gp,
      trackId: track.id,
      country: track.country,
      circuit: track.circuit,
      hasSprint: row.querySelector("[data-new-season-calendar-sprint]")?.checked || false,
      completed: false
    });
  });

  if (!selected.length) throw new Error("Selecciona al menos un GP para el calendario.");
  return selected;
}

function seasonCalendarFromActiveRows(seasonId) {
  const rows = Array.from(document.querySelectorAll("[data-season-calendar-row]"));
  const seen = new Set();
  const selected = [];

  rows.forEach((row) => {
    const enabled = row.querySelector("[data-season-calendar-enabled]")?.checked;
    if (!enabled) return;

    const trackId = row.querySelector("[data-season-calendar-track]")?.value || "";
    const track = trackById(trackId);
    if (!track) throw new Error("Todos los GPs seleccionados necesitan circuito.");
    if (seen.has(trackId)) throw new Error(`Circuito repetido: ${track.gp}.`);
    seen.add(trackId);

    const round = selected.length + 1;
    selected.push({
      id: raceIdForSeason(seasonId, round),
      seasonId,
      round,
      gp: track.gp,
      trackId: track.id,
      country: track.country,
      circuit: track.circuit,
      hasSprint: row.querySelector("[data-season-calendar-sprint]")?.checked || false,
      completed: row.querySelector("[data-season-calendar-completed]")?.checked || false
    });
  });

  if (!selected.length) throw new Error("Selecciona al menos un GP para el calendario.");
  return selected;
}

function newSeasonCalendarForMode(seasonId, calendarMode) {
  if (calendarMode === "custom-2024") {
    return seasonCalendarFromTrackRows(seasonId);
  }

  const sourceCalendar = calendarMode === "copy-template"
    ? window.LFM_SEED.calendar || []
    : cache.calendar.length ? cache.calendar : window.LFM_SEED.calendar || [];
  if (!sourceCalendar.length) {
    throw new Error("No hay calendario base para crear la temporada.");
  }
  return calendarForSeason(sourceCalendar, seasonId, false);
}

function moneyM(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("es-AR", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 3,
    maximumFractionDigits: 3
  })}M`;
}

function signedMoneyM(value) {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${moneyM(n)}`;
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function teamName(id) {
  return cache.teamMap.get(id)?.name || id || "-";
}

function facilities() {
  return window.LFM_SEED.headquartersFacilities || [];
}

function carPieces() {
  return window.LFM_SEED.carPieces || [];
}

function pieceById(pieceId) {
  return carPieces().find((piece) => piece.id === pieceId) || null;
}

function upgradeTypesForPiece(pieceId) {
  const types = pieceById(pieceId)?.upgradeTypes || [];
  return types.length ? types : ["Equilibrado"];
}

function designUpgradeType(design) {
  return design?.upgradeType || design?.improvementType || design?.focus || "";
}

function designMetaText(design) {
  const mode = design.mode === "research" ? "Investigacion" : "Diseno";
  const upgradeType = designUpgradeType(design);
  return [mode, upgradeType, `Pasos ${design.steps ?? 0}`].filter(Boolean).join(" - ");
}

function weightPieces() {
  return window.LFM_SEED.weightPieces || [];
}

function weightPieceById(pieceId) {
  return weightPieces().find((piece) => piece.id === pieceId) || null;
}

function clampWeightLevel(value) {
  const level = Math.round(Number(value || 0));
  return Math.min(10, Math.max(0, Number.isFinite(level) ? level : 0));
}

function defaultWeightLevels() {
  return Object.fromEntries(weightPieces().map((piece) => [piece.id, 0]));
}

function seedWeightLevels(teamId) {
  return {
    ...defaultWeightLevels(),
    ...(window.LFM_SEED.initialWeightLevels?.[teamId] || {})
  };
}

function normalizeWeightLevels(teamId, levels = {}) {
  const normalized = seedWeightLevels(teamId);
  weightPieces().forEach((piece) => {
    if (Object.prototype.hasOwnProperty.call(levels, piece.id)) {
      normalized[piece.id] = clampWeightLevel(levels[piece.id]);
    }
  });
  return normalized;
}

function weightLevels(teamId) {
  return normalizeWeightLevels(teamId, carDoc(teamId).weightLevels || {});
}

function weightLevelInfo(pieceId, level) {
  const piece = weightPieceById(pieceId);
  const safeLevel = clampWeightLevel(level);
  return piece?.levels?.find((item) => Number(item.level) === safeLevel) || {
    level: safeLevel,
    successPct: 0,
    failurePct: 0,
    dropPct: 0,
    durationMin: 0,
    weightKg: 0
  };
}

function weightSummaryFromLevels(teamId, levels) {
  const normalized = normalizeWeightLevels(teamId, levels);
  const pieces = {};
  let totalWeightKg = 0;
  weightPieces().forEach((piece) => {
    const level = normalized[piece.id] || 0;
    const info = weightLevelInfo(piece.id, level);
    totalWeightKg += Number(info.weightKg || 0);
    pieces[piece.id] = {
      pieceId: piece.id,
      pieceName: piece.name,
      level,
      durationMin: Number(info.durationMin || 0),
      weightKg: Number(info.weightKg || 0)
    };
  });
  return {
    pieces,
    totalWeightKg: Math.round(totalWeightKg * 10) / 10
  };
}

function weightRunCostM(runs) {
  return Number(window.LFM_SEED.costs.weightRunsM?.[String(runs)] || window.LFM_SEED.costs.weightRunsM?.[runs] || 0);
}

function runWeightAttempt(pieceId, levelBefore) {
  const before = clampWeightLevel(levelBefore);
  if (before >= 10) {
    return { pieceId, roll: null, result: "max", levelBefore: before, levelAfter: 10 };
  }

  const info = weightLevelInfo(pieceId, before);
  const roll = Math.round(Math.random() * 10000) / 100;
  let result = "drop";
  let after = Math.max(0, before - 1);

  if (roll < Number(info.successPct || 0)) {
    result = "success";
    after = Math.min(10, before + 1);
  } else if (roll < Number(info.successPct || 0) + Number(info.failurePct || 0)) {
    result = "failure";
    after = before;
  }

  return { pieceId, roll, result, levelBefore: before, levelAfter: after };
}

function weightResultLabel(result) {
  const labels = {
    success: "Exito",
    failure: "Fallo",
    drop: "Caida",
    max: "Maximo"
  };
  return labels[result] || result || "-";
}

function formatKg(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("es-AR", {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1
  })} kg`;
}

function engineStats() {
  return window.LFM_SEED.engineStats || [];
}

function engineStatById(statId) {
  return engineStats().find((stat) => stat.id === statId) || null;
}

function engineResults() {
  return window.LFM_SEED.engineResults || [];
}

function engineModes() {
  return window.LFM_SEED.engineDevelopmentModes || [];
}

function defaultEngineStats() {
  return Object.fromEntries(engineStats().map((stat) => [stat.id, Number(stat.initialValue || 0)]));
}

function normalizeEngineStats(stats = {}) {
  const normalized = defaultEngineStats();
  engineStats().forEach((stat) => {
    const value = stats[stat.id] ?? stats[stat.legacyKey];
    if (value !== undefined && Number.isFinite(Number(value))) {
      normalized[stat.id] = Math.round(Number(value) * 100) / 100;
    }
  });
  return normalized;
}

function engineDoc(teamId) {
  const team = cache.teamMap.get(teamId);
  return cache.engines.get(teamId) || {
    teamId,
    seasonId: activeSeasonId(),
    engineName: team?.isMotorist ? `Motor ${team.name}` : "Motor",
    clients: team?.motorClients || [],
    stats: defaultEngineStats(),
    history: []
  };
}

function engineOwnerForTeam(team) {
  if (!team) return "";
  return team.isMotorist ? team.id : team.motoristId || "";
}

function motoristTeams() {
  return (cache.teams.length ? cache.teams : window.LFM_SEED.teams || [])
    .filter((team) => team.isMotorist);
}

function clientTeams() {
  return (cache.teams.length ? cache.teams : window.LFM_SEED.teams || [])
    .filter((team) => !team.isMotorist && team.motoristId);
}

function personnelDoc(teamId) {
  return cache.personnel.get(teamId) || {
    teamId,
    seasonId: activeSeasonId(),
    entries: []
  };
}

function personnelEntries(teamId) {
  return (personnelDoc(teamId).entries || [])
    .map((entry, index) => ({
      id: entry.id || `personal-${index + 1}`,
      role: String(entry.role || ""),
      name: String(entry.name || ""),
      valueM: moneyValue(entry.valueM || 0),
      notes: String(entry.notes || ""),
      rating: entry.rating === undefined || entry.rating === "" || entry.rating === null ? null : Number(entry.rating),
      cat: String(entry.cat || ""),
      catLabel: String(entry.catLabel || ""),
      slot: String(entry.slot || ""),
      slotLabel: String(entry.slotLabel || ""),
      signingKey: String(entry.signingKey || ""),
      auctionId: String(entry.auctionId || ""),
      reserveOnly: Boolean(entry.reserveOnly),
      bidRole: String(entry.bidRole || "")
    }))
    .filter((entry) => entry.name || entry.role || entry.notes || entry.valueM > 0);
}

function personnelSlotKey(entry) {
  const direct = normalizeKey(entry.slot);
  if (["p1", "p2", "r1", "r2", "sd", "tc", "ha", "ic1", "ic2"].includes(direct)) return direct;

  const text = normalizeKey([entry.role, entry.slotLabel, entry.catLabel, entry.notes].join(" "));
  if (text.includes("piloto1") || text.includes("driver1")) return "p1";
  if (text.includes("piloto2") || text.includes("driver2")) return "p2";
  if (text.includes("reserva1") || text.includes("reserve1")) return "r1";
  if (text.includes("reserva2") || text.includes("reserve2")) return "r2";
  if (text.includes("sporting") || text.includes("director")) return "sd";
  if (text.includes("technical") || text.includes("jtecnico") || text.includes("jefetecnico")) return "tc";
  if (text.includes("aero")) return "ha";
  if (text.includes("carrera1") || text.includes("raceengineer1")) return "ic1";
  if (text.includes("carrera2") || text.includes("raceengineer2")) return "ic2";
  return "";
}

function isDriverPersonnel(entry) {
  const key = personnelSlotKey(entry);
  const text = normalizeKey([entry.role, entry.cat, entry.catLabel, entry.slotLabel].join(" "));
  return ["p1", "p2", "r1", "r2"].includes(key) || text.includes("piloto") || text.includes("driver");
}

function driverSlotLabel(slot) {
  const labels = {
    p1: "Piloto 1",
    p2: "Piloto 2",
    r1: "Reserva 1",
    r2: "Reserva 2"
  };
  return labels[slot] || "Piloto";
}

function staffSlotLabel(slot) {
  const labels = {
    sd: "Sporting Dir.",
    tc: "J. Tecnico",
    ha: "Head of Aero",
    ic1: "Ing. Carrera 1",
    ic2: "Ing. Carrera 2"
  };
  return labels[slot] || "Staff";
}

function personnelMeta(entry) {
  const parts = [];
  if (Number.isFinite(entry.rating)) parts.push(`R${entry.rating}`);
  if (entry.valueM) parts.push(moneyM(entry.valueM));
  return parts.join(" - ");
}

function gridDriversForTeam(teamId) {
  const order = ["p1", "p2", "r1", "r2"];
  const drivers = personnelEntries(teamId).filter(isDriverPersonnel);
  return order.map((slot) => ({
    slot,
    entry: drivers.find((entry) => personnelSlotKey(entry) === slot) || null
  }));
}

function gridStaffForTeam(teamId) {
  const order = ["sd", "tc", "ha", "ic1", "ic2"];
  const entries = personnelEntries(teamId)
    .filter((entry) => !isDriverPersonnel(entry));
  return order.map((slot) => ({
    slot,
    entry: entries.find((entry) => personnelSlotKey(entry) === slot) || null
  }));
}

function personnelDisplayEntries(teamId) {
  const order = ["p1", "p2", "r1", "r2", "sd", "tc", "ha", "ic1", "ic2"];
  return personnelEntries(teamId)
    .slice()
    .sort((a, b) => {
      const aIndex = order.indexOf(personnelSlotKey(a));
      const bIndex = order.indexOf(personnelSlotKey(b));
      return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex)
        || (a.name || "").localeCompare(b.name || "");
    });
}

function publicGridTeams(teams) {
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const seen = new Set();
  const ordered = [];

  currentConstructorChampionship().standings.forEach((row) => {
    const team = teamMap.get(row.teamId);
    if (!team || seen.has(team.id)) return;
    seen.add(team.id);
    ordered.push(team);
  });

  teams.forEach((team) => {
    if (seen.has(team.id)) return;
    seen.add(team.id);
    ordered.push(team);
  });

  return ordered;
}

function engineModeWeights(weights, modeId) {
  const adjusted = [...weights];
  if (modeId === "risky") {
    adjusted[0] *= 1.4;
    adjusted[1] *= 1.1;
    adjusted[2] *= 0.9;
    adjusted[3] *= 0.9;
    adjusted[4] *= 1.2;
    adjusted[5] *= 1.5;
  } else if (modeId === "conservative") {
    adjusted[0] *= 0.7;
    adjusted[1] *= 0.9;
    adjusted[2] *= 1.25;
    adjusted[3] *= 1.15;
    adjusted[4] *= 0.8;
    adjusted[5] *= 0.7;
  }

  const positive = adjusted.map((value) => Math.max(0, Number(value || 0)));
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return positive;
  const normalized = positive.map((value) => (value / total) * 100);
  const diff = 100 - normalized.reduce((sum, value) => sum + value, 0);
  const maxIndex = normalized.indexOf(Math.max(...normalized));
  normalized[maxIndex] += diff;
  return normalized.map((value) => Math.round(value * 100) / 100);
}

function engineProbabilities(statId, value, modeId = "normal") {
  const stat = engineStatById(statId);
  const table = window.LFM_SEED.engineProbabilityTables?.[stat?.tableKey] || [];
  const numericValue = Number(value || 0);
  const row = table.find((item) => Number(item.min) <= numericValue && numericValue < Number(item.max));
  return row ? engineModeWeights(row.weights, modeId) : null;
}

function runEngineAttempt(statId, valueBefore, modeId = "normal") {
  const probabilities = engineProbabilities(statId, valueBefore, modeId);
  if (!probabilities) {
    throw new Error("El valor esta fuera de rango para la tabla de motor.");
  }

  const roll = Math.round(Math.random() * 10000) / 100;
  let accumulator = 0;
  const results = engineResults();
  const selected = results.find((result, index) => {
    accumulator += Number(probabilities[index] || 0);
    return roll < accumulator;
  }) || results[results.length - 1];
  const valueAfter = Math.round((Number(valueBefore || 0) + Number(selected.delta || 0)) * 100) / 100;

  return {
    statId,
    roll,
    resultId: selected.id,
    resultName: selected.name,
    delta: Number(selected.delta || 0),
    valueBefore: Math.round(Number(valueBefore || 0) * 100) / 100,
    valueAfter,
    probabilities
  };
}

function isMotorLimitMovement(move) {
  return move?.limitScope === "motor" && Number(move.amountM) < 0;
}

function motorSpentM(movements) {
  return Math.round(
    movements
      .filter(isMotorLimitMovement)
      .reduce((sum, move) => sum + Math.abs(Number(move.amountM || 0)), 0) * 1000
  ) / 1000;
}

function motorSummary(teamId) {
  const season = cache.season || window.LFM_SEED.season;
  const limitM = Number(season.motorLimitM || 0);
  const movements = cache.teamMovements.get(teamId) || (currentProfile?.teamId === teamId ? cache.movements : []);
  const spentM = motorSpentM(movements);
  const remainingM = Math.round((limitM - spentM) * 1000) / 1000;
  const percent = limitM > 0 ? Math.round((spentM / limitM) * 1000) / 10 : 0;
  const status = spentM > limitM ? "over" : percent >= 90 ? "warn" : "ok";
  return { limitM, spentM, remainingM, percent, status };
}

function formatSignedDelta(value) {
  const n = Number(value || 0);
  return `${n > 0 ? "+" : ""}${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function designCostM(pieceId, mode = "design") {
  const piece = pieceById(pieceId);
  const base = Number(window.LFM_SEED.costs.designM[piece?.costKey] || 0);
  return mode === "research"
    ? Math.round(base * Number(window.LFM_SEED.costs.researchMultiplier || 0.75) * 1000) / 1000
    : base;
}

function carDoc(teamId) {
  return cache.carDocs.get(teamId) || {
    teamId,
    seasonId: activeSeasonId(),
    designs: {},
    researches: {},
    activeDesignIds: {},
    weightLevels: seedWeightLevels(teamId),
    weightHistory: []
  };
}

function carSelection(teamId) {
  return cache.carSelections.get(teamId) || { teamId, seasonId: activeSeasonId(), selectedDesignIds: {} };
}

function renderCarSelectionLoadWarning() {
  return cache.carSelectionLoadError
    ? `<p class="warning-text">No pude recargar tus solicitudes: ${html(cache.carSelectionLoadError)}</p>`
    : "";
}

function cacheSelectionRequest(teamId, field, request) {
  if (!teamId || !field || !request) return;
  const selection = carSelection(teamId);
  const list = Array.isArray(selection[field]) ? selection[field] : [];
  if (list.some((item) => item.id === request.id)) return;
  cache.carSelections.set(teamId, {
    ...selection,
    teamId,
    seasonId: activeSeasonId(),
    [field]: [...list, request]
  });
}

function carRequests(teamId) {
  return (carSelection(teamId).carRequests || [])
    .filter((request) => request && request.seasonId === activeSeasonId())
    .map((request) => ({
      ...request,
      status: request.status || "pending",
      mode: request.mode === "research" ? "research" : "design",
      note: String(request.note || "")
    }));
}

function pendingCarRequests(teamId) {
  return carRequests(teamId).filter((request) => request.status === "pending");
}

function carRequestById(teamId, requestId) {
  return carRequests(teamId).find((request) => request.id === requestId) || null;
}

function carRequestModeLabel(mode) {
  return mode === "research" ? "Investigacion" : "Diseno";
}

function carRequestStatusLabel(status) {
  const labels = {
    pending: "Pendiente",
    completed: "Resuelta",
    cancelled: "Cancelada"
  };
  return labels[status] || status || "-";
}

function carRequestStatusClass(status) {
  if (status === "completed") return "done-pill";
  if (status === "cancelled") return "danger-pill";
  return "warn-pill";
}

function carRequestPieceOptions(teamId, selectedPieceId = "") {
  const pendingPieces = new Set(pendingCarRequests(teamId).map((request) => request.pieceId));
  const firstAvailable = carPieces().find((piece) => !pendingPieces.has(piece.id));
  const selected = selectedPieceId || firstAvailable?.id || "";
  return carPieces().map((piece) => `
    <option value="${html(piece.id)}" ${piece.id === selected ? "selected" : ""} ${pendingPieces.has(piece.id) ? "disabled" : ""}>
      ${html(piece.name)}${pendingPieces.has(piece.id) ? " - pendiente" : ""}
    </option>
  `).join("");
}

function allPendingCarRequests(teams) {
  return teams.flatMap((team) => pendingCarRequests(team.id).map((request) => ({ team, request })));
}

function weightRequests(teamId) {
  return (carSelection(teamId).weightRequests || [])
    .filter((request) => request && request.seasonId === activeSeasonId())
    .map((request) => {
      const runs = Number(request.runs || 0);
      return {
        ...request,
        runs,
        costM: Number(request.costM ?? weightRunCostM(runs)),
        status: request.status || "pending",
        note: String(request.note || "")
      };
    });
}

function pendingWeightRequests(teamId) {
  return weightRequests(teamId).filter((request) => request.status === "pending");
}

function weightRequestById(teamId, requestId) {
  return weightRequests(teamId).find((request) => request.id === requestId) || null;
}

function allPendingWeightRequests(teams) {
  return teams.flatMap((team) => pendingWeightRequests(team.id).map((request) => ({ team, request })));
}

function allWeightRequests(teams) {
  return teams.flatMap((team) => weightRequests(team.id).map((request) => ({ team, request })));
}

function motorRunCostM(attemptCount) {
  const attempts = Number(attemptCount || 0);
  const unit = Number(window.LFM_SEED.costs.motorRunM || 1);
  if (!Number.isFinite(attempts) || !Number.isFinite(unit)) return 0;
  return moneyValue(attempts * unit);
}

function engineRaceLimitM() {
  const season = cache.season || window.LFM_SEED.season || {};
  const value = Number(season.motorRaceLimitM ?? 6);
  return Number.isFinite(value) && value >= 0 ? moneyValue(value) : 6;
}

function engineRaceSpentFromMovements(movements, raceId, excludeRequestId = "") {
  if (!raceId) return 0;
  return moneyValue(
    (Array.isArray(movements) ? movements : [])
      .filter((move) => (
        (move.seasonId || activeSeasonId()) === activeSeasonId()
        && move.raceId === raceId
        && move.limitScope === "motor"
        && Number(move.amountM || 0) < 0
        && (!excludeRequestId || move.engineRequestId !== excludeRequestId)
      ))
      .reduce((sum, move) => sum + Math.abs(Number(move.amountM || 0)), 0)
  );
}

function engineRaceSpentM(teamId, raceId, excludeRequestId = "") {
  const movements = cache.teamMovements.get(teamId) || (currentProfile?.teamId === teamId ? cache.movements : []);
  return engineRaceSpentFromMovements(movements, raceId, excludeRequestId);
}

function engineRequests(teamId) {
  return (carSelection(teamId).engineRequests || [])
    .filter((request) => request && request.seasonId === activeSeasonId())
    .map((request) => {
      const attemptCount = Number(request.attemptCount || 0);
      return {
        ...request,
        attemptCount,
        costM: Number(request.costM ?? motorRunCostM(attemptCount)),
        status: request.status || "pending",
        note: String(request.note || "")
      };
    });
}

function pendingEngineRequests(teamId) {
  return engineRequests(teamId).filter((request) => request.status === "pending");
}

function engineRequestById(teamId, requestId) {
  return engineRequests(teamId).find((request) => request.id === requestId) || null;
}

function allPendingEngineRequests(teams) {
  return teams
    .filter((team) => team.isMotorist)
    .flatMap((team) => pendingEngineRequests(team.id).map((request) => ({ team, request })));
}

function allEngineRequests(teams) {
  return teams
    .filter((team) => team.isMotorist)
    .flatMap((team) => engineRequests(team.id).map((request) => ({ team, request })));
}

function weightRequestPieceOptions(teamId, selectedPieceId = "") {
  const pendingPieces = new Set(pendingWeightRequests(teamId).map((request) => request.pieceId));
  const levels = weightLevels(teamId);
  const firstAvailable = weightPieces().find((piece) => !pendingPieces.has(piece.id) && Number(levels[piece.id] || 0) < 10);
  const selected = selectedPieceId || firstAvailable?.id || "";
  return weightPieces().map((piece) => {
    const level = Number(levels[piece.id] || 0);
    const disabled = pendingPieces.has(piece.id) || level >= 10;
    const reason = pendingPieces.has(piece.id)
      ? " - pendiente"
      : level >= 10
        ? " - nivel 10"
        : "";
    return `
      <option value="${html(piece.id)}" ${piece.id === selected ? "selected" : ""} ${disabled ? "disabled" : ""}>
        ${html(piece.name)}${reason}
      </option>
    `;
  }).join("");
}

function designsForPiece(teamId, pieceId) {
  const designs = carDoc(teamId).designs || {};
  return (designs[pieceId] || []).filter((design) => design.mode !== "research");
}

function designById(teamId, pieceId, designId) {
  return designsForPiece(teamId, pieceId).find((design) => design.id === designId) || null;
}

function researchesForPiece(teamId, pieceId) {
  const car = carDoc(teamId);
  const explicit = Array.isArray(car.researches?.[pieceId]) ? car.researches[pieceId] : [];
  const legacy = Array.isArray(car.designs?.[pieceId])
    ? car.designs[pieceId].filter((design) => design.mode === "research")
    : [];
  return [...explicit, ...legacy];
}

function positiveStatsOnly(stats = {}) {
  return Object.fromEntries(
    Object.entries(stats)
      .map(([stat, value]) => [stat, statNumber(value)])
      .filter(([, value]) => value !== null && value > 0)
  );
}

function accumulatedResearchStats(teamId, pieceId) {
  return researchesForPiece(teamId, pieceId)
    .filter((research) => !research.appliedToSeasonId)
    .reduce((total, research) => addDesignStats(total, { stats: positiveStatsOnly(research.stats || {}) }), {});
}

function researchCount(teamId) {
  return carPieces().reduce((sum, piece) => sum + researchesForPiece(teamId, piece.id).length, 0);
}

function latestDesignForPiece(teamId, pieceId) {
  const designs = designsForPiece(teamId, pieceId);
  return designs.length ? designs[designs.length - 1] : null;
}

function statNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function formatStatValue(value) {
  const n = statNumber(value);
  return n === null
    ? "-"
    : n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function formatStatDelta(value) {
  const n = statNumber(value);
  if (n === null || n === 0) return "0";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
}

function statDeltaClass(value) {
  const n = statNumber(value);
  if (n === null || n === 0) return "";
  return n > 0 ? "positive" : "negative";
}

function addDesignStats(total, design) {
  Object.entries(design?.stats || {}).forEach(([stat, value]) => {
    const n = statNumber(value);
    if (n === null) return;
    total[stat] = statNumber((total[stat] || 0) + n);
  });
  return total;
}

function carStatsFromDesignIds(teamId, designIds = {}) {
  return carPieces().reduce((total, piece) => {
    const designId = designIds[piece.id];
    const design = designId ? designById(teamId, piece.id, designId) : null;
    return addDesignStats(total, design);
  }, {});
}

function pieceStatDiffs(piece, activeDesign, selectedDesign) {
  return (piece.stats || [])
    .map((stat) => {
      const activeValue = statNumber(activeDesign?.stats?.[stat]);
      const selectedValue = statNumber(selectedDesign?.stats?.[stat]);
      if (activeValue === null && selectedValue === null) return null;
      const delta = selectedValue !== null && activeValue !== null
        ? statNumber(selectedValue - activeValue)
        : null;
      if (delta === 0) return null;
      return {
        stat,
        activeValue,
        selectedValue,
        delta
      };
    })
    .filter(Boolean);
}

function carSelectionReview(teamId) {
  const car = carDoc(teamId);
  const selection = carSelection(teamId);
  const activeIds = car.activeDesignIds || {};
  const savedSelectedIds = selection.selectedDesignIds || {};
  const selectedIds = {};
  const latestIds = {};
  const pieceRows = [];
  const missingDesigns = [];
  const missingActive = [];
  const missingSelected = [];
  const changedPieces = [];

  carPieces().forEach((piece) => {
    const designs = designsForPiece(teamId, piece.id);
    const activeId = activeIds[piece.id] || "";
    const selectedId = savedSelectedIds[piece.id] || activeId || "";
    const latestDesign = latestDesignForPiece(teamId, piece.id);
    const activeDesign = activeId ? designById(teamId, piece.id, activeId) : null;
    const selectedDesign = selectedId ? designById(teamId, piece.id, selectedId) : null;

    if (latestDesign) latestIds[piece.id] = latestDesign.id;
    if (selectedDesign) selectedIds[piece.id] = selectedDesign.id;
    if (!designs.length) missingDesigns.push(piece);
    if (!activeDesign) missingActive.push(piece);
    if (!selectedDesign) missingSelected.push(piece);
    if (selectedDesign && selectedDesign.id !== activeDesign?.id) changedPieces.push(piece);

    pieceRows.push({
      piece,
      activeDesign,
      selectedDesign,
      latestDesign,
      diffs: pieceStatDiffs(piece, activeDesign, selectedDesign)
    });
  });

  const manufactureM = Number(window.LFM_SEED.costs.manufactureM || 0.25);
  const activeStats = carStatsFromDesignIds(teamId, activeIds);
  const selectedStats = carStatsFromDesignIds(teamId, selectedIds);
  const latestStats = carStatsFromDesignIds(teamId, latestIds);
  const statNames = Array.from(new Set([
    ...Object.keys(activeStats),
    ...Object.keys(selectedStats),
    ...Object.keys(latestStats)
  ])).sort((a, b) => {
    if (a === "Duracion minima") return 1;
    if (b === "Duracion minima") return -1;
    return a.localeCompare(b);
  });

  return {
    activeIds,
    selectedIds,
    latestIds,
    pieceRows,
    changedPieces,
    missingDesigns,
    missingActive,
    missingSelected,
    activeStats,
    selectedStats,
    latestStats,
    statNames,
    manufactureCostM: moneyValue(changedPieces.length * manufactureM),
    designCount: Object.values(car.designs || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
    snapshotCount: Object.keys(car.raceSnapshots || {}).length
  };
}

function nextSeasonCandidates() {
  const seasons = cache.seasons.length ? cache.seasons : [cache.season || window.LFM_SEED.season].filter(Boolean);
  return seasons
    .filter((season) => season.id !== activeSeasonId())
    .map((season) => ({
      id: season.id,
      name: season.name || `Temporada ${season.number || season.id}`
    }));
}

function defaultCarTransition() {
  const target = nextSeasonCandidates()[0] || {};
  return {
    mode: "normal",
    targetSeasonId: target.id || "",
    values: {},
    updatedAtLabel: ""
  };
}

function currentCarTransition() {
  return {
    ...defaultCarTransition(),
    ...((cache.season || {}).carTransition || {})
  };
}

function transitionStatValue(transition, pieceId, stat) {
  const value = Number(transition.values?.[pieceId]?.[stat] || 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

function nextCarNameForTeam(teamId, targetSeasonId) {
  const selection = carSelection(teamId);
  const targetSeason = cache.seasons.find((season) => season.id === targetSeasonId);
  return String(selection.nextCarName || `${teamName(teamId)} ${targetSeason?.name || targetSeasonId.toUpperCase()}`).trim();
}

function transitionPreviewForTeam(teamId, transition = currentCarTransition()) {
  return carPieces().map((piece) => {
    const latest = latestDesignForPiece(teamId, piece.id);
    const research = accumulatedResearchStats(teamId, piece.id);
    const resultStats = {};
    const statRows = (piece.stats || []).map((stat) => {
      const latestValue = statNumber(latest?.stats?.[stat]) || 0;
      const transitionValue = transitionStatValue(transition, piece.id, stat);
      const researchValue = statNumber(research[stat]) || 0;
      const baseAfterTransition = transition.mode === "regulation"
        ? transitionValue
        : Math.max(latestValue - transitionValue, 0);
      const result = statNumber(baseAfterTransition + researchValue) || 0;
      resultStats[stat] = result;
      return {
        stat,
        latestValue,
        transitionValue,
        researchValue,
        result
      };
    });

    return {
      piece,
      latest,
      research,
      resultStats,
      statRows
    };
  });
}

function raceLabel(race) {
  if (!race) return "";
  return `Ronda ${race.round} - ${race.gp}${race.hasSprint ? " (Sprint)" : ""}`;
}

function racesList() {
  return cache.calendar.length ? cache.calendar : window.LFM_SEED.calendar || [];
}

function raceById(raceId) {
  return racesList().find((race) => race.id === raceId) || null;
}

function moneyValue(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

function positiveMoneyValue(value) {
  return Math.max(0, moneyValue(value));
}

function normalizeAwardArray(values, length) {
  const source = Array.isArray(values) ? values : [];
  return Array.from({ length }, (_, index) => positiveMoneyValue(source[index]));
}

function defaultAwardSettings() {
  const seed = window.LFM_SEED.awardSettings || {};
  return {
    seasonId: activeSeasonId(),
    racePositionM: normalizeAwardArray(seed.racePositionM, 20),
    sprintPositionM: normalizeAwardArray(seed.sprintPositionM, 8),
    poleM: positiveMoneyValue(seed.poleM),
    fastestLapM: positiveMoneyValue(seed.fastestLapM)
  };
}

function awardSettings() {
  const settings = cache.awardSettings || defaultAwardSettings();
  return {
    ...defaultAwardSettings(),
    ...settings,
    racePositionM: normalizeAwardArray(settings.racePositionM, 20),
    sprintPositionM: normalizeAwardArray(settings.sprintPositionM, 8),
    poleM: positiveMoneyValue(settings.poleM),
    fastestLapM: positiveMoneyValue(settings.fastestLapM)
  };
}

function defaultRegulation() {
  const seed = window.LFM_SEED.regulation || { seasonId: activeSeasonId(), sections: [] };
  return {
    seasonId: activeSeasonId(),
    sections: regulationSections(seed.sections || [])
  };
}

function regulationSections(sections = []) {
  const source = Array.isArray(sections) ? sections : [];
  return source
    .map((section, index) => ({
      id: section.id || `section-${index + 1}`,
      title: String(section.title || `Seccion ${index + 1}`),
      order: Number(section.order || index + 1),
      content: String(section.content || "")
    }))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function currentRegulation() {
  const fallback = defaultRegulation();
  const regulation = cache.regulation || fallback;
  return {
    ...fallback,
    ...regulation,
    sections: regulationSections(regulation.sections?.length ? regulation.sections : fallback.sections)
  };
}

function defaultMotoristChampionship() {
  const seed = window.LFM_SEED.motoristChampionship || {};
  return {
    seasonId: activeSeasonId(),
    pointsByPosition: {
      1: 25,
      2: 18,
      3: 15,
      4: 12,
      5: 10,
      6: 8,
      7: 6,
      8: 4,
      9: 2,
      10: 1,
      ...(seed.pointsByPosition || {})
    },
    results: seed.results || {}
  };
}

function currentMotoristChampionship() {
  const fallback = defaultMotoristChampionship();
  const championship = cache.motoristChampionship || fallback;
  return {
    ...fallback,
    ...championship,
    pointsByPosition: {
      ...fallback.pointsByPosition,
      ...(championship.pointsByPosition || {})
    },
    results: championship.results || fallback.results || {}
  };
}

function defaultConstructorChampionship() {
  const seed = window.LFM_SEED.constructorChampionship || {};
  return {
    seasonId: activeSeasonId(),
    standings: normalizeConstructorStandings(seed.standings || []),
    importedRaces: Array.isArray(seed.importedRaces) ? seed.importedRaces : []
  };
}

function normalizeConstructorPointArray(values = [], fallback = []) {
  const source = Array.isArray(values) ? values : [];
  const length = Math.max(20, fallback.length, source.length);
  return Array.from({ length }, (_, index) => {
    const value = Number(source[index] ?? fallback[index] ?? 0);
    return Number.isFinite(value) && value >= 0
      ? Math.round(value * 1000) / 1000
      : 0;
  });
}

function defaultConstructorPointSystem() {
  const seed = window.LFM_SEED.constructorPointSystem || {};
  const raceDefault = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const sprintDefault = [8, 7, 6, 5, 4, 3, 2, 1];
  return {
    seasonId: activeSeasonId(),
    race: normalizeConstructorPointArray(seed.race, raceDefault),
    sprint: normalizeConstructorPointArray(seed.sprint, sprintDefault),
    fastestLapRace: positiveMoneyValue(seed.fastestLapRace ?? 1),
    fastestLapSprint: positiveMoneyValue(seed.fastestLapSprint ?? 0)
  };
}

function currentConstructorPointSystem() {
  const fallback = defaultConstructorPointSystem();
  const system = cache.constructorPointSystem || fallback;
  return {
    ...fallback,
    ...system,
    race: normalizeConstructorPointArray(system.race, fallback.race),
    sprint: normalizeConstructorPointArray(system.sprint, fallback.sprint),
    fastestLapRace: positiveMoneyValue(system.fastestLapRace ?? fallback.fastestLapRace),
    fastestLapSprint: positiveMoneyValue(system.fastestLapSprint ?? fallback.fastestLapSprint)
  };
}

function normalizeConstructorStandings(standings = []) {
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
  const byTeam = new Map((Array.isArray(standings) ? standings : []).map((row, index) => [
    row.teamId,
    {
      teamId: row.teamId,
      position: Number(row.position || index + 1),
      points: Number(row.points || 0),
      note: String(row.note || "")
    }
  ]));

  return teams
    .map((team, index) => {
      const row = byTeam.get(team.id) || {};
      return {
        teamId: team.id,
        position: Number(row.position || index + 1),
        points: Number(row.points || 0),
        note: String(row.note || "")
      };
    })
    .sort((a, b) => a.position - b.position || b.points - a.points || teamName(a.teamId).localeCompare(teamName(b.teamId)))
    .map((row, index) => ({
      ...row,
      position: index + 1,
      points: Number.isFinite(row.points) ? row.points : 0
    }));
}

function currentConstructorChampionship() {
  const fallback = defaultConstructorChampionship();
  const championship = cache.constructorChampionship || fallback;
  return {
    ...fallback,
    ...championship,
    standings: normalizeConstructorStandings(championship.standings || fallback.standings || []),
    importedRaces: Array.isArray(championship.importedRaces) ? championship.importedRaces : fallback.importedRaces || []
  };
}

function constructorActualPositionMap() {
  return new Map(currentConstructorChampionship().standings.map((row) => [row.teamId, row.position]));
}

function constructorPredictionScore(entry) {
  const actualPositions = constructorActualPositionMap();
  const picks = normalizeConstructorPredictionPicks(entry.picks || []);
  let points = 0;
  let correctHits = 0;
  const details = picks.map((teamId, index) => {
    const predictedPosition = index + 1;
    const actualPosition = actualPositions.get(teamId) || null;
    const distance = actualPosition ? Math.abs(predictedPosition - actualPosition) : 10;
    const score = Math.max(0, 10 - distance);
    if (distance === 0) correctHits += 1;
    points += score;
    return { teamId, predictedPosition, actualPosition, distance, score };
  });

  return { points, correctHits, details };
}

function defaultConstructorPredictions() {
  const seed = window.LFM_SEED.constructorPredictions || {};
  return {
    seasonId: activeSeasonId(),
    status: seed.status || "cerrado",
    entries: normalizeConstructorPredictionEntries(seed.entries || [])
  };
}

function normalizeConstructorPredictionEntries(entries = []) {
  const source = Array.isArray(entries) ? entries : [];
  return source
    .map((entry, index) => ({
      id: entry.id || entry.uid || `prediccion-${index + 1}`,
      uid: entry.uid || entry.id || "",
      participantName: String(entry.participantName || entry.name || `Participante ${index + 1}`),
      linkedTeamId: entry.linkedTeamId || "",
      picks: normalizeConstructorPredictionPicks(entry.picks || []),
      points: Number(entry.points || 0),
      correctHits: Number(entry.correctHits || 0),
      notes: String(entry.notes || ""),
      submittedAtLabel: entry.submittedAtLabel || ""
    }))
    .sort((a, b) => b.points - a.points || b.correctHits - a.correctHits || a.participantName.localeCompare(b.participantName));
}

function normalizeConstructorPredictionPicks(picks = []) {
  const validTeams = new Set((cache.teams.length ? cache.teams : window.LFM_SEED.teams).map((team) => team.id));
  const seen = new Set();
  return (Array.isArray(picks) ? picks : [])
    .map((teamId) => String(teamId || ""))
    .filter((teamId) => validTeams.has(teamId))
    .filter((teamId) => {
      if (seen.has(teamId)) return false;
      seen.add(teamId);
      return true;
    });
}

function currentConstructorPredictions() {
  const fallback = defaultConstructorPredictions();
  const predictions = cache.constructorPredictions || fallback;
  return {
    ...fallback,
    ...predictions,
    entries: normalizeConstructorPredictionEntries(cache.constructorPredictionVotes.length
      ? cache.constructorPredictionVotes
      : predictions.entries || fallback.entries || [])
  };
}

function constructorPredictionStatusLabel(status) {
  const labels = {
    abierto: "Abierto",
    cerrado: "Cerrado",
    finalizado: "Finalizado"
  };
  return labels[status] || status || "-";
}

function constructorPredictionStandings() {
  return currentConstructorPredictions().entries
    .map((entry) => {
      const calculated = constructorPredictionScore(entry);
      return {
        ...entry,
        picks: normalizeConstructorPredictionPicks(entry.picks),
        points: calculated.points,
        correctHits: calculated.correctHits,
        scoreDetails: calculated.details
      };
    })
    .sort((a, b) => b.points - a.points || b.correctHits - a.correctHits || a.participantName.localeCompare(b.participantName));
}

function constructorPredictionsOpen() {
  return currentConstructorPredictions().status === "abierto";
}

function canCurrentUserVote() {
  return Boolean(currentUser && currentProfile && ["manager", "predictor"].includes(currentProfile.role));
}

function currentUserPredictionVote() {
  if (!currentUser) return null;
  return constructorPredictionStandings().find((entry) => entry.uid === currentUser.uid || entry.id === currentUser.uid) || null;
}

function constructorPredictionPickText(picks = []) {
  const normalized = normalizeConstructorPredictionPicks(picks);
  if (!normalized.length) return "-";
  return normalized
    .map((teamId, index) => `${index + 1}. ${teamName(teamId)}`)
    .join(" - ");
}

function constructorPointsTable(kind) {
  const system = currentConstructorPointSystem();
  return kind === "sprint" ? system.sprint : system.race;
}

function constructorFastestLapPoints(kind) {
  const system = currentConstructorPointSystem();
  return kind === "sprint" ? Number(system.fastestLapSprint || 0) : Number(system.fastestLapRace || 0);
}

function constructorPointsSummary(kind) {
  const rows = constructorPointsTable(kind)
    .map((points, index) => ({ position: index + 1, points: Number(points || 0) }))
    .filter((row) => row.points > 0);
  const fastestLapPoints = constructorFastestLapPoints(kind);
  const summary = rows.map((row) => `P${row.position} ${row.points}`);
  if (fastestLapPoints > 0) summary.push(`VR +${fastestLapPoints}`);
  return summary.length ? summary.join(" - ") : "sin puntos";
}

function constructorImportKindLabel(kind) {
  return kind === "sprint" ? "Sprint" : "Carrera larga";
}

function constructorImportId(data, fileName, kind) {
  const track = data.TrackUniqueName || data.TrackName || "carrera";
  const session = data.SessionPosition || data.SessionType || "";
  return `${kind}-${normalizeKey(`${track}-${session}-${fileName || ""}`)}`;
}

function raceMatchesImport(race, item) {
  if (!race || !item) return false;
  if (item.raceId && item.raceId === race.id) return true;
  const raceKey = normalizeKey(race.gp);
  if (!raceKey) return false;
  return [
    item.trackName,
    item.raceGp,
    item.fileName,
    item.id
  ].some((value) => normalizeKey(value).includes(raceKey));
}

function matchRaceForConstructorImport(item) {
  return racesList().find((race) => raceMatchesImport(race, item)) || null;
}

function driverKey(name) {
  return normalizeKey(name);
}

function fastestLapFromJson(data) {
  const driverName = data?.FastestLapDriver?.Name || "";
  if (!driverName) return null;

  const driver = (data.Drivers || []).find((item) => driverKey(item.Driver?.Name) === driverKey(driverName));
  if (!driver) {
    return {
      driverName,
      teamId: "",
      teamName: "",
      position: null,
      timeInt: Number(data.FastestLapTimeInt || 0)
    };
  }

  const rawTeam = driver.Team?.Name || driver.Team?.UniqueName || "";
  const teamId = legacyTeamId(rawTeam);
  if (!teamId || ignoredResultTeam(rawTeam)) {
    return {
      driverName,
      teamId: "",
      teamName: rawTeam || "",
      position: Number(driver.Position || 0) || null,
      timeInt: Number(data.FastestLapTimeInt || driver.FastestLapTimeInt || 0)
    };
  }

  return {
    driverName,
    teamId,
    teamName: teamName(teamId),
    position: Number(driver.Position || 0) || null,
    timeInt: Number(data.FastestLapTimeInt || driver.FastestLapTimeInt || 0)
  };
}

function calculateConstructorPointsFromRaceJson(data, kind, fileName = "") {
  if (!Array.isArray(data?.Drivers) || !data.Drivers.length) {
    throw new Error("El JSON no tiene lista de pilotos.");
  }

  const table = constructorPointsTable(kind);
  const economicPositionAwards = kind === "sprint"
    ? awardSettings().sprintPositionM
    : awardSettings().racePositionM;
  const fastestLapPoints = constructorFastestLapPoints(kind);
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams;
  const pointsByTeam = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const detailsByTeam = new Map(teams.map((team) => [team.id, []]));
  const unknownTeams = new Set();
  const driverResultsByName = new Map();
  const classificationByName = new Map();

  data.Drivers.forEach((driver) => {
    const position = Number(driver.Position || 0);
    const gained = table[position - 1] || 0;
    const rawTeam = driver.Team?.Name || driver.Team?.UniqueName || "";
    const teamId = legacyTeamId(rawTeam);
    if (!teamId && ignoredResultTeam(rawTeam)) return;
    if (!teamId) {
      if (gained > 0 || positiveMoneyValue(economicPositionAwards[position - 1]) > 0) {
        unknownTeams.add(rawTeam || "sin equipo");
      }
      return;
    }

    const driverName = driver.Driver?.Name || "-";
    const classificationRow = {
      position,
      driverName,
      teamId,
      teamName: teamName(teamId),
      positionPoints: gained,
      fastestLapPoint: 0,
      points: gained,
      isFastestLap: false
    };
    classificationByName.set(driverKey(driverName), classificationRow);

    pointsByTeam[teamId] = Math.round((Number(pointsByTeam[teamId] || 0) + gained) * 1000) / 1000;
    if (gained > 0) {
      const details = detailsByTeam.get(teamId) || [];
      details.push({
        driverName,
        position,
        points: gained
      });
      detailsByTeam.set(teamId, details);
      driverResultsByName.set(driverKey(driverName), {
        ...classificationRow
      });
    }
  });

  if (unknownTeams.size) {
    throw new Error(`Equipos del JSON no reconocidos: ${Array.from(unknownTeams).join(", ")}.`);
  }

  const fastestLap = fastestLapFromJson(data);
  if (fastestLap?.teamId && fastestLapPoints > 0) {
    const key = driverKey(fastestLap.driverName);
    const existing = driverResultsByName.get(key) || {
      position: fastestLap.position,
      driverName: fastestLap.driverName,
      teamId: fastestLap.teamId,
      teamName: fastestLap.teamName,
      positionPoints: 0,
      fastestLapPoint: 0,
      points: 0,
      isFastestLap: false
    };
    existing.fastestLapPoint = Math.round((Number(existing.fastestLapPoint || 0) + fastestLapPoints) * 1000) / 1000;
    existing.points = Math.round((Number(existing.points || 0) + fastestLapPoints) * 1000) / 1000;
    existing.isFastestLap = true;
    driverResultsByName.set(key, existing);

    const classificationRow = classificationByName.get(key) || {
      position: fastestLap.position,
      driverName: fastestLap.driverName,
      teamId: fastestLap.teamId,
      teamName: fastestLap.teamName,
      positionPoints: 0,
      fastestLapPoint: 0,
      points: 0,
      isFastestLap: false
    };
    classificationRow.fastestLapPoint = Math.round((Number(classificationRow.fastestLapPoint || 0) + fastestLapPoints) * 1000) / 1000;
    classificationRow.points = Math.round((Number(classificationRow.points || 0) + fastestLapPoints) * 1000) / 1000;
    classificationRow.isFastestLap = true;
    classificationByName.set(key, classificationRow);

    pointsByTeam[fastestLap.teamId] = Math.round((Number(pointsByTeam[fastestLap.teamId] || 0) + fastestLapPoints) * 1000) / 1000;
    const details = detailsByTeam.get(fastestLap.teamId) || [];
    details.push({
      driverName: fastestLap.driverName,
      position: fastestLap.position,
      points: fastestLapPoints,
      note: "Vuelta rapida"
    });
    detailsByTeam.set(fastestLap.teamId, details);
  }

  const driverResults = [...driverResultsByName.values()]
    .filter((row) => Number(row.points || 0) > 0)
    .sort((a, b) => a.position - b.position || a.driverName.localeCompare(b.driverName));
  const classification = [...classificationByName.values()]
    .sort((a, b) => a.position - b.position || a.driverName.localeCompare(b.driverName));

  const rows = teams
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      gained: Number(pointsByTeam[team.id] || 0),
      details: detailsByTeam.get(team.id) || []
    }))
    .filter((row) => row.gained > 0)
    .sort((a, b) => b.gained - a.gained || a.teamName.localeCompare(b.teamName));

  return {
    id: constructorImportId(data, fileName, kind),
    kind,
    kindLabel: constructorImportKindLabel(kind),
    trackName: data.TrackName || fileName || "Carrera",
    fileName,
    pointsByTeam,
    rows,
    fastestLap,
    driverResults,
    classification
  };
}

function constructorResultImports() {
  return currentConstructorChampionship().importedRaces || [];
}

function resultImportsForRace(race, kind = "") {
  return constructorResultImports().filter((item) => {
    if (kind && item.kind !== kind) return false;
    return raceMatchesImport(race, item);
  });
}

function resultImportPointsSummary(item) {
  const points = item?.pointsByTeam || {};
  return Object.entries(points)
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([teamId, value]) => `${teamName(teamId)} +${value}`)
    .join(" - ");
}

function resultImportClassificationSummary(item) {
  const classification = driverResultsForImport(item);
  if (!classification.length) return "";
  return classification
    .map((row) => {
      const fastest = Number(row.fastestLapPoint || 0) > 0 ? `, VR +${row.fastestLapPoint}` : "";
      return `P${row.position || "-"} ${row.driverName} (${teamName(row.teamId)}) +${row.points}${fastest}`;
    })
    .join(" - ");
}

function driverResultsForImport(item) {
  if (Array.isArray(item?.driverResults) && item.driverResults.length) {
    return item.driverResults;
  }
  return (Array.isArray(item?.classification) ? item.classification : [])
    .map((row) => ({
      position: row.position,
      driverName: row.driverName,
      teamId: row.teamId,
      teamName: row.teamName || teamName(row.teamId),
      positionPoints: Number(row.positionPoints ?? row.points ?? 0),
      fastestLapPoint: Number(row.fastestLapPoint || 0),
      points: Number(row.points || 0),
      isFastestLap: Boolean(row.isFastestLap || Number(row.fastestLapPoint || 0) > 0)
    }));
}

function classificationRowsForImport(item) {
  const source = Array.isArray(item?.classification) && item.classification.length
    ? item.classification
    : driverResultsForImport(item);

  return source
    .map((row) => ({
      position: Number(row.position || 0),
      driverName: String(row.driverName || "-"),
      teamId: row.teamId || "",
      teamName: row.teamName || teamName(row.teamId),
      positionPoints: Number(row.positionPoints ?? row.points ?? 0),
      fastestLapPoint: Number(row.fastestLapPoint || 0),
      points: Number(row.points || 0),
      isFastestLap: Boolean(row.isFastestLap || Number(row.fastestLapPoint || 0) > 0)
    }))
    .filter((row) => row.position > 0 && row.teamId)
    .sort((a, b) => a.position - b.position || a.driverName.localeCompare(b.driverName));
}

function jsonAwardRecord(importedRace, options = {}) {
  const includeReversed = Boolean(options.includeReversed);
  return cache.raceAwards.find((award) => (
    award.source === "constructor-json"
    && award.sourceImportId === importedRace?.id
    && (includeReversed || !award.reversed)
  )) || null;
}

function jsonAwardBatchId(importedRace) {
  return `json-award-${activeSeasonId()}-${importedRace.id}`;
}

function jsonAwardsApplied(importedRace) {
  return Boolean(importedRace?.economicAwards?.applied || jsonAwardRecord(importedRace));
}

function jsonAwardsReverted(importedRace) {
  if (jsonAwardsApplied(importedRace)) return false;
  const record = jsonAwardRecord(importedRace, { includeReversed: true });
  return Boolean(importedRace?.economicAwards?.reverted || record?.reversed);
}

function jsonAwardStatus(importedRace) {
  const activeRecord = jsonAwardRecord(importedRace);
  const anyRecord = jsonAwardRecord(importedRace, { includeReversed: true });
  const applied = jsonAwardsApplied(importedRace);
  const reverted = jsonAwardsReverted(importedRace);
  const meta = importedRace?.economicAwards || {};
  let draftAmountM = 0;
  try {
    draftAmountM = jsonAwardDraft(importedRace).totalM;
  } catch {
    draftAmountM = 0;
  }
  const amountM = positiveMoneyValue(
    applied
      ? meta.totalM ?? activeRecord?.totalM ?? 0
      : reverted
        ? meta.reversedTotalM ?? anyRecord?.totalM ?? 0
        : draftAmountM
  );

  if (applied) {
    return {
      state: "applied",
      label: `Premios aplicados ${moneyM(amountM)}`,
      className: "done-pill",
      amountM
    };
  }
  if (reverted) {
    return {
      state: "reverted",
      label: `Premios revertidos ${moneyM(amountM)}`,
      className: "danger-pill",
      amountM
    };
  }
  if (amountM > 0) {
    return {
      state: "pending",
      label: `Premios pendientes ${moneyM(amountM)}`,
      className: "warn-pill",
      amountM
    };
  }
  return {
    state: "none",
    label: "Sin premios configurados",
    className: "",
    amountM: 0
  };
}

function jsonAwardRaceLabel(importedRace) {
  const race = matchRaceForConstructorImport(importedRace);
  if (race) return raceLabel(race);
  if (importedRace?.raceGp) return `R${importedRace.raceRound || "-"} - ${importedRace.raceGp}`;
  return importedRace?.trackName || importedRace?.fileName || "Carrera";
}

function jsonAwardDraft(importedRace) {
  if (!importedRace) throw new Error("Importacion no encontrada.");

  const settings = awardSettings();
  const kind = importedRace.kind === "sprint" ? "sprint" : "race";
  const kindLabel = importedRace.kindLabel || constructorImportKindLabel(kind);
  const positionAwards = kind === "sprint" ? settings.sprintPositionM : settings.racePositionM;
  const classification = classificationRowsForImport(importedRace);
  const items = [];

  const addItem = (raw) => {
    const amountM = positiveMoneyValue(raw.amountM);
    if (!raw.teamId || amountM <= 0) return;
    if (!cache.teamMap.has(raw.teamId)) throw new Error(`Equipo no encontrado: ${raw.teamId}`);
    items.push({
      teamId: raw.teamId,
      teamName: teamName(raw.teamId),
      type: raw.type,
      label: raw.label,
      position: raw.position || null,
      driverName: raw.driverName || "",
      amountM
    });
  };

  classification.forEach((row) => {
    addItem({
      teamId: row.teamId,
      type: kind,
      label: `${kind === "sprint" ? "Sprint" : "Carrera"} P${row.position}`,
      position: row.position,
      driverName: row.driverName,
      amountM: positionAwards[row.position - 1]
    });
  });

  const fastestLap = importedRace.fastestLap?.teamId
    ? importedRace.fastestLap
    : classification.find((row) => row.isFastestLap);
  addItem({
    teamId: fastestLap?.teamId || "",
    type: "fastestLap",
    label: `${kind === "sprint" ? "Sprint - " : ""}Vuelta rapida`,
    position: fastestLap?.position || null,
    driverName: fastestLap?.driverName || "",
    amountM: settings.fastestLapM
  });

  const totals = awardTotals(items);
  const race = matchRaceForConstructorImport(importedRace);
  return {
    importedRace,
    awardId: jsonAwardBatchId(importedRace),
    kind,
    kindLabel,
    race,
    raceId: importedRace.raceId || race?.id || "",
    raceLabel: jsonAwardRaceLabel(importedRace),
    raceRound: importedRace.raceRound || race?.round || 0,
    raceGp: importedRace.raceGp || race?.gp || "",
    fileName: importedRace.fileName || "",
    fastestLap: fastestLap || null,
    classification,
    items,
    totals,
    totalM: moneyValue(items.reduce((sum, item) => sum + Number(item.amountM || 0), 0))
  };
}

function driverChampionshipStandings() {
  const byDriver = new Map();
  constructorResultImports().forEach((item) => {
    const race = matchRaceForConstructorImport(item);
    classificationRowsForImport(item).forEach((result) => {
      const key = driverKey(result.driverName);
      if (!key) return;
      const row = byDriver.get(key) || {
        driverName: result.driverName,
        teamIds: new Map(),
        latestTeamId: result.teamId || "",
        points: 0,
        racePoints: 0,
        sprintPoints: 0,
        fastestLapPoints: 0,
        fastestLaps: 0,
        wins: 0,
        podiums: 0,
        positionCounts: {},
        bestPosition: null,
        results: []
      };

      const points = Number(result.points || 0);
      row.points = Math.round((row.points + points) * 1000) / 1000;
      if (item.kind === "sprint") {
        row.sprintPoints = Math.round((row.sprintPoints + points) * 1000) / 1000;
      } else {
        row.racePoints = Math.round((row.racePoints + points) * 1000) / 1000;
      }
      row.fastestLapPoints = Math.round((row.fastestLapPoints + Number(result.fastestLapPoint || 0)) * 1000) / 1000;
      if (Number(result.fastestLapPoint || 0) > 0) row.fastestLaps += 1;
      const position = Number(result.position || 0);
      if (position === 1) row.wins += 1;
      if (position > 0 && position <= 3) row.podiums += 1;
      if (position > 0) {
        row.bestPosition = row.bestPosition === null ? position : Math.min(row.bestPosition, position);
        row.positionCounts[position] = (row.positionCounts[position] || 0) + 1;
      }
      if (result.teamId) {
        row.latestTeamId = result.teamId;
        row.teamIds.set(result.teamId, (row.teamIds.get(result.teamId) || 0) + 1);
      }
      row.results.push({
        raceLabel: race ? raceLabel(race) : item.raceGp || item.trackName || item.fileName || "-",
        kind: item.kind,
        kindLabel: item.kindLabel || constructorImportKindLabel(item.kind),
        position: position || null,
        points,
        fastestLapPoint: Number(result.fastestLapPoint || 0)
      });
      byDriver.set(key, row);
    });
  });

  return [...byDriver.values()]
    .map((row) => ({
      ...row,
      teamNames: [...row.teamIds.keys()].map(teamName)
    }))
    .sort(driverChampionshipSort);
}

function driverCountbackCompare(a, b) {
  for (let position = 1; position <= 20; position += 1) {
    const diff = Number(b.positionCounts?.[position] || 0) - Number(a.positionCounts?.[position] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function driverChampionshipSort(a, b) {
  return b.points - a.points
    || b.wins - a.wins
    || b.podiums - a.podiums
    || driverCountbackCompare(a, b)
    || b.fastestLaps - a.fastestLaps
    || a.driverName.localeCompare(b.driverName);
}

function raceShouldHaveResult(race) {
  const season = cache.season || window.LFM_SEED.season || {};
  return Boolean(race?.completed) || Number(race?.round || 0) <= Number(season.completedRaces || 0);
}

function resultStatusText(race, kind) {
  if (kind === "sprint" && !race.hasSprint) return { label: "No aplica", className: "" };
  const imports = resultImportsForRace(race, kind);
  if (imports.length) return { label: "Cargado", className: "done-pill" };
  if (raceShouldHaveResult(race)) return { label: "Pendiente", className: "warn-pill" };
  return { label: "Futuro", className: "" };
}

function motoristEntries() {
  return motoristTeams().map((team) => ({
    motoristId: team.id,
    motoristName: team.name,
    teamIds: [team.id, ...(team.motorClients || [])],
    teamNames: [team.id, ...(team.motorClients || [])].map(teamName)
  }));
}

function motoristResultFor(motoristId, raceId) {
  const result = currentMotoristChampionship().results?.[motoristId]?.[raceId] || {};
  return {
    principal: Number(result.principal || 0),
    extra: Number(result.extra || 0),
    bestTeamId: result.bestTeamId || "",
    bestPosition: result.bestPosition === null || result.bestPosition === undefined ? null : Number(result.bestPosition),
    source: result.source || "manual"
  };
}

function motoristPointsForPosition(position) {
  const n = Number(position || 0);
  return Number(currentMotoristChampionship().pointsByPosition?.[n] || 0);
}

function formatMotoristPoints(result) {
  const principal = Number(result.principal || 0);
  const extra = Number(result.extra || 0);
  if (principal === 0 && extra === 0) return "-";
  return extra ? `${principal}[${extra}]` : String(principal);
}

function motoristStandings() {
  const rounds = racesList();
  return motoristEntries()
    .map((entry) => {
      const roundResults = rounds.map((race) => ({
        raceId: race.id,
        label: raceLabel(race),
        result: motoristResultFor(entry.motoristId, race.id)
      }));
      const total = roundResults.reduce((sum, item) => (
        sum + Number(item.result.principal || 0) + Number(item.result.extra || 0)
      ), 0);
      return { ...entry, roundResults, total };
    })
    .sort((a, b) => b.total - a.total || a.motoristName.localeCompare(b.motoristName));
}

function calculateMotoristResultsFromRaceJson(data) {
  const drivers = Array.isArray(data?.Drivers) ? data.Drivers : [];
  if (!drivers.length) throw new Error("El JSON no contiene datos de pilotos.");

  const bestPositionByTeam = new Map();
  drivers.forEach((driver) => {
    if (driver.Status !== "Ok") return;
    const teamId = legacyTeamId(driver.Team?.Name || driver.Team?.UniqueName || "");
    const position = Number(driver.Position || 0);
    if (!teamId || !Number.isFinite(position) || position <= 0) return;
    const current = bestPositionByTeam.get(teamId);
    if (!current || position < current.position) {
      bestPositionByTeam.set(teamId, { teamId, position });
    }
  });

  return motoristEntries().map((entry) => {
    let best = null;
    entry.teamIds.forEach((teamId) => {
      const candidate = bestPositionByTeam.get(teamId);
      if (candidate && (!best || candidate.position < best.position)) {
        best = candidate;
      }
    });

    const points = best ? motoristPointsForPosition(best.position) : 0;
    return {
      motoristId: entry.motoristId,
      principal: points,
      extra: 0,
      bestTeamId: best?.teamId || "",
      bestPosition: best?.position ?? null,
      source: "json",
      sourceTrack: data.TrackName || ""
    };
  });
}

function awardTotals(items) {
  const totals = new Map();
  items.forEach((item) => {
    totals.set(item.teamId, moneyValue((totals.get(item.teamId) || 0) + Number(item.amountM || 0)));
  });
  return [...totals.entries()]
    .map(([teamId, amountM]) => ({ teamId, teamName: teamName(teamId), amountM: moneyValue(amountM) }))
    .sort((a, b) => b.amountM - a.amountM || a.teamName.localeCompare(b.teamName));
}

function currentRaceWindow() {
  const season = cache.season || window.LFM_SEED.season;
  const raceWindow = season.currentRaceWindow || {};
  const hasRace = Boolean(raceWindow.raceId);
  const selectionOpen = hasRace && Boolean(raceWindow.selectionOpen || raceWindow.isOpen);
  const developmentOpen = hasRace && Boolean(raceWindow.developmentOpen);
  return {
    ...raceWindow,
    developmentOpen,
    selectionOpen,
    isOpen: selectionOpen
  };
}

function isDevelopmentWindowOpen() {
  return Boolean(currentRaceWindow().developmentOpen && currentRaceWindow().raceId);
}

function isSelectionWindowOpen() {
  return Boolean(currentRaceWindow().selectionOpen && currentRaceWindow().raceId);
}

function isAnyCarWindowOpen() {
  return isDevelopmentWindowOpen() || isSelectionWindowOpen();
}

function isRaceWindowOpen() {
  return isSelectionWindowOpen();
}

function currentCarWindowStatusText() {
  if (isDevelopmentWindowOpen()) return "Mejoras";
  if (isSelectionWindowOpen()) return "Seleccion";
  return "Cerrado";
}

function currentRaceWindowLabel() {
  const raceWindow = currentRaceWindow();
  if (raceWindow.label) return raceWindow.label;
  const race = raceById(raceWindow.raceId);
  return raceLabel(race) || "Plazo sin carrera";
}

function isDevelopmentMovement(move) {
  return move?.limitScope === "development" || ["coche", "peso"].includes(move?.category);
}

function developmentSpentM(movements) {
  return Math.round(
    movements
      .filter((move) => isDevelopmentMovement(move) && Number(move.amountM) < 0)
      .reduce((sum, move) => sum + Math.abs(Number(move.amountM || 0)), 0) * 1000
  ) / 1000;
}

function developmentSummary(teamId) {
  const season = cache.season || window.LFM_SEED.season;
  const limitM = Number(season.developmentLimitM || 0);
  const movements = cache.teamMovements.get(teamId) || (currentProfile?.teamId === teamId ? cache.movements : []);
  const spentM = developmentSpentM(movements);
  const remainingM = Math.round((limitM - spentM) * 1000) / 1000;
  const percent = limitM > 0 ? Math.round((spentM / limitM) * 1000) / 10 : 0;
  const status = spentM > limitM ? "over" : percent >= 90 ? "warn" : "ok";
  return { limitM, spentM, remainingM, percent, status };
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function legacyTeamId(value) {
  const map = {
    ferrari: "ferrari",
    mercedes: "mercedes",
    redbull: "redbull",
    aston: "astonmartin",
    astonmartin: "astonmartin",
    williams: "williams",
    mclaren: "mclaren",
    andretti: "andretti",
    renault: "andretti",
    alpine: "andretti",
    haas: "haas",
    sauber: "sauber",
    kicksauber: "sauber",
    stakesauber: "sauber",
    stakesauber2024: "sauber",
    stakef1teamkicksauber: "sauber",
    alfaromeo: "sauber",
    rb: "porsche",
    racingbulls: "porsche",
    visacashapprb: "porsche",
    visacashapprb2024: "porsche",
    visacashapp: "porsche",
    vcarb: "porsche",
    hugoboss: "porsche",
    hugobossracing: "porsche",
    porsche: "porsche"
  };
  return map[normalizeKey(value)] || "";
}

function ignoredResultTeam(value) {
  return ["descoequipo"].includes(normalizeKey(value));
}

function fileNamePart(value) {
  return normalizeKey(value) || "export";
}

function teamLookupKeys(team) {
  const values = [
    team.id,
    team.name,
    team.loginEmail ? team.loginEmail.split("@")[0] : "",
    ...(team.aliases || [])
  ];
  return Array.from(new Set(values.map(normalizeKey).filter(Boolean)));
}

function buildMoneyExportPayload() {
  const season = cache.season || window.LFM_SEED.season || {};
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
  const exportedAt = new Date().toISOString();
  const exportTeams = teams.map((team) => {
    const budgetRemainingM = moneyValue(team.budgetRemainingM);
    const budgetRemaining = Math.round(budgetRemainingM * 1000000);
    return {
      id: team.id,
      teamId: team.id,
      name: team.name,
      publicName: team.name,
      aliases: team.aliases || [],
      managerName: team.managerName || "",
      loginEmail: team.loginEmail || "",
      budgetRemainingM,
      budgetRemaining,
      isMotorist: Boolean(team.isMotorist),
      motoristId: team.motoristId || "",
      motoristName: team.isMotorist ? team.name : teamName(team.motoristId),
      motorClientIds: team.motorClients || [],
      motorClientNames: (team.motorClients || []).map(teamName),
      lookupKeys: teamLookupKeys(team)
    };
  });

  return {
    schema: "lfm_money_export",
    schemaVersion: 1,
    sourceApp: "LigaF1ManagerWeb",
    exportedAt,
    exportedBy: {
      uid: currentUser?.uid || "",
      email: currentUser?.email || ""
    },
    season: {
      id: activeSeasonId(),
      name: season.name || activeSeasonId().toUpperCase(),
      status: season.status || ""
    },
    money: {
      unit: "M",
      scale: 1000000,
      budgetRemainingMField: "budgetRemainingM",
      budgetRemainingBaseField: "budgetRemaining"
    },
    teams: exportTeams,
    byTeam: Object.fromEntries(exportTeams.map((team) => [team.id, {
      budgetRemainingM: team.budgetRemainingM,
      budgetRemaining: team.budgetRemaining,
      name: team.name,
      lookupKeys: team.lookupKeys
    }]))
  };
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function marketCostToM(value, scale = 1000000) {
  const n = Number(value || 0);
  const divisor = Number(scale || 1000000) || 1000000;
  if (!Number.isFinite(n)) return 0;
  return moneyValue(n / divisor);
}

function hasImportMoneyField(source, field) {
  return source && source[field] !== undefined && source[field] !== null && source[field] !== "";
}

function simpleTextHash(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 31) + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function moneyImportTeamId(team) {
  const candidates = [
    team?.teamId,
    team?.id,
    team?.name,
    team?.publicName,
    team?.managerName,
    team?.manager,
    ...(team?.aliases || []),
    ...(team?.lookupKeys || [])
  ];

  for (const candidate of candidates) {
    const direct = normalizeKey(candidate);
    if (cache.teamMap.has(direct)) return direct;
    const legacy = legacyTeamId(candidate);
    if (legacy && cache.teamMap.has(legacy)) return legacy;
  }
  return "";
}

function moneyImportTargetM(team, scale = 1000000) {
  if (hasImportMoneyField(team, "budgetRemainingM")) {
    const value = Number(team.budgetRemainingM);
    if (Number.isFinite(value)) return moneyValue(value);
  }

  if (hasImportMoneyField(team, "budgetRemaining")) {
    const value = Number(team.budgetRemaining);
    if (Number.isFinite(value)) return marketCostToM(value, scale);
  }

  throw new Error(`Monto invalido para ${team?.name || team?.teamId || team?.id || "un equipo"}.`);
}

function moneyImportInfoM(team, baseField, mField, scale = 1000000) {
  if (hasImportMoneyField(team, mField)) {
    const value = Number(team[mField]);
    return Number.isFinite(value) ? moneyValue(value) : 0;
  }
  if (hasImportMoneyField(team, baseField)) {
    const value = Number(team[baseField]);
    return Number.isFinite(value) ? marketCostToM(value, scale) : 0;
  }
  return 0;
}

function moneyImportId(data, fileName, rows) {
  const fileFallback = data?.exportedAt || data?.market?.periodId || data?.market?.id ? "" : fileName;
  const fingerprint = [
    data?.schema,
    data?.schemaVersion,
    data?.season?.id,
    data?.market?.periodId,
    data?.market?.id,
    data?.exportedAt,
    fileFallback,
    rows.map((row) => `${row.teamId}:${row.targetM}`).sort().join("|")
  ].join("::");

  const seasonPart = fileNamePart(data?.season?.id || activeSeasonId());
  const exportedPart = fileNamePart(data?.market?.periodId || data?.exportedAt || fileName).slice(0, 40);
  return `money-${seasonPart}-${exportedPart}-${simpleTextHash(fingerprint)}`;
}

function moneyImportAppliedIds() {
  const ids = Array.isArray(cache.season?.moneyImportIds) ? cache.season.moneyImportIds : [];
  const imports = Array.isArray(cache.season?.moneyImports) ? cache.season.moneyImports : [];
  return new Set([
    ...ids,
    ...imports.map((item) => item?.id).filter(Boolean)
  ]);
}

function moneyImportPreview(data, fileName) {
  if (data?.schema !== "lfm_money_export" || Number(data?.schemaVersion) !== 1) {
    throw new Error("El JSON no coincide con lfm_money_export v1.");
  }
  if (!Array.isArray(data.teams) || !data.teams.length) {
    throw new Error("El JSON no contiene teams[].");
  }

  const appTeams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
  if (!appTeams.length) throw new Error("No hay equipos cargados en la app.");

  const scale = Number(data.money?.scale || 1000000) || 1000000;
  const unknownTeams = new Set();
  const duplicateTeams = new Set();
  const seenTeams = new Set();
  const rows = [];

  data.teams.forEach((sourceTeam) => {
    const teamId = moneyImportTeamId(sourceTeam);
    const sourceLabel = sourceTeam?.teamId || sourceTeam?.id || sourceTeam?.name || "sin_id";
    if (!teamId) {
      unknownTeams.add(sourceLabel);
      return;
    }
    if (seenTeams.has(teamId)) {
      duplicateTeams.add(teamName(teamId));
      return;
    }

    const team = cache.teamMap.get(teamId);
    const currentM = moneyValue(team?.budgetRemainingM);
    const targetM = moneyImportTargetM(sourceTeam, scale);
    const deltaM = moneyValue(targetM - currentM);
    seenTeams.add(teamId);
    rows.push({
      teamId,
      teamName: team?.name || teamId,
      sourceTeamId: sourceTeam?.teamId || sourceTeam?.id || "",
      sourceName: sourceTeam?.publicName || sourceTeam?.name || sourceLabel,
      manager: sourceTeam?.manager || sourceTeam?.managerName || "",
      currentM,
      targetM,
      deltaM,
      spentM: moneyImportInfoM(sourceTeam, "spent", "spentM", scale),
      committedM: moneyImportInfoM(sourceTeam, "committed", "committedM", scale)
    });
  });

  if (unknownTeams.size) {
    throw new Error(`Equipos del JSON no reconocidos: ${Array.from(unknownTeams).join(", ")}.`);
  }
  if (duplicateTeams.size) {
    throw new Error(`Equipos repetidos en el JSON: ${Array.from(duplicateTeams).join(", ")}.`);
  }

  const missingTeams = appTeams
    .filter((team) => !seenTeams.has(team.id))
    .map((team) => team.name);
  if (missingTeams.length) {
    throw new Error(`Faltan equipos en el JSON: ${missingTeams.join(", ")}.`);
  }

  rows.sort((a, b) => a.teamName.localeCompare(b.teamName, "es"));
  const importId = moneyImportId(data, fileName, rows);
  const appliedIds = moneyImportAppliedIds();
  return {
    importId,
    fileName,
    seasonId: activeSeasonId(),
    sourceSeasonId: data.season?.id || "",
    sourceExportedAt: data.exportedAt || "",
    sourceMarketId: data.market?.periodId || data.market?.id || "",
    rows,
    teamCount: rows.length,
    totalTargetM: moneyValue(rows.reduce((sum, row) => sum + row.targetM, 0)),
    totalDeltaM: moneyValue(rows.reduce((sum, row) => sum + row.deltaM, 0)),
    changedCount: rows.filter((row) => row.deltaM !== 0).length,
    alreadyApplied: appliedIds.has(importId)
  };
}

function staffImportTeamId(team) {
  const candidates = [
    team?.teamId,
    team?.id,
    team?.name,
    team?.publicName,
    ...(team?.lookupKeys || [])
  ];
  for (const candidate of candidates) {
    const direct = normalizeKey(candidate);
    if (cache.teamMap.has(direct)) return direct;
    const legacy = legacyTeamId(candidate);
    if (legacy && cache.teamMap.has(legacy)) return legacy;
  }
  return "";
}

function staffImportEntry(item, group, index, fileName, scale) {
  const slot = String(item?.slot || "");
  const slotLabel = String(item?.slotLabel || "");
  const isDriver = group === "drivers";
  const role = slotLabel || (isDriver ? driverSlotLabel(slot) : staffSlotLabel(slot));
  const rawRating = item?.rating === undefined || item?.rating === "" || item?.rating === null
    ? null
    : Number(item.rating);

  return {
    id: String(item?.signingKey || item?.auctionId || item?.id || `${group}-${slot || index + 1}`),
    role,
    name: String(item?.name || "").trim(),
    valueM: marketCostToM(item?.cost, scale),
    notes: String(item?.catLabel || ""),
    rating: Number.isFinite(rawRating) ? rawRating : null,
    cat: String(item?.cat || (isDriver ? "driver" : "staff")),
    catLabel: String(item?.catLabel || (isDriver ? "Piloto" : "Staff")),
    slot,
    slotLabel,
    signingKey: String(item?.signingKey || ""),
    auctionId: String(item?.auctionId || ""),
    reserveOnly: Boolean(item?.reserveOnly),
    bidRole: String(item?.bidRole || ""),
    importedFrom: fileName
  };
}

function staffImportDocs(data, fileName) {
  if (data?.schema !== "f1_mercado_staff_export") {
    throw new Error("El JSON no es un export de staff de la app de pujas.");
  }
  if (!Array.isArray(data.teams) || !data.teams.length) {
    throw new Error("El JSON no contiene equipos.");
  }

  const scale = Number(data.money?.scale || 1000000);
  const unknownTeams = new Set();
  const docs = [];

  data.teams.forEach((team) => {
    const teamId = staffImportTeamId(team);
    if (!teamId) {
      unknownTeams.add(team.teamId || team.id || team.name || "sin_id");
      return;
    }

    const entries = [
      ...(team.drivers || []).map((item, index) => staffImportEntry(item, "drivers", index, fileName, scale)),
      ...(team.staff || []).map((item, index) => staffImportEntry(item, "staff", index, fileName, scale))
    ].filter((entry) => entry.name);

    docs.push({
      teamId,
      sourceTeamId: team.teamId || team.id || "",
      entries
    });
  });

  if (unknownTeams.size) {
    throw new Error(`Equipos del JSON no reconocidos: ${Array.from(unknownTeams).join(", ")}.`);
  }
  if (!docs.length) {
    throw new Error("No encontre plantillas validas para importar.");
  }
  return docs;
}

function legacyPieceId(value) {
  const map = {
    chasis: "chassis",
    chassis: "chassis",
    frontwing: "frontWing",
    alerondelantero: "frontWing",
    rearwing: "rearWing",
    alerontrasero: "rearWing",
    sidepods: "sidepods",
    pontones: "sidepods",
    underfloor: "underfloor",
    fondoplano: "underfloor",
    suspension: "suspension"
  };
  return map[normalizeKey(value)] || "";
}

function seedHeadquartersMap() {
  return new Map(
    Object.entries(window.LFM_SEED.headquarters || {}).map(([teamId, levels]) => [
      teamId,
      { teamId, seasonId: activeSeasonId(), levels }
    ])
  );
}

function teamsHeadquartersMap(teams) {
  const map = seedHeadquartersMap();
  teams.forEach((team) => {
    map.set(team.id, {
      teamId: team.id,
      seasonId: team.seasonId || activeSeasonId(),
      levels: window.LFM_SEED.headquarters?.[team.id] || {}
    });
  });
  return map;
}

function headquartersLevels(teamId) {
  const stored = cache.headquarters.get(teamId);
  return stored?.levels || window.LFM_SEED.headquarters?.[teamId] || {};
}

function headquartersAverage(teamId) {
  const levels = headquartersLevels(teamId);
  const values = facilities().map((facility) => Number(levels[facility.id] || 0));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roleLabel(profile) {
  if (!currentUser) return "Publico";
  if (isAdmin()) return "Admin";
  if (!profile) return "Sin perfil";
  if (profile.role === "manager") return `Equipo: ${teamName(profile.teamId)}`;
  if (profile.role === "predictor") return `Votante: ${profile.displayName || profile.email || "predicciones"}`;
  return profile.role;
}

function isAdmin() {
  return currentUser && (currentUser.email || "").toLowerCase() === ADMIN_EMAIL;
}

function showMessage(el, text, type = "") {
  el.textContent = text;
  el.className = `message ${type}`.trim();
}

function setLoading(button, text = "Cargando...") {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = text;
  return () => {
    button.disabled = false;
    button.textContent = old;
  };
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  for (const el of [els.publicView, els.loginView, els.teamView, els.adminView]) {
    el.classList.add("hidden");
  }
  $(`${view}View`)?.classList.remove("hidden");
  render();
}

function wireNav() {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
}

async function loadPublicData() {
  if (window.LFM_MISSING_CONFIG) {
    cache.seasonId = window.LFM_SEED.season?.id || "t7";
    cache.seasons = [window.LFM_SEED.season];
    cache.season = window.LFM_SEED.season;
    cache.teams = window.LFM_SEED.teams;
    cache.teamMap = new Map(cache.teams.map((team) => [team.id, team]));
    cache.headquarters = seedHeadquartersMap();
    cache.calendar = window.LFM_SEED.calendar || [];
    cache.awardSettings = defaultAwardSettings();
    cache.raceAwards = [];
    cache.awardsLoadError = "";
    cache.regulation = defaultRegulation();
    cache.regulationLoadError = "";
    cache.motoristChampionship = defaultMotoristChampionship();
    cache.motoristChampionshipLoadError = "";
    cache.constructorChampionship = defaultConstructorChampionship();
    cache.constructorChampionshipLoadError = "";
    cache.constructorPointSystem = defaultConstructorPointSystem();
    cache.constructorPointSystemLoadError = "";
    cache.constructorPredictions = defaultConstructorPredictions();
    cache.constructorPredictionVotes = [];
    cache.constructorPredictionsLoadError = "";
    cache.personnel = new Map();
    cache.personnelLoadError = "";
    render();
    return;
  }

  const settingsDoc = await db.collection("lfm_settings").doc("current").get();
  cache.seasonId = settingsDoc.exists
    ? settingsDoc.data().seasonId || "t7"
    : "t7";

  const [seasonDoc, seasonsSnap, teamsSnap] = await Promise.all([
    db.collection("lfm_seasons").doc(activeSeasonId()).get(),
    db.collection("lfm_seasons").get(),
    db.collection("lfm_teams").orderBy("name").get()
  ]);

  cache.season = seasonDoc.exists ? { id: seasonDoc.id, ...seasonDoc.data() } : null;
  cache.seasons = seasonsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => Number(a.number || 0) - Number(b.number || 0));
  cache.teams = teamsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  cache.teamMap = new Map(cache.teams.map((team) => [team.id, team]));
  cache.calendar = cache.season?.calendar || window.LFM_SEED.calendar || [];
  await Promise.all([
    loadAwardsData(),
    loadRegulationData(),
    loadMotoristChampionshipData(),
    loadConstructorChampionshipData(),
    loadConstructorPointSystemData(),
    loadConstructorPredictionsData(),
    loadPersonnelData()
  ]);
  render();
}

async function loadAwardsData() {
  cache.awardSettings = defaultAwardSettings();
  cache.raceAwards = [];
  cache.awardsLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const [settingsDoc, awardsSnap] = await Promise.all([
      db.collection("lfm_awardSettings").doc(activeSeasonId()).get(),
      db.collection("lfm_raceAwards").get()
    ]);

    cache.awardSettings = settingsDoc.exists
      ? { ...defaultAwardSettings(), ...settingsDoc.data() }
      : defaultAwardSettings();
    cache.raceAwards = awardsSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((award) => (award.seasonId || "t7") === activeSeasonId())
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      });
  } catch (error) {
    cache.awardsLoadError = translateError(error);
  }
}

async function loadRegulationData() {
  cache.regulation = defaultRegulation();
  cache.regulationLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const doc = await db.collection("lfm_regulations").doc(activeSeasonId()).get();
    cache.regulation = doc.exists
      ? { ...defaultRegulation(), ...doc.data() }
      : defaultRegulation();
  } catch (error) {
    cache.regulationLoadError = translateError(error);
  }
}

async function loadMotoristChampionshipData() {
  cache.motoristChampionship = defaultMotoristChampionship();
  cache.motoristChampionshipLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const doc = await db.collection("lfm_motoristChampionships").doc(activeSeasonId()).get();
    cache.motoristChampionship = doc.exists
      ? { ...defaultMotoristChampionship(), ...doc.data() }
      : defaultMotoristChampionship();
  } catch (error) {
    cache.motoristChampionshipLoadError = translateError(error);
  }
}

async function loadConstructorChampionshipData() {
  cache.constructorChampionship = defaultConstructorChampionship();
  cache.constructorChampionshipLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const doc = await db.collection("lfm_constructorChampionships").doc(activeSeasonId()).get();
    cache.constructorChampionship = doc.exists
      ? { ...defaultConstructorChampionship(), ...doc.data() }
      : defaultConstructorChampionship();
  } catch (error) {
    cache.constructorChampionshipLoadError = translateError(error);
  }
}

async function loadConstructorPointSystemData() {
  cache.constructorPointSystem = defaultConstructorPointSystem();
  cache.constructorPointSystemLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const doc = await db.collection("lfm_constructorPointSystems").doc(activeSeasonId()).get();
    cache.constructorPointSystem = doc.exists
      ? { ...defaultConstructorPointSystem(), ...doc.data() }
      : defaultConstructorPointSystem();
  } catch (error) {
    cache.constructorPointSystemLoadError = translateError(error);
  }
}

async function loadConstructorPredictionsData() {
  cache.constructorPredictions = defaultConstructorPredictions();
  cache.constructorPredictionVotes = [];
  cache.constructorPredictionsLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const settingsDoc = await db.collection("lfm_constructorPredictionSettings").doc(activeSeasonId()).get();
    cache.constructorPredictions = settingsDoc.exists
      ? { ...defaultConstructorPredictions(), ...settingsDoc.data() }
      : defaultConstructorPredictions();

    const votesRef = db.collection("lfm_constructorPredictionVotes").doc(activeSeasonId()).collection("votes");
    const shouldLoadAllVotes = isAdmin() || cache.constructorPredictions.status !== "abierto";

    if (shouldLoadAllVotes) {
      const votesSnap = await votesRef.get();
      cache.constructorPredictionVotes = votesSnap.docs.map((doc) => ({ id: doc.id, uid: doc.id, ...doc.data() }));
    } else if (currentUser) {
      const ownVoteDoc = await votesRef.doc(currentUser.uid).get();
      cache.constructorPredictionVotes = ownVoteDoc.exists
        ? [{ id: ownVoteDoc.id, uid: ownVoteDoc.id, ...ownVoteDoc.data() }]
        : [];
    }
  } catch (error) {
    cache.constructorPredictionsLoadError = translateError(error);
  }
}

async function loadPersonnelData() {
  cache.personnel = new Map();
  cache.personnelLoadError = "";

  if (window.LFM_MISSING_CONFIG) return;

  try {
    const snap = await db.collection("lfm_teamPersonnel").get();
    cache.personnel = new Map(snap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
  } catch (error) {
    cache.personnelLoadError = translateError(error);
  }
}

async function loadHeadquartersData() {
  cache.headquarters = new Map();
  if (window.LFM_MISSING_CONFIG) {
    cache.headquarters = seedHeadquartersMap();
    return;
  }

  if (isAdmin()) {
    const snap = await db.collection("lfm_teamFacilities").get();
    cache.headquarters = snap.empty
      ? teamsHeadquartersMap(cache.teams)
      : new Map(snap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
    return;
  }

  if (currentProfile?.teamId) {
    const doc = await db.collection("lfm_teamFacilities").doc(currentProfile.teamId).get();
    cache.headquarters = new Map([[
      currentProfile.teamId,
      doc.exists
        ? { id: doc.id, ...doc.data() }
        : { teamId: currentProfile.teamId, seasonId: activeSeasonId(), levels: window.LFM_SEED.headquarters?.[currentProfile.teamId] || {} }
    ]]);
  }
}

async function loadProfile(user) {
  if (!user || isAdmin()) return null;
  const doc = await db.collection("lfm_users").doc(user.uid).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function loadTeamMovements(teamId, limit = 100) {
  if (!teamId || window.LFM_MISSING_CONFIG) return [];
  const snap = await db.collection("lfm_teamEconomy")
    .doc(teamId)
    .collection("movements")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((move) => (move.seasonId || "t7") === activeSeasonId());
}

async function loadAdminMovements() {
  cache.teamMovements = new Map();
  if (window.LFM_MISSING_CONFIG || !isAdmin()) return;

  const entries = await Promise.all(
    cache.teams.map(async (team) => {
      const movements = await loadTeamMovements(team.id, 500);
      return [team.id, movements];
    })
  );

  cache.teamMovements = new Map(entries);
}

async function loadProfiles() {
  if (window.LFM_MISSING_CONFIG || !isAdmin()) return [];
  const snap = await db.collection("lfm_users").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function loadCarData() {
  cache.carDocs = new Map();
  cache.carSelections = new Map();
  cache.carLoadError = "";
  cache.carSelectionLoadError = "";

  if (window.LFM_MISSING_CONFIG || !currentUser) return;

  if (isAdmin()) {
    const [carsResult, selectionsResult] = await Promise.allSettled([
      db.collection("lfm_teamCars").get(),
      db.collection("lfm_carSelections").get()
    ]);

    if (carsResult.status === "fulfilled") {
      const carsSnap = carsResult.value;
      cache.carDocs = new Map(carsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
    } else {
      cache.carLoadError = translateError(carsResult.reason);
    }

    if (selectionsResult.status === "fulfilled") {
      const selectionsSnap = selectionsResult.value;
      cache.carSelections = new Map(selectionsSnap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
    } else {
      cache.carSelectionLoadError = translateError(selectionsResult.reason);
    }
    return;
  }

  if (currentProfile?.teamId) {
    const teamId = currentProfile.teamId;
    const [carResult, selectionResult] = await Promise.allSettled([
      db.collection("lfm_teamCars").doc(teamId).get(),
      db.collection("lfm_carSelections").doc(teamId).get()
    ]);

    if (carResult.status === "fulfilled") {
      const carSnap = carResult.value;
      if (carSnap.exists) {
        cache.carDocs.set(currentProfile.teamId, { id: carSnap.id, ...carSnap.data() });
      }
    } else {
      cache.carLoadError = translateError(carResult.reason);
    }

    if (selectionResult.status === "fulfilled") {
      const selectionSnap = selectionResult.value;
      if (selectionSnap.exists) {
        cache.carSelections.set(currentProfile.teamId, { id: selectionSnap.id, ...selectionSnap.data() });
      }
    } else {
      cache.carSelectionLoadError = translateError(selectionResult.reason);
    }
  }
}

async function loadEngineData() {
  cache.engines = new Map();
  cache.engineLoadError = "";

  if (window.LFM_MISSING_CONFIG || !currentUser) return;

  try {
    if (isAdmin()) {
      const snap = await db.collection("lfm_teamEngines").get();
      cache.engines = new Map(snap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
      return;
    }

    const team = currentProfile?.teamId ? cache.teamMap.get(currentProfile.teamId) : null;
    if (team?.isMotorist) {
      const doc = await db.collection("lfm_teamEngines").doc(team.id).get();
      if (doc.exists) {
        cache.engines.set(team.id, { id: doc.id, ...doc.data() });
      }
    }
  } catch (error) {
    cache.engineLoadError = translateError(error);
  }
}

async function loadSessionData() {
  await loadPublicData();

  if (currentProfile?.teamId) {
    cache.movements = await loadTeamMovements(currentProfile.teamId);
    cache.teamMovements = new Map([[currentProfile.teamId, cache.movements]]);
  } else {
    cache.movements = [];
    cache.teamMovements = new Map();
  }

  cache.profiles = isAdmin() ? await loadProfiles() : [];
  await loadHeadquartersData();
  if (isAdmin()) await loadAdminMovements();
  await loadCarData();
  await loadEngineData();
  render();
}

function autoRefreshBlockedByEditing() {
  const active = document.activeElement;
  if (!active) return false;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName);
}

async function autoRefreshData() {
  if (autoRefreshInFlight || document.hidden || autoRefreshBlockedByEditing()) return;
  autoRefreshInFlight = true;
  try {
    await loadSessionData();
  } catch (error) {
    console.warn("No se pudo refrescar la pagina automaticamente.", error);
  } finally {
    autoRefreshInFlight = false;
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(autoRefreshData, AUTO_REFRESH_MS);
}

async function bootAuth() {
  if (window.LFM_MISSING_CONFIG) {
    els.setupWarning.classList.remove("hidden");
    await loadPublicData();
    startAutoRefresh();
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    currentProfile = await loadProfile(user);

    els.logoutBtn.classList.toggle("hidden", !user);
    els.teamNavBtn.classList.toggle("hidden", !currentProfile?.teamId);
    els.adminNavBtn.classList.toggle("hidden", !isAdmin());
    els.authBadge.textContent = roleLabel(currentProfile);

    await loadSessionData();
    startAutoRefresh();

    if (user && currentView === "login") {
      switchView(isAdmin() ? "admin" : currentProfile?.teamId ? "team" : "public");
    } else {
      render();
    }
  });
}

function render() {
  renderPublic();
  if (!els.teamView.classList.contains("hidden")) renderTeam();
  if (!els.adminView.classList.contains("hidden")) renderAdmin();
}

function publicTabs() {
  return [
    { id: "inicio", label: "Inicio" },
    { id: "calendario", label: "Calendario" },
    { id: "resultados", label: "Resultados" },
    { id: "constructores", label: "Constructores" },
    { id: "pilotos", label: "Pilotos" },
    { id: "motoristas", label: "Motoristas" },
    { id: "personal", label: "Personal" },
    { id: "predicciones", label: "Predicciones" },
    { id: "premios", label: "Premios" },
    { id: "presupuesto", label: "Presupuesto" },
    { id: "reglamento", label: "Reglamento" }
  ];
}

function renderPublicTabs() {
  const tabs = publicTabs();
  if (!tabs.some((tab) => tab.id === currentPublicTab)) {
    currentPublicTab = "inicio";
  }

  return `
    <div class="public-tabs" role="tablist" aria-label="Secciones publicas">
      ${tabs.map((tab) => `
        <button
          class="public-tab ${tab.id === currentPublicTab ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.id === currentPublicTab ? "true" : "false"}"
          data-public-tab="${html(tab.id)}"
        >${html(tab.label)}</button>
      `).join("")}
    </div>
  `;
}

function wirePublicTabs() {
  document.querySelectorAll("[data-public-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPublicTab = button.dataset.publicTab || "inicio";
      document.querySelectorAll("[data-public-tab]").forEach((tabButton) => {
        const active = tabButton.dataset.publicTab === currentPublicTab;
        tabButton.classList.toggle("active", active);
        tabButton.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll("[data-public-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.publicPanel !== currentPublicTab);
      });
    });
  });

  document.querySelectorAll("[data-public-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.publicPanel !== currentPublicTab);
  });
}

function renderPublicStartingGrid(teams) {
  if (cache.personnelLoadError) {
    return `<div class="empty">${html(cache.personnelLoadError)} Publica las reglas de personal para mostrar la parrilla.</div>`;
  }

  const orderedTeams = publicGridTeams(teams);
  const hasDrivers = orderedTeams.some((team) => gridDriversForTeam(team.id).some((slot) => slot.entry));
  if (!hasDrivers) {
    return `<div class="empty">Todavia no hay pilotos cargados para mostrar la parrilla.</div>`;
  }

  return `
    <div class="starting-grid">
      ${orderedTeams.map((team) => {
        const mainDrivers = gridDriversForTeam(team.id).filter(({ slot }) => ["p1", "p2"].includes(slot));
        return `
          <section class="grid-team-card">
            <div class="grid-team-head">
              <div>
                <h4>${html(team.name)}</h4>
              </div>
              <span class="pill">${html(team.isMotorist ? "Motorista" : teamName(team.motoristId))}</span>
            </div>
            <div class="main-driver-grid">
              ${mainDrivers.map(({ slot, entry }) => `
                <div class="main-driver ${entry ? "" : "empty-slot"}">
                  <span>${html(driverSlotLabel(slot))}</span>
                  <strong>${entry ? html(entry.name) : "-"}</strong>
                  ${entry ? `<small>${html(personnelMeta(entry) || entry.catLabel || entry.role || "")}</small>` : ""}
                </div>
              `).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderPublic() {
  const season = cache.season || window.LFM_SEED.season;
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams;
  const motorRows = teams.filter((team) => team.isMotorist);

  els.publicView.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Temporada ${html(season.number || 7)}</p>
        <h2>Estado: ${html(statusText(season.status))}</h2>
        <p>${html(season.completedRaces || 0)} carreras completadas. Limite de desarrollo: ${moneyM(season.developmentLimitM)}. Limite motor: ${moneyM(season.motorLimitM)}.</p>
      </div>
      <div class="hero-stat">
        <span>Equipos</span>
        <strong>${teams.length}</strong>
      </div>
    </section>

    ${renderPublicTabs()}

    <section class="public-home-panel" data-public-panel="inicio">
      <div class="section-head">
        <h3>Parrilla actual de la temporada</h3>
        <span class="pill">Titulares</span>
      </div>
      ${renderPublicStartingGrid(teams)}
    </section>

    <article class="card" data-public-panel="calendario">
      <div class="card-header">
        <h3>Calendario ${html(season.name || activeSeasonId().toUpperCase())}</h3>
        <span class="pill">${cache.calendar.length || window.LFM_SEED.calendar.length} rondas</span>
      </div>
      ${renderCalendar()}
    </article>

    <article class="card" data-public-panel="resultados">
      <div class="card-header">
        <h3>Resultados por GP</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicResults()}
    </article>

    <article class="card" data-public-panel="constructores">
      <div class="card-header">
        <h3>Campeonato constructores</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicConstructorChampionship()}
    </article>

    <article class="card" data-public-panel="pilotos">
      <div class="card-header">
        <h3>Campeonato pilotos</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderDriverChampionship(false)}
    </article>

    <article class="card" data-public-panel="motoristas">
      <div class="card-header">
        <h3>Campeonato motoristas</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicMotoristChampionship()}
    </article>

    <article class="card" data-public-panel="personal">
      <div class="card-header">
        <h3>Plantillas de equipos</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicPersonnel(teams)}
    </article>

    <article class="card" data-public-panel="predicciones">
      <div class="card-header">
        <h3>Predicciones constructores</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicConstructorPredictions()}
    </article>

    <article class="card" data-public-panel="premios">
      <div class="card-header">
        <h3>Premios aplicados</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicRaceAwards()}
    </article>

    <article class="card" data-public-panel="reglamento">
      <div class="card-header">
        <h3>Reglamento ${html(season.name || activeSeasonId().toUpperCase())}</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderPublicRegulation()}
    </article>

    <section class="grid two" data-public-panel="presupuesto">
      <article class="card">
        <div class="card-header">
          <h3>Presupuesto publico</h3>
          <span class="pill">Restante total</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Equipo</th><th>Presupuesto</th><th>Motorista</th><th>Manager</th></tr>
            </thead>
            <tbody>
              ${teams.map((team) => `
                <tr>
                  <td>
                    <strong>${html(team.name)}</strong>
                    ${team.aliases?.length ? `<small>Alias: ${html(team.aliases.join(", "))}</small>` : ""}
                  </td>
                  <td>${moneyM(team.budgetRemainingM)}</td>
                  <td>${team.isMotorist ? "Motorista" : html(teamName(team.motoristId))}</td>
                  <td>${html(team.managerName || "Por definir")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Motoristas y clientes</h3>
          <span class="pill">Publico</span>
        </div>
        <div class="list">
          ${motorRows.map((team) => `
            <div class="list-row">
              <div>
                <strong>${html(team.name)}</strong>
                <span>Clientes: ${team.motorClients?.length ? html(team.motorClients.map(teamName).join(", ")) : "sin clientes"}</span>
              </div>
              <span class="mini">${moneyM(season.motorLimitM)} limite</span>
            </div>
          `).join("")}
        </div>
      </article>
    </section>
  `;

  wirePublicTabs();
  $("constructorVoteForm")?.addEventListener("submit", saveConstructorPredictionVote);
}

function teamTabs(team) {
  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "coche", label: "Coche" },
    { id: "pesos", label: "Pesos" }
  ];
  if (team?.isMotorist) tabs.push({ id: "motor", label: "Motor" });
  tabs.push(
    { id: "sedes", label: "Sedes" },
    { id: "snapshots", label: "Snapshots" },
    { id: "movimientos", label: "Movimientos" }
  );
  return tabs;
}

function renderTeamTabs(team) {
  const tabs = teamTabs(team);
  if (!tabs.some((tab) => tab.id === currentTeamTab)) {
    currentTeamTab = "resumen";
  }

  return `
    <div class="team-tabs" role="tablist" aria-label="Secciones de equipo">
      ${tabs.map((tab) => `
        <button
          class="team-tab ${tab.id === currentTeamTab ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.id === currentTeamTab ? "true" : "false"}"
          data-team-tab="${html(tab.id)}"
        >${html(tab.label)}</button>
      `).join("")}
    </div>
  `;
}

function wireTeamViewTabs() {
  document.querySelectorAll("[data-team-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentTeamTab = button.dataset.teamTab || "resumen";
      document.querySelectorAll("[data-team-tab]").forEach((tabButton) => {
        const active = tabButton.dataset.teamTab === currentTeamTab;
        tabButton.classList.toggle("active", active);
        tabButton.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll("[data-team-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.teamPanel !== currentTeamTab);
      });
    });
  });

  document.querySelectorAll("[data-team-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.teamPanel !== currentTeamTab);
  });
}

function renderTeam() {
  if (!currentUser) {
    els.teamView.innerHTML = `<div class="card narrow"><h2>Login requerido</h2><p class="muted">Entra con la cuenta del equipo.</p></div>`;
    return;
  }

  if (!currentProfile?.teamId) {
    els.teamView.innerHTML = `
      <div class="card narrow">
        <h2>Cuenta sin perfil</h2>
        <p class="muted">Tu usuario existe en Firebase, pero el admin todavia no lo vinculo a un equipo.</p>
        <p class="muted">UID: <code>${html(currentUser.uid)}</code></p>
      </div>
    `;
    return;
  }

  const team = cache.teamMap.get(currentProfile.teamId);
  const season = cache.season || window.LFM_SEED.season;
  const movements = cache.movements;
  const dev = developmentSummary(currentProfile.teamId);
  const motorLimit = team?.isMotorist ? motorSummary(team.id) : null;

  if (!team) {
    els.teamView.innerHTML = `
      <div class="card narrow">
        <h2>Falta cargar el equipo</h2>
        <p class="muted">Tu perfil esta vinculado a <code>${html(currentProfile.teamId)}</code>, pero no existe ese equipo en <code>lfm_teams</code>.</p>
        <p class="muted">Entra como admin y toca <strong>Inicializar / actualizar T7</strong>. Si ya lo hiciste, revisa que el documento del equipo exista con ese mismo ID.</p>
      </div>
    `;
    return;
  }

  els.teamView.innerHTML = `
    ${renderTeamTabs(team)}

    <section class="grid two" data-team-panel="resumen">
      <article class="card">
        <div class="card-header">
          <h2>${html(team.name)}</h2>
          <span class="pill">${team.isMotorist ? "Equipo motorista" : "Equipo cliente"}</span>
        </div>
        <div class="metrics">
          <div><span>Presupuesto restante</span><strong>${moneyM(team.budgetRemainingM)}</strong></div>
          <div><span>Limite desarrollo</span><strong>${moneyM(season.developmentLimitM)}</strong></div>
          <div><span>Motorista</span><strong>${team.isMotorist ? "Propio" : html(teamName(team.motoristId))}</strong></div>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Accesos privados</h3>
          <span class="pill muted-pill">MVP</span>
        </div>
        <div class="list compact">
          <div class="list-row"><strong>Coche</strong><span>disponible</span></div>
          <div class="list-row"><strong>Pesos</strong><span>disponible</span></div>
          <div class="list-row"><strong>Sedes</strong><span>disponible</span></div>
          ${team.isMotorist ? `<div class="list-row"><strong>Motores</strong><span>disponible</span></div>` : ""}
        </div>
      </article>
    </section>

    <article class="card" data-team-panel="resumen">
      <div class="card-header">
        <h3>Limite desarrollo coche</h3>
        <span class="pill ${dev.status === "over" ? "danger-pill" : dev.status === "warn" ? "warn-pill" : ""}">${html(dev.percent)}%</span>
      </div>
      ${renderDevelopmentLimit(dev)}
    </article>

    ${team.isMotorist ? `
      <article class="card" data-team-panel="resumen">
        <div class="card-header">
          <h3>Limite motor</h3>
          <span class="pill ${motorLimit.status === "over" ? "danger-pill" : motorLimit.status === "warn" ? "warn-pill" : ""}">${html(motorLimit.percent)}%</span>
        </div>
        ${renderDevelopmentLimit(motorLimit)}
      </article>
    ` : ""}

    <article class="card" data-team-panel="coche">
      <div class="card-header">
        <h3>Mi coche</h3>
        <span class="pill">Privado</span>
      </div>
      ${renderTeamCar(team.id)}
    </article>

    <article class="card" data-team-panel="pesos">
      <div class="card-header">
        <h3>Mis pesos</h3>
        <span class="pill">Ultima version aplicada</span>
      </div>
      ${renderTeamWeights(team.id)}
    </article>

    ${team.isMotorist ? `
      <article class="card" data-team-panel="motor">
        <div class="card-header">
          <h3>Mi motor</h3>
          <span class="pill">Privado motorista</span>
        </div>
        ${renderTeamEngine(team)}
      </article>
    ` : ""}

    <article class="card" data-team-panel="snapshots">
      <div class="card-header">
        <h3>Snapshots de carrera</h3>
        <span class="pill">Privado</span>
      </div>
      ${renderCarSnapshots(team.id)}
    </article>

    <article class="card" data-team-panel="sedes">
      <div class="card-header">
        <h3>Mis sedes</h3>
        <span class="pill">${html(season.name || activeSeasonId().toUpperCase())}</span>
      </div>
      ${renderHeadquartersDetails(team.id)}
    </article>

    <article class="card" data-team-panel="movimientos">
      <div class="card-header">
        <h3>Mis movimientos economicos</h3>
        <span class="pill">Privado</span>
      </div>
      ${renderMovementsTable(movements)}
    </article>
  `;

  wireTeamViewTabs();
  $("teamCarRequestForm")?.addEventListener("submit", saveTeamCarRequest);
  $("teamCarRequestMode")?.addEventListener("change", updateTeamCarRequestUpgradeOptions);
  $("teamCarRequestPiece")?.addEventListener("change", updateTeamCarRequestUpgradeOptions);
  document.querySelectorAll("[data-cancel-team-car-request]").forEach((button) => {
    button.addEventListener("click", cancelTeamCarRequest);
  });
  updateTeamCarRequestUpgradeOptions();
  $("teamCarForm")?.addEventListener("submit", saveTeamCarSelection);
  $("saveNextCarNameBtn")?.addEventListener("click", saveNextCarName);
  $("teamWeightRequestForm")?.addEventListener("submit", saveTeamWeightRequest);
  document.querySelectorAll("[data-cancel-team-weight-request]").forEach((button) => {
    button.addEventListener("click", cancelTeamWeightRequest);
  });
  $("teamEngineRequestForm")?.addEventListener("submit", saveTeamEngineRequest);
  document.querySelectorAll("[data-cancel-team-engine-request]").forEach((button) => {
    button.addEventListener("click", cancelTeamEngineRequest);
  });
  wireTeamCarTabs();
  wireTeamCarPreviewControls();
}

function adminTabs() {
  return [
    { id: "base", label: "Base" },
    { id: "carreras", label: "Carreras" },
    { id: "economia", label: "Economia" },
    { id: "mercado", label: "Mercado" },
    { id: "coche", label: "Coche" },
    { id: "motor", label: "Motor" },
    { id: "pesos", label: "Pesos" },
    { id: "temporada", label: "Temporada" }
  ];
}

function renderAdminTabs() {
  const tabs = adminTabs();
  if (!tabs.some((tab) => tab.id === currentAdminTab)) {
    currentAdminTab = "base";
  }

  return `
    <div class="admin-tabs" role="tablist" aria-label="Secciones admin">
      ${tabs.map((tab) => `
        <button
          class="admin-tab ${tab.id === currentAdminTab ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.id === currentAdminTab ? "true" : "false"}"
          data-admin-tab="${html(tab.id)}"
        >${html(tab.label)}</button>
      `).join("")}
    </div>
  `;
}

function wireAdminTabs() {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentAdminTab = button.dataset.adminTab || "base";
      document.querySelectorAll("[data-admin-tab]").forEach((tabButton) => {
        const active = tabButton.dataset.adminTab === currentAdminTab;
        tabButton.classList.toggle("active", active);
        tabButton.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.adminPanel !== currentAdminTab);
      });
    });
  });

  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminPanel !== currentAdminTab);
  });
}

function renderSeasonOptions(selectedId = activeSeasonId()) {
  const seasons = cache.seasons.length
    ? cache.seasons
    : [cache.season || window.LFM_SEED.season].filter(Boolean);
  return seasons.map((season) => `
    <option value="${html(season.id)}" ${season.id === selectedId ? "selected" : ""}>
      ${html(season.name || `Temporada ${season.number || season.id}`)}
    </option>
  `).join("");
}

function renderSeasonReadiness(season) {
  const calendar = racesList();
  const awards = awardSettings();
  const regulation = currentRegulation();
  const pointSystem = currentConstructorPointSystem();
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
  const raceAwards = awards.racePositionM.filter((value) => value > 0).length;
  const sprintAwards = awards.sprintPositionM.filter((value) => value > 0).length;
  const racePoints = pointSystem.race.filter((value) => value > 0).length;
  const sprintPoints = pointSystem.sprint.filter((value) => value > 0).length;
  const items = [
    {
      label: "Temporada activa",
      detail: `${season?.name || activeSeasonId().toUpperCase()} - ${statusText(season?.status || "pretemporada")}`,
      ok: Boolean(season)
    },
    {
      label: "Calendario base",
      detail: `${calendar.length} GPs, ${calendar.filter((race) => race.hasSprint).length} sprint`,
      ok: calendar.length > 0
    },
    {
      label: "Premios",
      detail: `${raceAwards}/20 carrera, ${sprintAwards}/8 sprint`,
      ok: Boolean(cache.awardSettings)
    },
    {
      label: "Reglamento",
      detail: `${regulation.sections.length} secciones`,
      ok: regulation.sections.length > 0
    },
    {
      label: "Puntos constructores",
      detail: `${racePoints} posiciones carrera, ${sprintPoints} sprint, VR ${pointSystem.fastestLapRace}/${pointSystem.fastestLapSprint}`,
      ok: racePoints > 0
    },
    {
      label: "Equipos",
      detail: `${teams.length} equipos cargados`,
      ok: teams.length > 0
    }
  ];

  return `
    <div class="season-readiness">
      ${items.map((item) => `
        <div class="${item.ok ? "ready" : "warn"}">
          <span>${html(item.label)}</span>
          <strong>${html(item.detail)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSeasonRolloverPlan() {
  const currentName = cache.season?.name || activeSeasonId().toUpperCase();
  return `
    <div class="season-rollover-plan">
      <div>
        <h4>Se copia desde ${html(currentName)}</h4>
        <p>Calendario, reglamento, premios, sistema de puntos de constructores y tabla de puntos de motoristas.</p>
      </div>
      <div>
        <h4>Empieza vacio</h4>
        <p>Resultados importados, campeonatos, predicciones y carreras completadas.</p>
      </div>
      <div>
        <h4>Sigue por equipo</h4>
        <p>Coche, motor, pesos, sedes, personal y movimientos privados no se borran al crear temporada.</p>
      </div>
    </div>
  `;
}

function renderTrackOptions(selectedId = "") {
  return trackCatalog().map((track) => `
    <option value="${html(track.id)}" ${track.id === selectedId ? "selected" : ""}>
      ${html(track.gp)} - ${html(track.circuit)}
    </option>
  `).join("");
}

function renderNewSeasonCalendarBuilder() {
  const sourceCalendar = cache.calendar.length ? cache.calendar : window.LFM_SEED.calendar || [];
  const catalog = trackCatalog();
  if (!catalog.length) {
    return `<div id="newSeasonCalendarBuilder" class="empty hidden">No hay catalogo de circuitos cargado.</div>`;
  }

  const usedTrackIds = new Set(sourceCalendar.map(trackIdForRace).filter(Boolean));
  let nextUnusedIndex = 0;
  const nextUnusedTrack = () => {
    while (nextUnusedIndex < catalog.length && usedTrackIds.has(catalog[nextUnusedIndex].id)) {
      nextUnusedIndex += 1;
    }
    const track = catalog[nextUnusedIndex] || catalog[0];
    if (track) {
      usedTrackIds.add(track.id);
      nextUnusedIndex += 1;
    }
    return track;
  };

  return `
    <div id="newSeasonCalendarBuilder" class="new-season-calendar-builder hidden">
      <div class="calendar-builder-head">
        <div>
          <h4>Calendario personalizado F1 Manager 2024</h4>
          <p class="muted">Activa las rondas que quieras usar. El orden final se genera de arriba hacia abajo y todas empiezan pendientes.</p>
        </div>
        <span class="pill">${html(catalog.length)} circuitos</span>
      </div>
      <div class="table-wrap calendar-builder-table">
        <table>
          <thead>
            <tr><th>Usar</th><th>Slot</th><th>Circuito</th><th>Sprint</th></tr>
          </thead>
          <tbody>
            ${catalog.map((fallbackTrack, index) => {
              const sourceRace = sourceCalendar[index] || null;
              const suggestedTrack = sourceRace ? trackById(trackIdForRace(sourceRace)) || fallbackTrack : nextUnusedTrack() || fallbackTrack;
              const selectedId = suggestedTrack.id;
              const enabled = Boolean(sourceRace);
              return `
                <tr data-new-season-calendar-row>
                  <td>
                    <input data-new-season-calendar-enabled type="checkbox" ${enabled ? "checked" : ""} />
                  </td>
                  <td>R${index + 1}</td>
                  <td>
                    <select data-new-season-calendar-track>
                      ${renderTrackOptions(selectedId)}
                    </select>
                  </td>
                  <td>
                    <input data-new-season-calendar-sprint type="checkbox" ${sourceRace?.hasSprint ? "checked" : ""} />
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSeasonCalendarEditor() {
  const sourceCalendar = racesList();
  const catalog = trackCatalog();
  if (!catalog.length) {
    return `<div class="empty">No hay catalogo de circuitos cargado.</div>`;
  }

  const usedTrackIds = new Set(sourceCalendar.map(trackIdForRace).filter(Boolean));
  let nextUnusedIndex = 0;
  const nextUnusedTrack = () => {
    while (nextUnusedIndex < catalog.length && usedTrackIds.has(catalog[nextUnusedIndex].id)) {
      nextUnusedIndex += 1;
    }
    const track = catalog[nextUnusedIndex] || catalog[0];
    if (track) {
      usedTrackIds.add(track.id);
      nextUnusedIndex += 1;
    }
    return track;
  };

  return `
    <form id="seasonCalendarForm" class="form season-calendar-editor">
      <p class="muted">Edita el calendario de la temporada activa. El orden final se genera de arriba hacia abajo y los IDs quedan como ${html(activeSeasonId())}-r01, r02...</p>
      <div class="table-wrap calendar-builder-table">
        <table>
          <thead>
            <tr><th>Usar</th><th>Slot</th><th>Circuito</th><th>Sprint</th><th>Completada</th></tr>
          </thead>
          <tbody>
            ${catalog.map((fallbackTrack, index) => {
              const sourceRace = sourceCalendar[index] || null;
              const suggestedTrack = sourceRace ? trackById(trackIdForRace(sourceRace)) || fallbackTrack : nextUnusedTrack() || fallbackTrack;
              const selectedId = suggestedTrack.id;
              const enabled = Boolean(sourceRace);
              return `
                <tr data-season-calendar-row>
                  <td>
                    <input data-season-calendar-enabled type="checkbox" ${enabled ? "checked" : ""} />
                  </td>
                  <td>R${index + 1}</td>
                  <td>
                    <select data-season-calendar-track>
                      ${renderTrackOptions(selectedId)}
                    </select>
                  </td>
                  <td>
                    <input data-season-calendar-sprint type="checkbox" ${sourceRace?.hasSprint ? "checked" : ""} />
                  </td>
                  <td>
                    <input data-season-calendar-completed type="checkbox" ${sourceRace?.completed ? "checked" : ""} />
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <button type="submit" class="ghost">Guardar calendario activo</button>
      <p id="seasonCalendarMessage" class="message"></p>
    </form>
  `;
}

function renderSeasonSwitchAdmin(season) {
  const currentNumber = Number(season?.number || window.LFM_SEED.season?.number || 7);
  return `
    <section class="season-switch-admin">
      <h3 class="section-title">Cambio de temporada</h3>
      ${renderSeasonReadiness(season)}
      ${renderSeasonRolloverPlan()}
      <form id="activeSeasonForm" class="form compact-form">
        <label>Temporada activa
          <select id="activeSeasonSelect">
            ${renderSeasonOptions(activeSeasonId())}
          </select>
        </label>
        <button type="submit" class="ghost">Activar temporada</button>
        <p id="activeSeasonMessage" class="message"></p>
      </form>

      <form id="newSeasonForm" class="form">
        <p class="muted">Crea una temporada limpia copiando reglamento, premios y sistemas de puntos actuales. Resultados, predicciones y campeonatos empiezan vacios.</p>
        <section class="grid two flat-grid">
          <label>Numero
            <input id="newSeasonNumber" type="number" min="1" step="1" value="${html(currentNumber + 1)}" required />
          </label>
          <label>Nombre
            <input id="newSeasonName" value="Temporada ${html(currentNumber + 1)}" required />
          </label>
          <label>Limite desarrollo coche en M
            <input id="newSeasonDevelopmentLimit" type="number" min="0" step="0.001" value="${html(season?.developmentLimitM || 0)}" required />
          </label>
          <label>Limite motor en M
            <input id="newSeasonMotorLimit" type="number" min="0" step="0.001" value="${html(season?.motorLimitM || 0)}" required />
          </label>
          <label>Limite motor por GP en M
            <input id="newSeasonMotorRaceLimit" type="number" min="0" step="0.001" value="${html(season?.motorRaceLimitM ?? 6)}" required />
          </label>
        </section>
        <label>Calendario
          <select id="newSeasonCalendarMode">
            <option value="copy-current">Copiar GPs y sprints actuales, todo pendiente</option>
            <option value="copy-template">Copiar calendario base T7, todo pendiente</option>
            <option value="custom-2024">Personalizado con 24 circuitos F1 Manager 2024</option>
          </select>
        </label>
        ${renderNewSeasonCalendarBuilder()}
        <label class="check-row">
          <input id="newSeasonActivate" type="checkbox" checked />
          Activar al crear
        </label>
        <button type="submit">Crear temporada</button>
        <p id="newSeasonMessage" class="message"></p>
      </form>
    </section>
  `;
}

function updateNewSeasonCalendarBuilderVisibility() {
  const builder = $("newSeasonCalendarBuilder");
  const mode = $("newSeasonCalendarMode")?.value || "";
  if (builder) builder.classList.toggle("hidden", mode !== "custom-2024");
}

function renderMoneyImportPreview() {
  const preview = cache.pendingMoneyImport;
  if (!preview) return "";

  const diffClass = (value) => value > 0 ? "positive" : value < 0 ? "negative" : "";
  return `
    <div class="form-divider"></div>
    <div class="section-head compact-head">
      <div>
        <h3>Preview de importacion</h3>
        <p class="muted">Archivo: ${html(preview.fileName)}. ID: <code>${html(preview.importId)}</code></p>
      </div>
      <span class="pill ${preview.alreadyApplied ? "danger-pill" : ""}">${preview.alreadyApplied ? "Ya importado" : `${preview.teamCount} equipos`}</span>
    </div>
    <div class="list compact">
      <div class="list-row"><strong>Saldo final importado</strong><span>${moneyM(preview.totalTargetM)}</span></div>
      <div class="list-row"><strong>Diferencia total</strong><span class="${diffClass(preview.totalDeltaM)}">${signedMoneyM(preview.totalDeltaM)}</span></div>
      <div class="list-row"><strong>Equipos con cambio</strong><span>${preview.changedCount}</span></div>
      ${preview.sourceSeasonId ? `<div class="list-row"><strong>Temporada origen</strong><span>${html(preview.sourceSeasonId)}</span></div>` : ""}
      ${preview.sourceMarketId ? `<div class="list-row"><strong>Mercado origen</strong><span>${html(preview.sourceMarketId)}</span></div>` : ""}
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Actual</th>
            <th>Importado</th>
            <th>Diferencia</th>
            <th>Gastado</th>
            <th>Comprometido</th>
          </tr>
        </thead>
        <tbody>
          ${preview.rows.map((row) => `
            <tr>
              <td>
                <strong>${html(row.teamName)}</strong>
                ${row.sourceName && normalizeKey(row.sourceName) !== normalizeKey(row.teamName) ? `<br><small>${html(row.sourceName)}</small>` : ""}
              </td>
              <td>${moneyM(row.currentM)}</td>
              <td>${moneyM(row.targetM)}</td>
              <td class="${diffClass(row.deltaM)}">${signedMoneyM(row.deltaM)}</td>
              <td>${moneyM(row.spentM)}</td>
              <td>${moneyM(row.committedM)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${preview.alreadyApplied ? `<p class="warning-text">Este archivo/mercado ya figura como importado en la temporada activa.</p>` : ""}
    <button id="moneyImportApplyBtn" type="button" ${preview.alreadyApplied ? "disabled" : ""}>Aplicar importacion</button>
  `;
}

function renderAdmin() {
  if (!isAdmin()) {
    els.adminView.innerHTML = `<div class="card narrow"><h2>Acceso admin requerido</h2></div>`;
    return;
  }

  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams;
  const season = cache.season || window.LFM_SEED.season;
  const profileAudit = buildProfileAudit(teams, cache.profiles);
  els.adminView.innerHTML = `
    ${renderAdminTabs()}

    <section class="grid" data-admin-panel="base">
      <article class="card">
        <div class="card-header">
          <h2>Base ${html(season.name || activeSeasonId().toUpperCase())}</h2>
          <span class="pill">Admin</span>
        </div>
        <p class="muted">Inicializa temporada, equipos, costes y relaciones de motoristas. Usa colecciones <code>lfm_</code>.</p>
        <button id="seedBtn">Inicializar / actualizar T7</button>
        <p id="seedMessage" class="message"></p>
      </article>
    </section>

    <section class="grid" data-admin-panel="base">
      <article class="card">
        <div class="card-header">
          <h3>Vincular usuario</h3>
        </div>
        <form id="profileForm" class="form">
          <label>UID Firebase<input id="profileUid" required /></label>
          <label>Email<input id="profileEmail" type="email" required /></label>
          <label>Rol
            <select id="profileRole">
              <option value="manager">Manager de equipo</option>
              <option value="predictor">Votante predicciones</option>
            </select>
          </label>
          <label>Nombre publico<input id="profileDisplayName" placeholder="Opcional para managers, requerido para votantes" /></label>
          <label>Equipo
            <select id="profileTeam">
              <option value="">Sin equipo</option>
              ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <button type="submit">Guardar perfil</button>
        </form>
        <p id="profileMessage" class="message"></p>
      </article>
    </section>

    <article class="card" data-admin-panel="temporada">
      <div class="card-header">
        <h3>Temporada activa</h3>
        <span class="pill">${html(season.name || activeSeasonId().toUpperCase())}</span>
      </div>
      ${renderSeasonSwitchAdmin(season)}

      <div class="form-divider"></div>
      <h3 class="section-title">Ajustes de temporada</h3>
      <form id="seasonForm" class="form">
        <label>Estado
          <select id="seasonStatus">
            <option value="pretemporada" ${season.status === "pretemporada" ? "selected" : ""}>Pretemporada</option>
            <option value="en_curso" ${season.status === "en_curso" ? "selected" : ""}>En curso</option>
            <option value="finalizada" ${season.status === "finalizada" ? "selected" : ""}>Finalizada</option>
          </select>
        </label>
        <label>Carreras completadas<input id="seasonCompletedRaces" type="number" min="0" step="1" value="${html(season.completedRaces || 0)}" required /></label>
        <label>Limite desarrollo coche en M<input id="seasonDevelopmentLimit" type="number" min="0" step="0.001" value="${html(season.developmentLimitM || 0)}" required /></label>
        <label>Limite motor en M<input id="seasonMotorLimit" type="number" min="0" step="0.001" value="${html(season.motorLimitM || 0)}" required /></label>
        <button type="submit">Guardar ajustes</button>
      </form>
      <p id="seasonMessage" class="message"></p>
    </article>

    <article class="card" data-admin-panel="temporada">
      <div class="card-header">
        <h3>Calendario cargado</h3>
        <span class="pill">${cache.calendar.length || window.LFM_SEED.calendar.length} rondas</span>
      </div>
      ${renderCalendar()}
      <div class="form-divider"></div>
      <h3 class="section-title">Editar calendario activo</h3>
      ${renderSeasonCalendarEditor()}
    </article>

    <article class="card" data-admin-panel="carreras">
      <div class="card-header">
        <h3>Plazos de coche del GP</h3>
        <span class="pill ${isAnyCarWindowOpen() ? "done-pill" : ""}">${html(currentCarWindowStatusText())}</span>
      </div>
      ${renderRaceWindowAdmin()}
    </article>

    <article class="card" data-admin-panel="carreras">
      <div class="card-header">
        <h3>Carreras y premios</h3>
        <span class="pill">Preview antes de aplicar</span>
      </div>
      ${renderRaceAwardsAdmin(teams)}
    </article>

    <article class="card" data-admin-panel="carreras">
      <div class="card-header">
        <h3>Historial de resultados</h3>
        <span class="pill">Desde JSONs</span>
      </div>
      ${renderAdminResults()}
    </article>

    <article class="card" data-admin-panel="carreras">
      <div class="card-header">
        <h3>Campeonato constructores</h3>
        <span class="pill">Actualiza predicciones</span>
      </div>
      ${renderConstructorChampionshipAdmin(teams)}
    </article>

    <article class="card" data-admin-panel="carreras">
      <div class="card-header">
        <h3>Campeonato pilotos</h3>
        <span class="pill">Desde JSONs</span>
      </div>
      ${renderDriverChampionship(true)}
    </article>

    <article class="card" data-admin-panel="carreras">
      <div class="card-header">
        <h3>Campeonato motoristas</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderMotoristChampionshipAdmin()}
    </article>

    <article class="card" data-admin-panel="mercado">
      <div class="card-header">
        <h3>Personal y plantillas</h3>
        <span class="pill">Manual hasta conectar pujas</span>
      </div>
      ${renderPersonnelAdmin(teams)}
    </article>

    <article class="card" data-admin-panel="temporada">
      <div class="card-header">
        <h3>Predicciones constructores</h3>
        <span class="pill">Publico en lectura</span>
      </div>
      ${renderConstructorPredictionsAdmin(teams)}
    </article>

    <article class="card" data-admin-panel="temporada">
      <div class="card-header">
        <h3>Reglamento editable</h3>
        <span class="pill">Publico</span>
      </div>
      ${renderRegulationAdmin()}
    </article>

    <article class="card" data-admin-panel="economia">
      <div class="card-header">
        <h3>Exportar dinero para pujas</h3>
        <span class="pill">JSON</span>
      </div>
      <p class="muted">Incluye temporada, equipos, aliases, motoristas y presupuesto restante en millones y escala base.</p>
      <div class="list compact">
        <div class="list-row"><strong>Equipos</strong><span>${teams.length}</span></div>
        <div class="list-row"><strong>Temporada</strong><span>${html(activeSeasonId().toUpperCase())}</span></div>
        <div class="list-row"><strong>Campos clave</strong><span><code>teamId</code>, <code>budgetRemainingM</code>, <code>budgetRemaining</code></span></div>
      </div>
      <button id="moneyExportBtn" type="button">Exportar dinero JSON</button>
      <p id="moneyExportMessage" class="message"></p>
      <div class="form-divider"></div>
      <form id="moneyImportForm" class="form import-box">
        <h3 class="section-title">Importar dinero desde pujas</h3>
        <p class="muted">Sube el JSON final de la app de pujas para revisar diferencias antes de aplicar los saldos oficiales.</p>
        <label>JSON de dinero
          <input id="moneyImportFile" type="file" accept=".json,application/json" required />
        </label>
        <button type="submit" class="ghost">Previsualizar dinero</button>
      </form>
      <p id="moneyImportMessage" class="message"></p>
      ${renderMoneyImportPreview()}
    </article>

    <article class="card" data-admin-panel="economia">
      <div class="card-header">
        <h3>Limites de desarrollo</h3>
        <span class="pill">${moneyM(season.developmentLimitM)} por equipo</span>
      </div>
      ${renderDevelopmentAdminTable(teams)}
    </article>

    <article class="card" data-admin-panel="economia">
      <div class="card-header">
        <h3>Limites de motor</h3>
        <span class="pill">${moneyM(season.motorLimitM)} por motorista</span>
      </div>
      ${renderMotorLimitAdminTable(teams)}
    </article>

    <section class="grid two" data-admin-panel="motor">
      <article class="card">
        <div class="card-header">
          <h3>Solicitudes de motor</h3>
          <span class="pill">Mejoras GP</span>
        </div>
        ${renderAdminEngineRequests(teams)}
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Limite motor por GP</h3>
          <span class="pill">${moneyM(engineRaceLimitM())}</span>
        </div>
        ${renderEngineRaceLimitAdmin(teams)}
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Registrar motor</h3>
          <span class="pill">Admin</span>
        </div>
        <form id="engineRunForm" class="form">
          <label>Motorista
            <select id="engineRunTeam">
              ${motoristTeams().map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Stat
            <select id="engineRunStat">
              ${engineStats().map((stat) => `<option value="${html(stat.id)}">${html(stat.name)}</option>`).join("")}
            </select>
          </label>
          <label>Modo
            <select id="engineRunMode">
              ${engineModes().map((mode) => `<option value="${html(mode.id)}" ${mode.id === "normal" ? "selected" : ""}>${html(mode.name)}</option>`).join("")}
            </select>
          </label>
          <label>Intentos<input id="engineRunCount" type="number" min="1" max="20" step="1" value="1" required /></label>
          <div id="engineRunPreview" class="stats-editor"></div>
          <label class="check-row"><input id="engineRunCharge" type="checkbox" checked /> Cobrar automaticamente (${moneyM(window.LFM_SEED.costs.motorRunM || 1)} por intento)</label>
          <button type="submit">Registrar intentos</button>
        </form>

        <div class="form-divider"></div>
        <h3 class="section-title">Ajuste manual</h3>
        <form id="engineManualForm" class="form">
          <label>Motorista
            <select id="engineManualTeam">
              ${motoristTeams().map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Stat
            <select id="engineManualStat">
              ${engineStats().map((stat) => `<option value="${html(stat.id)}">${html(stat.name)}</option>`).join("")}
            </select>
          </label>
          <label>Valor<input id="engineManualValue" type="number" step="0.01" required /></label>
          <label>Nota<input id="engineManualNote" placeholder="Correccion manual, importacion..." /></label>
          <button type="submit" class="ghost">Fijar valor</button>
        </form>
        <p id="engineMessage" class="message"></p>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Motores cargados</h3>
          <span class="pill">Privado admin</span>
        </div>
        <form id="legacyEngineImportForm" class="form import-box">
          <label>Importar JSON de motores
            <input id="legacyEngineFile" type="file" accept=".json,application/json" required />
          </label>
          <button type="submit" class="ghost">Preparar asignacion</button>
        </form>
        ${renderPendingEngineImport(teams)}
        <p id="legacyEngineImportMessage" class="message"></p>
        ${renderAdminEnginesOverview(teams)}
      </article>
    </section>

    <article class="card" data-admin-panel="motor">
      <div class="card-header">
        <h3>Pago cliente a motorista</h3>
        <span class="pill">Transferencia privada</span>
      </div>
      <form id="enginePaymentForm" class="form">
        <label>Cliente
          <select id="enginePaymentClient">
            ${clientTeams().map((team) => `<option value="${html(team.id)}">${html(team.name)} -> ${html(teamName(team.motoristId))}</option>`).join("")}
          </select>
        </label>
        <label>Monto en M<input id="enginePaymentAmount" type="number" min="0.001" step="0.001" required /></label>
        <label>Concepto<input id="enginePaymentConcept" placeholder="Pago acuerdo motor" required /></label>
        <button type="submit">Registrar pago</button>
      </form>
      <p id="enginePaymentMessage" class="message"></p>
    </article>

    ${renderAdminCar(teams)}

    <section class="grid two" data-admin-panel="pesos">
      <article class="card">
        <div class="card-header">
          <h3>Solicitudes de peso</h3>
          <span class="pill">Mejoras GP</span>
        </div>
        ${renderAdminWeightRequests(teams)}
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Registrar peso</h3>
          <span class="pill">Admin</span>
        </div>
        <form id="weightRunForm" class="form">
          <label>Equipo
            <select id="weightRunTeam">
              ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Pieza
            <select id="weightRunPiece">
              ${weightPieces().map((piece) => `<option value="${html(piece.id)}">${html(piece.name)}</option>`).join("")}
            </select>
          </label>
          <label>Tiradas
            <select id="weightRunCount">
              <option value="1">1 tirada - ${moneyM(weightRunCostM(1))}</option>
              <option value="2">2 tiradas - ${moneyM(weightRunCostM(2))}</option>
              <option value="3">3 tiradas - ${moneyM(weightRunCostM(3))}</option>
            </select>
          </label>
          <label class="check-row"><input id="weightRunCharge" type="checkbox" checked /> Cobrar automaticamente al presupuesto</label>
          <button type="submit">Registrar tiradas</button>
        </form>

        <div class="form-divider"></div>
        <h3 class="section-title">Fijar nivel manual</h3>
        <form id="weightManualForm" class="form">
          <label>Equipo
            <select id="weightManualTeam">
              ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Pieza
            <select id="weightManualPiece">
              ${weightPieces().map((piece) => `<option value="${html(piece.id)}">${html(piece.name)}</option>`).join("")}
            </select>
          </label>
          <label>Nivel
            <select id="weightManualLevel">
              ${Array.from({ length: 11 }, (_, index) => `<option value="${index}">${index}</option>`).join("")}
            </select>
          </label>
          <label>Nota<input id="weightManualNote" placeholder="Correccion manual, carga inicial..." /></label>
          <button type="submit" class="ghost">Fijar nivel</button>
        </form>
        <p id="weightMessage" class="message"></p>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Pesos cargados</h3>
          <span class="pill">Privado admin</span>
        </div>
        <form id="legacyWeightImportForm" class="form import-box">
          <label>Importar JSON de pesos
            <input id="legacyWeightFile" type="file" accept=".json,application/json" required />
          </label>
          <button type="submit" class="ghost">Importar pesos actuales</button>
        </form>
        <p id="legacyWeightImportMessage" class="message"></p>
        ${renderAdminWeightsOverview(teams)}
      </article>
    </section>

    <section class="grid two" data-admin-panel="economia">
      <article class="card">
        <div class="card-header">
          <h3>Registrar movimiento economico</h3>
        </div>
        <form id="movementForm" class="form">
          <label>Equipo
            <select id="movementTeam">
              ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Categoria
            <select id="movementCategory">
              <option value="premio">Premio</option>
              <option value="coche">Coche / desarrollo</option>
              <option value="motor">Motor</option>
              <option value="peso">Peso</option>
              <option value="personal">Personal / pujas</option>
              <option value="sede">Sede</option>
              <option value="sancion">Sancion</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label>Monto en M<input id="movementAmount" type="number" step="0.001" placeholder="-2 o 5.5" required /></label>
          <label>Concepto<input id="movementConcept" placeholder="Premio GP, diseno chasis..." required /></label>
          <button type="submit">Registrar movimiento</button>
        </form>
        <p id="movementMessage" class="message"></p>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Equipos cargados</h3>
          <span class="pill">${teams.length}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Equipo</th><th>Presupuesto</th><th>Motor</th></tr></thead>
            <tbody>
              ${teams.map((team) => `
                <tr>
                  <td>${html(team.name)}</td>
                  <td>${moneyM(team.budgetRemainingM)}</td>
                  <td>${team.isMotorist ? `Clientes: ${html((team.motorClients || []).map(teamName).join(", "))}` : `Cliente de ${html(teamName(team.motoristId))}`}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="grid two" data-admin-panel="temporada">
      <article class="card">
        <div class="card-header">
          <h3>Editar sede</h3>
          <span class="pill">Admin</span>
        </div>
        <form id="headquartersForm" class="form">
          <label>Equipo
            <select id="headquartersTeam">
              ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Instalacion
            <select id="headquartersFacility">
              ${facilities().map((facility) => `<option value="${html(facility.id)}">${html(facility.name)}</option>`).join("")}
            </select>
          </label>
          <label>Nivel
            <select id="headquartersLevel">
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </label>
          <button type="submit">Guardar nivel</button>
        </form>
        <p id="headquartersMessage" class="message"></p>
      </article>

      <article class="card">
        <div class="card-header">
          <h3>Sedes cargadas</h3>
          <span class="pill">${facilities().length} instalaciones</span>
        </div>
        ${renderHeadquartersTable(teams)}
      </article>
    </section>

    <article class="card" data-admin-panel="base">
      <div class="card-header">
        <h3>Usuarios vinculados</h3>
        <span class="pill ${profileAudit.ok ? "" : "warn-pill"}">${profileAudit.linkedCount}/${teams.length}</span>
      </div>
      ${renderProfileAudit(profileAudit)}
    </article>
  `;

  wireAdminTabs();
  $("seedBtn").addEventListener("click", seedT7);
  $("activeSeasonForm")?.addEventListener("submit", saveActiveSeason);
  $("newSeasonForm")?.addEventListener("submit", createSeason);
  $("newSeasonCalendarMode")?.addEventListener("change", updateNewSeasonCalendarBuilderVisibility);
  updateNewSeasonCalendarBuilderVisibility();
  $("seasonForm").addEventListener("submit", saveSeasonSettings);
  $("seasonCalendarForm")?.addEventListener("submit", saveSeasonCalendar);
  $("profileForm").addEventListener("submit", saveProfile);
  $("movementForm").addEventListener("submit", saveMovement);
  $("moneyExportBtn")?.addEventListener("click", exportMoneyForBids);
  $("moneyImportForm")?.addEventListener("submit", importMoneyFromBids);
  $("moneyImportApplyBtn")?.addEventListener("click", applyMoneyImport);
  $("headquartersForm").addEventListener("submit", saveHeadquartersLevel);
  $("personnelForm")?.addEventListener("submit", savePersonnelEntry);
  $("staffImportForm")?.addEventListener("submit", importStaffRosters);
  document.querySelectorAll("[data-delete-personnel]").forEach((button) => {
    button.addEventListener("click", deletePersonnelEntry);
  });
  $("openDevelopmentWindowBtn")?.addEventListener("click", openDevelopmentWindow);
  $("closeDevelopmentWindowBtn")?.addEventListener("click", closeDevelopmentWindow);
  $("openSelectionWindowBtn")?.addEventListener("click", openSelectionWindow);
  $("closeRaceWindowBtn")?.addEventListener("click", closeRaceWindowAndApply);
  $("awardSettingsForm").addEventListener("submit", saveAwardSettings);
  $("raceAwardForm").addEventListener("submit", applyRaceAwards);
  $("awardPreviewBtn").addEventListener("click", updateRaceAwardPreview);
  document.querySelectorAll("[data-apply-json-awards]").forEach((button) => {
    button.addEventListener("click", applyJsonAwards);
  });
  document.querySelectorAll("[data-revert-json-awards]").forEach((button) => {
    button.addEventListener("click", revertJsonAwards);
  });
  $("regulationForm")?.addEventListener("submit", saveRegulation);
  $("motoristRace")?.addEventListener("change", updateMotoristRoundInputs);
  $("motoristJsonImportForm")?.addEventListener("submit", importMotoristRaceJson);
  $("motoristChampionshipForm")?.addEventListener("submit", saveMotoristChampionshipRound);
  $("constructorPointSystemForm")?.addEventListener("submit", saveConstructorPointSystem);
  $("constructorChampionshipForm")?.addEventListener("submit", saveConstructorChampionship);
  document.querySelectorAll("[data-constructor-json-import-form]").forEach((form) => {
    form.addEventListener("submit", importConstructorRaceJson);
  });
  document.querySelectorAll("[data-revert-constructor-import]").forEach((button) => {
    button.addEventListener("click", revertConstructorImport);
  });
  $("constructorPredictionSettingsForm")?.addEventListener("submit", saveConstructorPredictionSettings);
  document.querySelectorAll("[data-delete-constructor-prediction]").forEach((button) => {
    button.addEventListener("click", deleteConstructorPredictionEntry);
  });
  document.querySelectorAll("[data-award-control]").forEach((control) => {
    control.addEventListener("change", updateRaceAwardPreview);
    control.addEventListener("input", updateRaceAwardPreview);
  });
  wireAdminCarTabs();
  $("carDesignPiece")?.addEventListener("change", () => {
    renderCarDesignUpgradeOptions();
    renderCarDesignStatFields("design");
  });
  $("carDesignSteps")?.addEventListener("input", () => renderCarDesignStatFields("design"));
  $("carDesignForm")?.addEventListener("submit", saveCarDesign);
  $("carResearchPiece")?.addEventListener("change", () => {
    renderCarDesignStatFields("research");
  });
  $("carResearchSteps")?.addEventListener("input", () => renderCarDesignStatFields("research"));
  $("carResearchForm")?.addEventListener("submit", saveCarDesign);
  $("adminCarRequestTeamFilter")?.addEventListener("change", (event) => {
    currentAdminCarRequestTeamFilter = event.target.value;
    render();
  });
  document.querySelectorAll("[data-load-car-request]").forEach((button) => {
    button.addEventListener("click", loadCarRequestIntoForm);
  });
  document.querySelectorAll("[data-cancel-car-request]").forEach((button) => {
    button.addEventListener("click", cancelCarRequest);
  });
  $("legacyCarImportForm")?.addEventListener("submit", importLegacyCars);
  $("carTransitionForm")?.addEventListener("submit", saveCarTransitionSettings);
  $("applyCarTransitionBtn")?.addEventListener("click", applyCarTransition);
  $("engineRunForm").addEventListener("submit", saveEngineRuns);
  $("engineManualForm").addEventListener("submit", saveEngineManualStat);
  $("legacyEngineImportForm").addEventListener("submit", prepareLegacyEngines);
  $("engineImportAssignForm")?.addEventListener("submit", saveLegacyEngineAssignments);
  $("enginePaymentForm").addEventListener("submit", saveEngineClientPayment);
  $("engineRaceLimitForm")?.addEventListener("submit", saveEngineRaceLimit);
  $("adminEngineRequestTeamFilter")?.addEventListener("change", (event) => {
    currentAdminEngineRequestTeamFilter = event.target.value;
    render();
  });
  document.querySelectorAll("[data-apply-engine-request]").forEach((button) => {
    button.addEventListener("click", applyEngineRequest);
  });
  document.querySelectorAll("[data-cancel-engine-request]").forEach((button) => {
    button.addEventListener("click", cancelEngineRequest);
  });
  $("engineRunTeam").addEventListener("change", renderEngineRunPreview);
  $("engineRunStat").addEventListener("change", renderEngineRunPreview);
  $("engineRunMode").addEventListener("change", renderEngineRunPreview);
  $("weightRunForm").addEventListener("submit", saveWeightRuns);
  $("weightManualForm").addEventListener("submit", saveWeightManualLevel);
  $("legacyWeightImportForm").addEventListener("submit", importLegacyWeights);
  $("adminWeightRequestTeamFilter")?.addEventListener("change", (event) => {
    currentAdminWeightRequestTeamFilter = event.target.value;
    render();
  });
  document.querySelectorAll("[data-apply-weight-request]").forEach((button) => {
    button.addEventListener("click", applyWeightRequest);
  });
  document.querySelectorAll("[data-cancel-weight-request]").forEach((button) => {
    button.addEventListener("click", cancelWeightRequest);
  });
  document.querySelectorAll("[data-apply-car-selection]").forEach((button) => {
    button.addEventListener("click", applyCarSelection);
  });
  renderCarDesignUpgradeOptions();
  renderCarDesignStatFields();
  renderEngineRunPreview();
}

function buildProfileAudit(teams, profiles) {
  const expected = teams.map((team) => team.id);
  const managerProfiles = profiles.filter((profile) => profile.role !== "predictor");
  const predictorProfiles = profiles.filter((profile) => profile.role === "predictor");
  const byTeam = new Map();
  managerProfiles.forEach((profile) => {
    const list = byTeam.get(profile.teamId) || [];
    list.push(profile);
    byTeam.set(profile.teamId, list);
  });

  const rows = expected.map((teamId) => {
    const linked = byTeam.get(teamId) || [];
    return {
      teamId,
      teamName: teamName(teamId),
      status: linked.length === 1 ? "OK" : linked.length === 0 ? "Falta" : "Duplicado",
      profiles: linked
    };
  });

  const unknown = managerProfiles.filter((profile) => !expected.includes(profile.teamId));
  return {
    rows,
    unknown,
    predictors: predictorProfiles,
    linkedCount: rows.filter((row) => row.status === "OK").length,
    ok: rows.every((row) => row.status === "OK") && unknown.length === 0
  };
}

function renderProfileAudit(audit) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Equipo</th><th>Estado</th><th>Email</th><th>UID</th></tr></thead>
        <tbody>
          ${audit.rows.map((row) => {
            const profile = row.profiles[0];
            return `
              <tr>
                <td>${html(row.teamName)}</td>
                <td class="${row.status === "OK" ? "positive" : "negative"}">${row.status}</td>
                <td>${html(row.profiles.map((item) => item.email || "-").join(", ") || "-")}</td>
                <td><code>${html(profile?.id || "-")}</code></td>
              </tr>
            `;
          }).join("")}
          ${audit.unknown.map((profile) => `
            <tr>
              <td>${html(profile.teamId || "-")}</td>
              <td class="negative">TeamId desconocido</td>
              <td>${html(profile.email || "-")}</td>
              <td><code>${html(profile.id)}</code></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${audit.predictors.length ? `
      <div class="form-divider"></div>
      <h4 class="subsection-title">Votantes de predicciones</h4>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>UID</th></tr></thead>
          <tbody>
            ${audit.predictors.map((profile) => `
              <tr>
                <td>${html(profile.displayName || "-")}</td>
                <td>${html(profile.email || "-")}</td>
                <td><code>${html(profile.id)}</code></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : ""}
    ${audit.ok ? `<p class="message success">Los 10 equipos estan vinculados correctamente.</p>` : `<p class="message error">Hay perfiles faltantes, duplicados o con teamId incorrecto.</p>`}
  `;
}

function renderLevelDots(level) {
  const n = Number(level || 0);
  return `
    <span class="level-dots" aria-label="Nivel ${n}">
      ${[0, 1, 2, 3, 4].map((index) => `<span class="dot ${index < n ? "active" : ""}"></span>`).join("")}
    </span>
  `;
}

function renderCalendar() {
  const races = cache.calendar.length ? cache.calendar : window.LFM_SEED.calendar || [];
  if (!races.length) {
    return `<div class="empty">Todavia no hay calendario cargado.</div>`;
  }

  return `
    <div class="calendar-grid">
      ${races.map((race) => `
        <div class="race-card ${race.completed ? "done" : ""}">
          <span>Ronda ${html(race.round)}</span>
          <strong>${html(race.gp)}</strong>
          <div>
            ${race.hasSprint ? `<span class="pill sprint-pill">Sprint</span>` : ""}
            ${race.completed ? `<span class="pill done-pill">Completada</span>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function resultSessions() {
  return racesList().flatMap((race) => [
    { race, kind: "race" },
    ...(race.hasSprint ? [{ race, kind: "sprint" }] : [])
  ]);
}

function resultSummaryMetrics() {
  const sessions = resultSessions();
  const completedSessions = sessions.filter(({ race }) => raceShouldHaveResult(race));
  const loadedSessions = sessions.filter(({ race, kind }) => resultImportsForRace(race, kind).length > 0);
  const pendingSessions = completedSessions.filter(({ race, kind }) => resultImportsForRace(race, kind).length === 0);
  const awardStates = constructorResultImports().map((item) => jsonAwardStatus(item).state);
  return {
    totalImports: constructorResultImports().length,
    loaded: loadedSessions.length,
    pending: pendingSessions.length,
    awardsPending: awardStates.filter((state) => state === "pending").length,
    awardsApplied: awardStates.filter((state) => state === "applied").length,
    awardsReverted: awardStates.filter((state) => state === "reverted").length
  };
}

function renderResultsSummary() {
  const metrics = resultSummaryMetrics();
  return `
    <div class="metrics results-metrics">
      <div>
        <span>JSONs cargados</span>
        <strong>${html(metrics.totalImports)}</strong>
      </div>
      <div>
        <span>Sesiones cargadas</span>
        <strong>${html(metrics.loaded)}</strong>
      </div>
      <div>
        <span>Pendientes</span>
        <strong>${html(metrics.pending)}</strong>
      </div>
      <div>
        <span>Premios pendientes</span>
        <strong>${html(metrics.awardsPending)}</strong>
      </div>
      <div>
        <span>Premios aplicados</span>
        <strong>${html(metrics.awardsApplied)}</strong>
      </div>
      <div>
        <span>Premios revertidos</span>
        <strong>${html(metrics.awardsReverted)}</strong>
      </div>
    </div>
  `;
}

function renderResultSessionCell(race, kind, admin = false) {
  if (kind === "sprint" && !race.hasSprint) {
    return `<span class="pill">No aplica</span>`;
  }

  const imports = resultImportsForRace(race, kind);
  const status = resultStatusText(race, kind);
  if (!imports.length) {
    return `<span class="pill ${status.className}">${html(status.label)}</span>`;
  }

  return imports.map((item) => {
    const pointsSummary = resultImportPointsSummary(item);
    const classificationSummary = resultImportClassificationSummary(item);
    const awardStatus = jsonAwardStatus(item);
    const cannotRevert = awardStatus.state === "applied";
    return `
      <div class="result-session-card">
        <div class="result-session-head">
          <span class="pill ${status.className}">${html(status.label)}</span>
          <span class="mini">${html(item.kindLabel || constructorImportKindLabel(item.kind))}</span>
        </div>
        <div class="result-session-head">
          <span class="pill ${awardStatus.className}">${html(awardStatus.label)}</span>
        </div>
        <strong>${html(item.trackName || race.gp || "-")}</strong>
        <span>${html(pointsSummary || "Sin puntos")}</span>
        ${classificationSummary ? `<small>${html(classificationSummary)}</small>` : ""}
        ${admin ? `
          <small>Archivo: ${html(item.fileName || "-")}</small>
          <small>Importado: ${html(formatDate(item.importedAtLabel))}</small>
          ${awardStatus.state === "applied" ? `<small class="warning-text">Para revertir el resultado, primero usa Admin > Premios > Revertir premios.</small>` : ""}
          <button
            type="button"
            class="ghost danger-action"
            data-revert-constructor-import="${html(item.id)}"
            ${cannotRevert ? "disabled" : ""}
            title="${cannotRevert ? "Primero revierte premios en Admin > Premios" : "Revertir resultado deportivo"}"
          >
            Revertir resultado
          </button>
        ` : ""}
      </div>
    `;
  }).join("");
}

function renderResultsCalendarTable(admin = false) {
  const races = racesList();
  if (!races.length) {
    return `<div class="empty">Todavia no hay calendario cargado.</div>`;
  }

  return `
    <div class="table-wrap results-table">
      <table>
        <thead>
          <tr><th>Ronda</th><th>GP</th><th>Carrera larga</th><th>Sprint</th></tr>
        </thead>
        <tbody>
          ${races.map((race) => `
            <tr>
              <td>R${html(race.round)}</td>
              <td>
                <strong>${html(race.gp)}</strong>
                <small>${raceShouldHaveResult(race) ? "Completada" : "Pendiente de correr"}</small>
              </td>
              <td>${renderResultSessionCell(race, "race", admin)}</td>
              <td>${renderResultSessionCell(race, "sprint", admin)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function unmatchedConstructorResults() {
  return constructorResultImports().filter((item) => !racesList().some((race) => raceMatchesImport(race, item)));
}

function renderUnmatchedConstructorResults(admin = false) {
  const items = unmatchedConstructorResults();
  if (!items.length) return "";

  return `
    <div class="form-divider"></div>
    <h4 class="subsection-title">JSONs sin ronda vinculada</h4>
    <div class="table-wrap results-table">
      <table>
        <thead>
          <tr><th>Tipo</th><th>Carrera detectada</th><th>Archivo</th><th>Puntos</th><th>Premios</th>${admin ? "<th>Importado</th><th></th>" : ""}</tr>
        </thead>
        <tbody>
          ${items.slice().reverse().map((item) => {
            const awardStatus = jsonAwardStatus(item);
            const cannotRevert = awardStatus.state === "applied";
            return `
              <tr>
                <td>${html(item.kindLabel || constructorImportKindLabel(item.kind))}</td>
                <td>${html(item.trackName || "-")}</td>
                <td>${html(item.fileName || "-")}</td>
                <td>${html(resultImportPointsSummary(item) || "Sin puntos")}</td>
                <td><span class="pill ${awardStatus.className}">${html(awardStatus.label)}</span></td>
                ${admin ? `
                  <td>${html(formatDate(item.importedAtLabel))}</td>
                  <td>
                    <button
                      type="button"
                      class="ghost danger-action"
                      data-revert-constructor-import="${html(item.id)}"
                      ${cannotRevert ? "disabled" : ""}
                      title="${cannotRevert ? "Primero revierte premios en Admin > Premios" : "Revertir resultado deportivo"}"
                    >
                      Revertir
                    </button>
                  </td>
                ` : ""}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPublicResults() {
  if (cache.constructorChampionshipLoadError) {
    return `<div class="empty">${html(cache.constructorChampionshipLoadError)} Publica las reglas de constructores para mostrar resultados.</div>`;
  }

  return `
    <div class="results-panel">
      <p class="muted">Los resultados se alimentan con los JSONs importados en constructores. Carrera larga y sprint se controlan por separado.</p>
      ${renderResultsSummary()}
      ${renderResultsCalendarTable(false)}
      ${renderUnmatchedConstructorResults(false)}
    </div>
  `;
}

function renderAdminResults() {
  if (cache.constructorChampionshipLoadError) {
    return `<div class="empty">${html(cache.constructorChampionshipLoadError)} Publica las reglas de constructores para gestionar resultados.</div>`;
  }

  return `
    <div class="results-panel">
      <p class="muted">Carga nuevos JSONs desde Admin > Constructores. Este panel controla que cada GP tenga su carrera larga y, si aplica, su sprint.</p>
      ${renderResultsSummary()}
      ${renderResultsCalendarTable(true)}
      ${renderUnmatchedConstructorResults(true)}
    </div>
  `;
}

function renderDriverChampionship(admin = false) {
  if (cache.constructorChampionshipLoadError) {
    return `<div class="empty">${html(cache.constructorChampionshipLoadError)} Publica las reglas de constructores para mostrar pilotos.</div>`;
  }

  const rows = driverChampionshipStandings();
  if (!rows.length) {
    return `<div class="empty">Todavia no hay puntos de pilotos cargados. Importa JSONs desde Admin > Constructores.</div>`;
  }

  return `
    <div class="driver-championship-panel">
      <p class="muted">Se calcula con los JSONs importados. La vuelta rapida suma segun la configuracion de puntos de constructores.</p>
      <div class="table-wrap driver-standings-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Piloto</th>
              <th>Equipo</th>
              <th>PTS</th>
              <th>Carrera</th>
              <th>Sprint</th>
              <th>VR</th>
              <th>Victorias</th>
              <th>Podios</th>
              ${admin ? "<th>Ultimo resultado</th>" : ""}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, index) => {
              const last = row.results[row.results.length - 1];
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${html(row.driverName)}</strong></td>
                  <td>${html(row.teamNames.length ? row.teamNames.join(" / ") : teamName(row.latestTeamId))}</td>
                  <td><strong>${html(row.points)}</strong></td>
                  <td>${html(row.racePoints)}</td>
                  <td>${html(row.sprintPoints)}</td>
                  <td>${html(row.fastestLaps)}${row.fastestLapPoints ? ` (${html(row.fastestLapPoints)} pts)` : ""}</td>
                  <td>${html(row.wins)}</td>
                  <td>${html(row.podiums)}</td>
                  ${admin ? `<td>${last ? html(`${last.raceLabel} - ${last.kindLabel}: P${last.position || "-"} +${last.points}`) : "-"}</td>` : ""}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPersonnelEntriesList(team) {
  const entries = personnelDisplayEntries(team.id);
  if (!entries.length) {
    return `<div class="empty">Sin personal cargado.</div>`;
  }

  return `
    <div class="table-wrap personnel-table">
      <table>
        <thead><tr><th>Puesto</th><th>Tipo</th><th>Nombre</th><th>Rating</th><th>Valor</th></tr></thead>
        <tbody>
          ${entries.map((entry) => `
            <tr>
              <td>${html(entry.slotLabel || entry.role || "-")}</td>
              <td>${html(entry.catLabel || entry.notes || "-")}</td>
              <td><strong>${html(entry.name || "-")}</strong></td>
              <td>${Number.isFinite(entry.rating) ? html(entry.rating) : "-"}</td>
              <td>${entry.valueM ? moneyM(entry.valueM) : "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPublicPersonnel(teams) {
  if (cache.personnelLoadError) {
    return `<div class="empty">${html(cache.personnelLoadError)} Publica las reglas de personal para mostrar esta seccion.</div>`;
  }

  const teamsWithPersonnel = publicGridTeams(teams).filter((team) => personnelEntries(team.id).length);
  if (!teamsWithPersonnel.length) {
    return `<div class="empty">Todavia no hay plantillas cargadas.</div>`;
  }

  return `
    <div class="personnel-grid">
      ${teamsWithPersonnel.map((team) => `
        <section class="personnel-team">
          <h4 class="subsection-title">${html(team.name)}</h4>
          ${renderPersonnelEntriesList(team)}
        </section>
      `).join("")}
    </div>
  `;
}

function renderPersonnelAdmin(teams) {
  if (cache.personnelLoadError) {
    return `<div class="empty">${html(cache.personnelLoadError)} Publica las reglas de personal antes de editar.</div>`;
  }

  return `
    <div class="personnel-admin">
      <form id="personnelForm" class="form">
        <p class="muted">Carga manual de plantilla final. Luego puede conectarse con la app de pujas.</p>
        <section class="grid two flat-grid">
          <label>Equipo
            <select id="personnelTeam">
              ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
            </select>
          </label>
          <label>Rol
            <input id="personnelRole" placeholder="Piloto, ingeniero, jefe..." required />
          </label>
          <label>Nombre
            <input id="personnelName" required />
          </label>
          <label>Valor en M
            <input id="personnelValueM" type="number" min="0" step="0.001" value="0" />
          </label>
        </section>
        <label>Notas
          <input id="personnelNotes" placeholder="Opcional" />
        </label>
        <button type="submit">Agregar personal</button>
        <p id="personnelMessage" class="message"></p>
      </form>

      <div class="form-divider"></div>
      <form id="staffImportForm" class="form import-box">
        <h3 class="section-title">Importar parrilla oficial</h3>
        <p class="muted">Carga el JSON de staff de la app de pujas. Reemplaza las plantillas de los equipos importados y no toca presupuesto ni campeonatos.</p>
        <label>JSON de staff
          <input id="staffImportFile" type="file" accept=".json,application/json" required />
        </label>
        <button type="submit" class="ghost">Importar parrilla publica</button>
        <p id="staffImportMessage" class="message"></p>
      </form>

      <div class="form-divider"></div>
      <h4 class="subsection-title">Plantillas cargadas</h4>
      ${renderPersonnelAdminTable(teams)}
    </div>
  `;
}

function renderPersonnelAdminTable(teams) {
  const rows = teams.flatMap((team) => personnelEntries(team.id).map((entry) => ({ team, entry })));
  if (!rows.length) {
    return `<div class="empty">Todavia no hay personal cargado.</div>`;
  }

  return `
    <div class="table-wrap personnel-admin-table">
      <table>
        <thead><tr><th>Equipo</th><th>Rol</th><th>Nombre</th><th>Valor</th><th>Notas</th><th></th></tr></thead>
        <tbody>
          ${rows.map(({ team, entry }) => `
            <tr>
              <td><strong>${html(team.name)}</strong></td>
              <td>${html(entry.role || "-")}</td>
              <td>${html(entry.name || "-")}</td>
              <td>${entry.valueM ? moneyM(entry.valueM) : "-"}</td>
              <td>${html(entry.notes || "-")}</td>
              <td><button type="button" class="ghost danger-action" data-delete-personnel="${html(team.id)}:${html(entry.id)}">Borrar</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPublicRaceAwards(limit = 5) {
  if (cache.awardsLoadError) {
    return `<div class="empty">${html(cache.awardsLoadError)} Publica las reglas de premios para mostrar esta seccion.</div>`;
  }

  const awards = cache.raceAwards.filter((award) => !award.reversed).slice(0, limit);
  if (!awards.length) {
    return `<div class="empty">Todavia no hay premios de carrera aplicados.</div>`;
  }

  return `
    <div class="list compact">
      ${awards.map((award) => {
        const totals = award.totals || [];
        return `
          <div class="list-row award-public-row">
            <div>
              <strong>${html(award.raceLabel || award.raceGp || award.raceId || "-")}</strong>
              <span>${html(totals.map((item) => `${item.teamName || teamName(item.teamId)} ${moneyM(item.amountM)}`).join(" - ") || "Sin totales")}</span>
            </div>
            <span class="mini">${moneyM(award.totalM || 0)}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPublicMotoristChampionship() {
  if (cache.motoristChampionshipLoadError) {
    return `<div class="empty">${html(cache.motoristChampionshipLoadError)} Publica las reglas de motoristas para mostrar esta seccion.</div>`;
  }

  const rows = motoristStandings();
  const rounds = racesList();
  if (!rows.length) {
    return `<div class="empty">Todavia no hay motoristas cargados.</div>`;
  }

  return `
    <p class="muted">Solo puntua el mejor coche de cada motorista en cada GP.</p>
    <div class="table-wrap motorist-standings-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Motorista</th>
            ${rounds.map((race) => `<th>R${html(race.round)}</th>`).join("")}
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <strong>${html(row.motoristName)}</strong>
                <small>${html(row.teamNames.join(" / "))}</small>
              </td>
              ${row.roundResults.map((item) => {
                const detail = item.result.bestTeamId && item.result.bestPosition
                  ? `P${item.result.bestPosition} ${teamName(item.result.bestTeamId)}`
                  : "";
                return `<td title="${html(detail)}">${html(formatMotoristPoints(item.result))}</td>`;
              }).join("")}
              <td><strong>${html(row.total)}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPublicConstructorChampionship() {
  if (cache.constructorChampionshipLoadError) {
    return `<div class="empty">${html(cache.constructorChampionshipLoadError)} Publica las reglas de constructores para mostrar esta seccion.</div>`;
  }

  const rows = currentConstructorChampionship().standings;
  if (!rows.length) {
    return `<div class="empty">Todavia no hay clasificacion de constructores cargada.</div>`;
  }

  return `
    ${renderConstructorPointSystemSummary()}
    <div class="table-wrap constructor-standings-table">
      <table>
        <thead>
          <tr><th>#</th><th>Equipo</th><th>Puntos</th><th>Nota</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${html(row.position)}</td>
              <td><strong>${html(teamName(row.teamId))}</strong></td>
              <td><strong>${html(row.points)}</strong></td>
              <td>${html(row.note || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderConstructorPointSystemSummary() {
  if (cache.constructorPointSystemLoadError) {
    return `<div class="empty">${html(cache.constructorPointSystemLoadError)} Publica las reglas de puntos de constructores para mostrar esta seccion.</div>`;
  }

  return `
    <div class="constructor-point-summary">
      <div><strong>Carrera larga</strong><span>${html(constructorPointsSummary("race"))}</span></div>
      <div><strong>Sprint</strong><span>${html(constructorPointsSummary("sprint"))}</span></div>
    </div>
  `;
}

function renderPublicConstructorPredictions() {
  if (cache.constructorPredictionsLoadError) {
    return `<div class="empty">${html(cache.constructorPredictionsLoadError)} Publica las reglas de predicciones para mostrar esta seccion.</div>`;
  }

  const predictions = currentConstructorPredictions();
  const rows = constructorPredictionStandings();
  const showVotes = isAdmin() || predictions.status !== "abierto";

  return `
    <p class="muted">Estado: ${html(constructorPredictionStatusLabel(predictions.status))}. Ranking aparte, sin impacto economico.</p>
    ${renderConstructorPredictionVotePanel()}
    ${showVotes ? renderConstructorPredictionVotesTable(rows) : `<div class="empty">El plazo esta abierto. Los votos quedan privados hasta que se cierre.</div>`}
  `;
}

function renderConstructorPredictionVotePanel() {
  const predictions = currentConstructorPredictions();
  const vote = currentUserPredictionVote();
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams;

  if (isAdmin()) {
    return `<div class="empty">Admin: gestiona el plazo y la puntuacion desde Admin > Predicciones.</div>`;
  }

  if (!currentUser) {
    return `<div class="empty">Entra con una cuenta habilitada para cargar tu prediccion.</div>`;
  }

  if (!canCurrentUserVote()) {
    return `
      <div class="empty">
        Tu cuenta esta autenticada, pero no esta habilitada para votar.
        <br />UID: <code>${html(currentUser.uid)}</code>
      </div>
    `;
  }

  if (!constructorPredictionsOpen()) {
    return vote
      ? `<div class="empty">Tu prediccion ya quedo registrada. El plazo esta ${html(constructorPredictionStatusLabel(predictions.status).toLowerCase())}.</div>`
      : `<div class="empty">El plazo esta ${html(constructorPredictionStatusLabel(predictions.status).toLowerCase())}. No se pueden cargar predicciones ahora.</div>`;
  }

  const defaultName = vote?.participantName
    || currentProfile?.displayName
    || (currentProfile?.teamId ? teamName(currentProfile.teamId) : "")
    || currentUser.email
    || "";
  const linkedTeamId = vote?.linkedTeamId || currentProfile?.teamId || "";

  return `
    <form id="constructorVoteForm" class="form constructor-vote-form">
      <h4 class="subsection-title">${vote ? "Editar mi prediccion" : "Cargar mi prediccion"}</h4>
      <div class="grid two flat-grid">
        <label>Nombre publico<input id="constructorVoteName" value="${html(defaultName)}" required /></label>
        <label>Vinculo
          <select id="constructorVoteLinkedTeam">
            <option value="">Publico / sin equipo</option>
            ${teams.map((team) => `<option value="${html(team.id)}" ${linkedTeamId === team.id ? "selected" : ""}>${html(team.name)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${renderConstructorPredictionPickFields(teams, vote?.picks || [])}
      <button type="submit">${vote ? "Actualizar voto" : "Guardar voto"}</button>
      <p id="constructorVoteMessage" class="message"></p>
    </form>
  `;
}

function renderConstructorPredictionVotesTable(rows) {
  if (!rows.length) {
    return `<div class="empty">Todavia no hay predicciones cargadas.</div>`;
  }

  return `
    <div class="table-wrap constructor-predictions-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Participante</th>
            <th>PTS</th>
            <th>Aciertos</th>
            <th>Prediccion</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((entry, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <strong>${html(entry.participantName)}</strong>
                ${entry.linkedTeamId ? `<small>${html(teamName(entry.linkedTeamId))}</small>` : `<small>Publico</small>`}
              </td>
              <td><strong>${html(entry.points)}</strong></td>
              <td>${html(entry.correctHits)}</td>
              <td>${html(constructorPredictionPickText(entry.picks))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRegulationContent(content) {
  const paragraphs = String(content || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!paragraphs.length) return "";
  return paragraphs
    .map((paragraph) => `<p>${html(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderPublicRegulation() {
  if (cache.regulationLoadError) {
    return `<div class="empty">${html(cache.regulationLoadError)} Publica las reglas de reglamento para mostrar esta seccion.</div>`;
  }

  const sections = currentRegulation().sections
    .filter((section) => section.content.trim());

  if (!sections.length) {
    return `<div class="empty">Todavia no hay reglamento publicado para esta temporada.</div>`;
  }

  return `
    <div class="regulation-public">
      ${sections.map((section) => `
        <section class="regulation-section">
          <h4>${html(section.title)}</h4>
          ${renderRegulationContent(section.content)}
        </section>
      `).join("")}
    </div>
  `;
}

function renderHeadquartersDetails(teamId) {
  const levels = headquartersLevels(teamId);
  if (!facilities().length) {
    return `<div class="empty">Todavia no hay instalaciones definidas.</div>`;
  }

  return `
    <div class="facility-grid">
      ${facilities().map((facility) => {
        const level = Number(levels[facility.id] || 0);
        return `
          <div class="facility-card">
            <span>${html(facility.name)}</span>
            <strong>Nivel ${level}</strong>
            ${renderLevelDots(level)}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderHeadquartersTable(teams) {
  if (!facilities().length) {
    return `<div class="empty">Todavia no hay instalaciones definidas.</div>`;
  }

  return `
    <div class="table-wrap headquarters-table">
      <table>
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Media</th>
            ${facilities().map((facility) => `<th>${html(facility.name)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${teams.map((team) => {
            const levels = headquartersLevels(team.id);
            return `
              <tr>
                <td><strong>${html(team.name)}</strong></td>
                <td>${headquartersAverage(team.id).toFixed(1)}</td>
                ${facilities().map((facility) => {
                  const level = Number(levels[facility.id] || 0);
                  return `<td><span class="level-cell">${level}${renderLevelDots(level)}</span></td>`;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTeamWeights(teamId) {
  if (cache.carLoadError) {
    return `
      ${renderTeamWeightRequestPanel(teamId)}
      <div class="empty">${html(cache.carLoadError)} Revisa las reglas privadas de coche.</div>
    `;
  }
  if (!weightPieces().length) {
    return `<div class="empty">Todavia no hay tabla de pesos cargada.</div>`;
  }

  const car = carDoc(teamId);
  const levels = weightLevels(teamId);
  const summary = weightSummaryFromLevels(teamId, levels);

  return `
    ${renderTeamWeightRequestPanel(teamId)}

    <div class="weight-summary">
      <div><span>Peso extra total</span><strong>${formatKg(summary.totalWeightKg)}</strong></div>
      <div><span>Piezas en minimo</span><strong>${Object.values(summary.pieces).filter((piece) => piece.level >= 10).length}/${weightPieces().length}</strong></div>
      <div><span>Coste tiradas</span><strong>1: ${moneyM(weightRunCostM(1))} - 2: ${moneyM(weightRunCostM(2))} - 3: ${moneyM(weightRunCostM(3))}</strong></div>
    </div>

    <div class="weight-grid">
      ${weightPieces().map((piece) => {
        const level = levels[piece.id] || 0;
        const info = weightLevelInfo(piece.id, level);
        const nextText = level >= 10
          ? "Peso minimo alcanzado"
          : `Exito ${html(info.successPct)}% - Fallo ${html(info.failurePct)}% - Caida ${html(info.dropPct)}%`;
        return `
          <div class="weight-card">
            <div class="weight-card-head">
              <strong>${html(piece.name)}</strong>
              <span>Nivel ${html(level)}/10</span>
            </div>
            <div class="weight-meta">
              <div><span>Peso extra</span><strong>${formatKg(info.weightKg)}</strong></div>
              <div><span>Duracion minima</span><strong>${html(info.durationMin)}</strong></div>
            </div>
            <small>${nextText}</small>
          </div>
        `;
      }).join("")}
    </div>

    <h4 class="subsection-title">Historial de pesos</h4>
    ${renderWeightHistory(car.weightHistory || [], 8)}
  `;
}

function renderTeamWeightRequestPanel(teamId) {
  const developmentOpen = isDevelopmentWindowOpen();
  const pending = pendingWeightRequests(teamId);
  const pendingPieces = new Set(pending.map((request) => request.pieceId));
  const levels = weightLevels(teamId);
  const firstAvailablePiece = weightPieces().find((piece) => !pendingPieces.has(piece.id) && Number(levels[piece.id] || 0) < 10);
  const blocked = !developmentOpen || pending.length >= 3 || !firstAvailablePiece;

  return `
    <section class="car-request-panel">
      <div class="card-header">
        <div>
          <h4>Solicitar mejora de peso</h4>
          <p class="muted">Pide tiradas de peso para el GP actual. Admin aplica el resultado y cobra el coste.</p>
        </div>
        <span class="pill ${pending.length >= 3 ? "warn-pill" : ""}">${html(pending.length)}/3 pendientes</span>
      </div>
      <form id="teamWeightRequestForm" class="form car-request-form">
        <section class="grid two flat-grid">
          <label>Pieza
            <select id="teamWeightRequestPiece" ${blocked ? "disabled" : ""}>
              ${weightRequestPieceOptions(teamId, firstAvailablePiece?.id || "")}
            </select>
          </label>
          <label>Tiradas
            <select id="teamWeightRequestRuns" ${blocked ? "disabled" : ""}>
              <option value="1">1 tirada - ${moneyM(weightRunCostM(1))}</option>
              <option value="2">2 tiradas - ${moneyM(weightRunCostM(2))}</option>
              <option value="3">3 tiradas - ${moneyM(weightRunCostM(3))}</option>
            </select>
          </label>
          <label>Nota
            <input id="teamWeightRequestNote" maxlength="120" placeholder="Ej: priorizar esta pieza para el GP..." ${blocked ? "disabled" : ""} />
          </label>
        </section>
        <button type="submit" ${blocked ? "disabled" : ""}>Enviar solicitud</button>
        <p id="teamWeightRequestMessage" class="message"></p>
      </form>
      ${!developmentOpen ? `<p class="warning-text">El plazo de mejoras esta cerrado.</p>` : ""}
      ${pending.length >= 3 ? `<p class="warning-text">Ya tienes 3 solicitudes de peso pendientes.</p>` : ""}
      ${developmentOpen && !firstAvailablePiece ? `<p class="warning-text">No quedan piezas disponibles para solicitar.</p>` : ""}
      ${renderCarSelectionLoadWarning()}
      ${renderWeightRequestHistory(teamId)}
    </section>
  `;
}

function renderWeightAttemptSummary(attempts = []) {
  if (!Array.isArray(attempts) || !attempts.length) return "";
  return attempts
    .map((attempt) => `${weightResultLabel(attempt.result)} ${html(attempt.levelBefore)}->${html(attempt.levelAfter)}`)
    .join(", ");
}

function renderWeightRequestHistory(teamId) {
  const requests = weightRequests(teamId);
  const developmentOpen = isDevelopmentWindowOpen();
  if (!requests.length) {
    return `<div class="empty">Todavia no hay solicitudes de peso registradas.</div>`;
  }

  return `
    <div class="car-request-list">
      ${requests.slice().reverse().map((request) => {
        const piece = weightPieceById(request.pieceId);
        const resultText = renderWeightAttemptSummary(request.attempts);
        return `
          <article class="car-request-card">
            <div class="car-piece-head">
              <div>
                <strong>${html(piece?.name || request.pieceId)}</strong>
                <span>${html(request.runs)} tiradas - ${moneyM(request.costM)} - ${html(request.raceLabel || "Sin GP")}</span>
              </div>
              <span class="pill ${carRequestStatusClass(request.status)}">${html(carRequestStatusLabel(request.status))}</span>
            </div>
            <p>${html(request.note || "Sin nota")}</p>
            <small>
              ${resultText ? `Resultado: ${resultText}` : ""}
              ${request.cancelReason ? `Motivo: ${html(request.cancelReason)}` : ""}
            </small>
            ${request.status === "pending" ? `
              <div class="request-actions">
                <button
                  type="button"
                  class="ghost danger-action"
                  data-cancel-team-weight-request="${html(request.id)}"
                  ${developmentOpen ? "" : "disabled"}
                >${developmentOpen ? "Arrepentirse" : "Mejoras cerradas"}</button>
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderAdminWeightRequests(teams) {
  const pending = allPendingWeightRequests(teams);
  const allRequests = allWeightRequests(teams)
    .sort((a, b) => String(b.request.createdAtLabel || "").localeCompare(String(a.request.createdAtLabel || "")));
  const selectedTeam = teams.some((team) => team.id === currentAdminWeightRequestTeamFilter)
    ? currentAdminWeightRequestTeamFilter
    : "";
  currentAdminWeightRequestTeamFilter = selectedTeam;
  const visiblePending = selectedTeam
    ? pending.filter(({ team }) => team.id === selectedTeam)
    : pending;
  const visibleHistory = (selectedTeam
    ? allRequests.filter(({ team }) => team.id === selectedTeam)
    : allRequests).slice(0, 12);

  return `
    <div class="form">
      <label>Filtrar por equipo
        <select id="adminWeightRequestTeamFilter">
          <option value="">Todos los equipos</option>
          ${teams.map((team) => `
            <option value="${html(team.id)}" ${team.id === selectedTeam ? "selected" : ""}>${html(team.name)}</option>
          `).join("")}
        </select>
      </label>
    </div>
    <div class="card-header compact-header">
      <h4>Pendientes</h4>
      <span class="pill">${html(visiblePending.length)} de ${html(pending.length)}</span>
    </div>
    ${pending.length ? `<p class="warning-text">La seleccion no puede abrirse hasta aplicar o cancelar estas solicitudes.</p>` : ""}
    ${visiblePending.length ? `
      <div class="car-request-admin-list">
        ${visiblePending.map(({ team, request }) => {
          const piece = weightPieceById(request.pieceId);
          return `
            <article class="car-request-card">
              <div class="car-piece-head">
                <div>
                  <strong>${html(team.name)} - ${html(piece?.name || request.pieceId)}</strong>
                  <span>${html(request.runs)} tiradas - ${moneyM(request.costM)} - ${html(request.raceLabel || "Sin GP")}</span>
                </div>
                <span class="pill warn-pill">Pendiente</span>
              </div>
              <p>${html(request.note || "Sin nota")}</p>
              <div class="request-actions">
                <button type="button" class="ghost" data-apply-weight-request="${html(team.id)}:${html(request.id)}">Aplicar tiradas</button>
                <button type="button" class="ghost danger-action" data-cancel-weight-request="${html(team.id)}:${html(request.id)}">Cancelar</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    ` : `<div class="empty">${pending.length ? "No hay solicitudes pendientes para este equipo." : "No hay solicitudes pendientes."}</div>`}
    <div class="form-divider"></div>
    <h4 class="subsection-title">Historial de solicitudes</h4>
    ${visibleHistory.length ? `
      <div class="car-request-list">
        ${visibleHistory.map(({ team, request }) => {
          const piece = weightPieceById(request.pieceId);
          const resultText = renderWeightAttemptSummary(request.attempts);
          return `
            <article class="car-request-card">
              <div class="car-piece-head">
                <div>
                  <strong>${html(team.name)} - ${html(piece?.name || request.pieceId)}</strong>
                  <span>${html(request.runs)} tiradas - ${moneyM(request.costM)} - ${html(request.raceLabel || "Sin GP")}</span>
                </div>
                <span class="pill ${carRequestStatusClass(request.status)}">${html(carRequestStatusLabel(request.status))}</span>
              </div>
              <small>
                ${resultText ? `Resultado: ${resultText}` : html(request.note || "Sin nota")}
                ${request.cancelReason ? ` - Motivo: ${html(request.cancelReason)}` : ""}
              </small>
            </article>
          `;
        }).join("")}
      </div>
    ` : `<div class="empty">Todavia no hay solicitudes de peso registradas.</div>`}
    <p id="adminWeightRequestMessage" class="message"></p>
  `;
}

function renderWeightHistory(history, limit = 10) {
  const rows = (Array.isArray(history) ? [...history] : [])
    .reverse()
    .slice(0, limit);

  if (!rows.length) {
    return `<div class="empty">Todavia no hay tiradas o ajustes de peso registrados.</div>`;
  }

  return `
    <div class="table-wrap weight-history-table">
      <table>
        <thead><tr><th>Fecha</th><th>Pieza</th><th>Accion</th><th>Resultado</th><th>Coste</th></tr></thead>
        <tbody>
          ${rows.map((entry) => {
            const attempts = Array.isArray(entry.attempts) ? entry.attempts : [];
            const resultText = attempts.length
              ? attempts.map((attempt) => `${weightResultLabel(attempt.result)}: ${html(attempt.levelBefore)} -> ${html(attempt.levelAfter)}${attempt.roll === null || attempt.roll === undefined ? "" : ` (${html(attempt.roll)})`}`).join("<br>")
              : `${html(entry.levelBefore ?? "-")} -> ${html(entry.levelAfter ?? "-")}`;
            const action = entry.type === "manual"
              ? "Ajuste manual"
              : `${html(entry.runs || attempts.length || 0)} tiradas`;
            return `
              <tr>
                <td>${formatDate(entry.createdAt || entry.createdAtLabel)}</td>
                <td>${html(entry.pieceName || weightPieceById(entry.pieceId)?.name || entry.pieceId || "-")}</td>
                <td>${action}</td>
                <td>${resultText}</td>
                <td>${moneyM(entry.costM || 0)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminWeightsOverview(teams) {
  if (cache.carLoadError) {
    return `<div class="empty">${html(cache.carLoadError)} Publica las reglas privadas de coche para usar este modulo.</div>`;
  }

  return `
    <div class="table-wrap weight-admin-table">
      <table>
        <thead><tr><th>Equipo</th><th>Peso extra</th><th>Niveles</th><th>Ultimos cambios</th></tr></thead>
        <tbody>
          ${teams.map((team) => {
            const car = carDoc(team.id);
            const levels = weightLevels(team.id);
            const summary = weightSummaryFromLevels(team.id, levels);
            const historyCount = Array.isArray(car.weightHistory) ? car.weightHistory.length : 0;
            return `
              <tr>
                <td><strong>${html(team.name)}</strong></td>
                <td>${formatKg(summary.totalWeightKg)}</td>
                <td>
                  ${weightPieces().map((piece) => {
                    const level = levels[piece.id] || 0;
                    const info = weightLevelInfo(piece.id, level);
                    return `<small>${html(piece.name)}: nivel ${html(level)} (${formatKg(info.weightKg)})</small>`;
                  }).join("")}
                </td>
                <td>${historyCount} registros</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderEngineStatsGrid(engine) {
  const stats = normalizeEngineStats(engine?.stats || {});
  return `
    <div class="stats-table engine-stats-table">
      ${engineStats().map((stat) => `
        <div>
          <span>${html(stat.name)}</span>
          <strong>${html(stats[stat.id])}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderEngineProbabilities(engine, statId, modeId) {
  const stats = normalizeEngineStats(engine?.stats || {});
  const stat = engineStatById(statId) || engineStats()[0];
  const mode = engineModes().find((item) => item.id === modeId) || engineModes()[1] || { id: "normal", name: "Normal" };
  const probabilities = engineProbabilities(stat.id, stats[stat.id], mode.id);
  if (!probabilities) {
    return `<div class="empty">Este valor esta fuera de rango para la tabla de ${html(stat.name)}.</div>`;
  }
  return `
    <div class="engine-prob-grid">
      ${engineResults().map((result, index) => `
        <div>
          <span>${html(result.name)} (${formatSignedDelta(result.delta)})</span>
          <strong>${html(probabilities[index])}%</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderEngineHistory(history, limit = 10) {
  const rows = (Array.isArray(history) ? [...history] : [])
    .reverse()
    .slice(0, limit);

  if (!rows.length) {
    return `<div class="empty">Todavia no hay historial de motor.</div>`;
  }

  return `
    <div class="table-wrap engine-history-table">
      <table>
        <thead><tr><th>Fecha</th><th>Stat</th><th>Accion</th><th>Resultado</th><th>Coste</th></tr></thead>
        <tbody>
          ${rows.map((entry) => {
            const attempts = Array.isArray(entry.attempts) ? entry.attempts : [];
            const stat = engineStatById(entry.statId);
            const resultText = attempts.length
              ? attempts.map((attempt) => `${html(attempt.resultName)} ${formatSignedDelta(attempt.delta)}: ${html(attempt.valueBefore)} -> ${html(attempt.valueAfter)} (${html(attempt.roll)})`).join("<br>")
              : `${html(entry.valueBefore ?? "-")} -> ${html(entry.valueAfter ?? "-")}`;
            const action = entry.type === "manual"
              ? "Ajuste manual"
              : `${html(entry.attemptCount || attempts.length || 0)} intentos - ${html(engineModes().find((mode) => mode.id === entry.modeId)?.name || entry.modeId || "-")}`;
            return `
              <tr>
                <td>${formatDate(entry.createdAt || entry.createdAtLabel)}</td>
                <td>${html(stat?.name || entry.statId || "-")}</td>
                <td>${action}</td>
                <td>${resultText}</td>
                <td>${moneyM(entry.costM || 0)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderEngineAttemptSummary(attempts = []) {
  if (!Array.isArray(attempts) || !attempts.length) return "";
  return attempts
    .map((attempt) => `${html(attempt.resultName || "-")} ${formatSignedDelta(attempt.delta)} (${html(attempt.valueBefore)}->${html(attempt.valueAfter)})`)
    .join(", ");
}

function engineRacePendingCostM(teamId, raceId) {
  if (!raceId) return 0;
  return moneyValue(
    pendingEngineRequests(teamId)
      .filter((request) => request.raceId === raceId)
      .reduce((sum, request) => sum + Number(request.costM || 0), 0)
  );
}

function renderEngineRequestHistory(teamId) {
  const requests = engineRequests(teamId);
  const developmentOpen = isDevelopmentWindowOpen();
  if (!requests.length) {
    return `<div class="empty">Todavia no hay solicitudes de motor registradas.</div>`;
  }

  return `
    <div class="car-request-list">
      ${requests.slice().reverse().map((request) => {
        const stat = engineStatById(request.statId);
        const mode = engineModes().find((item) => item.id === request.modeId);
        const resultText = renderEngineAttemptSummary(request.attempts);
        return `
          <article class="car-request-card">
            <div class="car-piece-head">
              <div>
                <strong>${html(stat?.name || request.statId)}</strong>
                <span>${html(request.attemptCount)} intentos - ${html(mode?.name || request.modeId || "-")} - ${moneyM(request.costM)} - ${html(request.raceLabel || "Sin GP")}</span>
              </div>
              <span class="pill ${carRequestStatusClass(request.status)}">${html(carRequestStatusLabel(request.status))}</span>
            </div>
            <p>${html(request.note || "Sin nota")}</p>
            <small>
              ${resultText ? `Resultado: ${resultText}` : ""}
              ${request.cancelReason ? `Motivo: ${html(request.cancelReason)}` : ""}
            </small>
            ${request.status === "pending" ? `
              <div class="request-actions">
                <button
                  type="button"
                  class="ghost danger-action"
                  data-cancel-team-engine-request="${html(request.id)}"
                  ${developmentOpen ? "" : "disabled"}
                >${developmentOpen ? "Arrepentirse" : "Mejoras cerradas"}</button>
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTeamEngineRequestPanel(team) {
  const developmentOpen = isDevelopmentWindowOpen();
  const raceWindow = currentRaceWindow();
  const raceId = raceWindow.raceId || "";
  const limitM = engineRaceLimitM();
  const spentM = engineRaceSpentM(team.id, raceId);
  const pendingCostM = engineRacePendingCostM(team.id, raceId);
  const availableM = moneyValue(limitM - spentM - pendingCostM);
  const unitCostM = motorRunCostM(1) || 1;
  const maxAttemptsByLimit = Math.max(0, Math.floor(availableM / unitCostM));
  const maxAttempts = Math.max(1, Math.min(20, maxAttemptsByLimit || 0));
  const blocked = !developmentOpen || availableM < unitCostM;

  return `
    <section class="car-request-panel">
      <div class="card-header">
        <div>
          <h4>Solicitar mejora de motor</h4>
          <p class="muted">Pide intentos de motor para el GP actual. Admin aplica el resultado y cobra el coste.</p>
        </div>
        <span class="pill ${availableM < unitCostM ? "warn-pill" : ""}">${moneyM(Math.max(0, availableM))} disponible GP</span>
      </div>
      <div class="list compact">
        <div class="list-row"><strong>Limite GP</strong><span>${moneyM(limitM)}</span></div>
        <div class="list-row"><strong>Gastado aplicado</strong><span>${moneyM(spentM)}</span></div>
        <div class="list-row"><strong>Pendiente solicitado</strong><span>${moneyM(pendingCostM)}</span></div>
      </div>
      <form id="teamEngineRequestForm" class="form car-request-form">
        <section class="grid two flat-grid">
          <label>Stat
            <select id="teamEngineRequestStat" ${blocked ? "disabled" : ""}>
              ${engineStats().map((stat) => `<option value="${html(stat.id)}">${html(stat.name)}</option>`).join("")}
            </select>
          </label>
          <label>Modo
            <select id="teamEngineRequestMode" ${blocked ? "disabled" : ""}>
              ${engineModes().map((mode) => `<option value="${html(mode.id)}" ${mode.id === "normal" ? "selected" : ""}>${html(mode.name)}</option>`).join("")}
            </select>
          </label>
          <label>Intentos
            <input id="teamEngineRequestAttempts" type="number" min="1" max="${html(maxAttempts)}" step="1" value="1" ${blocked ? "disabled" : ""} required />
          </label>
          <label>Nota
            <input id="teamEngineRequestNote" maxlength="120" placeholder="Ej: empujar ERS para este GP..." ${blocked ? "disabled" : ""} />
          </label>
        </section>
        <button type="submit" ${blocked ? "disabled" : ""}>Enviar solicitud</button>
        <p id="teamEngineRequestMessage" class="message"></p>
      </form>
      ${!developmentOpen ? `<p class="warning-text">El plazo de mejoras esta cerrado.</p>` : ""}
      ${developmentOpen && availableM < unitCostM ? `<p class="warning-text">No queda margen de motor para este GP.</p>` : ""}
      ${renderCarSelectionLoadWarning()}
      ${renderEngineRequestHistory(team.id)}
    </section>
  `;
}

function renderTeamEngine(team) {
  if (cache.engineLoadError) {
    return `<div class="empty">${html(cache.engineLoadError)} Revisa las reglas privadas de motores.</div>`;
  }
  if (!team?.isMotorist) {
    return `<div class="empty">Este apartado solo esta disponible para equipos motoristas.</div>`;
  }

  const engine = engineDoc(team.id);
  const summary = motorSummary(team.id);
  return `
    ${renderTeamEngineRequestPanel(team)}
    <div class="engine-hero">
      <div>
        <p class="eyebrow">${html(team.name)}</p>
        <h4>${html(engine.engineName || `Motor ${team.name}`)}</h4>
        <p class="muted">Clientes: ${(team.motorClients || []).length ? html(team.motorClients.map(teamName).join(", ")) : "sin clientes"}</p>
      </div>
      <span class="pill ${summary.status === "over" ? "danger-pill" : summary.status === "warn" ? "warn-pill" : ""}">${moneyM(summary.remainingM)} restante</span>
    </div>
    ${renderEngineStatsGrid(engine)}
    <h4 class="subsection-title">Historial de motor</h4>
    ${renderEngineHistory(engine.history || [], 8)}
  `;
}

function renderMotorLimitAdminTable(teams) {
  const rows = teams
    .filter((team) => team.isMotorist)
    .map((team) => ({ team, summary: motorSummary(team.id) }))
    .sort((a, b) => b.summary.percent - a.summary.percent);

  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Motorista</th><th>Gastado</th><th>Restante</th><th>Uso</th><th>Clientes</th></tr></thead>
        <tbody>
          ${rows.map(({ team, summary }) => `
            <tr>
              <td><strong>${html(team.name)}</strong></td>
              <td>${moneyM(summary.spentM)}</td>
              <td class="${summary.remainingM < 0 ? "negative" : "positive"}">${moneyM(summary.remainingM)}</td>
              <td>
                <div class="mini-limit ${html(summary.status)}">
                  <span style="width: ${html(Math.min(100, Math.max(0, summary.percent)))}%"></span>
                </div>
                ${html(summary.percent)}%
              </td>
              <td>${html((team.motorClients || []).map(teamName).join(", ") || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminEnginesOverview(teams) {
  if (cache.engineLoadError) {
    return `<div class="empty">${html(cache.engineLoadError)} Publica las reglas privadas de motores para usar este modulo.</div>`;
  }

  const motorists = teams.filter((team) => team.isMotorist);
  if (!motorists.length) {
    return `<div class="empty">No hay equipos motoristas cargados.</div>`;
  }

  return `
    <div class="table-wrap engine-admin-table">
      <table>
        <thead><tr><th>Motorista</th><th>Motor</th><th>Stats</th><th>Limite</th><th>Historial</th></tr></thead>
        <tbody>
          ${motorists.map((team) => {
            const engine = engineDoc(team.id);
            const stats = normalizeEngineStats(engine.stats || {});
            const summary = motorSummary(team.id);
            return `
              <tr>
                <td><strong>${html(team.name)}</strong><small>Clientes: ${html((team.motorClients || []).map(teamName).join(", ") || "-")}</small></td>
                <td>${html(engine.engineName || `Motor ${team.name}`)}</td>
                <td>${engineStats().map((stat) => `<small>${html(stat.name)}: ${html(stats[stat.id])}</small>`).join("")}</td>
                <td>${moneyM(summary.spentM)} / ${moneyM(summary.limitM)}</td>
                <td>${Array.isArray(engine.history) ? engine.history.length : 0} registros</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdminEngineRequests(teams) {
  const motorists = teams.filter((team) => team.isMotorist);
  const pending = allPendingEngineRequests(motorists);
  const allRequests = allEngineRequests(motorists)
    .sort((a, b) => String(b.request.createdAtLabel || "").localeCompare(String(a.request.createdAtLabel || "")));
  const selectedTeam = motorists.some((team) => team.id === currentAdminEngineRequestTeamFilter)
    ? currentAdminEngineRequestTeamFilter
    : "";
  currentAdminEngineRequestTeamFilter = selectedTeam;
  const visiblePending = selectedTeam
    ? pending.filter(({ team }) => team.id === selectedTeam)
    : pending;
  const visibleHistory = (selectedTeam
    ? allRequests.filter(({ team }) => team.id === selectedTeam)
    : allRequests).slice(0, 12);

  return `
    <div class="form">
      <label>Filtrar por motorista
        <select id="adminEngineRequestTeamFilter">
          <option value="">Todos los motoristas</option>
          ${motorists.map((team) => `
            <option value="${html(team.id)}" ${team.id === selectedTeam ? "selected" : ""}>${html(team.name)}</option>
          `).join("")}
        </select>
      </label>
    </div>
    <div class="card-header compact-header">
      <h4>Pendientes</h4>
      <span class="pill">${html(visiblePending.length)} de ${html(pending.length)}</span>
    </div>
    ${pending.length ? `<p class="warning-text">La seleccion no puede abrirse hasta aplicar o cancelar estas solicitudes.</p>` : ""}
    ${visiblePending.length ? `
      <div class="car-request-admin-list">
        ${visiblePending.map(({ team, request }) => {
          const stat = engineStatById(request.statId);
          const mode = engineModes().find((item) => item.id === request.modeId);
          return `
            <article class="car-request-card">
              <div class="car-piece-head">
                <div>
                  <strong>${html(team.name)} - ${html(stat?.name || request.statId)}</strong>
                  <span>${html(request.attemptCount)} intentos - ${html(mode?.name || request.modeId || "-")} - ${moneyM(request.costM)} - ${html(request.raceLabel || "Sin GP")}</span>
                </div>
                <span class="pill warn-pill">Pendiente</span>
              </div>
              <p>${html(request.note || "Sin nota")}</p>
              <div class="request-actions">
                <button type="button" class="ghost" data-apply-engine-request="${html(team.id)}:${html(request.id)}">Aplicar intentos</button>
                <button type="button" class="ghost danger-action" data-cancel-engine-request="${html(team.id)}:${html(request.id)}">Cancelar</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    ` : `<div class="empty">${pending.length ? "No hay solicitudes pendientes para este motorista." : "No hay solicitudes pendientes."}</div>`}
    <div class="form-divider"></div>
    <h4 class="subsection-title">Historial de solicitudes</h4>
    ${visibleHistory.length ? `
      <div class="car-request-list">
        ${visibleHistory.map(({ team, request }) => {
          const stat = engineStatById(request.statId);
          const mode = engineModes().find((item) => item.id === request.modeId);
          const resultText = renderEngineAttemptSummary(request.attempts);
          return `
            <article class="car-request-card">
              <div class="car-piece-head">
                <div>
                  <strong>${html(team.name)} - ${html(stat?.name || request.statId)}</strong>
                  <span>${html(request.attemptCount)} intentos - ${html(mode?.name || request.modeId || "-")} - ${moneyM(request.costM)} - ${html(request.raceLabel || "Sin GP")}</span>
                </div>
                <span class="pill ${carRequestStatusClass(request.status)}">${html(carRequestStatusLabel(request.status))}</span>
              </div>
              <small>
                ${resultText ? `Resultado: ${resultText}` : html(request.note || "Sin nota")}
                ${request.cancelReason ? ` - Motivo: ${html(request.cancelReason)}` : ""}
              </small>
            </article>
          `;
        }).join("")}
      </div>
    ` : `<div class="empty">Todavia no hay solicitudes de motor registradas.</div>`}
    <p id="adminEngineRequestMessage" class="message"></p>
  `;
}

function renderEngineRaceLimitAdmin(teams) {
  const raceWindow = currentRaceWindow();
  const raceId = raceWindow.raceId || "";
  const limitM = engineRaceLimitM();
  const motorists = teams.filter((team) => team.isMotorist);

  return `
    <form id="engineRaceLimitForm" class="form">
      <p class="muted">Limite maximo que puede gastar cada motorista en mejoras de motor por GP. Si la temporada no tiene valor guardado, se usa 6M.</p>
      <label>Limite motor por GP en M
        <input id="engineRaceLimitInput" type="number" min="0" step="0.001" value="${html(limitM)}" required />
      </label>
      <button type="submit" class="ghost">Guardar limite</button>
      <p id="engineRaceLimitMessage" class="message"></p>
    </form>
    <div class="form-divider"></div>
    <h4 class="subsection-title">${raceId ? `Uso actual en ${html(currentRaceWindowLabel())}` : "Uso actual por GP"}</h4>
    ${raceId ? `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Motorista</th><th>Aplicado</th><th>Pendiente</th><th>Disponible</th></tr></thead>
          <tbody>
            ${motorists.map((team) => {
              const spentM = engineRaceSpentM(team.id, raceId);
              const pendingM = engineRacePendingCostM(team.id, raceId);
              const availableM = moneyValue(limitM - spentM - pendingM);
              return `
                <tr>
                  <td><strong>${html(team.name)}</strong></td>
                  <td>${moneyM(spentM)}</td>
                  <td>${moneyM(pendingM)}</td>
                  <td class="${availableM < 0 ? "negative" : "positive"}">${moneyM(availableM)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty">Abre o selecciona un GP para ver el uso por carrera.</div>`}
  `;
}

function renderPendingEngineImport(teams) {
  if (!cache.pendingEngineImport) return "";
  const engines = Object.entries(cache.pendingEngineImport.engines || {});
  if (!engines.length) return "";

  return `
    <form id="engineImportAssignForm" class="form import-box">
      <h3 class="section-title">Asignar motores importados</h3>
      <p class="muted">Archivo: ${html(cache.pendingEngineImport.fileName)}. Elige que motor corresponde a cada motorista.</p>
      ${engines.map(([engineName]) => `
        <label>${html(engineName)}
          <select data-import-engine-name="${html(engineName)}">
            <option value="">Omitir</option>
            ${teams.filter((team) => team.isMotorist).map((team) => `
              <option value="${html(team.id)}">${html(team.name)}</option>
            `).join("")}
          </select>
        </label>
      `).join("")}
      <button type="submit">Guardar motores asignados</button>
    </form>
  `;
}

function renderCarRequestHistory(teamId) {
  const requests = carRequests(teamId);
  const developmentOpen = isDevelopmentWindowOpen();
  if (!requests.length) {
    return `<div class="empty">Todavia no hay solicitudes de mejora.</div>`;
  }

  return `
    <div class="car-request-list">
      ${requests.slice().reverse().map((request) => {
        const piece = pieceById(request.pieceId);
        return `
          <article class="car-request-card">
            <div class="car-piece-head">
              <div>
                <strong>${html(piece?.name || request.pieceId)}</strong>
                <span>${html(carRequestModeLabel(request.mode))} - ${html(request.upgradeType || "-")}</span>
              </div>
              <span class="pill ${carRequestStatusClass(request.status)}">${html(carRequestStatusLabel(request.status))}</span>
            </div>
            <p>${html(request.note || "Sin nota")}</p>
            <small>
              ${html(request.raceLabel || "Sin GP")}
              ${request.resolvedDesignName ? ` - Resultado: ${html(request.resolvedDesignName)}` : ""}
              ${request.cancelReason ? ` - Motivo: ${html(request.cancelReason)}` : ""}
            </small>
            ${request.status === "pending" ? `
              <div class="request-actions">
                <button
                  type="button"
                  class="ghost danger-action"
                  data-cancel-team-car-request="${html(request.id)}"
                  ${developmentOpen ? "" : "disabled"}
                >${developmentOpen ? "Arrepentirse" : "Mejoras cerradas"}</button>
              </div>
            ` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderTeamCarRequestPanel(teamId) {
  const developmentOpen = isDevelopmentWindowOpen();
  const pending = pendingCarRequests(teamId);
  const pendingPieces = new Set(pending.map((request) => request.pieceId));
  const firstAvailablePiece = carPieces().find((piece) => !pendingPieces.has(piece.id));
  const blocked = !developmentOpen || pending.length >= 4 || !firstAvailablePiece;

  return `
    <section class="car-request-panel">
      <div class="card-header">
        <div>
          <h4>Solicitar mejora</h4>
          <p class="muted">Envia la pieza y el enfoque. El admin carga despues el resultado real y cobra el coste.</p>
        </div>
        <span class="pill ${pending.length >= 4 ? "warn-pill" : ""}">${html(pending.length)}/4 pendientes</span>
      </div>
      <form id="teamCarRequestForm" class="form car-request-form">
        <section class="grid two flat-grid">
          <label>Tipo
            <select id="teamCarRequestMode" ${blocked ? "disabled" : ""}>
              <option value="design">Diseno</option>
              <option value="research">Investigacion</option>
            </select>
          </label>
          <label>Pieza
            <select id="teamCarRequestPiece" ${blocked ? "disabled" : ""}>
              ${carRequestPieceOptions(teamId, firstAvailablePiece?.id || "")}
            </select>
          </label>
          <label>Mejora
            <select id="teamCarRequestUpgradeType" ${blocked ? "disabled" : ""}>
              ${renderUpgradeTypeOptions(firstAvailablePiece?.id || carPieces()[0]?.id || "")}
            </select>
          </label>
          <label>Nota o nombre
            <input id="teamCarRequestNote" maxlength="120" placeholder="Ej: version GP Austria, enfoque general..." ${blocked ? "disabled" : ""} required />
          </label>
        </section>
        <button type="submit" ${blocked ? "disabled" : ""}>Enviar solicitud</button>
        <p id="teamCarRequestMessage" class="message"></p>
      </form>
      ${!developmentOpen ? `<p class="warning-text">El plazo de mejoras esta cerrado.</p>` : ""}
      ${pending.length >= 4 ? `<p class="warning-text">Ya tienes 4 solicitudes pendientes.</p>` : ""}
      ${developmentOpen && !firstAvailablePiece ? `<p class="warning-text">Todas las piezas tienen una solicitud pendiente.</p>` : ""}
      ${renderCarSelectionLoadWarning()}
      ${renderCarRequestHistory(teamId)}
    </section>
  `;
}

function renderTeamCar(teamId) {
  if (cache.carLoadError) {
    return `
      ${renderTeamCarRequestPanel(teamId)}
      <div class="empty">${html(cache.carLoadError)} Revisa las reglas privadas de coche.</div>
    `;
  }

  const car = carDoc(teamId);
  const selection = carSelection(teamId);
  const selected = selection.selectedDesignIds || {};
  const active = car.activeDesignIds || {};
  const hasAnyDesign = carPieces().some((piece) => designsForPiece(teamId, piece.id).length);
  const selectionOpen = isSelectionWindowOpen();
  const windowLabel = currentRaceWindowLabel();

  if (!hasAnyDesign) {
    return `
      ${renderTeamCarRequestPanel(teamId)}
      <div class="empty">Todavia no hay disenos cargados para este equipo.</div>
    `;
  }

  const firstPieceId = carPieces().find((piece) => designsForPiece(teamId, piece.id).length)?.id || carPieces()[0]?.id;

  return `
    ${renderTeamCarRequestPanel(teamId)}
    <form id="teamCarForm" class="form">
      <div class="race-window-status ${selectionOpen ? "open" : ""}">
        <span>Plazo de seleccion</span>
        <strong>${selectionOpen ? `Abierto para ${html(windowLabel)}` : "Cerrado"}</strong>
      </div>
      <div class="next-car-name-box">
        <label>Nombre del coche para proxima temporada
          <input id="nextCarNameInput" value="${html(selection.nextCarName || "")}" placeholder="${html(teamName(teamId))} T${html(Number((cache.season || window.LFM_SEED.season)?.number || 7) + 1)}" />
        </label>
        <button id="saveNextCarNameBtn" type="button" class="ghost">Guardar nombre</button>
      </div>
      ${renderCarComparison(teamId)}
      <div class="car-tabs" role="tablist">
        ${carPieces().map((piece) => {
          const designs = designsForPiece(teamId, piece.id);
          const isActive = piece.id === firstPieceId;
          return `
            <button class="car-tab ${isActive ? "active" : ""}" type="button" data-car-tab="${html(piece.id)}" ${designs.length ? "" : "disabled"}>
              <span>${html(piece.name)}</span>
              <small>${designs.length}</small>
            </button>
          `;
        }).join("")}
      </div>

      ${carPieces().map((piece) => {
        const designs = designsForPiece(teamId, piece.id);
        const currentId = selected[piece.id] || active[piece.id] || designs[0]?.id || "";
        const activeDesign = active[piece.id] ? designById(teamId, piece.id, active[piece.id]) : null;
        const selectedDesign = currentId ? designById(teamId, piece.id, currentId) : null;
        const previewId = currentId;
        return `
          <section class="car-piece-panel ${piece.id === firstPieceId ? "active" : ""}" data-car-panel="${html(piece.id)}">
            <div class="car-piece-hero">
              <div>
                <p class="eyebrow">${html(piece.name)}</p>
                <h4 data-selected-design-title>${selectedDesign ? html(selectedDesign.name) : activeDesign ? html(activeDesign.name) : "Sin pieza equipada"}</h4>
                <p class="muted">${designs.length} disenos disponibles. Equipada actualmente: ${activeDesign ? html(activeDesign.name) : "sin equipar"}.</p>
              </div>
              <span class="pill" data-selected-design-state>${selectedDesign && selectedDesign.id !== activeDesign?.id ? "Vista seleccionada" : activeDesign ? "Equipada" : "Pendiente"}</span>
            </div>

            <div class="car-piece-layout">
              <div class="car-control-panel">
                <label>Elegir diseno
                  <select data-car-piece="${html(piece.id)}" ${designs.length && selectionOpen ? "" : "disabled"}>
                    <option value="">Sin pieza</option>
                    ${designs.map((design) => `
                      <option value="${html(design.id)}" ${design.id === currentId ? "selected" : ""}>
                        ${html(design.name)}${design.mode === "research" ? " (investigacion)" : ""}
                      </option>
                    `).join("")}
                  </select>
                </label>
                <div class="car-status-stack">
                  <div><span>Diseno equipado</span><strong>${activeDesign ? html(activeDesign.name) : "-"}</strong></div>
                  <div><span>Diseno seleccionado</span><strong data-selected-design-name>${selectedDesign ? html(selectedDesign.name) : "-"}</strong></div>
                  <div><span>Mejora seleccionada</span><strong data-selected-design-upgrade>${selectedDesign ? html(designUpgradeType(selectedDesign) || "-") : "-"}</strong></div>
                  <div><span>Coste de diseno</span><strong>${moneyM(designCostM(piece.id, "design"))}</strong></div>
                  <div><span>Coste investigacion</span><strong>${moneyM(designCostM(piece.id, "research"))}</strong></div>
                </div>
              </div>

              <div class="car-preview-panel">
                ${designs.length ? designs.map((design) => `
                  <div class="design-preview ${design.id === previewId ? "active" : ""}" data-design-preview="${html(design.id)}" data-design-name="${html(design.name)}" data-design-upgrade-type="${html(designUpgradeType(design))}" data-is-equipped="${design.id === activeDesign?.id ? "true" : "false"}">
                    <div class="car-piece-head">
                      <strong>${html(design.name)}</strong>
                      <span>${html(designMetaText(design))}</span>
                    </div>
                    ${renderStatsTable(design.stats, piece)}
                  </div>
                `).join("") : `<div class="empty">Sin disenos cargados para esta pieza.</div>`}
              </div>
            </div>

            ${renderDesignHistoryTable(designs, active[piece.id], currentId)}
          </section>
        `;
      }).join("")}

      <button type="submit" ${selectionOpen ? "" : "disabled"}>Guardar seleccion de coche</button>
      <p id="teamCarMessage" class="message"></p>
    </form>
  `;
}

function renderStatsTable(stats, piece) {
  const orderedStats = piece?.stats || Object.keys(stats || {});
  const entries = orderedStats
    .filter((stat) => Object.prototype.hasOwnProperty.call(stats || {}, stat))
    .map((stat) => [stat, stats[stat]]);
  if (!entries.length) {
    return `<div class="empty">Sin stats cargados.</div>`;
  }
  return `
    <div class="stats-table">
      ${entries.map(([stat, value]) => `
        <div>
          <span>${html(stat)}</span>
          <strong>${html(value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPieceDiffs(diffs) {
  if (!diffs.length) return `<span class="muted">Sin diferencias de stats</span>`;
  return `
    <div class="stat-diff-list">
      ${diffs.map((diff) => {
        const delta = diff.delta === null ? "" : ` <strong class="${statDeltaClass(diff.delta)}">${html(formatStatDelta(diff.delta))}</strong>`;
        return `<span>${html(diff.stat)}: ${html(formatStatValue(diff.selectedValue))}${delta}</span>`;
      }).join("")}
    </div>
  `;
}

function renderCarTotalsTable(review) {
  if (!review.statNames.length) return `<div class="empty">No hay stats suficientes para comparar.</div>`;
  return `
    <div class="table-wrap car-total-table">
      <table>
        <thead>
          <tr><th>Stat total</th><th>Equipado</th><th>Seleccionado</th><th>Diferencia</th><th>Ultima version</th></tr>
        </thead>
        <tbody>
          ${review.statNames.map((stat) => {
            const active = statNumber(review.activeStats[stat]);
            const selected = statNumber(review.selectedStats[stat]);
            const latest = statNumber(review.latestStats[stat]);
            const delta = active !== null && selected !== null ? statNumber(selected - active) : null;
            return `
              <tr>
                <td>${html(stat)}</td>
                <td>${html(formatStatValue(active))}</td>
                <td>${html(formatStatValue(selected))}</td>
                <td class="${html(statDeltaClass(delta))}">${html(delta === null ? "-" : formatStatDelta(delta))}</td>
                <td>${html(formatStatValue(latest))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCarPieceComparison(review) {
  return `
    <div class="table-wrap car-piece-compare-table">
      <table>
        <thead>
          <tr><th>Pieza</th><th>Equipada</th><th>Seleccionada</th><th>Ultima version</th><th>Diferencias</th></tr>
        </thead>
        <tbody>
          ${review.pieceRows.map((row) => {
            const changed = row.selectedDesign && row.selectedDesign.id !== row.activeDesign?.id;
            return `
              <tr class="${changed ? "selected-row" : ""}">
                <td><strong>${html(row.piece.name)}</strong></td>
                <td>${row.activeDesign ? html(row.activeDesign.name) : `<span class="negative">Sin equipar</span>`}</td>
                <td>${row.selectedDesign ? html(row.selectedDesign.name) : `<span class="warning-text">Sin seleccion</span>`}</td>
                <td>${row.latestDesign ? html(row.latestDesign.name) : "-"}</td>
                <td>${renderPieceDiffs(row.diffs)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderResearchAccumulation(teamId) {
  const rows = carPieces().map((piece) => {
    const researches = researchesForPiece(teamId, piece.id);
    const pending = researches.filter((research) => !research.appliedToSeasonId);
    const stats = accumulatedResearchStats(teamId, piece.id);
    return { piece, researches, pending, stats };
  }).filter((row) => row.researches.length || Object.keys(row.stats).length);

  if (!rows.length) {
    return `<div class="empty">Todavia no hay investigaciones cargadas.</div>`;
  }

  return `
    <div class="table-wrap research-table">
      <table>
        <thead><tr><th>Pieza</th><th>Pendientes</th><th>Acumulado util</th><th>Historial</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td><strong>${html(row.piece.name)}</strong></td>
              <td>${html(row.pending.length)}</td>
              <td>
                ${Object.keys(row.stats).length
                  ? Object.entries(row.stats).map(([stat, value]) => `${html(stat)}: +${html(formatStatValue(value))}`).join("<br>")
                  : "-"}
              </td>
              <td>
                ${row.researches.slice(-5).map((research) => `
                  ${html(research.name)} <span class="muted">(${html(formatDate(research.createdAtLabel || research.createdAt))})</span>
                `).join("<br>")}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCarComparison(teamId) {
  const review = carSelectionReview(teamId);
  const alertCount = review.missingDesigns.length + review.missingActive.length + review.missingSelected.length;
  return `
    <section class="car-comparison">
      <div class="car-piece-head">
        <div>
          <h4>Comparador de coche</h4>
          <p class="muted">Compara el coche equipado, la seleccion guardada para el proximo GP y la ultima version disenada.</p>
        </div>
        <span class="pill ${alertCount ? "warn-pill" : review.changedPieces.length ? "sprint-pill" : "done-pill"}">
          ${alertCount ? `${alertCount} alertas` : review.changedPieces.length ? `${review.changedPieces.length} cambios` : "Sin cambios"}
        </span>
      </div>
      <div class="car-compare-metrics">
        <div><span>Piezas equipadas</span><strong>${html(carPieces().length - review.missingActive.length)}/${html(carPieces().length)}</strong></div>
        <div><span>Cambios pendientes</span><strong>${html(review.changedPieces.length)}</strong></div>
        <div><span>Fabricacion estimada</span><strong>${moneyM(review.manufactureCostM)}</strong></div>
        <div><span>Disenos cargados</span><strong>${html(review.designCount)}</strong></div>
      </div>
      ${alertCount ? `
        <div class="car-alerts">
          ${review.missingDesigns.length ? `<span>Sin disenos: ${html(review.missingDesigns.map((piece) => piece.name).join(", "))}</span>` : ""}
          ${review.missingActive.length ? `<span>Sin pieza equipada: ${html(review.missingActive.map((piece) => piece.name).join(", "))}</span>` : ""}
          ${review.missingSelected.length ? `<span>Sin seleccion guardada: ${html(review.missingSelected.map((piece) => piece.name).join(", "))}</span>` : ""}
        </div>
      ` : ""}
      <h4 class="subsection-title">Totales del coche</h4>
      ${renderCarTotalsTable(review)}
      <h4 class="subsection-title">Comparacion por pieza</h4>
      ${renderCarPieceComparison(review)}
      <h4 class="subsection-title">Investigaciones acumuladas</h4>
      ${renderResearchAccumulation(teamId)}
    </section>
  `;
}

function renderDesignHistoryTable(designs, activeId, selectedId) {
  if (!designs.length) return "";
  return `
    <div class="table-wrap car-design-table">
      <table>
        <thead><tr><th>Version</th><th>Nombre</th><th>Tipo</th><th>Mejora</th><th>Pasos</th><th>Estado</th></tr></thead>
        <tbody>
          ${designs.map((design) => `
            <tr data-design-row="${html(design.id)}" class="${design.id === selectedId ? "selected-row" : ""}">
              <td>${html(design.legacyVersion || design.version || "-")}</td>
              <td>${html(design.name)}</td>
              <td>${design.mode === "research" ? "Investigacion" : "Diseno"}</td>
              <td>${html(designUpgradeType(design) || "-")}</td>
              <td>${html(design.steps ?? 0)}</td>
              <td>
                ${design.id === activeId ? `<span class="pill done-pill">Equipada</span>` : ""}
                ${design.id === selectedId && design.id !== activeId ? `<span class="pill sprint-pill">Seleccionada</span>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function snapshotStatTotals(pieces) {
  return pieces.reduce((total, piece) => addDesignStats(total, { stats: piece.stats || {} }), {});
}

function renderSnapshotStatTotals(stats) {
  const entries = Object.entries(stats || {}).sort(([a], [b]) => {
    if (a === "Duracion minima") return 1;
    if (b === "Duracion minima") return -1;
    return a.localeCompare(b);
  });
  if (!entries.length) return `<div class="empty">Sin stats guardados.</div>`;
  return `
    <div class="snapshot-stats-grid">
      ${entries.map(([stat, value]) => `
        <div><span>${html(stat)}</span><strong>${html(formatStatValue(value))}</strong></div>
      `).join("")}
    </div>
  `;
}

function renderCarSnapshots(teamId) {
  const snapshots = Object.values(carDoc(teamId).raceSnapshots || {})
    .sort((a, b) => String(a.raceId || "").localeCompare(String(b.raceId || "")));

  if (!snapshots.length) {
    return `<div class="empty">Todavia no hay snapshots de carrera guardados.</div>`;
  }

  return `
    <div class="snapshot-card-list">
      ${snapshots.map((snapshot) => {
        const pieces = Object.values(snapshot.pieces || {});
        const changed = snapshot.changedPieces || [];
        const weights = snapshot.weights || null;
        const weightPieces = weights?.pieces ? Object.values(weights.pieces) : [];
        const engine = snapshot.engine || null;
        const engineStats = engine?.stats
          ? engineStats().filter((stat) => Object.prototype.hasOwnProperty.call(engine.stats, stat.id))
          : [];
        const statTotals = snapshotStatTotals(pieces);
        return `
          <article class="snapshot-card">
            <div class="card-header">
              <div>
                <h4>${html(snapshot.raceLabel || snapshot.raceId)}</h4>
                <p class="muted">${changed.length ? `${changed.length} cambios aplicados` : "Sin cambios de piezas"} - Fabricacion ${moneyM(snapshot.manufactureCostM || 0)}</p>
              </div>
              <span class="pill">${html(snapshot.seasonId || activeSeasonId())}</span>
            </div>
            <div class="snapshot-layout">
              <section>
                <h5>Piezas</h5>
                <div class="snapshot-piece-list">
                  ${pieces.length ? pieces.map((piece) => `
                    <div class="${changed.includes(piece.pieceId) ? "changed" : ""}">
                      <strong>${html(piece.pieceName)}</strong>
                      <span>${html(piece.designName)}${piece.upgradeType ? ` - ${html(piece.upgradeType)}` : ""}</span>
                    </div>
                  `).join("") : `<div class="empty">Sin piezas guardadas.</div>`}
                </div>
              </section>
              <section>
                <h5>Totales de stats</h5>
                ${renderSnapshotStatTotals(statTotals)}
              </section>
              <section>
                <h5>Peso</h5>
                ${weights ? `
                  <p class="snapshot-main-value">${formatKg(weights.totalWeightKg)}</p>
                  <div class="snapshot-mini-list">
                    ${weightPieces.map((piece) => `<span>${html(piece.pieceName)}: N${html(piece.level)}</span>`).join("")}
                  </div>
                ` : `<div class="empty">Sin peso guardado.</div>`}
              </section>
              <section>
                <h5>Motor</h5>
                ${engine ? `
                  <p class="snapshot-main-value">${html(engine.engineName || "-")}</p>
                  <span class="muted">${html(teamName(engine.motoristId))}</span>
                  ${engineStats.length ? `
                    <div class="snapshot-mini-list">
                      ${engineStats.map((stat) => `<span>${html(stat.name)}: ${html(engine.stats[stat.id])}</span>`).join("")}
                    </div>
                  ` : ""}
                ` : `<div class="empty">Sin motor guardado.</div>`}
              </section>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderDevelopmentLimit(summary) {
  const bar = Math.min(100, Math.max(0, summary.percent));
  const message = summary.status === "over"
    ? "Limite superado. Revisa sancion o ajuste manual."
    : summary.status === "warn"
      ? "Cerca del limite. Conviene revisar antes de aprobar nuevos gastos."
      : "Dentro del limite.";

  return `
    <div class="limit-panel ${html(summary.status)}">
      <div class="limit-track"><span style="width: ${html(bar)}%"></span></div>
      <div class="metrics">
        <div><span>Gastado</span><strong>${moneyM(summary.spentM)}</strong></div>
        <div><span>Limite</span><strong>${moneyM(summary.limitM)}</strong></div>
        <div><span>Restante</span><strong>${moneyM(summary.remainingM)}</strong></div>
      </div>
      <p class="message">${html(message)}</p>
    </div>
  `;
}

function renderDevelopmentAdminTable(teams) {
  const rows = teams
    .map((team) => ({ team, summary: developmentSummary(team.id) }))
    .sort((a, b) => b.summary.percent - a.summary.percent);

  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Equipo</th><th>Gastado</th><th>Restante</th><th>Uso</th><th>Estado</th></tr></thead>
        <tbody>
          ${rows.map(({ team, summary }) => `
            <tr>
              <td><strong>${html(team.name)}</strong></td>
              <td>${moneyM(summary.spentM)}</td>
              <td class="${summary.remainingM < 0 ? "negative" : "positive"}">${moneyM(summary.remainingM)}</td>
              <td>
                <div class="mini-limit ${html(summary.status)}">
                  <span style="width: ${html(Math.min(100, Math.max(0, summary.percent)))}%"></span>
                </div>
                ${html(summary.percent)}%
              </td>
              <td class="${summary.status === "over" ? "negative" : summary.status === "warn" ? "warning-text" : "positive"}">
                ${summary.status === "over" ? "Superado" : summary.status === "warn" ? "Cerca" : "OK"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRaceWindowAdmin() {
  const races = cache.calendar.length ? cache.calendar : window.LFM_SEED.calendar || [];
  const raceWindow = currentRaceWindow();
  const suggestedRace = races.find((race) => !race.completed) || races[0];
  const selectedRaceId = raceWindow.raceId || suggestedRace?.id || "";
  const developmentOpen = isDevelopmentWindowOpen();
  const selectionOpen = isSelectionWindowOpen();
  const anyOpen = isAnyCarWindowOpen();
  const requestTeams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
  const pendingCarCount = allPendingCarRequests(requestTeams).length;
  const pendingWeightCount = allPendingWeightRequests(requestTeams).length;
  const pendingEngineCount = allPendingEngineRequests(requestTeams).length;
  const pendingCount = pendingCarCount + pendingWeightCount + pendingEngineCount;

  if (!races.length) {
    return `<div class="empty">Todavia no hay calendario cargado.</div>`;
  }

  return `
    <section class="form race-window-panel">
      <div class="race-window-status ${anyOpen ? "open" : ""}">
        <span>Estado actual</span>
        <strong>${anyOpen ? `${html(currentCarWindowStatusText())}: ${html(currentRaceWindowLabel())}` : "Cerrado"}</strong>
      </div>
      <label>Ronda
        <select id="raceWindowRace" ${anyOpen ? "disabled" : ""}>
          ${races.map((race) => `
            <option value="${html(race.id)}" ${race.id === selectedRaceId ? "selected" : ""}>
              ${html(raceLabel(race))}
            </option>
          `).join("")}
        </select>
      </label>
      <section class="grid two flat-grid">
        <div class="race-window-status ${developmentOpen ? "open" : ""}">
          <span>Plazo de mejoras</span>
          <strong>${developmentOpen ? `Abierto para ${html(currentRaceWindowLabel())}` : "Cerrado"}</strong>
        </div>
        <div class="race-window-status ${selectionOpen ? "open" : ""}">
          <span>Plazo de seleccion</span>
          <strong>${selectionOpen ? `Abierto para ${html(currentRaceWindowLabel())}` : "Cerrado"}</strong>
        </div>
      </section>
      <div class="button-row">
        <button id="openDevelopmentWindowBtn" type="button" ${anyOpen ? "disabled" : ""}>Abrir mejoras</button>
        <button id="closeDevelopmentWindowBtn" class="ghost" type="button" ${developmentOpen ? "" : "disabled"}>Cerrar mejoras</button>
        <button id="openSelectionWindowBtn" type="button" ${anyOpen || pendingCount ? "disabled" : ""}>Abrir seleccion</button>
        <button id="closeRaceWindowBtn" class="ghost" type="button" ${selectionOpen ? "" : "disabled"}>Cerrar seleccion y aplicar</button>
      </div>
      ${pendingCount ? `<p class="warning-text">No puedes abrir seleccion: quedan ${html(pendingCarCount)} solicitudes de coche, ${html(pendingWeightCount)} de peso y ${html(pendingEngineCount)} de motor pendientes.</p>` : ""}
      <p id="raceWindowMessage" class="message"></p>
    </section>
  `;
}

function renderTeamOptions(teams, selectedId = "") {
  return `
    <option value="">-</option>
    ${teams.map((team) => `<option value="${html(team.id)}" ${team.id === selectedId ? "selected" : ""}>${html(team.name)}</option>`).join("")}
  `;
}

function renderRaceOptions(selectedId = "", { sprintOnly = false } = {}) {
  const races = sprintOnly ? racesList().filter((race) => race.hasSprint) : racesList();
  return `
    <option value="">Elegir GP</option>
    ${races.map((race) => `
      <option value="${html(race.id)}" ${race.id === selectedId ? "selected" : ""}>
        ${html(raceLabel(race))}
      </option>
    `).join("")}
  `;
}

function renderAwardPayoutInputs(kind, values, count) {
  return `
    <div class="award-position-grid">
      ${Array.from({ length: count }, (_, index) => `
        <label>P${index + 1}
          <input data-award-setting="${html(kind)}" type="number" min="0" step="0.001" value="${html(values[index] || 0)}" />
        </label>
      `).join("")}
    </div>
  `;
}

function renderAwardResultRows(kind, values, count, teams) {
  return `
    <div class="award-result-grid">
      ${Array.from({ length: count }, (_, index) => `
        <div class="award-result-row">
          <span>P${index + 1}</span>
          <select data-award-control data-award-${html(kind)}-position="${index + 1}">
            ${renderTeamOptions(teams)}
          </select>
          <small>${moneyM(values[index] || 0)}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderRaceAwardsAdmin(teams) {
  const settings = awardSettings();
  const races = racesList();
  const suggestedRace = races.find((race) => !race.completed) || races[0];

  if (!races.length) {
    return `<div class="empty">Todavia no hay calendario cargado.</div>`;
  }

  return `
    <div class="award-admin">
      ${cache.awardsLoadError ? `<p class="message error">${html(cache.awardsLoadError)} Publica las reglas de premios antes de guardar o aplicar.</p>` : ""}

      <form id="awardSettingsForm" class="form">
        <h4 class="subsection-title">Tabla de premios por temporada</h4>
        <p class="muted">Guarda importes en M. Los valores en cero no se aplican.</p>
        <div class="award-settings-layout">
          <div>
            <h5>Carrera</h5>
            ${renderAwardPayoutInputs("race", settings.racePositionM, 20)}
          </div>
          <div>
            <h5>Sprint</h5>
            ${renderAwardPayoutInputs("sprint", settings.sprintPositionM, 8)}
            <div class="award-bonus-grid">
              <label>Pole
                <input id="awardPoleM" type="number" min="0" step="0.001" value="${html(settings.poleM)}" />
              </label>
              <label>Vuelta rapida
                <input id="awardFastestLapM" type="number" min="0" step="0.001" value="${html(settings.fastestLapM)}" />
              </label>
            </div>
          </div>
        </div>
        <button type="submit" class="ghost">Guardar tabla de premios</button>
        <p id="awardSettingsMessage" class="message"></p>
      </form>

      <div class="form-divider"></div>

      <form id="raceAwardForm" class="form">
        <h4 class="subsection-title">Aplicar premios de GP</h4>
        <label>GP
          <select id="awardRace" data-award-control>
            ${races.map((race) => `
              <option value="${html(race.id)}" ${race.id === suggestedRace?.id ? "selected" : ""}>
                ${html(raceLabel(race))}
              </option>
            `).join("")}
          </select>
        </label>

        <div class="award-settings-layout">
          <div>
            <h5>Resultado de carrera</h5>
            ${renderAwardResultRows("race", settings.racePositionM, 20, teams)}
          </div>
          <div>
            <h5>Resultado sprint</h5>
            ${renderAwardResultRows("sprint", settings.sprintPositionM, 8, teams)}
            <div class="award-bonus-grid">
              <label>Pole
                <select id="awardPoleTeam" data-award-control>${renderTeamOptions(teams)}</select>
              </label>
              <label>Vuelta rapida
                <select id="awardFastestLapTeam" data-award-control>${renderTeamOptions(teams)}</select>
              </label>
            </div>
          </div>
        </div>

        <h5>Premios especiales</h5>
        <div class="award-special-grid">
          ${[1, 2, 3].map((row) => `
            <div class="award-special-row" data-award-special-row>
              <input data-award-control data-award-special-concept placeholder="Constructores, paradas..." />
              <select data-award-control data-award-special-team>${renderTeamOptions(teams)}</select>
              <input data-award-control data-award-special-amount type="number" min="0" step="0.001" placeholder="Monto M" />
            </div>
          `).join("")}
        </div>

        <label class="check-row"><input id="awardMarkCompleted" type="checkbox" /> Marcar GP como completado al aplicar</label>
        <div id="raceAwardPreview" class="award-preview">
          <div class="empty">Carga posiciones o bonos y toca previsualizar.</div>
        </div>
        <div class="button-row">
          <button id="awardPreviewBtn" class="ghost" type="button">Previsualizar premios</button>
          <button type="submit">Aplicar premios</button>
        </div>
        <p id="raceAwardMessage" class="message"></p>
      </form>

      <div class="form-divider"></div>
      <h4 class="subsection-title">Premios por JSON importado</h4>
      <p class="muted">Usa las importaciones de Admin > Constructores. La app paga posiciones y vuelta rapida; la pole queda manual.</p>
      ${renderJsonAwardImports(constructorResultImports())}
      <p id="jsonAwardMessage" class="message"></p>

      <div class="form-divider"></div>
      <h4 class="subsection-title">Historial aplicado</h4>
      ${renderRaceAwardsHistory()}
    </div>
  `;
}

function renderRaceAwardsHistory(limit = 8) {
  if (cache.awardsLoadError) {
    return `<div class="empty">${html(cache.awardsLoadError)} Revisa las reglas publicadas.</div>`;
  }

  const awards = cache.raceAwards.slice(0, limit);
  if (!awards.length) {
    return `<div class="empty">Todavia no hay tandas de premios aplicadas.</div>`;
  }

  return `
    <div class="table-wrap award-history-table">
      <table>
        <thead><tr><th>Fecha</th><th>GP</th><th>Total</th><th>Equipos</th></tr></thead>
        <tbody>
          ${awards.map((award) => `
            <tr>
              <td>${formatDate(award.createdAt)}</td>
              <td>
                <strong>${html(award.raceLabel || award.raceGp || award.raceId || "-")}</strong>
                ${award.reversed ? `<small>Revertido ${html(formatDate(award.reversedAt || award.reversedAtLabel))}</small>` : ""}
              </td>
              <td class="${award.reversed ? "negative" : ""}">${award.reversed ? `-${moneyM(award.totalM || 0)}` : moneyM(award.totalM || 0)}</td>
              <td>${html((award.totals || []).map((item) => `${item.teamName || teamName(item.teamId)} ${moneyM(item.amountM)}`).join(" - ") || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderJsonAwardImports(importedRaces) {
  if (cache.constructorChampionshipLoadError) {
    return `<div class="empty">${html(cache.constructorChampionshipLoadError)} Revisa constructores antes de aplicar premios por JSON.</div>`;
  }
  if (!importedRaces.length) {
    return `<div class="empty">Todavia no hay JSON importados en constructores.</div>`;
  }

  return `
    <div class="json-award-list">
      ${importedRaces.slice().reverse().map((item) => {
        let draft = null;
        let preview = "";
        let error = "";
        try {
          draft = jsonAwardDraft(item);
          preview = renderAwardPreview(draft);
        } catch (draftError) {
          error = translateError(draftError);
          preview = `<div class="empty">${html(error)}</div>`;
        }
        const record = jsonAwardRecord(item, { includeReversed: true });
        const activeRecord = jsonAwardRecord(item);
        const applied = jsonAwardsApplied(item);
        const reverted = jsonAwardsReverted(item);
        const appliedMeta = item.economicAwards || {};
        const displayTotal = positiveMoneyValue(
          applied
            ? appliedMeta.totalM ?? activeRecord?.totalM ?? draft?.totalM ?? 0
            : reverted
              ? appliedMeta.reversedTotalM ?? record?.totalM ?? draft?.totalM ?? 0
              : draft?.totalM ?? 0
        );
        const statusLabel = applied
          ? `Aplicado ${moneyM(displayTotal)}`
          : reverted
            ? `Revertido ${moneyM(displayTotal)}`
            : draft?.items.length ? `Pendiente ${moneyM(draft.totalM)}` : "Sin premios configurados";
        const statusClass = applied ? "done-pill" : reverted ? "danger-pill" : draft?.items.length ? "warn-pill" : "";
        return `
          <article class="json-award-card">
            <div class="json-award-head">
              <div>
                <strong>${html(draft?.raceLabel || jsonAwardRaceLabel(item))}</strong>
                <span>${html(item.kindLabel || constructorImportKindLabel(item.kind))} - ${html(item.fileName || "-")}</span>
              </div>
              <span class="pill ${statusClass}">${html(statusLabel)}</span>
            </div>
            ${preview}
            <div class="button-row">
              <button
                type="button"
                class="ghost"
                data-apply-json-awards="${html(item.id)}"
                ${applied || !draft?.items.length ? "disabled" : ""}
              >
                ${applied ? "Premios aplicados" : reverted ? "Aplicar de nuevo" : "Aplicar premios JSON"}
              </button>
              ${applied ? `
                <button
                  type="button"
                  class="ghost danger-action"
                  data-revert-json-awards="${html(item.id)}"
                >
                  Revertir premios
                </button>
              ` : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderMotoristTeamOptions(entry, selectedId = "") {
  return `
    <option value="">-</option>
    ${entry.teamIds.map((teamId) => `<option value="${html(teamId)}" ${teamId === selectedId ? "selected" : ""}>${html(teamName(teamId))}</option>`).join("")}
  `;
}

function renderMotoristRoundInputs(raceId) {
  return `
    <div class="motorist-input-grid">
      ${motoristEntries().map((entry) => {
        const result = motoristResultFor(entry.motoristId, raceId);
        return `
          <div class="motorist-input-row" data-motorist-row="${html(entry.motoristId)}">
            <div>
              <strong>${html(entry.motoristName)}</strong>
              <span>${html(entry.teamNames.join(" / "))}</span>
            </div>
            <label>Principal
              <input data-motorist-principal data-motorist-id="${html(entry.motoristId)}" type="number" step="1" value="${html(result.principal)}" />
            </label>
            <label>Extra
              <input data-motorist-extra data-motorist-id="${html(entry.motoristId)}" type="number" step="1" value="${html(result.extra)}" />
            </label>
            <label>Mejor equipo
              <select data-motorist-best-team data-motorist-id="${html(entry.motoristId)}">
                ${renderMotoristTeamOptions(entry, result.bestTeamId)}
              </select>
            </label>
            <label>Posicion
              <input data-motorist-best-position data-motorist-id="${html(entry.motoristId)}" type="number" min="1" step="1" value="${html(result.bestPosition || "")}" />
            </label>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderMotoristChampionshipAdmin() {
  if (cache.motoristChampionshipLoadError) {
    return `<div class="empty">${html(cache.motoristChampionshipLoadError)} Publica las reglas de motoristas antes de editar.</div>`;
  }

  const races = racesList();
  const selectedRace = races.find((race) => !race.completed) || races[0];
  if (!races.length) {
    return `<div class="empty">Todavia no hay calendario cargado.</div>`;
  }

  return `
    <div class="motorist-admin">
      <p class="muted">Solo puntua el mejor coche de cada grupo motorista+cliente. La tabla usa puntos F1 por posicion.</p>

      <form id="motoristJsonImportForm" class="form import-box">
        <label>Importar JSON de carrera
          <input id="motoristJsonFile" type="file" accept=".json,application/json" required />
        </label>
        <button type="submit" class="ghost">Calcular desde JSON</button>
      </form>
      <p id="motoristImportMessage" class="message"></p>

      <form id="motoristChampionshipForm" class="form">
        <label>GP
          <select id="motoristRace">
            ${races.map((race) => `
              <option value="${html(race.id)}" ${race.id === selectedRace?.id ? "selected" : ""}>
                ${html(raceLabel(race))}
              </option>
            `).join("")}
          </select>
        </label>
        <div id="motoristRoundInputs">
          ${renderMotoristRoundInputs(selectedRace?.id || races[0].id)}
        </div>
        <button type="submit">Guardar resultado motoristas</button>
        <p id="motoristMessage" class="message"></p>
      </form>

      <div class="form-divider"></div>
      <h4 class="subsection-title">Tabla actual</h4>
      ${renderPublicMotoristChampionship()}
    </div>
  `;
}

function renderConstructorPredictionPickFields(teams, picks = []) {
  const selected = normalizeConstructorPredictionPicks(picks);
  return `
    <div class="prediction-pick-grid">
      ${teams.map((_, index) => `
        <label>P${index + 1}
          <select data-constructor-prediction-pick>
            <option value="">Elegir equipo</option>
            ${teams.map((team) => `<option value="${html(team.id)}" ${selected[index] === team.id ? "selected" : ""}>${html(team.name)}</option>`).join("")}
          </select>
        </label>
      `).join("")}
    </div>
  `;
}

function renderConstructorChampionshipAdmin(teams) {
  if (cache.constructorChampionshipLoadError) {
    return `<div class="empty">${html(cache.constructorChampionshipLoadError)} Publica las reglas de constructores antes de editar.</div>`;
  }
  if (cache.constructorPointSystemLoadError) {
    return `<div class="empty">${html(cache.constructorPointSystemLoadError)} Publica las reglas de puntos de constructores antes de importar JSONs.</div>`;
  }

  const rows = currentConstructorChampionship().standings;
  const importedRaces = currentConstructorChampionship().importedRaces || [];
  const byTeam = new Map(rows.map((row) => [row.teamId, row]));
  return `
    <form id="constructorPointSystemForm" class="form">
      <p class="muted">Define cuantos puntos recibe cada posicion del JSON. Si una posicion queda en 0, no suma.</p>
      <section class="grid two flat-grid">
        ${renderConstructorPointEditor("race", "Puntos carrera larga", "Normal por ahora: top 10 con 25, 18, 15, 12, 10, 8, 6, 4, 2, 1.")}
        ${renderConstructorPointEditor("sprint", "Puntos sprint", "Formato real sprint: top 8 con 8, 7, 6, 5, 4, 3, 2, 1.")}
      </section>
      <section class="grid two flat-grid">
        <label>Puntos por vuelta rapida en carrera larga
          <input id="constructorFastestLapRace" type="number" min="0" step="0.001" value="${html(constructorFastestLapPoints("race"))}" />
        </label>
        <label>Puntos por vuelta rapida en sprint
          <input id="constructorFastestLapSprint" type="number" min="0" step="0.001" value="${html(constructorFastestLapPoints("sprint"))}" />
        </label>
      </section>
      <button type="submit">Guardar sistema de puntos</button>
      <p id="constructorPointSystemMessage" class="message"></p>
    </form>

    <div class="form-divider"></div>
    <section class="grid two flat-grid">
      <form class="form import-box" data-constructor-json-import-form data-constructor-import-kind="race">
        <h4 class="subsection-title">Cargar carrera larga</h4>
        <p class="muted">Usa esta tabla: ${html(constructorPointsSummary("race"))}.</p>
        <label>GP
          <select data-constructor-race-id required>
            ${renderRaceOptions()}
          </select>
        </label>
        <label>JSON de carrera
          <input data-constructor-json-file type="file" accept=".json,application/json" required />
        </label>
        <button type="submit">Importar carrera larga</button>
        <p class="message" data-constructor-import-message></p>
      </form>

      <form class="form import-box" data-constructor-json-import-form data-constructor-import-kind="sprint">
        <h4 class="subsection-title">Cargar sprint</h4>
        <p class="muted">Usa esta tabla: ${html(constructorPointsSummary("sprint"))}.</p>
        <label>GP con sprint
          <select data-constructor-race-id required>
            ${renderRaceOptions("", { sprintOnly: true })}
          </select>
        </label>
        <label>JSON de sprint
          <input data-constructor-json-file type="file" accept=".json,application/json" required />
        </label>
        <button type="submit">Importar sprint</button>
        <p class="message" data-constructor-import-message></p>
      </form>
    </section>

    ${renderConstructorImportedRaces(importedRaces)}

    <div class="form-divider"></div>
    <form id="constructorChampionshipForm" class="form">
      <p class="muted">Actualiza la clasificacion real de constructores. Al guardar, las predicciones se recalculan automaticamente contra estas posiciones.</p>
      <div class="table-wrap constructor-standings-table">
        <table>
          <thead>
            <tr><th>Equipo</th><th>Posicion</th><th>Puntos reales</th><th>Nota</th></tr>
          </thead>
          <tbody>
            ${teams.map((team, index) => {
              const row = byTeam.get(team.id) || { position: index + 1, points: 0, note: "" };
              return `
                <tr data-constructor-standing-row="${html(team.id)}">
                  <td><strong>${html(team.name)}</strong></td>
                  <td><input data-constructor-standing-position type="number" min="1" max="${teams.length}" step="1" value="${html(row.position)}" required /></td>
                  <td><input data-constructor-standing-points type="number" min="0" step="1" value="${html(row.points)}" required /></td>
                  <td><input data-constructor-standing-note value="${html(row.note || "")}" placeholder="Opcional" /></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <button type="submit">Guardar constructores y recalcular predicciones</button>
      <p id="constructorChampionshipMessage" class="message"></p>
    </form>

    <div class="form-divider"></div>
    <h4 class="subsection-title">Tabla publica actual</h4>
    ${renderPublicConstructorChampionship()}
  `;
}

function renderConstructorPointEditor(kind, title, note) {
  return `
    <div class="point-system-card">
      <h4 class="subsection-title">${html(title)}</h4>
      <p class="muted">${html(note)}</p>
      <div class="constructor-point-grid">
        ${constructorPointsTable(kind).map((points, index) => `
          <label>P${index + 1}
            <input
              data-constructor-point-kind="${html(kind)}"
              data-constructor-point-position="${index + 1}"
              type="number"
              min="0"
              step="0.001"
              value="${html(points)}"
            />
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderConstructorImportedRaces(importedRaces) {
  if (!importedRaces.length) {
    return `<div class="empty">Todavia no hay JSON importados para constructores.</div>`;
  }

  return `
    <div class="table-wrap constructor-imports-table">
      <table>
        <thead>
          <tr><th>Tipo</th><th>Carrera</th><th>Archivo</th><th>Puntos sumados</th><th>Premios</th><th></th></tr>
        </thead>
        <tbody>
          ${importedRaces.slice().reverse().map((item) => {
            const points = item.pointsByTeam || {};
            const summary = Object.entries(points)
              .filter(([, value]) => Number(value || 0) > 0)
              .map(([teamId, value]) => `${teamName(teamId)} +${value}`)
              .join(" - ");
            const awardStatus = jsonAwardStatus(item);
            const cannotRevert = awardStatus.state === "applied";
            return `
              <tr>
                <td>${html(item.kindLabel || constructorImportKindLabel(item.kind))}</td>
                <td>${html(item.raceGp ? `R${item.raceRound || "-"} - ${item.raceGp}` : item.trackName || "-")}</td>
                <td>${html(item.fileName || "-")}</td>
                <td>${html(summary || "-")}</td>
                <td><span class="pill ${awardStatus.className}">${html(awardStatus.label)}</span></td>
                <td>
                  <button
                    type="button"
                    class="ghost danger-action"
                    data-revert-constructor-import="${html(item.id)}"
                    ${cannotRevert ? "disabled" : ""}
                    title="${cannotRevert ? "Primero revierte premios en Admin > Premios" : "Revertir resultado deportivo"}"
                  >
                    Revertir
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderConstructorPredictionsAdmin(teams) {
  if (cache.constructorPredictionsLoadError) {
    return `<div class="empty">${html(cache.constructorPredictionsLoadError)} Publica las reglas de predicciones antes de editar.</div>`;
  }

  const predictions = currentConstructorPredictions();
  const entries = constructorPredictionStandings();
  return `
    <div class="constructor-predictions-admin">
      <form id="constructorPredictionSettingsForm" class="form compact-form">
        <label>Estado
          <select id="constructorPredictionStatus">
            <option value="abierto" ${predictions.status === "abierto" ? "selected" : ""}>Abierto</option>
            <option value="cerrado" ${predictions.status === "cerrado" ? "selected" : ""}>Cerrado</option>
            <option value="finalizado" ${predictions.status === "finalizado" ? "selected" : ""}>Finalizado</option>
          </select>
        </label>
        <button type="submit" class="ghost">Guardar estado</button>
        <p id="constructorPredictionSettingsMessage" class="message"></p>
      </form>

      <div class="form-divider"></div>
      <p class="muted">Los votos los carga cada usuario habilitado desde Liga publica > Predicciones. El ranking se calcula automaticamente con Admin > Constructores.</p>
      <h4 class="subsection-title">Votos y ranking calculado</h4>
      ${entries.length ? `
        <div class="table-wrap constructor-predictions-table">
          <table>
            <thead>
              <tr><th>Participante</th><th>Puntos</th><th>Aciertos</th><th>Prediccion</th><th></th></tr>
            </thead>
            <tbody>
              ${entries.map((entry) => `
                <tr data-constructor-prediction-row="${html(entry.id)}">
                  <td>
                    <strong>${html(entry.participantName)}</strong>
                    <small>${entry.linkedTeamId ? html(teamName(entry.linkedTeamId)) : "Publico"}</small>
                    <small><code>${html(entry.uid || entry.id)}</code></small>
                  </td>
                  <td><strong>${html(entry.points)}</strong></td>
                  <td>${html(entry.correctHits)}</td>
                  <td>${html(constructorPredictionPickText(entry.picks))}</td>
                  <td><button type="button" class="ghost" data-delete-constructor-prediction="${html(entry.id)}">Borrar</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Todavia no hay predicciones cargadas.</div>`}
    </div>
  `;
}

function updateMotoristRoundInputs() {
  const target = $("motoristRoundInputs");
  const raceId = $("motoristRace")?.value || racesList()[0]?.id || "";
  if (target) target.innerHTML = renderMotoristRoundInputs(raceId);
}

function fillMotoristRoundInputs(calculated) {
  calculated.forEach((result) => {
    const id = CSS.escape(result.motoristId);
    const principal = document.querySelector(`[data-motorist-principal][data-motorist-id="${id}"]`);
    const extra = document.querySelector(`[data-motorist-extra][data-motorist-id="${id}"]`);
    const bestTeam = document.querySelector(`[data-motorist-best-team][data-motorist-id="${id}"]`);
    const bestPosition = document.querySelector(`[data-motorist-best-position][data-motorist-id="${id}"]`);
    if (principal) principal.value = result.principal;
    if (extra) extra.value = result.extra;
    if (bestTeam) bestTeam.value = result.bestTeamId || "";
    if (bestPosition) bestPosition.value = result.bestPosition || "";
  });
}

async function importMotoristRaceJson(event) {
  event.preventDefault();
  showMessage($("motoristImportMessage"), "");
  const stop = setLoading(event.submitter, "Calculando...");
  try {
    const file = $("motoristJsonFile").files?.[0];
    if (!file) throw new Error("Selecciona un JSON de carrera.");
    const data = JSON.parse(await file.text());
    const calculated = calculateMotoristResultsFromRaceJson(data);
    fillMotoristRoundInputs(calculated);
    const summary = calculated
      .map((item) => `${teamName(item.motoristId)} ${item.principal} pts${item.bestTeamId ? ` (${teamName(item.bestTeamId)} P${item.bestPosition})` : ""}`)
      .join(" - ");
    showMessage($("motoristImportMessage"), `Calculado desde ${data.TrackName || file.name}: ${summary}`, "success");
  } catch (error) {
    showMessage($("motoristImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function readMotoristRoundForm() {
  const raceId = $("motoristRace").value;
  const race = raceById(raceId);
  if (!race) throw new Error("Selecciona un GP valido.");

  const entries = motoristEntries().map((entry) => {
    const id = CSS.escape(entry.motoristId);
    const principal = Number(document.querySelector(`[data-motorist-principal][data-motorist-id="${id}"]`)?.value || 0);
    const extra = Number(document.querySelector(`[data-motorist-extra][data-motorist-id="${id}"]`)?.value || 0);
    const bestTeamId = document.querySelector(`[data-motorist-best-team][data-motorist-id="${id}"]`)?.value || "";
    const bestPositionRaw = document.querySelector(`[data-motorist-best-position][data-motorist-id="${id}"]`)?.value || "";
    const bestPosition = bestPositionRaw ? Number(bestPositionRaw) : null;

    if (!Number.isInteger(principal) || !Number.isInteger(extra)) {
      throw new Error(`Los puntos de ${entry.motoristName} deben ser enteros.`);
    }
    if (bestPosition !== null && (!Number.isInteger(bestPosition) || bestPosition < 1)) {
      throw new Error(`La posicion de ${entry.motoristName} no es valida.`);
    }

    return {
      motoristId: entry.motoristId,
      result: {
        principal,
        extra,
        bestTeamId,
        bestPosition,
        source: "manual"
      }
    };
  });

  return { race, entries };
}

async function saveMotoristChampionshipRound(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("motoristMessage"), "");
  try {
    const { race, entries } = readMotoristRoundForm();
    const championship = currentMotoristChampionship();
    const nextResults = JSON.parse(JSON.stringify(championship.results || {}));
    entries.forEach(({ motoristId, result }) => {
      nextResults[motoristId] = {
        ...(nextResults[motoristId] || {}),
        [race.id]: result
      };
    });

    await db.collection("lfm_motoristChampionships").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      pointsByPosition: championship.pointsByPosition,
      results: nextResults,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("motoristMessage"), `Resultado de ${raceLabel(race)} guardado.`, "success");
    await loadMotoristChampionshipData();
    render();
  } catch (error) {
    showMessage($("motoristMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function readConstructorChampionshipForm() {
  const teamCount = (cache.teams.length ? cache.teams : window.LFM_SEED.teams).length;
  const positions = new Set();
  const standings = Array.from(document.querySelectorAll("[data-constructor-standing-row]"))
    .map((row) => {
      const teamId = row.dataset.constructorStandingRow;
      const position = Number(row.querySelector("[data-constructor-standing-position]").value || 0);
      const points = Number(row.querySelector("[data-constructor-standing-points]").value || 0);
      const note = row.querySelector("[data-constructor-standing-note]").value.trim();

      if (!cache.teamMap.get(teamId)) throw new Error("Equipo de constructores no valido.");
      if (!Number.isInteger(position) || position < 1 || position > teamCount) {
        throw new Error(`La posicion de ${teamName(teamId)} no es valida.`);
      }
      if (positions.has(position)) throw new Error(`La posicion ${position} esta repetida.`);
      positions.add(position);
      if (!Number.isFinite(points) || points < 0) {
        throw new Error(`Los puntos de ${teamName(teamId)} no son validos.`);
      }

      return { teamId, position, points, note };
    });

  if (standings.length !== teamCount) throw new Error("Faltan equipos en constructores.");
  return normalizeConstructorStandings(standings);
}

function readConstructorPointArray(kind) {
  const inputs = Array.from(document.querySelectorAll(`[data-constructor-point-kind="${kind}"]`))
    .sort((a, b) => Number(a.dataset.constructorPointPosition) - Number(b.dataset.constructorPointPosition));

  if (!inputs.length) {
    throw new Error(`Falta la tabla de puntos para ${constructorImportKindLabel(kind).toLowerCase()}.`);
  }

  return inputs.map((input) => {
    const position = Number(input.dataset.constructorPointPosition || 0);
    const value = Number(input.value || 0);
    if (!Number.isInteger(position) || position < 1) {
      throw new Error("Hay una posicion de puntos no valida.");
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Los puntos de P${position} no son validos.`);
    }
    return Math.round(value * 1000) / 1000;
  });
}

function readConstructorPointInput(id, label) {
  const value = Number($(id)?.value || 0);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} no es valido.`);
  }
  return Math.round(value * 1000) / 1000;
}

function standingsAfterConstructorImport(importResult) {
  const current = currentConstructorChampionship();
  const byTeam = new Map(current.standings.map((row) => [row.teamId, row]));
  const ordered = (cache.teams.length ? cache.teams : window.LFM_SEED.teams)
    .map((team) => {
      const row = byTeam.get(team.id) || { teamId: team.id, points: 0, note: "" };
      return {
        teamId: team.id,
        points: Number(row.points || 0) + Number(importResult.pointsByTeam?.[team.id] || 0),
        note: row.note || ""
      };
    })
    .sort((a, b) => b.points - a.points || teamName(a.teamId).localeCompare(teamName(b.teamId)))
    .map((row, index) => ({ ...row, position: index + 1 }));

  return normalizeConstructorStandings(ordered);
}

function standingsAfterConstructorRevert(importedRace) {
  const current = currentConstructorChampionship();
  const byTeam = new Map(current.standings.map((row) => [row.teamId, row]));
  const ordered = (cache.teams.length ? cache.teams : window.LFM_SEED.teams)
    .map((team) => {
      const row = byTeam.get(team.id) || { teamId: team.id, points: 0, note: "" };
      const nextPoints = Number(row.points || 0) - Number(importedRace.pointsByTeam?.[team.id] || 0);
      return {
        teamId: team.id,
        points: Math.max(0, Math.round(nextPoints * 1000) / 1000),
        note: row.note || ""
      };
    })
    .sort((a, b) => b.points - a.points || teamName(a.teamId).localeCompare(teamName(b.teamId)))
    .map((row, index) => ({ ...row, position: index + 1 }));

  return normalizeConstructorStandings(ordered);
}

async function syncConstructorPredictionScores() {
  if (!isAdmin() || !cache.constructorPredictionVotes.length) return;

  const batch = db.batch();
  cache.constructorPredictionVotes.forEach((entry) => {
    const score = constructorPredictionScore(entry);
    const ref = db.collection("lfm_constructorPredictionVotes")
      .doc(activeSeasonId())
      .collection("votes")
      .doc(entry.uid || entry.id);
    batch.set(ref, {
      points: score.points,
      correctHits: score.correctHits,
      scoreDetails: score.details,
      scoredByUid: currentUser.uid,
      scoredByEmail: currentUser.email,
      scoredAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

async function saveConstructorPointSystem(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("constructorPointSystemMessage"), "");
  try {
    const race = readConstructorPointArray("race");
    const sprint = readConstructorPointArray("sprint");
    const fastestLapRace = readConstructorPointInput("constructorFastestLapRace", "El punto de vuelta rapida en carrera larga");
    const fastestLapSprint = readConstructorPointInput("constructorFastestLapSprint", "El punto de vuelta rapida en sprint");
    await db.collection("lfm_constructorPointSystems").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      race,
      sprint,
      fastestLapRace,
      fastestLapSprint,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadConstructorPointSystemData();
    showMessage($("constructorPointSystemMessage"), "Sistema de puntos guardado.", "success");
    render();
  } catch (error) {
    showMessage($("constructorPointSystemMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function revertConstructorImport(event) {
  const importId = event.currentTarget.dataset.revertConstructorImport;
  const current = currentConstructorChampionship();
  const importedRace = (current.importedRaces || []).find((item) => item.id === importId);
  if (!importedRace) return;

  const label = `${importedRace.kindLabel || constructorImportKindLabel(importedRace.kind)} ${importedRace.raceGp || importedRace.trackName || importedRace.fileName || ""}`.trim();
  if (jsonAwardsApplied(importedRace)) {
    window.alert("Este resultado tiene premios economicos aplicados. Primero ve a Admin > Premios y usa Revertir premios; despues podras revertir este resultado.");
    return;
  }
  if (!window.confirm(`Revertir ${label}? Se restaran sus puntos de constructores y se quitara del historial.`)) {
    return;
  }

  const stop = setLoading(event.currentTarget, "Revirtiendo...");
  try {
    const nextImportedRaces = (current.importedRaces || []).filter((item) => item.id !== importId);
    await db.collection("lfm_constructorChampionships").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      standings: standingsAfterConstructorRevert(importedRace),
      importedRaces: nextImportedRaces,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadConstructorChampionshipData();
    await loadConstructorPredictionsData();
    await syncConstructorPredictionScores();
    await loadConstructorPredictionsData();
    render();
  } catch (error) {
    window.alert(translateError(error));
  } finally {
    stop();
  }
}

async function importConstructorRaceJson(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = form.querySelector("[data-constructor-import-message]");
  const kind = form.dataset.constructorImportKind || "race";
  const stop = setLoading(event.submitter, "Importando...");
  showMessage(message, "");
  try {
    const selectedRaceId = form.querySelector("[data-constructor-race-id]")?.value || "";
    const selectedRace = raceById(selectedRaceId);
    if (!selectedRace) throw new Error("Selecciona el GP correspondiente.");
    if (kind === "sprint" && !selectedRace.hasSprint) {
      throw new Error("Ese GP no tiene sprint en el calendario.");
    }

    const file = form.querySelector("[data-constructor-json-file]")?.files?.[0];
    if (!file) throw new Error("Selecciona un archivo JSON.");
    const data = JSON.parse(await file.text());
    const importResult = calculateConstructorPointsFromRaceJson(data, kind, file.name);
    const current = currentConstructorChampionship();

    if ((current.importedRaces || []).some((item) => item.id === importResult.id)) {
      throw new Error("Ese JSON ya fue importado en constructores.");
    }
    if ((current.importedRaces || []).some((item) => item.kind === kind && raceMatchesImport(selectedRace, item))) {
      throw new Error(`${constructorImportKindLabel(kind)} de ${raceLabel(selectedRace)} ya fue importada.`);
    }

    const importedRace = {
      id: importResult.id,
      kind,
      kindLabel: importResult.kindLabel,
      raceId: selectedRace.id,
      raceRound: selectedRace.round,
      raceGp: selectedRace.gp,
      trackName: importResult.trackName,
      fileName: importResult.fileName,
      pointsByTeam: importResult.pointsByTeam,
      fastestLap: importResult.fastestLap,
      driverResults: importResult.driverResults,
      classification: importResult.classification,
      importedAtLabel: new Date().toISOString(),
      importedByUid: currentUser.uid,
      importedByEmail: currentUser.email
    };

    await db.collection("lfm_constructorChampionships").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      standings: standingsAfterConstructorImport(importResult),
      importedRaces: [...(current.importedRaces || []), importedRace],
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadConstructorChampionshipData();
    await loadConstructorPredictionsData();
    await syncConstructorPredictionScores();
    await loadConstructorPredictionsData();

    const summary = importResult.rows.map((row) => `${row.teamName} +${row.gained}`).join(" - ");
    showMessage(message, `${importResult.kindLabel} ${raceLabel(selectedRace)}: ${summary || "sin puntos"}.`, "success");
    form.reset();
    render();
  } catch (error) {
    showMessage(message, translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveConstructorChampionship(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("constructorChampionshipMessage"), "");
  try {
    const standings = readConstructorChampionshipForm();
    await db.collection("lfm_constructorChampionships").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      standings,
      importedRaces: currentConstructorChampionship().importedRaces || [],
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadConstructorChampionshipData();
    await loadConstructorPredictionsData();
    await syncConstructorPredictionScores();
    await loadConstructorPredictionsData();
    showMessage($("constructorChampionshipMessage"), "Constructores guardado. Predicciones recalculadas automaticamente.", "success");
    render();
  } catch (error) {
    showMessage($("constructorChampionshipMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function readConstructorPredictionPicks(form) {
  const picks = Array.from(form.querySelectorAll("[data-constructor-prediction-pick]"))
    .map((select) => select.value)
    .filter(Boolean);
  const teamCount = (cache.teams.length ? cache.teams : window.LFM_SEED.teams).length;
  const unique = new Set(picks);

  if (picks.length !== teamCount) {
    throw new Error("Completa todas las posiciones de constructores.");
  }
  if (unique.size !== picks.length) {
    throw new Error("No puede repetirse un equipo en la prediccion.");
  }
  return picks;
}

async function saveConstructorPredictionSettings(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("constructorPredictionSettingsMessage"), "");
  try {
    await db.collection("lfm_constructorPredictionSettings").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      status: $("constructorPredictionStatus").value,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadConstructorPredictionsData();
    await syncConstructorPredictionScores();
    await loadConstructorPredictionsData();
    render();
  } catch (error) {
    showMessage($("constructorPredictionSettingsMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveConstructorPredictionVote(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("constructorVoteMessage"), "");
  try {
    if (!currentUser) throw new Error("Entra con tu cuenta para votar.");
    if (!canCurrentUserVote()) throw new Error("Tu cuenta no esta habilitada para votar.");
    if (!constructorPredictionsOpen()) throw new Error("El plazo de predicciones no esta abierto.");

    const participantName = $("constructorVoteName").value.trim();
    const linkedTeamId = $("constructorVoteLinkedTeam").value;
    const picks = readConstructorPredictionPicks(event.target);
    if (!participantName) throw new Error("El participante necesita nombre.");

    await db.collection("lfm_constructorPredictionVotes")
      .doc(activeSeasonId())
      .collection("votes")
      .doc(currentUser.uid)
      .set({
        uid: currentUser.uid,
        seasonId: activeSeasonId(),
        participantName,
        linkedTeamId,
        picks,
        points: 0,
        correctHits: 0,
        notes: "",
        submittedByEmail: currentUser.email || "",
        submittedAtLabel: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    showMessage($("constructorVoteMessage"), "Prediccion guardada.", "success");
    await loadConstructorPredictionsData();
    render();
  } catch (error) {
    showMessage($("constructorVoteMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function deleteConstructorPredictionEntry(event) {
  const id = event.currentTarget.dataset.deleteConstructorPrediction;
  if (!id || !window.confirm("Borrar esta prediccion?")) return;
  const stop = setLoading(event.currentTarget, "Borrando...");
  try {
    await db.collection("lfm_constructorPredictionVotes")
      .doc(activeSeasonId())
      .collection("votes")
      .doc(id)
      .delete();

    await db.collection("lfm_constructorPredictionSettings").doc(activeSeasonId()).set({
      seasonId: activeSeasonId(),
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadConstructorPredictionsData();
    render();
  } catch (error) {
    window.alert(translateError(error));
  } finally {
    stop();
  }
}

function renderRegulationAdmin() {
  if (cache.regulationLoadError) {
    return `<div class="empty">${html(cache.regulationLoadError)} Publica las reglas de reglamento antes de editar.</div>`;
  }

  const regulation = currentRegulation();
  return `
    <form id="regulationForm" class="form regulation-admin-form">
      <p class="muted">Edita las secciones del reglamento de ${html((cache.season || window.LFM_SEED.season).name || activeSeasonId().toUpperCase())}. Lo que guardes aca queda visible para todos en Liga publica > Reglamento.</p>
      ${regulation.sections.map((section) => `
        <fieldset class="regulation-editor" data-reg-section="${html(section.id)}" data-reg-order="${html(section.order)}">
          <legend>${html(section.title)}</legend>
          <label>Titulo
            <input data-reg-title value="${html(section.title)}" required />
          </label>
          <label>Texto
            <textarea data-reg-content rows="7" placeholder="Escribe las reglas de esta seccion...">${html(section.content)}</textarea>
          </label>
        </fieldset>
      `).join("")}
      <button type="submit">Guardar reglamento</button>
      <p id="regulationMessage" class="message"></p>
    </form>
  `;
}

function readRegulationForm() {
  const sections = Array.from(document.querySelectorAll("[data-reg-section]"))
    .map((section) => ({
      id: section.dataset.regSection,
      order: Number(section.dataset.regOrder || 0),
      title: section.querySelector("[data-reg-title]").value.trim(),
      content: section.querySelector("[data-reg-content]").value.trim()
    }));

  sections.forEach((section) => {
    if (!section.title) throw new Error("Todas las secciones necesitan titulo.");
  });

  return {
    seasonId: activeSeasonId(),
    sections: regulationSections(sections)
  };
}

async function saveRegulation(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("regulationMessage"), "");
  try {
    const regulation = readRegulationForm();
    await db.collection("lfm_regulations").doc(activeSeasonId()).set({
      ...regulation,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("regulationMessage"), "Reglamento guardado y publicado.", "success");
    await loadRegulationData();
    render();
  } catch (error) {
    showMessage($("regulationMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function readNonNegativeAmount(value, label) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${label} no es un monto valido.`);
  }
  return moneyValue(n);
}

function readAwardSettingsForm() {
  return {
    seasonId: activeSeasonId(),
    racePositionM: Array.from(document.querySelectorAll("[data-award-setting='race']"))
      .map((input, index) => readNonNegativeAmount(input.value, `Carrera P${index + 1}`)),
    sprintPositionM: Array.from(document.querySelectorAll("[data-award-setting='sprint']"))
      .map((input, index) => readNonNegativeAmount(input.value, `Sprint P${index + 1}`)),
    poleM: readNonNegativeAmount($("awardPoleM").value, "Pole"),
    fastestLapM: readNonNegativeAmount($("awardFastestLapM").value, "Vuelta rapida")
  };
}

async function saveAwardSettings(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("awardSettingsMessage"), "");
  try {
    const settings = readAwardSettingsForm();
    await db.collection("lfm_awardSettings").doc(activeSeasonId()).set({
      ...settings,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("awardSettingsMessage"), "Tabla de premios guardada.", "success");
    await loadAwardsData();
    render();
  } catch (error) {
    showMessage($("awardSettingsMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function readRaceAwardDraft() {
  const settings = awardSettings();
  const race = raceById($("awardRace").value);
  if (!race) throw new Error("Selecciona un GP valido.");

  const items = [];
  const addItem = (raw) => {
    const amountM = positiveMoneyValue(raw.amountM);
    if (!raw.teamId || amountM <= 0) return;
    if (!cache.teamMap.has(raw.teamId)) throw new Error(`Equipo no encontrado: ${raw.teamId}`);
    items.push({
      teamId: raw.teamId,
      teamName: teamName(raw.teamId),
      type: raw.type,
      label: raw.label,
      position: raw.position || null,
      amountM
    });
  };

  document.querySelectorAll("[data-award-race-position]").forEach((select) => {
    const position = Number(select.dataset.awardRacePosition);
    addItem({
      teamId: select.value,
      type: "race",
      label: `Carrera P${position}`,
      position,
      amountM: settings.racePositionM[position - 1]
    });
  });

  const sprintItems = [];
  document.querySelectorAll("[data-award-sprint-position]").forEach((select) => {
    const position = Number(select.dataset.awardSprintPosition);
    const amountM = settings.sprintPositionM[position - 1];
    if (select.value && amountM > 0) {
      sprintItems.push({
        teamId: select.value,
        type: "sprint",
        label: `Sprint P${position}`,
        position,
        amountM
      });
    }
  });
  if (sprintItems.length && !race.hasSprint) {
    throw new Error("Este GP no tiene sprint. Borra los premios sprint o elige una ronda con sprint.");
  }
  sprintItems.forEach(addItem);

  addItem({
    teamId: $("awardPoleTeam").value,
    type: "pole",
    label: "Pole",
    amountM: settings.poleM
  });
  addItem({
    teamId: $("awardFastestLapTeam").value,
    type: "fastestLap",
    label: "Vuelta rapida",
    amountM: settings.fastestLapM
  });

  document.querySelectorAll("[data-award-special-row]").forEach((row, index) => {
    const concept = row.querySelector("[data-award-special-concept]").value.trim();
    const teamId = row.querySelector("[data-award-special-team]").value;
    const amountM = readNonNegativeAmount(row.querySelector("[data-award-special-amount]").value, `Premio especial ${index + 1}`);
    if (!concept && !teamId && amountM === 0) return;
    if (!concept || !teamId || amountM <= 0) {
      throw new Error(`Completa concepto, equipo y monto del premio especial ${index + 1}.`);
    }
    addItem({
      teamId,
      type: "special",
      label: concept,
      amountM
    });
  });

  const totals = awardTotals(items);
  return {
    race,
    raceLabel: raceLabel(race),
    items,
    totals,
    totalM: moneyValue(items.reduce((sum, item) => sum + Number(item.amountM || 0), 0))
  };
}

function renderAwardPreview(draft) {
  if (!draft.items.length) {
    return `<div class="empty">No hay premios para aplicar. Revisa importes y equipos seleccionados.</div>`;
  }

  return `
    <div class="award-preview-grid">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Premio</th><th>Equipo</th><th>Monto</th></tr></thead>
          <tbody>
            ${draft.items.map((item) => `
              <tr>
                <td>${html(item.label)}</td>
                <td>${html(item.teamName)}</td>
                <td class="positive">${moneyM(item.amountM)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Equipo</th><th>Total</th></tr></thead>
          <tbody>
            ${draft.totals.map((item) => `
              <tr>
                <td><strong>${html(item.teamName)}</strong></td>
                <td class="positive">${moneyM(item.amountM)}</td>
              </tr>
            `).join("")}
            <tr>
              <td><strong>Total GP</strong></td>
              <td class="positive"><strong>${moneyM(draft.totalM)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function updateRaceAwardPreview() {
  const preview = $("raceAwardPreview");
  if (!preview) return null;
  try {
    const draft = readRaceAwardDraft();
    preview.innerHTML = renderAwardPreview(draft);
    showMessage($("raceAwardMessage"), "");
    return draft;
  } catch (error) {
    preview.innerHTML = `<div class="empty">${html(translateError(error))}</div>`;
    return null;
  }
}

async function applyRaceAwards(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Aplicando...");
  showMessage($("raceAwardMessage"), "");
  try {
    const draft = readRaceAwardDraft();
    if (!draft.items.length) {
      throw new Error("No hay premios para aplicar.");
    }

    $("raceAwardPreview").innerHTML = renderAwardPreview(draft);

    const ok = window.confirm(`Aplicar ${moneyM(draft.totalM)} en premios para ${draft.raceLabel}?`);
    if (!ok) {
      showMessage($("raceAwardMessage"), "Aplicacion cancelada.");
      return;
    }

    const markCompleted = $("awardMarkCompleted").checked;
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batchId = `award-${draft.race.id}-${Date.now().toString(36)}`;
    const updatedCalendar = racesList().map((race) => (
      race.id === draft.race.id ? { ...race, completed: markCompleted || race.completed } : race
    ));
    const completedRaces = updatedCalendar.filter((race) => race.completed).length;

    await db.runTransaction(async (tx) => {
      const teamRefs = new Map(draft.totals.map((total) => [total.teamId, db.collection("lfm_teams").doc(total.teamId)]));
      const teamDocs = new Map();

      for (const [teamId, teamRef] of teamRefs) {
        const teamDoc = await tx.get(teamRef);
        if (!teamDoc.exists) throw new Error(`Equipo no encontrado: ${teamName(teamId)}`);
        teamDocs.set(teamId, { ref: teamRef, doc: teamDoc });
      }

      draft.totals.forEach((total) => {
        const entry = teamDocs.get(total.teamId);
        const current = Number(entry.doc.data().budgetRemainingM || 0);
        tx.update(entry.ref, {
          budgetRemainingM: moneyValue(current + total.amountM),
          updatedAt: now
        });
      });

      draft.items.forEach((item, index) => {
        const movementRef = db.collection("lfm_teamEconomy")
          .doc(item.teamId)
          .collection("movements")
          .doc();
        tx.set(movementRef, {
          seasonId: activeSeasonId(),
          teamId: item.teamId,
          amountM: item.amountM,
          category: "premio",
          limitScope: "none",
          concept: `${draft.raceLabel}: ${item.label}`,
          raceId: draft.race.id,
          raceLabel: draft.raceLabel,
          awardBatchId: batchId,
          awardType: item.type,
          position: item.position,
          order: index + 1,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email,
          createdAt: now
        });
      });

      tx.set(db.collection("lfm_raceAwards").doc(batchId), {
        seasonId: activeSeasonId(),
        raceId: draft.race.id,
        raceLabel: draft.raceLabel,
        raceRound: draft.race.round || 0,
        raceGp: draft.race.gp || "",
        hasSprint: Boolean(draft.race.hasSprint),
        totalM: draft.totalM,
        totals: draft.totals,
        items: draft.items,
        markedCompleted: markCompleted,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      });

      if (markCompleted) {
        tx.set(db.collection("lfm_seasons").doc(activeSeasonId()), {
          calendar: updatedCalendar,
          completedRaces,
          updatedAt: now
        }, { merge: true });
      }
    });

    showMessage($("raceAwardMessage"), `Premios aplicados: ${moneyM(draft.totalM)} para ${draft.raceLabel}.`, "success");
    event.target.reset();
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    render();
  } catch (error) {
    showMessage($("raceAwardMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function applyJsonAwards(event) {
  const importId = event.currentTarget.dataset.applyJsonAwards;
  const message = $("jsonAwardMessage");
  const importedRace = constructorResultImports().find((item) => item.id === importId);
  if (!importedRace) return;

  const stop = setLoading(event.currentTarget, "Aplicando...");
  showMessage(message, "");
  try {
    const draft = jsonAwardDraft(importedRace);
    if (!draft.items.length) {
      throw new Error("Esta importacion no tiene premios configurados para aplicar.");
    }
    if (jsonAwardsApplied(importedRace)) {
      throw new Error("Los premios economicos de esta importacion ya fueron aplicados.");
    }

    const ok = window.confirm(`Aplicar ${moneyM(draft.totalM)} en premios de ${draft.kindLabel} para ${draft.raceLabel}?`);
    if (!ok) {
      showMessage(message, "Aplicacion cancelada.");
      return;
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const appliedAtLabel = new Date().toISOString();
    const championshipRef = db.collection("lfm_constructorChampionships").doc(activeSeasonId());
    const awardRef = db.collection("lfm_raceAwards").doc(draft.awardId);

    await db.runTransaction(async (tx) => {
      const championshipDoc = await tx.get(championshipRef);
      const awardDoc = await tx.get(awardRef);
      const championshipData = championshipDoc.exists ? championshipDoc.data() : {};
      const importedRaces = Array.isArray(championshipData.importedRaces) ? championshipData.importedRaces : [];
      const txImportedRace = importedRaces.find((item) => item.id === importId);
      if (!txImportedRace) throw new Error("La importacion ya no existe en constructores.");
      const existingAwardData = awardDoc.exists ? awardDoc.data() : null;
      if (txImportedRace.economicAwards?.applied || (awardDoc.exists && !existingAwardData?.reversed)) {
        throw new Error("Los premios economicos de esta importacion ya fueron aplicados.");
      }

      const txDraft = jsonAwardDraft(txImportedRace);
      if (!txDraft.items.length) {
        throw new Error("Esta importacion no tiene premios configurados para aplicar.");
      }

      const teamRefs = new Map(txDraft.totals.map((total) => [total.teamId, db.collection("lfm_teams").doc(total.teamId)]));
      const teamDocs = new Map();
      for (const [teamId, teamRef] of teamRefs) {
        const teamDoc = await tx.get(teamRef);
        if (!teamDoc.exists) throw new Error(`Equipo no encontrado: ${teamName(teamId)}`);
        teamDocs.set(teamId, { ref: teamRef, doc: teamDoc });
      }

      txDraft.totals.forEach((total) => {
        const entry = teamDocs.get(total.teamId);
        const current = Number(entry.doc.data().budgetRemainingM || 0);
        tx.update(entry.ref, {
          budgetRemainingM: moneyValue(current + total.amountM),
          updatedAt: now
        });
      });

      txDraft.items.forEach((item, index) => {
        const movementRef = db.collection("lfm_teamEconomy")
          .doc(item.teamId)
          .collection("movements")
          .doc();
        const driverText = item.driverName ? ` (${item.driverName})` : "";
        tx.set(movementRef, {
          seasonId: activeSeasonId(),
          teamId: item.teamId,
          amountM: item.amountM,
          category: "premio",
          limitScope: "none",
          concept: `${txDraft.raceLabel}: ${item.label}${driverText}`,
          raceId: txDraft.raceId,
          raceLabel: txDraft.raceLabel,
          awardBatchId: txDraft.awardId,
          awardType: item.type,
          position: item.position,
          driverName: item.driverName || "",
          source: "constructor-json",
          sourceImportId: txImportedRace.id,
          order: index + 1,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email,
          createdAt: now
        });
      });

      tx.set(awardRef, {
        seasonId: activeSeasonId(),
        source: "constructor-json",
        sourceImportId: txImportedRace.id,
        sourceImportKind: txDraft.kind,
        raceId: txDraft.raceId,
        raceLabel: txDraft.raceLabel,
        raceRound: txDraft.raceRound,
        raceGp: txDraft.raceGp,
        kind: txDraft.kind,
        kindLabel: txDraft.kindLabel,
        fileName: txDraft.fileName,
        fastestLap: txDraft.fastestLap,
        totalM: txDraft.totalM,
        totals: txDraft.totals,
        items: txDraft.items,
        status: "applied",
        reversed: false,
        markedCompleted: false,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      });

      const nextImportedRaces = importedRaces.map((item) => (
        item.id === importId
          ? {
              ...item,
              economicAwards: {
                applied: true,
                awardBatchId: txDraft.awardId,
                totalM: txDraft.totalM,
                appliedAtLabel,
                appliedByUid: currentUser.uid,
                appliedByEmail: currentUser.email
              }
            }
          : item
      ));
      tx.set(championshipRef, {
        seasonId: activeSeasonId(),
        importedRaces: nextImportedRaces,
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email,
        updatedAt: now
      }, { merge: true });
    });

    showMessage(message, `Premios aplicados: ${moneyM(draft.totalM)} para ${draft.raceLabel}.`, "success");
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    render();
  } catch (error) {
    showMessage(message, translateError(error), "error");
  } finally {
    stop();
  }
}

async function revertJsonAwards(event) {
  const importId = event.currentTarget.dataset.revertJsonAwards;
  const message = $("jsonAwardMessage");
  const importedRace = constructorResultImports().find((item) => item.id === importId);
  if (!importedRace) return;

  const record = jsonAwardRecord(importedRace);
  const awardId = importedRace.economicAwards?.awardBatchId || record?.id || jsonAwardBatchId(importedRace);
  const label = jsonAwardRaceLabel(importedRace);
  const shownTotal = positiveMoneyValue(importedRace.economicAwards?.totalM ?? record?.totalM ?? 0);
  if (!window.confirm(`Revertir ${shownTotal ? moneyM(shownTotal) : "los premios"} de ${label}? Se restara ese dinero del presupuesto y se registraran movimientos inversos.`)) {
    return;
  }

  const stop = setLoading(event.currentTarget, "Revirtiendo...");
  showMessage(message, "");
  try {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const reversedAtLabel = new Date().toISOString();
    const reversalBatchId = `reversal-${awardId}-${Date.now().toString(36)}`;
    const championshipRef = db.collection("lfm_constructorChampionships").doc(activeSeasonId());
    const awardRef = db.collection("lfm_raceAwards").doc(awardId);

    let revertedTotalM = 0;
    await db.runTransaction(async (tx) => {
      const championshipDoc = await tx.get(championshipRef);
      const awardDoc = await tx.get(awardRef);
      if (!awardDoc.exists) throw new Error("No se encontro el lote de premios aplicado.");

      const awardData = awardDoc.data();
      if (awardData.reversed) throw new Error("Ese lote de premios ya fue revertido.");
      if (awardData.source !== "constructor-json" || awardData.sourceImportId !== importId) {
        throw new Error("El lote de premios no corresponde a esta importacion JSON.");
      }

      const championshipData = championshipDoc.exists ? championshipDoc.data() : {};
      const importedRaces = Array.isArray(championshipData.importedRaces) ? championshipData.importedRaces : [];
      const txImportedRace = importedRaces.find((item) => item.id === importId);
      if (!txImportedRace) throw new Error("La importacion ya no existe en constructores.");

      const totals = (Array.isArray(awardData.totals) ? awardData.totals : [])
        .map((total) => ({
          teamId: total.teamId,
          teamName: total.teamName || teamName(total.teamId),
          amountM: positiveMoneyValue(total.amountM)
        }))
        .filter((total) => total.teamId && total.amountM > 0);
      const items = (Array.isArray(awardData.items) ? awardData.items : [])
        .map((item) => ({
          ...item,
          amountM: positiveMoneyValue(item.amountM),
          teamName: item.teamName || teamName(item.teamId)
        }))
        .filter((item) => item.teamId && item.amountM > 0);

      if (!totals.length || !items.length) {
        throw new Error("El lote aplicado no tiene importes validos para revertir.");
      }
      revertedTotalM = moneyValue(totals.reduce((sum, total) => sum + total.amountM, 0));

      const teamRefs = new Map(totals.map((total) => [total.teamId, db.collection("lfm_teams").doc(total.teamId)]));
      const teamDocs = new Map();
      for (const [teamId, teamRef] of teamRefs) {
        const teamDoc = await tx.get(teamRef);
        if (!teamDoc.exists) throw new Error(`Equipo no encontrado: ${teamName(teamId)}`);
        teamDocs.set(teamId, { ref: teamRef, doc: teamDoc });
      }

      totals.forEach((total) => {
        const entry = teamDocs.get(total.teamId);
        const current = Number(entry.doc.data().budgetRemainingM || 0);
        tx.update(entry.ref, {
          budgetRemainingM: moneyValue(current - total.amountM),
          updatedAt: now
        });
      });

      items.forEach((item, index) => {
        const movementRef = db.collection("lfm_teamEconomy")
          .doc(item.teamId)
          .collection("movements")
          .doc();
        const driverText = item.driverName ? ` (${item.driverName})` : "";
        tx.set(movementRef, {
          seasonId: activeSeasonId(),
          teamId: item.teamId,
          amountM: -item.amountM,
          category: "premio",
          limitScope: "none",
          concept: `Reversion ${awardData.raceLabel || label}: ${item.label}${driverText}`,
          raceId: awardData.raceId || txImportedRace.raceId || "",
          raceLabel: awardData.raceLabel || label,
          awardBatchId: reversalBatchId,
          awardType: item.type,
          position: item.position || null,
          driverName: item.driverName || "",
          source: "constructor-json-reversal",
          sourceImportId: txImportedRace.id,
          reversalOfAwardBatchId: awardId,
          order: index + 1,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email,
          createdAt: now
        });
      });

      tx.set(awardRef, {
        status: "reverted",
        reversed: true,
        reversedByUid: currentUser.uid,
        reversedByEmail: currentUser.email,
        reversedAt: now,
        reversedAtLabel,
        reversalBatchId,
        reversalTotalM: revertedTotalM
      }, { merge: true });

      const nextImportedRaces = importedRaces.map((item) => (
        item.id === importId
          ? {
              ...item,
              economicAwards: {
                ...(item.economicAwards || {}),
                applied: false,
                reverted: true,
                awardBatchId: awardId,
                totalM: 0,
                reversedTotalM: revertedTotalM,
                reversedAtLabel,
                reversedByUid: currentUser.uid,
                reversedByEmail: currentUser.email
              }
            }
          : item
      ));
      tx.set(championshipRef, {
        seasonId: activeSeasonId(),
        importedRaces: nextImportedRaces,
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email,
        updatedAt: now
      }, { merge: true });
    });

    showMessage(message, `Premios revertidos: ${moneyM(revertedTotalM)} de ${label}.`, "success");
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    render();
  } catch (error) {
    showMessage(message, translateError(error), "error");
  } finally {
    stop();
  }
}

function wireTeamCarTabs() {
  document.querySelectorAll("[data-car-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const pieceId = button.dataset.carTab;
      document.querySelectorAll("[data-car-tab]").forEach((tabButton) => {
        tabButton.classList.toggle("active", tabButton.dataset.carTab === pieceId);
      });
      document.querySelectorAll("[data-car-panel]").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.carPanel === pieceId);
      });
    });
  });
}

function wireTeamCarPreviewControls() {
  document.querySelectorAll("[data-car-piece]").forEach((select) => {
    select.addEventListener("change", () => {
      const panel = select.closest("[data-car-panel]");
      if (!panel) return;
      const designId = select.value;

      panel.querySelectorAll("[data-design-preview]").forEach((preview) => {
        preview.classList.toggle("active", preview.dataset.designPreview === designId);
      });

      panel.querySelectorAll("[data-design-row]").forEach((row) => {
        row.classList.toggle("selected-row", row.dataset.designRow === designId);
      });

      const activePreview = panel.querySelector(`[data-design-preview="${CSS.escape(designId)}"]`);
      const designName = activePreview?.dataset.designName || "-";
      const upgradeType = activePreview?.dataset.designUpgradeType || "-";
      const isEquipped = activePreview?.dataset.isEquipped === "true";
      const title = panel.querySelector("[data-selected-design-title]");
      const name = panel.querySelector("[data-selected-design-name]");
      const upgrade = panel.querySelector("[data-selected-design-upgrade]");
      const state = panel.querySelector("[data-selected-design-state]");
      if (title) title.textContent = designName;
      if (name) name.textContent = designName;
      if (upgrade) upgrade.textContent = upgradeType || "-";
      if (state) state.textContent = designId ? (isEquipped ? "Equipada" : "Vista seleccionada") : "Pendiente";
    });
  });
}

function adminCarTabs() {
  return [
    { id: "resumen", label: "Resumen" },
    { id: "disenar", label: "Disenar" },
    { id: "selecciones", label: "Selecciones GP" },
    { id: "temporada", label: "Temporada" }
  ];
}

function renderAdminCarTabs() {
  const tabs = adminCarTabs();
  if (!tabs.some((tab) => tab.id === currentAdminCarTab)) {
    currentAdminCarTab = "resumen";
  }

  return `
    <div class="admin-car-tabs" role="tablist" aria-label="Secciones admin de coche">
      ${tabs.map((tab) => `
        <button
          class="admin-car-tab ${tab.id === currentAdminCarTab ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${tab.id === currentAdminCarTab ? "true" : "false"}"
          data-admin-car-tab="${html(tab.id)}"
        >${html(tab.label)}</button>
      `).join("")}
    </div>
  `;
}

function wireAdminCarTabs() {
  document.querySelectorAll("[data-admin-car-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      currentAdminCarTab = button.dataset.adminCarTab || "resumen";
      document.querySelectorAll("[data-admin-car-tab]").forEach((tabButton) => {
        const active = tabButton.dataset.adminCarTab === currentAdminCarTab;
        tabButton.classList.toggle("active", active);
        tabButton.setAttribute("aria-selected", active ? "true" : "false");
      });
      document.querySelectorAll("[data-admin-car-panel]").forEach((panel) => {
        panel.classList.toggle("hidden", panel.dataset.adminCarPanel !== currentAdminCarTab);
      });
    });
  });

  document.querySelectorAll("[data-admin-car-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.adminCarPanel !== currentAdminCarTab);
  });
}

function pendingResearchCount(teamId) {
  return carPieces().reduce((sum, piece) => (
    sum + researchesForPiece(teamId, piece.id).filter((research) => !research.appliedToSeasonId).length
  ), 0);
}

function renderAdminCarSummary(teams) {
  if (cache.carLoadError) {
    return `<div class="empty">${html(cache.carLoadError)} Publica las reglas privadas de coche para usar este modulo.</div>`;
  }

  return `
    <section class="admin-car-summary">
      <div class="grid two flat-grid">
        <article class="subcard">
          <div class="card-header">
            <h4>Carga inicial / importacion</h4>
            <span class="pill">Legacy JSON</span>
          </div>
          <form id="legacyCarImportForm" class="form import-box">
            <label>Importar JSON de Piezas coche
              <input id="legacyCarFile" type="file" accept=".json,application/json" required />
            </label>
            <button type="submit" class="ghost">Importar coches actuales</button>
          </form>
          <p id="legacyCarImportMessage" class="message"></p>
        </article>
        <article class="subcard">
          <div class="card-header">
            <h4>Estado general</h4>
            <span class="pill">${html(teams.length)} equipos</span>
          </div>
          <div class="list compact">
            <div class="list-row"><strong>Piezas por coche</strong><span>${html(carPieces().length)}</span></div>
            <div class="list-row"><strong>Equipos con cambios</strong><span>${html(teams.filter((team) => carSelectionReview(team.id).changedPieces.length).length)}</span></div>
            <div class="list-row"><strong>Investigaciones pendientes</strong><span>${html(teams.reduce((sum, team) => sum + pendingResearchCount(team.id), 0))}</span></div>
          </div>
        </article>
      </div>

      <div class="car-admin-review-list">
        ${teams.map((team) => {
          const review = carSelectionReview(team.id);
          const alertCount = review.missingDesigns.length + review.missingActive.length + review.missingSelected.length;
          const stateClass = alertCount ? "warn-pill" : review.changedPieces.length ? "sprint-pill" : "done-pill";
          const stateText = alertCount ? "Revisar" : review.changedPieces.length ? "Cambios" : "OK";
          return `
            <article class="car-admin-review">
              <div class="car-piece-head">
                <div>
                  <strong>${html(team.name)}</strong>
                  <span>${html(review.designCount)} disenos - ${html(review.snapshotCount)} snapshots</span>
                </div>
                <span class="pill ${stateClass}">${html(stateText)}</span>
              </div>
              <div class="car-admin-review-metrics">
                <div><span>Equipadas</span><strong>${html(carPieces().length - review.missingActive.length)}/${html(carPieces().length)}</strong></div>
                <div><span>Disenos</span><strong>${html(review.designCount)}</strong></div>
                <div><span>Investigaciones</span><strong>${html(pendingResearchCount(team.id))}</strong></div>
                <div><span>Cambios</span><strong>${html(review.changedPieces.length)}</strong></div>
                <div><span>Coste</span><strong>${moneyM(review.manufactureCostM)}</strong></div>
              </div>
              <div class="car-admin-review-detail">
                <span><strong>Cambiarian:</strong> ${review.changedPieces.length ? html(review.changedPieces.map((piece) => piece.name).join(", ")) : "ninguna pieza"}</span>
                ${review.missingDesigns.length ? `<span class="warning-text"><strong>Sin disenos:</strong> ${html(review.missingDesigns.map((piece) => piece.name).join(", "))}</span>` : ""}
                ${review.missingActive.length ? `<span class="warning-text"><strong>Sin equipar:</strong> ${html(review.missingActive.map((piece) => piece.name).join(", "))}</span>` : ""}
                ${review.missingSelected.length ? `<span class="warning-text"><strong>Sin seleccion:</strong> ${html(review.missingSelected.map((piece) => piece.name).join(", "))}</span>` : ""}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderCarDesignForm(mode, teams) {
  const isResearch = mode === "research";
  const prefix = isResearch ? "carResearch" : "carDesign";
  const defaultPiece = carPieces()[0]?.id || "";

  return `
    <form id="${prefix}Form" class="form admin-car-design-form" data-car-design-mode="${html(mode)}">
      <input id="${prefix}RequestId" type="hidden" />
      <div class="card-header flat-header">
        <h4>${isResearch ? "Nueva investigacion" : "Nuevo diseno"}</h4>
        <span class="pill">${isResearch ? "75% coste" : "Temporada actual"}</span>
      </div>
      <section class="grid two flat-grid">
        <label>Equipo
          <select id="${prefix}Team">
            ${teams.map((team) => `<option value="${html(team.id)}">${html(team.name)}</option>`).join("")}
          </select>
        </label>
        <label>Pieza
          <select id="${prefix}Piece">
            ${carPieces().map((piece) => `<option value="${html(piece.id)}">${html(piece.name)}</option>`).join("")}
          </select>
        </label>
        ${isResearch ? "" : `
          <label>Mejora aplicada
            <select id="${prefix}UpgradeType">
              ${renderUpgradeTypeOptions(defaultPiece)}
            </select>
          </label>
        `}
        <label>Nombre
          <input id="${prefix}Name" placeholder="${isResearch ? "Investigacion equilibrada" : "Version 1, RFE 04..."}" required />
        </label>
        <label>Pasos usados
          <input id="${prefix}Steps" type="number" min="0" max="10" step="1" value="0" required />
        </label>
      </section>
      <div id="${prefix}Stats" class="stats-editor"></div>
      <label class="check-row"><input id="${prefix}Charge" type="checkbox" checked /> Cobrar coste automaticamente</label>
      <button type="submit">${isResearch ? "Guardar investigacion" : "Guardar diseno"}</button>
      <p id="${prefix}Message" class="message"></p>
    </form>
  `;
}

function renderAdminCarRequestQueue(teams) {
  const pending = allPendingCarRequests(teams);
  const selectedTeam = teams.some((team) => team.id === currentAdminCarRequestTeamFilter)
    ? currentAdminCarRequestTeamFilter
    : "";
  currentAdminCarRequestTeamFilter = selectedTeam;
  const visiblePending = selectedTeam
    ? pending.filter(({ team }) => team.id === selectedTeam)
    : pending;
  return `
    <article class="subcard car-request-admin-panel">
      <div class="card-header">
        <div>
          <h4>Solicitudes de mejora</h4>
          <p class="muted">Carga el resultado real desde una solicitud pendiente o cancelala para liberar la pieza.</p>
        </div>
        <span class="pill">${html(visiblePending.length)} de ${html(pending.length)} pendientes</span>
      </div>
      ${pending.length ? `<p class="warning-text">La seleccion no puede abrirse hasta resolver o cancelar estas solicitudes.</p>` : ""}
      ${pending.length ? `
        <label>Filtrar por equipo
          <select id="adminCarRequestTeamFilter">
            <option value="">Todos los equipos</option>
            ${teams.map((team) => `
              <option value="${html(team.id)}" ${team.id === selectedTeam ? "selected" : ""}>${html(team.name)}</option>
            `).join("")}
          </select>
        </label>
      ` : ""}
      ${visiblePending.length ? `
        <div class="car-request-admin-list">
          ${visiblePending.map(({ team, request }) => {
            const piece = pieceById(request.pieceId);
            return `
              <article class="car-request-card">
                <div class="car-piece-head">
                  <div>
                    <strong>${html(team.name)} - ${html(piece?.name || request.pieceId)}</strong>
                    <span>${html(carRequestModeLabel(request.mode))} - ${html(request.upgradeType || "-")} - ${html(request.raceLabel || "Sin GP")}</span>
                  </div>
                  <span class="pill warn-pill">Pendiente</span>
                </div>
                <p>${html(request.note || "Sin nota")}</p>
                <div class="request-actions">
                  <button type="button" class="ghost" data-load-car-request="${html(team.id)}:${html(request.id)}">Cargar resultado</button>
                  <button type="button" class="ghost danger-action" data-cancel-car-request="${html(team.id)}:${html(request.id)}">Cancelar</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `<div class="empty">${pending.length ? "No hay solicitudes pendientes para este equipo." : "No hay solicitudes pendientes."}</div>`}
      <p id="adminCarRequestMessage" class="message"></p>
    </article>
  `;
}

function renderAdminCarDesignPanel(teams) {
  return `
    <section class="admin-car-design-stack">
      ${renderAdminCarRequestQueue(teams)}
      <section class="grid two flat-grid admin-car-design-grid">
        <article class="subcard">
          ${renderCarDesignForm("design", teams)}
        </article>
        <article class="subcard">
          ${renderCarDesignForm("research", teams)}
        </article>
      </section>
    </section>
  `;
}

function renderAdminCarSelectionsPanel(teams) {
  const selectionOpen = isSelectionWindowOpen();
  return `
    <section class="admin-car-selections">
      <div class="race-window-status ${selectionOpen ? "open" : ""}">
        <span>Plazo de seleccion</span>
        <strong>${selectionOpen ? `Abierto para ${html(currentRaceWindowLabel())}` : "Cerrado"}</strong>
      </div>
      <p class="muted">Revisa equipado vs seleccionado. Aplicar seleccion cobra fabricacion solo por piezas cambiadas.</p>
      ${renderAdminCarOverview(teams)}
    </section>
  `;
}

function renderAdminCar(teams) {
  return `
    <article class="card" data-admin-panel="coche">
      <div class="card-header">
        <h3>Coche</h3>
        <span class="pill">Admin</span>
      </div>
      ${renderAdminCarTabs()}
      <section data-admin-car-panel="resumen">
        ${renderAdminCarSummary(teams)}
      </section>
      <section data-admin-car-panel="disenar">
        ${renderAdminCarDesignPanel(teams)}
      </section>
      <section data-admin-car-panel="selecciones">
        ${renderAdminCarSelectionsPanel(teams)}
      </section>
      <section data-admin-car-panel="temporada">
        ${renderCarTransitionAdmin(teams)}
      </section>
    </article>
  `;
}

function renderAdminCarOverview(teams) {
  if (cache.carLoadError) {
    return `<div class="empty">${html(cache.carLoadError)} Publica las reglas privadas de coche para usar este modulo.</div>`;
  }

  return `
    <div class="car-admin-review-list">
      ${teams.map((team) => {
        const review = carSelectionReview(team.id);
        const alertCount = review.missingDesigns.length + review.missingActive.length + review.missingSelected.length;
        const stateClass = alertCount ? "warn-pill" : review.changedPieces.length ? "sprint-pill" : "done-pill";
        const stateText = alertCount ? "Revisar" : review.changedPieces.length ? "Cambios pendientes" : "OK";
        return `
          <article class="car-admin-review">
            <div class="car-piece-head">
              <div>
                <strong>${html(team.name)}</strong>
                <span>${html(review.designCount)} disenos - ${html(review.snapshotCount)} snapshots</span>
              </div>
              <span class="pill ${stateClass}">${html(stateText)}</span>
            </div>
            <div class="car-admin-review-metrics">
              <div><span>Equipadas</span><strong>${html(carPieces().length - review.missingActive.length)}/${html(carPieces().length)}</strong></div>
              <div><span>Cambios</span><strong>${html(review.changedPieces.length)}</strong></div>
              <div><span>Coste</span><strong>${moneyM(review.manufactureCostM)}</strong></div>
            </div>
            <div class="car-admin-review-detail">
              <span><strong>Cambiarian:</strong> ${review.changedPieces.length ? html(review.changedPieces.map((piece) => piece.name).join(", ")) : "ninguna pieza"}</span>
              ${review.missingDesigns.length ? `<span class="warning-text"><strong>Sin disenos:</strong> ${html(review.missingDesigns.map((piece) => piece.name).join(", "))}</span>` : ""}
              ${review.missingSelected.length ? `<span class="warning-text"><strong>Sin seleccion:</strong> ${html(review.missingSelected.map((piece) => piece.name).join(", "))}</span>` : ""}
            </div>
            <button class="ghost" type="button" data-apply-car-selection="${html(team.id)}">Aplicar seleccion</button>
          </article>
        `;
      }).join("")}
    </div>
    <p id="carApplyMessage" class="message"></p>
  `;
}

function renderTransitionValueEditor(transition) {
  const label = transition.mode === "regulation" ? "Valor base fijo" : "Perdida reglamento";
  return `
    <div class="transition-editor">
      ${carPieces().map((piece) => `
        <fieldset class="transition-piece">
          <legend>${html(piece.name)}</legend>
          ${(piece.stats || []).map((stat) => `
            <label>${html(stat)}
              <input data-transition-piece="${html(piece.id)}" data-transition-stat="${html(stat)}" type="number" min="0" step="0.01" value="${html(transitionStatValue(transition, piece.id, stat))}" placeholder="${html(label)}" />
            </label>
          `).join("")}
        </fieldset>
      `).join("")}
    </div>
  `;
}

function renderTransitionPreviewStats(row, mode) {
  return `
    <div class="transition-stat-preview">
      ${row.statRows.map((statRow) => `
        <div>
          <span>${html(statRow.stat)}</span>
          <strong>${html(formatStatValue(statRow.result))}</strong>
          <small>
            ${mode === "regulation"
              ? `base ${html(formatStatValue(statRow.transitionValue))}`
              : `${html(formatStatValue(statRow.latestValue))} - ${html(formatStatValue(statRow.transitionValue))}`}
            ${statRow.researchValue > 0 ? ` + inv ${html(formatStatValue(statRow.researchValue))}` : ""}
          </small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderCarTransitionPreview(teams, transition) {
  if (!transition.targetSeasonId) {
    return `<div class="empty">Crea o selecciona una temporada destino antes de aplicar la transicion.</div>`;
  }

  return `
    <div class="transition-preview-list">
      ${teams.map((team) => {
        const preview = transitionPreviewForTeam(team.id, transition);
        const missingLatest = preview.filter((row) => !row.latest);
        const carName = nextCarNameForTeam(team.id, transition.targetSeasonId);
        return `
          <article class="transition-preview-card">
            <div class="card-header">
              <div>
                <h4>${html(team.name)}</h4>
                <p class="muted">Coche nuevo: ${html(carName)}${missingLatest.length ? ` - faltan ${missingLatest.length} piezas con diseno` : ""}</p>
              </div>
              <span class="pill ${missingLatest.length ? "warn-pill" : "done-pill"}">${missingLatest.length ? "Revisar" : "Listo"}</span>
            </div>
            <div class="transition-piece-preview-list">
              ${preview.map((row) => `
                <section>
                  <h5>${html(row.piece.name)}</h5>
                  <p class="muted">Ultima: ${row.latest ? html(row.latest.name) : "sin diseno"} - Investigaciones: ${html(researchesForPiece(team.id, row.piece.id).filter((research) => !research.appliedToSeasonId).length)}</p>
                  ${renderTransitionPreviewStats(row, transition.mode)}
                </section>
              `).join("")}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderCarTransitionAdmin(teams) {
  const transition = currentCarTransition();
  const targets = nextSeasonCandidates();
  return `
    <section class="car-transition-admin">
      <form id="carTransitionForm" class="form">
        <div class="grid two flat-grid">
          <label>Temporada destino
            <select id="carTransitionTargetSeason">
              <option value="">Selecciona temporada destino</option>
              ${targets.map((season) => `<option value="${html(season.id)}" ${season.id === transition.targetSeasonId ? "selected" : ""}>${html(season.name)}</option>`).join("")}
            </select>
          </label>
          <label>Modo
            <select id="carTransitionMode">
              <option value="normal" ${transition.mode === "normal" ? "selected" : ""}>Cambio normal: restar al coche final</option>
              <option value="regulation" ${transition.mode === "regulation" ? "selected" : ""}>Cambio de regulacion: usar valores fijos</option>
            </select>
          </label>
        </div>
        <p class="muted">Normal: resultado = max(ultima disenada - perdida, 0) + investigaciones. Regulacion: resultado = valor fijo + investigaciones.</p>
        ${renderTransitionValueEditor(transition)}
        <button type="submit">Guardar transicion</button>
        <p id="carTransitionMessage" class="message"></p>
      </form>
      <div class="form-divider"></div>
      <div class="card-header flat-header">
        <h4>Preview antes de aplicar</h4>
        <div class="transition-apply-controls">
          <label class="check-row"><input id="carTransitionActivateTarget" type="checkbox" checked /> Activar temporada destino al aplicar</label>
          <button id="applyCarTransitionBtn" type="button" class="ghost">Generar coches iniciales</button>
        </div>
      </div>
      ${renderCarTransitionPreview(teams, transition)}
    </section>
  `;
}

function renderUpgradeTypeOptions(pieceId, selected = "") {
  const options = upgradeTypesForPiece(pieceId);
  const value = selected && options.includes(selected) ? selected : options[0] || "";
  return options.map((option) => `
    <option value="${html(option)}" ${option === value ? "selected" : ""}>${html(option)}</option>
  `).join("");
}

function carDesignFormPrefix(mode) {
  return mode === "research" ? "carResearch" : "carDesign";
}

function renderCarDesignUpgradeOptions() {
  const select = $("carDesignUpgradeType");
  const pieceId = $("carDesignPiece")?.value;
  if (!select || !pieceId) return;
  select.disabled = false;
  select.innerHTML = renderUpgradeTypeOptions(pieceId, select.value);
}

function updateTeamCarRequestUpgradeOptions() {
  const mode = $("teamCarRequestMode")?.value || "design";
  const pieceId = $("teamCarRequestPiece")?.value;
  const select = $("teamCarRequestUpgradeType");
  if (!select || !pieceId) return;

  if (mode === "research") {
    select.innerHTML = `<option value="Equilibrado">Equilibrado</option>`;
    select.value = "Equilibrado";
    select.disabled = true;
    return;
  }

  select.disabled = Boolean($("teamCarRequestPiece")?.disabled);
  select.innerHTML = renderUpgradeTypeOptions(pieceId, select.value);
}

function renderCarDesignStatFields(mode = "") {
  if (!mode) {
    renderCarDesignStatFields("design");
    renderCarDesignStatFields("research");
    return;
  }

  const prefix = carDesignFormPrefix(mode);
  const container = $(`${prefix}Stats`);
  if (!container) return;
  const piece = pieceById($(`${prefix}Piece`)?.value);
  const steps = Math.max(0, Math.min(10, Number($(`${prefix}Steps`)?.value || 0)));
  if (!piece) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="cost-note">Coste: ${moneyM(designCostM(piece.id, mode))}</div>
    ${mode === "research" ? `<p class="muted">Investigacion: se guarda como Equilibrado, no se puede equipar y solo acumula valores positivos para la proxima temporada.</p>` : ""}
    ${piece.stats.filter((stat) => !(mode === "research" && stat === "Duracion minima")).map((stat) => {
      const isDuration = stat === "Duracion minima";
      const value = isDuration ? piece.durationMinBySteps[steps] || piece.durationMinBySteps[0] || 0 : "";
      return `
        <label>${html(stat)}
          <input class="car-stat-input" data-stat="${html(stat)}" type="number" step="0.01" value="${html(value)}" ${isDuration ? "readonly" : "required"} />
        </label>
      `;
    }).join("")}
  `;
}

function renderEngineRunPreview() {
  const container = $("engineRunPreview");
  if (!container) return;

  const teamId = $("engineRunTeam")?.value;
  const statId = $("engineRunStat")?.value;
  const modeId = $("engineRunMode")?.value || "normal";
  const engine = engineDoc(teamId);
  const stat = engineStatById(statId);
  if (!teamId || !stat) {
    container.innerHTML = "";
    return;
  }

  const stats = normalizeEngineStats(engine.stats || {});
  container.innerHTML = `
    <div class="cost-note">Valor actual: ${html(stats[stat.id])} - Motor: ${html(engine.engineName || teamName(teamId))}</div>
    ${renderEngineProbabilities(engine, stat.id, modeId)}
  `;
}

function renderMovementsTable(movements) {
  if (!movements.length) {
    return `<div class="empty">Todavia no hay movimientos registrados.</div>`;
  }
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Temporada</th><th>Categoria</th><th>Concepto</th><th>Monto</th><th>Fecha</th></tr></thead>
        <tbody>
          ${movements.map((move) => `
            <tr>
              <td>${html(move.seasonId || activeSeasonId())}</td>
              <td>${html(move.category)}</td>
              <td>${html(move.concept)}</td>
              <td class="${Number(move.amountM) < 0 ? "negative" : "positive"}">${signedMoneyM(move.amountM)}</td>
              <td>${formatDate(move.createdAt)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function readTransitionValuesFromForm() {
  const values = {};
  document.querySelectorAll("[data-transition-piece][data-transition-stat]").forEach((input) => {
    const pieceId = input.dataset.transitionPiece;
    const stat = input.dataset.transitionStat;
    const value = positiveMoneyValue(input.value);
    if (!values[pieceId]) values[pieceId] = {};
    if (value > 0) values[pieceId][stat] = value;
  });
  return values;
}

async function saveCarTransitionSettings(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("carTransitionMessage"), "");
  try {
    const targetSeasonId = $("carTransitionTargetSeason").value;
    const mode = $("carTransitionMode").value;
    if (!targetSeasonId) throw new Error("Selecciona una temporada destino.");
    if (!["normal", "regulation"].includes(mode)) throw new Error("Modo de transicion no valido.");
    if (!cache.seasons.some((season) => season.id === targetSeasonId)) {
      throw new Error("La temporada destino debe existir en Admin > Base.");
    }

    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      carTransition: {
        mode,
        targetSeasonId,
        values: readTransitionValuesFromForm(),
        updatedAtLabel: new Date().toISOString(),
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("carTransitionMessage"), "Transicion de coche guardada.", "success");
    await loadPublicData();
    render();
  } catch (error) {
    showMessage($("carTransitionMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function markResearchApplied(list, targetSeasonId, appliedAtLabel) {
  return (Array.isArray(list) ? list : []).map((research) => (
    research.mode === "research" && !research.appliedToSeasonId
      ? { ...research, appliedToSeasonId: targetSeasonId, appliedAtLabel }
      : research
  ));
}

async function applyCarTransition(event) {
  const stop = setLoading(event.currentTarget, "Aplicando...");
  showMessage($("carTransitionMessage"), "");
  try {
    const transition = currentCarTransition();
    const targetSeasonId = transition.targetSeasonId;
    if (!targetSeasonId) throw new Error("Guarda una temporada destino antes de aplicar.");
    const targetSeason = cache.seasons.find((season) => season.id === targetSeasonId);
    if (!targetSeason) throw new Error("La temporada destino debe existir en Admin > Base.");

    const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
    if (transition.mode === "normal") {
      const missing = [];
      teams.forEach((team) => {
        carPieces().forEach((piece) => {
          if (!latestDesignForPiece(team.id, piece.id)) {
            missing.push(`${team.name} / ${piece.name}`);
          }
        });
      });
      if (missing.length) {
        throw new Error(`Faltan ultimos disenos para cambio normal: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? "..." : ""}`);
      }
    }

    const ok = window.confirm(`Generar coches iniciales para ${targetSeason.name || targetSeasonId.toUpperCase()}? Esto cambiara el coche activo de todos los equipos.`);
    if (!ok) {
      showMessage($("carTransitionMessage"), "Transicion cancelada.");
      return;
    }

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const appliedAtLabel = new Date().toISOString();
    const activateTarget = $("carTransitionActivateTarget")?.checked !== false;

    teams.forEach((team) => {
      const car = carDoc(team.id);
      const selection = carSelection(team.id);
      const preview = transitionPreviewForTeam(team.id, transition);
      const carName = nextCarNameForTeam(team.id, targetSeasonId);
      const nextActiveDesignIds = {};
      const nextSelectedDesignIds = {};
      const nextDesigns = { ...(car.designs || {}) };
      const nextResearches = { ...(car.researches || {}) };

      preview.forEach((row) => {
        const designId = `${targetSeasonId}-${team.id}-${row.piece.id}-${Date.now().toString(36)}`;
        const currentList = Array.isArray(nextDesigns[row.piece.id]) ? nextDesigns[row.piece.id] : [];
        nextDesigns[row.piece.id] = [
          ...markResearchApplied(currentList, targetSeasonId, appliedAtLabel),
          {
            id: designId,
            pieceId: row.piece.id,
            name: carName,
            mode: "season-base",
            upgradeType: transition.mode === "regulation" ? "Base regulacion" : "Base reglamento",
            steps: 0,
            stats: row.resultStats,
            costM: 0,
            source: "season-transition",
            fromSeasonId: activeSeasonId(),
            seasonId: targetSeasonId,
            transitionMode: transition.mode,
            createdAtLabel: appliedAtLabel,
            createdByUid: currentUser.uid,
            createdByEmail: currentUser.email
          }
        ];
        nextResearches[row.piece.id] = markResearchApplied(nextResearches[row.piece.id], targetSeasonId, appliedAtLabel);
        nextActiveDesignIds[row.piece.id] = designId;
        nextSelectedDesignIds[row.piece.id] = designId;
      });

      batch.set(db.collection("lfm_teamCars").doc(team.id), {
        teamId: team.id,
        seasonId: targetSeasonId,
        carName,
        designs: nextDesigns,
        researches: nextResearches,
        activeDesignIds: nextActiveDesignIds,
        lastSeasonTransition: {
          fromSeasonId: activeSeasonId(),
          toSeasonId: targetSeasonId,
          mode: transition.mode,
          appliedAtLabel,
          appliedByUid: currentUser.uid,
          appliedByEmail: currentUser.email
        },
        updatedAt: now
      }, { merge: true });

      batch.set(db.collection("lfm_carSelections").doc(team.id), {
        teamId: team.id,
        seasonId: targetSeasonId,
        selectedDesignIds: nextSelectedDesignIds,
        status: "applied",
        nextCarName: selection.nextCarName || carName,
        appliedRaceId: "",
        appliedRaceLabel: "",
        appliedByUid: currentUser.uid,
        appliedByEmail: currentUser.email,
        appliedAt: now
      }, { merge: true });
    });

    batch.set(db.collection("lfm_seasons").doc(activeSeasonId()), {
      carTransition: {
        ...transition,
        lastAppliedToSeasonId: targetSeasonId,
        lastAppliedAtLabel: appliedAtLabel,
        lastAppliedByUid: currentUser.uid,
        lastAppliedByEmail: currentUser.email
      },
      updatedAt: now
    }, { merge: true });

    if (activateTarget) {
      batch.set(db.collection("lfm_settings").doc("current"), {
        seasonId: targetSeasonId,
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email,
        updatedAt: now
      }, { merge: true });
    }

    await batch.commit();
    if (activateTarget) cache.seasonId = targetSeasonId;
    showMessage($("carTransitionMessage"), `Coches iniciales generados para ${targetSeason.name || targetSeasonId.toUpperCase()}.`, "success");
    await loadCarData();
    await loadPublicData();
    render();
  } catch (error) {
    showMessage($("carTransitionMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function seedT7() {
  const button = $("seedBtn");
  const stop = setLoading(button, "Inicializando...");
  showMessage($("seedMessage"), "");
  try {
    const seedSeasonId = window.LFM_SEED.season?.id || "t7";
    const [carsSnap, enginesSnap, awardSettingsDoc, regulationDoc, motoristChampionshipDoc, constructorChampionshipDoc, constructorPointSystemDoc, constructorPredictionSettingsDoc] = await Promise.all([
      db.collection("lfm_teamCars").get(),
      db.collection("lfm_teamEngines").get(),
      db.collection("lfm_awardSettings").doc(seedSeasonId).get(),
      db.collection("lfm_regulations").doc(seedSeasonId).get(),
      db.collection("lfm_motoristChampionships").doc(seedSeasonId).get(),
      db.collection("lfm_constructorChampionships").doc(seedSeasonId).get(),
      db.collection("lfm_constructorPointSystems").doc(seedSeasonId).get(),
      db.collection("lfm_constructorPredictionSettings").doc(seedSeasonId).get()
    ]);
    const carsWithWeights = new Set(
      carsSnap.docs
        .filter((doc) => doc.data().weightLevels)
        .map((doc) => doc.id)
    );
    const enginesWithStats = new Set(
      enginesSnap.docs
        .filter((doc) => doc.data().stats)
        .map((doc) => doc.id)
    );
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    batch.set(db.collection("lfm_seasons").doc(seedSeasonId), {
      ...window.LFM_SEED.season,
      calendar: window.LFM_SEED.calendar || [],
      headquartersFacilities: window.LFM_SEED.headquartersFacilities || [],
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_settings").doc("current"), {
      seasonId: seedSeasonId,
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_costs").doc(seedSeasonId), {
      ...window.LFM_SEED.costs,
      updatedAt: now
    }, { merge: true });

    if (!awardSettingsDoc.exists) {
      batch.set(db.collection("lfm_awardSettings").doc(seedSeasonId), {
        ...defaultAwardSettings(),
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });
    }

    if (!regulationDoc.exists) {
      batch.set(db.collection("lfm_regulations").doc(seedSeasonId), {
        ...defaultRegulation(),
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });
    }

    if (!motoristChampionshipDoc.exists) {
      batch.set(db.collection("lfm_motoristChampionships").doc(seedSeasonId), {
        ...defaultMotoristChampionship(),
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });
    }

    if (!constructorChampionshipDoc.exists) {
      batch.set(db.collection("lfm_constructorChampionships").doc(seedSeasonId), {
        ...defaultConstructorChampionship(),
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });
    }

    if (!constructorPointSystemDoc.exists) {
      batch.set(db.collection("lfm_constructorPointSystems").doc(seedSeasonId), {
        ...defaultConstructorPointSystem(),
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });
    }

    if (!constructorPredictionSettingsDoc.exists) {
      batch.set(db.collection("lfm_constructorPredictionSettings").doc(seedSeasonId), {
        ...defaultConstructorPredictions(),
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });
    }

    window.LFM_SEED.teams.forEach((team) => {
      batch.set(db.collection("lfm_teams").doc(team.id), {
        ...team,
        seasonId: seedSeasonId,
        updatedAt: now
      }, { merge: true });

      batch.set(db.collection("lfm_teamFacilities").doc(team.id), {
        teamId: team.id,
        seasonId: seedSeasonId,
        levels: window.LFM_SEED.headquarters?.[team.id] || {},
        updatedAt: now
      }, { merge: true });

      if (!carsWithWeights.has(team.id)) {
        batch.set(db.collection("lfm_teamCars").doc(team.id), {
          teamId: team.id,
          seasonId: seedSeasonId,
          weightLevels: seedWeightLevels(team.id),
          weightHistory: [],
          updatedAt: now
        }, { merge: true });
      }

      if (team.isMotorist && !enginesWithStats.has(team.id)) {
        batch.set(db.collection("lfm_teamEngines").doc(team.id), {
          teamId: team.id,
          seasonId: seedSeasonId,
          engineName: `Motor ${team.name}`,
          clients: team.motorClients || [],
          stats: defaultEngineStats(),
          history: [],
          updatedAt: now
        }, { merge: true });
      }
    });

    await batch.commit();
    showMessage($("seedMessage"), "T7 inicializada correctamente.", "success");
    await loadPublicData();
    await loadAwardsData();
    await loadRegulationData();
    await loadMotoristChampionshipData();
    await loadConstructorChampionshipData();
    await loadConstructorPredictionsData();
    await loadHeadquartersData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    await loadEngineData();
    render();
  } catch (error) {
    showMessage($("seedMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveSeasonSettings(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("seasonMessage"), "");
  try {
    const completedRaces = Number($("seasonCompletedRaces").value);
    const developmentLimitM = Number($("seasonDevelopmentLimit").value);
    const motorLimitM = Number($("seasonMotorLimit").value);

    if (!Number.isInteger(completedRaces) || completedRaces < 0) {
      throw new Error("Las carreras completadas deben ser un numero entero.");
    }
    if (!Number.isFinite(developmentLimitM) || developmentLimitM < 0) {
      throw new Error("El limite de desarrollo no es valido.");
    }
    if (!Number.isFinite(motorLimitM) || motorLimitM < 0) {
      throw new Error("El limite motor no es valido.");
    }

    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      status: $("seasonStatus").value,
      completedRaces,
      developmentLimitM,
      motorLimitM,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("seasonMessage"), "Ajustes de temporada guardados.", "success");
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    await loadEngineData();
    render();
  } catch (error) {
    showMessage($("seasonMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveSeasonCalendar(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("seasonCalendarMessage"), "");
  try {
    if (constructorResultImports().length) {
      const ok = window.confirm("Ya hay JSONs importados. Cambiar el calendario puede cambiar a que GP apuntan algunos resultados. Continuar?");
      if (!ok) {
        showMessage($("seasonCalendarMessage"), "Guardado cancelado.");
        return;
      }
    }

    const calendar = seasonCalendarFromActiveRows(activeSeasonId());
    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      calendar,
      completedRaces: calendar.filter((race) => race.completed).length,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("seasonCalendarMessage"), "Calendario guardado.", "success");
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    render();
  } catch (error) {
    showMessage($("seasonCalendarMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function emptyConstructorChampionshipForSeason(seasonId) {
  const teams = cache.teams.length ? cache.teams : window.LFM_SEED.teams || [];
  return {
    seasonId,
    importedRaces: [],
    standings: teams.map((team, index) => ({
      teamId: team.id,
      position: index + 1,
      points: 0,
      note: ""
    }))
  };
}

function emptyMotoristChampionshipForSeason(seasonId) {
  return {
    seasonId,
    pointsByPosition: currentMotoristChampionship().pointsByPosition || defaultMotoristChampionship().pointsByPosition,
    results: {}
  };
}

async function saveActiveSeason(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Activando...");
  showMessage($("activeSeasonMessage"), "");
  try {
    const nextSeasonId = $("activeSeasonSelect").value;
    if (!nextSeasonId) throw new Error("Selecciona una temporada.");

    await db.collection("lfm_settings").doc("current").set({
      seasonId: nextSeasonId,
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    cache.seasonId = nextSeasonId;
    showMessage($("activeSeasonMessage"), "Temporada activa actualizada.", "success");
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadHeadquartersData();
    await loadCarData();
    await loadEngineData();
    render();
  } catch (error) {
    showMessage($("activeSeasonMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function createSeason(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Creando...");
  showMessage($("newSeasonMessage"), "");
  try {
    const number = Number($("newSeasonNumber").value);
    const seasonId = seasonIdFromNumber(number);
    const name = $("newSeasonName").value.trim();
    const developmentLimitM = Number($("newSeasonDevelopmentLimit").value);
    const motorLimitM = Number($("newSeasonMotorLimit").value);
    const motorRaceLimitM = Number($("newSeasonMotorRaceLimit").value);
    const calendarMode = $("newSeasonCalendarMode")?.value || "copy-current";
    const activate = $("newSeasonActivate").checked;

    if (!seasonId) throw new Error("Numero de temporada no valido.");
    if (!name) throw new Error("Completa el nombre de la temporada.");
    if (!Number.isFinite(developmentLimitM) || developmentLimitM < 0) throw new Error("Limite de desarrollo no valido.");
    if (!Number.isFinite(motorLimitM) || motorLimitM < 0) throw new Error("Limite motor no valido.");
    if (!Number.isFinite(motorRaceLimitM) || motorRaceLimitM < 0) throw new Error("Limite motor por GP no valido.");

    const existing = await db.collection("lfm_seasons").doc(seasonId).get();
    if (existing.exists) throw new Error(`La temporada ${seasonId.toUpperCase()} ya existe.`);

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const calendar = newSeasonCalendarForMode(seasonId, calendarMode);
    const batch = db.batch();

    batch.set(db.collection("lfm_seasons").doc(seasonId), {
      id: seasonId,
      number,
      name,
      status: "pretemporada",
      completedRaces: 0,
      developmentLimitM,
      motorLimitM,
      motorRaceLimitM: moneyValue(motorRaceLimitM),
      currentRaceWindow: {
        raceId: "",
        label: "",
        developmentOpen: false,
        selectionOpen: false,
        isOpen: false
      },
      aliases: cache.season?.aliases || window.LFM_SEED.season?.aliases || {},
      calendar,
      calendarCreatedFrom: calendarMode,
      headquartersFacilities: cache.season?.headquartersFacilities || window.LFM_SEED.headquartersFacilities || [],
      createdFromSeasonId: activeSeasonId(),
      createdByUid: currentUser.uid,
      createdByEmail: currentUser.email,
      createdAt: now,
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_awardSettings").doc(seasonId), {
      ...awardSettings(),
      seasonId,
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_costs").doc(seasonId), {
      ...window.LFM_SEED.costs,
      seasonId,
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_regulations").doc(seasonId), {
      ...currentRegulation(),
      seasonId,
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_motoristChampionships").doc(seasonId), {
      ...emptyMotoristChampionshipForSeason(seasonId),
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_constructorChampionships").doc(seasonId), {
      ...emptyConstructorChampionshipForSeason(seasonId),
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_constructorPointSystems").doc(seasonId), {
      ...currentConstructorPointSystem(),
      seasonId,
      updatedAt: now
    }, { merge: true });

    batch.set(db.collection("lfm_constructorPredictionSettings").doc(seasonId), {
      seasonId,
      status: "cerrado",
      entries: [],
      updatedAt: now
    }, { merge: true });

    if (activate) {
      batch.set(db.collection("lfm_settings").doc("current"), {
        seasonId,
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email,
        updatedAt: now
      }, { merge: true });
    }

    await batch.commit();
    if (activate) cache.seasonId = seasonId;
    showMessage($("newSeasonMessage"), `${name} creada${activate ? " y activada" : ""}.`, "success");
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadHeadquartersData();
    await loadCarData();
    await loadEngineData();
    render();
  } catch (error) {
    showMessage($("newSeasonMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function selectedRaceWindowRace() {
  const races = cache.calendar.length ? cache.calendar : window.LFM_SEED.calendar || [];
  const raceId = $("raceWindowRace")?.value || currentRaceWindow().raceId;
  const race = races.find((item) => item.id === raceId);
  if (!race) throw new Error("Carrera no encontrada.");
  return race;
}

async function openDevelopmentWindow(event) {
  const stop = setLoading(event.currentTarget, "Abriendo...");
  showMessage($("raceWindowMessage"), "");
  try {
    if (isAnyCarWindowOpen()) {
      throw new Error("Ya hay un plazo de coche abierto.");
    }

    const race = selectedRaceWindowRace();

    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      currentRaceWindow: {
        raceId: race.id,
        label: raceLabel(race),
        developmentOpen: true,
        selectionOpen: false,
        isOpen: false,
        developmentOpenedByUid: currentUser.uid,
        developmentOpenedByEmail: currentUser.email,
        developmentOpenedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("raceWindowMessage"), `Plazo de mejoras abierto para ${raceLabel(race)}.`, "success");
    await loadPublicData();
    render();
  } catch (error) {
    showMessage($("raceWindowMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function closeDevelopmentWindow(event) {
  const stop = setLoading(event.currentTarget, "Cerrando...");
  showMessage($("raceWindowMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("No hay un plazo de mejoras abierto.");
    }

    const raceWindow = currentRaceWindow();
    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      currentRaceWindow: {
        ...raceWindow,
        developmentOpen: false,
        selectionOpen: false,
        isOpen: false,
        developmentClosedByUid: currentUser.uid,
        developmentClosedByEmail: currentUser.email,
        developmentClosedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("raceWindowMessage"), `Plazo de mejoras cerrado para ${currentRaceWindowLabel()}.`, "success");
    await loadPublicData();
    render();
  } catch (error) {
    showMessage($("raceWindowMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function openSelectionWindow(event) {
  const stop = setLoading(event.currentTarget, "Abriendo...");
  showMessage($("raceWindowMessage"), "");
  try {
    if (isAnyCarWindowOpen()) {
      throw new Error("Ya hay un plazo de coche abierto.");
    }

    const pendingCarCount = allPendingCarRequests(cache.teams).length;
    const pendingWeightCount = allPendingWeightRequests(cache.teams).length;
    const pendingEngineCount = allPendingEngineRequests(cache.teams).length;
    const pendingCount = pendingCarCount + pendingWeightCount + pendingEngineCount;
    if (pendingCount) {
      throw new Error(`No puedes abrir seleccion: quedan ${pendingCarCount} solicitudes de coche, ${pendingWeightCount} de peso y ${pendingEngineCount} de motor pendientes.`);
    }

    const race = selectedRaceWindowRace();
    const previous = currentRaceWindow();
    const sameRace = previous.raceId === race.id;

    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      currentRaceWindow: {
        ...(sameRace ? previous : {}),
        raceId: race.id,
        label: raceLabel(race),
        developmentOpen: false,
        selectionOpen: true,
        isOpen: true,
        selectionOpenedByUid: currentUser.uid,
        selectionOpenedByEmail: currentUser.email,
        selectionOpenedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("raceWindowMessage"), `Plazo de seleccion abierto para ${raceLabel(race)}.`, "success");
    await loadPublicData();
    render();
  } catch (error) {
    showMessage($("raceWindowMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function closeRaceWindowAndApply(event) {
  const button = event.currentTarget;
  const stop = setLoading(button, "Cerrando...");
  showMessage($("raceWindowMessage"), "");
  try {
    if (!isSelectionWindowOpen()) {
      throw new Error("No hay un plazo de seleccion abierto.");
    }

    const raceWindow = currentRaceWindow();
    const ok = window.confirm(`Cerrar seleccion de ${currentRaceWindowLabel()} y aplicar selecciones de todos los equipos?`);
    if (!ok) {
      showMessage($("raceWindowMessage"), "Cierre cancelado.");
      return;
    }

    const results = [];
    for (const team of cache.teams) {
      try {
        results.push(await applySelectionForTeam(team.id, raceWindow));
      } catch (error) {
        results.push({
          teamId: team.id,
          skipped: true,
          reason: translateError(error),
          changedPieces: [],
          manufactureCostM: 0
        });
      }
    }

    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      currentRaceWindow: {
        ...raceWindow,
        developmentOpen: false,
        selectionOpen: false,
        isOpen: false,
        selectionClosedByUid: currentUser.uid,
        selectionClosedByEmail: currentUser.email,
        selectionClosedAt: firebase.firestore.FieldValue.serverTimestamp(),
        closedByUid: currentUser.uid,
        closedByEmail: currentUser.email,
        closedAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const applied = results.filter((item) => !item.skipped).length;
    const skipped = results.filter((item) => item.skipped).length;
    const chargedM = Math.round(results.reduce((sum, item) => sum + Number(item.manufactureCostM || 0), 0) * 1000) / 1000;

    showMessage(
      $("raceWindowMessage"),
      `Plazo cerrado. Aplicados ${applied} equipos, omitidos ${skipped}, cobrado ${moneyM(chargedM)}.`,
      "success"
    );
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    await loadEngineData();
    render();
  } catch (error) {
    showMessage($("raceWindowMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("profileMessage"), "");
  try {
    const uid = $("profileUid").value.trim();
    const role = $("profileRole").value;
    const teamId = $("profileTeam").value;
    const team = cache.teamMap.get(teamId);
    const email = $("profileEmail").value.trim().toLowerCase();
    const displayNameInput = $("profileDisplayName").value.trim();

    if (!uid) throw new Error("El UID es obligatorio.");
    if (!email) throw new Error("El email es obligatorio.");
    if (!["manager", "predictor"].includes(role)) throw new Error("Rol no valido.");
    if (role === "manager" && !team) throw new Error("Un manager necesita equipo valido.");
    if (role === "predictor" && !displayNameInput) throw new Error("Un votante necesita nombre publico.");

    const displayName = role === "manager"
      ? displayNameInput || team?.name || teamId
      : displayNameInput;

    await db.collection("lfm_users").doc(uid).set({
      role,
      teamId: role === "manager" ? teamId : "",
      email,
      displayName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    showMessage($("profileMessage"), "Perfil guardado.", "success");
    event.target.reset();
  } catch (error) {
    showMessage($("profileMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function savePersonnelEntry(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("personnelMessage"), "");
  try {
    const teamId = $("personnelTeam").value;
    const team = cache.teamMap.get(teamId);
    if (!team) throw new Error("Equipo no valido.");

    const entry = {
      id: `personnel-${Date.now().toString(36)}`,
      role: $("personnelRole").value.trim(),
      name: $("personnelName").value.trim(),
      valueM: moneyValue($("personnelValueM").value),
      notes: $("personnelNotes").value.trim()
    };

    if (!entry.role) throw new Error("Completa el rol.");
    if (!entry.name) throw new Error("Completa el nombre.");
    if (entry.valueM < 0) throw new Error("El valor no puede ser negativo.");

    await db.collection("lfm_teamPersonnel").doc(teamId).set({
      teamId,
      seasonId: activeSeasonId(),
      entries: [...personnelEntries(teamId), entry],
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("personnelMessage"), `Personal agregado a ${team.name}.`, "success");
    event.target.reset();
    await loadPersonnelData();
    render();
  } catch (error) {
    showMessage($("personnelMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function deletePersonnelEntry(event) {
  const [teamId, entryId] = String(event.currentTarget.dataset.deletePersonnel || "").split(":");
  const team = cache.teamMap.get(teamId);
  if (!team || !entryId) return;
  if (!window.confirm(`Borrar esta entrada de personal de ${team.name}?`)) return;

  const stop = setLoading(event.currentTarget, "Borrando...");
  try {
    await db.collection("lfm_teamPersonnel").doc(teamId).set({
      teamId,
      seasonId: activeSeasonId(),
      entries: personnelEntries(teamId).filter((entry) => entry.id !== entryId),
      updatedByUid: currentUser.uid,
      updatedByEmail: currentUser.email,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await loadPersonnelData();
    render();
  } catch (error) {
    window.alert(translateError(error));
  } finally {
    stop();
  }
}

async function importStaffRosters(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Importando...");
  showMessage($("staffImportMessage"), "");
  try {
    const file = $("staffImportFile")?.files?.[0];
    if (!file) throw new Error("Selecciona un JSON de staff.");

    const data = JSON.parse(await file.text());
    const docs = staffImportDocs(data, file.name);
    const totalEntries = docs.reduce((sum, doc) => sum + doc.entries.length, 0);
    const ok = window.confirm(
      `Importar parrilla para ${docs.length} equipos (${totalEntries} entradas)? Esto reemplaza las plantillas actuales de esos equipos y no toca presupuesto.`
    );
    if (!ok) {
      showMessage($("staffImportMessage"), "Importacion cancelada.");
      return;
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    docs.forEach((doc) => {
      batch.set(db.collection("lfm_teamPersonnel").doc(doc.teamId), {
        teamId: doc.teamId,
        seasonId: activeSeasonId(),
        entries: doc.entries,
        source: "staff-json",
        sourceTeamId: doc.sourceTeamId,
        importedFrom: file.name,
        marketStatus: data.market?.status || "",
        marketPeriodId: data.market?.periodId || "",
        updatedByUid: currentUser.uid,
        updatedByEmail: currentUser.email,
        updatedAt: now
      }, { merge: true });
    });
    await batch.commit();

    showMessage($("staffImportMessage"), `Parrilla importada: ${docs.length} equipos, ${totalEntries} entradas.`, "success");
    event.target.reset();
    await loadPersonnelData();
    render();
  } catch (error) {
    showMessage($("staffImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function exportMoneyForBids(event) {
  const stop = setLoading(event.currentTarget, "Exportando...");
  showMessage($("moneyExportMessage"), "");
  try {
    const payload = buildMoneyExportPayload();
    if (!payload.teams.length) throw new Error("No hay equipos cargados para exportar.");

    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `lfm-money-${fileNamePart(payload.season.id)}-${datePart}.json`;
    downloadJsonFile(filename, payload);
    showMessage($("moneyExportMessage"), `Exportado ${filename}.`, "success");
  } catch (error) {
    showMessage($("moneyExportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function importMoneyFromBids(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Leyendo...");
  showMessage($("moneyImportMessage"), "");
  try {
    const file = $("moneyImportFile").files[0];
    if (!file) throw new Error("Selecciona un JSON de dinero.");

    const data = JSON.parse(await file.text());
    cache.pendingMoneyImport = moneyImportPreview(data, file.name);
    render();
    showMessage(
      $("moneyImportMessage"),
      `Preview listo: ${cache.pendingMoneyImport.teamCount} equipos, ${cache.pendingMoneyImport.changedCount} con cambios.`,
      "success"
    );
  } catch (error) {
    cache.pendingMoneyImport = null;
    render();
    showMessage($("moneyImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function applyMoneyImport(event) {
  const pending = cache.pendingMoneyImport;
  const stop = setLoading(event.currentTarget, "Aplicando...");
  showMessage($("moneyImportMessage"), "");
  try {
    if (window.LFM_MISSING_CONFIG) throw new Error("Configura Firebase antes de importar dinero.");
    if (!pending) throw new Error("No hay importacion de dinero pendiente.");
    if (pending.seasonId !== activeSeasonId()) {
      throw new Error("La importacion pendiente pertenece a otra temporada activa. Vuelve a cargar el JSON.");
    }
    if (pending.alreadyApplied) throw new Error("Este archivo/mercado ya fue importado.");

    const ok = window.confirm(
      `Aplicar dinero desde pujas para ${pending.teamCount} equipos? Se actualizaran saldos y se crearan movimientos privados por la diferencia.`
    );
    if (!ok) {
      showMessage($("moneyImportMessage"), "Importacion cancelada.");
      return;
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    let appliedSummary = { changedCount: 0, totalDeltaM: 0 };

    await db.runTransaction(async (tx) => {
      const seasonRef = db.collection("lfm_seasons").doc(activeSeasonId());
      const seasonDoc = await tx.get(seasonRef);
      if (!seasonDoc.exists) throw new Error("La temporada activa no existe.");

      const seasonData = seasonDoc.data() || {};
      const importedIds = Array.isArray(seasonData.moneyImportIds) ? seasonData.moneyImportIds : [];
      const importedObjects = Array.isArray(seasonData.moneyImports) ? seasonData.moneyImports : [];
      const alreadyImported = importedIds.includes(pending.importId)
        || importedObjects.some((item) => item?.id === pending.importId);
      if (alreadyImported) throw new Error("Este archivo/mercado ya fue importado.");

      const teamReads = [];
      for (const row of pending.rows) {
        const teamRef = db.collection("lfm_teams").doc(row.teamId);
        const teamDoc = await tx.get(teamRef);
        if (!teamDoc.exists) throw new Error(`Equipo no encontrado: ${row.teamName}.`);
        const currentM = moneyValue(teamDoc.data().budgetRemainingM);
        const deltaM = moneyValue(row.targetM - currentM);
        teamReads.push({ row, teamRef, currentM, deltaM });
      }

      let changedCount = 0;
      let totalDeltaM = 0;
      teamReads.forEach(({ row, teamRef, currentM, deltaM }) => {
        tx.update(teamRef, {
          budgetRemainingM: row.targetM,
          updatedAt: now
        });

        if (deltaM === 0) return;
        changedCount += 1;
        totalDeltaM = moneyValue(totalDeltaM + deltaM);

        const movementRef = db.collection("lfm_teamEconomy")
          .doc(row.teamId)
          .collection("movements")
          .doc();
        tx.set(movementRef, {
          seasonId: activeSeasonId(),
          teamId: row.teamId,
          amountM: deltaM,
          category: "personal",
          limitScope: "none",
          concept: `Ajuste mercado de pujas (${pending.fileName})`,
          source: "money-import",
          importId: pending.importId,
          sourceFileName: pending.fileName,
          sourceSeasonId: pending.sourceSeasonId,
          sourceMarketId: pending.sourceMarketId,
          sourceExportedAt: pending.sourceExportedAt,
          previousBudgetRemainingM: currentM,
          targetBudgetRemainingM: row.targetM,
          importedSpentM: row.spentM,
          importedCommittedM: row.committedM,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email,
          createdAt: now
        });
      });

      tx.set(seasonRef, {
        moneyImportIds: firebase.firestore.FieldValue.arrayUnion(pending.importId),
        moneyImports: firebase.firestore.FieldValue.arrayUnion({
          id: pending.importId,
          fileName: pending.fileName,
          sourceSeasonId: pending.sourceSeasonId,
          sourceMarketId: pending.sourceMarketId,
          sourceExportedAt: pending.sourceExportedAt,
          importedAt: new Date().toISOString(),
          importedByUid: currentUser.uid,
          importedByEmail: currentUser.email,
          teamCount: pending.teamCount,
          changedCount,
          totalDeltaM
        }),
        updatedAt: now
      }, { merge: true });

      appliedSummary = { changedCount, totalDeltaM };
    });

    cache.pendingMoneyImport = null;
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    render();
    showMessage($("moneyImportMessage"), `Dinero importado: ${appliedSummary.changedCount} movimientos privados, diferencia total ${signedMoneyM(appliedSummary.totalDeltaM)}.`, "success");
  } catch (error) {
    showMessage($("moneyImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveMovement(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Registrando...");
  showMessage($("movementMessage"), "");
  try {
    const teamId = $("movementTeam").value;
    const amountM = Number($("movementAmount").value);
    const category = $("movementCategory").value;
    const concept = $("movementConcept").value.trim();

    if (!Number.isFinite(amountM) || amountM === 0) {
      throw new Error("El monto debe ser distinto de cero.");
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const teamRef = db.collection("lfm_teams").doc(teamId);
      const teamDoc = await tx.get(teamRef);
      if (!teamDoc.exists) throw new Error("Equipo no encontrado.");

      const current = Number(teamDoc.data().budgetRemainingM || 0);
      tx.update(teamRef, {
        budgetRemainingM: Math.round((current + amountM) * 1000) / 1000,
        updatedAt: now
      });

      const movementRef = teamRef.firestore
        .collection("lfm_teamEconomy")
        .doc(teamId)
        .collection("movements")
        .doc();

      tx.set(movementRef, {
        seasonId: activeSeasonId(),
        teamId,
        amountM,
        category,
        limitScope: category === "motor" && amountM < 0
          ? "motor"
          : ["coche", "peso"].includes(category) && amountM < 0
            ? "development"
            : "none",
        concept,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      });
    });

    showMessage($("movementMessage"), "Movimiento registrado y presupuesto actualizado.", "success");
    event.target.reset();
    await loadPublicData();
    if (isAdmin()) {
      await loadAdminMovements();
      render();
    }
  } catch (error) {
    showMessage($("movementMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function applyEngineRuns({
  teamId,
  statId,
  modeId,
  attemptCount,
  shouldCharge = true,
  requestId = "",
  raceId = "",
  raceLabelText = ""
}) {
  const stat = engineStatById(statId);
  const mode = engineModes().find((item) => item.id === modeId);
  if (!cache.teamMap.get(teamId)?.isMotorist) throw new Error("Selecciona un equipo motorista.");
  if (!stat) throw new Error("Stat de motor no encontrado.");
  if (!mode) throw new Error("Modo de desarrollo no encontrado.");
  if (!Number.isInteger(attemptCount) || attemptCount < 1 || attemptCount > 20) {
    throw new Error("Los intentos deben estar entre 1 y 20.");
  }

  const costM = shouldCharge ? motorRunCostM(attemptCount) : 0;
  if (shouldCharge && costM <= 0) throw new Error("Coste de intentos no configurado.");

  const selectedRaceId = raceId || currentRaceWindow().raceId || "";
  const selectedRaceLabel = raceLabelText || (selectedRaceId ? raceLabel(raceById(selectedRaceId)) || currentRaceWindowLabel() : "");
  if (shouldCharge && costM > 0) {
    if (!selectedRaceId) {
      throw new Error("Abre un plazo de GP para aplicar intentos de motor con limite por carrera.");
    }
    const freshMovements = await loadTeamMovements(teamId, 500);
    cache.teamMovements.set(teamId, freshMovements);
    const spentM = engineRaceSpentFromMovements(freshMovements, selectedRaceId, requestId);
    const limitM = engineRaceLimitM();
    if (moneyValue(spentM + costM) > moneyValue(limitM) + 0.0001) {
      throw new Error(`Limite de motor por GP superado: ${teamName(teamId)} ya gasto ${moneyM(spentM)} y esta mejora cuesta ${moneyM(costM)}. Limite: ${moneyM(limitM)}.`);
    }
  }

  const createdAtLabel = new Date().toISOString();
  const eventId = `engine-${statId}-${Date.now().toString(36)}`;
  let savedEntry = null;

  await db.runTransaction(async (tx) => {
    const engineRef = db.collection("lfm_teamEngines").doc(teamId);
    const teamRef = db.collection("lfm_teams").doc(teamId);
    const selectionRef = requestId ? db.collection("lfm_carSelections").doc(teamId) : null;
    const engineSnap = await tx.get(engineRef);
    const teamSnap = shouldCharge && costM > 0 ? await tx.get(teamRef) : null;
    const selectionSnap = selectionRef ? await tx.get(selectionRef) : null;

    if (shouldCharge && costM > 0 && !teamSnap.exists) {
      throw new Error("Equipo motorista no encontrado.");
    }

    const selectionData = selectionSnap?.exists ? selectionSnap.data() : {};
    const requestList = Array.isArray(selectionData.engineRequests) ? selectionData.engineRequests : [];
    const requestIndex = requestId
      ? requestList.findIndex((request) => request.id === requestId && request.status === "pending")
      : -1;

    if (requestId) {
      if (requestIndex < 0) throw new Error("Solicitud de motor no encontrada o ya resuelta.");
      const request = requestList[requestIndex];
      if (request.statId !== statId || request.modeId !== modeId || Number(request.attemptCount || 0) !== attemptCount) {
        throw new Error("La solicitud de motor no coincide con los intentos a aplicar.");
      }
    }

    const team = cache.teamMap.get(teamId);
    const data = engineSnap.exists ? engineSnap.data() : {};
    const stats = normalizeEngineStats(data.stats || {});
    let currentValue = stats[statId];
    const attempts = [];

    for (let index = 0; index < attemptCount; index += 1) {
      const attempt = runEngineAttempt(statId, currentValue, modeId);
      attempts.push({ ...attempt, attempt: index + 1 });
      currentValue = attempt.valueAfter;
    }

    if (!attempts.length) throw new Error("No se pudo registrar ningun intento.");

    const history = Array.isArray(data.history) ? data.history : [];
    const entry = {
      id: eventId,
      type: "runs",
      seasonId: activeSeasonId(),
      teamId,
      statId,
      modeId,
      attemptCount,
      costM,
      valueBefore: attempts[0].valueBefore,
      valueAfter: currentValue,
      attempts,
      requestId: requestId || "",
      raceId: selectedRaceId,
      raceLabel: selectedRaceLabel,
      createdAtLabel,
      createdByUid: currentUser.uid,
      createdByEmail: currentUser.email
    };
    savedEntry = entry;

    const now = firebase.firestore.FieldValue.serverTimestamp();
    tx.set(engineRef, {
      teamId,
      seasonId: activeSeasonId(),
      engineName: data.engineName || `Motor ${team?.name || teamId}`,
      clients: team?.motorClients || [],
      stats: {
        [statId]: currentValue
      },
      history: [...history, entry].slice(-160),
      lastEngineUpdateAt: now,
      updatedAt: now
    }, { merge: true });

    if (shouldCharge && costM > 0) {
      const currentBudget = Number(teamSnap.data().budgetRemainingM || 0);
      const amountM = -costM;
      tx.update(teamRef, {
        budgetRemainingM: Math.round((currentBudget + amountM) * 1000) / 1000,
        updatedAt: now
      });

      const movementRef = db.collection("lfm_teamEconomy")
        .doc(teamId)
        .collection("movements")
        .doc();

      tx.set(movementRef, {
        seasonId: activeSeasonId(),
        teamId,
        amountM,
        category: "motor",
        limitScope: "motor",
        statId,
        modeId,
        attemptCount,
        valueBefore: entry.valueBefore,
        valueAfter: currentValue,
        attempts,
        engineAction: "runs",
        engineRequestId: requestId || "",
        raceId: selectedRaceId,
        raceLabel: selectedRaceLabel,
        concept: `Motor ${stat.name}: ${attemptCount} intentos ${mode.name}${requestId ? " (solicitud equipo)" : ""}`,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      });
    }

    if (requestId && selectionRef) {
      const nextRequests = requestList.map((request, index) => (
        index === requestIndex
          ? {
              ...request,
              status: "completed",
              resolvedEngineEntryId: entry.id,
              resolvedCostM: costM,
              valueBefore: entry.valueBefore,
              valueAfter: currentValue,
              attempts,
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));
      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        engineRequests: nextRequests,
        updatedAt: now
      }, { merge: true });
    }
  });

  return savedEntry;
}

async function saveEngineRuns(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Registrando...");
  showMessage($("engineMessage"), "");
  try {
    const teamId = $("engineRunTeam").value;
    const statId = $("engineRunStat").value;
    const modeId = $("engineRunMode").value;
    const attemptCount = Number($("engineRunCount").value);
    const shouldCharge = $("engineRunCharge").checked;
    const stat = engineStatById(statId);

    const savedEntry = await applyEngineRuns({
      teamId,
      statId,
      modeId,
      attemptCount,
      shouldCharge
    });

    event.target.reset();
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadEngineData();
    await loadCarData();
    render();

    showMessage(
      $("engineMessage"),
      `${teamName(teamId)} ${stat?.name || statId}: ${renderEngineAttemptSummary(savedEntry.attempts)}. Coste ${moneyM(savedEntry.costM)}.`,
      "success"
    );
  } catch (error) {
    showMessage($("engineMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveEngineManualStat(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("engineMessage"), "");
  try {
    const teamId = $("engineManualTeam").value;
    const statId = $("engineManualStat").value;
    const value = Number($("engineManualValue").value);
    const note = $("engineManualNote").value.trim();
    const stat = engineStatById(statId);

    if (!cache.teamMap.get(teamId)?.isMotorist) throw new Error("Selecciona un equipo motorista.");
    if (!stat) throw new Error("Stat de motor no encontrado.");
    if (!Number.isFinite(value)) throw new Error("El valor debe ser numerico.");

    const createdAtLabel = new Date().toISOString();
    const eventId = `engine-manual-${statId}-${Date.now().toString(36)}`;
    let valueBefore = 0;

    await db.runTransaction(async (tx) => {
      const engineRef = db.collection("lfm_teamEngines").doc(teamId);
      const engineSnap = await tx.get(engineRef);
      const team = cache.teamMap.get(teamId);
      const data = engineSnap.exists ? engineSnap.data() : {};
      const stats = normalizeEngineStats(data.stats || {});
      valueBefore = stats[statId];
      const roundedValue = Math.round(value * 100) / 100;
      const history = Array.isArray(data.history) ? data.history : [];
      const now = firebase.firestore.FieldValue.serverTimestamp();

      tx.set(engineRef, {
        teamId,
        seasonId: activeSeasonId(),
        engineName: data.engineName || `Motor ${team?.name || teamId}`,
        clients: team?.motorClients || [],
        stats: {
          [statId]: roundedValue
        },
        history: [
          ...history,
          {
            id: eventId,
            type: "manual",
            seasonId: activeSeasonId(),
            teamId,
            statId,
            costM: 0,
            valueBefore,
            valueAfter: roundedValue,
            note,
            createdAtLabel,
            createdByUid: currentUser.uid,
            createdByEmail: currentUser.email
          }
        ].slice(-160),
        lastEngineUpdateAt: now,
        updatedAt: now
      }, { merge: true });
    });

    event.target.reset();
    await loadEngineData();
    render();
    showMessage($("engineMessage"), `${teamName(teamId)} ${stat.name}: ${valueBefore} -> ${Math.round(value * 100) / 100}.`, "success");
  } catch (error) {
    showMessage($("engineMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveEngineRaceLimit(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("engineRaceLimitMessage"), "");
  try {
    const motorRaceLimitM = Number($("engineRaceLimitInput").value);
    if (!Number.isFinite(motorRaceLimitM) || motorRaceLimitM < 0) {
      throw new Error("Limite motor por GP no valido.");
    }

    await db.collection("lfm_seasons").doc(activeSeasonId()).set({
      motorRaceLimitM: moneyValue(motorRaceLimitM),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("engineRaceLimitMessage"), "Limite motor por GP guardado.", "success");
    await loadPublicData();
    render();
  } catch (error) {
    showMessage($("engineRaceLimitMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveTeamEngineRequest(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Enviando...");
  showMessage($("teamEngineRequestMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("El plazo de mejoras esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    const team = cache.teamMap.get(teamId);
    if (!teamId) throw new Error("Perfil sin equipo.");
    if (!team?.isMotorist) throw new Error("Solo los equipos motoristas pueden solicitar mejoras de motor.");

    const statId = $("teamEngineRequestStat").value;
    const modeId = $("teamEngineRequestMode").value;
    const attemptCount = Number($("teamEngineRequestAttempts").value);
    const note = $("teamEngineRequestNote").value.trim();
    const stat = engineStatById(statId);
    const mode = engineModes().find((item) => item.id === modeId);
    const costM = motorRunCostM(attemptCount);
    const raceWindow = currentRaceWindow();
    const raceId = raceWindow.raceId || "";

    if (!stat) throw new Error("Stat de motor no encontrado.");
    if (!mode) throw new Error("Modo de desarrollo no encontrado.");
    if (!Number.isInteger(attemptCount) || attemptCount < 1 || attemptCount > 20) {
      throw new Error("Los intentos deben estar entre 1 y 20.");
    }
    if (costM <= 0) throw new Error("Coste de intentos no configurado.");

    let createdRequest = null;
    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.engineRequests) ? data.engineRequests : [];
      const pending = requests.filter((request) => request.seasonId === activeSeasonId() && request.status === "pending");
      const pendingRaceCostM = moneyValue(
        pending
          .filter((request) => request.raceId === raceId)
          .reduce((sum, request) => sum + Number(request.costM || 0), 0)
      );
      const spentM = engineRaceSpentM(teamId, raceId);
      const limitM = engineRaceLimitM();

      if (moneyValue(spentM + pendingRaceCostM + costM) > moneyValue(limitM) + 0.0001) {
        throw new Error(`No queda margen de motor para este GP. Disponible: ${moneyM(limitM - spentM - pendingRaceCostM)}.`);
      }

      const request = {
        id: `ereq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        seasonId: activeSeasonId(),
        raceId,
        raceLabel: currentRaceWindowLabel(),
        statId,
        modeId,
        attemptCount,
        costM,
        note,
        status: "pending",
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAtLabel: new Date().toISOString()
      };
      createdRequest = request;

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        engineRequests: [...requests, request],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await loadCarData();
    cacheSelectionRequest(teamId, "engineRequests", createdRequest);
    render();
    showMessage($("teamEngineRequestMessage"), "Solicitud de motor enviada. Admin aplicara los intentos.", "success");
  } catch (error) {
    showMessage($("teamEngineRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function cancelTeamEngineRequest(event) {
  const requestId = event.currentTarget.dataset.cancelTeamEngineRequest || "";
  const stop = setLoading(event.currentTarget, "Cancelando...");
  showMessage($("teamEngineRequestMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("El plazo de mejoras esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    const team = cache.teamMap.get(teamId);
    if (!teamId) throw new Error("Perfil sin equipo.");
    if (!team?.isMotorist) throw new Error("Solo los equipos motoristas pueden cancelar solicitudes de motor.");
    if (!requestId) throw new Error("Solicitud no encontrada.");

    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.engineRequests) ? data.engineRequests : [];
      const index = requests.findIndex((request) => (
        request.id === requestId
        && request.seasonId === activeSeasonId()
        && request.status === "pending"
      ));

      if (index < 0) throw new Error("Solicitud de motor no encontrada o ya resuelta.");

      const nextRequests = requests.map((request, requestIndex) => (
        requestIndex === index
          ? {
              ...request,
              status: "cancelled",
              cancelReason: "Cancelada por el equipo",
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        engineRequests: nextRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    showMessage($("teamEngineRequestMessage"), "Solicitud de motor cancelada.", "success");
    await loadCarData();
    render();
  } catch (error) {
    showMessage($("teamEngineRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function applyEngineRequest(event) {
  const { teamId, requestId } = parseCarRequestToken(event.currentTarget.dataset.applyEngineRequest);
  const request = engineRequestById(teamId, requestId);
  const stop = setLoading(event.currentTarget, "Aplicando...");
  showMessage($("adminEngineRequestMessage"), "");
  try {
    if (!request || request.status !== "pending") {
      throw new Error("Solicitud de motor no encontrada o ya resuelta.");
    }

    const savedEntry = await applyEngineRuns({
      teamId,
      statId: request.statId,
      modeId: request.modeId,
      attemptCount: Number(request.attemptCount),
      shouldCharge: true,
      requestId,
      raceId: request.raceId || "",
      raceLabelText: request.raceLabel || ""
    });

    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    await loadEngineData();
    render();

    showMessage(
      $("adminEngineRequestMessage"),
      `${teamName(teamId)} ${engineStatById(request.statId)?.name || request.statId}: ${renderEngineAttemptSummary(savedEntry.attempts)}. Coste ${moneyM(savedEntry.costM)}.`,
      "success"
    );
  } catch (error) {
    showMessage($("adminEngineRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function cancelEngineRequest(event) {
  const { teamId, requestId } = parseCarRequestToken(event.currentTarget.dataset.cancelEngineRequest);
  const ok = window.confirm(`Cancelar solicitud de motor de ${teamName(teamId)}?`);
  if (!ok) return;

  const stop = setLoading(event.currentTarget, "Cancelando...");
  showMessage($("adminEngineRequestMessage"), "");
  try {
    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.engineRequests) ? data.engineRequests : [];
      const index = requests.findIndex((request) => request.id === requestId && request.status === "pending");
      if (index < 0) throw new Error("Solicitud de motor no encontrada o ya resuelta.");

      const nextRequests = requests.map((request, requestIndex) => (
        requestIndex === index
          ? {
              ...request,
              status: "cancelled",
              cancelReason: "Cancelada por admin",
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        engineRequests: nextRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await loadCarData();
    render();
    showMessage($("adminEngineRequestMessage"), "Solicitud de motor cancelada.", "success");
  } catch (error) {
    showMessage($("adminEngineRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function prepareLegacyEngines(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Leyendo...");
  showMessage($("legacyEngineImportMessage"), "");
  try {
    const file = $("legacyEngineFile").files[0];
    if (!file) throw new Error("Selecciona el archivo motores_guardados.json.");

    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const engines = {};
    Object.entries(parsed || {}).forEach(([engineName, stats]) => {
      engines[engineName] = {
        engineName,
        stats: normalizeEngineStats(stats)
      };
    });

    if (!Object.keys(engines).length) throw new Error("No encontre motores validos en el JSON.");

    cache.pendingEngineImport = {
      fileName: file.name,
      engines
    };
    render();
    showMessage($("legacyEngineImportMessage"), `Motores leidos: ${Object.keys(engines).length}. Revisa las asignaciones y guarda.`, "success");
  } catch (error) {
    showMessage($("legacyEngineImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveLegacyEngineAssignments(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("legacyEngineImportMessage"), "");
  try {
    if (!cache.pendingEngineImport) throw new Error("No hay importacion pendiente.");

    const assignments = [];
    const usedTeams = new Set();
    document.querySelectorAll("[data-import-engine-name]").forEach((select) => {
      if (!select.value) return;
      if (usedTeams.has(select.value)) {
        throw new Error(`El motorista ${teamName(select.value)} esta asignado mas de una vez.`);
      }
      usedTeams.add(select.value);
      const engine = cache.pendingEngineImport.engines[select.dataset.importEngineName];
      assignments.push({ teamId: select.value, engine });
    });

    if (!assignments.length) throw new Error("Asigna al menos un motor a un motorista.");

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    assignments.forEach(({ teamId, engine }) => {
      const team = cache.teamMap.get(teamId);
      batch.set(db.collection("lfm_teamEngines").doc(teamId), {
        teamId,
        seasonId: activeSeasonId(),
        engineName: engine.engineName,
        clients: team?.motorClients || [],
        stats: engine.stats,
        importedFrom: cache.pendingEngineImport.fileName,
        importedAt: now,
        updatedAt: now
      }, { merge: true });
    });

    await batch.commit();
    const count = assignments.length;
    cache.pendingEngineImport = null;
    await loadEngineData();
    render();
    showMessage($("legacyEngineImportMessage"), `Importados ${count} motores asignados.`, "success");
  } catch (error) {
    showMessage($("legacyEngineImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveEngineClientPayment(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Registrando...");
  showMessage($("enginePaymentMessage"), "");
  try {
    const clientId = $("enginePaymentClient").value;
    const amountM = Number($("enginePaymentAmount").value);
    const concept = $("enginePaymentConcept").value.trim();
    const client = cache.teamMap.get(clientId);
    const motoristId = client?.motoristId || "";

    if (!client || client.isMotorist || !motoristId) throw new Error("Cliente de motor no valido.");
    if (!cache.teamMap.get(motoristId)?.isMotorist) throw new Error("Motorista no valido.");
    if (!Number.isFinite(amountM) || amountM <= 0) throw new Error("El monto debe ser positivo.");
    if (!concept) throw new Error("El concepto es obligatorio.");

    const amount = Math.round(amountM * 1000) / 1000;
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await db.runTransaction(async (tx) => {
      const clientRef = db.collection("lfm_teams").doc(clientId);
      const motoristRef = db.collection("lfm_teams").doc(motoristId);
      const clientSnap = await tx.get(clientRef);
      const motoristSnap = await tx.get(motoristRef);
      if (!clientSnap.exists || !motoristSnap.exists) throw new Error("Equipo no encontrado.");

      tx.update(clientRef, {
        budgetRemainingM: Math.round((Number(clientSnap.data().budgetRemainingM || 0) - amount) * 1000) / 1000,
        updatedAt: now
      });
      tx.update(motoristRef, {
        budgetRemainingM: Math.round((Number(motoristSnap.data().budgetRemainingM || 0) + amount) * 1000) / 1000,
        updatedAt: now
      });

      const clientMovement = db.collection("lfm_teamEconomy").doc(clientId).collection("movements").doc();
      const motoristMovement = db.collection("lfm_teamEconomy").doc(motoristId).collection("movements").doc();
      const movementBase = {
        seasonId: activeSeasonId(),
        category: "motor",
        limitScope: "none",
        transferType: "engineClientPayment",
        linkedTeamId: motoristId,
        concept,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      };

      tx.set(clientMovement, {
        ...movementBase,
        teamId: clientId,
        linkedTeamId: motoristId,
        amountM: -amount
      });
      tx.set(motoristMovement, {
        ...movementBase,
        teamId: motoristId,
        linkedTeamId: clientId,
        amountM: amount
      });
    });

    event.target.reset();
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    render();
    showMessage($("enginePaymentMessage"), `Pago registrado: ${teamName(clientId)} -> ${teamName(motoristId)} por ${moneyM(amount)}.`, "success");
  } catch (error) {
    showMessage($("enginePaymentMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function parseCarRequestToken(token) {
  const [teamId, requestId] = String(token || "").split(":");
  return { teamId, requestId };
}

function loadCarRequestIntoForm(event) {
  const { teamId, requestId } = parseCarRequestToken(event.currentTarget.dataset.loadCarRequest);
  const request = carRequestById(teamId, requestId);
  if (!request || request.status !== "pending") {
    showMessage($("adminCarRequestMessage"), "Solicitud no encontrada o ya resuelta.", "error");
    return;
  }

  const prefix = carDesignFormPrefix(request.mode);
  const piece = pieceById(request.pieceId);
  if (!piece) {
    showMessage($("adminCarRequestMessage"), "La pieza de la solicitud no existe.", "error");
    return;
  }

  $(`${prefix}RequestId`).value = request.id;
  $(`${prefix}Team`).value = teamId;
  $(`${prefix}Piece`).value = request.pieceId;
  $(`${prefix}Name`).value = request.note || `${carRequestModeLabel(request.mode)} ${piece.name}`;
  $(`${prefix}Steps`).value = "0";
  $(`${prefix}Charge`).checked = true;

  if (request.mode === "design") {
    renderCarDesignUpgradeOptions();
    $("carDesignUpgradeType").value = request.upgradeType || "Equilibrado";
  }

  renderCarDesignStatFields(request.mode);
  showMessage(
    $("adminCarRequestMessage"),
    `Solicitud cargada: ${teamName(teamId)} / ${piece.name}. Completa stats y guarda el resultado.`,
    "success"
  );
}

async function cancelCarRequest(event) {
  const { teamId, requestId } = parseCarRequestToken(event.currentTarget.dataset.cancelCarRequest);
  const ok = window.confirm(`Cancelar solicitud de ${teamName(teamId)}?`);
  if (!ok) return;

  const stop = setLoading(event.currentTarget, "Cancelando...");
  showMessage($("adminCarRequestMessage"), "");
  try {
    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.carRequests) ? data.carRequests : [];
      const index = requests.findIndex((request) => request.id === requestId && request.status === "pending");
      if (index < 0) throw new Error("Solicitud no encontrada o ya resuelta.");

      const nextRequests = requests.map((request, requestIndex) => (
        requestIndex === index
          ? {
              ...request,
              status: "cancelled",
              cancelReason: "Cancelada por admin",
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        carRequests: nextRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await loadCarData();
    render();
  } catch (error) {
    showMessage($("adminCarRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function applyWeightRequest(event) {
  const { teamId, requestId } = parseCarRequestToken(event.currentTarget.dataset.applyWeightRequest);
  const request = weightRequestById(teamId, requestId);
  const stop = setLoading(event.currentTarget, "Aplicando...");
  showMessage($("adminWeightRequestMessage"), "");
  try {
    if (!request || request.status !== "pending") {
      throw new Error("Solicitud de peso no encontrada o ya resuelta.");
    }

    const savedEntry = await applyWeightRuns({
      teamId,
      pieceId: request.pieceId,
      runs: Number(request.runs),
      shouldCharge: true,
      requestId
    });

    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    render();

    showMessage(
      $("adminWeightRequestMessage"),
      `${teamName(teamId)} ${savedEntry.pieceName}: ${renderWeightAttemptSummary(savedEntry.attempts)}. Coste ${moneyM(savedEntry.costM)}.`,
      "success"
    );
  } catch (error) {
    showMessage($("adminWeightRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function cancelWeightRequest(event) {
  const { teamId, requestId } = parseCarRequestToken(event.currentTarget.dataset.cancelWeightRequest);
  const ok = window.confirm(`Cancelar solicitud de peso de ${teamName(teamId)}?`);
  if (!ok) return;

  const stop = setLoading(event.currentTarget, "Cancelando...");
  showMessage($("adminWeightRequestMessage"), "");
  try {
    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.weightRequests) ? data.weightRequests : [];
      const index = requests.findIndex((request) => request.id === requestId && request.status === "pending");
      if (index < 0) throw new Error("Solicitud de peso no encontrada o ya resuelta.");

      const nextRequests = requests.map((request, requestIndex) => (
        requestIndex === index
          ? {
              ...request,
              status: "cancelled",
              cancelReason: "Cancelada por admin",
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        weightRequests: nextRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await loadCarData();
    render();
    showMessage($("adminWeightRequestMessage"), "Solicitud de peso cancelada.", "success");
  } catch (error) {
    showMessage($("adminWeightRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveCarDesign(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  const form = event.target;
  const mode = form.dataset.carDesignMode || "design";
  const prefix = carDesignFormPrefix(mode);
  const message = $(`${prefix}Message`);
  showMessage(message, "");
  try {
    const requestId = $(`${prefix}RequestId`)?.value || "";
    const teamId = $(`${prefix}Team`).value;
    const pieceId = $(`${prefix}Piece`).value;
    const piece = pieceById(pieceId);
    const upgradeType = mode === "research" ? "Equilibrado" : $(`${prefix}UpgradeType`)?.value || "";
    const name = $(`${prefix}Name`).value.trim();
    const steps = Number($(`${prefix}Steps`).value);
    const shouldCharge = $(`${prefix}Charge`).checked;

    if (!piece) throw new Error("Pieza no encontrada.");
    if (!upgradeTypesForPiece(pieceId).includes(upgradeType)) {
      throw new Error("La mejora aplicada no corresponde a esa pieza.");
    }
    if (!name) throw new Error("El nombre del diseno es obligatorio.");
    if (!Number.isInteger(steps) || steps < 0 || steps > 10) {
      throw new Error("Los pasos usados deben estar entre 0 y 10.");
    }

    const stats = {};
    form.querySelectorAll(".car-stat-input").forEach((input) => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) {
        throw new Error("Todos los stats deben ser numericos.");
      }
      stats[input.dataset.stat] = Math.round(value * 100) / 100;
    });
    const savedStats = mode === "research" ? positiveStatsOnly(stats) : stats;
    if (mode === "research" && !Object.keys(savedStats).length) {
      throw new Error("La investigacion necesita al menos un valor positivo.");
    }

    const costM = designCostM(pieceId, mode);
    const design = {
      id: `${pieceId}-${Date.now().toString(36)}`,
      pieceId,
      name,
      mode,
      upgradeType,
      steps,
      stats: savedStats,
      costM,
      createdAtLabel: new Date().toISOString(),
      createdByUid: currentUser.uid,
      createdByEmail: currentUser.email
    };

    await db.runTransaction(async (tx) => {
      const carRef = db.collection("lfm_teamCars").doc(teamId);
      const teamRef = db.collection("lfm_teams").doc(teamId);
      const selectionRef = requestId ? db.collection("lfm_carSelections").doc(teamId) : null;
      const carSnap = await tx.get(carRef);
      const teamSnap = shouldCharge && costM > 0 ? await tx.get(teamRef) : null;
      const selectionSnap = selectionRef ? await tx.get(selectionRef) : null;
      const data = carSnap.exists ? carSnap.data() : {};
      const designs = data.designs || {};
      const researches = data.researches || {};
      const list = mode === "research"
        ? Array.isArray(researches[pieceId]) ? researches[pieceId] : []
        : Array.isArray(designs[pieceId]) ? designs[pieceId] : [];
      const selectionData = selectionSnap?.exists ? selectionSnap.data() : {};
      const requestList = Array.isArray(selectionData.carRequests) ? selectionData.carRequests : [];
      const requestIndex = requestId
        ? requestList.findIndex((request) => request.id === requestId && request.status === "pending")
        : -1;

      if (requestId) {
        if (requestIndex < 0) throw new Error("Solicitud no encontrada o ya resuelta.");
        const request = requestList[requestIndex];
        if (request.mode !== mode || request.pieceId !== pieceId || (mode === "design" && request.upgradeType !== upgradeType)) {
          throw new Error("La solicitud cargada no coincide con el formulario.");
        }
      }

      if (shouldCharge && costM > 0 && !teamSnap.exists) {
        throw new Error("Equipo no encontrado.");
      }

      const carUpdate = {
        teamId,
        seasonId: activeSeasonId(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (mode === "research") {
        carUpdate.researches = {
          [pieceId]: [...list, design]
        };
      } else {
        carUpdate.designs = {
          [pieceId]: [...list, design]
        };
      }
      tx.set(carRef, carUpdate, { merge: true });

      if (shouldCharge && costM > 0) {
        const current = Number(teamSnap.data().budgetRemainingM || 0);
        const amountM = -costM;
        tx.update(teamRef, {
          budgetRemainingM: Math.round((current + amountM) * 1000) / 1000,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const movementRef = db.collection("lfm_teamEconomy")
          .doc(teamId)
          .collection("movements")
          .doc();

        tx.set(movementRef, {
          seasonId: activeSeasonId(),
          teamId,
          amountM,
          category: "coche",
          limitScope: "development",
          pieceId,
          carAction: mode,
          upgradeType,
          concept: `${mode === "research" ? "Investigacion" : "Diseno"} ${piece.name} - ${upgradeType}: ${name}`,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      if (requestId && selectionRef) {
        const nextRequests = requestList.map((request, index) => (
          index === requestIndex
            ? {
                ...request,
                status: "completed",
                resolvedDesignId: design.id,
                resolvedDesignName: design.name,
                resolvedCostM: costM,
                resolvedAtLabel: new Date().toISOString(),
                resolvedByUid: currentUser.uid,
                resolvedByEmail: currentUser.email
              }
            : request
        ));
        tx.set(selectionRef, {
          teamId,
          seasonId: activeSeasonId(),
          carRequests: nextRequests,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    });

    showMessage(message, mode === "research" ? "Investigacion guardada correctamente." : "Diseno guardado correctamente.", "success");
    form.reset();
    currentAdminCarTab = "disenar";
    renderCarDesignUpgradeOptions();
    renderCarDesignStatFields(mode);
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    render();
  } catch (error) {
    showMessage(message, translateError(error), "error");
  } finally {
    stop();
  }
}

async function importLegacyCars(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Importando...");
  showMessage($("legacyCarImportMessage"), "");
  try {
    const file = $("legacyCarFile").files[0];
    if (!file) throw new Error("Selecciona el archivo liga_f1.json.");

    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const legacyTeams = parsed?.equipos || {};
    const docsByTeam = {};
    const skipped = [];

    Object.entries(legacyTeams).forEach(([legacyName, legacyTeam]) => {
      const teamId = legacyTeamId(legacyName);
      if (!teamId || !cache.teamMap.has(teamId)) {
        skipped.push(legacyName);
        return;
      }

      const car = docsByTeam[teamId] || {
        teamId,
        seasonId: activeSeasonId(),
        designs: {},
        activeDesignIds: {},
        importedFrom: file.name
      };

      Object.entries(legacyTeam?.piezas || {}).forEach(([legacyPieceName, legacyPiece]) => {
        const pieceId = legacyPieceId(legacyPieceName);
        const piece = pieceById(pieceId);
        if (!piece) {
          skipped.push(`${legacyName} / ${legacyPieceName}`);
          return;
        }

        const history = Array.isArray(legacyPiece.historial) ? legacyPiece.historial : [];
        car.designs[pieceId] = history.map((item, index) => {
          const version = Number(item.version || index + 1);
          return {
            id: `legacy-${pieceId}-v${version}`,
            pieceId,
            name: item.nombre || `Version ${version}`,
            mode: "design",
            upgradeType: item.upgradeType || item.tipo_mejora || item.mejora || "",
            steps: Number(item.pasos_usados || 0),
            stats: item.stats || {},
            costM: 0,
            source: "legacy-json",
            legacyVersion: version
          };
        });

        const activeVersion = Number(legacyPiece.activa || 0);
        if (activeVersion > 0 && car.designs[pieceId][activeVersion - 1]) {
          car.activeDesignIds[pieceId] = car.designs[pieceId][activeVersion - 1].id;
        }
      });

      docsByTeam[teamId] = car;
    });

    const docs = Object.values(docsByTeam);
    if (!docs.length) throw new Error("No encontre equipos validos para importar.");

    const ok = window.confirm(
      `Voy a importar coches para ${docs.length} equipos. Esto reemplaza los disenos actuales importados de esos equipos.`
    );
    if (!ok) {
      showMessage($("legacyCarImportMessage"), "Importacion cancelada.");
      return;
    }

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    docs.forEach((car) => {
      batch.set(db.collection("lfm_teamCars").doc(car.teamId), {
        ...car,
        updatedAt: now
      }, { merge: true });
      batch.set(db.collection("lfm_carSelections").doc(car.teamId), {
        teamId: car.teamId,
        seasonId: activeSeasonId(),
        selectedDesignIds: car.activeDesignIds || {},
        status: "applied",
        importedFrom: file.name,
        updatedAt: now
      }, { merge: true });
    });

    await batch.commit();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    render();

    const skippedText = skipped.length ? ` Omitidos: ${skipped.join(", ")}.` : "";
    showMessage($("legacyCarImportMessage"), `Importados ${docs.length} coches.${skippedText}`, "success");
  } catch (error) {
    showMessage($("legacyCarImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function applyWeightRuns({
  teamId,
  pieceId,
  runs,
  shouldCharge = true,
  requestId = ""
}) {
  const piece = weightPieceById(pieceId);
  if (!piece) throw new Error("Pieza de peso no encontrada.");
  if (![1, 2, 3].includes(runs)) throw new Error("Las tiradas deben ser 1, 2 o 3.");

  const costM = shouldCharge ? weightRunCostM(runs) : 0;
  if (shouldCharge && costM <= 0) throw new Error("Coste de tiradas no configurado.");

  const createdAtLabel = new Date().toISOString();
  const eventId = `weight-${pieceId}-${Date.now().toString(36)}`;
  let savedEntry = null;

  await db.runTransaction(async (tx) => {
    const carRef = db.collection("lfm_teamCars").doc(teamId);
    const teamRef = db.collection("lfm_teams").doc(teamId);
    const selectionRef = requestId ? db.collection("lfm_carSelections").doc(teamId) : null;
    const carSnap = await tx.get(carRef);
    const teamSnap = shouldCharge && costM > 0 ? await tx.get(teamRef) : null;
    const selectionSnap = selectionRef ? await tx.get(selectionRef) : null;

    if (shouldCharge && costM > 0 && !teamSnap.exists) {
      throw new Error("Equipo no encontrado.");
    }

    const selectionData = selectionSnap?.exists ? selectionSnap.data() : {};
    const requestList = Array.isArray(selectionData.weightRequests) ? selectionData.weightRequests : [];
    const requestIndex = requestId
      ? requestList.findIndex((request) => request.id === requestId && request.status === "pending")
      : -1;

    if (requestId) {
      if (requestIndex < 0) throw new Error("Solicitud de peso no encontrada o ya resuelta.");
      const request = requestList[requestIndex];
      if (request.pieceId !== pieceId || Number(request.runs || 0) !== runs) {
        throw new Error("La solicitud de peso no coincide con las tiradas a aplicar.");
      }
    }

    const data = carSnap.exists ? carSnap.data() : {};
    const levels = normalizeWeightLevels(teamId, data.weightLevels || {});
    const levelBefore = levels[pieceId] || 0;
    if (levelBefore >= 10) {
      throw new Error(`${piece.name} ya esta en nivel 10.`);
    }

    let currentLevel = levelBefore;
    const attempts = [];
    for (let index = 0; index < runs; index += 1) {
      if (currentLevel >= 10) break;
      const attempt = runWeightAttempt(pieceId, currentLevel);
      attempts.push({
        ...attempt,
        run: index + 1
      });
      currentLevel = attempt.levelAfter;
    }

    if (!attempts.length) throw new Error("No se pudo registrar ninguna tirada.");

    const history = Array.isArray(data.weightHistory) ? data.weightHistory : [];
    const entry = {
      id: eventId,
      type: "runs",
      seasonId: activeSeasonId(),
      teamId,
      pieceId,
      pieceName: piece.name,
      runs,
      costM,
      levelBefore,
      levelAfter: currentLevel,
      attempts,
      requestId: requestId || "",
      createdAtLabel,
      createdByUid: currentUser.uid,
      createdByEmail: currentUser.email
    };
    savedEntry = entry;

    const now = firebase.firestore.FieldValue.serverTimestamp();
    tx.set(carRef, {
      teamId,
      seasonId: activeSeasonId(),
      weightLevels: {
        [pieceId]: currentLevel
      },
      weightHistory: [...history, entry].slice(-120),
      lastWeightUpdateAt: now,
      updatedAt: now
    }, { merge: true });

    if (shouldCharge && costM > 0) {
      const current = Number(teamSnap.data().budgetRemainingM || 0);
      const amountM = -costM;
      tx.update(teamRef, {
        budgetRemainingM: Math.round((current + amountM) * 1000) / 1000,
        updatedAt: now
      });

      const movementRef = db.collection("lfm_teamEconomy")
        .doc(teamId)
        .collection("movements")
        .doc();

      tx.set(movementRef, {
        seasonId: activeSeasonId(),
        teamId,
        amountM,
        category: "peso",
        limitScope: "development",
        pieceId,
        weightAction: "runs",
        weightRequestId: requestId || "",
        runs,
        levelBefore,
        levelAfter: currentLevel,
        attempts,
        concept: `Peso ${piece.name}: ${runs} tiradas${requestId ? " (solicitud equipo)" : ""}`,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      });
    }

    if (requestId && selectionRef) {
      const nextRequests = requestList.map((request, index) => (
        index === requestIndex
          ? {
              ...request,
              status: "completed",
              resolvedWeightEntryId: entry.id,
              resolvedCostM: costM,
              levelBefore,
              levelAfter: currentLevel,
              attempts,
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));
      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        weightRequests: nextRequests,
        updatedAt: now
      }, { merge: true });
    }
  });

  return savedEntry;
}

async function saveWeightRuns(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Registrando...");
  showMessage($("weightMessage"), "");
  try {
    const teamId = $("weightRunTeam").value;
    const pieceId = $("weightRunPiece").value;
    const runs = Number($("weightRunCount").value);
    const shouldCharge = $("weightRunCharge").checked;
    const savedEntry = await applyWeightRuns({ teamId, pieceId, runs, shouldCharge });

    event.target.reset();
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    render();

    const resultText = renderWeightAttemptSummary(savedEntry.attempts);
    showMessage(
      $("weightMessage"),
      `${teamName(teamId)} ${savedEntry.pieceName}: ${resultText}. Coste ${moneyM(savedEntry.costM)}.`,
      "success"
    );
  } catch (error) {
    showMessage($("weightMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveWeightManualLevel(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("weightMessage"), "");
  try {
    const teamId = $("weightManualTeam").value;
    const pieceId = $("weightManualPiece").value;
    const piece = weightPieceById(pieceId);
    const level = clampWeightLevel($("weightManualLevel").value);
    const note = $("weightManualNote").value.trim();

    if (!piece) throw new Error("Pieza de peso no encontrada.");

    const createdAtLabel = new Date().toISOString();
    const eventId = `weight-manual-${pieceId}-${Date.now().toString(36)}`;
    let levelBefore = 0;

    await db.runTransaction(async (tx) => {
      const carRef = db.collection("lfm_teamCars").doc(teamId);
      const carSnap = await tx.get(carRef);
      const data = carSnap.exists ? carSnap.data() : {};
      const levels = normalizeWeightLevels(teamId, data.weightLevels || {});
      levelBefore = levels[pieceId] || 0;
      const history = Array.isArray(data.weightHistory) ? data.weightHistory : [];
      const now = firebase.firestore.FieldValue.serverTimestamp();

      tx.set(carRef, {
        teamId,
        seasonId: activeSeasonId(),
        weightLevels: {
          [pieceId]: level
        },
        weightHistory: [
          ...history,
          {
            id: eventId,
            type: "manual",
            seasonId: activeSeasonId(),
            teamId,
            pieceId,
            pieceName: piece.name,
            costM: 0,
            levelBefore,
            levelAfter: level,
            note,
            createdAtLabel,
            createdByUid: currentUser.uid,
            createdByEmail: currentUser.email
          }
        ].slice(-120),
        lastWeightUpdateAt: now,
        updatedAt: now
      }, { merge: true });
    });

    event.target.reset();
    await loadCarData();
    render();
    showMessage($("weightMessage"), `${teamName(teamId)} ${piece.name}: nivel ${levelBefore} -> ${level}.`, "success");
  } catch (error) {
    showMessage($("weightMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function importLegacyWeights(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Importando...");
  showMessage($("legacyWeightImportMessage"), "");
  try {
    const file = $("legacyWeightFile").files[0];
    if (!file) throw new Error("Selecciona el archivo pesos_equipos.json.");

    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const docsByTeam = {};
    const skipped = [];

    Object.entries(parsed || {}).forEach(([legacyName, legacyLevels]) => {
      const teamId = legacyTeamId(legacyName);
      if (!teamId || !cache.teamMap.has(teamId)) {
        skipped.push(legacyName);
        return;
      }

      const levels = {};
      Object.entries(legacyLevels || {}).forEach(([legacyPieceName, levelValue]) => {
        const pieceId = legacyPieceId(legacyPieceName);
        if (!weightPieceById(pieceId)) {
          skipped.push(`${legacyName} / ${legacyPieceName}`);
          return;
        }
        levels[pieceId] = clampWeightLevel(levelValue);
      });

      docsByTeam[teamId] = {
        teamId,
        seasonId: activeSeasonId(),
        weightLevels: levels,
        weightImportedFrom: file.name
      };
    });

    const docs = Object.values(docsByTeam);
    if (!docs.length) throw new Error("No encontre equipos validos para importar pesos.");

    const ok = window.confirm(
      `Voy a importar pesos para ${docs.length} equipos. Esto no cobra presupuesto.`
    );
    if (!ok) {
      showMessage($("legacyWeightImportMessage"), "Importacion cancelada.");
      return;
    }

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    docs.forEach((doc) => {
      batch.set(db.collection("lfm_teamCars").doc(doc.teamId), {
        ...doc,
        weightImportedAt: now,
        updatedAt: now
      }, { merge: true });
    });

    await batch.commit();
    await loadCarData();
    render();

    const skippedText = skipped.length ? ` Omitidos: ${skipped.join(", ")}.` : "";
    showMessage($("legacyWeightImportMessage"), `Importados pesos de ${docs.length} equipos.${skippedText}`, "success");
  } catch (error) {
    showMessage($("legacyWeightImportMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveTeamWeightRequest(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Enviando...");
  showMessage($("teamWeightRequestMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("El plazo de mejoras esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    if (!teamId) throw new Error("Perfil sin equipo.");

    const pieceId = $("teamWeightRequestPiece").value;
    const piece = weightPieceById(pieceId);
    const runs = Number($("teamWeightRequestRuns").value);
    const note = $("teamWeightRequestNote").value.trim();
    const costM = weightRunCostM(runs);
    const raceWindow = currentRaceWindow();

    if (!piece) throw new Error("Pieza de peso no encontrada.");
    if (![1, 2, 3].includes(runs)) throw new Error("Las tiradas deben ser 1, 2 o 3.");
    if (costM <= 0) throw new Error("Coste de tiradas no configurado.");

    let createdRequest = null;
    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const carRef = db.collection("lfm_teamCars").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const carSnap = await tx.get(carRef);
      const selectionData = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(selectionData.weightRequests) ? selectionData.weightRequests : [];
      const pending = requests.filter((request) => request.seasonId === activeSeasonId() && request.status === "pending");
      const carData = carSnap.exists ? carSnap.data() : {};
      const levels = normalizeWeightLevels(teamId, carData.weightLevels || {});

      if (pending.length >= 3) throw new Error("Ya tienes 3 solicitudes de peso pendientes.");
      if (pending.some((request) => request.pieceId === pieceId)) {
        throw new Error("Ya tienes una solicitud de peso pendiente para esa pieza.");
      }
      if (Number(levels[pieceId] || 0) >= 10) {
        throw new Error(`${piece.name} ya esta en nivel 10.`);
      }

      const request = {
        id: `wreq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        seasonId: activeSeasonId(),
        raceId: raceWindow.raceId || "",
        raceLabel: currentRaceWindowLabel(),
        pieceId,
        runs,
        costM,
        note,
        status: "pending",
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAtLabel: new Date().toISOString()
      };
      createdRequest = request;

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        weightRequests: [...requests, request],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await loadCarData();
    cacheSelectionRequest(teamId, "weightRequests", createdRequest);
    render();
    showMessage($("teamWeightRequestMessage"), "Solicitud de peso enviada. Admin aplicara las tiradas.", "success");
  } catch (error) {
    showMessage($("teamWeightRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function cancelTeamWeightRequest(event) {
  const requestId = event.currentTarget.dataset.cancelTeamWeightRequest || "";
  const stop = setLoading(event.currentTarget, "Cancelando...");
  showMessage($("teamWeightRequestMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("El plazo de mejoras esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    if (!teamId) throw new Error("Perfil sin equipo.");
    if (!requestId) throw new Error("Solicitud no encontrada.");

    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.weightRequests) ? data.weightRequests : [];
      const index = requests.findIndex((request) => (
        request.id === requestId
        && request.seasonId === activeSeasonId()
        && request.status === "pending"
      ));

      if (index < 0) throw new Error("Solicitud no encontrada o ya resuelta.");

      const nextRequests = requests.map((request, requestIndex) => (
        requestIndex === index
          ? {
              ...request,
              status: "cancelled",
              cancelReason: "Cancelada por el equipo",
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        weightRequests: nextRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    showMessage($("teamWeightRequestMessage"), "Solicitud de peso cancelada.", "success");
    await loadCarData();
    render();
  } catch (error) {
    showMessage($("teamWeightRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveTeamCarRequest(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Enviando...");
  showMessage($("teamCarRequestMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("El plazo de mejoras esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    if (!teamId) throw new Error("Perfil sin equipo.");

    const mode = $("teamCarRequestMode").value;
    const pieceId = $("teamCarRequestPiece").value;
    const piece = pieceById(pieceId);
    const upgradeType = mode === "research" ? "Equilibrado" : $("teamCarRequestUpgradeType").value;
    const note = $("teamCarRequestNote").value.trim();
    const raceWindow = currentRaceWindow();

    if (!["design", "research"].includes(mode)) throw new Error("Tipo de solicitud no valido.");
    if (!piece) throw new Error("Pieza no encontrada.");
    if (!upgradeTypesForPiece(pieceId).includes(upgradeType)) {
      throw new Error("La mejora aplicada no corresponde a esa pieza.");
    }
    if (!note) throw new Error("Completa una nota o nombre para la solicitud.");

    let createdRequest = null;
    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.carRequests) ? data.carRequests : [];
      const pending = requests.filter((request) => request.seasonId === activeSeasonId() && request.status === "pending");

      if (pending.length >= 4) throw new Error("Ya tienes 4 solicitudes pendientes.");
      if (pending.some((request) => request.pieceId === pieceId)) {
        throw new Error("Ya tienes una solicitud pendiente para esa pieza.");
      }

      const request = {
        id: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        seasonId: activeSeasonId(),
        raceId: raceWindow.raceId || "",
        raceLabel: currentRaceWindowLabel(),
        mode,
        pieceId,
        upgradeType,
        note,
        status: "pending",
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAtLabel: new Date().toISOString()
      };
      createdRequest = request;

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        carRequests: [...requests, request],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await loadCarData();
    cacheSelectionRequest(teamId, "carRequests", createdRequest);
    render();
    showMessage($("teamCarRequestMessage"), "Solicitud enviada. El admin cargara el resultado.", "success");
  } catch (error) {
    showMessage($("teamCarRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function cancelTeamCarRequest(event) {
  const requestId = event.currentTarget.dataset.cancelTeamCarRequest || "";
  const stop = setLoading(event.currentTarget, "Cancelando...");
  showMessage($("teamCarRequestMessage"), "");
  try {
    if (!isDevelopmentWindowOpen()) {
      throw new Error("El plazo de mejoras esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    if (!teamId) throw new Error("Perfil sin equipo.");
    if (!requestId) throw new Error("Solicitud no encontrada.");

    await db.runTransaction(async (tx) => {
      const selectionRef = db.collection("lfm_carSelections").doc(teamId);
      const selectionSnap = await tx.get(selectionRef);
      const data = selectionSnap.exists ? selectionSnap.data() : {};
      const requests = Array.isArray(data.carRequests) ? data.carRequests : [];
      const index = requests.findIndex((request) => (
        request.id === requestId
        && request.seasonId === activeSeasonId()
        && request.status === "pending"
      ));

      if (index < 0) throw new Error("Solicitud no encontrada o ya resuelta.");

      const nextRequests = requests.map((request, requestIndex) => (
        requestIndex === index
          ? {
              ...request,
              status: "cancelled",
              cancelReason: "Cancelada por el equipo",
              resolvedAtLabel: new Date().toISOString(),
              resolvedByUid: currentUser.uid,
              resolvedByEmail: currentUser.email
            }
          : request
      ));

      tx.set(selectionRef, {
        teamId,
        seasonId: activeSeasonId(),
        carRequests: nextRequests,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    showMessage($("teamCarRequestMessage"), "Solicitud cancelada. La pieza queda libre para otro pedido.", "success");
    await loadCarData();
    render();
  } catch (error) {
    showMessage($("teamCarRequestMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveTeamCarSelection(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("teamCarMessage"), "");
  try {
    if (!isSelectionWindowOpen()) {
      throw new Error("El plazo de seleccion esta cerrado.");
    }

    const teamId = currentProfile?.teamId;
    if (!teamId) throw new Error("Perfil sin equipo.");

    const selectedDesignIds = {};
    document.querySelectorAll("[data-car-piece]").forEach((select) => {
      if (select.value) {
        selectedDesignIds[select.dataset.carPiece] = select.value;
      }
    });

    await db.collection("lfm_carSelections").doc(teamId).set({
      teamId,
      seasonId: activeSeasonId(),
      selectedDesignIds,
      status: "pending",
      raceId: currentRaceWindow().raceId,
      raceLabel: currentRaceWindowLabel(),
      submittedByUid: currentUser.uid,
      submittedByEmail: currentUser.email,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("teamCarMessage"), "Seleccion guardada. El admin puede aplicarla al cerrar el plazo.", "success");
    await loadCarData();
    render();
  } catch (error) {
    showMessage($("teamCarMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveNextCarName(event) {
  const stop = setLoading(event.currentTarget, "Guardando...");
  showMessage($("teamCarMessage"), "");
  try {
    const teamId = currentProfile?.teamId;
    if (!teamId) throw new Error("Perfil sin equipo.");
    const nextCarName = $("nextCarNameInput")?.value.trim() || "";
    if (!nextCarName) throw new Error("Completa el nombre del coche.");

    await db.collection("lfm_carSelections").doc(teamId).set({
      teamId,
      seasonId: activeSeasonId(),
      nextCarName,
      nextCarNameUpdatedByUid: currentUser.uid,
      nextCarNameUpdatedByEmail: currentUser.email,
      nextCarNameUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage($("teamCarMessage"), "Nombre de coche guardado.", "success");
    await loadCarData();
    render();
  } catch (error) {
    showMessage($("teamCarMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

function snapshotPieces(carData, activeDesignIds) {
  const pieces = {};
  carPieces().forEach((piece) => {
    const designId = activeDesignIds[piece.id];
    const design = (carData.designs?.[piece.id] || []).find((item) => item.id === designId);
    if (!design) return;
    pieces[piece.id] = {
      pieceId: piece.id,
      pieceName: piece.name,
      designId,
      designName: design.name,
      mode: design.mode || "design",
      upgradeType: designUpgradeType(design),
      steps: design.steps || 0,
      stats: design.stats || {}
    };
  });
  return pieces;
}

function snapshotWeights(teamId, carData) {
  const summary = weightSummaryFromLevels(teamId, carData.weightLevels || {});
  return {
    totalWeightKg: summary.totalWeightKg,
    pieces: summary.pieces
  };
}

function snapshotEngine(teamId, teamData, engineOwnerId, engineData) {
  if (!engineOwnerId || !engineData) return null;
  const snapshot = {
    motoristId: engineOwnerId,
    engineName: engineData.engineName || `Motor ${teamName(engineOwnerId)}`
  };
  if (teamData?.isMotorist && teamId === engineOwnerId) {
    snapshot.stats = normalizeEngineStats(engineData.stats || {});
  }
  return snapshot;
}

async function applySelectionForTeam(teamId, raceWindow = null) {
  const result = {
    teamId,
    changedPieces: [],
    manufactureCostM: 0,
    skipped: false,
    reason: ""
  };
  const manufactureM = Number(window.LFM_SEED.costs.manufactureM || 0.25);

  await db.runTransaction(async (tx) => {
    const teamRef = db.collection("lfm_teams").doc(teamId);
    const carRef = db.collection("lfm_teamCars").doc(teamId);
    const selectionRef = db.collection("lfm_carSelections").doc(teamId);

    const teamSnap = await tx.get(teamRef);
    const carSnap = await tx.get(carRef);
    const selectionSnap = await tx.get(selectionRef);

    if (!teamSnap.exists) throw new Error("Equipo no encontrado.");
    if (!carSnap.exists) {
      result.skipped = true;
      result.reason = "sin disenos";
      return;
    }

    const teamData = teamSnap.data();
    const engineOwnerId = teamData.isMotorist ? teamId : teamData.motoristId || "";
    const engineSnap = engineOwnerId
      ? await tx.get(db.collection("lfm_teamEngines").doc(engineOwnerId))
      : null;
    const carData = carSnap.data();
    const selectionData = selectionSnap.exists ? selectionSnap.data() : {};
    const active = carData.activeDesignIds || {};
    const selected = Object.keys(selectionData.selectedDesignIds || {}).length
      ? selectionData.selectedDesignIds
      : active;
    const nextActive = { ...active };

    result.changedPieces = carPieces().filter((piece) => {
      const designId = selected[piece.id];
      if (!designId || active[piece.id] === designId) return false;
      const list = carData.designs?.[piece.id] || [];
      const exists = list.some((design) => design.id === designId);
      if (exists) nextActive[piece.id] = designId;
      return exists;
    });

    result.manufactureCostM = Math.round(result.changedPieces.length * manufactureM * 1000) / 1000;

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const carUpdate = {
      activeDesignIds: nextActive,
      lastAppliedSelectionAt: now,
      updatedAt: now
    };

    if (raceWindow?.raceId) {
      carUpdate.raceSnapshots = {
        [raceWindow.raceId]: {
          raceId: raceWindow.raceId,
          raceLabel: raceWindow.label || currentRaceWindowLabel(),
          seasonId: activeSeasonId(),
          activeDesignIds: nextActive,
          pieces: snapshotPieces(carData, nextActive),
          weights: snapshotWeights(teamId, carData),
          engine: snapshotEngine(teamId, teamData, engineOwnerId, engineSnap?.exists ? engineSnap.data() : null),
          changedPieces: result.changedPieces.map((piece) => piece.id),
          manufactureCostM: result.manufactureCostM,
          createdAtLabel: new Date().toISOString(),
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email
        }
      };
      carUpdate.lastRaceSnapshotId = raceWindow.raceId;
    }

    tx.set(carRef, carUpdate, { merge: true });

    tx.set(selectionRef, {
      teamId,
      seasonId: activeSeasonId(),
      selectedDesignIds: selected,
      status: "applied",
      appliedRaceId: raceWindow?.raceId || "",
      appliedRaceLabel: raceWindow?.label || "",
      appliedByUid: currentUser.uid,
      appliedByEmail: currentUser.email,
      appliedAt: now
    }, { merge: true });

    if (result.manufactureCostM > 0) {
      const current = Number(teamSnap.data().budgetRemainingM || 0);
      const amountM = -result.manufactureCostM;
      tx.update(teamRef, {
        budgetRemainingM: Math.round((current + amountM) * 1000) / 1000,
        updatedAt: now
      });

      const movementRef = db.collection("lfm_teamEconomy")
        .doc(teamId)
        .collection("movements")
        .doc();

      tx.set(movementRef, {
        seasonId: activeSeasonId(),
        teamId,
        amountM,
        category: "coche",
        limitScope: "development",
        raceId: raceWindow?.raceId || "",
        raceLabel: raceWindow?.label || "",
        carAction: "manufacture",
        changedPieces: result.changedPieces.map((piece) => piece.id),
        concept: `Fabricacion coche${raceWindow?.label ? ` ${raceWindow.label}` : ""}: ${result.changedPieces.map((piece) => piece.name).join(", ")}`,
        createdByUid: currentUser.uid,
        createdByEmail: currentUser.email,
        createdAt: now
      });
    }
  });

  return result;
}

async function applyCarSelection(event) {
  const button = event.currentTarget;
  const teamId = button.dataset.applyCarSelection;
  const stop = setLoading(button, "Aplicando...");
  showMessage($("carApplyMessage"), "");
  try {
    const result = await applySelectionForTeam(teamId, isSelectionWindowOpen() ? currentRaceWindow() : null);
    showMessage(
      $("carApplyMessage"),
      result.skipped
        ? `${teamName(teamId)} omitido: ${result.reason}.`
        : result.changedPieces.length
          ? `Seleccion aplicada. Se cobraron ${moneyM(result.manufactureCostM)}.`
          : "Seleccion aplicada sin cambios de fabricacion.",
      "success"
    );
    await loadPublicData();
    if (isAdmin()) await loadAdminMovements();
    await loadCarData();
    render();
  } catch (error) {
    showMessage($("carApplyMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

async function saveHeadquartersLevel(event) {
  event.preventDefault();
  const stop = setLoading(event.submitter, "Guardando...");
  showMessage($("headquartersMessage"), "");
  try {
    const teamId = $("headquartersTeam").value;
    const facilityId = $("headquartersFacility").value;
    const level = Number($("headquartersLevel").value);
    const facility = facilities().find((item) => item.id === facilityId);

    if (!facility) throw new Error("Instalacion no encontrada.");
    if (!Number.isInteger(level) || level < 0 || level > 5) {
      throw new Error("El nivel debe estar entre 0 y 5.");
    }

    await db.collection("lfm_teamFacilities").doc(teamId).set({
      teamId,
      seasonId: activeSeasonId(),
      levels: {
        [facilityId]: level
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showMessage(
      $("headquartersMessage"),
      `${teamName(teamId)}: ${facility.name} actualizado a nivel ${level}.`,
      "success"
    );
    await loadPublicData();
    await loadHeadquartersData();
    render();
  } catch (error) {
    showMessage($("headquartersMessage"), translateError(error), "error");
  } finally {
    stop();
  }
}

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (window.LFM_MISSING_CONFIG) return;
  const stop = setLoading(event.submitter, "Entrando...");
  showMessage(els.authMessage, "");
  try {
    await auth.signInWithEmailAndPassword(els.emailInput.value.trim(), els.passwordInput.value);
  } catch (error) {
    showMessage(els.authMessage, translateError(error), "error");
  } finally {
    stop();
  }
});

els.logoutBtn.addEventListener("click", async () => {
  await auth.signOut();
  switchView("public");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) autoRefreshData();
});

function statusText(status) {
  const labels = {
    pretemporada: "Pretemporada",
    en_curso: "En curso",
    finalizada: "Finalizada"
  };
  return labels[status] || status || "-";
}

function formatDate(value) {
  if (!value) return "-";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function translateError(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential")) return "Email o contrasena incorrectos.";
  if (code.includes("permission-denied")) return "Firestore rechazo la operacion. Revisa las reglas.";
  return error?.message || "Ocurrio un error.";
}

wireNav();
bootAuth();

