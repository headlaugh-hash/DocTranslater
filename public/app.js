const logEl = document.getElementById("log");
const logStateEl = document.getElementById("log-state");
const clearLogButton = document.getElementById("clear-log");
const healthSummaryEl = document.getElementById("health-summary");
const healthToolsEl = document.getElementById("health-tools");
const refreshButton = document.getElementById("refresh-health");

const TEXT = {
  idle: "\u7a7a\u95f2",
  running: "\u8fd0\u884c\u4e2d",
  recentFailure: "\u6700\u8fd1\u4e00\u6b21\u5931\u8d25",
  waiting: "\u7b49\u5f85\u64cd\u4f5c...",
  checking: "\u6b63\u5728\u68c0\u67e5\u4f9d\u8d56...",
  checkFailed: "\u68c0\u6d4b\u5931\u8d25",
  noTools: "\u672a\u8fd4\u56de\u4f9d\u8d56\u4fe1\u606f",
  noToolSummary: "\u5f53\u524d\u670d\u52a1\u672a\u8fd4\u56de\u53ef\u68c0\u6d4b\u7684\u4f9d\u8d56\u72b6\u6001\u3002",
  available: "\u53ef\u7528",
  missing: "\u7f3a\u5931",
  processing: "\u5904\u7406\u4e2d...",
  requestFailed: "\u8bf7\u6c42\u5931\u8d25",
  start: "\u5f00\u59cb\u8bf7\u6c42",
  success: "\u5b8c\u6210",
  failure: "\u5931\u8d25",
  readySummary: "\u9879\u8fd0\u884c\u4f9d\u8d56\u5df2\u5c31\u7eea\uff0c\u53ef\u4ee5\u76f4\u63a5\u63d0\u4ea4\u8f6c\u6362\u4efb\u52a1\u3002",
  missingPrefix: "\u9879\u8fd0\u884c\u4f9d\u8d56\u53ef\u7528\uff0c\u7f3a\u5931\uff1a",
};

let activeRequests = 0;

function log(message) {
  const stamp = new Date().toLocaleTimeString();
  logEl.textContent = `[${stamp}] ${message}\n\n${logEl.textContent}`.trim();
}

function setLogState(text, variant) {
  logStateEl.textContent = text;
  logStateEl.className = `state-pill ${variant}`;
}

function syncLogState() {
  if (activeRequests > 0) {
    setLogState(`${TEXT.running} ${activeRequests}`, "running");
    return;
  }

  setLogState(TEXT.idle, "idle");
}

function renderHealth(toolStatus) {
  if (!Array.isArray(toolStatus) || toolStatus.length === 0) {
    healthToolsEl.innerHTML = `<span class="status-chip missing">${TEXT.noTools}</span>`;
    healthSummaryEl.textContent = TEXT.noToolSummary;
    return;
  }

  healthToolsEl.innerHTML = toolStatus
    .map((item) => {
      const variant = item.available ? "available" : "missing";
      const label = item.available ? TEXT.available : TEXT.missing;
      return `<span class="status-chip ${variant}">${item.tool}: ${label}</span>`;
    })
    .join("");

  const availableCount = toolStatus.filter((item) => item.available).length;
  const missingTools = toolStatus.filter((item) => !item.available).map((item) => item.tool);

  if (missingTools.length === 0) {
    healthSummaryEl.textContent = `${availableCount}/${toolStatus.length} ${TEXT.readySummary}`;
    return;
  }

  healthSummaryEl.textContent =
    `${availableCount}/${toolStatus.length} ${TEXT.missingPrefix}${missingTools.join("\u3001")}\u3002`;
}

async function refreshHealth() {
  healthToolsEl.innerHTML = `<span class="status-chip pending">${TEXT.checking}</span>`;
  healthSummaryEl.textContent = TEXT.checking;

  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    renderHealth(data.toolStatus);
  } catch (error) {
    healthToolsEl.innerHTML = `<span class="status-chip missing">${TEXT.checkFailed}</span>`;
    healthSummaryEl.textContent = `${TEXT.checkFailed}: ${error.message}`;
  }
}

async function submitForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const endpoint = form.dataset.endpoint;
  const taskName = form.dataset.task || endpoint;
  const formData = new FormData(form);
  const button = form.querySelector("button[type='submit']");
  const idleText = button.dataset.idleText || button.textContent;

  button.dataset.idleText = idleText;
  button.textContent = TEXT.processing;
  button.disabled = true;
  activeRequests += 1;
  syncLogState();
  log(`${TEXT.start} ${taskName} -> ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: TEXT.requestFailed }));
      throw new Error(payload.error || TEXT.requestFailed);
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^\"]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : "download.bin";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    log(`${TEXT.success}: ${taskName} -> ${fileName}`);
  } catch (error) {
    log(`${TEXT.failure}: ${taskName} -> ${error.message}`);
    setLogState(TEXT.recentFailure, "error");
  } finally {
    button.disabled = false;
    button.textContent = idleText;
    activeRequests = Math.max(0, activeRequests - 1);

    if (activeRequests > 0) {
      syncLogState();
    } else if (!logStateEl.classList.contains("error")) {
      syncLogState();
    }
  }
}

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", submitForm);
});

refreshButton.addEventListener("click", refreshHealth);
clearLogButton.addEventListener("click", () => {
  logEl.textContent = TEXT.waiting;
  syncLogState();
});

refreshHealth();
syncLogState();
