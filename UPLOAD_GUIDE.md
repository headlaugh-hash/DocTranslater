# DocTranslater 代码上传到服务器指南

这份文档专门说明：如何把你本地开发好的 `DocTranslater` 项目上传到自己的服务器。

推荐顺序：

1. 优先使用 `git`
2. 如果暂时不想用仓库，再使用 `scp`
3. 如果你更习惯图形界面，可以用 `WinSCP`

---

## 1. 推荐方式：使用 Git 上传

这是最推荐的方式，因为后续更新最方便。

适合场景：

- 你后面还会继续改代码
- 你希望服务器更新时只执行几条命令
- 你打算长期维护这个项目

### 1.1 在代码托管平台创建仓库

你可以选下面任意一个：

- GitHub
- Gitee
- GitLab

建议：

- 仓库名：`DocTranslater`
- 可见性：`Private`

创建好以后，你会得到一个仓库地址，例如：

```text
https://github.com/你的用户名/DocTranslater.git
```

或者：

```text
git@gitee.com:你的用户名/DocTranslater.git
```

---

### 1.2 在本地初始化并上传代码

进入你的项目目录：

```bash
cd 你的项目目录
```

例如：

```bash
cd D:\project\DocTranslater
```

初始化 Git：

```bash
git init
```

添加文件：

```bash
git add .
```

提交：

```bash
git commit -m "init DocTranslater"
```

切换主分支名：

```bash
git branch -M main
```

添加远程仓库：

```bash
git remote add origin 你的仓库地址
```

例如：

```bash
git remote add origin https://github.com/你的用户名/DocTranslater.git
```

推送：

```bash
git push -u origin main
```

---

### 1.3 在服务器上拉取代码

登录服务器后执行：

```bash
cd /var/www
sudo git clone 你的仓库地址 DocTranslater
sudo chown -R $USER:$USER /var/www/DocTranslater
cd /var/www/DocTranslater
```

然后安装依赖：

```bash
npm install
```

---

### 1.4 以后如何更新服务器代码

以后你本地改完代码，只需要：

本地执行：

```bash
git add .
git commit -m "update"
git push
```

服务器执行：

```bash
cd /var/www/DocTranslater
git pull
npm install
sudo systemctl restart doctranslater
```

如果你没有新增依赖，`npm install` 这一步有时可以省略，但稳妥起见建议保留。

---

## 2. 不用 Git：使用 scp 上传压缩包

如果你暂时不想建仓库，可以直接把整个项目打包上传。

适合场景：

- 只想先部署一次
- 不想先处理 Git 仓库
- 想快速试运行

### 2.1 在本地打包

如果你在 Linux / macOS / Git Bash / WSL 环境里，可以执行：

```bash
tar -czf DocTranslater.tar.gz DocTranslater
```

如果你当前就在项目目录中，也可以：

```bash
cd ..
tar -czf DocTranslater.tar.gz DocTranslater
```

---

### 2.2 上传到服务器

```bash
scp DocTranslater.tar.gz ubuntu@你的服务器IP:/var/www/
```

例如：

```bash
scp DocTranslater.tar.gz ubuntu@123.123.123.123:/var/www/
```

---

### 2.3 在服务器解压

登录服务器后执行：

```bash
cd /var/www
tar -xzf DocTranslater.tar.gz
cd DocTranslater
npm install
```

如果目录权限不对，再执行：

```bash
sudo chown -R $USER:$USER /var/www/DocTranslater
```

---

## 3. 图形界面方式：使用 WinSCP 上传

如果你用 Windows，而且更习惯可视化操作，可以使用 `WinSCP`。

适合场景：

- 不熟悉命令行
- 想直接拖拽文件
- 只是偶尔上传一次

### 3.1 安装 WinSCP

官网：

```text
https://winscp.net
```

### 3.2 连接服务器

在 WinSCP 里填写：

- 文件协议：`SFTP`
- 主机名：你的服务器 IP
- 端口：`22`
- 用户名：如 `ubuntu` 或 `root`
- 密码：你的密码，或配置 SSH 密钥

### 3.3 上传项目

把本地项目目录：

```text
DocTranslater
```

直接拖到服务器目录：

```text
/var/www/
```

上传完成后，登录服务器执行：

```bash
cd /var/www/DocTranslater
npm install
```

如果权限有问题：

```bash
sudo chown -R $USER:$USER /var/www/DocTranslater
```

---

## 4. 推荐你实际怎么选

如果你准备长期维护，建议这样：

- 第一次：用 `git`
- 后续：继续 `git push` + 服务器 `git pull`

如果你只是想先试运行：

- 第一次：`scp` 或 `WinSCP`
- 确认能跑后：再改成 `git`

---

## 5. 上传后应该做什么

代码上传到服务器后，不代表网站已经能访问，你还需要继续做这些步骤：

1. 安装 Node.js 和转换工具
2. `npm install`
3. 测试 `npm run dev`
4. 配置 `systemd`
5. 配置 `nginx`

这些步骤已经写在：

[DEPLOY_GUIDE.md](D:\project\DocTranslater\DEPLOY_GUIDE.md)

---

## 6. 最推荐的一套完整流程

### 6.1 本地第一次上传

```bash
cd 你的项目目录
git init
git add .
git commit -m "init DocTranslater"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

### 6.2 服务器第一次部署

```bash
cd /var/www
sudo git clone 你的仓库地址 DocTranslater
sudo chown -R $USER:$USER /var/www/DocTranslater
cd /var/www/DocTranslater
npm install
```

### 6.3 以后每次更新

本地：

```bash
git add .
git commit -m "update"
git push
```

服务器：

```bash
cd /var/www/DocTranslater
git pull
npm install
sudo systemctl restart doctranslater
```

---

## 7. 常见问题

### 7.1 `git push` 时要求登录

你可以：

- 使用 HTTPS + Token
- 或使用 SSH Key

如果是 GitHub，建议直接配置 SSH Key，会更省事。

### 7.2 服务器 `git clone` 私有仓库失败

常见原因：

- 服务器没有配置 SSH Key
- 没有仓库访问权限
- 用了 HTTPS 但没配置凭证

解决思路：

- 给服务器配置 SSH Key
- 或临时改成公开仓库
- 或先用 `scp` 方式上传

### 7.3 上传后访问不到网站

这通常不是“代码没传上去”，而是下面的问题：

- 服务还没启动
- `systemd` 没配置
- `nginx` 没配置
- 防火墙没放行

继续看：

[DEPLOY_GUIDE.md](D:\project\DocTranslater\DEPLOY_GUIDE.md)

---

## 8. 结论

对你这个项目，最推荐的方式是：

- 代码上传：`git`
- 服务部署：`systemd`
- 对外访问：`nginx`

如果你只是临时试运行，直接用：

- `scp`
- 或 `WinSCP`

也完全可以。
