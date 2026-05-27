const defaultTextModel = `System failure = OR(Power supply failure, Control unit failure, Protection subsystem failure)
Protection subsystem failure = AND(Primary protection failure, Backup protection failure)
Power supply failure = BASIC(2e-6)
Control unit failure = BASIC(3e-6)
Primary protection failure = BASIC(1.5e-6)
Backup protection failure = BASIC(1.5e-6)`;

const emptyTextModel = `Top event = BASIC(0)`;

let projectName = "Generic Fault Tree Project";
let selectedNodeId = "top";
let selectedTool = "select";
let activeBuilderMode = "graphical";
let nodeSequence = 10;
let model = createSampleModel();

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
const missionTimeInput = document.querySelector("#mission-time-input");
const timeUnitSelect = document.querySelector("#time-unit-select");
const bddOrderingSelect = document.querySelector("#bdd-ordering-select");
const qualitativeTableBody = document.querySelector("[data-result-panel='qualitative'] tbody");
const metricMissionTime = document.querySelector("#metric-mission-time");
const metricTopProbability = document.querySelector("#metric-top-probability");
const metricVariableCount = document.querySelector("#metric-variable-count");

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

  return "Basic event";
}

function nodeKindValue(node) {
  if (node.kind === "gate") {
    return node.gate === "AND" ? "and_gate" : "or_gate";
  }
  if (node.kind === "intermediate_event") {
    return "intermediate_event";
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
    button.className = `fault-node ${node.kind === "gate" ? "gate-node" : "event-node"} ${node.kind === "top_event" ? "top-event" : ""} ${node.kind === "basic_event" ? "basic-event" : ""} ${node.kind === "intermediate_event" ? "intermediate-event" : ""} ${node.gate === "AND" ? "and-gate" : ""} ${node.gate === "OR" ? "or-gate" : ""}`;
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
  nodeKindSelect.value = nodeKindValue(selected);
  nodeKindSelect.disabled = selected.kind === "top_event";
  rateInput.value = selected.failureRate ? String(selected.failureRate) : "3e-6";
  rateInput.disabled = false;
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
  if (tool === "basic") {
    childKindSelect.value = "basic_event";
  }
  if (tool === "and") {
    childKindSelect.value = "and_gate";
  }
  if (tool === "or") {
    childKindSelect.value = "or_gate";
  }
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });
  statusLine.textContent = `Tool: ${tool}`;
}

function setBuilderMode(mode) {
  activeBuilderMode = mode;
  if (mode === "textual") {
    syncTextFromGraph();
  }
  document.querySelectorAll("[data-builder-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.builderMode === mode);
  });
  document.querySelectorAll("[data-builder-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.builderPanel === mode);
  });
  builderTitle.textContent = mode === "textual" ? "Textual Fault Tree Builder" : "Graphical Fault Tree Builder";
  statusLine.textContent = mode === "textual" ? "Textual builder ready" : "Graphical builder ready";
}

function setProjectName(name) {
  projectName = name.trim() || "Untitled Fault Tree";
  projectNameDisplay.textContent = projectName;
  projectTitleInput.value = projectName;
  document.title = `${projectName} - FAUTree`;
}

function createNewProject() {
  model = createEmptyModel();
  selectedNodeId = model.rootId;
  nodeSequence = 0;
  textArea.value = emptyTextModel;
  setProjectName("Untitled Fault Tree");
  setTool("select");
  setBuilderMode("graphical");
  renderAll();
  clearAnalysisResults("Add gates and basic events to compute cut sets.");
  statusLine.textContent = "New project created with an empty top event.";
}

