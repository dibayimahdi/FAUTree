const defaultTextModel = "((A /\\ B) \\/ (C /\\ (D \\/ E) /\\ F))";
const emptyTextModel = "";
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:8000" : "https://api.fautree.com";
const analysisApiUrl = `${API_BASE_URL}/api/analyze/minimal-cut-sets`;
const bddApiUrl = `${API_BASE_URL}/api/analyze/bdd`;

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
let lastAnalysisSnapshot = null;
let resultsPaneResizeState = null;
let customBddOrder = [];

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
const childKindSelect = document.querySelector("#child-kind-select");
const textArea = document.querySelector("#fault-tree-text");
const bddOrderingSelect = document.querySelector("#bdd-ordering-select");
const qualitativeTableBody = document.querySelector("[data-result-panel='qualitative'] tbody");
const metricMissionTime = document.querySelector("#metric-mission-time");
const metricTopProbability = document.querySelector("#metric-top-probability");
const metricVariableCount = document.querySelector("#metric-variable-count");
const metricBddOrdering = document.querySelector("#metric-bdd-ordering");
const metricBddNodes = document.querySelector("#metric-bdd-nodes");
const metricBddVariableOrder = document.querySelector("#metric-bdd-variable-order");
const bddCustomOrderField = document.querySelector("#bdd-custom-order-field");
const bddCustomOrderNote = document.querySelector("#bdd-custom-order-note");
const bddCustomOrderList = document.querySelector("#bdd-custom-order-list");
const bddSettingsPanel = document.querySelector("#bdd-settings-panel");
const resultsPane = document.querySelector(".results-pane");
const workspaceBddGraph = document.querySelector("#workspace-bdd-graph");
const toggleBddWorkspaceButton = document.querySelector("#toggle-bdd-workspace");
const shortcutsModal = document.querySelector("#shortcuts-modal");
const showShortcutsButton = document.querySelector("#show-shortcuts");
const closeShortcutsButton = document.querySelector("#close-shortcuts");
const exportModal = document.querySelector("#export-modal");
const closeExportButton = document.querySelector("#close-export");
const cancelExportButton = document.querySelector("#cancel-export");
const confirmExportButton = document.querySelector("#confirm-export");
const exportFilenameInput = document.querySelector("#export-filename-input");
const exportTypeSelect = document.querySelector("#export-type-select");
const exportExtensionPreview = document.querySelector("#export-extension-preview");
const summaryCutSetCount = document.querySelector("#summary-cut-set-count");
const summaryMinOrder = document.querySelector("#summary-min-order");
const summarySinglePoints = document.querySelector("#summary-single-points");
const summaryLargestOrder = document.querySelector("#summary-largest-order");
const summaryTopProbability = document.querySelector("#summary-top-probability");
const summaryDominantCutSet = document.querySelector("#summary-dominant-cut-set");
const summaryAnalysisTime = document.querySelector("#summary-analysis-time");
const summaryBasicEvents = document.querySelector("#summary-basic-events");
const summaryRepeatedEvents = document.querySelector("#summary-repeated-events");
const summaryAnalysisEngine = document.querySelector("#summary-analysis-engine");
const resultsResizeHandle = document.querySelector("#results-resize-handle");

textArea.value = emptyTextModel;

