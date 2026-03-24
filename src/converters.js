const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { PDFDocument } = require("pdf-lib");
const { marked } = require("marked");
const TurndownService = require("turndown");

const {
  ensureDir,
  requireTool,
  sanitizeBaseName,
  tempZipPath,
  writeTextOutput,
} = require("./utils");

const execFileAsync = promisify(execFile);

async function runTool(command, args, options = {}) {
  try {
    await execFileAsync(command, args, {
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 20,
      ...options,
    });
  } catch (error) {
    const stderr = error.stderr || "";
    const stdout = error.stdout || "";
    throw new Error(stderr.trim() || stdout.trim() || `${command} failed.`);
  }
}

async function convertImage(inputPath, outputDir, targetFormat) {
  const magick = requireTool("magick");
  const outputPath = path.join(outputDir, `${sanitizeBaseName(path.basename(inputPath))}.${targetFormat}`);
  await runTool(magick, [inputPath, outputPath]);
  return outputPath;
}

async function convertDocxToPdf(inputPath, outputDir) {
  const soffice = requireTool("soffice");
  await runTool(soffice, [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    outputDir,
    inputPath,
  ]);
  const outputPath = path.join(outputDir, `${sanitizeBaseName(path.basename(inputPath))}.pdf`);
  if (!fs.existsSync(outputPath)) {
    throw new Error("LibreOffice did not produce a PDF output.");
  }
  return outputPath;
}

async function splitPdf(inputPath, outputDir) {
  const bytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount < 1) {
    throw new Error("PDF contains no pages.");
  }
  const splitDir = path.join(outputDir, "split");
  ensureDir(splitDir);

  for (let index = 0; index < pageCount; index += 1) {
    const nextDoc = await PDFDocument.create();
    const [page] = await nextDoc.copyPages(pdfDoc, [index]);
    nextDoc.addPage(page);
    const outBytes = await nextDoc.save();
    fs.writeFileSync(path.join(splitDir, `page-${index + 1}.pdf`), outBytes);
  }

  const zipPath = tempZipPath(outputDir, "pdf-pages.zip");
  await zipDirectory(splitDir, zipPath);
  return zipPath;
}

async function mergePdfs(inputPaths, outputDir) {
  const merged = await PDFDocument.create();
  for (const inputPath of inputPaths) {
    const bytes = fs.readFileSync(inputPath);
    const doc = await PDFDocument.load(bytes);
    const pageIndices = doc.getPageIndices();
    const copiedPages = await merged.copyPages(doc, pageIndices);
    copiedPages.forEach((page) => merged.addPage(page));
  }
  const outputPath = path.join(outputDir, "merged.pdf");
  fs.writeFileSync(outputPath, await merged.save());
  return outputPath;
}

async function pdfToImages(inputPath, outputDir, format) {
  const magick = requireTool("magick");
  const imageDir = path.join(outputDir, "images");
  ensureDir(imageDir);
  const outputPattern = path.join(imageDir, `page-%03d.${format}`);
  await runTool(magick, [
    "-density",
    "180",
    inputPath,
    outputPattern,
  ]);
  const zipPath = tempZipPath(outputDir, `pdf-images-${format}.zip`);
  await zipDirectory(imageDir, zipPath);
  return zipPath;
}

async function markdownToHtml(inputPath, outputDir) {
  const content = fs.readFileSync(inputPath, "utf8");
  const html = marked.parse(content);
  return writeTextOutput(outputDir, path.basename(inputPath), "html", html);
}

async function htmlToMarkdown(inputPath, outputDir) {
  const turndownService = new TurndownService();
  const html = fs.readFileSync(inputPath, "utf8");
  const markdown = turndownService.turndown(html);
  return writeTextOutput(outputDir, path.basename(inputPath), "md", markdown);
}

async function transcodeMedia(inputPath, outputDir, targetFormat) {
  const ffmpeg = requireTool("ffmpeg");
  const outputPath = path.join(outputDir, `${sanitizeBaseName(path.basename(inputPath))}.${targetFormat}`);
  const args = ["-y", "-i", inputPath];

  if (targetFormat === "mp3") {
    args.push("-vn", "-codec:a", "libmp3lame", "-q:a", "2", outputPath);
  } else {
    args.push(
      "-codec:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "23",
      "-codec:a",
      "aac",
      "-b:a",
      "192k",
      outputPath,
    );
  }

  await runTool(ffmpeg, args);
  return outputPath;
}

async function zipDirectory(inputDir, outputZipPath) {
  const powershell = process.env.ComSpec ? "powershell.exe" : "powershell";
  const command = [
    "-Command",
    `Compress-Archive -Path '${inputDir.replace(/'/g, "''")}\\*' -DestinationPath '${outputZipPath.replace(/'/g, "''")}' -Force`,
  ];
  await runTool(powershell, command);
}

module.exports = {
  convertImage,
  convertDocxToPdf,
  splitPdf,
  mergePdfs,
  pdfToImages,
  markdownToHtml,
  htmlToMarkdown,
  transcodeMedia,
};
