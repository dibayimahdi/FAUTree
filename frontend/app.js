const nodes = {
  top: {
    name: "Train control unavailable",
    type: "Top event",
    gate: "None",
    rate: "Not assigned",
  },
  g1: {
    name: "Communication failure",
    type: "Gate",
    gate: "OR",
    rate: "Not assigned",
  },
  e1: {
    name: "Controller failure",
    type: "Basic event",
    gate: "None",
    rate: "3.0e-6 / h",
  },
  g2: {
    name: "Redundant link loss",
    type: "Gate",
    gate: "AND",
    rate: "Not assigned",
  },
  e2: {
    name: "Primary link disconnected",
    type: "Basic event",
    gate: "None",
    rate: "3.0e-6 / h",
  },
  e3: {
    name: "Backup link disconnected",
    type: "Basic event",
    gate: "None",
    rate: "3.0e-6 / h",
  },
  e4: {
    name: "Switch failure",
    type: "Basic event",
    gate: "None",
    rate: "3.0e-6 / h",
  },
};

const nodeName = document.querySelector("#node-name");
const nodeType = document.querySelector("#node-type");
const nodeGate = document.querySelector("#node-gate");
const nodeRate = document.querySelector("#node-rate");
const statusLine = document.querySelector("#status-line");

function selectNode(nodeId) {
  const selected = nodes[nodeId];
  if (!selected) {
    return;
  }

  document.querySelectorAll("[data-node-id]").forEach((node) => {
    node.classList.toggle("is-selected", node.dataset.nodeId === nodeId);
  });

  document.querySelectorAll("[data-node-link]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nodeLink === nodeId);
  });

  nodeName.textContent = selected.name;
  nodeType.textContent = selected.type;
  nodeGate.textContent = selected.gate;
  nodeRate.textContent = selected.rate;
  statusLine.textContent = `Selected: ${selected.name}`;
}

document.querySelectorAll("[data-node-id]").forEach((node) => {
  node.addEventListener("click", () => selectNode(node.dataset.nodeId));
});

document.querySelectorAll("[data-node-link]").forEach((link) => {
  link.addEventListener("click", () => selectNode(link.dataset.nodeLink));
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tool]").forEach((tool) => {
      tool.classList.toggle("is-active", tool === button);
    });
    statusLine.textContent = `Tool: ${button.textContent.trim()}`;
  });
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

document.querySelector("#run-analysis").addEventListener("click", () => {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  statusLine.textContent = `Analysis refreshed at ${time}`;
});

