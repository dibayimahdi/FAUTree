const defaultTextModel = "((A /\\ B) \\/ (C /\\ (D \\/ E) /\\ F))";
const emptyTextModel = "";
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000" : "https://api.fautree.com";
const analysisApiUrl = `${API_BASE_URL}/api/analyze/minimal-cut-sets`;
const bddApiUrl = `${API_BASE_URL}/api/analyze/bdd`;
const defaultReliabilityViewport = {
  xMinHours: 0,
  xMaxHours: 8760,
  yMin: 0,
  yMax: 1.05,
};
const fmedaFailureModeLibrary = {
  digital: ["Stuck-at-0", "Stuck-at-1", "Delay Fault", "Timing Violation", "Open Circuit", "Short Circuit", "Bit Flip", "Incorrect Output"],
  memory: ["Single Bit Corruption", "Multi Bit Corruption", "Read Failure", "Write Failure", "Address Decoder Failure", "Retention Failure"],
  adc: ["Stuck High", "Stuck Low", "Gain Error", "Offset Error", "Missing Conversion", "Wrong Conversion Result"],
  pll: ["Loss of Lock", "Wrong Frequency", "No Clock Output", "Clock Drift"],
  watchdog: ["Timeout Failure", "False Trigger", "Missed Trigger"],
  communication: ["Message Loss", "Incorrect Message", "Bus-Off Failure", "Protocol State Error", "Arbitration Failure", "CRC Error Not Detected"],
  power: ["Output Stuck Low", "Output Stuck High", "Overvoltage", "Undervoltage", "No Regulation", "Reference Drift"],
  analog: ["Output Saturation", "Offset Error", "Gain Error", "Open Input", "Shorted Input", "Reference Drift"],
  io: ["Input Stuck", "Output Stuck", "Pad Short", "Pad Open", "Incorrect Interrupt", "Drive Strength Error"],
  timer: ["Timeout Error", "Wrong Period", "Missed Compare", "False Capture", "Counter Stuck"],
  sensor: ["Channel Failure", "Wrong Sensor Value", "Signal Saturation", "Interface Timeout", "Plausibility Failure"],
};
const fmedaSafetyMechanismLibrary = {
  digital: ["Lockstep", "LBIST", "Program Flow Monitor", "Watchdog", "Clock Monitor"],
  memory: ["ECC", "Parity", "CRC", "Memory Scrubbing", "MBIST"],
  adc: ["Range Check", "Plausibility Check", "Redundant ADC", "Reference Voltage Monitor"],
  pll: ["Clock Monitor", "Lock Detector", "Frequency Monitor", "Redundant Clock"],
  watchdog: ["Window Watchdog", "Independent Clock", "Timeout Monitor", "Reset Escalation"],
  communication: ["CRC", "Timeout Monitor", "Sequence Counter", "End-to-End Protection"],
  power: ["Voltage Monitor", "Brown-Out Detector", "Redundant Reference", "Power-On Reset"],
  analog: ["Range Check", "Plausibility Check", "Reference Voltage Monitor", "Redundant Channel"],
  io: ["Readback Check", "Pad Monitor", "Redundant IO", "Interrupt Plausibility Check"],
  timer: ["Redundant Timer", "Clock Monitor", "Compare Readback", "Timeout Monitor"],
  sensor: ["Plausibility Check", "Redundant Sensor Channel", "Range Check", "Interface Timeout Monitor"],
};
const fmedaDiagnosticCoverageDefaults = [
  { patterns: ["lockstep"], coverage: 99 },
  { patterns: ["ecc"], coverage: 95 },
  { patterns: ["lbist", "mbist", "bist"], coverage: 90 },
  { patterns: ["redundant adc", "redundant sensor", "redundant channel", "redundant clock", "redundant timer", "redundant reference", "redundant io"], coverage: 99 },
  { patterns: ["end-to-end", "e2e"], coverage: 90 },
  { patterns: ["crc"], coverage: 90 },
  { patterns: ["window watchdog", "watchdog"], coverage: 90 },
  { patterns: ["range check"], coverage: 90 },
  { patterns: ["plausibility"], coverage: 90 },
  { patterns: ["reference voltage monitor", "voltage monitor", "brown-out"], coverage: 90 },
  { patterns: ["clock monitor", "frequency monitor", "lock detector"], coverage: 90 },
  { patterns: ["timeout"], coverage: 80 },
  { patterns: ["sequence counter"], coverage: 80 },
  { patterns: ["parity"], coverage: 70 },
  { patterns: ["readback"], coverage: 70 },
  { patterns: ["memory scrubbing"], coverage: 80 },
  { patterns: ["program flow monitor"], coverage: 80 },
  { patterns: ["pad monitor", "interrupt plausibility"], coverage: 70 },
  { patterns: ["none", "no diagnostic"], coverage: 0 },
];
const fmedaFamilyDiagnosticCoverageDefaults = {
  adc: 90,
  analog: 80,
  communication: 90,
  digital: 80,
  io: 70,
  memory: 90,
  pll: 90,
  power: 85,
  sensor: 90,
  timer: 80,
  watchdog: 90,
};
const fmedaComponentLibrary = {
  "CPU Core": { family: "digital", functions: ["Instruction Execution", "Arithmetic Processing", "Program Flow Control", "Interrupt Handling", "Memory Access", "Safety Monitoring"] },
  "Lockstep CPU": { family: "digital", functions: ["Instruction Execution", "Program Flow Control", "Safety Monitoring", "Comparator Checking"] },
  DSP: { family: "digital", functions: ["Signal Processing", "Arithmetic Processing", "Data Path Execution"] },
  "AI Accelerator": { family: "digital", functions: ["Inference Execution", "Matrix Processing", "Accelerated Signal Processing"] },
  Coprocessor: { family: "digital", functions: ["Auxiliary Processing", "Peripheral Offload", "Arithmetic Processing"] },
  "Hardware Security Module (HSM)": { family: "digital", functions: ["Secure Key Storage", "Cryptographic Processing", "Secure Boot Support"] },
  "Safety Management Unit (SMU)": { family: "digital", functions: ["Fault Collection", "Fault Reaction", "Safety State Control"] },
  SRAM: { family: "memory", functions: ["Data Storage", "Data Retention", "Read Access", "Write Access"] },
  Flash: { family: "memory", functions: ["Program Storage", "Data Retention", "Read Access", "Write Access"] },
  EEPROM: { family: "memory", functions: ["Parameter Storage", "Data Retention", "Read Access", "Write Access"] },
  ROM: { family: "memory", functions: ["Program Storage", "Read Access", "Boot Code Storage"] },
  Cache: { family: "memory", functions: ["Instruction Caching", "Data Caching", "Read Access", "Write Access"] },
  "Register File": { family: "memory", functions: ["Register Storage", "Read Access", "Write Access"] },
  "Shared Memory": { family: "memory", functions: ["Shared Data Storage", "Inter-Core Communication", "Read Access", "Write Access"] },
  "NVM Controller": { family: "memory", functions: ["NVM Access Control", "Program Operation", "Erase Operation", "Read Access"] },
  "Crystal Oscillator": { family: "pll", functions: ["Clock Generation", "Reference Clock Generation", "Clock Startup"] },
  "Internal Oscillator": { family: "pll", functions: ["Clock Generation", "Reference Clock Generation", "Low-Power Clocking"] },
  PLL: { family: "pll", functions: ["Clock Generation", "Frequency Multiplication", "Clock Synchronization"] },
  "Clock Divider": { family: "pll", functions: ["Clock Division", "Clock Distribution", "Frequency Scaling"] },
  "Clock Monitor": { family: "pll", functions: ["Clock Monitoring", "Frequency Monitoring", "Loss-of-Clock Detection"] },
  "Clock Distribution Network": { family: "pll", functions: ["Clock Distribution", "Clock Gating", "Clock Synchronization"] },
  LDO: { family: "power", functions: ["Voltage Regulation", "Supply Filtering", "Load Regulation"] },
  "DC/DC Converter": { family: "power", functions: ["Voltage Conversion", "Current Supply", "Load Regulation"] },
  "Power Management Unit": { family: "power", functions: ["Power Sequencing", "Voltage Monitoring", "Power State Control"] },
  "Voltage Regulator": { family: "power", functions: ["Voltage Regulation", "Current Supply", "Load Regulation"] },
  "Bandgap Reference": { family: "power", functions: ["Reference Generation", "Bias Generation", "Temperature-Stable Reference"] },
  "Brown-Out Detector": { family: "power", functions: ["Undervoltage Detection", "Reset Request", "Supply Monitoring"] },
  "Power Supervisor": { family: "power", functions: ["Supply Monitoring", "Reset Control", "Power Fault Detection"] },
  ADC: { family: "adc", functions: ["Voltage Measurement", "Current Measurement", "Sensor Sampling", "Signal Conversion"] },
  DAC: { family: "analog", functions: ["Analog Output Generation", "Reference Generation", "Signal Conversion"] },
  Comparator: { family: "analog", functions: ["Threshold Detection", "Signal Comparison", "Fault Detection"] },
  "Operational Amplifier": { family: "analog", functions: ["Signal Amplification", "Buffering", "Signal Conditioning"] },
  "Voltage Reference": { family: "analog", functions: ["Reference Generation", "Bias Generation", "Measurement Reference"] },
  "Current Sense Amplifier": { family: "analog", functions: ["Current Measurement", "Signal Amplification", "Overcurrent Detection"] },
  "Temperature Sensor": { family: "sensor", functions: ["Temperature Measurement", "Thermal Monitoring", "Overtemperature Detection"] },
  "CAN Controller": { family: "communication", functions: ["Message Transmission", "Message Reception", "Error Detection", "Bus Arbitration"] },
  "CAN FD Controller": { family: "communication", functions: ["Message Transmission", "Message Reception", "Error Detection", "Bus Arbitration"] },
  "LIN Controller": { family: "communication", functions: ["Message Transmission", "Message Reception", "Error Detection"] },
  SPI: { family: "communication", functions: ["Serial Transmission", "Serial Reception", "Peripheral Communication"] },
  I2C: { family: "communication", functions: ["Serial Transmission", "Serial Reception", "Peripheral Communication", "Bus Arbitration"] },
  UART: { family: "communication", functions: ["Serial Transmission", "Serial Reception", "Frame Detection"] },
  "Ethernet MAC": { family: "communication", functions: ["Frame Transmission", "Frame Reception", "Error Detection"] },
  "Ethernet PHY": { family: "communication", functions: ["Physical Layer Transmission", "Physical Layer Reception", "Link Monitoring"] },
  "FlexRay Controller": { family: "communication", functions: ["Message Transmission", "Message Reception", "Schedule Control", "Error Detection"] },
  "Watchdog Timer": { family: "watchdog", functions: ["CPU Supervision", "Timeout Detection", "System Recovery"] },
  "Window Watchdog": { family: "watchdog", functions: ["CPU Supervision", "Windowed Timeout Detection", "System Recovery"] },
  "CRC Engine": { family: "digital", functions: ["CRC Calculation", "Data Integrity Check", "Message Integrity Check"] },
  "ECC Controller": { family: "memory", functions: ["Error Detection", "Error Correction", "Syndrome Calculation"] },
  BIST: { family: "digital", functions: ["Built-In Self-Test", "Startup Test", "Periodic Test"] },
  LBIST: { family: "digital", functions: ["Logic Built-In Self-Test", "Startup Test", "Periodic Test"] },
  MBIST: { family: "memory", functions: ["Memory Built-In Self-Test", "Startup Test", "Periodic Test"] },
  "Error Management Unit": { family: "digital", functions: ["Fault Collection", "Fault Signaling", "Fault Reaction"] },
  GPIO: { family: "io", functions: ["Digital Input", "Digital Output", "Pin State Control"] },
  "Input Buffer": { family: "io", functions: ["Digital Input", "Signal Conditioning", "Input Level Detection"] },
  "Output Driver": { family: "io", functions: ["Digital Output", "Load Driving", "Pin State Control"] },
  "Pad Control Logic": { family: "io", functions: ["Pad Configuration", "Pull Control", "Drive Strength Control"] },
  "Interrupt Controller": { family: "io", functions: ["Interrupt Handling", "Priority Control", "Interrupt Routing"] },
  Timer: { family: "timer", functions: ["Time Base Generation", "Timeout Detection", "Counter Operation"] },
  "PWM Generator": { family: "timer", functions: ["PWM Generation", "Duty Cycle Control", "Period Control"] },
  "Capture Unit": { family: "timer", functions: ["Signal Capture", "Timestamp Capture", "Edge Detection"] },
  "Compare Unit": { family: "timer", functions: ["Compare Match", "Output Compare", "Timing Control"] },
  "Real-Time Clock": { family: "timer", functions: ["Timekeeping", "Wakeup Timing", "Low-Power Timing"] },
  "Sensor Front End": { family: "sensor", functions: ["Signal Conditioning", "Sensor Sampling", "Interface Monitoring"] },
  "Resolver Interface": { family: "sensor", functions: ["Position Measurement", "Signal Demodulation", "Sensor Interface"] },
  "Sigma Delta Interface": { family: "sensor", functions: ["Sensor Sampling", "Bitstream Filtering", "Signal Conversion"] },
  "Hall Sensor Interface": { family: "sensor", functions: ["Position Sensing", "Speed Sensing", "Sensor Interface"] },
};

let projectName = "Untitled Fault Tree";
let selectedNodeId = "top";
let activeBuilderMode = "graphical";
let activeDiagramView = "fault-tree";
let activeResultTab = "qualitative";
let nodeSequence = 10;
let model = createEmptyModel();
let invalidNodeIds = new Set();
let undoStack = [];
let redoStack = [];
let lastBddGraph = null;
let lastBddAnalysis = null;
let lastAnalysisSnapshot = null;
let lastReliabilityState = null;
let resultsPaneResizeState = null;
let customBddOrder = [];
let repeatedBasicEventDisplayMode = "off";

const appShell = document.querySelector(".app-shell");
const graphLayer = document.querySelector("#graph-layer");
const faultLines = document.querySelector("#fault-lines");
const faultStage = document.querySelector("#fault-stage");
const treeList = document.querySelector("#tree-list");
const importProjectInput = document.querySelector("#import-project-file");
const projectNameDisplay = document.querySelector("#project-name-display");
const projectTitleInput = document.querySelector("#project-title-input");
const nodeName = document.querySelector("#node-name");
const nodeType = document.querySelector("#node-type");
const nodeGate = document.querySelector("#node-gate");
const nodeRate = document.querySelector("#node-rate");
const statusLine = document.querySelector("#status-line");
const builderTitle = document.querySelector("#builder-title");
const labelInput = document.querySelector("#node-label-input");
const nodeKindSelect = document.querySelector("#node-kind-select");
const rateInput = document.querySelector("#node-rate-input");
const votingThresholdField = document.querySelector("#voting-threshold-field");
const votingThresholdInput = document.querySelector("#voting-threshold-input");
const childKindSelect = document.querySelector("#child-kind-select");
const textArea = document.querySelector("#fault-tree-text");
const bddOrderingSelect = document.querySelector("#bdd-ordering-select");
const qualitativeTableBody = document.querySelector("[data-result-panel='qualitative'] tbody");
const metricMissionTime = document.querySelector("#metric-mission-time");
const metricTopProbability = document.querySelector("#metric-top-probability");
const metricReliabilityLambda = document.querySelector("#metric-reliability-lambda");
const metricReliabilityAtMission = document.querySelector("#metric-reliability-at-mission");
const metricVariableCount = document.querySelector("#metric-variable-count");
const metricBddOrdering = document.querySelector("#metric-bdd-ordering");
const metricBddNodes = document.querySelector("#metric-bdd-nodes");
const metricBddVariableOrder = document.querySelector("#metric-bdd-variable-order");
const reliabilityMissionTimeInput = document.querySelector("#reliability-mission-time");
const reliabilityXMinInput = document.querySelector("#reliability-x-min");
const reliabilityXMaxInput = document.querySelector("#reliability-x-max");
const reliabilityYMinInput = document.querySelector("#reliability-y-min");
const reliabilityYMaxInput = document.querySelector("#reliability-y-max");
const reliabilitySourceNote = document.querySelector("#reliability-source-note");
const reliabilityChart = document.querySelector("#reliability-chart");
const bddCustomOrderField = document.querySelector("#bdd-custom-order-field");
const bddCustomOrderNote = document.querySelector("#bdd-custom-order-note");
const bddCustomOrderList = document.querySelector("#bdd-custom-order-list");
const bddSettingsPanel = document.querySelector("#bdd-settings-panel");
const resultsPane = document.querySelector(".results-pane");
const workspaceBddGraph = document.querySelector("#workspace-bdd-graph");
const toggleBddWorkspaceButton = document.querySelector("#toggle-bdd-workspace");
const reliabilityModal = document.querySelector("#reliability-modal");
const showReliabilityGraphButton = document.querySelector("#show-reliability-graph");
const closeReliabilityButton = document.querySelector("#close-reliability");
const toggleReliabilityMaximizeButton = document.querySelector("#toggle-reliability-maximize");
const saveReliabilityGraphButton = document.querySelector("#save-reliability-graph");
const reliabilityExportFormatSelect = document.querySelector("#reliability-export-format");
const shortcutsModal = document.querySelector("#shortcuts-modal");
const showShortcutsButton = document.querySelector("#show-shortcuts");
const closeShortcutsButton = document.querySelector("#close-shortcuts");
const exportModal = document.querySelector("#export-modal");
const closeExportButton = document.querySelector("#close-export");
const cancelExportButton = document.querySelector("#cancel-export");
const confirmExportButton = document.querySelector("#confirm-export");
const exportFilenameInput = document.querySelector("#export-filename-input");
const exportTargetSelect = document.querySelector("#export-target-select");
const exportFormatSelect = document.querySelector("#export-format-select");
const exportExtensionPreview = document.querySelector("#export-extension-preview");
const summaryCutSetCount = document.querySelector("#summary-cut-set-count");
const summaryMinOrder = document.querySelector("#summary-min-order");
const summarySinglePoints = document.querySelector("#summary-single-points");
const summaryLargestOrder = document.querySelector("#summary-largest-order");
const summaryDominantCutSet = document.querySelector("#summary-dominant-cut-set");
const summaryAnalysisTime = document.querySelector("#summary-analysis-time");
const summaryBasicEvents = document.querySelector("#summary-basic-events");
const summaryRepeatedEvents = document.querySelector("#summary-repeated-events");
const summaryAnalysisEngine = document.querySelector("#summary-analysis-engine");
const toggleRepeatedEventsViewButton = document.querySelector("#toggle-repeated-events-view");
const resultsResizeHandle = document.querySelector("#results-resize-handle");
const fmeaTableBody = document.querySelector("#fmea-table-body");
const fmedaResultsTableBody = document.querySelector("#fmeda-results-table-body");
const fmedaItemMetricsTableBody = document.querySelector("#fmeda-item-metrics-table-body");
const fmedaSummaryValues = document.querySelectorAll("[data-fmeda-summary]");
const addFmeaRowButton = document.querySelector("#add-fmea-row");
const sortFmeaRowsButton = document.querySelector("#sort-fmea-rows");

textArea.value = emptyTextModel;

function createFmeaRow(overrides = {}) {
  const legacyMetrics = inferLegacyFmedaMetrics(overrides);
  const dangerous = normalizeBoolean(overrides.dangerous ?? overrides.safetyRelevant, legacyMetrics.dangerous);
  const failureCategory = normalizeFailureCategory(
    overrides.failureCategory || overrides.failureModeCategory || overrides.iec61508FailureCategory,
    dangerous ? "dangerous" : "safe"
  );
  return {
    id: overrides.id || generateFmeaRowId(),
    component: overrides.component || overrides.block || overrides.part || "",
    itemFunction: overrides.itemFunction || "",
    failureMode: overrides.failureMode || "",
    failureMechanism: overrides.failureMechanism || overrides.mechanism || "",
    effect: overrides.effect || "",
    cause: overrides.cause || "",
    safetyMechanism: overrides.safetyMechanism || overrides.diagnostic || "",
    faultTreeEventId: overrides.faultTreeEventId || overrides.basicEventId || overrides.eventId || "",
    failureRateFit: inferFailureRateFit(overrides, legacyMetrics),
    failureCategory,
    dangerous,
    diagnosticCoveragePercent: inferDiagnosticCoveragePercent(overrides, legacyMetrics, dangerous),
    faultClassification: normalizeFaultClassification(overrides.faultClassification || overrides.faultType || "SPF"),
    latent: normalizeBoolean(overrides.latent, false),
    severity: normalizeFmeaScore(overrides.severity, 1),
    occurrence: normalizeFmeaScore(overrides.occurrence, 1),
    detectability: normalizeFmeaScore(overrides.detectability ?? overrides.detection, 1),
  };
}

