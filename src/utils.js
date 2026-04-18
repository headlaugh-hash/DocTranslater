const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const toolCandidates = {
  ffmpeg: ["ffmpeg"],
  magick: ["magick", "convert"],
  soffice: ["soffice"],
  archive: process.platform === "win32"
    ? ["powershell.exe", "powershell", "pwsh.exe", "pwsh"]
    : ["zip"],
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function createJobWorkspace(workRoot, prefix) {
  const dir = path.join(workRoot, `${prefix}-${Date.now()}-${randomUUID()}`);
  ensureDir(dir);
  return { dir };
}

function removeDirSafe(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) {
    return;
  }
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function deleteFileSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }
  fs.rmSync(filePath, { force: true });
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function findTool(toolName) {
  const candidates = toolCandidates[toolName] || [toolName];
  const pathEntries = (process.env.PATH || "").split(path.delimiter);
  const exts =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
      : [""];

  for (const candidate of candidates) {
    for (const dir of pathEntries) {
      const fullBase = path.join(dir, candidate);
      const possiblePaths = process.platform === "win32"
        ? [fullBase, ...exts.map((ext) => fullBase + ext.toLowerCase()), ...exts.map((ext) => fullBase + ext)]
        : [fullBase];
      for (const maybePath of possiblePaths) {
        if (fs.existsSync(maybePath)) {
          return maybePath;
        }
      }
    }
  }
  return null;
}

function listToolStatus() {
  return Object.keys(toolCandidates).map((toolName) => ({
    tool: toolName,
    available: Boolean(findTool(toolName)),
  }));
}

function requireTool(toolName) {
  const resolved = findTool(toolName);
  if (!resolved) {
    if (toolName === "magick") {
      throw new Error("Missing required tool: ImageMagick. Add `magick` or `convert` to PATH first.");
    }
    if (toolName === "archive") {
      if (process.platform === "win32") {
        throw new Error("Missing required archive tool: PowerShell. Add `powershell.exe` or `pwsh` to PATH first.");
      }
      throw new Error("Missing required tool: zip. Install `zip` and add it to PATH first.");
    }
    throw new Error(`Missing required tool: ${toolName}. Add it to PATH first.`);
  }
  return resolved;
}

function collectFiles(files) {
  if (!Array.isArray(files)) {
    return [];
  }
  return files;
}

function sendFileResponse(res, filePath, onComplete) {
  return res.download(filePath, path.basename(filePath), () => {
    if (typeof onComplete === "function") {
      onComplete();
    }
  });
}

function writeTextOutput(outputDir, baseName, extension, content) {
  const safeName = sanitizeBaseName(baseName);
  const filePath = path.join(outputDir, `${safeName}.${extension}`);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function sanitizeBaseName(fileName) {
  return path.parse(fileName).name.replace(/[^a-zA-Z0-9_-]+/g, "-") || "output";
}

function tempZipPath(outputDir, fileName) {
  return path.join(outputDir, fileName);
}

module.exports = {
  ensureDir,
  createJobWorkspace,
  removeDirSafe,
  deleteFileSafe,
  fileExists,
  listToolStatus,
  requireTool,
  collectFiles,
  sendFileResponse,
  writeTextOutput,
  sanitizeBaseName,
  tempZipPath,
};
