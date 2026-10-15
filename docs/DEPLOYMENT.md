# 免费部署 LASTPACK 到 Render

本项目是一个完整的 Node HTTP + WebSocket 服务。前端、共享引擎和图片由同一个服务提供，不要选择 Static Site，也不需要另建后端。

## 配置已准备

仓库根目录的 `render.yaml` 只声明 **Free Web Service**，不会创建付费数据库、磁盘或其他付费服务。使用 Node 24、`npm install --omit=dev` 安装、`npm start` 启动，健康检查 `/health`。端口使用 Render 提供的 `PORT`。

## 操作

1. 在 https://dashboard.render.com/ 用 GitHub 登录，授权访问这个私有游戏仓库。
2. 选择 New → Blueprint，连接仓库，读取根目录的 `render.yaml`。
3. 确认预览中只有一个 Free Web Service，没有数据库和磁盘，再部署。
4. 部署成功后，打开 Render 给出的 HTTPS 地址。用无痕窗口和另一台使用移动网络的设备测试创建房间、邀请、移动、升级和结算。
5. 将可直接试玩的 HTTPS 地址填入比赛 Project URL。源代码仓库链接不能替代试玩链接。

如果使用 New → Web Service 手动创建：选择 Node、Free、Virginia；Build Command 为 `npm install --omit=dev`，Start Command 为 `npm start`，Health Check 为 `/health`。环境变量 `NODE_VERSION=24`、`PROFILE_FILE=/tmp/lastpack/profiles.json`、`EPHEMERAL_STORAGE=1`。

## 免费档的实际限制

- 空闲 15 分钟可能休眠，下次访问约一分钟唤醒；额度用尽可能暂停服务。
- 当前玩家资料与房间检查点保存在临时文件系统；休眠、重启或重新部署可能清空它们。网页会在免费演示服上提示这一点。本地正式档案不随部署上传。
- 目前不能保证跨服务重启保留成长；免费持久化数据库需要后续接入。
- 比赛评审期间保持服务和仓库连接可用，避免反复更新导致对局中断。
- 无需购买域名，不用提交个人密码、GitHub token 或服务器存档。

## 中英文

主菜单右上角、对局 Esc 菜单均可切换中文 / English，设备会记住选择。语言只改变显示，不改变服务器规则、掉落或其他玩家的语言。英文词条在 `public/locale-en.mjs` 中；玩家自定义呼号不翻译。

比赛链接可附加 `?lang=en`，让首次访问的评委先看到英文；若设备已选择过语言，保留已有偏好。

## 来源

- https://render.com/docs/free
- https://render.com/docs/blueprint-spec
- https://render.com/docs/websocket

规则与额度最后核对：2026-10-15。实际上线仍需你的 Render 账号连接并完成部署；配置文件本身不代表已上线。
