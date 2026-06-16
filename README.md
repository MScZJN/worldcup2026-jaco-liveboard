# 世界杯 H5 活动看板

基于本机已安装的 `haizei-worldcup-2026-skill` 构建的移动端活动看板。

## 启动

```bash
npm run dev
```

打开：

```text
http://localhost:4177
```

根路径默认展示 OBS 横屏直播间版；移动 H5 能力看板保留在：

```text
http://localhost:4177/dashboard.html
```

## GitHub Pages 线上部署

当前仓库支持 GitHub Pages 静态部署。页面在本地 Node 服务中会实时调用 `/api/run`；发布到 GitHub Pages 后会自动切换为读取 `data/snapshot.json`，该快照由 GitHub Actions 在部署时和定时任务中通过 vendored `haizei-worldcup-2026-skill` 生成。

Pages 构建命令：

```bash
npm run pages:build
```

目标域名：

```text
worldcup2026.jiananzhu.cloud
```

DNSPod 里需要添加：

```text
主机记录：worldcup2026
记录类型：CNAME
记录值：MScZJN.github.io
```

> GitHub Pages 是静态托管，不能在浏览器访问时实时执行 Node 服务；实时 API 版本仍可用 `npm start` 本地运行，或用 `render.yaml` 部署到 Node 平台。

## OBS 横屏直播间源

推荐优先使用完整横屏直播间版：

```text
http://localhost:4177/studio.html?transparent=1&lang=ar
```

建议 OBS 源尺寸：

```text
宽 1920，高 1080
```

彩排或无网络时可强制使用演示数据：

```text
http://localhost:4177/studio.html?transparent=1&mock=1&lang=ar
```

英语版：

```text
http://localhost:4177/studio.html?transparent=1&lang=en
```

可在普通浏览器预览时按 `1 / 2 / 3` 切换讲解重点，按 `L` 切换语言。页面内也有 `EN / العربية` 语言按钮。

## OBS 文字直播头部源

如果只需要放在直播间头部的小组件，可以使用：

```text
http://localhost:4177/broadcast.html?transparent=1
```

建议尺寸：

```text
宽 1920，高 260
```

彩排或无网络时可强制使用演示数据：

```text
http://localhost:4177/broadcast.html?transparent=1&mock=1
```

可调整刷新间隔，单位毫秒：

```text
http://localhost:4177/broadcast.html?transparent=1&refresh=30000
```

## 能力映射

- 今日赛程：`worldcup-schedule.js today/tomorrow/date/group/team/stage/dates/stats`
- 赛前前瞻：`worldcup-match.js analysis/odds`
- 战报回顾：`worldcup-match.js live/stats/lineup`
- 积分榜：`worldcup-rankings.js standings/fifa/players/categories/knockout`
- 球队档案：`worldcup-team.js lookup/info/schedule/lineup/history/stats`
- 球员追踪：`worldcup-player.js info/news/stats/schedule`
- 竞彩赔率：后端用体彩接口原生 `fetch` 实现，避免 Skill 中 `axios` 缺失导致的启动问题；无可售赛事或网络失败时回退到演示赔率。

## 关键文件

- `server.mjs`：本地 API 代理，白名单调用 Skill 脚本。
- `app.js`：H5 看板状态和七个能力工作台。
- `styles.css`：移动优先的活动看板视觉系统。
- `assets/concept.png`：实现参考概念图。
- `assets/mobile-home.png`：最终移动端截图。
- `broadcast.html`：OBS 浏览器源专用头部文字直播页。
- `assets/broadcast-concept.png`：OBS 头部源概念图。
- `studio.html`：OBS 横屏直播间完整场景页。
- `assets/studio-concept.png`：横屏直播间概念图。
- `assets/studio-scene.png`：横屏直播间 1920×1080 验收截图。
- `assets/studio-saudi-bilingual-concept.png`：沙特地区双语视觉概念图。
- `assets/studio-saudi-ar.png`：阿语 RTL 版本验收截图。
- `assets/studio-saudi-en.png`：英语版本验收截图。
