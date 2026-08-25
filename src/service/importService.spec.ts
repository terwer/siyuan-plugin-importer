// @vitest-environment node

import path from "node:path"
import * as nodeFs from "node:fs"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { beforeEach, describe, expect, it, vi } from "vitest"

const copyDirMock = vi.fn()
const isPCMock = vi.fn(() => true)
const getExportsMock = vi.fn()
const containsNetAssetsMock = vi.fn()
const showMessageMock = vi.fn()
const loadImporterConfigMock = vi.fn(async () => ({
  bundledFnSwitch: false,
  customFnSwitch: false,
}))

vi.mock("siyuan", () => ({
  showMessage: showMessageMock,
}))

vi.mock("../utils/utils", () => ({
  addTableBorder: vi.fn((text: string) => text),
  containsNetAssets: containsNetAssetsMock,
  copyDir: copyDirMock,
  getExports: getExportsMock,
  isPC: isPCMock,
  removeEmptyLines: vi.fn((text: string) => text),
  removeFootnotes: vi.fn((text: string) => text),
  removeLinks: vi.fn((text: string) => text),
  replaceImagePath: vi.fn((text: string) => text),
}))

vi.mock("../store/config", () => ({
  loadImporterConfig: loadImporterConfigMock,
}))

let getFileCalls = 0

describe("ImportService.uploadAndConvert", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getFileCalls = 0

    ;(globalThis as any).window = {
      siyuan: {
        config: {
          system: {
            workspaceDir: "/workspace",
            dataDir: "/data",
          },
        },
      },
      require: (id: string) => {
        if (id === "path") {
          return path
        }
        throw new Error(`Unexpected module request: ${id}`)
      },
    }
  })

  it("md 文件直接上传，不转换，返回 md 路径", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const file = { name: "demo.md" }

    const result = await ImportService.uploadAndConvert(pluginInstance as any, file)

    expect(pluginInstance.kernelApi.putFile).toHaveBeenCalledWith("/temp/convert/pandoc/demo.md", file)
    expect(pluginInstance.kernelApi.convertPandoc).not.toHaveBeenCalled()
    expect(result).toBe("/temp/convert/pandoc/demo.md")
  })

  it("docx 上传并转换，返回 md 路径", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const file = { name: "demo.docx" }

    const result = await ImportService.uploadAndConvert(pluginInstance as any, file)

    expect(pluginInstance.kernelApi.putFile).toHaveBeenCalledWith("/temp/convert/pandoc/demo.docx", file)
    expect(pluginInstance.kernelApi.convertPandoc).toHaveBeenCalledWith("./../demo.docx", "./../demo.md")
    expect(pluginInstance.kernelApi.saveTextData).toHaveBeenCalledWith("demo.md", "converted markdown")
    expect(result).toBe("/temp/convert/pandoc/demo.md")
  })

  it("转换失败返回 null", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    pluginInstance.kernelApi.convertPandoc.mockResolvedValueOnce({ code: -1, msg: "convert failed" })
    const file = { name: "demo.docx" }

    const result = await ImportService.uploadAndConvert(pluginInstance as any, file)

    expect(result).toBeNull()
  })

  it("上传失败返回 null", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    pluginInstance.kernelApi.putFile.mockResolvedValueOnce({ code: -1, msg: "upload failed" })
    const file = { name: "demo.md" }

    const result = await ImportService.uploadAndConvert(pluginInstance as any, file)

    expect(result).toBeNull()
  })

  // 复现 bug A：导入 .md 文件时不会执行自定义处理函数（customFnSwitch 失效）。
  // 期望行为：md 也应走文本处理，调用自定义函数。当前实现 md 分支 early-return，
  // 既不读取配置也不调用 getExports，故本用例失败 —— 证实「开启自定义处理函数后导入 md 无反馈」。
  it("复现 bug：导入 .md 时执行自定义处理函数（当前失效）", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const customFnSpy = vi.fn((text: string) => text.replace("OLD", "NEW"))
    getExportsMock.mockReturnValue(customFnSpy)
    loadImporterConfigMock.mockResolvedValueOnce({
      bundledFnSwitch: false,
      customFnSwitch: true,
      customFn: "module.exports = customFn",
    })
    const file = { name: "demo.md", text: async () => "content OLD" }

    await ImportService.uploadAndConvert(pluginInstance as any, file)

    // 期望：读取配置并执行自定义函数 —— 当前 md 分支提前 return，二者均未发生
    expect(loadImporterConfigMock).toHaveBeenCalled()
    expect(getExportsMock).toHaveBeenCalledTimes(1)
    expect(customFnSpy).toHaveBeenCalled()
    expect(customFnSpy).toHaveBeenCalledWith("content OLD")
    // 自定义函数已作用于 md 文本并写回上传
    expect(pluginInstance.kernelApi.putFile).toHaveBeenCalledWith(
      "/temp/convert/pandoc/demo.md",
      expect.objectContaining({ name: "demo.md" })
    )
  })

  // 复现 bug B：md 里的远程 http(s) 图片不会下载并上传到 assets，导入后仍是外链。
  // 采用用户友好方案：检测到网络图片后，导入完成由 singleImport/multiImport 弹窗提示
  // 用户点文档右上角「···」→「网络资源文件转换本地」用思源内置功能下载（见下方 singleImport 的用例）。
  it.skip("复现 bug：md 中的远程 https 图片不在导入时下载到 assets（当前失效）", async () => {
    // 旧方案（导入时自行下载远程图片）已废弃，改为思源内置「网络资源文件转换本地」+ 提示；
    // 请在真实思源环境验证提示引导是否到位。
  })
})

