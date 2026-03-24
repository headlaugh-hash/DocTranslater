# DocTranslater 服务器部署文档

这份文档面向“部署到你自己的 Ubuntu 服务器”这个场景，尽量把下载安装都改成命令方式，照着执行即可。

适用目标：

- 服务器系统：`Ubuntu 24.04 LTS`
- 项目运行方式：`Node.js + systemd + Nginx`
- 项目路径：`/var/www/DocTranslater`

本文默认你已经有一台服务器，并且可以通过 `ssh` 登录。

---

## 1. 登录服务器

如果你用 root：

```bash
ssh root@你的服务器IP
```

如果你用普通用户：

```bash
ssh ubuntu@你的服务器IP
```

---

## 2. 更新系统

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 3. 安装基础工具

```bash
sudo apt install -y curl git nginx
```

---

## 4. 安装 Node.js

先直接用 Ubuntu 官方仓库安装：

```bash
sudo apt install -y nodejs npm
```

安装后检查版本：

```bash
node -v
npm -v
```

如果版本过低，再执行下面这组命令安装较新的 Node.js：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

说明：

- `Node 20+` 更稳妥
- 如果 `apt install nodejs npm` 装出来的版本已经够用，可以不用执行 NodeSource 那组命令

---

## 5. 安装文件转换依赖

这一步安装你的网站真正需要的几个外部工具：

- `ffmpeg`
- `LibreOffice`
- `ImageMagick`
- `ghostscript`

执行：

```bash
sudo apt install -y ffmpeg libreoffice libreoffice-writer imagemagick ghostscript
```

安装完成后检查：

```bash
ffmpeg -version
soffice --version
magick -version
```

如果最后一条报错，再执行：

```bash
convert -version
```

说明：

- Ubuntu 上有时装的是 `ImageMagick 6`
- `ImageMagick 6` 可能只有 `convert`，没有 `magick`
- 当前项目已经兼容 `magick` 和 `convert`

---

## 6. 处理 ImageMagick 的 PDF 策略问题

很多 Ubuntu 服务器默认禁止 `ImageMagick` 直接读写 PDF，这是安全策略，不是安装失败。

先检查策略文件：

```bash
sudo find /etc -name policy.xml
```

常见位置是：

```text
/etc/ImageMagick-6/policy.xml
```

或者：

```text
/etc/ImageMagick-7/policy.xml
```

先备份：

```bash
sudo cp /etc/ImageMagick-6/policy.xml /etc/ImageMagick-6/policy.xml.bak
```

如果你的路径是 7，就把上面的 `ImageMagick-6` 改成 `ImageMagick-7`。

然后编辑文件：

```bash
sudo nano /etc/ImageMagick-6/policy.xml
```

找到类似下面这种配置：

```xml
<policy domain="coder" rights="none" pattern="PDF" />
```

把它改成：

```xml
<policy domain="coder" rights="read|write" pattern="PDF" />
```

保存退出后，可用下面命令简单测试：

```bash
magick -list policy
```

或者如果没有 `magick`：

```bash
convert -list policy
```

注意：

- 只有你确认服务器是自己使用、风险可控时，才建议放开 PDF
- 如果网站以后要公网开放，安全策略要重新评估

---

## 7. 拉取项目代码

切到部署目录：

```bash
cd /var/www
```

克隆项目：

```bash
sudo git clone 你的仓库地址 DocTranslater
```

把目录权限交给当前用户：

```bash
sudo chown -R $USER:$USER /var/www/DocTranslater
```

进入项目：

```bash
cd /var/www/DocTranslater
```

---

## 8. 安装项目依赖

```bash
npm install
```

---

## 9. 先手工启动测试

```bash
npm run dev
```

如果看到类似输出：

```text
DocTranslater listening on http://localhost:3000
```

说明服务已经启动。

你可以在服务器本机测试：

```bash
curl http://127.0.0.1:3000/api/health
```

如果要停止：

```bash
Ctrl + C
```

---

## 10. 配置 systemd 后台运行

创建服务文件：

