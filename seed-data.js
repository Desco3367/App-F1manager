window.LFM_SEED = {
  season: {
    id: "t7",
    number: 7,
    name: "Temporada 7",
    status: "en_curso",
    completedRaces: 2,
    developmentLimitM: 40,
    motorLimitM: 36,
    motorRaceLimitM: 6,
    currentRaceWindow: {
      raceId: "",
      label: "",
      developmentOpen: false,
      selectionOpen: false,
      isOpen: false
    },
    aliases: {
      renault: "andretti",
      alpine: "andretti",
      rb: "porsche",
      hugo_boss: "porsche",
      hugo_boss_racing: "porsche"
    },
    createdAtLabel: "Base inicial T7"
  },

  awardSettings: {
    seasonId: "t7",
    racePositionM: [
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0
    ],
    sprintPositionM: [
      0, 0, 0, 0,
      0, 0, 0, 0
    ],
    poleM: 0,
    fastestLapM: 0
  },

  regulation: {
    seasonId: "t7",
    sections: [
      { id: "general", title: "General", order: 1, content: "" },
      { id: "economia", title: "Economia", order: 2, content: "" },
      { id: "coche", title: "Coche", order: 3, content: "" },
      { id: "pesos", title: "Pesos", order: 4, content: "" },
      { id: "motor", title: "Motor", order: 5, content: "" },
      { id: "carreras", title: "Carreras y premios", order: 6, content: "" },
      { id: "pujas", title: "Pujas y personal", order: 7, content: "" },
      { id: "sanciones", title: "Sanciones", order: 8, content: "" }
    ]
  },

  motoristChampionship: {
    seasonId: "t7",
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
      10: 1
    },
    results: {
      williams: {
        "t7-r01": { principal: 0, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" },
        "t7-r02": { principal: 0, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" }
      },
      sauber: {
        "t7-r01": { principal: 15, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" },
        "t7-r02": { principal: 25, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" }
      },
      astonmartin: {
        "t7-r01": { principal: 25, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" },
        "t7-r02": { principal: 15, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" }
      },
      redbull: {
        "t7-r01": { principal: 6, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" },
        "t7-r02": { principal: 0, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" }
      },
      mercedes: {
        "t7-r01": { principal: 18, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" },
        "t7-r02": { principal: 12, extra: 0, bestTeamId: "", bestPosition: null, source: "legacy" }
      }
    }
  },

  constructorPredictions: {
    seasonId: "t7",
    status: "cerrado",
    entries: []
  },

  constructorPointSystem: {
    seasonId: "t7",
    race: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    sprint: [8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fastestLapRace: 1,
    fastestLapSprint: 0
  },

  constructorChampionship: {
    seasonId: "t7",
    importedRaces: [],
    standings: [
      { teamId: "ferrari", position: 1, points: 0, note: "" },
      { teamId: "mclaren", position: 2, points: 0, note: "" },
      { teamId: "redbull", position: 3, points: 0, note: "" },
      { teamId: "williams", position: 4, points: 0, note: "" },
      { teamId: "porsche", position: 5, points: 0, note: "" },
      { teamId: "haas", position: 6, points: 0, note: "" },
      { teamId: "mercedes", position: 7, points: 0, note: "" },
      { teamId: "astonmartin", position: 8, points: 0, note: "" },
      { teamId: "sauber", position: 9, points: 0, note: "" },
      { teamId: "andretti", position: 10, points: 0, note: "" }
    ]
  },

  teams: [
    {
      id: "ferrari",
      name: "Ferrari",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "ferrari@ligaf1.local",
      budgetRemainingM: 19.575,
      isMotorist: false,
      motoristId: "williams",
      motorClients: []
    },
    {
      id: "mclaren",
      name: "McLaren",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "mclaren@ligaf1.local",
      budgetRemainingM: 24.6,
      isMotorist: false,
      motoristId: "redbull",
      motorClients: []
    },
    {
      id: "redbull",
      name: "Red Bull",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "redbull@ligaf1.local",
      budgetRemainingM: 9.15,
      isMotorist: true,
      motoristId: "",
      motorClients: ["mclaren"]
    },
    {
      id: "williams",
      name: "Williams",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "williams@ligaf1.local",
      budgetRemainingM: 22.225,
      isMotorist: true,
      motoristId: "",
      motorClients: ["ferrari"]
    },
    {
      id: "porsche",
      name: "Porsche",
      aliases: ["Hugo Boss"],
      managerName: "Por definir",
      loginEmail: "porsche@ligaf1.local",
      budgetRemainingM: 80.075,
      isMotorist: false,
      motoristId: "mercedes",
      motorClients: []
    },
    {
      id: "haas",
      name: "HAAS",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "haas@ligaf1.local",
      budgetRemainingM: 45.5,
      isMotorist: false,
      motoristId: "sauber",
      motorClients: []
    },
    {
      id: "mercedes",
      name: "Mercedes",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "mercedes@ligaf1.local",
      budgetRemainingM: 43.375,
      isMotorist: true,
      motoristId: "",
      motorClients: ["porsche"]
    },
    {
      id: "astonmartin",
      name: "Aston Martin",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "astonmartin@ligaf1.local",
      budgetRemainingM: 117.65,
      isMotorist: true,
      motoristId: "",
      motorClients: ["andretti"]
    },
    {
      id: "sauber",
      name: "Sauber",
      aliases: [],
      managerName: "Por definir",
      loginEmail: "sauber@ligaf1.local",
      budgetRemainingM: 70.35,
      isMotorist: true,
      motoristId: "",
      motorClients: ["haas"]
    },
    {
      id: "andretti",
      name: "Andretti",
      aliases: ["Renault", "Alpine"],
      managerName: "Por definir",
      loginEmail: "andretti@ligaf1.local",
      budgetRemainingM: 57.95,
      isMotorist: false,
      motoristId: "astonmartin",
      motorClients: []
    }
  ],

  headquartersFacilities: [
    { id: "designCenter", name: "Centro de diseno" },
    { id: "windTunnel", name: "Tunel de viento" },
    { id: "cfdSimulator", name: "Simulador del CFD" },
    { id: "suspensionSimulator", name: "Simulador de suspension" },
    { id: "testCenter", name: "Centro de pruebas" },
    { id: "teamHeadquarters", name: "Sede del equipo" },
    { id: "raceSimulator", name: "Simulador de carrera" }
  ],

  headquarters: {
    ferrari: {
      designCenter: 1,
      windTunnel: 1,
      cfdSimulator: 2,
      suspensionSimulator: 2,
      testCenter: 3,
      teamHeadquarters: 3,
      raceSimulator: 5
    },
    mclaren: {
      designCenter: 2,
      windTunnel: 3,
      cfdSimulator: 1,
      suspensionSimulator: 0,
      testCenter: 0,
      teamHeadquarters: 0,
      raceSimulator: 0
    },
    redbull: {
      designCenter: 1,
      windTunnel: 1,
      cfdSimulator: 0,
      suspensionSimulator: 0,
      testCenter: 1,
      teamHeadquarters: 1,
      raceSimulator: 1
    },
    williams: {
      designCenter: 1,
      windTunnel: 1,
      cfdSimulator: 2,
      suspensionSimulator: 2,
      testCenter: 4,
      teamHeadquarters: 3,
      raceSimulator: 5
    },
    porsche: {
      designCenter: 2,
      windTunnel: 1,
      cfdSimulator: 1,
      suspensionSimulator: 2,
      testCenter: 1,
      teamHeadquarters: 3,
      raceSimulator: 4
    },
    haas: {
      designCenter: 2,
      windTunnel: 3,
      cfdSimulator: 2,
      suspensionSimulator: 0,
      testCenter: 1,
      teamHeadquarters: 4,
      raceSimulator: 4
    },
    mercedes: {
      designCenter: 1,
      windTunnel: 1,
      cfdSimulator: 1,
      suspensionSimulator: 0,
      testCenter: 0,
      teamHeadquarters: 0,
      raceSimulator: 0
    },
    astonmartin: {
      designCenter: 4,
      windTunnel: 1,
      cfdSimulator: 1,
      suspensionSimulator: 3,
      testCenter: 3,
      teamHeadquarters: 4,
      raceSimulator: 4
    },
    sauber: {
      designCenter: 1,
      windTunnel: 2,
      cfdSimulator: 2,
      suspensionSimulator: 0,
      testCenter: 0,
      teamHeadquarters: 4,
      raceSimulator: 4
    },
    andretti: {
      designCenter: 1,
      windTunnel: 1,
      cfdSimulator: 1,
      suspensionSimulator: 1,
      testCenter: 1,
      teamHeadquarters: 1,
      raceSimulator: 1
    }
  },

  calendar: [
    { id: "t7-r01", seasonId: "t7", round: 1, gp: "Australia", hasSprint: true, completed: true },
    { id: "t7-r02", seasonId: "t7", round: 2, gp: "Silverstone", hasSprint: false, completed: true },
    { id: "t7-r03", seasonId: "t7", round: 3, gp: "Hungria", hasSprint: false, completed: false },
    { id: "t7-r04", seasonId: "t7", round: 4, gp: "Arabia", hasSprint: false, completed: false },
    { id: "t7-r05", seasonId: "t7", round: 5, gp: "Bahrain", hasSprint: false, completed: false },
    { id: "t7-r06", seasonId: "t7", round: 6, gp: "Canada", hasSprint: true, completed: false },
    { id: "t7-r07", seasonId: "t7", round: 7, gp: "Azerbaiyan", hasSprint: false, completed: false },
    { id: "t7-r08", seasonId: "t7", round: 8, gp: "Spa", hasSprint: false, completed: false },
    { id: "t7-r09", seasonId: "t7", round: 9, gp: "Las Vegas", hasSprint: false, completed: false },
    { id: "t7-r10", seasonId: "t7", round: 10, gp: "Abu Dhabi", hasSprint: false, completed: false },
    { id: "t7-r11", seasonId: "t7", round: 11, gp: "Imola", hasSprint: false, completed: false },
    { id: "t7-r12", seasonId: "t7", round: 12, gp: "Singapur", hasSprint: false, completed: false }
  ],

  trackCatalog2024: [
    { id: "bahrain", gp: "Bahrain", country: "Bahrain", circuit: "Bahrain International Circuit" },
    { id: "saudi-arabia", gp: "Arabia Saudi", country: "Arabia Saudi", circuit: "Jeddah Corniche Circuit" },
    { id: "australia", gp: "Australia", country: "Australia", circuit: "Albert Park" },
    { id: "japan", gp: "Japon", country: "Japon", circuit: "Suzuka" },
    { id: "china", gp: "China", country: "China", circuit: "Shanghai International Circuit" },
    { id: "miami", gp: "Miami", country: "Estados Unidos", circuit: "Miami International Autodrome" },
    { id: "imola", gp: "Imola", country: "Italia", circuit: "Autodromo Enzo e Dino Ferrari" },
    { id: "monaco", gp: "Monaco", country: "Monaco", circuit: "Circuit de Monaco" },
    { id: "canada", gp: "Canada", country: "Canada", circuit: "Circuit Gilles Villeneuve" },
    { id: "spain", gp: "Espana", country: "Espana", circuit: "Circuit de Barcelona-Catalunya" },
    { id: "austria", gp: "Austria", country: "Austria", circuit: "Red Bull Ring" },
    { id: "great-britain", gp: "Silverstone", country: "Reino Unido", circuit: "Silverstone" },
    { id: "hungary", gp: "Hungria", country: "Hungria", circuit: "Hungaroring" },
    { id: "belgium", gp: "Spa", country: "Belgica", circuit: "Spa-Francorchamps" },
    { id: "netherlands", gp: "Paises Bajos", country: "Paises Bajos", circuit: "Zandvoort" },
    { id: "italy", gp: "Monza", country: "Italia", circuit: "Monza" },
    { id: "azerbaijan", gp: "Azerbaiyan", country: "Azerbaiyan", circuit: "Baku City Circuit" },
    { id: "singapore", gp: "Singapur", country: "Singapur", circuit: "Marina Bay Street Circuit" },
    { id: "united-states", gp: "Estados Unidos", country: "Estados Unidos", circuit: "Circuit of the Americas" },
    { id: "mexico", gp: "Mexico", country: "Mexico", circuit: "Autodromo Hermanos Rodriguez" },
    { id: "brazil", gp: "Brasil", country: "Brasil", circuit: "Interlagos" },
    { id: "las-vegas", gp: "Las Vegas", country: "Estados Unidos", circuit: "Las Vegas Strip Circuit" },
    { id: "qatar", gp: "Qatar", country: "Qatar", circuit: "Lusail International Circuit" },
    { id: "abu-dhabi", gp: "Abu Dhabi", country: "Emiratos Arabes Unidos", circuit: "Yas Marina Circuit" }
  ],

  carPieces: [
    {
      id: "chassis",
      name: "Chasis",
      costKey: "chassis",
      upgradeTypes: ["Equilibrado", "Refrigeracion optimizada", "Aerodinamica optimizada", "Rendimiento en carrera"],
      stats: ["Drag reduction", "Engine cooling", "Airflow middle", "DRS Delta", "Duracion minima"],
      durationMinBySteps: { 0: 6500, 1: 6230, 2: 5960, 3: 5690, 4: 5420, 5: 5150, 6: 4880, 7: 4610, 8: 4340, 9: 4070, 10: 3800 }
    },
    {
      id: "frontWing",
      name: "Aleron delantero",
      costKey: "frontWing",
      upgradeTypes: ["Equilibrado", "Rendimiento a alta velocidad", "Rendimiento de baja velocidad", "Refrigeracion optimizada", "Aerodinamica optimizada"],
      stats: ["Airflow front", "Airflow sensitivity", "Tyre preservation", "Low speed downforce", "Medium speed downforce", "High speed downforce", "Duracion minima"],
      durationMinBySteps: { 0: 4000, 1: 3725, 2: 3450, 3: 3175, 4: 2900, 5: 2625, 6: 2350, 7: 2075, 8: 1800, 9: 1525, 10: 1250 }
    },
    {
      id: "rearWing",
      name: "Aleron trasero",
      costKey: "rearWing",
      upgradeTypes: ["Equilibrado", "Rendimiento a alta velocidad", "Rendimiento de baja velocidad", "Aerodinamica optimizada"],
      stats: ["Airflow sensitivity", "DRS Delta", "Drag reduction", "Low speed downforce", "Medium speed downforce", "High speed downforce", "Duracion minima"],
      durationMinBySteps: { 0: 4600, 1: 4305, 2: 4010, 3: 3715, 4: 3420, 5: 3125, 6: 2830, 7: 2535, 8: 2240, 9: 1945, 10: 1650 }
    },
    {
      id: "sidepods",
      name: "Pontones",
      costKey: "sidepods",
      upgradeTypes: ["Equilibrado", "Refrigeracion optimizada", "Aerodinamica optimizada", "Rendimiento en carrera"],
      stats: ["Airflow front", "Drag reduction", "Engine cooling", "Airflow middle", "Duracion minima"],
      durationMinBySteps: { 0: 5500, 1: 5225, 2: 4950, 3: 4675, 4: 4400, 5: 4125, 6: 3850, 7: 3575, 8: 3300, 9: 3025, 10: 2750 }
    },
    {
      id: "underfloor",
      name: "Fondo plano",
      costKey: "underfloor",
      upgradeTypes: ["Equilibrado", "Rendimiento a alta velocidad", "Rendimiento de baja velocidad", "Aerodinamica optimizada"],
      stats: ["Airflow sensitivity", "Drag reduction", "Low speed downforce", "Medium speed downforce", "High speed downforce", "Duracion minima"],
      durationMinBySteps: { 0: 5000, 1: 4710, 2: 4420, 3: 4130, 4: 3840, 5: 3550, 6: 3260, 7: 2970, 8: 2680, 9: 2390, 10: 2100 }
    },
    {
      id: "suspension",
      name: "Suspension",
      costKey: "suspension",
      upgradeTypes: ["Equilibrado", "Refrigeracion optimizada", "Rendimiento en carrera"],
      stats: ["Airflow front", "Tyre preservation", "Drag reduction", "Low speed downforce", "Medium speed downforce", "High speed downforce", "Duracion minima"],
      durationMinBySteps: { 0: 4100, 1: 3860, 2: 3620, 3: 3380, 4: 3140, 5: 2900, 6: 2660, 7: 2420, 8: 2180, 9: 1940, 10: 1700 }
    }
  ],

  weightPieces: [
    {
      id: "chassis",
      name: "Chasis",
      levels: [
        { level: 0, successPct: 95, failurePct: 4, dropPct: 1, durationMin: 6500, weightKg: 10 },
        { level: 1, successPct: 88, failurePct: 10, dropPct: 2, durationMin: 6230, weightKg: 9 },
        { level: 2, successPct: 80, failurePct: 17, dropPct: 3, durationMin: 5960, weightKg: 8 },
        { level: 3, successPct: 73, failurePct: 23, dropPct: 4, durationMin: 5690, weightKg: 7 },
        { level: 4, successPct: 64, failurePct: 31, dropPct: 5, durationMin: 5420, weightKg: 6 },
        { level: 5, successPct: 55, failurePct: 39, dropPct: 6, durationMin: 5150, weightKg: 5 },
        { level: 6, successPct: 45, failurePct: 48, dropPct: 7, durationMin: 4880, weightKg: 4 },
        { level: 7, successPct: 35, failurePct: 57, dropPct: 8, durationMin: 4610, weightKg: 3 },
        { level: 8, successPct: 25, failurePct: 66, dropPct: 9, durationMin: 4340, weightKg: 2 },
        { level: 9, successPct: 15, failurePct: 75, dropPct: 10, durationMin: 4070, weightKg: 1 },
        { level: 10, successPct: 0, failurePct: 0, dropPct: 0, durationMin: 3800, weightKg: 0 }
      ]
    },
    {
      id: "frontWing",
      name: "Aleron delantero",
      levels: [
        { level: 0, successPct: 96, failurePct: 3, dropPct: 1, durationMin: 4000, weightKg: 4 },
        { level: 1, successPct: 93, failurePct: 5, dropPct: 2, durationMin: 3725, weightKg: 3.6 },
        { level: 2, successPct: 89, failurePct: 8, dropPct: 3, durationMin: 3450, weightKg: 3.2 },
        { level: 3, successPct: 84, failurePct: 12, dropPct: 4, durationMin: 3175, weightKg: 2.8 },
        { level: 4, successPct: 79, failurePct: 16, dropPct: 5, durationMin: 2900, weightKg: 2.4 },
        { level: 5, successPct: 73, failurePct: 21, dropPct: 6, durationMin: 2625, weightKg: 2 },
        { level: 6, successPct: 66, failurePct: 27, dropPct: 7, durationMin: 2350, weightKg: 1.6 },
        { level: 7, successPct: 58, failurePct: 34, dropPct: 8, durationMin: 2075, weightKg: 1.2 },
        { level: 8, successPct: 49, failurePct: 42, dropPct: 9, durationMin: 1800, weightKg: 0.8 },
        { level: 9, successPct: 40, failurePct: 50, dropPct: 10, durationMin: 1525, weightKg: 0.4 },
        { level: 10, successPct: 0, failurePct: 0, dropPct: 0, durationMin: 1250, weightKg: 0 }
      ]
    },
    {
      id: "rearWing",
      name: "Aleron trasero",
      levels: [
        { level: 0, successPct: 95, failurePct: 4, dropPct: 1, durationMin: 4600, weightKg: 6 },
        { level: 1, successPct: 90, failurePct: 8, dropPct: 2, durationMin: 4305, weightKg: 5.4 },
        { level: 2, successPct: 85, failurePct: 12, dropPct: 3, durationMin: 4010, weightKg: 4.8 },
        { level: 3, successPct: 80, failurePct: 16, dropPct: 4, durationMin: 3715, weightKg: 4.2 },
        { level: 4, successPct: 74, failurePct: 21, dropPct: 5, durationMin: 3420, weightKg: 3.6 },
        { level: 5, successPct: 67, failurePct: 27, dropPct: 6, durationMin: 3125, weightKg: 3 },
        { level: 6, successPct: 59, failurePct: 34, dropPct: 7, durationMin: 2830, weightKg: 2.4 },
        { level: 7, successPct: 50, failurePct: 42, dropPct: 8, durationMin: 2535, weightKg: 1.8 },
        { level: 8, successPct: 40, failurePct: 51, dropPct: 9, durationMin: 2240, weightKg: 1.2 },
        { level: 9, successPct: 29, failurePct: 61, dropPct: 10, durationMin: 1945, weightKg: 0.6 },
        { level: 10, successPct: 0, failurePct: 0, dropPct: 0, durationMin: 1650, weightKg: 0 }
      ]
    },
    {
      id: "sidepods",
      name: "Pontones",
      levels: [
        { level: 0, successPct: 95, failurePct: 4, dropPct: 1, durationMin: 5500, weightKg: 10 },
        { level: 1, successPct: 88, failurePct: 10, dropPct: 2, durationMin: 5225, weightKg: 9 },
        { level: 2, successPct: 80, failurePct: 17, dropPct: 3, durationMin: 4950, weightKg: 8 },
        { level: 3, successPct: 73, failurePct: 23, dropPct: 4, durationMin: 4675, weightKg: 7 },
        { level: 4, successPct: 64, failurePct: 31, dropPct: 5, durationMin: 4400, weightKg: 6 },
        { level: 5, successPct: 55, failurePct: 39, dropPct: 6, durationMin: 4125, weightKg: 5 },
        { level: 6, successPct: 45, failurePct: 48, dropPct: 7, durationMin: 3850, weightKg: 4 },
        { level: 7, successPct: 35, failurePct: 57, dropPct: 8, durationMin: 3575, weightKg: 3 },
        { level: 8, successPct: 25, failurePct: 66, dropPct: 9, durationMin: 3300, weightKg: 2 },
        { level: 9, successPct: 15, failurePct: 75, dropPct: 10, durationMin: 3025, weightKg: 1 },
        { level: 10, successPct: 0, failurePct: 0, dropPct: 0, durationMin: 2750, weightKg: 0 }
      ]
    },
    {
      id: "underfloor",
      name: "Fondo plano",
      levels: [
        { level: 0, successPct: 95, failurePct: 4, dropPct: 1, durationMin: 5000, weightKg: 8 },
        { level: 1, successPct: 89, failurePct: 9, dropPct: 2, durationMin: 4710, weightKg: 7.2 },
        { level: 2, successPct: 83, failurePct: 14, dropPct: 3, durationMin: 4420, weightKg: 6.4 },
        { level: 3, successPct: 77, failurePct: 19, dropPct: 4, durationMin: 4130, weightKg: 5.6 },
        { level: 4, successPct: 70, failurePct: 25, dropPct: 5, durationMin: 3840, weightKg: 4.8 },
        { level: 5, successPct: 62, failurePct: 32, dropPct: 6, durationMin: 3550, weightKg: 4 },
        { level: 6, successPct: 53, failurePct: 40, dropPct: 7, durationMin: 3260, weightKg: 3.2 },
        { level: 7, successPct: 44, failurePct: 48, dropPct: 8, durationMin: 2970, weightKg: 2.4 },
        { level: 8, successPct: 34, failurePct: 57, dropPct: 9, durationMin: 2680, weightKg: 1.6 },
        { level: 9, successPct: 23, failurePct: 67, dropPct: 10, durationMin: 2390, weightKg: 0.8 },
        { level: 10, successPct: 0, failurePct: 0, dropPct: 0, durationMin: 2100, weightKg: 0 }
      ]
    },
    {
      id: "suspension",
      name: "Suspension",
      levels: [
        { level: 0, successPct: 96, failurePct: 3, dropPct: 1, durationMin: 4100, weightKg: 2 },
        { level: 1, successPct: 94, failurePct: 4, dropPct: 2, durationMin: 3860, weightKg: 1.8 },
        { level: 2, successPct: 92, failurePct: 5, dropPct: 3, durationMin: 3620, weightKg: 1.6 },
        { level: 3, successPct: 89, failurePct: 7, dropPct: 4, durationMin: 3380, weightKg: 1.4 },
        { level: 4, successPct: 85, failurePct: 10, dropPct: 5, durationMin: 3140, weightKg: 1.2 },
        { level: 5, successPct: 80, failurePct: 14, dropPct: 6, durationMin: 2900, weightKg: 1 },
        { level: 6, successPct: 74, failurePct: 19, dropPct: 7, durationMin: 2660, weightKg: 0.8 },
        { level: 7, successPct: 67, failurePct: 25, dropPct: 8, durationMin: 2420, weightKg: 0.6 },
        { level: 8, successPct: 59, failurePct: 32, dropPct: 9, durationMin: 2180, weightKg: 0.4 },
        { level: 9, successPct: 50, failurePct: 40, dropPct: 10, durationMin: 1940, weightKg: 0.2 },
        { level: 10, successPct: 0, failurePct: 0, dropPct: 0, durationMin: 1700, weightKg: 0 }
      ]
    }
  ],

  initialWeightLevels: {
    ferrari: { chassis: 2, frontWing: 0, rearWing: 0, sidepods: 1, underfloor: 2, suspension: 0 },
    mclaren: { chassis: 0, frontWing: 2, rearWing: 2, sidepods: 2, underfloor: 0, suspension: 0 },
    redbull: { chassis: 3, frontWing: 0, rearWing: 0, sidepods: 2, underfloor: 1, suspension: 0 },
    williams: { chassis: 1, frontWing: 0, rearWing: 0, sidepods: 2, underfloor: 2, suspension: 0 },
    porsche: { chassis: 2, frontWing: 0, rearWing: 0, sidepods: 1, underfloor: 2, suspension: 0 },
    haas: { chassis: 5, frontWing: 0, rearWing: 0, sidepods: 5, underfloor: 1, suspension: 0 },
    mercedes: { chassis: 3, frontWing: 0, rearWing: 0, sidepods: 2, underfloor: 3, suspension: 0 },
    astonmartin: { chassis: 2, frontWing: 0, rearWing: 0, sidepods: 2, underfloor: 2, suspension: 0 },
    sauber: { chassis: 4, frontWing: 0, rearWing: 0, sidepods: 3, underfloor: 2, suspension: 0 },
    andretti: { chassis: 0, frontWing: 2, rearWing: 0, sidepods: 1, underfloor: 0, suspension: 0 }
  },

  engineStats: [
    { id: "power", name: "Potencia", legacyKey: "potencia", tableKey: "power", initialValue: 10 },
    { id: "fuel", name: "Combustible", legacyKey: "combustible", tableKey: "fuel", initialValue: 50 },
    { id: "engine", name: "Motor", legacyKey: "motor", tableKey: "durability", initialValue: 10 },
    { id: "gearbox", name: "Caja", legacyKey: "caja", tableKey: "durability", initialValue: 10 },
    { id: "ers", name: "ERS", legacyKey: "ers", tableKey: "durability", initialValue: 10 }
  ],

  engineResults: [
    { id: "critical", name: "Critica", delta: 2 },
    { id: "good", name: "Buena", delta: 1 },
    { id: "normal", name: "Normal", delta: 0.5 },
    { id: "failure", name: "Fallo", delta: 0 },
    { id: "worse", name: "Empeoramiento", delta: -0.5 },
    { id: "heavyDrop", name: "Caida fuerte", delta: -1 }
  ],

  engineDevelopmentModes: [
    { id: "conservative", name: "Conservador" },
    { id: "normal", name: "Normal" },
    { id: "risky", name: "Arriesgado" }
  ],

  engineProbabilityTables: {
    power: [
      { min: 0, max: 30, weights: [8, 15, 42, 18, 11, 6] },
      { min: 30, max: 50, weights: [7, 13, 40, 20, 14, 6] },
      { min: 50, max: 70, weights: [6, 12, 38, 22, 16, 6] },
      { min: 70, max: 90, weights: [5, 10, 36, 24, 19, 6] },
      { min: 90, max: 110, weights: [4, 9, 34, 26, 21, 6] },
      { min: 110, max: 130, weights: [3, 8, 32, 28, 23, 6] },
      { min: 130, max: 150, weights: [2.5, 7, 30, 30, 24.5, 6] },
      { min: 150, max: 170, weights: [2, 6, 28, 32, 26, 6] },
      { min: 170, max: 180, weights: [1.5, 5, 26, 34, 27.5, 6] },
      { min: 180, max: 190, weights: [0.8, 3, 22, 36, 32.2, 6] },
      { min: 190, max: 200, weights: [0.5, 2, 20, 38, 33.5, 6] }
    ],
    fuel: [
      { min: 40, max: 70, weights: [6, 12, 50, 18, 10, 4] },
      { min: 70, max: 90, weights: [5.5, 11.5, 48, 19, 11, 5] },
      { min: 90, max: 110, weights: [4.5, 10.5, 46, 20, 13, 6] },
      { min: 110, max: 130, weights: [3.8, 9.5, 44, 21, 15.7, 6] },
      { min: 130, max: 150, weights: [3, 8.5, 42, 22, 18.5, 6] },
      { min: 150, max: 170, weights: [2.2, 7.5, 40, 23, 21.3, 6] },
      { min: 170, max: 190, weights: [1.5, 6.5, 38, 24, 24, 6] },
      { min: 190, max: 200, weights: [0.8, 5.5, 36, 25, 26.7, 6] }
    ],
    durability: [
      { min: 0, max: 20, weights: [5, 13, 42, 20, 10, 5] },
      { min: 20, max: 30, weights: [4.5, 13, 45, 21, 11, 5.5] },
      { min: 30, max: 40, weights: [4, 12, 44, 22, 11.5, 6.5] },
      { min: 40, max: 50, weights: [3.5, 11, 42.5, 23, 12, 7] },
      { min: 50, max: 60, weights: [3, 10, 41, 24, 13, 8] },
      { min: 60, max: 70, weights: [2.5, 9, 39.5, 25, 13.5, 9.5] },
      { min: 70, max: 80, weights: [2, 7.5, 37, 27, 14.5, 11] },
      { min: 80, max: 90, weights: [1.2, 6, 34, 29, 15.5, 13.3] },
      { min: 90, max: 100, weights: [0.5, 4.5, 31, 32, 16, 21] }
    ]
  },

  costs: {
    designM: {
      chassis: 2,
      underfloor: 2,
      sidepods: 1.5,
      suspension: 1,
      frontWing: 1,
      rearWing: 1
    },
    researchMultiplier: 0.75,
    manufactureM: 0.25,
    weightRunsM: {
      1: 1,
      2: 3,
      3: 5
    },
    motorRunM: 1
  }
};
