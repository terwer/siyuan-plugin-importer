// @vitest-environment node

/*
 * Copyright (c) 2023, Terwer . All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Terwer designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Terwer in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
 * or visit www.terwer.space if you need additional information or have any
 * questions.
 */

import { describe, expect, it } from "vitest"
import { addTableBorder, containsNetAssets, removeFootnotes, removePandocMarkup } from "./utils"

describe("containsNetAssets", () => {
  it("识别 markdown 中的网络图片引用", () => {
    expect(containsNetAssets("![alt](https://cdn.example.com/x.png)")).toBe(true)
    expect(containsNetAssets("![alt](http://example.com/a.png)")).toBe(true)
    expect(containsNetAssets("![alt](  https://a.com/x.png)")).toBe(true)
  })

  it("本地图片、普通链接、无图片时不误判", () => {
    expect(containsNetAssets("![alt](./local.png)")).toBe(false)
    expect(containsNetAssets("![alt](C:/Users/me/img.png)")).toBe(false)
    expect(containsNetAssets("[a link](https://example.com)")).toBe(false)
    expect(containsNetAssets("纯文本，没有图片")).toBe(false)
    expect(containsNetAssets("")).toBe(false)
  })
})

describe("addTableBorder", () => {
  it("给 HTML <table> 与 <td>/<th> 注入边框样式", () => {
    const input = `<table>
<tbody>
<tr>
<td>用例名称</td>
<th>标题</th>
</tr>
</tbody>
</table>`
    const output = addTableBorder(input)
    expect(output).toContain('<table style="border-collapse: collapse">')
    // td/th 均带边框
    expect(output).toContain('<td style="border: 1px solid var(--b3-border-color, #d0d0d0); padding: 6px 12px">用例名称</td>')
    expect(output).toContain('<th style="border: 1px solid var(--b3-border-color, #d0d0d0); padding: 6px 12px">标题</th>')
  })

  it("合并而非覆盖已有 style（如 pandoc 输出的 text-align: center）", () => {
    const input = `<td style="text-align: center;">银行账户-账户基本信息-查询</td>`
    const output = addTableBorder(input)
    expect(output).toContain(
      '<td style="text-align: center; border: 1px solid var(--b3-border-color, #d0d0d0); padding: 6px 12px">银行账户-账户基本信息-查询</td>'
    )
    // 原 text-align 仍在
    expect(output).toContain("text-align: center")
  })

  it("不影响普通文本与非表格的 <table 字样", () => {
    const input = `普通段落不应被修改，<table 只是一个示例文本，以及 | 管道 | 表格 |\n| --- |\n| 内容 |`
    const output = addTableBorder(input)
    expect(output).toBe(input)
  })

  it("不影响 <col>/<tr> 等单个 style 目标（只匹配 th|td）", () => {
    const input = `<colgroup><col style="width: 15%" /></colgroup>`
    const output = addTableBorder(input)
    // col 的 style 不被追加边框
    expect(output).toContain('<col style="width: 15%" />')
    expect(output).not.toContain("padding: 6px 12px")
  })

  it("保留 colspan 属性（合并单元格内容）", () => {
    const input = `<td colspan="3" style="text-align: left;">测试准备</td>`
    const output = addTableBorder(input)
    expect(output).toContain('colspan="3')
    expect(output).toContain("text-align: left; border: 1px solid")
  })
})