function generateFmeaRowId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `fmea-${crypto.randomUUID()}`;
  }
  return `fmea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeFmeaScore(value, fallback = 1) {
  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, 1, 10);
}

function normalizeFmedaLambda(value, fallback = 0) {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function normalizeFmedaPercent(value, fallback = 0) {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return clamp(parsed, 0, 100);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeFaultClassification(value) {
  const normalized = String(value || "SPF").trim().toUpperCase();
  return ["SPF", "RF", "MPF"].includes(normalized) ? normalized : "SPF";
}

function normalizeFailureCategory(value, fallback = "dangerous") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    safe: "safe",
    s: "safe",
    dangerous: "dangerous",
    d: "dangerous",
    annunciation: "annunciation",
    annunciated: "annunciation",
    a: "annunciation",
    no_effect: "no_effect",
    noeffect: "no_effect",
    ne: "no_effect",
  };
  return aliases[normalized] || fallback;
}

function readFmedaNumber(source, ...keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
      return normalizeFmedaLambda(source[key]);
    }
  }
  return 0;
}

function inferLegacyFmedaMetrics(source = {}) {
  const lambdaSD = readFmedaNumber(source, "lambdaSD", "lambdaSd", "lambda_sd");
  const lambdaSU = readFmedaNumber(source, "lambdaSU", "lambdaSu", "lambda_su");
  const lambdaDD = readFmedaNumber(source, "lambdaDD", "lambdaDd", "lambda_dd");
  const lambdaDU = readFmedaNumber(source, "lambdaDU", "lambdaDu", "lambda_du");
  const safeTotal = lambdaSD + lambdaSU;
  const dangerousTotal = lambdaDD + lambdaDU;
  return {
    lambdaSD,
    lambdaSU,
    lambdaDD,
    lambdaDU,
    lambdaTotal: safeTotal + dangerousTotal,
    dangerous: dangerousTotal >= safeTotal,
  };
}

function inferFailureRateFit(source, legacyMetrics) {
  const explicitFit = readFmedaNumber(source, "failureRateFit", "fit", "totalFit", "failureRate", "lambdaTotal");
  return explicitFit > 0 ? explicitFit : legacyMetrics.lambdaTotal;
}

function inferDiagnosticCoveragePercent(source, legacyMetrics, dangerous) {
  if (source.diagnosticCoveragePercent !== undefined || source.dcPercent !== undefined || source.dc !== undefined) {
    return normalizeFmedaPercent(source.diagnosticCoveragePercent ?? source.dcPercent ?? source.dc);
  }
  if (source.diagnosticCoverage !== undefined && source.diagnosticCoverage !== null && source.diagnosticCoverage !== "") {
    const parsed = Number(source.diagnosticCoverage);
    return normalizeFmedaPercent(parsed <= 1 ? parsed * 100 : parsed);
  }
  const detected = dangerous ? legacyMetrics.lambdaDD : legacyMetrics.lambdaSD;
  const undetected = dangerous ? legacyMetrics.lambdaDU : legacyMetrics.lambdaSU;
  const total = detected + undetected;
  return total > 0 ? normalizeFmedaPercent((detected / total) * 100) : 0;
}

function getFmeaRpn(row) {
  return normalizeFmeaScore(row.severity) * normalizeFmeaScore(row.occurrence) * normalizeFmeaScore(row.detectability);
}

function getFmedaMetrics(row) {
  const lambdaTotal = normalizeFmedaLambda(row.failureRateFit);
  const diagnosticCoverage = normalizeFmedaPercent(row.diagnosticCoveragePercent) / 100;
  const failureCategory = normalizeFailureCategory(row.failureCategory, normalizeBoolean(row.dangerous, true) ? "dangerous" : "safe");
  const dangerous = failureCategory === "dangerous";
  const lambdaSD = failureCategory === "safe" ? lambdaTotal * diagnosticCoverage : 0;
  const lambdaSU = failureCategory === "safe" ? lambdaTotal * (1 - diagnosticCoverage) : 0;
  const lambdaDD = failureCategory === "dangerous" ? lambdaTotal * diagnosticCoverage : 0;
  const lambdaDU = failureCategory === "dangerous" ? lambdaTotal * (1 - diagnosticCoverage) : 0;
  const lambdaAnnunciation = failureCategory === "annunciation" ? lambdaTotal : 0;
  const lambdaNoEffect = failureCategory === "no_effect" ? lambdaTotal : 0;
  const lambdaSafe = lambdaSD + lambdaSU;
  const lambdaDangerous = lambdaDD + lambdaDU;
  const dangerousDiagnosticCoverage = lambdaDangerous > 0 ? lambdaDD / lambdaDangerous : 0;
  const faultClassification = normalizeFaultClassification(row.faultClassification);
  const latent = normalizeBoolean(row.latent, false);
  const lambdaSPF = dangerous && faultClassification === "SPF" ? lambdaTotal : 0;
  const lambdaRF = dangerous && faultClassification === "RF" ? lambdaTotal : 0;
  const lambdaMPF = dangerous && faultClassification === "MPF" ? lambdaTotal : 0;
  const lambdaLatentMPF = latent ? lambdaMPF : 0;
  return {
    lambdaSD,
    lambdaSU,
    lambdaDD,
    lambdaDU,
    lambdaAnnunciation,
    lambdaNoEffect,
    lambdaSPF,
    lambdaRF,
    lambdaMPF,
    lambdaLatentMPF,
    lambdaSafe,
    lambdaDangerous,
    lambdaTotal,
    diagnosticCoverage: dangerousDiagnosticCoverage,
    declaredDiagnosticCoverage: diagnosticCoverage,
    faultClassification,
    latent,
    dangerous,
    failureCategory,
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getFmedaComponentOptions() {
  return Object.keys(fmedaComponentLibrary).sort((left, right) => left.localeCompare(right));
}

function getFmedaLibraryEntry(component) {
  return fmedaComponentLibrary[component] || null;
}

function getFmedaFamily(row) {
  return getFmedaLibraryEntry(row.component)?.family || "digital";
}

function getFmedaFunctionOptions(row) {
  const entry = getFmedaLibraryEntry(row.component);
  if (entry) {
    return entry.functions;
  }
  return uniqueValues(Object.values(fmedaComponentLibrary).flatMap((item) => item.functions)).sort((left, right) => left.localeCompare(right));
}

function getFmedaFailureModeOptions(row) {
  return fmedaFailureModeLibrary[getFmedaFamily(row)] || fmedaFailureModeLibrary.digital;
}

function getFmedaSafetyMechanismOptions(row) {
  return fmedaSafetyMechanismLibrary[getFmedaFamily(row)] || fmedaSafetyMechanismLibrary.digital;
}

function suggestFmedaDiagnosticCoveragePercent(row) {
  const mechanism = String(row.safetyMechanism || "").trim().toLowerCase();
  if (!mechanism) {
    return 0;
  }

  const matchedDefault = fmedaDiagnosticCoverageDefaults.find((item) =>
    item.patterns.some((pattern) => mechanism.includes(pattern))
  );
  if (matchedDefault) {
    return matchedDefault.coverage;
  }

  return fmedaFamilyDiagnosticCoverageDefaults[getFmedaFamily(row)] || 0;
}

function suggestFmedaFaultClassification(row) {
  const component = String(row.component || "").toLowerCase();
  const mode = String(row.failureMode || "").toLowerCase();
  const mechanism = String(row.safetyMechanism || "").toLowerCase();

  if (row.latent || component.includes("sensor channel") || mechanism.includes("redundant")) {
    return "MPF";
  }
  if (
    mechanism.includes("ecc")
    || mechanism.includes("parity")
    || mechanism.includes("lockstep")
    || mechanism.includes("lbist")
    || mechanism.includes("mbist")
    || mode.includes("single bit")
  ) {
    return "RF";
  }
  return "SPF";
}

function applyFmedaLibraryDefaults(row) {
  const functions = getFmedaFunctionOptions(row);
  const failureModes = getFmedaFailureModeOptions(row);
  const safetyMechanisms = getFmedaSafetyMechanismOptions(row);

  if (!functions.includes(row.itemFunction)) {
    row.itemFunction = functions[0] || row.itemFunction;
  }
  if (!failureModes.includes(row.failureMode)) {
    row.failureMode = failureModes[0] || row.failureMode;
  }
  if (!safetyMechanisms.includes(row.safetyMechanism)) {
    row.safetyMechanism = safetyMechanisms[0] || row.safetyMechanism;
  }
  row.diagnosticCoveragePercent = suggestFmedaDiagnosticCoveragePercent(row);
  row.faultClassification = suggestFmedaFaultClassification(row);
}

function setResultsPaneHeight(height) {
  const viewportHeight = window.innerHeight || 0;
  const topbarHeight = 72;
  const minHeight = 160;
  const reservedWorkspaceHeight = 320;
  const maxHeight = Math.max(minHeight, viewportHeight - topbarHeight - reservedWorkspaceHeight);
  const clampedHeight = Math.max(minHeight, Math.min(height, maxHeight));
  appShell?.style.setProperty("--results-pane-height", `${clampedHeight}px`);
}

function getReliabilityMissionTimeHours() {
  const parsed = Number(reliabilityMissionTimeInput?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8760;
}

function setReliabilityMissionTimeHours(value, rerender = true) {
  const normalized = Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 8760;
  if (reliabilityMissionTimeInput) {
    reliabilityMissionTimeInput.value = String(normalized);
  }
  if (metricMissionTime) {
    metricMissionTime.textContent = `${formatNumber(normalized)} h`;
  }
  if (rerender) {
    updateReliabilityView();
  }
}

function getReliabilityAxisInputValue(input, fallback) {
  const parsed = Number(input?.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getReliabilityViewport() {
  const xMinHours = Math.max(0, getReliabilityAxisInputValue(reliabilityXMinInput, defaultReliabilityViewport.xMinHours));
  let xMaxHours = Math.max(0, getReliabilityAxisInputValue(reliabilityXMaxInput, getReliabilityMissionTimeHours()));
  const yMin = getReliabilityAxisInputValue(reliabilityYMinInput, defaultReliabilityViewport.yMin);
  let yMax = getReliabilityAxisInputValue(reliabilityYMaxInput, defaultReliabilityViewport.yMax);

  if (xMaxHours <= xMinHours) {
    xMaxHours = xMinHours + 1;
  }
  if (yMax <= yMin) {
    yMax = yMin + 1;
  }

  return { xMinHours, xMaxHours, yMin, yMax };
}

function setReliabilityViewport(viewport = {}, rerender = true) {
  const normalized = normalizeReliabilityViewport(viewport);
  if (reliabilityXMinInput) {
    reliabilityXMinInput.value = String(normalized.xMinHours);
  }
  if (reliabilityXMaxInput) {
    reliabilityXMaxInput.value = String(normalized.xMaxHours);
  }
  if (reliabilityYMinInput) {
    reliabilityYMinInput.value = String(normalized.yMin);
  }
  if (reliabilityYMaxInput) {
    reliabilityYMaxInput.value = String(normalized.yMax);
  }
  if (rerender) {
    updateReliabilityView();
  }
}

function normalizeReliabilityViewport(viewport = {}) {
  const xMinHours = Math.max(0, Number.isFinite(Number(viewport.xMinHours)) ? Number(viewport.xMinHours) : defaultReliabilityViewport.xMinHours);
  let xMaxHours = Number.isFinite(Number(viewport.xMaxHours)) ? Number(viewport.xMaxHours) : getReliabilityMissionTimeHours();
  const yMin = Number.isFinite(Number(viewport.yMin)) ? Number(viewport.yMin) : defaultReliabilityViewport.yMin;
  let yMax = Number.isFinite(Number(viewport.yMax)) ? Number(viewport.yMax) : defaultReliabilityViewport.yMax;

  xMaxHours = Math.max(0, xMaxHours);
  if (xMaxHours <= xMinHours) {
    xMaxHours = xMinHours + 1;
  }
  if (yMax <= yMin) {
    yMax = yMin + 1;
  }

  return { xMinHours, xMaxHours, yMin, yMax };
}

function roundReliabilityAxisLimit(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return defaultReliabilityViewport.xMaxHours;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const rounded = Math.round((value / magnitude) * 10) / 10 * magnitude;
  return Math.max(Number(rounded.toPrecision(12)), Number((value * 0.98).toPrecision(12)));
}

function getAutoReliabilityViewport(lambda, missionTimeHours = getReliabilityMissionTimeHours()) {
  const targetReliability = 0.03;
  const rawXMax = lambda > 0
    ? -Math.log(targetReliability) / lambda
    : Math.max(missionTimeHours, defaultReliabilityViewport.xMaxHours);

  return {
    xMinHours: 0,
    xMaxHours: roundReliabilityAxisLimit(rawXMax),
    yMin: -0.1,
    yMax: 1.2,
  };
}

function applyAutoReliabilityViewport(lambda = getTopEventProbabilityForReliability()) {
  if (!Number.isFinite(lambda)) {
    setReliabilityViewport(defaultReliabilityViewport, false);
    return;
  }
  setReliabilityViewport(getAutoReliabilityViewport(Math.max(0, lambda)), false);
}

function getTopEventProbabilityForReliability() {
  const exactProbability = Number(lastBddAnalysis?.exactProbability);
  if (Number.isFinite(exactProbability)) {
    return clamp(exactProbability, 0, 1);
  }

  const approximateProbability = Number(lastAnalysisSnapshot?.topProbability);
  if (Number.isFinite(approximateProbability)) {
    return clamp(approximateProbability, 0, 1);
  }

  return null;
}

function buildReliabilityState(topProbability, missionTimeHours, viewport = getReliabilityViewport()) {
  if (!Number.isFinite(topProbability) || !Number.isFinite(missionTimeHours) || missionTimeHours <= 0) {
    return null;
  }

  const lambda = Math.max(0, topProbability);
  const normalizedViewport = normalizeReliabilityViewport(viewport);
  const sampleCount = 160;
  const points = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const t = normalizedViewport.xMinHours + ((normalizedViewport.xMaxHours - normalizedViewport.xMinHours) * index) / sampleCount;
    const reliability = Math.exp(-lambda * t);
    points.push({ t, reliability });
  }

  return {
    probability: topProbability,
    missionTimeHours,
    lambda,
    reliabilityAtMission: Math.exp(-lambda * missionTimeHours),
    viewport: normalizedViewport,
    points,
  };
}

function updateReliabilityView() {
  const probability = getTopEventProbabilityForReliability();
  const missionTimeHours = getReliabilityMissionTimeHours();
  if (Number.isFinite(probability)) {
    setReliabilityViewport(getAutoReliabilityViewport(Math.max(0, probability), missionTimeHours), false);
  }
  const state = buildReliabilityState(probability, missionTimeHours, getReliabilityViewport());
  lastReliabilityState = state;

  if (!state) {
    if (metricReliabilityLambda) {
      metricReliabilityLambda.textContent = "pending";
    }
    if (metricReliabilityAtMission) {
      metricReliabilityAtMission.textContent = "pending";
    }
    if (reliabilitySourceNote) {
      reliabilitySourceNote.textContent =
        "The reliability curve will be derived from the current top-event probability using R(t) = exp(-λt).";
    }
    renderReliabilityChart(null);
    return;
  }

  if (metricReliabilityLambda) {
    metricReliabilityLambda.textContent = formatNumber(state.lambda);
  }
  if (metricReliabilityAtMission) {
    metricReliabilityAtMission.textContent = formatNumber(state.reliabilityAtMission);
  }
  if (reliabilitySourceNote) {
    reliabilitySourceNote.textContent =
      "The reliability curve is anchored to the current top-event failure probability using R(t) = exp(-λt).";
  }
  renderReliabilityChart(state);
}

function renderReliabilityChart(state, emptyMessage = "Run analysis to draw the reliability curve.") {
  if (!reliabilityChart) {
    return;
  }

  reliabilityChart.innerHTML = "";
  if (!state) {
    const width = 960;
    const height = 520;
    const margin = { top: 44, right: 36, bottom: 72, left: 86 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const viewport = getReliabilityViewport();

    const title = createSvgNode("text");
    title.setAttribute("x", String(margin.left));
    title.setAttribute("y", "24");
    title.setAttribute("class", "chart-title");
    title.textContent = "System reliability curve";
    reliabilityChart.appendChild(title);

    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      const y = margin.top + (1 - tick) * plotHeight;
      const grid = createSvgNode("line");
      grid.setAttribute("x1", String(margin.left));
      grid.setAttribute("x2", String(width - margin.right));
      grid.setAttribute("y1", String(y));
      grid.setAttribute("y2", String(y));
      grid.setAttribute("class", "grid-line");
      reliabilityChart.appendChild(grid);

      const label = createSvgNode("text");
      label.setAttribute("x", String(margin.left - 10));
      label.setAttribute("y", String(y + 4));
      label.setAttribute("text-anchor", "end");
      label.setAttribute("class", "chart-tick");
      label.textContent = formatNumber(viewport.yMin + tick * (viewport.yMax - viewport.yMin));
      reliabilityChart.appendChild(label);
    });

    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      const x = margin.left + tick * plotWidth;
      const grid = createSvgNode("line");
      grid.setAttribute("x1", String(x));
      grid.setAttribute("x2", String(x));
      grid.setAttribute("y1", String(margin.top));
      grid.setAttribute("y2", String(height - margin.bottom));
      grid.setAttribute("class", "grid-line");
      reliabilityChart.appendChild(grid);

      const label = createSvgNode("text");
      label.setAttribute("x", String(x));
      label.setAttribute("y", String(height - margin.bottom + 22));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "chart-tick");
      label.textContent = `${formatNumber(viewport.xMinHours + tick * (viewport.xMaxHours - viewport.xMinHours))} h`;
      reliabilityChart.appendChild(label);
    });

    const yAxis = createSvgNode("line");
    yAxis.setAttribute("x1", String(margin.left));
    yAxis.setAttribute("x2", String(margin.left));
    yAxis.setAttribute("y1", String(margin.top));
    yAxis.setAttribute("y2", String(height - margin.bottom));
    yAxis.setAttribute("class", "axis-line");
    reliabilityChart.appendChild(yAxis);

    const xAxis = createSvgNode("line");
    xAxis.setAttribute("x1", String(margin.left));
    xAxis.setAttribute("x2", String(width - margin.right));
    xAxis.setAttribute("y1", String(height - margin.bottom));
    xAxis.setAttribute("y2", String(height - margin.bottom));
    xAxis.setAttribute("class", "axis-line");
    reliabilityChart.appendChild(xAxis);

    const yLabel = createSvgNode("text");
    yLabel.setAttribute("x", "20");
    yLabel.setAttribute("y", String(margin.top + plotHeight / 2));
    yLabel.setAttribute("transform", `rotate(-90 20 ${margin.top + plotHeight / 2})`);
    yLabel.setAttribute("class", "chart-label");
    yLabel.textContent = "Reliability R(t)";
    reliabilityChart.appendChild(yLabel);

    const xLabel = createSvgNode("text");
    xLabel.setAttribute("x", String(margin.left + plotWidth / 2));
    xLabel.setAttribute("y", String(height - 10));
    xLabel.setAttribute("text-anchor", "middle");
    xLabel.setAttribute("class", "chart-label");
    xLabel.textContent = "Time t (hours)";
    reliabilityChart.appendChild(xLabel);

    const emptyText = createSvgNode("text");
    emptyText.setAttribute("x", String(margin.left + plotWidth / 2));
    emptyText.setAttribute("y", String(margin.top + plotHeight / 2));
    emptyText.setAttribute("text-anchor", "middle");
    emptyText.setAttribute("dominant-baseline", "middle");
    emptyText.setAttribute("class", "chart-label");
    emptyText.textContent = emptyMessage;
    reliabilityChart.appendChild(emptyText);
    return;
  }

  const width = 960;
  const height = 520;
  const margin = { top: 44, right: 36, bottom: 72, left: 86 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const { xMinHours, xMaxHours, yMin, yMax } = state.viewport;
  const xRange = xMaxHours - xMinHours;
  const yRange = yMax - yMin;
  const xScale = (t) => margin.left + ((t - xMinHours) / xRange) * plotWidth;
  const yScale = (value) => margin.top + ((yMax - value) / yRange) * plotHeight;
  const linePoints = state.points.map((point) => `${xScale(point.t)},${yScale(point.reliability)}`).join(" ");
  const baseValue = yMin <= 0 && yMax >= 0 ? 0 : yMin;
  const baselineY = yScale(baseValue);
  const originX = xScale(0);
  const originY = yScale(1);
  const horizonX = xScale(state.missionTimeHours);
  const horizonY = yScale(state.reliabilityAtMission);
  const originPointVisible = xMinHours <= 0 && xMaxHours >= 0 && yMin <= 1 && yMax >= 1;
  const missionPointVisible =
    state.missionTimeHours >= xMinHours &&
    state.missionTimeHours <= xMaxHours &&
    state.reliabilityAtMission >= yMin &&
    state.reliabilityAtMission <= yMax;
  const missionPointSeparatedFromOrigin = Math.abs(horizonX - originX) >= 120;

  const title = createSvgNode("text");
  title.setAttribute("x", String(margin.left));
  title.setAttribute("y", "18");
  title.setAttribute("class", "chart-title");
  title.textContent = "System reliability curve";
  reliabilityChart.appendChild(title);

  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const value = yMin + tick * yRange;
    const y = yScale(value);
    const grid = createSvgNode("line");
    grid.setAttribute("x1", String(margin.left));
    grid.setAttribute("x2", String(width - margin.right));
    grid.setAttribute("y1", String(y));
    grid.setAttribute("y2", String(y));
    grid.setAttribute("class", "grid-line");
    reliabilityChart.appendChild(grid);

    const label = createSvgNode("text");
    label.setAttribute("x", String(margin.left - 10));
    label.setAttribute("y", String(y + 4));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("class", "chart-tick");
    label.textContent = formatNumber(value);
    reliabilityChart.appendChild(label);
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const x = margin.left + tick * plotWidth;
    const value = xMinHours + tick * xRange;
    const grid = createSvgNode("line");
    grid.setAttribute("x1", String(x));
    grid.setAttribute("x2", String(x));
    grid.setAttribute("y1", String(margin.top));
    grid.setAttribute("y2", String(height - margin.bottom));
    grid.setAttribute("class", "grid-line");
    reliabilityChart.appendChild(grid);

    const label = createSvgNode("text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(height - margin.bottom + 22));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-tick");
    label.textContent = `${formatNumber(value)} h`;
    reliabilityChart.appendChild(label);
  });

  const defs = createSvgNode("defs");
  const clipPath = createSvgNode("clipPath");
  clipPath.setAttribute("id", "reliability-plot-clip");
  const clipRect = createSvgNode("rect");
  clipRect.setAttribute("x", String(margin.left));
  clipRect.setAttribute("y", String(margin.top));
  clipRect.setAttribute("width", String(plotWidth));
  clipRect.setAttribute("height", String(plotHeight));
  clipPath.appendChild(clipRect);
  defs.appendChild(clipPath);
  reliabilityChart.appendChild(defs);

  const yAxis = createSvgNode("line");
  yAxis.setAttribute("x1", String(margin.left));
  yAxis.setAttribute("x2", String(margin.left));
  yAxis.setAttribute("y1", String(margin.top));
  yAxis.setAttribute("y2", String(height - margin.bottom));
  yAxis.setAttribute("class", "axis-line");
  reliabilityChart.appendChild(yAxis);

  const xAxis = createSvgNode("line");
  xAxis.setAttribute("x1", String(margin.left));
  xAxis.setAttribute("x2", String(width - margin.right));
  xAxis.setAttribute("y1", String(height - margin.bottom));
  xAxis.setAttribute("y2", String(height - margin.bottom));
  xAxis.setAttribute("class", "axis-line");
  reliabilityChart.appendChild(xAxis);

  if (yMin < 0 && yMax > 0) {
    const zeroLine = createSvgNode("line");
    zeroLine.setAttribute("x1", String(margin.left));
    zeroLine.setAttribute("x2", String(width - margin.right));
    zeroLine.setAttribute("y1", String(yScale(0)));
    zeroLine.setAttribute("y2", String(yScale(0)));
    zeroLine.setAttribute("class", "axis-line");
    reliabilityChart.appendChild(zeroLine);
  }

  const yLabel = createSvgNode("text");
  yLabel.setAttribute("x", "20");
  yLabel.setAttribute("y", String(margin.top + plotHeight / 2));
  yLabel.setAttribute("transform", `rotate(-90 20 ${margin.top + plotHeight / 2})`);
  yLabel.setAttribute("class", "chart-label");
  yLabel.textContent = "Reliability R(t)";
  reliabilityChart.appendChild(yLabel);

  const xLabel = createSvgNode("text");
  xLabel.setAttribute("x", String(margin.left + plotWidth / 2));
  xLabel.setAttribute("y", String(height - 10));
  xLabel.setAttribute("text-anchor", "middle");
  xLabel.setAttribute("class", "chart-label");
  xLabel.textContent = "Time t (hours)";
  reliabilityChart.appendChild(xLabel);

  const clippedLayer = createSvgNode("g");
  clippedLayer.setAttribute("clip-path", "url(#reliability-plot-clip)");

  const area = createSvgNode("polygon");
  area.setAttribute(
    "points",
    `${xScale(xMinHours)},${baselineY} ${linePoints} ${xScale(xMaxHours)},${baselineY}`
  );
  area.setAttribute("class", "curve-fill");
  clippedLayer.appendChild(area);

  const path = createSvgNode("polyline");
  path.setAttribute("points", linePoints);
  path.setAttribute("class", "curve-line");
  clippedLayer.appendChild(path);
  reliabilityChart.appendChild(clippedLayer);

  if (originPointVisible) {
    const originMarker = createSvgNode("circle");
    originMarker.setAttribute("cx", String(originX));
    originMarker.setAttribute("cy", String(originY));
    originMarker.setAttribute("r", "5.5");
    originMarker.setAttribute("class", "curve-marker");
    reliabilityChart.appendChild(originMarker);

    const originLabel = createSvgNode("text");
    originLabel.setAttribute("x", String(originX + 10));
    originLabel.setAttribute("y", String(Math.max(margin.top + 12, originY - 10)));
    originLabel.setAttribute("text-anchor", "start");
    originLabel.setAttribute("class", "chart-tick");
    originLabel.textContent = `R(0) = ${formatNumber(1)}`;
    reliabilityChart.appendChild(originLabel);
  }

  if (missionPointVisible && missionPointSeparatedFromOrigin) {
    const marker = createSvgNode("circle");
    marker.setAttribute("cx", String(horizonX));
    marker.setAttribute("cy", String(horizonY));
    marker.setAttribute("r", "5.5");
    marker.setAttribute("class", "curve-marker");
    reliabilityChart.appendChild(marker);

    const markerLabel = createSvgNode("text");
    markerLabel.setAttribute("x", String(Math.min(width - margin.right - 4, horizonX - 8)));
    markerLabel.setAttribute("y", String(Math.max(margin.top + 12, horizonY - 10)));
    markerLabel.setAttribute("text-anchor", "end");
    markerLabel.setAttribute("class", "chart-tick");
    markerLabel.textContent = `R(T) = ${formatNumber(state.reliabilityAtMission)}`;
    reliabilityChart.appendChild(markerLabel);
  }
}

function syncBddSettingsVisibility() {
  if (!bddSettingsPanel) {
    return;
  }
  bddSettingsPanel.hidden = !(activeDiagramView === "bdd" || activeResultTab === "bdd");
}

function focusCustomBddOrderEditor() {
  if (bddOrderingSelect.value !== "custom" || bddCustomOrderField.classList.contains("is-disabled")) {
    return;
  }
  const firstMoveButton = bddCustomOrderList?.querySelector(".bdd-order-button:not(:disabled)");
  if (firstMoveButton) {
    firstMoveButton.focus();
    return;
  }
  bddCustomOrderList?.focus();
}

function setActiveResultTab(panelName) {
  activeResultTab = panelName;
  syncBddSettingsVisibility();

  document.querySelectorAll("[data-result-tab]").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.resultTab === panelName);
  });

  document.querySelectorAll("[data-result-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.resultPanel === panelName);
  });
}

function getLeafEventLabels() {
  return uniqueItems(getLeafEventNodes().map((node) => node.label).filter(Boolean));
}

function syncCustomBddOrder(preferredOrder = customBddOrder) {
  const availableLabels = getLeafEventLabels();
  const preferred = uniqueItems((preferredOrder || []).map((label) => String(label).trim()).filter(Boolean));
  const synced = preferred.filter((label) => availableLabels.includes(label));
  availableLabels.forEach((label) => {
    if (!synced.includes(label)) {
      synced.push(label);
    }
  });
  customBddOrder = synced;
}

function renderCustomBddOrderEditor() {
  if (!bddCustomOrderList) {
    return;
  }

  syncCustomBddOrder();
  bddCustomOrderList.innerHTML = "";

  if (customBddOrder.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "bdd-order-item";
    emptyState.innerHTML = "<strong>Add basic events to define a custom BDD order.</strong>";
    bddCustomOrderList.appendChild(emptyState);
    return;
  }

  customBddOrder.forEach((label, index) => {
    const item = document.createElement("div");
    item.className = "bdd-order-item";

    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${label}`;

    const actions = document.createElement("div");
    actions.className = "bdd-order-actions";

    const moveUpButton = document.createElement("button");
    moveUpButton.type = "button";
    moveUpButton.className = "bdd-order-button";
    moveUpButton.textContent = "^";
    moveUpButton.title = `Move ${label} up`;
    moveUpButton.disabled = bddOrderingSelect.value !== "custom" || index === 0;
    moveUpButton.addEventListener("click", () => moveCustomBddVariable(index, -1));

    const moveDownButton = document.createElement("button");
    moveDownButton.type = "button";
    moveDownButton.className = "bdd-order-button";
    moveDownButton.textContent = "v";
    moveDownButton.title = `Move ${label} down`;
    moveDownButton.disabled = bddOrderingSelect.value !== "custom" || index === customBddOrder.length - 1;
    moveDownButton.addEventListener("click", () => moveCustomBddVariable(index, 1));

    actions.append(moveUpButton, moveDownButton);
    item.append(title, actions);
    bddCustomOrderList.appendChild(item);
  });
}

