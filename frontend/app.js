const defaultTextModel = `System failure = OR(Power supply failure, Control unit failure, Protection subsystem failure)
Protection subsystem failure = AND(Primary protection failure, Backup protection failure)
Power supply failure = BASIC(2e-6)
Control unit failure = BASIC(3e-6)
Primary protection failure = BASIC(1.5e-6)
Backup protection failure = BASIC(1.5e-6)`;

const emptyTextModel = `Top event = BASIC(0)`;
const analysisApiUrl = "http://localhost:8000/api/analyze/minimal-cut-sets";
const bddApiUrl = "http://localhost:8000/api/analyze/bdd";

let projectName = "Generic Fault Tree Project";
let selectedNodeId = "top";
let activeBuilderMode = "graphical";
let activeDiagramView = "fault-tree";
let nodeSequence = 10;
let model = createSampleModel();
let invalidNodeIds = new Set();
let undoStack = [];
let redoStack = [];
let lastBddGraph = null;

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
const bddCustomOrderInput = document.querySelector("#bdd-custom-order-input");
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
const summaryBddNodes = document.querySelector("#summary-bdd-nodes");

textArea.value = defaultTextModel;

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

function layoutTree() {
  const leafCount = computeLeafCount(model.rootId);
  const maxDepth = computeDepth(model.rootId);
  const stageWidth = Math.max(760, leafCount * 210);
  const stageHeight = Math.max(560, 120 + maxDepth * 130);
  const positions = {};

  faultStage.style.width = `${stageWidth}px`;
  faultStage.style.height = `${stageHeight}px`;
  faultLines.setAttribute("viewBox", `0 0 ${stageWidth} ${stageHeight}`);

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
  return positions;
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
  builderTitle.textContent = mode === "textual" ? "Textual Fault Tree Builder" : "Graphical Fault Tree Builder";
  statusLine.textContent = mode === "textual" ? "Textual builder ready" : "Graphical builder ready";
}

function setDiagramView(view) {
  activeDiagramView = view;
  syncDiagramButtons();

  if (view === "fault-tree") {
    document.querySelector("[data-diagram-panel='bdd']").classList.remove("is-active");
    document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.builderPanel === activeBuilderMode);
    });
    builderTitle.textContent = activeBuilderMode === "textual" ? "Textual Fault Tree Builder" : "Graphical Fault Tree Builder";
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
  toggleBddWorkspaceButton.textContent = activeDiagramView === "bdd" ? "Show Fault Tree" : "Show BDD";
}

function toggleBddWorkspaceView() {
  setDiagramView(activeDiagramView === "bdd" ? "fault-tree" : "bdd");
}

function setProjectName(name) {
  projectName = name.trim() || "Untitled Fault Tree";
  projectNameDisplay.textContent = projectName;
  projectTitleInput.value = projectName;
  document.title = `${projectName} - FAUTree`;
}

function createHistorySnapshot() {
  return {
    model: JSON.parse(JSON.stringify(model)),
    selectedNodeId,
    projectName,
    nodeSequence,
    bddOrdering: bddOrderingSelect.value,
    bddCustomOrder: bddCustomOrderInput.value,
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
  bddCustomOrderInput.value = snapshot.bddCustomOrder || "";
  setProjectName(projectName);
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
  exportTypeSelect.value = "json";
  updateExportExtensionPreview();
  exportModal.hidden = false;
  exportFilenameInput.focus();
}

function closeExportModal() {
  exportModal.hidden = true;
  document.querySelector("#export-project").focus();
}

function updateExportExtensionPreview() {
  exportExtensionPreview.textContent = exportTypeSelect.value === "sbe" ? ".sbe" : ".json";
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
  const lines = textArea.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("Text model is empty.");
  }

  const seenLabels = new Set();
  const definitions = lines.map((line, index) => {
    const parts = line.split("=");
    if (parts.length !== 2) {
      throw new Error(`Line ${index + 1}: use "Event = OR(...)", "Event = A ^ B", "Event = BASIC(probability)", or "Event = UNDEVELOPED(probability)".`);
    }
    const label = parts[0].trim();
    if (!label) {
      throw new Error(`Line ${index + 1}: event label is missing.`);
    }
    if (seenLabels.has(label)) {
      throw new Error(`Line ${index + 1}: duplicate definition for "${label}".`);
    }
    seenLabels.add(label);
    return {
      label,
      expression: parseExpression(parts[1].trim(), index + 1),
    };
  });

  const labelToId = new Map();
  const newModel = { rootId: "top", nodes: {} };

  function ensureNode(label) {
    if (!labelToId.has(label)) {
      const id = labelToId.size === 0 ? "top" : slugId(label, labelToId.size);
      labelToId.set(label, id);
      newModel.nodes[id] = {
        id,
        kind: "basic_event",
        label,
        failureRate: 0.000003,
        children: [],
      };
    }
    return labelToId.get(label);
  }

  definitions.forEach((definition) => ensureNode(definition.label));

  definitions.forEach((definition, index) => {
    const nodeId = ensureNode(definition.label);
    const node = newModel.nodes[nodeId];

    if (index === 0) {
      node.kind = "top_event";
      node.children = [];
      delete node.failureRate;
      delete node.gate;

      if (definition.expression.type === "gate") {
        const gateId = "root_gate";
        newModel.nodes[gateId] = {
          id: gateId,
          kind: "gate",
          gate: definition.expression.gate,
          label: `${definition.expression.gate} gate`,
          children: definition.expression.children.map((childLabel) => ensureNode(childLabel)),
        };
        node.children = [gateId];
      } else {
        node.children = [];
      }
      return;
    }

    if (definition.expression.type === "gate") {
      node.kind = "gate";
      node.gate = definition.expression.gate;
      node.children = definition.expression.children.map((childLabel) => ensureNode(childLabel));
      delete node.failureRate;
      return;
    }

    node.kind = definition.expression.type === "undeveloped" ? "undeveloped_event" : "basic_event";
    node.children = [];
    node.failureRate = definition.expression.failureRate;
    delete node.gate;
  });

  return newModel;
}

