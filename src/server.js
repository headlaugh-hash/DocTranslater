const path = require("path");
const express = require("express");
const multer = require("multer");

const {
  ensureDir,
  createJobWorkspace,
  removeDirSafe,
  deleteFileSafe,
  fileExists,
  listToolStatus,
  requireTool,
  collectFiles,
  sendFileResponse,
} = require("./utils");
const {
  convertImage,
  convertDocxToPdf,
  splitPdf,
  mergePdfs,
  pdfToImages,
  markdownToHtml,
  htmlToMarkdown,
  transcodeMedia,
} = require("./converters");

const app = express();
const rootDir = path.resolve(__dirname, "..");
const workRoot = path.join(rootDir, "work");
const publicDir = path.join(rootDir, "public");
const upload = multer({ dest: path.join(workRoot, "incoming") });

ensureDir(workRoot);
ensureDir(path.join(workRoot, "incoming"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

function finalizeSingleFileJob(req, workspace) {
  deleteFileSafe(req.file && req.file.path);
  removeDirSafe(workspace.dir);
}

function finalizeMultiFileJob(req, workspace) {
  for (const file of collectFiles(req.files)) {
    deleteFileSafe(file.path);
  }
  removeDirSafe(workspace.dir);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    toolStatus: listToolStatus(),
  });
});

app.post("/api/convert/image", upload.single("file"), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "image");
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file." });
    }
    const targetFormat = String(req.body.targetFormat || "").toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(targetFormat)) {
      return res.status(400).json({ error: "Unsupported target format." });
    }
    requireTool("magick");
    const outputPath = await convertImage(req.file.path, workspace.dir, targetFormat);
    return sendFileResponse(res, outputPath, () => finalizeSingleFileJob(req, workspace));
  } catch (error) {
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/convert/docx-to-pdf", upload.single("file"), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "docx-pdf");
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file." });
    }
    requireTool("soffice");
    const outputPath = await convertDocxToPdf(req.file.path, workspace.dir);
    return sendFileResponse(res, outputPath, () => finalizeSingleFileJob(req, workspace));
  } catch (error) {
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/pdf/split", upload.single("file"), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "pdf-split");
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file." });
    }
    const zipPath = await splitPdf(req.file.path, workspace.dir);
    return sendFileResponse(res, zipPath, () => finalizeSingleFileJob(req, workspace));
  } catch (error) {
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/pdf/merge", upload.array("files", 20), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "pdf-merge");
  try {
    const files = collectFiles(req.files);
    if (files.length < 2) {
      finalizeMultiFileJob(req, workspace);
      return res.status(400).json({ error: "Upload at least two PDF files." });
    }
    const outputPath = await mergePdfs(
      files.map((file) => file.path),
      workspace.dir,
    );
    return sendFileResponse(res, outputPath, () => finalizeMultiFileJob(req, workspace));
  } catch (error) {
    finalizeMultiFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/pdf/to-images", upload.single("file"), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "pdf-images");
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file." });
    }
    const format = String(req.body.format || "png").toLowerCase();
    if (!["png", "jpg", "jpeg"].includes(format)) {
      finalizeSingleFileJob(req, workspace);
      return res.status(400).json({ error: "Unsupported image format." });
    }
    requireTool("magick");
    const zipPath = await pdfToImages(req.file.path, workspace.dir, format);
    return sendFileResponse(res, zipPath, () => finalizeSingleFileJob(req, workspace));
  } catch (error) {
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/text/markdown-html", upload.single("file"), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "md-html");
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file." });
    }
    const direction = String(req.body.direction || "");
    if (direction === "md-to-html") {
      const outputPath = await markdownToHtml(req.file.path, workspace.dir);
      return sendFileResponse(res, outputPath, () => finalizeSingleFileJob(req, workspace));
    }
    if (direction === "html-to-md") {
      const outputPath = await htmlToMarkdown(req.file.path, workspace.dir);
      return sendFileResponse(res, outputPath, () => finalizeSingleFileJob(req, workspace));
    }
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: "Unsupported conversion direction." });
  } catch (error) {
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.post("/api/media/transcode", upload.single("file"), async (req, res) => {
  const workspace = createJobWorkspace(workRoot, "media");
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing file." });
    }
    const targetFormat = String(req.body.targetFormat || "").toLowerCase();
    if (!["mp3", "mp4"].includes(targetFormat)) {
      finalizeSingleFileJob(req, workspace);
      return res.status(400).json({ error: "Unsupported target format." });
    }
    requireTool("ffmpeg");
    const outputPath = await transcodeMedia(req.file.path, workspace.dir, targetFormat);
    return sendFileResponse(res, outputPath, () => finalizeSingleFileJob(req, workspace));
  } catch (error) {
    finalizeSingleFileJob(req, workspace);
    return res.status(400).json({ error: error.message });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message || "Unexpected server error." });
});

app.get(/.*/, (_req, res) => {
  const indexPath = path.join(publicDir, "index.html");
  if (fileExists(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).send("Missing frontend.");
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`DocTranslater listening on http://localhost:${port}`);
});