function moveCustomBddVariable(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= customBddOrder.length) {
    return;
  }

  pushUndoSnapshot();
  [customBddOrder[index], customBddOrder[targetIndex]] = [customBddOrder[targetIndex], customBddOrder[index]];
  renderCustomBddOrderEditor();

  if (bddOrderingSelect.value === "custom") {
    statusLine.textContent = "Custom BDD variable order updated. Recomputing BDD...";
    runAnalysis();
    return;
  }

  statusLine.textContent = "Custom BDD variable order updated.";
}

function startResultsPaneResize(event) {
  if (!appShell || window.innerWidth <= 840) {
    return;
  }
  event.preventDefault();
  resultsResizeHandle.setPointerCapture?.(event.pointerId);
  resultsPaneResizeState = {
    startY: event.clientY,
    startHeight: resultsPane?.getBoundingClientRect().height || 220,
  };
  document.body.style.cursor = "ns-resize";
  document.body.style.userSelect = "none";
}

function updateResultsPaneResize(event) {
  if (!resultsPaneResizeState) {
    return;
  }
  const nextHeight = resultsPaneResizeState.startHeight - (event.clientY - resultsPaneResizeState.startY);
  setResultsPaneHeight(nextHeight);
}

function stopResultsPaneResize() {
  if (!resultsPaneResizeState) {
    return;
  }
  resultsPaneResizeState = null;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
}

function createSampleModel() {
  return {
    rootId: "top",
    nodes: {
      top: {
        id: "top",
        kind: "top_event",
        label: "System failure",
        children: ["g1"],
      },
      g1: {
        id: "g1",
        kind: "gate",
        gate: "OR",
        label: "Top event logic",
        children: ["e1", "g2", "e4"],
      },
      e1: {
        id: "e1",
        kind: "basic_event",
        label: "Power supply failure",
        failureRate: 0.000002,
        children: [],
      },
      g2: {
        id: "g2",
        kind: "gate",
        gate: "AND",
        label: "Protection subsystem failure",
        children: ["e2", "e3"],
      },
      e2: {
        id: "e2",
        kind: "basic_event",
        label: "Primary protection failure",
        failureRate: 0.0000015,
        children: [],
      },
      e3: {
        id: "e3",
        kind: "basic_event",
        label: "Backup protection failure",
        failureRate: 0.0000015,
        children: [],
      },
      e4: {
        id: "e4",
        kind: "basic_event",
        label: "Control unit failure",
        failureRate: 0.000003,
        children: [],
      },
    },
  };
}

function createEmptyModel() {
  return {
    rootId: "top",
    fmeaRows: [],
    nodes: {
      top: {
        id: "top",
        kind: "top_event",
        label: "Top event",
        children: [],
      },
    },
  };
}

function isGateNodeType(type) {
  return type === "and_gate" || type === "or_gate" || type === "voting_gate";
}

function gateTypeFromNodeKind(type) {
  if (type === "and_gate") {
    return "AND";
  }
  if (type === "or_gate") {
    return "OR";
  }
  if (type === "voting_gate") {
    return "K_OF_N";
  }
  return "";
}

function gateNodeKindValue(gate) {
  if (gate === "AND") {
    return "and_gate";
  }
  if (gate === "OR") {
    return "or_gate";
  }
  return "voting_gate";
}

function gateDisplayName(node) {
  if (!node || node.kind !== "gate") {
    return "None";
  }
  if (node.gate === "K_OF_N") {
    return `Voting ${formatVotingGateLabel(node.votingThreshold || 2, node.children?.length)}`;
  }
  return node.gate || "None";
}

function parseVotingThreshold(value) {
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

function syncVotingThresholdControl() {
  if (!votingThresholdField || !votingThresholdInput) {
    return;
  }
  const selected = model.nodes[selectedNodeId];
  const isVotingGate = selected?.kind === "gate" && selected.gate === "K_OF_N";
  votingThresholdField.hidden = !isVotingGate;
  votingThresholdInput.disabled = votingThresholdField.hidden;
}

function createGateSymbol(gate, threshold = 2, childCount = "N") {
  if (gate === "AND") {
    return `
      <svg class="gate-symbol" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M18 88 L18 45 C18 20 32 8 50 8 C68 8 82 20 82 45 L82 88 Z"></path>
      </svg>
      <span class="sr-only">AND gate</span>
    `;
  }

  if (gate === "K_OF_N") {
    const label = formatVotingGateLabel(threshold, childCount);
    return `
      <svg class="gate-symbol" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M14 88 C24 58 26 24 50 8 C74 24 76 58 86 88 C64 78 36 78 14 88 Z"></path>
        <text x="50" y="61" text-anchor="middle">${escapeHtml(label)}</text>
      </svg>
      <span class="sr-only">Voting gate</span>
    `;
  }

  return `
    <svg class="gate-symbol" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M14 88 C24 58 26 24 50 8 C74 24 76 58 86 88 C64 78 36 78 14 88 Z"></path>
    </svg>
    <span class="sr-only">OR gate</span>
  `;
}

function formatVotingGateLabel(threshold, childCount) {
  const k = parseVotingThreshold(threshold);
  const n = Number(childCount);
  return `${k}/${Number.isFinite(n) && n > 0 ? n : "N"}`;
}

function nodeKindLabel(node) {
  if (node.kind === "top_event") {
    return "Top event";
  }

  if (node.kind === "gate") {
    return node.gate === "K_OF_N" ? "Voting gate" : `${node.gate} gate`;
  }

  if (node.kind === "intermediate_event") {
    return "Intermediate event";
  }

  if (node.kind === "undeveloped_event") {
    return "Undeveloped event";
  }

  return "Basic event";
}

function nodeKindValue(node) {
  if (node.kind === "gate") {
    return gateNodeKindValue(node.gate);
  }
  if (node.kind === "intermediate_event") {
    return "intermediate_event";
  }
  if (node.kind === "undeveloped_event") {
    return "undeveloped_event";
  }
  return "basic_event";
}

function nodeTemplateFromType(type, id, label, rate) {
  if (type === "intermediate_event") {
    return {
      id,
      kind: "intermediate_event",
      label,
      children: [],
    };
  }

  if (type === "undeveloped_event") {
    return {
      id,
      kind: "undeveloped_event",
      label,
      failureRate: rate,
      children: [],
    };
  }

  if (isGateNodeType(type)) {
    const gate = gateTypeFromNodeKind(type);
    return {
      id,
      kind: "gate",
      gate,
      ...(gate === "K_OF_N" ? { votingThreshold: parseVotingThreshold(votingThresholdInput?.value || 2) } : {}),
      label,
      children: [],
    };
  }

  return {
    id,
    kind: "basic_event",
    label,
    failureRate: rate,
    children: [],
  };
}

function getNodeSize(node) {
  if (node.kind === "top_event") {
    return { width: 220, height: 74 };
  }

  if (node.kind === "gate") {
    return { width: 82, height: 92 };
  }

  if (node.kind === "undeveloped_event") {
    return { width: 140, height: 140 };
  }

  return { width: 188, height: 82 };
}

function visitTree(nodeId, callback, depth = 0) {
  const node = model.nodes[nodeId];
  if (!node) {
    return;
  }

  callback(node, depth);
  node.children.forEach((childId) => visitTree(childId, callback, depth + 1));
}

function computeLeafCount(nodeId) {
  const node = model.nodes[nodeId];
  if (!node || node.children.length === 0) {
    return 1;
  }

  return node.children.reduce((total, childId) => total + computeLeafCount(childId), 0);
}

function computeDepth(nodeId) {
  const node = model.nodes[nodeId];
  if (!node || node.children.length === 0) {
    return 0;
  }

  return 1 + Math.max(...node.children.map((childId) => computeDepth(childId)));
}

function measureTreeLayout() {
  const leafCount = computeLeafCount(model.rootId);
  const maxDepth = computeDepth(model.rootId);
  const stageWidth = Math.max(760, leafCount * 210);
  const stageHeight = Math.max(560, 120 + maxDepth * 130);
  const positions = {};

  function assign(nodeId, depth, left, width) {
    const node = model.nodes[nodeId];
    const size = getNodeSize(node);
    const centerX = left + width / 2;
    const top = 28 + depth * 126;

    positions[nodeId] = {
      x: Math.round(centerX - size.width / 2),
      y: top,
      centerX,
      top,
      bottom: top + size.height,
      width: size.width,
      height: size.height,
    };

    let cursor = left;
    node.children.forEach((childId) => {
      const childWidth = (computeLeafCount(childId) / computeLeafCount(nodeId)) * width;
      assign(childId, depth + 1, cursor, childWidth);
      cursor += childWidth;
    });
  }

  assign(model.rootId, 0, 30, stageWidth - 60);
  return {
    stageWidth,
    stageHeight,
    positions,
  };
}

function layoutTree() {
  const layout = measureTreeLayout();
  faultStage.style.width = `${layout.stageWidth}px`;
  faultStage.style.height = `${layout.stageHeight}px`;
  faultLines.setAttribute("viewBox", `0 0 ${layout.stageWidth} ${layout.stageHeight}`);
  return layout.positions;
}

function createLinePath(parent, child) {
  const startX = parent.centerX;
  const startY = parent.bottom;
  const endX = child.centerX;
  const endY = child.top;
  const midY = Math.round((startY + endY) / 2);

  return `M${startX} ${startY} L${startX} ${midY} L${endX} ${midY} L${endX} ${endY}`;
}

function renderCanvas() {
  const positions = layoutTree();
  const repeatedBasicEventCounts = getRepeatedBasicEventCounts();
  graphLayer.innerHTML = "";
  faultLines.innerHTML = "";

  visitTree(model.rootId, (node) => {
    node.children.forEach((childId) => {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", createLinePath(positions[node.id], positions[childId]));
      faultLines.appendChild(path);
    });
  });

  visitTree(model.rootId, (node) => {
    const position = positions[node.id];
    const button = document.createElement("button");
    button.className = `fault-node ${node.kind === "gate" ? "gate-node" : "event-node"} ${node.kind === "top_event" ? "top-event" : ""} ${node.kind === "basic_event" ? "basic-event" : ""} ${node.kind === "undeveloped_event" ? "undeveloped-event" : ""} ${node.kind === "intermediate_event" ? "intermediate-event" : ""} ${node.gate === "AND" ? "and-gate" : ""} ${node.gate === "OR" ? "or-gate" : ""} ${node.gate === "K_OF_N" ? "voting-gate" : ""}`;
    button.dataset.nodeId = node.id;
    button.style.left = `${position.x}px`;
    button.style.top = `${position.y}px`;
    button.title = nodeKindLabel(node);
    button.classList.toggle("is-selected", node.id === selectedNodeId);
    button.classList.toggle("is-invalid", invalidNodeIds.has(node.id));

    const repeatedCount = node.kind === "basic_event" ? repeatedBasicEventCounts.get(node.label.trim()) || 0 : 0;
    const repeated = repeatedCount > 1;
    button.classList.toggle("is-repeated-basic-event", repeated && repeatedBasicEventDisplayMode === "highlight");

    if (node.kind === "gate") {
      button.innerHTML = createGateSymbol(node.gate, node.votingThreshold, node.children.length);
    } else {
      const rate = node.failureRate ? `<small>p ${formatNumber(node.failureRate)}</small>` : "";
      button.innerHTML = `
        <span class="node-kind">${nodeKindLabel(node)}</span>
        <strong>${escapeHtml(node.label)}</strong>
        ${rate}
      `;
    }

    button.addEventListener("click", () => selectNode(node.id));
    graphLayer.appendChild(button);
  });
}

function renderTreeList() {
  treeList.innerHTML = "";
  visitTree(model.rootId, (node, depth) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.dataset.nodeLink = node.id;
    button.classList.toggle("is-active", node.id === selectedNodeId);
    button.style.paddingLeft = `${10 + depth * 14}px`;
    button.textContent = `${nodeKindLabel(node)}: ${node.label}`;
    button.addEventListener("click", () => selectNode(node.id));
    item.appendChild(button);
    treeList.appendChild(item);
  });
}

function selectNode(nodeId) {
  const selected = model.nodes[nodeId];
  if (!selected) {
    return;
  }

  refreshInvalidNodes();
  selectedNodeId = nodeId;
  labelInput.value = selected.label;
  nodeKindSelect.value = nodeKindValue(selected);
  nodeKindSelect.disabled = selected.kind === "top_event";
  rateInput.value = selected.failureRate ? String(selected.failureRate) : "0.001";
  rateInput.disabled = false;
  votingThresholdInput.value = String(selected.votingThreshold || 2);
  nodeName.textContent = selected.label;
  nodeType.textContent = nodeKindLabel(selected);
  nodeGate.textContent = gateDisplayName(selected);
  nodeRate.textContent = selected.failureRate ? formatNumber(selected.failureRate) : "Not assigned";
  statusLine.textContent = `Selected: ${selected.label}`;
  syncVotingThresholdControl();
  renderCanvas();
  renderTreeList();
}

function setTool(tool) {
  const childKindByTool = {
    basic: "basic_event",
    undeveloped: "undeveloped_event",
    and: "and_gate",
    or: "or_gate",
    voting: "voting_gate",
  };
  const childKind = childKindByTool[tool];
  if (!childKind) {
    return;
  }

  childKindSelect.value = childKind;
  syncToolButtons();
  syncVotingThresholdControl();
  statusLine.textContent = `Tool: ${tool}`;
}

function syncToolButtons() {
  const toolByChildKind = {
    basic_event: "basic",
    undeveloped_event: "undeveloped",
    and_gate: "and",
    or_gate: "or",
    voting_gate: "voting",
  };
  const activeTool = toolByChildKind[childKindSelect.value];
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === activeTool);
  });
}

function setBuilderMode(mode) {
  activeDiagramView = "fault-tree";
  activeBuilderMode = mode;
  if (mode === "textual") {
    syncTextFromGraph();
  }
  syncDiagramButtons();
  document.querySelectorAll("[data-builder-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.builderMode === mode);
  });
  document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.builderPanel === mode);
  });
  document.querySelector("[data-diagram-panel='bdd']").classList.remove("is-active");
  syncBddSettingsVisibility();
  builderTitle.textContent =
    mode === "textual"
      ? "Boolean Expression Builder"
      : mode === "fmea"
        ? "FMEDA Worksheet"
        : "Graphical Fault Tree Builder";
  statusLine.textContent =
    mode === "textual"
      ? "Boolean expression builder ready."
      : mode === "fmea"
        ? "FMEDA worksheet ready."
        : "Graphical builder ready";
}

function setDiagramView(view) {
  activeDiagramView = view;
  syncDiagramButtons();
  syncBddSettingsVisibility();

  if (view === "fault-tree") {
    document.querySelector("[data-diagram-panel='bdd']").classList.remove("is-active");
    document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.builderPanel === activeBuilderMode);
    });
    builderTitle.textContent =
      activeBuilderMode === "textual"
        ? "Boolean Expression Builder"
        : activeBuilderMode === "fmea"
          ? "FMEDA Worksheet"
          : "Graphical Fault Tree Builder";
    statusLine.textContent =
      activeBuilderMode === "textual"
        ? "Boolean expression builder ready."
        : activeBuilderMode === "fmea"
          ? "FMEDA worksheet ready."
          : "Fault tree view ready.";
    return;
  }

  document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
    panel.classList.remove("is-active");
  });
  document.querySelector("[data-diagram-panel='bdd']").classList.add("is-active");
  builderTitle.textContent = "Binary Decision Diagram";
  renderBddGraph(lastBddGraph, workspaceBddGraph, { fitToContainer: true, minHeight: 560 });
  statusLine.textContent = lastBddGraph ? "BDD view ready." : "Run analysis to create the BDD.";
}

function syncDiagramButtons() {
  toggleBddWorkspaceButton.textContent = activeDiagramView === "bdd" ? "Show Fault Tree" : "Generate BDD";
}

function setActiveTopNav(tabName) {
  document.querySelectorAll("[data-top-nav]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.topNav === tabName);
  });
}

function openTopNav(tabName) {
  if (tabName === "graphical") {
    setBuilderMode("graphical");
    setDiagramView("fault-tree");
    setActiveTopNav("graphical");
    return;
  }

  if (tabName === "boolean") {
    setDiagramView("fault-tree");
    setBuilderMode("textual");
    setActiveTopNav("boolean");
    return;
  }

  if (tabName === "fmea") {
    setDiagramView("fault-tree");
    setBuilderMode("fmea");
    setActiveTopNav("fmea");
  }
}

async function toggleBddWorkspaceView() {
  if (activeDiagramView === "bdd") {
    setDiagramView("fault-tree");
    return;
  }

  if (!lastBddGraph) {
    const created = await generateBddForCurrentModel();
    if (!created) {
      return;
    }
  }

  setActiveResultTab("bdd");
  setDiagramView("bdd");
}

function setProjectName(name) {
  projectName = name.trim() || "Untitled Fault Tree";
  projectNameDisplay.textContent = projectName;
  projectTitleInput.value = projectName;
  document.title = `${projectName} - FAUTree`;
}

function createHistorySnapshot() {
  syncCustomBddOrder();
  return {
    model: JSON.parse(JSON.stringify(model)),
    selectedNodeId,
    projectName,
    nodeSequence,
    bddOrdering: bddOrderingSelect.value,
    bddCustomOrder: [...customBddOrder],
    analysisMissionTimeHours: getReliabilityMissionTimeHours(),
    reliabilityViewport: getReliabilityViewport(),
  };
}

function pushUndoSnapshot() {
  undoStack.push(createHistorySnapshot());
  if (undoStack.length > 60) {
    undoStack.shift();
  }
  redoStack = [];
}

function restoreHistorySnapshot(snapshot, message) {
  model = JSON.parse(JSON.stringify(snapshot.model));
  selectedNodeId = snapshot.selectedNodeId;
  projectName = snapshot.projectName;
  nodeSequence = snapshot.nodeSequence;
  bddOrderingSelect.value = snapshot.bddOrdering;
  syncCustomBddOrder(snapshot.bddCustomOrder || []);
  setProjectName(projectName);
  setReliabilityMissionTimeHours(snapshot.analysisMissionTimeHours, false);
  setReliabilityViewport(snapshot.reliabilityViewport || defaultReliabilityViewport, false);
  updateCustomBddOrderVisibility();
  syncTextFromGraph();
  renderAll();
  clearAnalysisResults("Run analysis to compute cut sets.");
  statusLine.textContent = message;
}

function undoLastChange() {
  if (undoStack.length === 0) {
    statusLine.textContent = "Nothing to undo.";
    return;
  }

  redoStack.push(createHistorySnapshot());
  restoreHistorySnapshot(undoStack.pop(), "Undo applied.");
}

function redoLastChange() {
  if (redoStack.length === 0) {
    statusLine.textContent = "Nothing to redo.";
    return;
  }

  undoStack.push(createHistorySnapshot());
  restoreHistorySnapshot(redoStack.pop(), "Redo applied.");
}

function createNewProject() {
  pushUndoSnapshot();
  model = createEmptyModel();
  selectedNodeId = model.rootId;
  nodeSequence = 0;
  textArea.value = emptyTextModel;
  setProjectName("Untitled Fault Tree");
  setReliabilityMissionTimeHours(8760, false);
  setReliabilityViewport(defaultReliabilityViewport, false);
  setTool("basic");
  setBuilderMode("graphical");
  renderAll();
  clearAnalysisResults("Add gates and basic events to compute cut sets.");
  statusLine.textContent = "New project created with an empty top event.";
}

function renameProject() {
  pushUndoSnapshot();
  setProjectName(projectTitleInput.value);
  statusLine.textContent = `Project renamed: ${projectName}`;
}

function applyNodeProperties() {
  const selected = model.nodes[selectedNodeId];
  const label = labelInput.value.trim();
  const rate = parseFailureRate(rateInput.value);

  if (!selected || !label) {
    return;
  }

  if (selected.kind === "top_event") {
    pushUndoSnapshot();
    selected.label = label;
    syncTextFromGraph();
    selectNode(selected.id);
    statusLine.textContent = "Top event updated.";
    return;
  }

  const requestedType = nodeKindSelect.value;

  if ((requestedType === "basic_event" || requestedType === "undeveloped_event") && selected.children.length > 0) {
    statusLine.textContent = "Delete child nodes before converting this node to a basic event.";
    selectNode(selected.id);
    return;
  }

  pushUndoSnapshot();
  selected.label = label;

  if (requestedType === "basic_event" || requestedType === "undeveloped_event") {
    selected.kind = requestedType;
    selected.failureRate = rate;
    selected.children = [];
    delete selected.gate;
    delete selected.votingThreshold;
  } else if (requestedType === "intermediate_event") {
    selected.kind = "intermediate_event";
    delete selected.failureRate;
    delete selected.gate;
    delete selected.votingThreshold;
  } else {
    selected.kind = "gate";
    selected.gate = gateTypeFromNodeKind(requestedType);
    if (selected.gate === "K_OF_N") {
      selected.votingThreshold = parseVotingThreshold(votingThresholdInput.value);
    } else {
      delete selected.votingThreshold;
    }
    delete selected.failureRate;
  }

  syncTextFromGraph();
  selectNode(selected.id);
  statusLine.textContent = "Node properties applied.";
}

