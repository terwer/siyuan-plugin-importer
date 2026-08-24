// @vitest-environment node

import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const copyDirMock = vi.fn()
const isPCMock = vi.fn(() => true)
const loadImporterConfigMock = vi.fn(async () => ({
  bundledFnSwitch: false,
  customFnSwitch: false,
}))

vi.mock("../utils/utils", () => ({
  addTableBorder: vi.fn((text: string) => text),
  copyDir: copyDirMock,
  getExports: vi.fn(),
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