```bash
sudo nano /etc/systemd/system/doctranslater.service
```

写入以下内容：

```ini
[Unit]
Description=DocTranslater
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/DocTranslater
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
Environment=PORT=3000
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
```

注意修改：

- `User=ubuntu`
- `Group=ubuntu`

如果你的登录用户不是 `ubuntu`，就改成你的实际用户名。

重新加载并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable doctranslater
sudo systemctl start doctranslater
sudo systemctl status doctranslater
```

查看日志：

```bash
sudo journalctl -u doctranslater -f
```

---

## 11. 配置 Nginx 反向代理

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/doctranslater
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名或服务器IP;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/doctranslater /etc/nginx/sites-enabled/doctranslater
sudo nginx -t
sudo systemctl reload nginx
```

如果默认站点影响访问，可以移除默认配置：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 12. 放行防火墙

如果你启用了 `ufw`，执行：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 13. 验证部署是否成功

先看服务状态：

```bash
sudo systemctl status doctranslater
```

再看接口状态：

```bash
curl http://127.0.0.1:3000/api/health
```

如果已经绑定域名或公网 IP，也可以直接访问：

```text
http://你的域名
```

或者：

```text
http://你的服务器IP
```

---

## 14. 更新项目的常用命令

以后更新代码时：

```bash
cd /var/www/DocTranslater
git pull
npm install
sudo systemctl restart doctranslater
```

查看服务日志：

```bash
sudo journalctl -u doctranslater -n 100
```

持续追踪日志：

```bash
sudo journalctl -u doctranslater -f
```

---

## 15. 常见问题排查

### 15.1 `magick: command not found`

先试：

```bash
convert -version
```

如果只有 `convert` 可用，说明当前系统大概率安装的是 `ImageMagick 6`，当前项目也可以继续使用。

### 15.2 `soffice: command not found`

检查：

```bash
which soffice
```

如果没有结果，重新安装：

```bash
sudo apt install -y libreoffice libreoffice-writer
```

### 15.3 `ffmpeg: command not found`

重新安装：

```bash
sudo apt install -y ffmpeg
```

### 15.4 PDF 转图片时报策略错误

检查：

```bash
magick -list policy
```

或者：

```bash
convert -list policy
```

然后回到本文第 6 节调整 `policy.xml`。

### 15.5 服务启动失败

先看日志：

```bash
sudo journalctl -u doctranslater -n 100 --no-pager
```

再确认 Node 路径：

```bash
which node
```

如果 `which node` 输出不是 `/usr/bin/node`，就把 `doctranslater.service` 里的 `ExecStart` 改成真实路径。

---

## 16. 建议你上线前再补的内容

当前项目能跑，但如果你要长期在服务器上用，建议继续补这几项：

- 给上传大小做限制
- 给上传文件类型做白名单校验
- 给临时目录做定期清理
- 如果要公网访问，再补 HTTPS

---

## 17. 一次性安装命令汇总

如果你想快速执行，可以按下面顺序跑：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl git nginx nodejs npm ffmpeg libreoffice libreoffice-writer imagemagick ghostscript
node -v
npm -v
ffmpeg -version
soffice --version
magick -version || convert -version
cd /var/www
sudo git clone 你的仓库地址 DocTranslater
sudo chown -R $USER:$USER /var/www/DocTranslater
cd /var/www/DocTranslater
npm install
npm run dev
```

---

## 18. 官方来源

- ImageMagick: <https://imagemagick.org/script/install-source.php>
- ImageMagick 安全策略: <https://imagemagick.org/script/security-policy.php>
- LibreOffice: <https://www.libreoffice.org/download/download-libreoffice/>
- FFmpeg: <https://ffmpeg.org/download.html>
- Ubuntu `ffmpeg` 包: <https://packages.ubuntu.com/noble/ffmpeg>
- Ubuntu `libreoffice` 包: <https://packages.ubuntu.com/noble/libreoffice>
- Ubuntu `imagemagick` 包: <https://packages.ubuntu.com/noble/imagemagick>