function addChildNode() {
  const parent = model.nodes[selectedNodeId];
  const type = childKindSelect.value;
  const rate = parseFailureRate(rateInput.value);

  if (!parent) {
    return;
  }

  if ((parent.kind === "top_event" || parent.kind === "intermediate_event") && !isGateNodeType(type)) {
    statusLine.textContent = "Choose a gate to place below this event.";
    return;
  }

  if ((parent.kind === "top_event" || parent.kind === "intermediate_event") && parent.children.length > 0) {
    statusLine.textContent = "This event already has a gate below it. Select that gate to add events.";
    return;
  }

  if (parent.kind === "basic_event" || parent.kind === "undeveloped_event") {
    if (type === "basic_event" || type === "undeveloped_event" || type === "intermediate_event") {
      statusLine.textContent = "Choose a gate to refine a basic event.";
      return;
    }

    pushUndoSnapshot();
    parent.kind = "intermediate_event";
    delete parent.failureRate;
    const gateId = nextNodeId("gate");
    const gateLabel = defaultLabelForType(type);
    model.nodes[gateId] = nodeTemplateFromType(type, gateId, gateLabel, rate);
    parent.children = [gateId];
    syncTextFromGraph();
    selectNode(gateId);
    statusLine.textContent = `${parent.label} refined with ${nodeKindLabel(model.nodes[gateId])}.`;
    return;
  }

  const requestedLabel = labelInput.value.trim();
  const label = requestedLabel && requestedLabel !== parent.label ? requestedLabel : defaultLabelForType(type);

  pushUndoSnapshot();
  const id = nextNodeId(isGateNodeType(type) ? "gate" : "basic_event");
  model.nodes[id] = nodeTemplateFromType(type, id, label, rate);
  parent.children.push(id);
  syncTextFromGraph();
  selectNode(id);
  statusLine.textContent = "Child node added.";
}

function defaultLabelForTool() {
  return defaultLabelForType(childKindSelect.value);
}

function defaultLabelForType(type) {
  if (type === "intermediate_event") {
    return nextAvailableLabel("Intermediate event");
  }
  if (type === "and_gate") {
    return nextAvailableLabel("AND gate");
  }
  if (type === "or_gate") {
    return nextAvailableLabel("OR gate");
  }
  if (type === "voting_gate") {
    return nextAvailableLabel("Voting gate");
  }
  if (type === "undeveloped_event") {
    return nextAvailableLabel("Undeveloped event");
  }
  return nextAvailableLabel("Basic event");
}

function nextAvailableLabel(baseLabel) {
  const existingLabels = new Set(Object.values(model.nodes).map((node) => node.label));
  let index = 1;
  while (existingLabels.has(`${baseLabel} ${index}`)) {
    index += 1;
  }
  return `${baseLabel} ${index}`;
}

function addSiblingNode() {
  if (selectedNodeId === model.rootId) {
    statusLine.textContent = "The top event cannot have a sibling.";
    return;
  }

  const parent = findParent(selectedNodeId);
  if (!parent) {
    return;
  }

  if (parent.kind !== "gate") {
    statusLine.textContent = "Add sibling is only available for nodes under a gate.";
    return;
  }

  const type = childKindSelect.value;
  const rate = parseFailureRate(rateInput.value);
  const selected = model.nodes[selectedNodeId];
  const requestedLabel = labelInput.value.trim();
  const label = requestedLabel && requestedLabel !== selected?.label ? requestedLabel : defaultLabelForType(type);
  const selectedIndex = parent.children.indexOf(selectedNodeId);

  pushUndoSnapshot();
  const id = nextNodeId(isGateNodeType(type) ? "gate" : "basic_event");
  model.nodes[id] = nodeTemplateFromType(type, id, label, rate);
  parent.children.splice(selectedIndex + 1, 0, id);
  syncTextFromGraph();
  selectNode(id);
  statusLine.textContent = "Sibling node added.";
}

function moveSelectedNode(direction) {
  if (selectedNodeId === model.rootId) {
    statusLine.textContent = "The top event cannot be reordered.";
    return;
  }

  const parent = findParent(selectedNodeId);
  if (!parent) {
    return;
  }

  const currentIndex = parent.children.indexOf(selectedNodeId);
  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= parent.children.length) {
    statusLine.textContent = direction < 0 ? "Node is already leftmost." : "Node is already rightmost.";
    return;
  }

  pushUndoSnapshot();
  [parent.children[currentIndex], parent.children[nextIndex]] = [parent.children[nextIndex], parent.children[currentIndex]];
  syncTextFromGraph();
  selectNode(selectedNodeId);
  statusLine.textContent = direction < 0 ? "Node moved left." : "Node moved right.";
}

function renameSelectedNode() {
  applyNodeProperties();
}

function openShortcutsModal() {
  shortcutsModal.hidden = false;
  closeShortcutsButton.focus();
}

function closeShortcutsModal() {
  shortcutsModal.hidden = true;
  showShortcutsButton.focus();
}

function setReliabilityModalMaximized(maximized) {
  reliabilityModal?.classList.toggle("is-maximized", maximized);
  reliabilityModal?.querySelector(".reliability-modal-panel")?.classList.toggle("is-maximized", maximized);
  if (toggleReliabilityMaximizeButton) {
    toggleReliabilityMaximizeButton.textContent = maximized ? "Restore" : "Maximize";
    toggleReliabilityMaximizeButton.title = maximized ? "Restore reliability graph size" : "Maximize reliability graph";
    toggleReliabilityMaximizeButton.setAttribute("aria-pressed", String(maximized));
  }
  requestAnimationFrame(updateReliabilityView);
}

function toggleReliabilityModalMaximize() {
  setReliabilityModalMaximized(!reliabilityModal?.classList.contains("is-maximized"));
}

async function openReliabilityModal() {
  reliabilityModal.hidden = false;
  updateReliabilityView();
  closeReliabilityButton.focus();

  if (getTopEventProbabilityForReliability() !== null) {
    return;
  }

  showReliabilityGraphButton.disabled = true;
  statusLine.textContent = "Preparing reliability graph...";
  try {
    await runAnalysis();
  } finally {
    showReliabilityGraphButton.disabled = false;
  }
}

function closeReliabilityModal() {
  setReliabilityModalMaximized(false);
  reliabilityModal.hidden = true;
  showReliabilityGraphButton.focus();
}

function openExportModal() {
  exportFilenameInput.value = safeFilename(projectName);
  exportTargetSelect.value = activeBuilderMode === "fmea" ? "fmea" : "fault-tree";
  updateExportFormatOptions();
  if (exportTargetSelect.value === "fmea") {
    exportFormatSelect.value = "json";
  } else if (exportTargetSelect.value === "project") {
    exportFormatSelect.value = "json";
  } else {
    exportFormatSelect.value = "pdf";
  }
  updateExportExtensionPreview();
  exportModal.hidden = false;
  exportFilenameInput.focus();
}

function closeExportModal() {
  exportModal.hidden = true;
  document.querySelector("#export-project").focus();
}

function updateExportExtensionPreview() {
  const extensionByFormat = {
    pdf: ".pdf",
    svg: ".svg",
    png: ".png",
    json: ".json",
    csv: ".csv",
    sbe: ".sbe",
  };
  exportExtensionPreview.textContent = extensionByFormat[exportFormatSelect.value] || ".pdf";
}

function getExportFormatOptions(target) {
  if (target === "project") {
    return [
      { value: "json", label: "FAUTree JSON (.json)" },
      { value: "sbe", label: "XFTA SBE (.sbe)" },
    ];
  }

  if (target === "fmea") {
    return [
      { value: "json", label: "FMEDA JSON (.json)" },
      { value: "csv", label: "FMEDA CSV (.csv)" },
    ];
  }

  return [
    { value: "pdf", label: "PDF (.pdf)" },
    { value: "svg", label: "SVG (.svg)" },
    { value: "png", label: "PNG (.png)" },
  ];
}

function updateExportFormatOptions() {
  const currentValue = exportFormatSelect.value;
  const options = getExportFormatOptions(exportTargetSelect.value);
  exportFormatSelect.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
  exportFormatSelect.value = options.some((option) => option.value === currentValue) ? currentValue : options[0].value;
  updateExportExtensionPreview();
}

function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
}

function handleKeyboardShortcut(event) {
  const key = event.key.toLowerCase();
  const typing = isTypingTarget(event.target);
  const commandKey = event.ctrlKey || event.metaKey;

  if (key === "escape" && !shortcutsModal.hidden) {
    event.preventDefault();
    closeShortcutsModal();
    return;
  }

  if (key === "escape" && !exportModal.hidden) {
    event.preventDefault();
    closeExportModal();
    return;
  }

  if (key === "escape" && reliabilityModal && !reliabilityModal.hidden) {
    event.preventDefault();
    if (reliabilityModal.classList.contains("is-maximized")) {
      setReliabilityModalMaximized(false);
    } else {
      closeReliabilityModal();
    }
    return;
  }

  if (commandKey && key === "enter") {
    event.preventDefault();
    runAnalysis();
    return;
  }

  if (commandKey && key === "s") {
    event.preventDefault();
    applyNodeProperties();
    return;
  }

  if (commandKey && key === "z" && !typing) {
    event.preventDefault();
    if (event.shiftKey) {
      redoLastChange();
    } else {
      undoLastChange();
    }
    return;
  }

  if (commandKey && key === "y" && !typing) {
    event.preventDefault();
    redoLastChange();
    return;
  }

  if (typing || commandKey || event.altKey) {
    return;
  }

  if (key === "delete" || key === "backspace") {
    event.preventDefault();
    deleteSelectedNode();
    return;
  }

  if (key === "a") {
    event.preventDefault();
    setTool("and");
    return;
  }

  if (key === "o") {
    event.preventDefault();
    setTool("or");
    return;
  }

  if (key === "v") {
    event.preventDefault();
    setTool("voting");
    return;
  }

  if (key === "b") {
    event.preventDefault();
    setTool("basic");
    return;
  }

  if (key === "u") {
    event.preventDefault();
    setTool("undeveloped");
    return;
  }

  if (key === "c") {
    event.preventDefault();
    addChildNode();
    return;
  }

  if (key === "s") {
    event.preventDefault();
    addSiblingNode();
  }
}

function deleteSelectedNode() {
  if (selectedNodeId === model.rootId) {
    statusLine.textContent = "The top event cannot be deleted.";
    return;
  }

  const parent = findParent(selectedNodeId);
  if (!parent) {
    return;
  }

  pushUndoSnapshot();
  parent.children = parent.children.filter((childId) => childId !== selectedNodeId);
  deleteSubtree(selectedNodeId);
  selectNode(parent.id);
}

function deleteSubtree(nodeId) {
  const node = model.nodes[nodeId];
  if (!node) {
    return;
  }
  node.children.forEach(deleteSubtree);
  delete model.nodes[nodeId];
}

function findParent(nodeId) {
  return Object.values(model.nodes).find((node) => node.children.includes(nodeId));
}

function nextNodeId(kind) {
  nodeSequence += 1;
  return `${kind === "gate" ? "g" : "e"}${nodeSequence}`;
}

function updateNodeSequence() {
  const numericSuffixes = Object.keys(model.nodes)
    .map((id) => Number(id.match(/\d+$/)?.[0]))
    .filter(Number.isFinite);
  nodeSequence = numericSuffixes.length > 0 ? Math.max(...numericSuffixes) : 0;
}

function parseTextModel() {
  const expression = textArea.value.trim();
  if (!expression) {
    return createEmptyModel();
  }

  const ast = parseBooleanExpression(expression);
  if (ast.type === "variable") {
    throw new Error("Use at least one AND or OR operator to create a fault tree.");
  }

  return buildModelFromBooleanAst(ast);
}

function parseBooleanExpression(expression) {
  const tokens = tokenizeBooleanExpression(expression);
  let position = 0;

  function currentToken() {
    return tokens[position];
  }

  function consumeToken(expectedType) {
    const token = currentToken();
    if (!token || token.type !== expectedType) {
      const found = token ? `"${token.value}"` : "end of expression";
      throw new Error(`Boolean expression error: expected ${expectedType} but found ${found}.`);
    }
    position += 1;
    return token;
  }

  function parsePrimary() {
    const token = currentToken();
    if (!token) {
      throw new Error("Boolean expression error: expression ends unexpectedly.");
    }
    if (token.type === "identifier") {
      position += 1;
      return { type: "variable", name: token.value };
    }
    if (token.type === "lparen") {
      position += 1;
      const node = parseOrExpression();
      consumeToken("rparen");
      return node;
    }
    throw new Error(`Boolean expression error: unexpected token "${token.value}".`);
  }

  function parseAndExpression() {
    const children = [parsePrimary()];
    while (currentToken()?.type === "and") {
      position += 1;
      children.push(parsePrimary());
    }
    return children.length === 1 ? children[0] : { type: "gate", gate: "AND", children };
  }

  function parseOrExpression() {
    const children = [parseAndExpression()];
    while (currentToken()?.type === "or") {
      position += 1;
      children.push(parseAndExpression());
    }
    return children.length === 1 ? children[0] : { type: "gate", gate: "OR", children };
  }

  const ast = parseOrExpression();
  if (position < tokens.length) {
    throw new Error(`Boolean expression error: unexpected token "${tokens[position].value}".`);
  }
  return normalizeBooleanAst(ast);
}

function tokenizeBooleanExpression(expression) {
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (expression.startsWith("/\\", index)) {
      tokens.push({ type: "and", value: "/\\" });
      index += 2;
      continue;
    }
    if (expression.startsWith("\\/", index)) {
      tokens.push({ type: "or", value: "\\/" });
      index += 2;
      continue;
    }
    if (character === "(") {
      tokens.push({ type: "lparen", value: character });
      index += 1;
      continue;
    }
    if (character === ")") {
      tokens.push({ type: "rparen", value: character });
      index += 1;
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      let end = index + 1;
      while (end < expression.length && /[A-Za-z0-9_]/.test(expression[end])) {
        end += 1;
      }
      tokens.push({ type: "identifier", value: expression.slice(index, end) });
      index = end;
      continue;
    }

    throw new Error(`Boolean expression error: unsupported character "${character}".`);
  }

  return tokens;
}

function normalizeBooleanAst(node) {
  if (node.type !== "gate") {
    return node;
  }

  const children = node.children.map(normalizeBooleanAst).flatMap((child) => {
    return child.type === "gate" && child.gate === node.gate ? child.children : [child];
  });

  return {
    type: "gate",
    gate: node.gate,
    children,
  };
}

function buildModelFromBooleanAst(ast) {
  const nodes = {
    top: {
      id: "top",
      kind: "top_event",
      label: "Top event",
      children: [],
    },
  };
  let gateSequence = 0;
  let eventSequence = 0;

  function createGateId() {
    gateSequence += 1;
    return gateSequence === 1 ? "root_gate" : `g${gateSequence}`;
  }

  function createEventId() {
    eventSequence += 1;
    return `e${eventSequence}`;
  }

  function createNode(node) {
    if (node.type === "variable") {
      const eventId = createEventId();
      nodes[eventId] = {
        id: eventId,
        kind: "basic_event",
        label: node.name,
        failureRate: 0.001,
        children: [],
      };
      return eventId;
    }

    const gateId = createGateId();
    nodes[gateId] = {
      id: gateId,
      kind: "gate",
      gate: node.gate,
      label: `${node.gate} gate`,
      children: node.children.map(createNode),
    };
    return gateId;
  }

  nodes.top.children = [createNode(ast)];
  return {
    rootId: "top",
    nodes,
  };
}

function serializeBooleanNode(nodeIdOrNode, parentGate = null) {
  const node = typeof nodeIdOrNode === "string" ? model.nodes[nodeIdOrNode] : nodeIdOrNode;
  if (!node) {
    return "";
  }

  if (node.kind === "basic_event" || node.kind === "undeveloped_event") {
    return node.label;
  }

  if (node.kind === "top_event" || node.kind === "intermediate_event") {
    if (node.children.length === 1) {
      return serializeBooleanNode(node.children[0], parentGate);
    }
    return wrapBooleanExpression(
      node.children.map((childId) => serializeBooleanNode(childId, "OR")).filter(Boolean).join(" \\/ "),
      parentGate,
      "OR"
    );
  }

  if (node.kind !== "gate") {
    return "";
  }

  if (node.gate === "K_OF_N") {
    const threshold = parseVotingThreshold(node.votingThreshold || 2);
    const terms = chooseItems(node.children, threshold)
      .map((childIds) => {
        const term = childIds.map((childId) => serializeBooleanNode(childId, "AND")).filter(Boolean).join(" /\\ ");
        return wrapBooleanExpression(term, "OR", "AND");
      })
      .filter(Boolean);
    return wrapBooleanExpression(terms.join(" \\/ "), parentGate, "OR");
  }

  const operator = node.gate === "AND" ? "/\\" : "\\/";
  const expression = node.children.map((childId) => serializeBooleanNode(childId, node.gate)).filter(Boolean).join(` ${operator} `);
  return wrapBooleanExpression(expression, parentGate, node.gate);
}

function wrapBooleanExpression(expression, parentGate, currentGate) {
  if (!expression) {
    return "";
  }
  if (!parentGate || parentGate === currentGate) {
    return currentGate === "AND" || currentGate === "OR" ? `(${expression})` : expression;
  }
  return `(${expression})`;
}

function applyTextModel() {
  try {
    const parsedModel = parseTextModel();
    pushUndoSnapshot();
    model = parsedModel;
    selectedNodeId = model.rootId;
    updateNodeSequence();
    renderAll();
    setBuilderMode("graphical");
    clearAnalysisResults("Run analysis to compute cut sets.");
    statusLine.textContent = "Fault tree generated from Boolean expression.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

function syncTextFromGraph() {
  textArea.value = serializeTextModel();
}

function serializeTextModel() {
  const root = model.nodes[model.rootId];
  if (!root || root.children.length === 0) {
    return "";
  }

  const rootChild = model.nodes[root.children[0]];
  if (!rootChild) {
    return "";
  }

  return serializeBooleanNode(rootChild);
}

function chooseItems(items, size) {
  if (size <= 0) {
    return [[]];
  }
  if (size > items.length) {
    return [];
  }
  const choices = [];
  items.forEach((item, index) => {
    chooseItems(items.slice(index + 1), size - 1).forEach((suffix) => {
      choices.push([item, ...suffix]);
    });
  });
  return choices;
}

function modelToSbe() {
  const root = model.nodes[model.rootId];
  if (!root || root.children.length !== 1 || model.nodes[root.children[0]]?.kind !== "gate") {
    throw new Error("Export SBE needs one AND, OR, or Voting gate below the top event.");
  }

  const identifiers = createSbeIdentifiers();
  const emittedGates = new Set();
  const gateLines = [];

  function emitGate(nodeId, exportName) {
    const node = model.nodes[nodeId];
    if (!node || node.kind !== "gate" || emittedGates.has(nodeId)) {
      return;
    }
    if (node.gate === "K_OF_N") {
      throw new Error("SBE export currently supports only AND and OR gates. Use FAUTree JSON export for Voting gates.");
    }

    emittedGates.add(nodeId);
    const childGateIds = [];
    const childNames = node.children.map((childId) => {
      const child = model.nodes[childId];
      if (!child) {
        throw new Error("Export SBE failed: the tree contains a missing child node.");
      }
      if (child.kind === "intermediate_event") {
        if (child.children.length !== 1 || model.nodes[child.children[0]]?.kind !== "gate") {
          throw new Error(`Export SBE needs "${child.label}" to contain exactly one gate.`);
        }
        childGateIds.push({ id: child.children[0], name: identifiers.get(child.id) });
        return identifiers.get(child.id);
      }
      if (child.kind === "gate") {
        childGateIds.push({ id: child.id, name: identifiers.get(child.id) });
      }
      return identifiers.get(child.id);
    });

    const operator = ` ${node.gate.toLowerCase()} `;
    gateLines.push(`gate ${exportName} = ${childNames.join(operator)};`);
    childGateIds.forEach((childGate) => emitGate(childGate.id, childGate.name));
  }

  emitGate(root.children[0], "top");

  const eventLines = [];
  const emittedEvents = new Set();
  getLeafEventNodes().forEach((node) => {
    const eventName = identifiers.get(node.id);
    if (emittedEvents.has(eventName)) {
      return;
    }
    emittedEvents.add(eventName);
    eventLines.push(`basic-event ${eventName} = ${formatSbeNumber(node.failureRate ?? 0)};`);
  });

  return `${gateLines.join("\n")}\n${eventLines.join("\n")}\n`;
}

function createSbeIdentifiers() {
  const identifiers = new Map();
  const used = new Set(["top"]);

  Object.values(model.nodes).forEach((node) => {
    if (node.kind === "top_event") {
      identifiers.set(node.id, "top");
      return;
    }

    const preferred = sbeIdentifierFromLabel(node.label || node.id);
    let identifier = preferred;
    let index = 1;
    while (used.has(identifier)) {
      identifier = `${preferred}_${index}`;
      index += 1;
    }
    used.add(identifier);
    identifiers.set(node.id, identifier);
  });

  return identifiers;
}

function sbeIdentifierFromLabel(label) {
  const cleaned = String(label)
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const identifier = cleaned || "event";
  return /^[A-Za-z_]/.test(identifier) ? identifier : `e_${identifier}`;
}

function formatSbeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "0";
  }
  return Number.isInteger(number) ? String(number) : String(number);
}

function exportProject() {
  openExportModal();
}

async function confirmProjectExport() {
  const filenameBase = safeFilename(exportFilenameInput.value || projectName);
  const target = exportTargetSelect.value;
  const format = exportFormatSelect.value;

  if (target === "project") {
    if (format === "json") {
      await exportJsonProject(filenameBase);
      return;
    }
    if (format === "sbe") {
      await exportSbeProject(filenameBase);
      return;
    }
    await exportJsonProject(filenameBase);
    return;
  }

  if (target === "fmea") {
    if (format === "csv") {
      await exportFmeaWorksheetCsv(filenameBase);
      return;
    }
    await exportFmeaWorksheetJson(filenameBase);
    return;
  }

  if (format === "pdf") {
    await exportDiagramPdf(target, filenameBase);
    return;
  }

  if (format === "svg") {
    await exportDiagramSvg(target, filenameBase);
    return;
  }

  if (format === "png") {
    await exportDiagramPng(target, filenameBase);
    return;
  }

  statusLine.textContent = "Unsupported export selection.";
}

async function exportJsonProject(filenameBase = safeFilename(projectName)) {
  const project = modelToProjectJson();
  await saveTextFile({
    filename: `${filenameBase}.json`,
    content: JSON.stringify(project, null, 2),
    type: "application/json",
    description: "FAUTree JSON",
    extension: ".json",
  });
  closeExportModal();
  statusLine.textContent = "Project exported as FAUTree JSON.";
}

async function exportFmeaWorksheetJson(filenameBase = safeFilename(projectName)) {
  const payload = buildFmeaExportPayload();
  await saveTextFile({
    filename: `${filenameBase}-fmeda.json`,
    content: JSON.stringify(payload, null, 2),
    type: "application/json",
    description: "FMEDA JSON",
    extension: ".json",
  });
  closeExportModal();
  statusLine.textContent = "FMEDA exported as JSON.";
}

async function exportFmeaWorksheetCsv(filenameBase = safeFilename(projectName)) {
  const header = [
    "Component Type",
    "Function",
    "Failure Mode",
    "FIT",
    "Effect",
    "IEC 61508 Mode",
    "Safety Mechanism",
    "Diagnostic Coverage (%)",
    "Fault Classification",
    "Latent",
    "Fault Tree Event",
    "lambdaSD",
    "lambdaSU",
    "lambdaDD",
    "lambdaDU",
    "lambdaAnnunciation",
    "lambdaNoEffect",
    "Dangerous Diagnostic Coverage",
    "Total FIT",
  ];
  const rows = getFmeaRows().map((row) => [
    row.component,
    row.itemFunction,
    row.failureMode,
    row.failureRateFit,
    row.effect,
    normalizeFailureCategory(row.failureCategory, row.dangerous ? "dangerous" : "safe"),
    row.safetyMechanism,
    row.diagnosticCoveragePercent,
    row.faultClassification,
    row.latent ? "Yes" : "No",
    row.faultTreeEventId,
    getFmedaMetrics(row).lambdaSD,
    getFmedaMetrics(row).lambdaSU,
    getFmedaMetrics(row).lambdaDD,
    getFmedaMetrics(row).lambdaDU,
    getFmedaMetrics(row).lambdaAnnunciation,
    getFmedaMetrics(row).lambdaNoEffect,
    getFmedaMetrics(row).diagnosticCoverage,
    getFmedaMetrics(row).lambdaTotal,
  ]);
  const csv = [header, ...rows]
    .map((cells) => cells.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  await saveTextFile({
    filename: `${filenameBase}-fmeda.csv`,
    content: csv,
    type: "text/csv",
    description: "FMEDA CSV",
    extension: ".csv",
  });
  closeExportModal();
  statusLine.textContent = "FMEDA exported as CSV.";
}

async function exportSbeProject(filenameBase = safeFilename(projectName)) {
  try {
    const sbeText = modelToSbe();
    await saveTextFile({
      filename: `${filenameBase}.sbe`,
      content: sbeText,
      type: "text/plain",
      description: "XFTA SBE",
      extension: ".sbe",
    });
    closeExportModal();
    statusLine.textContent = "Project exported as XFTA SBE.";
  } catch (error) {
    if (error.name !== "AbortError") {
      statusLine.textContent = error.message;
    }
  }
}

async function saveTextFile({ filename, content, type }) {
  downloadTextFile(filename, content, type);
}

function downloadTextFile(filename, content, type) {
  downloadBlob(filename, new Blob([content], { type }));
}

function downloadBlob(filename, blob) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function createSvgNode(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function serializeSvg(svg) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;
}

function wrapSvgText(text, maxCharacters = 18) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters || current.length === 0) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 3);
}

