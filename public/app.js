const logEl = document.getElementById("log");
const healthSummaryEl = document.getElementById("health-summary");
const refreshButton = document.getElementById("refresh-health");

function log(message) {
  const stamp = new Date().toLocaleTimeString();
  logEl.textContent = `[${stamp}] ${message}\n\n${logEl.textContent}`.trim();
}

async function refreshHealth() {
  healthSummaryEl.textContent = "正在检查依赖...";
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    const summary = data.toolStatus
      .map((item) => `${item.tool}: ${item.available ? "可用" : "缺失"}`)
      .join(" | ");
    healthSummaryEl.textContent = summary;
  } catch (error) {
    healthSummaryEl.textContent = `检测失败: ${error.message}`;
  }
}

async function submitForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const endpoint = form.dataset.endpoint;
  const formData = new FormData(form);
  const button = form.querySelector("button[type='submit']");

  button.disabled = true;
  log(`开始请求 ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "请求失败" }));
      throw new Error(payload.error || "请求失败");
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

    log(`完成: ${fileName}`);
  } catch (error) {
    log(`失败: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", submitForm);
});

refreshButton.addEventListener("click", refreshHealth);
refreshHealth();