function renameProject() {
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

  selected.label = label;

  if (selected.kind === "top_event") {
    syncTextFromGraph();
    selectNode(selected.id);
    statusLine.textContent = "Top event updated.";
    return;
  }

  const requestedType = nodeKindSelect.value;

  if (requestedType === "basic_event" && selected.children.length > 0) {
    statusLine.textContent = "Delete child nodes before converting this node to a basic event.";
    selectNode(selected.id);
    return;
  }

  if (requestedType === "basic_event") {
    selected.kind = "basic_event";
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
  const type = selectedTool === "and" ? "and_gate" : selectedTool === "or" ? "or_gate" : selectedTool === "basic" ? "basic_event" : "";
  const rate = parseFailureRate(rateInput.value);

  if (!parent) {
    return;
  }

  if (!type) {
    if (parent.kind === "top_event" || parent.kind === "intermediate_event") {
      statusLine.textContent = "Choose AND or OR before adding a child.";
      return;
    }
    statusLine.textContent = "Choose BE, AND, or OR before adding a child.";
    return;
  }

  if ((parent.kind === "top_event" || parent.kind === "intermediate_event") && type === "basic_event") {
    statusLine.textContent = "Choose AND or OR to place a gate below this event.";
    return;
  }

  if ((parent.kind === "top_event" || parent.kind === "intermediate_event") && parent.children.length > 0) {
    statusLine.textContent = "This event already has a gate below it. Select that gate to add events.";
    return;
  }

  if (parent.kind === "basic_event") {
    if (type === "basic_event" || type === "intermediate_event") {
      statusLine.textContent = "Choose AND or OR to refine a basic event.";
      return;
    }

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

  const id = nextNodeId(type === "and_gate" || type === "or_gate" ? "gate" : "basic_event");
  const requestedLabel = labelInput.value.trim();
  const label = requestedLabel && requestedLabel !== parent.label ? requestedLabel : defaultLabelForType(type);

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
  const id = nextNodeId(type === "and_gate" || type === "or_gate" ? "gate" : "basic_event");
  const selected = model.nodes[selectedNodeId];
  const requestedLabel = labelInput.value.trim();
  const label = requestedLabel && requestedLabel !== selected?.label ? requestedLabel : defaultLabelForType(type);
  const selectedIndex = parent.children.indexOf(selectedNodeId);

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

  [parent.children[currentIndex], parent.children[nextIndex]] = [parent.children[nextIndex], parent.children[currentIndex]];
  syncTextFromGraph();
  selectNode(selectedNodeId);
  statusLine.textContent = direction < 0 ? "Node moved left." : "Node moved right.";
}

function renameSelectedNode() {
  applyNodeProperties();
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
      throw new Error(`Line ${index + 1}: use "Event = OR(...)", "Event = A ^ B", or "Event = BASIC(rate)".`);
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

    node.kind = "basic_event";
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

  throw new Error(`Line ${lineNumber}: expression must be AND(...), OR(...), A ^ B, A | B, or BASIC(rate).`);
}

function splitInfixExpression(expression, operator) {
  return expression
    .split(operator)
    .map((label) => label.trim())
    .filter(Boolean);
}

function applyTextModel() {
  try {
    model = parseTextModel();
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

function exportProject() {
  const project = modelToProjectJson();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${safeFilename(projectName)}.fautree.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  statusLine.textContent = "Project exported as FAUTree JSON.";
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
      missionTime: Number(missionTimeInput.value) || 0,
      timeUnit: timeUnitSelect.value,
      variableOrdering: bddOrderingSelect.value,
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
      if (node.kind === "basic_event") {
        payload.failureRate = node.failureRate ?? 0;
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
      const project = JSON.parse(String(reader.result));
      loadProjectFromJson(project);
      statusLine.textContent = `Imported: ${projectName}`;
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

  projectName = project.project?.name || "Imported Fault Tree";
  model = {
    rootId: topNodes[0].id,
    nodes: importedNodes,
  };
  selectedNodeId = model.rootId;
  updateNodeSequence();
  setProjectName(projectName);
  missionTimeInput.value = project.analysis?.missionTime ?? 1000;
  timeUnitSelect.value = project.analysis?.timeUnit || "hour";
  bddOrderingSelect.value = project.analysis?.variableOrdering || "topological";
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

  throw new Error(`Invalid FAUTree JSON: unsupported node type "${node.type}".`);
}

function computeCutSets(nodeId) {
  const node = model.nodes[nodeId];
  if (!node) {
    return [];
  }

  if (node.kind === "basic_event") {
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
  metricMissionTime.textContent = `${Number(missionTimeInput.value) || 0} h`;
  metricTopProbability.textContent = "pending";
  metricVariableCount.textContent = String(Object.values(model.nodes).filter((node) => node.kind === "basic_event").length);
}

function runAnalysis() {
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

  const cutSets = minimizeCutSets(computeCutSets(model.rootId));
  const missionTime = Number(missionTimeInput.value) || 0;
  qualitativeTableBody.innerHTML = "";

  if (cutSets.length === 0) {
    clearAnalysisResults("No cut sets found for the current model.");
    statusLine.textContent = "Analysis refreshed.";
    return;
  }

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

function validateModelForAnalysis() {
  const errors = [];
  const root = model.nodes[model.rootId];

  if (!root) {
    return ["The model has no top event."];
  }

  if (root.children.length === 0) {
    return ["Add an AND or OR gate below the top event before running analysis."];
  }

  visitTree(model.rootId, (node) => {
    if (node.kind !== "gate") {
      return;
    }

    if (node.children.length === 0) {
      errors.push(`${node.label} has no input events. Add at least two inputs before running analysis.`);
      return;
    }

    if (node.children.length === 1) {
      errors.push(`${node.label} has only one input event. AND/OR gates need at least two inputs.`);
    }
  });

  return errors;
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

function parseStrictFailureRate(value, lineNumber) {
  const parsed = Number(String(value).trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Line ${lineNumber}: failure rate must be a non-negative number.`);
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
importProjectInput.addEventListener("change", (event) => importProjectFile(event.target.files[0]));
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

setProjectName(projectName);
renderAll();
runAnalysis();
