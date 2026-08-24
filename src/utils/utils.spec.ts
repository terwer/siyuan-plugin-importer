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
import { addTableBorder, containsNetAssets } from "./utils"

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
