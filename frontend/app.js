const defaultTextModel = `System failure = OR(Power supply failure, Control unit failure, Protection subsystem failure)
Protection subsystem failure = AND(Primary protection failure, Backup protection failure)
Power supply failure = BASIC(2e-6)
Control unit failure = BASIC(3e-6)
Primary protection failure = BASIC(1.5e-6)
Backup protection failure = BASIC(1.5e-6)`;

let selectedNodeId = "top";
let selectedTool = "select";
let activeBuilderMode = "graphical";
let nodeSequence = 10;

let model = {
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

const graphLayer = document.querySelector("#graph-layer");
const faultLines = document.querySelector("#fault-lines");
const faultStage = document.querySelector("#fault-stage");
const treeList = document.querySelector("#tree-list");
const nodeName = document.querySelector("#node-name");
const nodeType = document.querySelector("#node-type");
const nodeGate = document.querySelector("#node-gate");
const nodeRate = document.querySelector("#node-rate");
const statusLine = document.querySelector("#status-line");
const builderTitle = document.querySelector("#builder-title");
const labelInput = document.querySelector("#node-label-input");
const rateInput = document.querySelector("#node-rate-input");
const textArea = document.querySelector("#fault-tree-text");
const missionTimeInput = document.querySelector("#mission-time-input");
const qualitativeTableBody = document.querySelector("[data-result-panel='qualitative'] tbody");
const metricMissionTime = document.querySelector("#metric-mission-time");
const metricTopProbability = document.querySelector("#metric-top-probability");
const metricVariableCount = document.querySelector("#metric-variable-count");

textArea.value = defaultTextModel;

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

  return "Basic event";
}

function getNodeSize(node) {
  if (node.kind === "top_event") {
    return { width: 220, height: 74 };
  }

  if (node.kind === "gate") {
    return { width: 82, height: 92 };
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
    button.className = `fault-node ${node.kind === "gate" ? "gate-node" : "event-node"} ${node.kind === "top_event" ? "top-event" : ""} ${node.kind === "basic_event" ? "basic-event" : ""} ${node.gate === "AND" ? "and-gate" : ""} ${node.gate === "OR" ? "or-gate" : ""}`;
    button.dataset.nodeId = node.id;
    button.style.left = `${position.x}px`;
    button.style.top = `${position.y}px`;
    button.title = nodeKindLabel(node);
    button.classList.toggle("is-selected", node.id === selectedNodeId);

    if (node.kind === "gate") {
      button.innerHTML = createGateSymbol(node.gate);
    } else {
      const rate = node.failureRate ? `<small>lambda ${formatNumber(node.failureRate)} / h</small>` : "";
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

  selectedNodeId = nodeId;
  labelInput.value = selected.label;
  rateInput.value = selected.failureRate ? String(selected.failureRate) : "3e-6";
  nodeName.textContent = selected.label;
  nodeType.textContent = nodeKindLabel(selected);
  nodeGate.textContent = selected.gate || "None";
  nodeRate.textContent = selected.failureRate ? `${formatNumber(selected.failureRate)} / h` : "Not assigned";
  statusLine.textContent = `Selected: ${selected.label}`;
  renderCanvas();
  renderTreeList();
}

function setTool(tool) {
  selectedTool = tool;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });
  statusLine.textContent = `Tool: ${tool}`;
}

function setBuilderMode(mode) {
  activeBuilderMode = mode;
  document.querySelectorAll("[data-builder-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.builderMode === mode);
  });
  document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.builderPanel === mode);
  });
  builderTitle.textContent = mode === "textual" ? "Textual Fault Tree Builder" : "Graphical Fault Tree Builder";
  statusLine.textContent = mode === "textual" ? "Textual builder ready" : "Graphical builder ready";
}

function addChildNode() {
  const parent = model.nodes[selectedNodeId];
  let label = labelInput.value.trim() || defaultLabelForTool();
  const rate = parseFailureRate(rateInput.value);

  if (!parent) {
    return;
  }

  if (parent.kind === "basic_event") {
    statusLine.textContent = "Select a top event or gate before adding a child.";
    return;
  }

  if (label === parent.label) {
    label = defaultLabelForTool();
  }

  const kind = selectedTool === "and" || selectedTool === "or" ? "gate" : "basic_event";
  const gate = selectedTool === "and" ? "AND" : selectedTool === "or" ? "OR" : undefined;
  const id = nextNodeId(kind);

  model.nodes[id] = {
    id,
    kind,
    gate,
    label,
    failureRate: kind === "basic_event" ? rate : undefined,
    children: [],
  };

  parent.children.push(id);
  selectNode(id);
}

