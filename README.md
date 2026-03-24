# DocTranslater

一个给个人使用的本地文件转换网站，包含这五类功能：

- 图片格式互转：`png / jpg / webp`
- 文档转 PDF：`docx -> pdf`
- PDF 拆分、合并、转图片
- Markdown 和 HTML 互转
- 音视频基础转码：`mp4 / mp3`

## 技术栈

- 前端：原生 HTML / CSS / JS
- 后端：Node.js + Express
- 文件上传：Multer
- 纯 JS 转换：`pdf-lib`、`marked`、`turndown`
- 外部工具：
  - `ImageMagick` 用于图片转换和 PDF 转图片
  - `LibreOffice` 用于 `docx -> pdf`
  - `FFmpeg` 用于音视频转码

## 目录结构

```text
public/   前端资源
src/      服务端代码
work/     运行时临时文件
```

## 启动方式

先安装依赖：

```bash
npm install
```

启动项目：

```bash
npm run dev
```

默认地址：

```text
http://localhost:3000
```

## 所需工具

下面这些命令需要能从系统 `PATH` 找到：

- `magick`
- `soffice`
- `ffmpeg`

如果缺少其中某个工具，首页会显示“缺失”，相关接口也会返回明确报错。

## 功能说明

### 图片格式互转

- 输入：`png / jpg / jpeg / webp`
- 输出：`png / jpg / webp`

### 文档转 PDF

- 输入：`docx`
- 输出：`pdf`

### PDF 工具

- 拆分：按页导出多个 PDF，并返回 zip 压缩包
- 合并：上传多个 PDF，按选择顺序合并
- 转图片：按页导出图片，并返回 zip 压缩包

### Markdown / HTML

- `Markdown -> HTML`
- `HTML -> Markdown`

### 音视频转码

- 输出目标：`mp3`、`mp4`

## 限制说明

- 这是本地个人版，不是多用户在线服务
- 大文件转码会占用较多 CPU 和磁盘空间
- 某些 PDF 可能需要你额外调整本机的 ImageMagick 策略后才能正常转换