function setResultsPaneHeight(height) {
  const viewportHeight = window.innerHeight || 0;
  const topbarHeight = 72;
  const minHeight = 160;
  const reservedWorkspaceHeight = 320;
  const maxHeight = Math.max(minHeight, viewportHeight - topbarHeight - reservedWorkspaceHeight);
  const clampedHeight = Math.max(minHeight, Math.min(height, maxHeight));
  appShell?.style.setProperty("--results-pane-height", `${clampedHeight}px`);
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

function createGateSymbol(gate) {
  if (gate === "AND") {
    return `
      <svg class="gate-symbol" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M18 88 L18 45 C18 20 32 8 50 8 C68 8 82 20 82 45 L82 88 Z"></path>
      </svg>
      <span class="sr-only">AND gate</span>
    `;
  }

  return `
    <svg class="gate-symbol" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M14 88 C24 58 26 24 50 8 C74 24 76 58 86 88 C64 78 36 78 14 88 Z"></path>
    </svg>
    <span class="sr-only">OR gate</span>
  `;
}

function nodeKindLabel(node) {
  if (node.kind === "top_event") {
    return "Top event";
  }

  if (node.kind === "gate") {
    return `${node.gate} gate`;
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
    return node.gate === "AND" ? "and_gate" : "or_gate";
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

  if (type === "and_gate" || type === "or_gate") {
    return {
      id,
      kind: "gate",
      gate: type === "and_gate" ? "AND" : "OR",
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
    button.className = `fault-node ${node.kind === "gate" ? "gate-node" : "event-node"} ${node.kind === "top_event" ? "top-event" : ""} ${node.kind === "basic_event" ? "basic-event" : ""} ${node.kind === "undeveloped_event" ? "undeveloped-event" : ""} ${node.kind === "intermediate_event" ? "intermediate-event" : ""} ${node.gate === "AND" ? "and-gate" : ""} ${node.gate === "OR" ? "or-gate" : ""}`;
    button.dataset.nodeId = node.id;
    button.style.left = `${position.x}px`;
    button.style.top = `${position.y}px`;
    button.title = nodeKindLabel(node);
    button.classList.toggle("is-selected", node.id === selectedNodeId);
    button.classList.toggle("is-invalid", invalidNodeIds.has(node.id));

    if (node.kind === "gate") {
      button.innerHTML = createGateSymbol(node.gate);
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
  nodeName.textContent = selected.label;
  nodeType.textContent = nodeKindLabel(selected);
  nodeGate.textContent = selected.gate || "None";
  nodeRate.textContent = selected.failureRate ? formatNumber(selected.failureRate) : "Not assigned";
  statusLine.textContent = `Selected: ${selected.label}`;
  renderCanvas();
  renderTreeList();
}

function setTool(tool) {
  const childKindByTool = {
    basic: "basic_event",
    undeveloped: "undeveloped_event",
    and: "and_gate",
    or: "or_gate",
  };
  const childKind = childKindByTool[tool];
  if (!childKind) {
    return;
  }

  childKindSelect.value = childKind;
  syncToolButtons();
  statusLine.textContent = `Tool: ${tool}`;
}

function syncToolButtons() {
  const toolByChildKind = {
    basic_event: "basic",
    undeveloped_event: "undeveloped",
    and_gate: "and",
    or_gate: "or",
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
  builderTitle.textContent = mode === "textual" ? "Boolean Expression Builder" : "Graphical Fault Tree Builder";
  statusLine.textContent = mode === "textual" ? "Boolean expression builder ready." : "Graphical builder ready";
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
    builderTitle.textContent = activeBuilderMode === "textual" ? "Boolean Expression Builder" : "Graphical Fault Tree Builder";
    statusLine.textContent = "Fault tree view ready.";
    return;
  }

  document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
    panel.classList.remove("is-active");
  });
  document.querySelector("[data-diagram-panel='bdd']").classList.add("is-active");
  builderTitle.textContent = "Binary Decision Diagram";
  renderBddGraph(lastBddGraph, workspaceBddGraph, { width: 760, minHeight: 360 });
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
  }
}

function toggleBddWorkspaceView() {
  if (activeDiagramView !== "bdd" && !lastBddGraph) {
    statusLine.textContent = "Run Analysis first.";
    return;
  }
  setDiagramView(activeDiagramView === "bdd" ? "fault-tree" : "bdd");
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
  } else if (requestedType === "intermediate_event") {
    selected.kind = "intermediate_event";
    delete selected.failureRate;
    delete selected.gate;
  } else {
    selected.kind = "gate";
    selected.gate = requestedType === "and_gate" ? "AND" : "OR";
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

  if ((parent.kind === "top_event" || parent.kind === "intermediate_event") && (type === "basic_event" || type === "undeveloped_event")) {
    statusLine.textContent = "Choose AND or OR to place a gate below this event.";
    return;
  }

  if ((parent.kind === "top_event" || parent.kind === "intermediate_event") && parent.children.length > 0) {
    statusLine.textContent = "This event already has a gate below it. Select that gate to add events.";
    return;
  }

  if (parent.kind === "basic_event" || parent.kind === "undeveloped_event") {
    if (type === "basic_event" || type === "undeveloped_event" || type === "intermediate_event") {
      statusLine.textContent = "Choose AND or OR to refine a basic event.";
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
    statusLine.textContent = `${parent.label} refined with ${model.nodes[gateId].gate} gate.`;
    return;
  }

  const requestedLabel = labelInput.value.trim();
  const label = requestedLabel && requestedLabel !== parent.label ? requestedLabel : defaultLabelForType(type);

  pushUndoSnapshot();
  const id = nextNodeId(type === "and_gate" || type === "or_gate" ? "gate" : "basic_event");
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
  const id = nextNodeId(type === "and_gate" || type === "or_gate" ? "gate" : "basic_event");
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

function openExportModal() {
  exportFilenameInput.value = safeFilename(projectName);
  exportTypeSelect.value = "pdf";
  updateExportExtensionPreview();
  exportModal.hidden = false;
  exportFilenameInput.focus();
}

function closeExportModal() {
  exportModal.hidden = true;
  document.querySelector("#export-project").focus();
}

function updateExportExtensionPreview() {
  const extensionByType = {
    pdf: ".pdf",
    json: ".json",
    sbe: ".sbe",
    "fault-tree-svg": ".svg",
    "fault-tree-png": ".png",
    "bdd-svg": ".svg",
    "bdd-png": ".png",
  };
  exportExtensionPreview.textContent = extensionByType[exportTypeSelect.value] || ".json";
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

function modelToSbe() {
  const root = model.nodes[model.rootId];
  if (!root || root.children.length !== 1 || model.nodes[root.children[0]]?.kind !== "gate") {
    throw new Error("Export SBE needs one AND or OR gate below the top event.");
  }

  const identifiers = createSbeIdentifiers();
  const emittedGates = new Set();
  const gateLines = [];

  function emitGate(nodeId, exportName) {
    const node = model.nodes[nodeId];
    if (!node || node.kind !== "gate" || emittedGates.has(nodeId)) {
      return;
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
  const exportType = exportTypeSelect.value;

  if (exportType === "pdf") {
    await exportPdfReport(filenameBase);
    return;
  }

  if (exportType === "sbe") {
    await exportSbeProject(filenameBase);
    return;
  }

  if (exportType === "fault-tree-svg") {
    await exportFaultTreeSvg(filenameBase);
    return;
  }

  if (exportType === "fault-tree-png") {
    await exportFaultTreePng(filenameBase);
    return;
  }

  if (exportType === "bdd-svg") {
    await exportBddSvg(filenameBase);
    return;
  }

  if (exportType === "bdd-png") {
    await exportBddPng(filenameBase);
    return;
  }

  await exportJsonProject(filenameBase);
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
      label.textContent = node.gate;
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
    card.setAttribute("class", `event-card ${node.kind.replace(/_/g, "-")}`);
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
  renderBddGraph(lastBddGraph, svg, { width: 760, minHeight: 360 });

  const height = Number(svg.getAttribute("viewBox")?.split(" ")[3] || "360");
  svg.setAttribute("width", "760");
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
    width: 760,
    height,
  };
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

function buildPdfReportHtml() {
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
            <div class="meta-card"><strong>Repeated Events</strong><span>${repeatedEvents.length}</span></div>
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

async function exportPdfReport(filenameBase = safeFilename(projectName)) {
  try {
    const report = buildPdfReportHtml();
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
      }
      if (node.kind === "basic_event" || node.kind === "undeveloped_event") {
        payload.probability = node.failureRate ?? 0;
      }
      return payload;
    }),
    edges: buildEdges(),
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
      } else {
        const project = JSON.parse(content);
        loadProjectFromJson(project);
        statusLine.textContent = `Imported: ${projectName}`;
      }
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

function isSbeFile(file, content) {
  return file.name.toLowerCase().endsWith(".sbe") || /^\s*(gate|basic-event)\s+/im.test(content);
}

function loadModelFromSbe(content, filename) {
  const imported = parseSbeModel(content);
  pushUndoSnapshot();
  model = imported;
  selectedNodeId = model.rootId;
  updateNodeSequence();
  setProjectName(filename ? filename.replace(/\.sbe$/i, "") : "Imported XFTA SBE");
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
  model = {
    rootId: topNodes[0].id,
    nodes: importedNodes,
  };
  selectedNodeId = model.rootId;
  updateNodeSequence();
  setProjectName(projectName);
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
    return {
      id: node.id,
      kind: "gate",
      gate: node.gateType === "AND" ? "AND" : "OR",
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
  qualitativeTableBody.innerHTML = `
    <tr>
      <td colspan="3">${escapeHtml(message)}</td>
    </tr>
  `;
  metricMissionTime.textContent = "Rare-event approximation";
  metricTopProbability.textContent = "pending";
  metricVariableCount.textContent = String(getLeafEventNodes().length);
  metricBddOrdering.textContent = bddOrderingSelect.value;
  metricBddNodes.textContent = "pending";
  metricBddVariableOrder.textContent = "pending";
  renderBddGraph(null);
  clearAnalysisSummary();
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
  let bddResult;
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
    const bddResponse = await fetch(bddApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(project),
    });
    bddResult = await bddResponse.json();
    if (!bddResponse.ok) {
      throw new Error(bddResult.detail || bddResult.error || "BDD analysis failed.");
    }
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

  const topProbability = cutSets.reduce((total, cutSet) => {
    return total + (cutSet.events || []).reduce((product, label) => product * probabilityForLabel(label), 1);
  }, 0);

  lastAnalysisSnapshot = {
    cutSets,
    topProbability: Math.min(topProbability, 1),
    analysisDuration,
    generatedAt: new Date().toISOString(),
    engine: "Python backend",
  };

  metricMissionTime.textContent = "Rare-event approximation";
  metricTopProbability.textContent = formatNumber(Math.min(topProbability, 1));
  metricVariableCount.textContent = String(getLeafEventNodes().length);
  renderBddResults(bddResult?.bdd);
  renderAnalysisSummary(cutSets, topProbability, analysisDuration, bddResult?.bdd);
  statusLine.textContent = `Backend analysis refreshed: ${backendResult.count ?? cutSets.length} minimal cut sets.`;
}

function clearAnalysisSummary() {
  summaryCutSetCount.textContent = "pending";
  summaryMinOrder.textContent = "pending";
  summarySinglePoints.textContent = "pending";
  summaryLargestOrder.textContent = "pending";
  summaryTopProbability.textContent = "pending";
  summaryDominantCutSet.textContent = "pending";
  summaryAnalysisTime.textContent = "pending";
  summaryBasicEvents.textContent = String(getLeafEventNodes().length);
  summaryRepeatedEvents.textContent = String(getRepeatedBasicEventLabels().length);
  summaryAnalysisEngine.textContent = "Python backend";
}

function renderBddResults(bdd) {
  if (!bdd) {
    metricBddOrdering.textContent = bddOrderingSelect.value;
    metricBddNodes.textContent = "pending";
    metricBddVariableOrder.textContent = "pending";
    lastBddGraph = null;
    renderBddGraph(null, workspaceBddGraph, { width: 760, minHeight: 360 });
    return;
  }

  const visibleNonTerminalNodeCount = Array.isArray(bdd.graph?.nodes)
    ? bdd.graph.nodes.filter((node) => node.kind !== "terminal").length
    : bdd.nodeCount;

  metricBddOrdering.textContent = bdd.ordering;
  metricBddNodes.textContent = String(visibleNonTerminalNodeCount);
  metricBddVariableOrder.textContent = (bdd.variableOrder || []).join(" < ") || "none";
  lastBddGraph = bdd.graph || null;
  renderBddGraph(lastBddGraph, workspaceBddGraph, { width: 760, minHeight: 360 });
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
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return;
  }

  const ordering = buildBddOrderingState(graph);
  const levelGap = 84;
  const nodeGap = 224;
  const marginX = 84;
  const baseWidth = options.width || 760;
  const minHeight = options.minHeight || 320;
  const maxNodesPerLevel = Math.max(...[...ordering.levels.values()].map((nodes) => nodes.length), 1);
  const width = Math.max(baseWidth, marginX * 2 + Math.max(0, maxNodesPerLevel - 1) * nodeGap + 160);
  const height = Math.max(minHeight, (ordering.maxLevel + 1) * levelGap + 60);
  target.setAttribute("viewBox", `0 0 ${width} ${height}`);
  target.setAttribute("width", String(width));
  target.setAttribute("height", String(height));
  target.style.width = `${width}px`;
  target.style.height = `${height}px`;

  const positions = new Map();
  ordering.levels.forEach((nodes, level) => {
    const levelWidth = Math.max(width - marginX * 2, Math.max(0, nodes.length - 1) * nodeGap);
    const gap = nodes.length > 1 ? levelWidth / (nodes.length - 1) : 0;
    const startX = nodes.length > 1 ? marginX : Math.round(width / 2);
    nodes.forEach((node, index) => {
      const plannedX = nodes.length === 1
        ? scoreBddNode(node, ordering.incoming, positions, false)
        : startX + gap * index;
      positions.set(node.id, {
        x: Math.round(clamp(plannedX, marginX, width - marginX)),
        y: 46 + level * levelGap,
      });
    });
  });

  for (let iteration = 0; iteration < 4; iteration += 1) {
    for (let level = 1; level <= ordering.maxLevel; level += 1) {
      const nodes = ordering.levels.get(level);
      if (!nodes) {
        continue;
      }
      const ordered = orderBddLevel(nodes, ordering.incoming, positions, false);
      const levelWidth = Math.max(width - marginX * 2, Math.max(0, ordered.length - 1) * nodeGap);
      const gap = ordered.length > 1 ? levelWidth / (ordered.length - 1) : 0;
      const startX = ordered.length > 1 ? marginX : Math.round(width / 2);
      ordered.forEach((node, index) => {
        const plannedX = ordered.length === 1
          ? scoreBddNode(node, ordering.incoming, positions, false)
          : startX + gap * index;
        positions.set(node.id, {
          x: Math.round(clamp(plannedX, marginX, width - marginX)),
          y: 46 + level * levelGap,
        });
      });
    }

    for (let level = ordering.maxLevel - 1; level >= 0; level -= 1) {
      const nodes = ordering.levels.get(level);
      if (!nodes) {
        continue;
      }
      const ordered = orderBddLevel(nodes, ordering.outgoing, positions, true);
      const levelWidth = Math.max(width - marginX * 2, Math.max(0, ordered.length - 1) * nodeGap);
      const gap = ordered.length > 1 ? levelWidth / (ordered.length - 1) : 0;
      const startX = ordered.length > 1 ? marginX : Math.round(width / 2);
      ordered.forEach((node, index) => {
        const plannedX = ordered.length === 1
          ? scoreBddNode(node, ordering.outgoing, positions, true)
          : startX + gap * index;
        positions.set(node.id, {
          x: Math.round(clamp(plannedX, marginX, width - marginX)),
          y: 46 + level * levelGap,
        });
      });
    }
  }

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
  summaryTopProbability.textContent = formatNumber(Math.min(topProbability, 1));
  summaryDominantCutSet.textContent = dominant ? `{ ${dominant.events.join(", ")} }` : "none";
  summaryAnalysisTime.textContent = `${Math.max(1, Math.round(analysisDuration))} ms`;
  summaryBasicEvents.textContent = String(getLeafEventNodes().length);
  summaryRepeatedEvents.textContent = String(getRepeatedBasicEventLabels().length);
  summaryAnalysisEngine.textContent = "Python backend";
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

function getRepeatedBasicEventLabels() {
  const counts = new Map();
  getLeafEventNodes().forEach((node) => {
    counts.set(node.label, (counts.get(node.label) || 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([label]) => label);
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
    return [{ nodeId: root.id, message: "Add an AND or OR gate below the top event before running analysis." }];
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
        message: `${node.label} has only one input event. AND/OR gates need at least two inputs.`,
      });
    }
  });

  return errors;
}

function getRepeatedEventRateIssues() {
  const eventsByLabel = new Map();
  getLeafEventNodes().forEach((node) => {
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
childKindSelect.addEventListener("change", syncToolButtons);

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
exportTypeSelect.addEventListener("change", updateExportExtensionPreview);
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
syncToolButtons();
renderAll();
clearAnalysisResults("Add gates and basic events to compute cut sets.");
statusLine.textContent = "New project created with an empty top event.";