function addSvgMultilineText(target, lines, x, y, className, lineHeight = 16) {
  const text = createSvgNode("text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);
  text.setAttribute("class", className);
  text.setAttribute("text-anchor", "middle");

  lines.forEach((line, index) => {
    const tspan = createSvgNode("tspan");
    tspan.setAttribute("x", x);
    tspan.setAttribute("dy", index === 0 ? "0" : String(lineHeight));
    tspan.textContent = line;
    text.appendChild(tspan);
  });

  target.appendChild(text);
}

function buildFaultTreeExportSvg() {
  const layout = measureTreeLayout();
  const repeatedBasicEventCounts = getRepeatedBasicEventCounts();
  const svg = createSvgNode("svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", layout.stageWidth);
  svg.setAttribute("height", layout.stageHeight);
  svg.setAttribute("viewBox", `0 0 ${layout.stageWidth} ${layout.stageHeight}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${projectName} fault tree`);

  const style = createSvgNode("style");
  style.textContent = `
    .export-bg { fill: #fffdf8; }
    .fault-link { fill: none; stroke: #6b7280; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .event-card { fill: #fffaf0; stroke: #d7b36a; stroke-width: 2; }
    .event-card.top-event { fill: #fff0eb; stroke: #b42318; }
    .event-card.intermediate-event { fill: #fff7ed; stroke: #ea580c; }
    .event-card.undeveloped-event { fill: #f5f3ff; stroke: #7c3aed; }
    .event-card.is-repeated-basic-event { stroke: #b7791f; }
    .event-kind { fill: #8a5a14; font: 600 11px "Segoe UI", Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
    .event-label { fill: #1f2937; font: 700 15px "Segoe UI", Arial, sans-serif; }
    .event-rate { fill: #475467; font: 500 11px "Segoe UI", Arial, sans-serif; }
    .gate-shape { fill: #ffffff; stroke: #344054; stroke-width: 2.4; }
    .gate-label { fill: #344054; font: 700 12px "Segoe UI", Arial, sans-serif; letter-spacing: 0.08em; }
  `;
  svg.append(style);

  const background = createSvgNode("rect");
  background.setAttribute("class", "export-bg");
  background.setAttribute("width", layout.stageWidth);
  background.setAttribute("height", layout.stageHeight);
  svg.append(background);

  visitTree(model.rootId, (node) => {
    node.children.forEach((childId) => {
      const path = createSvgNode("path");
      path.setAttribute("class", "fault-link");
      path.setAttribute("d", createLinePath(layout.positions[node.id], layout.positions[childId]));
      svg.append(path);
    });
  });

  visitTree(model.rootId, (node) => {
    const position = layout.positions[node.id];
    if (!position) {
      return;
    }

    if (node.kind === "gate") {
      const path = createSvgNode("path");
      path.setAttribute("class", "gate-shape");
      if (node.gate === "AND") {
        path.setAttribute(
          "d",
          `M ${position.centerX - 22} ${position.y + 60} L ${position.centerX - 22} ${position.y + 26} C ${position.centerX - 22} ${position.y + 8} ${position.centerX - 10} ${position.y + 4} ${position.centerX} ${position.y + 4} C ${position.centerX + 10} ${position.y + 4} ${position.centerX + 22} ${position.y + 8} ${position.centerX + 22} ${position.y + 26} L ${position.centerX + 22} ${position.y + 60} Z`
        );
      } else {
        path.setAttribute(
          "d",
          `M ${position.centerX - 28} ${position.y + 62} C ${position.centerX - 20} ${position.y + 36} ${position.centerX - 18} ${position.y + 16} ${position.centerX} ${position.y + 4} C ${position.centerX + 18} ${position.y + 16} ${position.centerX + 20} ${position.y + 36} ${position.centerX + 28} ${position.y + 62} C ${position.centerX + 10} ${position.y + 52} ${position.centerX - 10} ${position.y + 52} ${position.centerX - 28} ${position.y + 62} Z`
        );
      }
      svg.append(path);

      const label = createSvgNode("text");
      label.setAttribute("x", position.centerX);
      label.setAttribute("y", position.y + 82);
      label.setAttribute("class", "gate-label");
      label.setAttribute("text-anchor", "middle");
      label.textContent = node.gate === "K_OF_N" ? formatVotingGateLabel(node.votingThreshold || 2, node.children.length) : node.gate;
      svg.append(label);
      return;
    }

    const card = createSvgNode("rect");
    card.setAttribute("x", position.x);
    card.setAttribute("y", position.y);
    card.setAttribute("width", position.width);
    card.setAttribute("height", position.height);
    card.setAttribute("rx", node.kind === "undeveloped_event" ? "24" : "18");
    card.setAttribute("ry", node.kind === "undeveloped_event" ? "24" : "18");
    const repeatedCount = node.kind === "basic_event" ? repeatedBasicEventCounts.get(node.label.trim()) || 0 : 0;
    const repeated = repeatedCount > 1;
    card.setAttribute("class", `event-card ${node.kind.replace(/_/g, "-")}${repeated && repeatedBasicEventDisplayMode === "highlight" ? " is-repeated-basic-event" : ""}`);
    svg.append(card);

    addSvgMultilineText(svg, [nodeKindLabel(node)], position.centerX, position.y + 18, "event-kind", 14);
    addSvgMultilineText(
      svg,
      wrapSvgText(node.label, node.kind === "top_event" ? 24 : 18),
      position.centerX,
      position.y + 40,
      "event-label",
      18
    );

    if (node.failureRate) {
      addSvgMultilineText(svg, [`p = ${formatNumber(node.failureRate)}`], position.centerX, position.y + position.height - 14, "event-rate", 14);
    }
  });

  return {
    svg,
    width: layout.stageWidth,
    height: layout.stageHeight,
  };
}

function buildBddExportSvg() {
  if (!lastBddGraph) {
    throw new Error("Run BDD analysis before exporting the BDD diagram.");
  }

  const svg = createSvgNode("svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  renderBddGraph(lastBddGraph, svg, { width: 3600, minHeight: 360 });

  const height = Number(svg.getAttribute("viewBox")?.split(" ")[3] || "360");
  svg.setAttribute("width", "3600");
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${projectName} binary decision diagram`);

  const style = createSvgNode("style");
  style.textContent = `
    .bdd-edge { stroke: #98a2b3; stroke-width: 2.6; fill: none; }
    .bdd-edge.is-high { stroke: #16a34a; }
    .bdd-edge.is-low { stroke: #dc2626; stroke-dasharray: 8 6; }
    .bdd-edge-label { fill: #344054; font: 700 11px "Segoe UI", Arial, sans-serif; text-anchor: middle; }
    .bdd-node circle, .bdd-node rect { fill: #fffdf8; stroke: #344054; stroke-width: 2.4; }
    .bdd-node.is-terminal rect { fill: #ecfdf3; stroke: #16a34a; }
    .bdd-node text { fill: #111827; font: 700 12px "Segoe UI", Arial, sans-serif; text-anchor: middle; dominant-baseline: middle; }
  `;
  svg.insertBefore(style, svg.firstChild);

  return {
    svg,
    width: 3600,
    height,
  };
}

function getFmeaRows() {
  if (!Array.isArray(model.fmeaRows)) {
    model.fmeaRows = [];
  }
  return model.fmeaRows;
}

function buildReliabilityExportSvg() {
  updateReliabilityView();
  if (!lastReliabilityState || !reliabilityChart) {
    throw new Error("Run analysis before saving the reliability graph.");
  }

  const svg = reliabilityChart.cloneNode(true);
  const viewBoxParts = (svg.getAttribute("viewBox") || "0 0 960 520").split(/\s+/).map(Number);
  const width = Number.isFinite(viewBoxParts[2]) ? viewBoxParts[2] : 960;
  const height = Number.isFinite(viewBoxParts[3]) ? viewBoxParts[3] : 520;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${projectName} reliability graph`);

  const style = createSvgNode("style");
  style.textContent = `
    text { fill: #24272b; font-family: "Segoe UI", Arial, sans-serif; }
    .reliability-export-bg { fill: #fffdf9; }
    .axis-line { stroke: rgba(49, 95, 125, 0.42); stroke-width: 1.4; }
    .grid-line { stroke: rgba(49, 95, 125, 0.12); stroke-width: 1; }
    .curve-line { fill: none; stroke: #126b64; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
    .curve-fill { fill: rgba(18, 107, 100, 0.12); }
    .curve-marker { fill: #126b64; stroke: #fff; stroke-width: 2; }
    .chart-title { fill: #24272b; font-size: 14px; font-weight: 800; }
    .chart-label { fill: #68706d; font-size: 11px; font-weight: 700; }
    .chart-tick { fill: #68706d; font-size: 11px; }
  `;
  svg.insertBefore(style, svg.firstChild);

  const background = createSvgNode("rect");
  background.setAttribute("class", "reliability-export-bg");
  background.setAttribute("x", "0");
  background.setAttribute("y", "0");
  background.setAttribute("width", String(width));
  background.setAttribute("height", String(height));
  svg.insertBefore(background, style.nextSibling);

  return { svg, width, height, state: lastReliabilityState };
}

async function svgToPngBlob(svgMarkup, width, height) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("PNG export is not available in this browser."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error("PNG export failed."));
          return;
        }
        resolve(blob);
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not render SVG for PNG export."));
    };
    image.src = url;
  });
}

async function svgToJpegData(svgMarkup, width, height, scale = 2) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("PDF export is not available in this browser."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error("PDF export failed."));
          return;
        }
        resolve({
          bytes: new Uint8Array(await blob.arrayBuffer()),
          width: canvas.width,
          height: canvas.height,
        });
      }, "image/jpeg", 0.94);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not render SVG for PDF export."));
    };
    image.src = url;
  });
}

function formatPdfNumber(value) {
  return Number(value.toFixed(3)).toString();
}

function buildPdfBlobFromJpeg(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let byteLength = 0;
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 36;
  const maxImageWidth = pageWidth - margin * 2;
  const maxImageHeight = pageHeight - margin * 2;
  const imageRatio = imageWidth / imageHeight;
  const pageRatio = maxImageWidth / maxImageHeight;
  const drawWidth = imageRatio > pageRatio ? maxImageWidth : maxImageHeight * imageRatio;
  const drawHeight = imageRatio > pageRatio ? maxImageWidth / imageRatio : maxImageHeight;
  const drawX = (pageWidth - drawWidth) / 2;
  const drawY = (pageHeight - drawHeight) / 2;
  const content = [
    "q",
    `${formatPdfNumber(drawWidth)} 0 0 ${formatPdfNumber(drawHeight)} ${formatPdfNumber(drawX)} ${formatPdfNumber(drawY)} cm`,
    "/Im0 Do",
    "Q",
    "",
  ].join("\n");
  const contentBytes = encoder.encode(content);

  function append(chunk) {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    byteLength += bytes.length;
  }

  function appendObject(objectNumber, objectChunks) {
    offsets[objectNumber] = byteLength;
    append(`${objectNumber} 0 obj\n`);
    objectChunks.forEach(append);
    append("\nendobj\n");
  }

  append("%PDF-1.4\n");
  appendObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  appendObject(2, ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"]);
  appendObject(3, [
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(pageWidth)} ${formatPdfNumber(pageHeight)}] `,
    "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
  ]);
  appendObject(4, [
    `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} `,
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    jpegBytes,
    "\nendstream",
  ]);
  appendObject(5, [
    `<< /Length ${contentBytes.length} >>\nstream\n`,
    contentBytes,
    "endstream",
  ]);

  const xrefOffset = byteLength;
  append("xref\n0 6\n0000000000 65535 f \n");
  for (let index = 1; index <= 5; index += 1) {
    append(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  append("trailer\n<< /Size 6 /Root 1 0 R >>\n");
  append(`startxref\n${xrefOffset}\n%%EOF\n`);

  return new Blob(chunks, { type: "application/pdf" });
}

function createAnalysisSnapshotForExport() {
  if (lastAnalysisSnapshot) {
    return lastAnalysisSnapshot;
  }

  const validationErrors = validateModelForAnalysis();
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]);
  }

  const cutSets = minimizeCutSets(computeCutSets(model.rootId)).map((events) => ({
    events,
    order: events.length,
  }));
  const topProbability = cutSets.reduce(
    (total, cutSet) => total + cutSet.events.reduce((product, label) => product * probabilityForLabel(label), 1),
    0
  );

  return {
    cutSets,
    topProbability: Math.min(topProbability, 1),
    analysisDuration: null,
    generatedAt: new Date().toISOString(),
    engine: "Local export fallback",
  };
}

function buildFaultTreePdfReportHtml() {
  const analysis = createAnalysisSnapshotForExport();
  const faultTree = buildFaultTreeExportSvg();
  const faultTreeDataUrl = URL.createObjectURL(new Blob([serializeSvg(faultTree.svg)], { type: "image/svg+xml;charset=utf-8" }));
  const dominant = findDominantCutSet(analysis.cutSets || []);
  const repeatedEvents = getRepeatedBasicEventLabels();
  const exportedAt = new Date().toLocaleString();
  const rows = (analysis.cutSets || [])
    .map((cutSet, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>{ ${cutSet.events.map(escapeHtml).join(", ")} }</td>
        <td>${cutSet.order}</td>
      </tr>
    `)
    .join("");

  return {
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(projectName)} Report</title>
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; }
            h1, h2 { margin: 0 0 10px; }
            p { margin: 0; }
            .header { margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
            .header p { color: #475467; margin-top: 4px; }
            .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0 18px; }
            .meta-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; background: #fffdf8; }
            .meta-card strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a5a14; margin-bottom: 4px; }
            .diagram { border: 1px solid #e5e7eb; border-radius: 14px; padding: 10px; background: white; page-break-inside: avoid; text-align: center; }
            .diagram img { width: auto; max-width: 100%; max-height: 42vh; height: auto; display: inline-block; object-fit: contain; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
            th, td { border: 1px solid #d0d5dd; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
            .section { margin-top: 20px; page-break-inside: avoid; }
            .note { color: #667085; font-size: 11px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <section class="header">
            <h1>${escapeHtml(projectName)}</h1>
            <p>FAUTree analysis export generated on ${escapeHtml(exportedAt)}</p>
          </section>
          <section class="meta">
            <div class="meta-card"><strong>Basic Events</strong><span>${getLeafEventNodes().length}</span></div>
            <div class="meta-card"><strong>Minimal Cut Sets</strong><span>${(analysis.cutSets || []).length}</span></div>
            <div class="meta-card"><strong>Top Probability</strong><span>${formatNumber(analysis.topProbability || 0)}</span></div>
            <div class="meta-card"><strong>Minimum Order</strong><span>${(analysis.cutSets || []).length ? Math.min(...analysis.cutSets.map((cutSet) => cutSet.order)) : "none"}</span></div>
            <div class="meta-card"><strong>Repeated Events</strong><span>${repeatedEvents.length ? `${repeatedEvents.length} (${repeatedEvents.map(escapeHtml).join(", ")})` : "0"}</span></div>
            <div class="meta-card"><strong>Dominant Cut Set</strong><span>${dominant ? `{ ${escapeHtml(dominant.events.join(", "))} }` : "none"}</span></div>
          </section>
          <section class="section">
            <h2>Fault Tree</h2>
            <div class="diagram">
              <img src="${faultTreeDataUrl}" alt="Fault tree diagram">
            </div>
            <p class="note">The diagram is scaled to fit the page while preserving aspect ratio.</p>
          </section>
          <section class="section">
            <h2>Minimal Cut Sets</h2>
            <table>
              <thead>
                <tr><th>#</th><th>Events</th><th>Order</th></tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="3">No cut sets available.</td></tr>'}
              </tbody>
            </table>
            <p class="note">Analysis engine: ${escapeHtml(analysis.engine || "Python backend")}</p>
          </section>
        </body>
      </html>
    `,
    revoke() {
      URL.revokeObjectURL(faultTreeDataUrl);
    },
  };
}

function buildBddPdfReportHtml() {
  if (!lastBddGraph) {
    throw new Error("Run BDD analysis before exporting a BDD PDF.");
  }

  const bdd = lastBddAnalysis || {};
  const diagram = buildBddExportSvg();
  const diagramDataUrl = URL.createObjectURL(new Blob([serializeSvg(diagram.svg)], { type: "image/svg+xml;charset=utf-8" }));
  const exportedAt = new Date().toLocaleString();
  const variableOrder = (bdd.variableOrder || []).join(" < ") || "none";
  const exactProbability = Number.isFinite(Number(bdd.exactProbability)) ? formatNumber(Number(bdd.exactProbability)) : "pending";
  const nonTerminalCount = bdd.nodeCount ?? "pending";
  const variableCount = Array.isArray(bdd.variableOrder) ? bdd.variableOrder.length : "pending";

  return {
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(projectName)} BDD</title>
          <style>
            @page { size: A4 landscape; margin: 14mm; }
            body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; }
            h1, h2 { margin: 0 0 10px; }
            p { margin: 0; }
            .header { margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
            .header p { color: #475467; margin-top: 4px; }
            .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0 18px; }
            .meta-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; background: #fffdf8; }
            .meta-card strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a5a14; margin-bottom: 4px; }
            .diagram { border: 1px solid #e5e7eb; border-radius: 14px; padding: 10px; background: white; page-break-inside: avoid; text-align: center; }
            .diagram img { width: 100%; max-width: 100%; max-height: 60vh; height: auto; display: inline-block; object-fit: contain; }
            .section { margin-top: 20px; page-break-inside: avoid; }
            .note { color: #667085; font-size: 11px; margin-top: 8px; }
            .order { font-size: 11px; line-height: 1.5; word-break: break-word; }
          </style>
        </head>
        <body>
          <section class="header">
            <h1>${escapeHtml(projectName)} BDD</h1>
            <p>BDD export generated on ${escapeHtml(exportedAt)}</p>
          </section>
          <section class="meta">
            <div class="meta-card"><strong>Ordering</strong><span>${escapeHtml(bdd.ordering || bddOrderingSelect.value)}</span></div>
            <div class="meta-card"><strong>Variables</strong><span>${escapeHtml(String(variableCount))}</span></div>
            <div class="meta-card"><strong>Non-terminal nodes</strong><span>${escapeHtml(String(nonTerminalCount))}</span></div>
            <div class="meta-card"><strong>Exact probability</strong><span>${escapeHtml(String(exactProbability))}</span></div>
          </section>
          <section class="section">
            <h2>BDD Diagram</h2>
            <div class="diagram">
              <img src="${diagramDataUrl}" alt="Binary decision diagram">
            </div>
            <p class="note">The diagram is scaled to fit the page while preserving aspect ratio.</p>
          </section>
          <section class="section">
            <h2>Variable Order</h2>
            <div class="order">${escapeHtml(variableOrder)}</div>
          </section>
        </body>
      </html>
    `,
    revoke() {
      URL.revokeObjectURL(diagramDataUrl);
    },
  };
}

async function exportDiagramPdf(target, filenameBase = safeFilename(projectName)) {
  try {
    const report = target === "bdd" ? buildBddPdfReportHtml() : buildFaultTreePdfReportHtml();
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) {
      report.revoke();
      throw new Error("Popup blocked. Allow popups to open the PDF print preview.");
    }
    reportWindow.onload = () => {
      reportWindow.document.title = `${filenameBase}.pdf`;
      reportWindow.focus();
      reportWindow.print();
      report.revoke();
    };
    reportWindow.document.open();
    reportWindow.document.write(report.html);
    reportWindow.document.close();
    closeExportModal();
    statusLine.textContent = "PDF report opened in the browser print dialog.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function exportDiagramSvg(target, filenameBase = safeFilename(projectName)) {
  if (target === "bdd") {
    await exportBddSvg(filenameBase);
    return;
  }
  await exportFaultTreeSvg(filenameBase);
}

async function exportDiagramPng(target, filenameBase = safeFilename(projectName)) {
  if (target === "bdd") {
    await exportBddPng(filenameBase);
    return;
  }
  await exportFaultTreePng(filenameBase);
}

async function exportReliabilitySvg(filenameBase = safeFilename(projectName)) {
  try {
    const asset = buildReliabilityExportSvg();
    downloadTextFile(`${filenameBase}-reliability.svg`, serializeSvg(asset.svg), "image/svg+xml;charset=utf-8");
    statusLine.textContent = "Reliability graph exported as SVG.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function exportReliabilityPng(filenameBase = safeFilename(projectName)) {
  try {
    const asset = buildReliabilityExportSvg();
    const blob = await svgToPngBlob(serializeSvg(asset.svg), asset.width, asset.height);
    downloadBlob(`${filenameBase}-reliability.png`, blob);
    statusLine.textContent = "Reliability graph exported as PNG.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function exportReliabilityPdf(filenameBase = safeFilename(projectName)) {
  try {
    const asset = buildReliabilityExportSvg();
    const jpeg = await svgToJpegData(serializeSvg(asset.svg), asset.width, asset.height);
    const blob = buildPdfBlobFromJpeg(jpeg.bytes, jpeg.width, jpeg.height);
    downloadBlob(`${filenameBase}-reliability.pdf`, blob);
    statusLine.textContent = "Reliability graph exported as PDF.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function exportReliabilityGraph(filenameBase = safeFilename(projectName)) {
  const format = reliabilityExportFormatSelect?.value || "svg";
  if (format === "png") {
    await exportReliabilityPng(filenameBase);
    return;
  }
  if (format === "pdf") {
    await exportReliabilityPdf(filenameBase);
    return;
  }
  await exportReliabilitySvg(filenameBase);
}

async function exportFaultTreeSvg(filenameBase = safeFilename(projectName)) {
  const asset = buildFaultTreeExportSvg();
  downloadTextFile(`${filenameBase}-fault-tree.svg`, serializeSvg(asset.svg), "image/svg+xml;charset=utf-8");
  closeExportModal();
  statusLine.textContent = "Fault tree exported as SVG.";
}

async function exportFaultTreePng(filenameBase = safeFilename(projectName)) {
  try {
    const asset = buildFaultTreeExportSvg();
    const blob = await svgToPngBlob(serializeSvg(asset.svg), asset.width, asset.height);
    downloadBlob(`${filenameBase}-fault-tree.png`, blob);
    closeExportModal();
    statusLine.textContent = "Fault tree exported as PNG.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function exportBddSvg(filenameBase = safeFilename(projectName)) {
  try {
    const asset = buildBddExportSvg();
    downloadTextFile(`${filenameBase}-bdd.svg`, serializeSvg(asset.svg), "image/svg+xml;charset=utf-8");
    closeExportModal();
    statusLine.textContent = "BDD exported as SVG.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

async function exportBddPng(filenameBase = safeFilename(projectName)) {
  try {
    const asset = buildBddExportSvg();
    const blob = await svgToPngBlob(serializeSvg(asset.svg), asset.width, asset.height);
    downloadBlob(`${filenameBase}-bdd.png`, blob);
    closeExportModal();
    statusLine.textContent = "BDD exported as PNG.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

function modelToProjectJson() {
  syncCustomBddOrder();
  const reliabilityViewport = getReliabilityViewport();
  return {
    schemaVersion: "0.1.0",
    project: {
      id: safeFilename(projectName),
      name: projectName,
      description: "",
      createdBy: "FAUTree",
    },
    analysis: {
      quantification: "rare-event-approximation",
      variableOrdering: bddOrderingSelect.value,
      customVariableOrder: parseCustomBddOrder(),
      missionTimeHours: getReliabilityMissionTimeHours(),
      timeUnit: "hours",
      reliabilityXAxisMinHours: reliabilityViewport.xMinHours,
      reliabilityXAxisMaxHours: reliabilityViewport.xMaxHours,
      reliabilityYAxisMin: reliabilityViewport.yMin,
      reliabilityYAxisMax: reliabilityViewport.yMax,
    },
    nodes: Object.values(model.nodes).map((node) => {
      const type = node.kind === "intermediate_event" ? "intermediate_event" : node.kind;
      const payload = {
        id: node.id,
        type,
        label: node.label,
      };
      if (node.kind === "gate") {
        payload.gateType = node.gate;
        if (node.gate === "K_OF_N") {
          payload.votingThreshold = parseVotingThreshold(node.votingThreshold || 2);
        }
      }
      if (node.kind === "basic_event" || node.kind === "undeveloped_event") {
        payload.probability = node.failureRate ?? 0;
      }
      return payload;
    }),
    edges: buildEdges(),
    fmedaProfile: "semiconductor-exida",
    fmea: getFmeaRows().map((row) => serializeFmedaRow(row)),
  };
}

function buildFmeaExportPayload() {
  return {
    schemaVersion: "0.1.0",
    fmedaProfile: "semiconductor-exida",
    project: {
      id: safeFilename(projectName),
      name: projectName,
      description: "",
      createdBy: "FAUTree",
    },
    fmeda: getFmeaRows().map((row) => serializeFmedaRow(row)),
  };
}

function serializeFmedaRow(row) {
  const metrics = getFmedaMetrics(row);
  return {
    id: row.id,
    component: row.component,
    itemFunction: row.itemFunction,
    failureMode: row.failureMode,
    failureMechanism: row.failureMechanism,
    effect: row.effect,
    cause: row.cause,
    safetyMechanism: row.safetyMechanism,
    faultTreeEventId: row.faultTreeEventId,
    failureRateFit: metrics.lambdaTotal,
    failureCategory: metrics.failureCategory,
    dangerous: metrics.dangerous,
    diagnosticCoveragePercent: normalizeFmedaPercent(row.diagnosticCoveragePercent),
    faultClassification: metrics.faultClassification,
    latent: metrics.latent,
    lambdaSD: metrics.lambdaSD,
    lambdaSU: metrics.lambdaSU,
    lambdaDD: metrics.lambdaDD,
    lambdaDU: metrics.lambdaDU,
    lambdaAnnunciation: metrics.lambdaAnnunciation,
    lambdaNoEffect: metrics.lambdaNoEffect,
    lambdaSPF: metrics.lambdaSPF,
    lambdaRF: metrics.lambdaRF,
    lambdaMPF: metrics.lambdaMPF,
    lambdaLatentMPF: metrics.lambdaLatentMPF,
    lambdaSafe: metrics.lambdaSafe,
    lambdaDangerous: metrics.lambdaDangerous,
    lambdaTotal: metrics.lambdaTotal,
    diagnosticCoverage: metrics.diagnosticCoverage,
    severity: row.severity,
    occurrence: row.occurrence,
    detectability: row.detectability,
    rpn: getFmeaRpn(row),
  };
}

function buildEdges() {
  const edges = [];
  Object.values(model.nodes).forEach((node) => {
    node.children.forEach((childId) => {
      edges.push({
        source: node.id,
        target: childId,
      });
    });
  });
  return edges;
}

function importProjectFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const content = String(reader.result);
      if (isSbeFile(file, content)) {
        loadModelFromSbe(content, file.name);
        statusLine.textContent = `Imported XFTA SBE: ${projectName}`;
        return;
      }

      const trimmed = content.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) || Array.isArray(parsed.rows) || Array.isArray(parsed.fmea) || Array.isArray(parsed.fmeda) || (!parsed.nodes && !parsed.edges)) {
          const importedRows = parseImportedFmeaContent(trimmed);
          if (importedRows.length > 0) {
            applyImportedFmeaRows(importedRows);
            statusLine.textContent = `Imported ${importedRows.length} FMEDA row${importedRows.length === 1 ? "" : "s"}.`;
            return;
          }
        }

        loadProjectFromJson(parsed);
        statusLine.textContent = `Imported: ${projectName}`;
        return;
      }

      const importedRows = parseImportedFmeaContent(content);
      if (importedRows.length > 0) {
        applyImportedFmeaRows(importedRows);
        statusLine.textContent = `Imported ${importedRows.length} FMEDA row${importedRows.length === 1 ? "" : "s"}.`;
        return;
      }

      throw new Error("Unsupported import format.");
    } catch (error) {
      statusLine.textContent = error.message;
    } finally {
      importProjectInput.value = "";
    }
  });
  reader.addEventListener("error", () => {
    statusLine.textContent = "Could not read the selected file.";
  });
  reader.readAsText(file);
}

function parseImportedFmeaContent(content) {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed).map((row, index) => createFmeaRow({ ...row, id: row.id || `fmea-row-${index + 1}` }));
  }

  if (trimmed.startsWith("{")) {
    const payload = JSON.parse(trimmed);
    if (Array.isArray(payload.fmeda)) {
      return payload.fmeda.map((row, index) => createFmeaRow({ ...row, id: row.id || `fmea-row-${index + 1}` }));
    }
    if (Array.isArray(payload.fmea)) {
      return payload.fmea.map((row, index) => createFmeaRow({ ...row, id: row.id || `fmea-row-${index + 1}` }));
    }
    if (Array.isArray(payload.rows)) {
      return payload.rows.map((row, index) => createFmeaRow({ ...row, id: row.id || `fmea-row-${index + 1}` }));
    }
  }

  return parseFmeaCsv(trimmed);
}

function parseFmeaCsv(content) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => normalizeFmeaHeader(header));
  const indexByHeader = new Map(headers.map((header, index) => [header, index]));
  const hasRecognizedHeader = [
    "component",
    "block",
    "itemfunction",
    "function",
    "failuremode",
    "effect",
    "cause",
    "severity",
    "occurrence",
    "detectability",
    "fit",
    "failureratefit",
    "failurecategory",
    "iec61508mode",
    "iec61508failurecategory",
    "dangerous",
    "diagnosticcoverage",
    "diagnosticcoveragepercent",
    "faultclassification",
    "faulttype",
    "latent",
    "lambdasd",
    "lambdasu",
    "lambdadd",
    "lambdadu",
    "sd",
    "su",
    "dd",
    "du",
  ].some((header) => indexByHeader.has(header));
  if (!hasRecognizedHeader) {
    throw new Error("Unsupported FMEDA CSV format.");
  }

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    return createFmeaRow({
      id: `fmea-row-${index + 1}`,
      component: readCsvCell(cells, indexByHeader, "component", "block", "part", "componentblock"),
      itemFunction: readCsvCell(cells, indexByHeader, "itemfunction", "item", "function"),
      failureMode: readCsvCell(cells, indexByHeader, "failuremode"),
      failureMechanism: readCsvCell(cells, indexByHeader, "failuremechanism", "mechanism"),
      effect: readCsvCell(cells, indexByHeader, "effect"),
      cause: readCsvCell(cells, indexByHeader, "cause"),
      safetyMechanism: readCsvCell(cells, indexByHeader, "safetymechanism", "diagnostic", "diagnosticmechanism"),
      faultTreeEventId: readCsvCell(cells, indexByHeader, "faulttreeevent", "faulttreeeventid", "basiceventid", "eventid"),
      failureRateFit: readCsvCell(cells, indexByHeader, "fit", "failureratefit", "failure rate fit", "failurerate"),
      failureCategory: readCsvCell(cells, indexByHeader, "failurecategory", "iec61508mode", "iec61508failurecategory", "iec mode"),
      dangerous: readCsvCell(cells, indexByHeader, "dangerous", "safetyrelevant"),
      diagnosticCoveragePercent: readCsvCell(cells, indexByHeader, "diagnosticcoveragepercent", "diagnosticcoverage", "dcpercent", "dc"),
      faultClassification: readCsvCell(cells, indexByHeader, "faultclassification", "faulttype", "classification"),
      latent: readCsvCell(cells, indexByHeader, "latent"),
      lambdaSD: readCsvCell(cells, indexByHeader, "lambdasd", "lambda sd", "sd"),
      lambdaSU: readCsvCell(cells, indexByHeader, "lambdasu", "lambda su", "su"),
      lambdaDD: readCsvCell(cells, indexByHeader, "lambdadd", "lambda dd", "dd"),
      lambdaDU: readCsvCell(cells, indexByHeader, "lambdadu", "lambda du", "du"),
      severity: readCsvCell(cells, indexByHeader, "severity"),
      occurrence: readCsvCell(cells, indexByHeader, "occurrence"),
      detectability: readCsvCell(cells, indexByHeader, "detectability", "detection"),
    });
  });
}

function normalizeFmeaHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function readCsvCell(cells, indexByHeader, ...headerNames) {
  for (const headerName of headerNames) {
    const index = indexByHeader.get(normalizeFmeaHeader(headerName));
    if (index !== undefined) {
      return cells[index] ?? "";
    }
  }
  return "";
}

function applyImportedFmeaRows(importedRows) {
  pushUndoSnapshot();
  model.fmeaRows = importedRows;
  renderFmeaTable();
}

function isSbeFile(file, content) {
  return file.name.toLowerCase().endsWith(".sbe") || /^\s*(gate|basic-event)\s+/im.test(content);
}

function loadModelFromSbe(content, filename) {
  const imported = parseSbeModel(content);
  pushUndoSnapshot();
  model = imported;
  model.fmeaRows = [];
  selectedNodeId = model.rootId;
  updateNodeSequence();
  setProjectName(filename ? filename.replace(/\.sbe$/i, "") : "Imported XFTA SBE");
  setReliabilityMissionTimeHours(8760, false);
  setReliabilityViewport(defaultReliabilityViewport, false);
  syncTextFromGraph();
  setBuilderMode("graphical");
  renderAll();
  clearAnalysisResults("Run analysis to compute cut sets.");
}

function parseSbeModel(content) {
  const gateDefinitions = new Map();
  const basicDefinitions = new Map();
  const lines = content.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = rawLine
      .replace(/\/\/.*$/, "")
      .replace(/#.*$/, "")
      .trim();

    if (!line) {
      return;
    }

    const gateMatch = line.match(/^gate\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*;?$/i);
    if (gateMatch) {
      const name = gateMatch[1];
      if (gateDefinitions.has(name)) {
        throw new Error(`Line ${index + 1}: duplicate gate "${name}".`);
      }
      gateDefinitions.set(name, parseSbeGateExpression(gateMatch[2], index + 1));
      return;
    }

    const basicMatch = line.match(/^basic-event\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*;?$/i);
    if (basicMatch) {
      const name = basicMatch[1];
      if (basicDefinitions.has(name)) {
        throw new Error(`Line ${index + 1}: duplicate basic event "${name}".`);
      }
      basicDefinitions.set(name, parseStrictFailureRate(basicMatch[2], index + 1));
      return;
    }

    throw new Error(`Line ${index + 1}: unsupported SBE syntax.`);
  });

  if (!gateDefinitions.has("top")) {
    throw new Error('Invalid SBE: a "gate top = ..." definition is required.');
  }

  const nodes = {
    top: {
      id: "top",
      kind: "top_event",
      label: "top",
      children: ["root_gate"],
    },
  };

  const gateIdByName = new Map();
  const basicIdByName = new Map();
  gateDefinitions.forEach((definition, name) => {
    const id = name === "top" ? "root_gate" : uniqueImportedId(`g_${name}`, nodes);
    gateIdByName.set(name, id);
    nodes[id] = {
      id,
      kind: "gate",
      gate: definition.gate,
      label: name === "top" ? "top logic" : name,
      children: [],
    };
  });

  basicDefinitions.forEach((probability, name) => {
    const id = uniqueImportedId(`e_${name}`, nodes);
    basicIdByName.set(name, id);
    nodes[id] = {
      id,
      kind: "basic_event",
      label: name,
      failureRate: probability,
      children: [],
    };
  });

  gateDefinitions.forEach((definition, name) => {
    const gateNode = nodes[gateIdByName.get(name)];
    gateNode.children = definition.children.map((childName) => {
      if (gateIdByName.has(childName)) {
        return gateIdByName.get(childName);
      }
      if (basicIdByName.has(childName)) {
        return basicIdByName.get(childName);
      }
      throw new Error(`Invalid SBE: "${name}" references undefined event "${childName}".`);
    });
  });

  return {
    rootId: "top",
    nodes,
  };
}

function parseSbeGateExpression(expression, lineNumber) {
  const trimmed = expression.trim();
  const operatorMatches = [...trimmed.matchAll(/\s+(and|or)\s+/gi)].map((match) => match[1].toUpperCase());
  const uniqueOperators = uniqueItems(operatorMatches);

  if (uniqueOperators.length !== 1) {
    throw new Error(`Line ${lineNumber}: gate expression must use only AND or only OR.`);
  }

  const children = trimmed
    .split(new RegExp(`\\s+${uniqueOperators[0]}\\s+`, "i"))
    .map((item) => item.trim())
    .filter(Boolean);

  if (children.length < 2) {
    throw new Error(`Line ${lineNumber}: gate must have at least two inputs.`);
  }

  children.forEach((child) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(child)) {
      throw new Error(`Line ${lineNumber}: invalid event name "${child}".`);
    }
  });

  return {
    gate: uniqueOperators[0],
    children,
  };
}

function uniqueImportedId(candidate, nodes) {
  const base = candidate.replace(/[^A-Za-z0-9_]/g, "_") || "node";
  let id = base;
  let index = 1;
  while (nodes[id]) {
    id = `${base}_${index}`;
    index += 1;
  }
  return id;
}

function loadProjectFromJson(project) {
  if (!project || !Array.isArray(project.nodes) || !Array.isArray(project.edges)) {
    throw new Error("Invalid FAUTree JSON: nodes and edges are required.");
  }

  const topNodes = project.nodes.filter((node) => node.type === "top_event");
  if (topNodes.length !== 1) {
    throw new Error("Invalid FAUTree JSON: exactly one top event is required.");
  }

  const importedNodes = {};
  project.nodes.forEach((node) => {
    if (!node.id || !node.label || !node.type) {
      throw new Error("Invalid FAUTree JSON: every node needs id, type, and label.");
    }

    importedNodes[node.id] = normalizeImportedNode(node);
  });

  project.edges.forEach((edge) => {
    if (!importedNodes[edge.source] || !importedNodes[edge.target]) {
      throw new Error(`Invalid FAUTree JSON: edge references missing node (${edge.source} -> ${edge.target}).`);
    }
    importedNodes[edge.source].children.push(edge.target);
  });

  pushUndoSnapshot();
  projectName = project.project?.name || "Imported Fault Tree";
  const importedFmedaRows = Array.isArray(project.fmeda) ? project.fmeda : project.fmea;
  model = {
    rootId: topNodes[0].id,
    nodes: importedNodes,
    fmeaRows: Array.isArray(importedFmedaRows) ? importedFmedaRows.map((row) => createFmeaRow(row)) : [],
  };
  selectedNodeId = model.rootId;
  updateNodeSequence();
  setProjectName(projectName);
  setReliabilityMissionTimeHours(project.analysis?.missionTimeHours ?? project.analysis?.missionTime ?? 8760, false);
  setReliabilityViewport(
    {
      xMinHours: project.analysis?.reliabilityXAxisMinHours ?? defaultReliabilityViewport.xMinHours,
      xMaxHours: project.analysis?.reliabilityXAxisMaxHours ?? project.analysis?.missionTimeHours ?? project.analysis?.missionTime ?? 8760,
      yMin: project.analysis?.reliabilityYAxisMin ?? defaultReliabilityViewport.yMin,
      yMax: project.analysis?.reliabilityYAxisMax ?? defaultReliabilityViewport.yMax,
    },
    false
  );
  bddOrderingSelect.value = ["alphabetical", "infix", "custom"].includes(project.analysis?.variableOrdering)
    ? project.analysis.variableOrdering
    : "infix";
  syncCustomBddOrder(project.analysis?.customVariableOrder || []);
  updateCustomBddOrderVisibility();
  syncTextFromGraph();
  setBuilderMode("graphical");
  renderAll();
  clearAnalysisResults("Run analysis to compute cut sets.");
}

function normalizeImportedNode(node) {
  if (node.type === "top_event") {
    return {
      id: node.id,
      kind: "top_event",
      label: node.label,
      children: [],
    };
  }

  if (node.type === "gate") {
    const gateType = node.gateType === "VOTING" ? "K_OF_N" : node.gateType;
    if (!["AND", "OR", "K_OF_N"].includes(gateType)) {
      throw new Error(`Invalid FAUTree JSON: unsupported gate type "${node.gateType}".`);
    }
    return {
      id: node.id,
      kind: "gate",
      gate: gateType,
      ...(gateType === "K_OF_N" ? { votingThreshold: parseVotingThreshold(node.votingThreshold || node.threshold || 2) } : {}),
      label: node.label,
      children: [],
    };
  }

  if (node.type === "intermediate_event") {
    return {
      id: node.id,
      kind: "intermediate_event",
      label: node.label,
      children: [],
    };
  }

  if (node.type === "basic_event") {
    return {
      id: node.id,
      kind: "basic_event",
      label: node.label,
      failureRate: Number(node.failureRate ?? node.probability ?? 0),
      children: [],
    };
  }

  if (node.type === "undeveloped_event") {
    return {
      id: node.id,
      kind: "undeveloped_event",
      label: node.label,
      failureRate: Number(node.failureRate ?? node.probability ?? 0),
      children: [],
    };
  }

  throw new Error(`Invalid FAUTree JSON: unsupported node type "${node.type}".`);
}

function computeCutSets(nodeId) {
  const node = model.nodes[nodeId];
  if (!node) {
    return [];
  }

  if (node.kind === "basic_event" || node.kind === "undeveloped_event") {
    return [[node.label]];
  }

  if (node.kind === "gate" && node.children.length === 0) {
    return [];
  }

  if (node.children.length === 0) {
    return [[node.label]];
  }

  const childSets = node.children.map((childId) => computeCutSets(childId));
  if (node.kind === "top_event" || node.kind === "intermediate_event" || node.gate === "OR") {
    return childSets.flat();
  }

  if (node.gate === "K_OF_N") {
    const threshold = parseVotingThreshold(node.votingThreshold || 2);
    return chooseItems(childSets, threshold).flatMap((selectedChildSets) => {
      return selectedChildSets.reduce(
        (combined, sets) =>
          combined.flatMap((left) => sets.map((right) => uniqueItems([...left, ...right]))),
        [[]]
      );
    });
  }

  return childSets.reduce(
    (combined, sets) =>
      combined.flatMap((left) => sets.map((right) => uniqueItems([...left, ...right]))),
    [[]]
  );
}

function minimizeCutSets(cutSets) {
  const normalized = cutSets.map((set) => uniqueItems(set).sort());
  return normalized.filter((set, index) => {
    return !normalized.some((candidate, candidateIndex) => {
      if (candidateIndex === index || candidate.length >= set.length) {
        return false;
      }
      return candidate.every((item) => set.includes(item));
    });
  });
}

function clearAnalysisResults(message) {
  lastAnalysisSnapshot = null;
  lastBddGraph = null;
  lastBddAnalysis = null;
  lastReliabilityState = null;
  qualitativeTableBody.innerHTML = `
    <tr>
      <td colspan="3">${escapeHtml(message)}</td>
    </tr>
  `;
  metricMissionTime.textContent = `${formatNumber(getReliabilityMissionTimeHours())} h`;
  metricTopProbability.textContent = "pending";
  metricReliabilityLambda.textContent = "pending";
  metricReliabilityAtMission.textContent = "pending";
  metricVariableCount.textContent = String(getLeafEventNodes().length);
  metricBddOrdering.textContent = bddOrderingSelect.value;
  metricBddNodes.textContent = "pending";
  metricBddVariableOrder.textContent = "pending";
  if (reliabilitySourceNote) {
    reliabilitySourceNote.textContent =
      "The reliability curve will be derived from the current top-event probability using R(t) = exp(-λt).";
  }
  renderReliabilityChart(null, message);
  renderBddGraph(null);
  clearAnalysisSummary();
}

async function generateBddForCurrentModel() {
  const validationErrors = validateModelForAnalysis();
  if (validationErrors.length > 0) {
    renderBddResults(null);
    statusLine.textContent = `BDD blocked: ${validationErrors[0]}`;
    return false;
  }

  const root = model.nodes[model.rootId];
  if (!root || root.children.length === 0) {
    renderBddResults(null);
    statusLine.textContent = "BDD needs at least one child under the top event.";
    return false;
  }

  statusLine.textContent = "Generating BDD...";
  try {
    const bddAnalysis = await getDrawableBddAnalysis();
    renderBddResults(bddAnalysis.bdd);
    if (!lastBddGraph) {
      throw new Error("BDD analysis completed, but the backend did not return graph data. Restart the Python backend, then run analysis again.");
    }
    statusLine.textContent = bddAnalysis.usedFallback
      ? `BDD generated with infix ordering: ${metricBddNodes.textContent} nodes.`
      : `BDD generated: ${metricBddNodes.textContent} nodes.`;
    return true;
  } catch (error) {
    renderBddResults(null);
    statusLine.textContent = `BDD generation failed: ${error.message}`;
    return false;
  }
}

async function getDrawableBddAnalysis() {
  const preferredOrdering = bddOrderingSelect.value;
  const preferredBdd = await fetchBddAnalysis(preferredOrdering);
  if (preferredBdd?.graph || preferredOrdering === "infix") {
    return {
      bdd: preferredBdd,
      usedFallback: false,
    };
  }

  const infixBdd = await fetchBddAnalysis("infix");
  if (infixBdd?.graph) {
    bddOrderingSelect.value = "infix";
    updateCustomBddOrderVisibility();
    return {
      bdd: infixBdd,
      usedFallback: true,
    };
  }

  return {
    bdd: preferredBdd,
    usedFallback: false,
  };
}

async function fetchBddAnalysis(ordering = bddOrderingSelect.value) {
  const project = modelToProjectJson();
  project.analysis.variableOrdering = ordering;
  if (ordering !== "custom") {
    project.analysis.customVariableOrder = [];
  }

  const response = await fetch(bddApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(project),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.detail || result.error || "BDD analysis failed.");
  }
  return result?.bdd || null;
}