// 1.10.0 起 pandoc 转换格式改为 markdown，会保留 pandoc 专属语法（属性、围栏 div），
// 思源 Lute 不识别，会原样显示成「源文件代码」（Issue #240）。内置处理函数负责清理。
describe("removePandocMarkup", () => {
  it("清理真实 pandoc markdown 输出中的属性与围栏 div（Issue #240 截图场景）", () => {
    const input = `[]{#ch001.xhtml}

:::::: {#ch001.xhtml_section .section .level1 .unnumbered}
#  {.unnumbered}

::::: part
[\\[COPYRIGHT\\]]{#ch001.xhtml_Copyright.xhtml_magic_copyright_entitle style="font-weight: bold;color:rgb(120, 120, 120);font-family:'PingFang SC';display:block;align:center;"}

[\\[书名： 逃避自由（弗洛姆作品系列）\\]]{#ch001.xhtml_Copyright.xhtml_bookname style="font-size:16px;font-family:'PingFang SC';"}

:::: {#ch001.xhtml_ch1 .section .level1 .chapter}
# 第一章 自由 {.chapter}

正文开始，这里是脚注标记^[\\[16\\]](#ch001.xhtml_footnote_16){#ch001.xhtml_fnref16}^，继续正文。

参见[第一章](#ch001.xhtml_ch1)。

![封面](media/file0.png){style="width:50.0%"}

::: footnotes

------------------------------------------------------------------------

1.  ::: {#ch001.xhtml_footnote_16}
    这是一个脚注内容。
    :::
:::
::::
:::::
::::::`

    const output = removePandocMarkup(input)

    // 不再出现 pandoc 属性源码（颜色已转成内联 span，不再以 IAL 源码出现）
    expect(output).not.toContain("{#")
    expect(output).not.toContain("{.")
    expect(output).not.toContain("font-weight")
    expect(output).not.toContain("font-family")
    expect(output).not.toContain("display:block")
    // 不再出现围栏 div 标记
    expect(output).not.toMatch(/^[ \t]*:{3,}/m)
    // 内容保留（属性只去掉，不吞正文；行内 span 去掉外层方括号与属性）
    expect(output).toContain("\\[COPYRIGHT\\]")
    expect(output).toContain("\\[书名： 逃避自由（弗洛姆作品系列）\\]")
    expect(output).toContain("# 第一章 自由")
    expect(output).toContain("正文开始，这里是脚注标记")
    expect(output).toContain("参见[第一章](#ch001.xhtml_ch1)。")
    expect(output).toContain("![封面](media/file0.png)")
    expect(output).toContain("这是一个脚注内容。")
    // 截图里灰色版权行的文字颜色不再被丢弃
    expect(output).toContain('<span style="color: rgb(120, 120, 120)">\\[COPYRIGHT\\]</span>')

    // 内置处理链：清理属性后再去脚注，上标脚注标记不会残留
    expect(removeFootnotes(output)).not.toContain("^[\\[16\\]](#")
  })

  it("链接上的颜色转成包住链接的内联 span，图片属性仍只去掉", () => {
    expect(removePandocMarkup('[a](#anchor){#id style="color:red"}')).toBe(
      '<span style="color: red">[a](#anchor)</span>'
    )
    expect(removePandocMarkup('![图](a.png){width="50%"}')).toBe("![图](a.png)")
    expect(removePandocMarkup('![图](a.png)')).toBe("![图](a.png)")
  })

  it("去掉空锚点与标题属性", () => {
    expect(removePandocMarkup("[]{#ch001.xhtml}\n\n正文")).toBe("\n\n正文")
    expect(removePandocMarkup("## 标题 {#id .class}")).toBe("## 标题")
  })

  it("保留文字颜色：span 上的 color / background-color 转成思源可识别的内联 span", () => {
    expect(removePandocMarkup('[红]{#id style="color:#e03e2d"}')).toBe('<span style="color: #e03e2d">红</span>')
    expect(removePandocMarkup('[黄底]{style="background-color:yellow;color:black"}')).toBe(
      '<span style="background-color: yellow; color: black">黄底</span>'
    )
  })

  it("只保留颜色，丢弃字体、字号等思源 markdown 无法保留的属性", () => {
    const input = "[文本]{#id style=\"font-family:'PingFang SC';color:rgb(224, 62, 45);font-size:12px\"}"
    expect(removePandocMarkup(input)).toBe('<span style="color: rgb(224, 62, 45)">文本</span>')
  })

  it("嵌套 span 的颜色全部保留（内层先处理，外层不留源码）", () => {
    const input = '[外层 [内层]{style="color:#00b050"} 回到外层]{style="color:#e03e2d"}'
    expect(removePandocMarkup(input)).toBe(
      '<span style="color: #e03e2d">外层 <span style="color: #00b050">内层</span> 回到外层</span>'
    )
  })

  it("无颜色的 span 仍只保留文本（Issue #240 回归）", () => {
    expect(removePandocMarkup('[COPYRIGHT]{#id style="font-weight:bold"}')).toBe("COPYRIGHT")
  })

  it("标题上的颜色转成标题内的 span", () => {
    expect(removePandocMarkup('## 标题 {style="color:#00b050"}')).toBe('## <span style="color: #00b050">标题</span>')
  })

  it("强调文字整体带颜色时，颜色 span 包住强调标记（避免思源丢色）", () => {
    expect(removePandocMarkup('**[加粗红]{style="color:red"}**')).toBe('<span style="color: red">**加粗红**</span>')
    expect(removePandocMarkup('*[斜体蓝]{style="color:blue"}*')).toBe('<span style="color: blue">*斜体蓝*</span>')
    expect(removePandocMarkup('~~[删除线]{style="color:gray"}~~')).toBe('<span style="color: gray">~~删除线~~</span>')
  })

  it("链接文字整体带颜色时，颜色 span 包住链接（避免思源丢色）", () => {
    expect(removePandocMarkup('[<span style="color: #c00000">链接</span>](https://example.com)')).toBe(
      '<span style="color: #c00000">[链接](https://example.com)</span>'
    )
    expect(removePandocMarkup('[[链接](https://example.com)]{style="color:#c00000"}')).toBe(
      '<span style="color: #c00000">[链接](https://example.com)</span>'
    )
  })

  it("不误伤普通 markdown（管道表格、公式、普通链接、普通大括号文本）", () => {
    const input = `| a | b |
| --- | --- |
| 1 | 2 |

行内公式 $x^2$，块公式：

$$
a^2 + b^2 = c^2
$$

普通链接 [思源](https://b3log.org)，代码片段 \`const a = {b: 1}\`。`
    expect(removePandocMarkup(input)).toBe(input)
  })
})

describe("removeFootnotes", () => {
  it("去掉 pandoc markdown 输出的上标脚注链接（含链接属性）", () => {
    // markdown 输出：`^[\[16\]](#a.xhtml_footnote_16)^`，属性未清理时也不能漏
    expect(removeFootnotes("正文^[\\[16\\]](#ch001.xhtml_footnote_16){#ch001.xhtml_fnref16}^后续")).toBe("正文后续")
    expect(removeFootnotes("正文^[\\[16\\]](#ch001.xhtml_footnote_16)^后续")).toBe("正文后续")
  })

  it("兼容历史 gfm 输出的括号形式", () => {
    expect(removeFootnotes("标题^([\\[16\\]](#part0019.html#footnote_16))")).toBe("标题")
    expect(removeFootnotes("标题^([16](#part0019.html#footnote_16))")).toBe("标题")
  })

  it("不影响普通上标与普通链接", () => {
    const input = "x^2^ 与上标^[注](#note)^，以及 [普通链接](https://example.com)"
    // ^[注](#note)^ 是普通上标链接（无脚注序号），保留；x^2^ 保留
    expect(removeFootnotes(input)).toBe(input)
  })
})