function parseExpression(expression, lineNumber) {
  const gateMatch = expression.match(/^(AND|OR)\((.*)\)$/i);
  if (gateMatch) {
    const children = gateMatch[2]
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);

    return {
      type: "gate",
      gate: gateMatch[1].toUpperCase(),
      children,
    };
  }

  const basicMatch = expression.match(/^BASIC\((.*)\)$/i);
  if (basicMatch) {
    return {
      type: "basic",
      failureRate: parseStrictFailureRate(basicMatch[1], lineNumber),
    };
  }

  const undevelopedMatch = expression.match(/^UNDEVELOPED\((.*)\)$/i);
  if (undevelopedMatch) {
    return {
      type: "undeveloped",
      failureRate: parseStrictFailureRate(undevelopedMatch[1], lineNumber),
    };
  }

  const infixAnd = splitInfixExpression(expression, "^");
  if (infixAnd.length > 1) {
    return {
      type: "gate",
      gate: "AND",
      children: infixAnd,
    };
  }

  const infixOr = splitInfixExpression(expression, "|");
  if (infixOr.length > 1) {
    return {
      type: "gate",
      gate: "OR",
      children: infixOr,
    };
  }

  throw new Error(`Line ${lineNumber}: expression must be AND(...), OR(...), A ^ B, A | B, BASIC(probability), or UNDEVELOPED(probability).`);
}

function splitInfixExpression(expression, operator) {
  return expression
    .split(operator)
    .map((label) => label.trim())
    .filter(Boolean);
}

function applyTextModel() {
  try {
    const parsedModel = parseTextModel();
    pushUndoSnapshot();
    model = parsedModel;
    selectedNodeId = model.rootId;
    updateNodeSequence();
    renderAll();
    runAnalysis();
    setBuilderMode("graphical");
    statusLine.textContent = "Text model applied.";
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
    return `${root?.label || "Top event"} = BASIC(0)`;
  }

  const lines = [];
  const rootExpression = serializeChildrenAsGate(root);
  const inlineGateIds = findInlineGateIds();
  lines.push(`${root.label} = ${rootExpression}`);

  visitTree(model.rootId, (node) => {
    if (node.kind === "top_event" || inlineGateIds.has(node.id)) {
      return;
    }
    if (node.kind === "intermediate_event") {
      lines.push(`${node.label} = ${serializeChildrenAsGate(node)}`);
      return;
    }
    if (node.kind === "gate") {
      lines.push(`${node.label} = ${node.gate}(${node.children.map((childId) => model.nodes[childId]?.label).filter(Boolean).join(", ")})`);
      return;
    }
    if (node.kind === "undeveloped_event") {
      lines.push(`${node.label} = UNDEVELOPED(${node.failureRate ?? 0})`);
      return;
    }
    lines.push(`${node.label} = BASIC(${node.failureRate ?? 0})`);
  });

  return uniqueItems(lines).join("\n");
}

function findInlineGateIds() {
  return new Set(
    Object.values(model.nodes)
      .filter((node) => (node.kind === "top_event" || node.kind === "intermediate_event") && node.children.length === 1 && model.nodes[node.children[0]]?.kind === "gate")
      .map((node) => node.children[0])
  );
}