async function runAnalysis() {
  const validationErrors = validateModelForAnalysis();
  if (validationErrors.length > 0) {
    clearAnalysisResults(validationErrors[0]);
    statusLine.textContent = `Analysis blocked: ${validationErrors[0]}`;
    return;
  }

  const root = model.nodes[model.rootId];
  if (!root || root.children.length === 0) {
    clearAnalysisResults("Add gates and basic events to compute cut sets.");
    statusLine.textContent = "Analysis needs at least one child under the top event.";
    return;
  }

  statusLine.textContent = "Sending model to Python backend...";
  const project = modelToProjectJson();
  let backendResult;
  let bddAnalysis;
  const analysisStart = performance.now();
  try {
    const response = await fetch(analysisApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(project),
    });
    backendResult = await response.json();
    if (!response.ok) {
      throw new Error(backendResult.detail || backendResult.error || "Backend analysis failed.");
    }
    bddAnalysis = await getDrawableBddAnalysis();
  } catch (error) {
    clearAnalysisResults(`Python backend is not available: ${error.message}`);
    statusLine.textContent = "Analysis blocked: Python backend is not available.";
    return;
  }
  const analysisDuration = performance.now() - analysisStart;

  const cutSets = backendResult.minimalCutSets || [];
  qualitativeTableBody.innerHTML = "";

  if (cutSets.length === 0) {
    clearAnalysisResults("No cut sets found for the current model.");
    statusLine.textContent = "Backend analysis refreshed.";
    return;
  }

  cutSets.forEach((cutSet) => {
    const eventLabels = cutSet.events || [];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>{ ${eventLabels.map(escapeHtml).join(", ")} }</td>
      <td>${cutSet.order}</td>
      <td><span class="pill ${cutSet.order === 1 ? "risk-high" : "risk-medium"}">${cutSet.order === 1 ? "Critical" : "Redundant"}</span></td>
    `;
    qualitativeTableBody.appendChild(row);
  });

  const approximateTopProbability = cutSets.reduce((total, cutSet) => {
    return total + (cutSet.events || []).reduce((product, label) => product * probabilityForLabel(label), 1);
  }, 0);
  const exactTopProbability = Number(bddAnalysis?.bdd?.exactProbability);
  const topProbability = Number.isFinite(exactTopProbability) ? exactTopProbability : approximateTopProbability;

  lastAnalysisSnapshot = {
    cutSets,
    topProbability: Math.min(topProbability, 1),
    approximateTopProbability: Math.min(approximateTopProbability, 1),
    analysisDuration,
    generatedAt: new Date().toISOString(),
    engine: "Python backend",
  };

  metricMissionTime.textContent = `${formatNumber(getReliabilityMissionTimeHours())} h`;
  metricTopProbability.textContent = formatNumber(Math.min(topProbability, 1));
  metricVariableCount.textContent = String(getLeafEventNodes().length);
  renderBddResults(bddAnalysis?.bdd);
  renderAnalysisSummary(cutSets, topProbability, analysisDuration, bddAnalysis?.bdd);
  updateReliabilityView();
  if (bddAnalysis?.bdd && !bddAnalysis.bdd.graph) {
    statusLine.textContent = `Backend analysis refreshed: ${backendResult.count ?? cutSets.length} minimal cut sets. BDD graph data was not returned; restart the Python backend and run analysis again.`;
    return;
  }

  statusLine.textContent = bddAnalysis?.usedFallback
    ? `Backend analysis refreshed: ${backendResult.count ?? cutSets.length} minimal cut sets. BDD switched to infix ordering for display.`
    : `Backend analysis refreshed: ${backendResult.count ?? cutSets.length} minimal cut sets.`;
}

function clearAnalysisSummary() {
  summaryCutSetCount.textContent = "pending";
  summaryMinOrder.textContent = "pending";
  summarySinglePoints.textContent = "pending";
  summaryLargestOrder.textContent = "pending";
  summaryDominantCutSet.textContent = "pending";
  summaryAnalysisTime.textContent = "pending";
  summaryBasicEvents.textContent = String(getLeafEventNodes().length);
  summaryRepeatedEvents.textContent = formatRepeatedBasicEventSummary();
  summaryAnalysisEngine.textContent = "Python backend";
}

function renderBddResults(bdd) {
  if (!bdd) {
    metricBddOrdering.textContent = bddOrderingSelect.value;
    metricBddNodes.textContent = "pending";
    metricBddVariableOrder.textContent = "pending";
    lastBddGraph = null;
    lastBddAnalysis = null;
    renderBddGraph(null, workspaceBddGraph, { fitToContainer: true, minHeight: 560 });
    return;
  }

  const visibleNonTerminalNodeCount = Array.isArray(bdd.graph?.nodes)
    ? bdd.graph.nodes.filter((node) => node.kind !== "terminal").length
    : bdd.nodeCount;

  metricBddOrdering.textContent = bdd.ordering;
  metricBddNodes.textContent = String(visibleNonTerminalNodeCount);
  metricBddVariableOrder.textContent = (bdd.variableOrder || []).join(" < ") || "none";
  lastBddGraph = bdd.graph || null;
  lastBddAnalysis = bdd;
  renderBddGraph(lastBddGraph, workspaceBddGraph, { fitToContainer: true, minHeight: 560 });
}

function compareBddNodes(left, right) {
  if (left.kind !== right.kind) {
    return left.kind === "terminal" ? 1 : -1;
  }

  return String(left.label).localeCompare(String(right.label));
}

function getBddBranchBias(branch, reverse = false) {
  const bias = branch === "1" ? 96 : -96;
  return reverse ? -bias : bias;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildBddNodeIndex(graph) {
  const nodes = new Map();
  const childrenBySource = new Map();

  graph.nodes.forEach((node) => {
    nodes.set(node.id, node);
    childrenBySource.set(node.id, { 0: null, 1: null });
  });

  graph.edges.forEach((edge) => {
    if (!childrenBySource.has(edge.source)) {
      childrenBySource.set(edge.source, { 0: null, 1: null });
    }
    childrenBySource.get(edge.source)[edge.branch] = edge.target;
  });

  return { nodes, childrenBySource };
}

function computeBddNodePositions(graph, width, levelGap, marginX, options = {}) {
  const { nodes, childrenBySource } = buildBddNodeIndex(graph);
  const positions = new Map();
  const leftX = marginX;
  const rightX = width - marginX;
  const minSeparation = options.minSeparation || Math.max(420, Math.round(width / 7));
  const maxDirectionBias = options.maxDirectionBias || 360;

  function place(nodeId) {
    if (positions.has(nodeId)) {
      return positions.get(nodeId);
    }

    const node = nodes.get(nodeId);
    if (!node) {
      return null;
    }

    if (node.kind === "terminal") {
      const x = node.label === "0" ? leftX : rightX;
      const y = 46 + node.level * levelGap;
      const position = { x, y };
      positions.set(nodeId, position);
      return position;
    }

    const children = childrenBySource.get(nodeId) || { 0: null, 1: null };
    const lowChild = children[0] ? place(children[0]) : null;
    const highChild = children[1] ? place(children[1]) : null;
    const fallbackLow = leftX + (width * 0.15);
    const fallbackHigh = rightX - (width * 0.15);
    const lowX = lowChild?.x ?? fallbackLow;
    const highX = highChild?.x ?? fallbackHigh;
    const midpoint = (lowX + highX) / 2;
    const branchSpread = Math.max(minSeparation, Math.abs(highX - lowX) * 0.75);
    const directionBias = (node.level % 2 === 0 ? -1 : 1) * Math.min(maxDirectionBias, branchSpread * 0.7);
    const x = clamp(midpoint + directionBias, leftX, rightX);
    const y = 46 + node.level * levelGap;
    const position = { x: Math.round(x), y };
    positions.set(nodeId, position);
    return position;
  }

  const root = graph.nodes.find((node) => node.level === 0);
  if (root) {
    place(root.id);
  }

  graph.nodes
    .slice()
    .sort((left, right) => left.level - right.level)
    .forEach((node) => {
      if (!positions.has(node.id)) {
        place(node.id);
      }
    });

  const levelBuckets = new Map();
  positions.forEach((position, nodeId) => {
    const node = nodes.get(nodeId);
    if (!node) {
      return;
    }
    if (!levelBuckets.has(node.level)) {
      levelBuckets.set(node.level, []);
    }
    levelBuckets.get(node.level).push({ id: nodeId, x: position.x, y: position.y });
  });

  [...levelBuckets.values()].forEach((levelNodes) => {
    if (levelNodes.length <= 1) {
      return;
    }

    levelNodes.sort((left, right) => left.x - right.x);
    const currentSpan = levelNodes[levelNodes.length - 1].x - levelNodes[0].x;
    const desiredSpan = Math.max((levelNodes.length - 1) * minSeparation, Math.round((rightX - leftX) * 0.82));
    const targetSpan = Math.max(currentSpan, desiredSpan);
    const center = levelNodes.reduce((sum, node) => sum + node.x, 0) / levelNodes.length;
    const start = clamp(Math.round(center - targetSpan / 2), leftX, Math.max(leftX, rightX - targetSpan));
    const step = levelNodes.length > 1 ? targetSpan / (levelNodes.length - 1) : 0;

    levelNodes.forEach((node, index) => {
      node.x = start + index * step;
    });

    levelNodes.forEach((node) => {
      positions.set(node.id, { x: Math.round(node.x), y: node.y });
    });
  });

  return positions;
}

function shouldUseCompactBddLayout(graph) {
  const decisionNodes = graph.nodes.filter((node) => node.kind !== "terminal");
  const decisionLevels = new Map();
  decisionNodes.forEach((node) => {
    if (!decisionLevels.has(node.level)) {
      decisionLevels.set(node.level, 0);
    }
    decisionLevels.set(node.level, decisionLevels.get(node.level) + 1);
  });
  const widestDecisionLevel = Math.max(1, ...decisionLevels.values());
  return decisionNodes.length <= 8 && widestDecisionLevel <= 3;
}

function computeLayeredDagBddPositions(graph, width, levelGap, marginX) {
  const state = buildBddOrderingState(graph);
  const positions = new Map();
  const leftX = marginX;
  const rightX = width - marginX;
  const levels = new Map();
  const levelNumbers = [...state.levels.keys()].sort((left, right) => left - right);

  levelNumbers.forEach((level) => {
    levels.set(level, [...state.levels.get(level)].sort(compareBddNodes));
  });

  function assignPositions() {
    levelNumbers.forEach((level) => {
      const levelNodes = levels.get(level) || [];
      const y = 46 + level * levelGap;
      const drift = (level % 2 === 0 ? -1 : 1) * Math.min(72, Math.round(width * 0.042));

      if (levelNodes.every((node) => node.kind === "terminal")) {
        levelNodes.forEach((node) => {
          const terminalLabel = String(node.label);
          const baseX = terminalLabel === "0" ? width * 0.28 : terminalLabel === "1" ? width * 0.72 : width / 2;
          const x = clamp(baseX + drift * 0.2, leftX, rightX);
          positions.set(node.id, { x: Math.round(x), y });
        });
        return;
      }

      if (levelNodes.length === 1) {
        positions.set(levelNodes[0].id, { x: Math.round(clamp(width / 2 + drift, leftX, rightX)), y });
        return;
      }

      const spacing = Math.min(230, Math.max(150, Math.round(width / Math.max(4, levelNodes.length + 2))));
      const span = Math.min(rightX - leftX, (levelNodes.length - 1) * spacing);
      const start = clamp(width / 2 + drift - span / 2, leftX, Math.max(leftX, rightX - span));

      levelNodes.forEach((node, index) => {
        const alternatingBias = (index % 2 === 0 ? -1 : 1) * Math.min(30, Math.round(spacing * 0.12));
        const x = clamp(start + index * (span / (levelNodes.length - 1)) + alternatingBias, leftX, rightX);
        positions.set(node.id, { x: Math.round(x), y });
      });
    });
  }

  assignPositions();

  for (let sweep = 0; sweep < 4; sweep += 1) {
    for (let level = 1; level < levelNumbers.length; level += 1) {
      const levelNodes = levels.get(level) || [];
      if (levelNodes.every((node) => node.kind === "terminal")) {
        continue;
      }
      levels.set(level, orderBddLevel(levelNodes, state.incoming, positions, false));
    }
    assignPositions();

    for (let level = levelNumbers.length - 2; level >= 0; level -= 1) {
      const levelNodes = levels.get(level) || [];
      if (levelNodes.every((node) => node.kind === "terminal")) {
        continue;
      }
      levels.set(level, orderBddLevel(levelNodes, state.outgoing, positions, true));
    }
    assignPositions();
  }

  return positions;
}

function buildBddOrderingState(graph) {
  const levels = new Map();
  const incoming = new Map();
  const outgoing = new Map();

  graph.nodes.forEach((node) => {
    if (!levels.has(node.level)) {
      levels.set(node.level, []);
    }
    levels.get(node.level).push(node);
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  });

  graph.edges.forEach((edge) => {
    if (!incoming.has(edge.target) || !outgoing.has(edge.source)) {
      return;
    }
    incoming.get(edge.target).push(edge);
    outgoing.get(edge.source).push(edge);
  });

  [...levels.values()].forEach((nodes) => nodes.sort(compareBddNodes));

  return {
    levels,
    incoming,
    outgoing,
    maxLevel: Math.max(...graph.nodes.map((node) => node.level)),
  };
}

function scoreBddNode(node, references, positions, reverse = false) {
  const refs = references.get(node.id) || [];
  if (refs.length === 0) {
    return positions.get(node.id)?.x ?? 0;
  }

  const sum = refs.reduce((total, edge) => {
    const relatedId = reverse ? edge.target : edge.source;
    const relatedPosition = positions.get(relatedId);
    if (!relatedPosition) {
      return total;
    }
    return total + relatedPosition.x + getBddBranchBias(edge.branch, reverse);
  }, 0);

  return sum / refs.length;
}

function orderBddLevel(nodes, references, positions, reverse = false) {
  return [...nodes].sort((left, right) => {
    const leftScore = scoreBddNode(left, references, positions, reverse);
    const rightScore = scoreBddNode(right, references, positions, reverse);
    if (leftScore === rightScore) {
      return compareBddNodes(left, right);
    }
    return leftScore - rightScore;
  });
}

function renderBddGraph(graph, target = workspaceBddGraph, options = {}) {
  target.innerHTML = "";
  const hasFixedWidth = Number.isFinite(Number(options.width));
  const fitToContainer = options.fitToContainer === true || !hasFixedWidth;
  const minHeight = options.minHeight || 320;

  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    const emptyWidth = hasFixedWidth ? Number(options.width) : 760;
    target.setAttribute("viewBox", `0 0 ${emptyWidth} ${minHeight}`);
    target.setAttribute("width", String(emptyWidth));
    target.setAttribute("height", String(minHeight));
    target.style.width = fitToContainer ? "100%" : `${emptyWidth}px`;
    target.style.height = `${minHeight}px`;
    return;
  }

  const levelGap = 84;
  const parentWidth = Math.round(target.parentElement?.clientWidth || 0);
  const baseWidth = hasFixedWidth ? Number(options.width) : Math.max(760, Math.min(1180, parentWidth || 920));
  const maxLevel = Math.max(...graph.nodes.map((node) => node.level));
  const nodesByLevel = new Map();
  graph.nodes.forEach((node) => {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level).push(node);
  });
  const compactLayout = fitToContainer && shouldUseCompactBddLayout(graph);
  const nodeSpacing = fitToContainer ? 220 : 640;
  const nodeCountSpacing = fitToContainer ? 72 : 120;
  const marginX = fitToContainer ? 110 : 320;
  const maxLevelWidth = Math.max(
    ...[...nodesByLevel.values()].map((levelNodes) => Math.max(1, levelNodes.length) * nodeSpacing)
  );
  const width = compactLayout
    ? baseWidth
    : Math.max(baseWidth, marginX * 2 + maxLevelWidth, marginX * 2 + graph.nodes.length * nodeCountSpacing);
  const height = Math.max(minHeight, (maxLevel + 1) * levelGap + 120);
  const parentVisibleWidth = Math.round(target.parentElement?.clientWidth || 0) || 920;
  const shouldOverflowHorizontally = !compactLayout && width > parentVisibleWidth * 1.08;
  target.setAttribute("viewBox", `0 0 ${width} ${height}`);
  target.setAttribute("width", String(width));
  target.setAttribute("height", String(height));
  target.style.width = fitToContainer && !shouldOverflowHorizontally ? "100%" : `${width}px`;
  target.style.height = `${height}px`;
  target.style.minHeight = `${height}px`;

  const positions = compactLayout
    ? computeLayeredDagBddPositions(graph, width, levelGap, marginX)
    : computeBddNodePositions(graph, width, levelGap, marginX, {
        minSeparation: fitToContainer ? 180 : undefined,
        maxDirectionBias: fitToContainer ? 180 : undefined,
      });

  [...graph.edges]
    .sort((left, right) => {
      if (left.branch === right.branch) {
        return 0;
      }
      return left.branch === "1" ? -1 : 1;
    })
    .forEach((edge) => {
      const start = positions.get(edge.source);
      const end = positions.get(edge.target);
      if (!start || !end) {
        return;
      }
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", start.x);
      line.setAttribute("y1", start.y + 18);
      line.setAttribute("x2", end.x);
      line.setAttribute("y2", end.y - 18);
      line.setAttribute("class", `bdd-edge ${edge.branch === "1" ? "is-high" : "is-low"}`);
      target.appendChild(line);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", Math.round((start.x + end.x) / 2));
      label.setAttribute("y", Math.round((start.y + end.y) / 2) - 4);
      label.setAttribute("class", "bdd-edge-label");
      label.textContent = edge.branch;
      target.appendChild(label);
    });

  graph.nodes.forEach((node) => {
    const position = positions.get(node.id);
    if (!position) {
      return;
    }
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `bdd-node ${node.kind === "terminal" ? "is-terminal" : ""}`);

    const shape = document.createElementNS("http://www.w3.org/2000/svg", node.kind === "terminal" ? "rect" : "circle");
    if (node.kind === "terminal") {
      shape.setAttribute("x", position.x - 24);
      shape.setAttribute("y", position.y - 18);
      shape.setAttribute("width", 48);
      shape.setAttribute("height", 36);
      shape.setAttribute("rx", 8);
    } else {
      shape.setAttribute("cx", position.x);
      shape.setAttribute("cy", position.y);
      shape.setAttribute("r", 24);
    }
    group.appendChild(shape);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", position.x);
    text.setAttribute("y", position.y + 4);
    text.textContent = node.label;
    group.appendChild(text);
    target.appendChild(group);
  });

}

function renderAnalysisSummary(cutSets, topProbability, analysisDuration, bdd) {
  const orders = cutSets.map((cutSet) => cutSet.order || 0).filter((order) => order > 0);
  const singlePointFailures = cutSets.filter((cutSet) => cutSet.order === 1).length;
  const dominant = findDominantCutSet(cutSets);

  summaryCutSetCount.textContent = String(cutSets.length);
  summaryMinOrder.textContent = orders.length > 0 ? String(Math.min(...orders)) : "none";
  summarySinglePoints.textContent = String(singlePointFailures);
  summaryLargestOrder.textContent = orders.length > 0 ? String(Math.max(...orders)) : "none";
  summaryDominantCutSet.textContent = dominant ? `{ ${dominant.events.join(", ")} }` : "none";
  summaryAnalysisTime.textContent = `${Math.max(1, Math.round(analysisDuration))} ms`;
  summaryBasicEvents.textContent = String(getLeafEventNodes().length);
  summaryRepeatedEvents.textContent = formatRepeatedBasicEventSummary();
  summaryAnalysisEngine.textContent = "Python backend";
}

function renderFmeaTable() {
  if (!fmeaTableBody) {
    return;
  }

  const rows = getFmeaRows();
  fmeaTableBody.innerHTML = "";
  updateFmedaSummary();
  renderFmedaResultsTable(rows);
  renderFmedaItemMetricsTable(rows);

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="12">Add your first FMEDA row to begin.</td>';
    fmeaTableBody.appendChild(emptyRow);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.rowId = row.id;

    const componentCell = document.createElement("td");
    componentCell.appendChild(
      createFmedaSuggestionInput(row, "component", "Component Type", getFmedaComponentOptions(), () => {
        applyFmedaLibraryDefaults(row);
        renderFmeaTable();
      })
    );
    tr.appendChild(componentCell);

    const itemCell = document.createElement("td");
    itemCell.appendChild(createFmedaSuggestionInput(row, "itemFunction", "Function", getFmedaFunctionOptions(row)));
    tr.appendChild(itemCell);

    const failureCell = document.createElement("td");
    failureCell.appendChild(
      createFmedaSuggestionInput(row, "failureMode", "Failure Mode", getFmedaFailureModeOptions(row), () => {
        row.faultClassification = suggestFmedaFaultClassification(row);
        renderFmeaTable();
      })
    );
    tr.appendChild(failureCell);

    const fitCell = document.createElement("td");
    fitCell.appendChild(createFmedaFitInput(row));
    tr.appendChild(fitCell);

    const effectCell = document.createElement("td");
    effectCell.appendChild(createFmeaInput(row, "effect", "Effect"));
    tr.appendChild(effectCell);

    const failureCategoryCell = document.createElement("td");
    failureCategoryCell.appendChild(createFmedaFailureCategorySelect(row));
    tr.appendChild(failureCategoryCell);

    const safetyMechanismCell = document.createElement("td");
    safetyMechanismCell.appendChild(
      createFmedaSuggestionInput(row, "safetyMechanism", "Safety Mechanism", getFmedaSafetyMechanismOptions(row), () => {
        row.diagnosticCoveragePercent = suggestFmedaDiagnosticCoveragePercent(row);
        row.faultClassification = suggestFmedaFaultClassification(row);
        renderFmeaTable();
      })
    );
    tr.appendChild(safetyMechanismCell);

    const diagnosticCoverageCell = document.createElement("td");
    diagnosticCoverageCell.appendChild(createFmedaDiagnosticCoverageInput(row));
    tr.appendChild(diagnosticCoverageCell);

    const classificationCell = document.createElement("td");
    classificationCell.appendChild(createFmedaClassificationSelect(row));
    tr.appendChild(classificationCell);

    const latentCell = document.createElement("td");
    latentCell.className = "fmeda-checkbox-cell";
    latentCell.appendChild(createFmedaLatentCheckbox(row));
    tr.appendChild(latentCell);

    const eventCell = document.createElement("td");
    eventCell.appendChild(createFmeaInput(row, "faultTreeEventId", "Basic event id"));
    tr.appendChild(eventCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "fmea-actions";
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "quiet-button danger-button fmea-delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteFmeaRow(row.id));
    actionsCell.appendChild(deleteButton);
    tr.appendChild(actionsCell);

    fmeaTableBody.appendChild(tr);
  });
}

function renderFmedaResultsTable(rows) {
  if (!fmedaResultsTableBody) {
    return;
  }

  fmedaResultsTableBody.innerHTML = "";
  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="15">Generated lambda results will appear here.</td>';
    fmedaResultsTableBody.appendChild(emptyRow);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.resultRowId = row.id;

    const componentCell = document.createElement("td");
    componentCell.dataset.fmedaResultComponentFor = row.id;
    componentCell.textContent = row.component || "-";
    tr.appendChild(componentCell);

    const failureModeCell = document.createElement("td");
    failureModeCell.dataset.fmedaResultFailureModeFor = row.id;
    failureModeCell.textContent = row.failureMode || "-";
    tr.appendChild(failureModeCell);

    ["lambdaSD", "lambdaSU", "lambdaDD", "lambdaDU", "lambdaAnnunciation", "lambdaNoEffect", "lambdaTotal"].forEach((metricKey) => {
      const cell = document.createElement("td");
      const value = document.createElement("span");
      value.className = "fmea-rpn";
      value.dataset.fmedaMetricFor = row.id;
      value.dataset.fmedaMetricKey = metricKey;
      cell.appendChild(value);
      tr.appendChild(cell);
    });

    const diagnosticCoverageCell = document.createElement("td");
    const diagnosticCoverageValue = document.createElement("span");
    diagnosticCoverageValue.className = "fmea-rpn";
    diagnosticCoverageValue.dataset.fmedaMetricFor = row.id;
    diagnosticCoverageValue.dataset.fmedaMetricKey = "diagnosticCoverage";
    diagnosticCoverageCell.appendChild(diagnosticCoverageValue);
    tr.appendChild(diagnosticCoverageCell);

    ["SPF", "RF", "MPF"].forEach((classification) => {
      const cell = document.createElement("td");
      cell.className = "fmeda-classification-mark";
      cell.dataset.fmedaClassificationFor = row.id;
      cell.dataset.fmedaClassification = classification;
      tr.appendChild(cell);
    });

    const latentCell = document.createElement("td");
    latentCell.className = "fmeda-classification-mark";
    latentCell.dataset.fmedaLatentFor = row.id;
    tr.appendChild(latentCell);

    const eventCell = document.createElement("td");
    eventCell.dataset.fmedaResultEventFor = row.id;
    eventCell.textContent = row.faultTreeEventId || "-";
    tr.appendChild(eventCell);

    fmedaResultsTableBody.appendChild(tr);
    updateFmedaMetricCells(row.id);
  });
}

function renderFmedaItemMetricsTable(rows) {
  if (!fmedaItemMetricsTableBody) {
    return;
  }

  fmedaItemMetricsTableBody.innerHTML = "";
  const items = getFmedaItemMetricSummaries(rows);
  if (items.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="10">Item-level metrics will appear after FMEDA rows are added.</td>';
    fmedaItemMetricsTableBody.appendChild(emptyRow);
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement("tr");
    [
      item.component,
      String(item.rowCount),
      formatNumber(item.lambdaTotal),
      formatNumber(item.lambdaSPF),
      formatNumber(item.lambdaRF),
      formatNumber(item.lambdaMPF),
      item.spfm === null ? "N/A" : formatPercent(item.spfm),
      item.lfm === null ? "N/A" : formatPercent(item.lfm),
      formatNumber(item.pmhf),
      item.sff === null ? "N/A" : formatPercent(item.sff),
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      tr.appendChild(cell);
    });
    fmedaItemMetricsTableBody.appendChild(tr);
  });
}

function getFmedaItemMetricSummaries(rows) {
  const byComponent = new Map();
  rows.forEach((row) => {
    const component = row.component || "Unassigned component";
    if (!byComponent.has(component)) {
      byComponent.set(component, {
        component,
        rowCount: 0,
        lambdaTotal: 0,
        lambdaSafe: 0,
        lambdaDangerous: 0,
        lambdaDD: 0,
        lambdaDU: 0,
        lambdaSPF: 0,
        lambdaRF: 0,
        lambdaMPF: 0,
        lambdaLatentMPF: 0,
      });
    }
    const item = byComponent.get(component);
    const metrics = getFmedaMetrics(row);
    item.rowCount += 1;
    item.lambdaTotal += metrics.lambdaTotal;
    item.lambdaSafe += metrics.lambdaSafe;
    item.lambdaDangerous += metrics.lambdaDangerous;
    item.lambdaDD += metrics.lambdaDD;
    item.lambdaDU += metrics.lambdaDU;
    item.lambdaSPF += metrics.lambdaSPF;
    item.lambdaRF += metrics.lambdaRF;
    item.lambdaMPF += metrics.lambdaMPF;
    item.lambdaLatentMPF += metrics.lambdaLatentMPF;
  });

  return [...byComponent.values()].map((item) => {
    const safetyRelated = item.lambdaSafe + item.lambdaDangerous;
    return {
      ...item,
      spfm: item.lambdaTotal > 0 ? 1 - ((item.lambdaSPF + item.lambdaRF) / item.lambdaTotal) : null,
      lfm: item.lambdaMPF > 0 && item.lambdaLatentMPF > 0 ? 1 - (item.lambdaLatentMPF / item.lambdaMPF) : null,
      pmhf: item.lambdaDU,
      sff: safetyRelated > 0 ? (item.lambdaSafe + item.lambdaDD) / safetyRelated : null,
    };
  });
}

function createFmedaSuggestionInput(row, field, placeholder, options, onChange = null) {
  const fragment = document.createDocumentFragment();
  const input = document.createElement("input");
  const datalist = document.createElement("datalist");
  const listId = `${row.id}-${field}-options`.replace(/[^A-Za-z0-9_-]/g, "-");

  input.type = "text";
  input.className = "fmea-field fmeda-library-field";
  input.value = row[field] || "";
  input.placeholder = placeholder;
  input.setAttribute("list", listId);
  datalist.id = listId;

  uniqueValues(options).forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    datalist.appendChild(option);
  });

  input.addEventListener("input", () => {
    row[field] = input.value;
    if (["component", "failureMode", "faultTreeEventId"].includes(field)) {
      updateFmedaResultLabels(row.id);
    }
  });
  input.addEventListener("change", () => {
    row[field] = input.value;
    if (onChange) {
      onChange();
      return;
    }
    updateFmedaResultLabels(row.id);
  });

  fragment.appendChild(input);
  fragment.appendChild(datalist);
  return fragment;
}

function createFmeaInput(row, field, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "fmea-field";
  input.value = row[field] || "";
  input.placeholder = placeholder;
  input.addEventListener("input", () => {
    row[field] = input.value;
    if (["component", "failureMode", "faultTreeEventId"].includes(field)) {
      updateFmedaResultLabels(row.id);
    }
  });
  return input;
}

function createFmeaNumberInput(row, field) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "fmea-field fmea-number";
  input.min = "1";
  input.max = "10";
  input.step = "1";
  input.value = String(row[field] || 1);
  input.addEventListener("input", () => {
    row[field] = normalizeFmeaScore(input.value, row[field] || 1);
    input.value = String(row[field]);
    updateFmeaRpnCell(row.id);
  });
  return input;
}

function createFmedaFitInput(row) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "fmea-field fmeda-lambda";
  input.min = "0";
  input.step = "0.001";
  input.value = String(normalizeFmedaLambda(row.failureRateFit));
  input.addEventListener("input", () => {
    row.failureRateFit = normalizeFmedaLambda(input.value, row.failureRateFit || 0);
    input.value = String(row.failureRateFit);
    updateFmedaDerivedViews(row.id);
  });
  return input;
}

function createFmedaDiagnosticCoverageInput(row) {
  const input = document.createElement("input");
  input.type = "number";
  input.className = "fmea-field fmeda-percent";
  input.min = "0";
  input.max = "100";
  input.step = "0.1";
  input.value = String(normalizeFmedaPercent(row.diagnosticCoveragePercent));
  input.addEventListener("input", () => {
    row.diagnosticCoveragePercent = normalizeFmedaPercent(input.value, row.diagnosticCoveragePercent || 0);
    input.value = String(row.diagnosticCoveragePercent);
    updateFmedaDerivedViews(row.id);
  });
  return input;
}

function createFmedaBooleanSelect(row, field) {
  const select = document.createElement("select");
  select.className = "fmea-field fmeda-select";
  [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ].forEach((optionConfig) => {
    const option = document.createElement("option");
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    select.appendChild(option);
  });
  select.value = normalizeBoolean(row[field], true) ? "true" : "false";
  select.addEventListener("change", () => {
    row[field] = select.value === "true";
    updateFmedaDerivedViews(row.id);
  });
  return select;
}

function createFmedaFailureCategorySelect(row) {
  const select = document.createElement("select");
  select.className = "fmea-field fmeda-select fmeda-category-select";
  [
    { value: "dangerous", label: "Dangerous" },
    { value: "safe", label: "Safe" },
    { value: "annunciation", label: "Annunciation" },
    { value: "no_effect", label: "No Effect" },
  ].forEach((optionConfig) => {
    const option = document.createElement("option");
    option.value = optionConfig.value;
    option.textContent = optionConfig.label;
    select.appendChild(option);
  });
  select.value = normalizeFailureCategory(row.failureCategory, row.dangerous ? "dangerous" : "safe");
  select.addEventListener("change", () => {
    row.failureCategory = normalizeFailureCategory(select.value);
    row.dangerous = row.failureCategory === "dangerous";
    updateFmedaDerivedViews(row.id);
  });
  return select;
}

function createFmedaClassificationSelect(row) {
  const select = document.createElement("select");
  select.className = "fmea-field fmeda-select";
  ["SPF", "RF", "MPF"].forEach((classification) => {
    const option = document.createElement("option");
    option.value = classification;
    option.textContent = classification;
    select.appendChild(option);
  });
  select.value = normalizeFaultClassification(row.faultClassification);
  select.addEventListener("change", () => {
    row.faultClassification = normalizeFaultClassification(select.value);
    updateFmedaDerivedViews(row.id);
  });
  return select;
}

function createFmedaLatentCheckbox(row) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "fmeda-checkbox";
  input.checked = normalizeBoolean(row.latent, false);
  input.addEventListener("change", () => {
    row.latent = input.checked;
    updateFmedaDerivedViews(row.id);
  });
  return input;
}

function updateFmeaRpnCell(rowId) {
  const row = getFmeaRows().find((item) => item.id === rowId);
  const rpnCell = document.querySelector(`[data-fmea-rpn-for="${rowId}"]`);
  if (rpnCell && row) {
    rpnCell.textContent = String(getFmeaRpn(row));
  }
}

function updateFmedaDerivedViews(rowId) {
  updateFmedaMetricCells(rowId);
  updateFmedaSummary();
  renderFmedaItemMetricsTable(getFmeaRows());
}

function updateFmedaMetricCells(rowId) {
  const row = getFmeaRows().find((item) => item.id === rowId);
  if (!row) {
    return;
  }
  const metrics = getFmedaMetrics(row);
  document.querySelectorAll(`[data-fmeda-metric-for="${rowId}"]`).forEach((cell) => {
    const key = cell.dataset.fmedaMetricKey;
    if (key === "diagnosticCoverage") {
      cell.textContent = metrics.lambdaDangerous > 0 ? formatPercent(metrics.diagnosticCoverage) : "N/A";
      return;
    }
    if (key === "lambdaAnnunciation" && metrics.failureCategory !== "annunciation") {
      cell.textContent = "Not classified";
      return;
    }
    if (key === "lambdaNoEffect" && metrics.failureCategory !== "no_effect") {
      cell.textContent = "Not classified";
      return;
    }
    cell.textContent = formatNumber(metrics[key] ?? 0);
  });
  document.querySelectorAll(`[data-fmeda-classification-for="${rowId}"]`).forEach((cell) => {
    cell.textContent = cell.dataset.fmedaClassification === metrics.faultClassification ? "x" : "";
  });
  const latentCell = document.querySelector(`[data-fmeda-latent-for="${rowId}"]`);
  if (latentCell) {
    latentCell.textContent = metrics.latent ? "x" : "";
  }
}

function updateFmedaResultLabels(rowId) {
  const row = getFmeaRows().find((item) => item.id === rowId);
  if (!row) {
    return;
  }
  const componentCell = document.querySelector(`[data-fmeda-result-component-for="${rowId}"]`);
  const failureModeCell = document.querySelector(`[data-fmeda-result-failure-mode-for="${rowId}"]`);
  const eventCell = document.querySelector(`[data-fmeda-result-event-for="${rowId}"]`);
  if (componentCell) {
    componentCell.textContent = row.component || "-";
  }
  if (failureModeCell) {
    failureModeCell.textContent = row.failureMode || "-";
  }
  if (eventCell) {
    eventCell.textContent = row.faultTreeEventId || "-";
  }
}

function updateFmedaSummary() {
  if (!fmedaSummaryValues.length) {
    return;
  }
  const summary = getFmeaRows().reduce(
    (totals, row) => {
      const metrics = getFmedaMetrics(row);
      totals.lambdaSD += metrics.lambdaSD;
      totals.lambdaSU += metrics.lambdaSU;
      totals.lambdaDD += metrics.lambdaDD;
      totals.lambdaDU += metrics.lambdaDU;
      totals.lambdaAnnunciation += metrics.lambdaAnnunciation;
      totals.lambdaNoEffect += metrics.lambdaNoEffect;
      totals.lambdaTotal += metrics.lambdaTotal;
      totals.lambdaSPF += metrics.lambdaSPF;
      totals.lambdaRF += metrics.lambdaRF;
      totals.lambdaMPF += metrics.lambdaMPF;
      totals.lambdaLatentMPF += metrics.lambdaLatentMPF;
      return totals;
    },
    {
      lambdaSD: 0,
      lambdaSU: 0,
      lambdaDD: 0,
      lambdaDU: 0,
      lambdaAnnunciation: 0,
      lambdaNoEffect: 0,
      lambdaTotal: 0,
      lambdaSPF: 0,
      lambdaRF: 0,
      lambdaMPF: 0,
      lambdaLatentMPF: 0,
    }
  );
  const dangerous = summary.lambdaDD + summary.lambdaDU;
  const safetyRelated = summary.lambdaSD + summary.lambdaSU + summary.lambdaDD + summary.lambdaDU;
  summary.dangerousDiagnosticCoverage = dangerous > 0 ? summary.lambdaDD / dangerous : null;
  summary.spfm = "Item level";
  summary.lfm = "Item level";
  summary.pmhf = summary.lambdaDU;
  summary.sff = "Item level";

  fmedaSummaryValues.forEach((value) => {
    const key = value.dataset.fmedaSummary;
    if (["spfm", "lfm", "sff"].includes(key)) {
      value.textContent = "Item level";
      return;
    }
    if (key === "pmhf") {
      value.textContent = "Item level";
      return;
    }
    if (key === "dangerousDiagnosticCoverage") {
      value.textContent = summary[key] === null ? "N/A" : formatPercent(summary[key]);
      return;
    }
    if ((key === "lambdaAnnunciation" || key === "lambdaNoEffect") && (summary[key] ?? 0) <= 0) {
      value.textContent = "Not classified";
      return;
    }
    value.textContent = formatNumber(summary[key] ?? 0);
  });
}

function addFmeaRow() {
  pushUndoSnapshot();
  getFmeaRows().push(createFmeaRow());
  renderFmeaTable();
  statusLine.textContent = "FMEDA row added.";
}

function deleteFmeaRow(rowId) {
  pushUndoSnapshot();
  model.fmeaRows = getFmeaRows().filter((row) => row.id !== rowId);
  renderFmeaTable();
  statusLine.textContent = "FMEDA row deleted.";
}

function sortFmeaRowsByRpn() {
  pushUndoSnapshot();
  model.fmeaRows = [...getFmeaRows()].sort((left, right) => {
    const rightMetrics = getFmedaMetrics(right);
    const leftMetrics = getFmedaMetrics(left);
    const rightScore = rightMetrics.lambdaDU || rightMetrics.lambdaDangerous || rightMetrics.lambdaTotal;
    const leftScore = leftMetrics.lambdaDU || leftMetrics.lambdaDangerous || leftMetrics.lambdaTotal;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return String(left.component || left.itemFunction || left.failureMode || left.id).localeCompare(String(right.component || right.itemFunction || right.failureMode || right.id));
  });
  renderFmeaTable();
  statusLine.textContent = "FMEDA rows sorted by lambdaDU.";
}

function findDominantCutSet(cutSets) {
  return cutSets
    .map((cutSet) => ({
      ...cutSet,
      probability: (cutSet.events || []).reduce((product, label) => product * probabilityForLabel(label), 1),
    }))
    .sort((left, right) => right.probability - left.probability)[0];
}

function getBasicEventNodes() {
  return Object.values(model.nodes).filter((node) => node.kind === "basic_event");
}

function getLeafEventNodes() {
  return Object.values(model.nodes).filter((node) => node.kind === "basic_event" || node.kind === "undeveloped_event");
}

function parseCustomBddOrder() {
  syncCustomBddOrder();
  return [...customBddOrder];
}

function updateCustomBddOrderVisibility() {
  const custom = bddOrderingSelect.value === "custom";
  bddCustomOrderField.classList.toggle("is-disabled", !custom);
  bddCustomOrderField.setAttribute("aria-disabled", custom ? "false" : "true");
  if (bddCustomOrderNote) {
    bddCustomOrderNote.textContent = custom
      ? "Move variables up or down, then run the BDD with this order."
      : "Select custom to activate variable reordering.";
  }
  syncCustomBddOrder();
  renderCustomBddOrderEditor();
  if (custom) {
    queueMicrotask(focusCustomBddOrderEditor);
  }
}

function getRepeatedBasicEventCounts() {
  const counts = new Map();
  getBasicEventNodes().forEach((node) => {
    const key = node.label.trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return new Map([...counts.entries()].filter(([, count]) => count > 1));
}

function getRepeatedBasicEventLabels() {
  return [...getRepeatedBasicEventCounts().keys()];
}

function formatRepeatedBasicEventSummary() {
  const repeatedLabels = getRepeatedBasicEventLabels();
  if (repeatedLabels.length === 0) {
    return "0";
  }
  return `${repeatedLabels.length} (${repeatedLabels.join(", ")})`;
}

function syncRepeatedBasicEventDisplayButton() {
  if (!toggleRepeatedEventsViewButton) {
    return;
  }

  const config = repeatedBasicEventDisplayMode === "highlight"
    ? {
        label: "Hide",
        title: "Remove the repeated basic event border highlight from the diagram",
        pressed: true,
      }
    : {
        label: "Show",
        title: "Highlight repeated basic events on the diagram",
        pressed: false,
      };

  toggleRepeatedEventsViewButton.textContent = config.label;
  toggleRepeatedEventsViewButton.title = config.title;
  toggleRepeatedEventsViewButton.setAttribute("aria-pressed", String(config.pressed));
}

function cycleRepeatedBasicEventDisplayMode() {
  repeatedBasicEventDisplayMode = repeatedBasicEventDisplayMode === "highlight" ? "off" : "highlight";
  syncRepeatedBasicEventDisplayButton();
  renderCanvas();
}

function validateModelForAnalysis() {
  const issues = getModelValidationIssues();
  invalidNodeIds = new Set(issues.map((issue) => issue.nodeId).filter(Boolean));
  renderCanvas();
  renderTreeList();
  return issues.map((issue) => issue.message);
}

function refreshInvalidNodes() {
  invalidNodeIds = new Set(getModelValidationIssues().map((issue) => issue.nodeId).filter(Boolean));
}

function getModelValidationIssues() {
  const errors = [];
  const root = model.nodes[model.rootId];

  if (!root) {
    return [{ nodeId: "", message: "The model has no top event." }];
  }

  if (root.children.length === 0) {
    return [{ nodeId: root.id, message: "Add an AND, OR, or Voting gate below the top event before running analysis." }];
  }

  errors.push(...getRepeatedEventRateIssues());

  visitTree(model.rootId, (node) => {
    if (node.kind !== "gate") {
      return;
    }

    if (node.children.length === 0) {
      errors.push({
        nodeId: node.id,
        message: `${node.label} has no input events. Add at least two inputs before running analysis.`,
      });
      return;
    }

    if (node.children.length === 1) {
      errors.push({
        nodeId: node.id,
        message: `${node.label} has only one input event. Gates need at least two inputs.`,
      });
    }

    if (node.gate === "K_OF_N") {
      const threshold = parseVotingThreshold(node.votingThreshold || 2);
      if (threshold > node.children.length) {
        errors.push({
          nodeId: node.id,
          message: `${node.label} needs at least ${threshold} input events for its voting threshold (k).`,
        });
      }
    }
  });

  return errors;
}

function getRepeatedEventRateIssues() {
  const eventsByLabel = new Map();
  getBasicEventNodes().forEach((node) => {
    const key = node.label.trim();
    if (!eventsByLabel.has(key)) {
      eventsByLabel.set(key, []);
    }
    eventsByLabel.get(key).push(node);
  });

  const issues = [];
  eventsByLabel.forEach((events, label) => {
    if (events.length < 2) {
      return;
    }

    const probabilities = new Set(events.map((event) => String(event.failureRate ?? 0)));
    if (probabilities.size > 1) {
      issues.push({
        nodeId: events[0].id,
        message: `Repeated basic event "${label}" has inconsistent probabilities. Use the same probability or rename one event.`,
      });
    }
  });
  return issues;
}

function probabilityForLabel(label) {
  const event = Object.values(model.nodes).find((node) => (node.kind === "basic_event" || node.kind === "undeveloped_event") && node.label === label);
  return event?.failureRate || 0;
}

function renderAll() {
  if (!model.nodes[selectedNodeId]) {
    selectedNodeId = model.rootId;
  }
  syncCustomBddOrder();
  refreshInvalidNodes();
  renderCanvas();
  renderCustomBddOrderEditor();
  renderFmeaTable();
  renderTreeList();
  selectNode(selectedNodeId);
}

function slugId(label, suffix) {
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "node"}_${suffix}`;
}

function parseFailureRate(value) {
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseStrictFailureRate(value, lineNumber) {
  const parsed = Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Line ${lineNumber}: probability must be a non-negative number.`);
  }
  return parsed;
}

function uniqueItems(items) {
  return [...new Set(items)];
}

function formatNumber(value) {
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
    return value.toExponential(2);
  }
  return value.toPrecision(4);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${formatNumber(value * 100)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFilename(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "fautree-project";
}

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});
childKindSelect.addEventListener("change", () => {
  syncToolButtons();
  syncVotingThresholdControl();
});
nodeKindSelect.addEventListener("change", syncVotingThresholdControl);

document.querySelectorAll("[data-builder-mode]").forEach((button) => {
  button.addEventListener("click", () => setBuilderMode(button.dataset.builderMode));
});

document.querySelectorAll("[data-top-nav]").forEach((button) => {
  button.addEventListener("click", () => openTopNav(button.dataset.topNav));
});

document.querySelectorAll("[data-result-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveResultTab(tab.dataset.resultTab);
  });
});

document.querySelector("#apply-node-properties").addEventListener("click", applyNodeProperties);
document.querySelector("#add-child-node").addEventListener("click", addChildNode);
document.querySelector("#add-sibling-node").addEventListener("click", addSiblingNode);
document.querySelector("#move-node-up").addEventListener("click", () => moveSelectedNode(-1));
document.querySelector("#move-node-down").addEventListener("click", () => moveSelectedNode(1));
document.querySelector("#delete-node").addEventListener("click", deleteSelectedNode);
document.querySelector("#new-project").addEventListener("click", createNewProject);
document.querySelector("#rename-project").addEventListener("click", renameProject);
document.querySelector("#import-project").addEventListener("click", () => importProjectInput.click());
document.querySelector("#export-project").addEventListener("click", exportProject);
addFmeaRowButton?.addEventListener("click", addFmeaRow);
sortFmeaRowsButton?.addEventListener("click", sortFmeaRowsByRpn);
showReliabilityGraphButton.addEventListener("click", openReliabilityModal);
closeReliabilityButton.addEventListener("click", closeReliabilityModal);
toggleReliabilityMaximizeButton?.addEventListener("click", toggleReliabilityModalMaximize);
saveReliabilityGraphButton?.addEventListener("click", () => exportReliabilityGraph());
reliabilityModal.addEventListener("click", (event) => {
  if (event.target === reliabilityModal) {
    closeReliabilityModal();
  }
});
showShortcutsButton.addEventListener("click", openShortcutsModal);
closeShortcutsButton.addEventListener("click", closeShortcutsModal);
shortcutsModal.addEventListener("click", (event) => {
  if (event.target === shortcutsModal) {
    closeShortcutsModal();
  }
});
closeExportButton.addEventListener("click", closeExportModal);
cancelExportButton.addEventListener("click", closeExportModal);
confirmExportButton.addEventListener("click", confirmProjectExport);
exportTargetSelect.addEventListener("change", updateExportFormatOptions);
exportFormatSelect.addEventListener("change", updateExportExtensionPreview);
exportModal.addEventListener("click", (event) => {
  if (event.target === exportModal) {
    closeExportModal();
  }
});
exportFilenameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    confirmProjectExport();
  }
});
importProjectInput.addEventListener("change", (event) => importProjectFile(event.target.files[0]));
document.addEventListener("keydown", handleKeyboardShortcut);
projectTitleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    renameProject();
  }
});
document.querySelector("#apply-text-model").addEventListener("click", applyTextModel);
document.querySelector("#reset-text-model").addEventListener("click", () => {
  textArea.value = emptyTextModel;
  statusLine.textContent = "Boolean expression cleared.";
});
document.querySelector("#run-analysis").addEventListener("click", runAnalysis);
toggleRepeatedEventsViewButton?.addEventListener("click", cycleRepeatedBasicEventDisplayMode);
reliabilityMissionTimeInput?.addEventListener("input", () => {
  if (metricMissionTime) {
    metricMissionTime.textContent = `${formatNumber(getReliabilityMissionTimeHours())} h`;
  }
  updateReliabilityView();
});
reliabilityMissionTimeInput?.addEventListener("change", () => {
  setReliabilityMissionTimeHours(getReliabilityMissionTimeHours(), false);
  updateReliabilityView();
});
toggleBddWorkspaceButton.addEventListener("click", toggleBddWorkspaceView);
bddOrderingSelect.addEventListener("change", () => {
  if (bddOrderingSelect.value === "custom") {
    setActiveResultTab("bdd");
  }
  updateCustomBddOrderVisibility();
  runAnalysis();
});
resultsResizeHandle.addEventListener("pointerdown", startResultsPaneResize);
window.addEventListener("pointermove", updateResultsPaneResize);
window.addEventListener("pointerup", stopResultsPaneResize);
window.addEventListener("pointercancel", stopResultsPaneResize);

setProjectName(projectName);
syncCustomBddOrder();
updateCustomBddOrderVisibility();
syncBddSettingsVisibility();
syncRepeatedBasicEventDisplayButton();
syncToolButtons();
renderFmeaTable();
renderAll();
clearAnalysisResults("Add gates and basic events to compute cut sets.");
statusLine.textContent = "New project created with an empty top event.";