function defaultLabelForTool() {
  if (selectedTool === "and") {
    return "New AND gate";
  }
  if (selectedTool === "or") {
    return "New OR gate";
  }
  return "New basic event";
}

function renameSelectedNode() {
  const selected = model.nodes[selectedNodeId];
  const label = labelInput.value.trim();
  const rate = parseFailureRate(rateInput.value);

  if (!selected || !label) {
    return;
  }

  selected.label = label;
  if (selected.kind === "basic_event") {
    selected.failureRate = rate;
  }
  selectNode(selected.id);
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

function parseTextModel() {
  const lines = textArea.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error("Text model is empty.");
  }

  const definitions = lines.map((line) => {
    const parts = line.split("=");
    if (parts.length !== 2) {
      throw new Error(`Invalid line: ${line}`);
    }
    return {
      label: parts[0].trim(),
      expression: parseExpression(parts[1].trim(), line),
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

    node.kind = "basic_event";
    node.children = [];
    node.failureRate = definition.expression.failureRate;
    delete node.gate;
  });

  return newModel;
}

function parseExpression(expression, sourceLine) {
  const gateMatch = expression.match(/^(AND|OR)\((.*)\)$/i);
  if (gateMatch) {
    return {
      type: "gate",
      gate: gateMatch[1].toUpperCase(),
      children: gateMatch[2]
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    };
  }

  const basicMatch = expression.match(/^BASIC\((.*)\)$/i);
  if (basicMatch) {
    return {
      type: "basic",
      failureRate: parseFailureRate(basicMatch[1]),
    };
  }

  throw new Error(`Invalid expression: ${sourceLine}`);
}

function applyTextModel() {
  try {
    model = parseTextModel();
    selectedNodeId = model.rootId;
    renderAll();
    runAnalysis();
    setBuilderMode("graphical");
    statusLine.textContent = "Text model applied.";
  } catch (error) {
    statusLine.textContent = error.message;
  }
}

function computeCutSets(nodeId) {
  const node = model.nodes[nodeId];
  if (!node) {
    return [];
  }

  if (node.kind === "basic_event" || node.children.length === 0) {
    return [[node.label]];
  }

  const childSets = node.children.map((childId) => computeCutSets(childId));
  if (node.kind === "top_event" || node.gate === "OR") {
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

function runAnalysis() {
  const cutSets = minimizeCutSets(computeCutSets(model.rootId));
  const missionTime = Number(missionTimeInput.value) || 0;
  qualitativeTableBody.innerHTML = "";

  cutSets.forEach((cutSet) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>{ ${cutSet.map(escapeHtml).join(", ")} }</td>
      <td>${cutSet.length}</td>
      <td><span class="pill ${cutSet.length === 1 ? "risk-high" : "risk-medium"}">${cutSet.length === 1 ? "Critical" : "Redundant"}</span></td>
    `;
    qualitativeTableBody.appendChild(row);
  });

  const topProbability = cutSets.reduce((total, cutSet) => {
    return total + cutSet.reduce((product, label) => product * probabilityForLabel(label, missionTime), 1);
  }, 0);

  metricMissionTime.textContent = `${missionTime} h`;
  metricTopProbability.textContent = formatNumber(Math.min(topProbability, 1));
  metricVariableCount.textContent = String(Object.values(model.nodes).filter((node) => node.kind === "basic_event").length);
  statusLine.textContent = "Analysis refreshed.";
}

function probabilityForLabel(label, missionTime) {
  const event = Object.values(model.nodes).find((node) => node.kind === "basic_event" && node.label === label);
  const rate = event?.failureRate || 0;
  return 1 - Math.exp(-rate * missionTime);
}

function renderAll() {
  if (!model.nodes[selectedNodeId]) {
    selectedNodeId = model.rootId;
  }
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

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

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

document.querySelector("#add-child-node").addEventListener("click", addChildNode);
document.querySelector("#rename-node").addEventListener("click", renameSelectedNode);
document.querySelector("#delete-node").addEventListener("click", deleteSelectedNode);
document.querySelector("#apply-text-model").addEventListener("click", applyTextModel);
document.querySelector("#reset-text-model").addEventListener("click", () => {
  textArea.value = defaultTextModel;
  statusLine.textContent = "Text model reset.";
});
document.querySelector("#run-analysis").addEventListener("click", runAnalysis);

renderAll();
runAnalysis();
