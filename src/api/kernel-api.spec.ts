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

import { beforeEach, describe, expect, it, vi } from "vitest"

// KernelApi 依赖 window.siyuan.config（Constants 取 workspaceDir）与 base-api 的原生 fetch。
// 这里 mock 掉全局 fetch，聚焦断言 convertPandoc 构造的 pandoc 参数 --to 值。
const fetchMock = vi.fn()
;(globalThis as any).fetch = fetchMock

describe("KernelApi.convertPandoc pandoc 参数", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).window = {
      siyuan: {
        config: {
          system: {
            workspaceDir: "/workspace",
            dataDir: "/data",
          },
        },
      },
    }
  })

  it("使用兼容表格与公式的 --to 格式（回归 bug_260824 表格 / bug_250814 公式）", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: async () => ({ code: 0, msg: "", data: null }),
    })

    // 重新导入以拿到本测试文件 mock 后的全局 fetch
    const { default: KernelApi } = await import("./kernel-api")
    const kernelApi = new KernelApi()
    await kernelApi.convertPandoc("./../a.docx", "./../a.md")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("/api/convert/pandoc")
    const params = JSON.parse(init.body)
    const args: string[] = params.args
    const toIndex = args.indexOf("--to")
    expect(toIndex).toBeGreaterThanOrEqual(0)
    const toValue = args[toIndex + 1]

    // 必须同时满足：
    // 1. 含合并单元格(colspan)的复杂表格能输出 HTML <table>（不能是 gfm-raw_html 导致 [TABLE] 占位）
    // 2. 公式能输出 $...$/$$...$$（不能是 gfm 的 tex_math_gfm 导致 ```math 代码块）
    expect(toValue).toContain("tex_math_dollars")
    expect(toValue).not.toContain("gfm-raw_html")
    expect(toValue).toContain("pipe_tables")
    expect(toValue).toContain("markdown")
  })
})