describe("ImportService.singleImport 网络图片提示", () => {
  beforeEach(() => {
    vi.resetModules()
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
      require: (id: string) => {
        if (id === "path") {
          return path
        }
        if (id === "fs") {
          return {
            existsSync: () => true,
            promises: { rm: async () => {} },
            readFileSync: () => "# hello\n![img](https://cdn.example.com/x.png)",
          }
        }
        throw new Error(`Unexpected module request: ${id}`)
      },
    }
  })

  it("导入含网络图片的文档后，弹窗提示用户用思源内置功能转换本地", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    pluginInstance.i18n.netAssetsToLocalTip = "网络图片提示"
    pluginInstance.i18n.msgImportSuccess = "导入成功"
    pluginInstance.kernelApi.importStdMd.mockResolvedValue({ code: 0 })
    containsNetAssetsMock.mockReturnValue(true)

    await ImportService.singleImport(pluginInstance as any, "/temp/convert/pandoc/a.md", "notebook-id")

    expect(showMessageMock).toHaveBeenCalledWith("网络图片提示", 8000, "info")
  })

  it("不含网络图片的文档不弹网络提示", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    pluginInstance.i18n.netAssetsToLocalTip = "网络图片提示"
    pluginInstance.i18n.msgImportSuccess = "导入成功"
    pluginInstance.kernelApi.importStdMd.mockResolvedValue({ code: 0 })
    containsNetAssetsMock.mockReturnValue(false)

    await ImportService.singleImport(pluginInstance as any, "/temp/convert/pandoc/a.md", "notebook-id")

    expect(showMessageMock).not.toHaveBeenCalledWith("网络图片提示", 8000, "info")
  })
})

describe("ImportService.multiImport", () => {
  beforeEach(() => {
    vi.resetModules()
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
      require: (id: string) => {
        if (id === "path") {
          return path
        }
        if (id === "fs") {
          return {
            existsSync: () => false,
            readdirSync: () => ["a.md", "b.markdown", "c.docx", "assets"],
          }
        }
        throw new Error(`Unexpected module request: ${id}`)
      },
    }
  })

  it("循环调用公共原子逻辑导入每个 md 文件", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    pluginInstance.kernelApi.importStdMd.mockResolvedValue({ code: 0 })

    await ImportService.multiImport(pluginInstance as any, "notebook-id")

    expect(pluginInstance.kernelApi.importStdMd).toHaveBeenCalledTimes(2)
    expect(pluginInstance.kernelApi.importStdMd).toHaveBeenCalledWith(
      path.join("/workspace/temp/export/convert/pandoc", "a.md"),
      "notebook-id",
      "/"
    )
    expect(pluginInstance.kernelApi.importStdMd).toHaveBeenCalledWith(
      path.join("/workspace/temp/export/convert/pandoc", "b.markdown"),
      "notebook-id",
      "/"
    )
    expect(pluginInstance.kernelApi.openNotebook).toHaveBeenCalledWith("notebook-id")
  })
})

