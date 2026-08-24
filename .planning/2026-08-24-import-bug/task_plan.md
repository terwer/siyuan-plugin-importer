# 任务计划：导入 bug 修复（temp 目录）

**日期**: 2026-08-24
**状态**: 🟢 代码完成（已构建 + 测试通过）

## 问题

用户报告 `temp` 目录下有两个导入 bug 样例：

| # | 样例 | 现象 | 状态 |
|---|------|------|------|
| 1 | `temp/bug_260824/被导入文档.docx` | Word 表格导入失败，导入后显示 `[table]` | 🟢 已修复 |
| 2 | `temp/bug_250814/Test_公式变代码块.docx` | Word 公式导入后变成代码块 | 🟢 已修复 |

## 根因分析（均为 `convertPandoc` 的 `--to` 输出格式问题）

`src/api/kernel-api.ts` 的 `convertPandoc` 历史上使用 `gfm-raw_html+tex_math_dollars+pipe_tables`。

### bug_260824：表格变 [table]

- pandoc 的 GFM(pipe_tables) 无法表示含合并单元格(colspan)的复杂表格，需回退输出 HTML `<table>`。
- 但 `-raw_html` 禁用了原始 HTML 输出 → pandoc 只能把表格内容**丢弃**并输出字面占位符 `[TABLE]`。
- 思源 Lute 将其渲染为 `<p>[TABLE]</p>`，即用户看到的 `[table]`，表格内容全部丢失。

### bug_250814：公式变代码块

- pandoc 的 GFM 格式默认启用 `tex_math_gfm` 扩展，把数学公式输出为 `\`\`\`math` 代码块和带反引号的 `$\`...\`$`。
- 思源 Lute 将 `\`\`\`math` 渲染为 `<pre><code>`（代码块），而非公式块 → 公式显示成代码块。

## 关键权衡（为何不能用单一格式直接解决）

- `gfm` 格式：普通表格 → GFM pipe table（Lute 识别为表格）✅，但公式 → `\`\`\`math` 代码块 ❌。
- `markdown` 格式：公式 → `$...$`/`$$...$$`（Lute 识别为公式）✅，但普通表格 → pandoc grid/multiline table（Lute 不识别，渲染成 `<hr>`/标题）❌。

## 修复方案

将 `--to` 改为：

```
markdown+pipe_tables-grid_tables-multiline_tables-simple_tables+tex_math_dollars
```

效果（已用 pandoc 3.9 + 思源 Lute 端到端验证）：

| 内容 | pandoc 输出 | 思源 Lute 渲染 |
|------|-------------|----------------|
| 普通表格（无合并） | GFM pipe table | `<table>` 表格块（含表头，有边框）✅ |
| 复杂表格（含 colspan） | HTML `<table>` | HTML 块，内容完整 + 内联边框 ✅ |
| 行内公式 | `$...$` | `<span class="language-math">` ✅ |
| 块级公式 | `$$...$$` | `<div class="language-math">` ✅ |
| 代码块 / 引用 / 行内代码 | 与 gfm 一致（缩进代码块） | 与 gfm 一致，无回归 ✅ |

## 表格边框（追加需求）

思源 Lute 只把 HTML `<table>` 作为 HTML 块渲染，原生 HTML 表格默认无边框。为提升阅读体验，
在 `utils.ts` 增加 `addTableBorder`，在内置处理链中给 HTML `<table>`/`<th>`/`<td>` 注入内联边框样式。

- 边框用思源 CSS 变量 `--b3-border-color`（跟随主题）+ `#d0d0d0` 兜底（HTML 块作用域拿不到变量时仍显示边框）。
- **非破坏性**：合并（而非覆盖）已有 `style`（如 pandoc 输出的 `text-align`、`colspan`），不影响 GFM 管道表格、普通文本、`<col>` 等。

## 修改文件

| 文件 | 变更 |
|------|------|
| `src/api/kernel-api.ts` | `convertPandoc` 的 `--to` 参数改为兼容表格与公式的组合 |
| `src/utils/utils.ts` | 新增 `addTableBorder`（给 HTML 表格注入内联边框样式） |
| `src/service/importService.ts` | 内置处理链中调用 `addTableBorder` |
| `src/api/kernel-api.spec.ts` | 新增回归测试，固化 `--to` 参数（防止改回 gfm-raw_html / 丢失 tex_math_dollars） |
| `src/utils/utils.spec.ts` | 新增 `addTableBorder` 单元测试（含合并已有 style、非破坏性） |

## 验证

- ✅ `npx vitest run` — 4 个测试文件全部通过（12 个用例，含新增回归测试）
- ✅ `npx vite build` — 30 modules，零错误
- ✅ pandoc 端到端：两个 bug 样例经 Lute 渲染，表格与公式均正确，表格带边框
