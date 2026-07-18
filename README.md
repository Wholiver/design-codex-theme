<div align="center">

# Design Codex Theme

一句话，为 Codex Desktop 设计并安装专属外观主题。  
Design and install a personal Codex Desktop theme from one simple prompt.

<p>
  <a href="https://skills.sh/Wholiver/design-codex-theme/design-codex-theme"><img alt="skills.sh" src="https://img.shields.io/badge/skills.sh-available-111827?style=for-the-badge"></a>
  <a href="https://github.com/Wholiver/design-codex-theme"><img alt="Platforms" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-2563EB?style=for-the-badge"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-0F766E?style=for-the-badge"></a>
</p>

[中文](#中文) · [English](#english)

</div>

---

<a id="中文"></a>

## 中文

Design Codex Theme 是一个面向 Codex Desktop 的外观主题设计 Skill。你只需要描述想要的感觉，它会帮你补全配色、明暗模式、背景构图和视觉焦点；没有合适图片时，还可以调用图像生成能力制作背景，最后完成主题安装与应用。

### 它能做什么

| 你想做的事 | Skill 会完成的工作 |
|---|---|
| 用一句话设计主题 | 理解风格，选择配色、明暗模式和构图 |
| 用自己的图片换肤 | 检查图片并制作成正式主题 |
| 没有背景图片 | 调用图像生成能力创建适合 Codex 的桌面背景 |
| 只想先看看方案 | 生成预览方案，不安装、不重启 Codex |
| 恢复原生外观 | 使用安全恢复入口返回官方界面 |

### 安装

使用官方 Skills CLI：

```bash
npx skills add https://github.com/Wholiver/design-codex-theme --skill design-codex-theme
```

安装到 Codex 全局技能目录：

```bash
npx skills add https://github.com/Wholiver/design-codex-theme \
  --skill design-codex-theme \
  --agent codex \
  --global \
  --yes
```

### 使用示例

安装后，在 Codex 中直接描述主题：

```text
$design-codex-theme 给我做一个安静的深海蓝鲸主题，深色，蓝绿色微光。
```

也可以更简单：

```text
把 Codex 做成温暖、干净的奶油纸张风格。
```

如果只想看方案：

```text
设计一个午夜霓虹主题，先给我预览，不要安装。
```

### 使用流程

1. 读取你的一句话需求。
2. 自动确定主题名称、配色、明暗模式和画面焦点。
3. 使用你提供的图片，或生成新的背景图。
4. 检查可读性和构图。
5. 安装主题并按需应用。
6. 确认主题状态，返回主题名称、颜色和安装位置。

### 使用说明

- 支持 macOS 和 Windows；macOS 经过更充分的实际验证。
- 首次正式安装主题时，会按需安装经过固定版本验证的 [HeiGe Codex Skin Studio](https://github.com/HeiGeAi/heige-codex-skin-studio) 运行组件。
- 应用或恢复主题时，Codex 可能正常关闭并重新打开，请先保存当前任务。
- 主题通过本机回环连接应用，不修改 Codex 的 `app.asar`、签名或程序文件。
- 本地图片不会被上传到公共图片托管服务。

[返回顶部](#design-codex-theme)

---

<a id="english"></a>

## English

Design Codex Theme is an appearance-design Skill for Codex Desktop. Describe the look you want in one sentence, and it can choose the palette, light or dark appearance, background composition, and visual focus. If no suitable image is available, it can create one with an image-generation tool, then install and apply the finished theme.

### What it can do

| What you want | What the Skill handles |
|---|---|
| Design from one sentence | Interprets the mood and chooses colors, appearance, and composition |
| Turn your image into a theme | Checks the image and creates a formal installable theme |
| Create a missing background | Uses image generation to make a Codex-friendly wallpaper |
| Preview before installing | Produces a design plan without installation or restart |
| Return to the native look | Uses the safe restore entry point |

### Install

Use the official Skills CLI:

```bash
npx skills add https://github.com/Wholiver/design-codex-theme --skill design-codex-theme
```

Install globally for Codex:

```bash
npx skills add https://github.com/Wholiver/design-codex-theme \
  --skill design-codex-theme \
  --agent codex \
  --global \
  --yes
```

### Examples

After installation, describe a theme directly in Codex:

```text
$design-codex-theme Create a calm deep-ocean whale theme with a dark teal glow.
```

You can keep it simple:

```text
Give Codex a warm, clean cream-paper appearance.
```

For a preview only:

```text
Design a midnight neon theme, but preview it without installing.
```

### How it works

1. Reads your one-sentence brief.
2. Chooses a name, palette, appearance, and focal point.
3. Uses your image or creates a new background.
4. Checks readability and composition.
5. Installs and optionally applies the theme.
6. Verifies the result and reports the theme details.

### Notes

- Supports macOS and Windows; macOS has received more real-device testing.
- On first use, it can install a pinned and tested [HeiGe Codex Skin Studio](https://github.com/HeiGeAi/heige-codex-skin-studio) runtime when needed.
- Applying or restoring a theme may close and reopen Codex normally. Save active work first.
- Themes use a local loopback connection and do not modify Codex `app.asar`, signatures, or application files.
- Local images are never uploaded to public image-hosting services.

[Back to top](#design-codex-theme)

---

<details>
<summary>项目结构 / Project structure</summary>

```text
design-codex-theme/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── design-guide.md
│   └── runtime.md
└── scripts/
    ├── bootstrap-runtime.mjs
    └── install-theme.mjs
```

</details>

## Credits

Theme runtime based on [HeiGeAi/heige-codex-skin-studio](https://github.com/HeiGeAi/heige-codex-skin-studio).

## License

Released under the [Apache License 2.0](LICENSE).