function createPluginInstance() {
  const getFile = vi.fn(async () => {
    // 第 1 次调用为转换产物唯一化检查（返回 null 表示目标不存在），
    // 之后为读取转换结果（返回 md 内容）
    getFileCalls++
    return getFileCalls <= 1 ? null : "converted markdown"
  })
  return {
    kernelApi: {
      putFile: vi.fn(async () => ({ code: 0 })),
      convertPandoc: vi.fn(async () => ({ code: 0 })),
      getFile,
      saveTextData: vi.fn(async () => ({ code: 0 })),
      importStdMd: vi.fn(async () => ({ code: 0 })),
      openNotebook: vi.fn(async () => ({ code: 0 })),
      reloadFiletree: vi.fn(async () => ({ code: 0 })),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    i18n: {},
  }
}

describe("ImportService.migrateMdImagesToAssets", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  // 借助真实 fs 建临时源目录与 dataDir，验证通用迁移（上传到 md 同目录 + 相对引用改写）
  function setupWindow(srcRoot: string, dataDir: string) {
    void srcRoot
    void dataDir
    ;(globalThis as any).window = {
      siyuan: { config: { system: { workspaceDir: "/data", dataDir } } },
      require: (id: string) => {
        if (id === "path") return path
        if (id === "fs") return nodeFs
        if (id === "crypto") return require("node:crypto")
        throw new Error(`Unexpected module request: ${id}`)
      },
    }
  }

  it("把相对路径同名图片上传到 md 同目录并改写为相对引用（父目录 hash 去重）", async () => {
    const srcRoot = mkdtempSync(path.join(tmpdir(), "mig-src-"))
    nodeFs.mkdirSync(path.join(srcRoot, "a"), { recursive: true })
    nodeFs.mkdirSync(path.join(srcRoot, "b"), { recursive: true })
    writeFileSync(path.join(srcRoot, "a", "photo.png"), "AAA")
    writeFileSync(path.join(srcRoot, "b", "photo.png"), "BBB")

    setupWindow(srcRoot, mkdtempSync(path.join(tmpdir(), "mig-data-")))
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const md = "![A](a/photo.png)\n![B](b/photo.png)\n![net](https://x.com/a.png)\n"

    const result = await (ImportService as any).migrateMdImagesToAssets(pluginInstance, md, [srcRoot])

    const putFileMock = pluginInstance.kernelApi.putFile
    // 两个同名图上传到 md 同目录（temp/convert/pandoc），且文件名不同（父目录 hash 区分）
    expect(putFileMock).toHaveBeenCalledTimes(2)
    const paths = putFileMock.mock.calls.map((c: any[]) => c[0])
    expect(paths.every((p) => /^\/temp\/convert\/pandoc\/photo_[0-9a-f]{12}\.png$/.test(p))).toBe(true)
    expect(new Set(paths).size).toBe(2)
    // 改写为相对路径（非 assets/），网络图原样
    expect(result.rewritten).toMatch(/!\[A\]\(photo_[0-9a-f]{12}\.png\)/)
    expect(result.rewritten).toMatch(/!\[B\]\(photo_[0-9a-f]{12}\.png\)/)
    expect(result.rewritten).not.toContain("assets/photo_")
    expect(result.rewritten).toContain("![net](https://x.com/a.png)")
    expect(result.count).toBe(2)
  })

  it("绝对路径被上传到 md 同目录；已 assets 与找不到的保持不动", async () => {
    const srcRoot = mkdtempSync(path.join(tmpdir(), "mig-src2-"))
    const absImg = path.join(srcRoot, "abs.png")
    writeFileSync(absImg, "ABS")

    setupWindow(srcRoot, mkdtempSync(path.join(tmpdir(), "mig-data2-")))
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const md = `![abs](${absImg})\n![alread](assets/keep.png)\n![missing](nope.png)\n`

    const result = await (ImportService as any).migrateMdImagesToAssets(pluginInstance, md, [srcRoot])

    const putFileMock = pluginInstance.kernelApi.putFile
    expect(putFileMock).toHaveBeenCalledTimes(1)
    expect(putFileMock.mock.calls[0][0]).toMatch(/^\/temp\/convert\/pandoc\/abs_[0-9a-f]{12}\.png$/)
    expect(result.rewritten).toContain("![alread](assets/keep.png)") // 已 assets 不动
    expect(result.rewritten).toContain("![missing](nope.png)") // 找不到不动
    expect(result.rewritten).toMatch(/!\[abs\]\(abs_[0-9a-f]{12}\.png\)/)
    expect(result.rewritten).not.toContain("assets/abs_")
    expect(result.count).toBe(1)
  })

  it("同一图片多处引用只上传一次", async () => {
    const srcRoot = mkdtempSync(path.join(tmpdir(), "mig-src3-"))
    writeFileSync(path.join(srcRoot, "im.png"), "IM")

    setupWindow(srcRoot, mkdtempSync(path.join(tmpdir(), "mig-data3-")))
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const md = "![x](im.png)\n![y](im.png)\n"

    const result = await (ImportService as any).migrateMdImagesToAssets(pluginInstance, md, [srcRoot])

    expect(pluginInstance.kernelApi.putFile).toHaveBeenCalledTimes(1) // 同一图只上传一次
    expect(result.rewritten).toMatch(/!\[x\]\(im_[0-9a-f]{12}\.png\)/)
    expect(result.rewritten).toMatch(/!\[y\]\(im_[0-9a-f]{12}\.png\)/)
    expect(result.count).toBe(2) // 两处引用都改写
  })
})
