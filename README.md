<div align="center">

# Design Codex Theme

一句话，为 Codex 设计并安装完整外观主题<br>
Design and install a complete Codex appearance from one sentence

[![Skill](https://img.shields.io/badge/Codex-Skill-111827?style=flat-square)](https://skills.sh/Wholiver/design-codex-theme/design-codex-theme)
[![macOS](https://img.shields.io/badge/macOS-supported-334155?style=flat-square)](#支持范围)
[![Windows](https://img.shields.io/badge/Windows-supported-334155?style=flat-square)](#支持范围)
[![License](https://img.shields.io/badge/license-Apache--2.0-2563EB?style=flat-square)](LICENSE)

[中文](#中文) · [English](#english) · [安装](#安装) · [Install](#install)

</div>

---

## 中文

Design Codex Theme 是一个 Codex Skill。你只需描述想要的感觉，它会完成主题构思、配色、背景、面板、按钮、字体和安装。

```text
把 Codex 变成安静的深海鲸鱼主题，深青色微光，文字保持清晰。
```

需要插画或场景时，Codex 会调用 gpt-image-2 生成图片；简洁、渐变、纸张、终端等风格直接使用 CSS，不为图片而图片。

### 它能做什么

- 从一句话生成完整外观，而不只是换壁纸
- 自动安装主题，并在 Codex 重启后继续生效
- 保存多个命名主题，随时切换
- 恢复 Codex 默认外观
- 支持 macOS 和 Windows
- 检查冲突、验证安装、失败时保留原主题

### 安装

使用 Skills CLI：

```bash
npx skills add Wholiver/design-codex-theme
```

全局安装到 Codex：

```bash
npx skills add Wholiver/design-codex-theme --agent codex --global --yes
```

也可以从 [skills.sh](https://skills.sh/Wholiver/design-codex-theme/design-codex-theme) 查看和安装。

### 使用

安装后直接对 Codex 说：

```text
$design-codex-theme 设计一个暖白纸张主题，墨黑文字，少量钴蓝强调色。
```

也可以继续说：

```text
列出我保存的 Codex 主题。
切换到 midnight-paper。
恢复 Codex 默认主题。
彻底卸载主题运行时并删除所有主题。
```

新主题默认直接设计并安装。首次启用前 Codex 会说明即将重启，然后自动完成重启与验证。

### 它不会做什么

这个项目不是主题中心，也不会安装 HeiGe 主题中心。它不会修改 Codex 应用文件、访问主题商店或从远程地址加载主题资源。

安装后只留下一个轻量本地运行时，用来在 Codex 重启后重新应用当前主题。恢复默认主题时，该后台项会被注销；保存的主题仍会保留。

### 支持范围

| 项目 | 支持情况 |
|---|---|
| macOS | LaunchAgent，当前用户权限 |
| Windows | Scheduled Task，当前用户权限 |
| Linux | Codex Desktop 暂不支持 |
| Node.js | 22 或更新版本 |
| 图片 | PNG、JPEG、WebP，每张不超过 12 MB |

<details>
<summary>主题保存在哪里</summary>

```text
~/.codex/design-codex-theme/
├── themes/
├── runtime/
├── active.json
├── state.json
└── logs/
```

</details>

---

## English

Design Codex Theme is a Codex Skill. Describe a look in plain language and it handles theme direction, colors, background, panels, controls, typography, and installation.

```text
Give Codex a quiet deep-ocean whale theme with a dark teal glow and clear text.
```

When artwork is useful, Codex calls gpt-image-2. Minimal, gradient, paper, grid, and terminal styles stay image-free and use structured CSS.

### What it does

- Creates a full appearance from one sentence, not only a wallpaper
- Installs themes and keeps them active after Codex restarts
- Saves multiple named themes and switches between them
- Restores the official Codex appearance
- Supports macOS and Windows
- Detects controller conflicts, verifies injection, and preserves previous state on failure

### Install

Use Skills CLI:

```bash
npx skills add Wholiver/design-codex-theme
```

Install globally for Codex:

```bash
npx skills add Wholiver/design-codex-theme --agent codex --global --yes
```

You can also view and install it from [skills.sh](https://skills.sh/Wholiver/design-codex-theme/design-codex-theme).

### Use

After installation, tell Codex what you want:

```text
$design-codex-theme Create a warm cream-paper theme with ink-black text and a small cobalt accent.
```

Follow-up requests can stay natural:

```text
List my saved Codex themes.
Switch to midnight-paper.
Restore the default Codex theme.
Completely uninstall the theme runtime and delete every saved theme.
```

New themes are designed and installed directly. Before first activation, Codex warns about one restart, then completes restart and verification automatically.

### What it does not do

This project is not a theme center and does not install HeiGe Codex Skin Studio. It does not patch Codex application files, contact a theme marketplace, or load theme resources from remote URLs.

Installation leaves a small local runtime that reapplies the active theme after Codex restarts. Restoring the default appearance unregisters that background item while preserving saved themes.

### Compatibility

| Item | Support |
|---|---|
| macOS | Current-user LaunchAgent |
| Windows | Current-user Scheduled Task |
| Linux | Not supported by Codex Desktop workflow |
| Node.js | 22 or newer |
| Images | PNG, JPEG, WebP; up to 12 MB each |

---

## Project notes

- Project license: [Apache License 2.0](LICENSE)
- Upstream research and MIT attribution: [Third-party notices](THIRD_PARTY_NOTICES.md)
- This community project is not affiliated with or endorsed by OpenAI.