function serializeChildrenAsGate(node) {
  if (node.children.length === 1) {
    const child = model.nodes[node.children[0]];
    if (child?.kind === "gate") {
      return `${child.gate}(${child.children.map((childId) => model.nodes[childId]?.label).filter(Boolean).join(", ")})`;
    }
  }

  return `OR(${node.children.map((childId) => model.nodes[childId]?.label).filter(Boolean).join(", ")})`;
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

  if (exportType === "sbe") {
    await exportSbeProject(filenameBase);
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
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function modelToProjectJson() {
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
  runAnalysis();
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
  bddOrderingSelect.value = ["topological", "alphabetical", "infix", "custom"].includes(project.analysis?.variableOrdering)
    ? project.analysis.variableOrdering
    : "topological";
  bddCustomOrderInput.value = (project.analysis?.customVariableOrder || []).join(", ");
  updateCustomBddOrderVisibility();
  syncTextFromGraph();
  setBuilderMode("graphical");
  renderAll();
  runAnalysis();
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
  summaryBddNodes.textContent = "pending";
}

function renderBddResults(bdd) {
  if (!bdd) {
    metricBddOrdering.textContent = bddOrderingSelect.value;
    metricBddNodes.textContent = "pending";
    metricBddVariableOrder.textContent = "pending";
    summaryBddNodes.textContent = "pending";
    lastBddGraph = null;
    renderBddGraph(null, workspaceBddGraph, { width: 760, minHeight: 360 });
    return;
  }

  metricBddOrdering.textContent = bdd.ordering;
  metricBddNodes.textContent = String(bdd.nodeCount);
  metricBddVariableOrder.textContent = (bdd.variableOrder || []).join(" < ") || "none";
  summaryBddNodes.textContent = String(bdd.nodeCount);
  lastBddGraph = bdd.graph || null;
  renderBddGraph(lastBddGraph, workspaceBddGraph, { width: 760, minHeight: 360 });
}

function renderBddGraph(graph, target = workspaceBddGraph, options = {}) {
  target.innerHTML = "";
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return;
  }

  const width = options.width || 760;
  const minHeight = options.minHeight || 320;
  const height = Math.max(minHeight, (Math.max(...graph.nodes.map((node) => node.level)) + 1) * 92);
  target.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const levels = new Map();
  graph.nodes.forEach((node) => {
    if (!levels.has(node.level)) {
      levels.set(node.level, []);
    }
    levels.get(node.level).push(node);
  });

  const positions = new Map();
  [...levels.entries()].forEach(([level, nodes]) => {
    const gap = width / (nodes.length + 1);
    nodes.forEach((node, index) => {
      positions.set(node.id, {
        x: Math.round(gap * (index + 1)),
        y: 46 + level * 84,
      });
    });
  });

  graph.edges.forEach((edge) => {
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
  summaryBddNodes.textContent = bdd ? String(bdd.nodeCount) : "pending";
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
  return bddCustomOrderInput.value
    .split(/[\n,]+/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function updateCustomBddOrderVisibility() {
  const custom = bddOrderingSelect.value === "custom";
  bddCustomOrderField.hidden = !custom;
  if (custom && !bddCustomOrderInput.value.trim()) {
    bddCustomOrderInput.value = getLeafEventNodes().map((node) => node.label).join(", ");
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
  refreshInvalidNodes();
  renderCanvas();
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

document.querySelectorAll("[data-result-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const panelName = tab.dataset.resultTab;

    document.querySelectorAll("[data-result-tab]").forEach((item) => {
      item.classList.toggle("is-active", item === tab);
    });

    document.querySelectorAll("[data-result-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.resultPanel === panelName);
    });
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
document.querySelector("#sync-text-model").addEventListener("click", () => {
  syncTextFromGraph();
  statusLine.textContent = "Text model synchronized from graph.";
});
document.querySelector("#reset-text-model").addEventListener("click", () => {
  textArea.value = defaultTextModel;
  statusLine.textContent = "Text model reset.";
});
document.querySelector("#run-analysis").addEventListener("click", runAnalysis);
toggleBddWorkspaceButton.addEventListener("click", toggleBddWorkspaceView);
bddOrderingSelect.addEventListener("change", () => {
  updateCustomBddOrderVisibility();
  runAnalysis();
});
bddCustomOrderInput.addEventListener("change", runAnalysis);

setProjectName(projectName);
updateCustomBddOrderVisibility();
syncToolButtons();
renderAll();
runAnalysis();
