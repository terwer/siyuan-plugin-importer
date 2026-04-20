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

describe("ImportService.uploadAndConvert", () => {
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
        throw new Error(`Unexpected module request: ${id}`)
      },
    }
  })

  it("在 html 文件包含本地路径时复制同名 _files 目录", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const file = {
      name: "demo.html",
      path: "/Users/test/Desktop/demo.html",
    }

    const result = await ImportService.uploadAndConvert(pluginInstance as any, file)

    expect(copyDirMock).toHaveBeenCalledWith(
      path.join("/Users/test/Desktop", "demo_files"),
      "/workspace/temp/convert/pandoc/demo_files"
    )
    expect(pluginInstance.kernelApi.putFile).toHaveBeenCalledWith("/temp/convert/pandoc/demo.html", file)
    expect(pluginInstance.kernelApi.convertPandoc).toHaveBeenCalledWith("./../demo.html", "./../demo.md")
    expect(result).toEqual({
      toFilePath: "/temp/convert/pandoc/demo.md",
      isMd: false,
    })
  })

  it("在 html 文件缺失 file.path 时跳过资源复制且不中断导入", async () => {
    const { ImportService } = await import("./importService")
    const pluginInstance = createPluginInstance()
    const file = {
      name: "demo.html",
    }

    const result = await ImportService.uploadAndConvert(pluginInstance as any, file)

    expect(copyDirMock).not.toHaveBeenCalled()
    expect(pluginInstance.logger.warn).toHaveBeenCalledWith(
      "skip copying html assets because file.path is unavailable: demo.html"
    )
    expect(pluginInstance.kernelApi.putFile).toHaveBeenCalledWith("/temp/convert/pandoc/demo.html", file)
    expect(pluginInstance.kernelApi.convertPandoc).toHaveBeenCalledWith("./../demo.html", "./../demo.md")
    expect(result).toEqual({
      toFilePath: "/temp/convert/pandoc/demo.md",
      isMd: false,
    })
  })
})

function createPluginInstance() {
  return {
    kernelApi: {
      putFile: vi.fn(async () => ({ code: 0 })),
      convertPandoc: vi.fn(async () => ({ code: 0 })),
      getFile: vi.fn(async () => "converted markdown"),
      saveTextData: vi.fn(async () => ({ code: 0 })),
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
    },
  }
}
