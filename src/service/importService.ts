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

import { workspaceDir } from "../Constants"
import { showMessage } from "siyuan"
import ImporterPlugin from "../index"
import {
  addTableBorder,
  containsNetAssets,
  copyDir,
  getExports,
  removeEmptyLines,
  removeFootnotes,
  removeLinks,
  replaceImagePath,
} from "../utils/utils"
import { loadImporterConfig } from "../store/config"

/**
 * Safe temp directory that the kernel allows importing from (temp/export/*).
 * Since 3.7.3 the kernel rejects paths under temp/convert, so files must be
 * copied here before import.
 */
const SAFE_PANDOC_DIR = `${workspaceDir}/temp/export/convert/pandoc`

export class ImportService {
  /**
   * Upload and convert a source file to Markdown (including asset preparation:
 * resources referenced by md files and the _files folder of html files).
   *
   * @param pluginInstance
   * @param file - the source file selected by the user
   * @returns the md file path under /temp/convert/pandoc, or null on failure (error already shown)
   */
  public static async uploadAndConvert(pluginInstance: ImporterPlugin, file: File): Promise<string | null> {
    const { fromFilename, originalFilename, ext } = ImportService.getFileMeta(file)
    const srcDir = ImportService.getSourceDir(file)

    // md files are uploaded directly without conversion; upload referenced local assets first
    if (ext === "md") {
      const toFilePath = `/temp/convert/pandoc/${originalFilename}.md`
      const importConfig = await loadImporterConfig(pluginInstance)

      // 未启用图片迁移时，保留原来的「同目录相对引用图片上传到 temp」行为。
      // 启用导入图片迁移后，由 migrateMdLocalImagesToAssets 统一处理（相对+绝对路径，复制进 assets）。
      if (!importConfig.imgPathMigrateSwitch && srcDir) {
        await ImportService.uploadMdReferencedAssets(pluginInstance, file, srcDir)
      }

      // md 直接上传不转换。历史上这里提前 return，导致内置处理与自定义处理函数都不执行，
      // 用户开启自定义处理函数后导入 md 没有任何反馈。此处仅执行自定义处理，
      // 不跑内置处理，避免改动原始 md 内容。
      if (importConfig.customFnSwitch) {
        pluginInstance.logger.warn("Using custom handler process text (md)")
        try {
          const mdText = (await file.text()) ?? ""
          file = new File([getExports(importConfig.customFn)(mdText)], file.name)
        } catch (e) {
          showMessage(`${pluginInstance.i18n.customFnHandlerError} ${e.toString()}`, 5000, "error")
          throw e
        }
      }

      // 导入图片迁移：把 md 引用的本地图片（相对+绝对路径）复制到 md 同目录（temp/convert/pandoc）、
      // 引用改写为相对路径 <文件名>_<父目录hash>.<ext>，交由 importStdMd lift 进 assets 并注册，保证可显示。
      // 同名图片自动去重。默认关闭。
      if (importConfig.imgPathMigrateSwitch) {
        const mdText = (await file.text()) ?? ""
        const result = await ImportService.migrateMdImagesToAssets(
          pluginInstance,
          mdText,
          srcDir ? [srcDir] : []
        )
        if (result.count > 0) {
          pluginInstance.logger.info(`migrate ${result.count} md image(s) to assets`)
          file = new File([result.rewritten], file.name)
        }
      }

      pluginInstance.logger.info(`upload md file to ${toFilePath}`)
      const uploadResult = await pluginInstance.kernelApi.putFile(toFilePath, file)
      if (uploadResult.code !== 0) {
        showMessage(`${pluginInstance.i18n.msgFileUploadError}：${uploadResult.msg}`, 7000, "error")
        return null
      }
      return toFilePath
    }

    // html: upload the {name}_files asset folder (single import gets the source path via
    // webUtils, batch import already uploads it from the UI), and rewrite relative asset
    // references with a ../ prefix because the kernel runs pandoc in a random
    // temp/convert/pandoc/{hash} subdirectory, so references must go up one level
    // to reach the assets under the pandoc directory
    if (ext === "html") {
      if (srcDir) {
        const path = window.require("path")
        await ImportService.uploadDirTreeFromPath(
          pluginInstance,
          path.join(srcDir, `${originalFilename}_files`),
          `${originalFilename}_files`
        )
      }
      const htmlText = await file.text()
      const fixedHtml = htmlText.replace(/(src|href)\s*=\s*["']([^"']*)["']/gi, (match, attr, url) => {
        const u = url.trim()
        if (/^(https?:|data:|#|mailto:|javascript:)/i.test(u)) {
          return match
        }
        if (u.startsWith("/") || u.startsWith("./") || u.startsWith("../")) {
          return match
        }
        return `${attr}="../${u}"`
      })
      if (fixedHtml !== htmlText) {
        file = new File([fixedHtml], file.name)
      }
    }

    // Other formats: upload the source file, convert with pandoc, process the text, then save the md
    // Use the sanitized name for the source file path too, since the kernel rejects
    // invalid file names on putFile
    const fromFilePath = `/temp/convert/pandoc/${originalFilename}.${ext}`
    pluginInstance.logger.info(`upload file from ${fromFilePath} to /temp/convert/pandoc`)
    const uploadResult = await pluginInstance.kernelApi.putFile(fromFilePath, file)
    if (uploadResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgFileUploadError}：${uploadResult.msg}`, 7000, "error")
      return null
    }

    // Make the converted output name unique: when a md file with the same name already
    // exists, append a sequence number (a.docx + a.md → a-docx-1.md) so the converted
    // output never overwrites an existing user md file
    let finalFilename = `${originalFilename}.md`
    let n = 0
    let targetExists = true
    while (targetExists) {
      if (n > 0) {
        finalFilename = `${originalFilename}-${ext}-${n}.md`
      }
      const existing = await pluginInstance.kernelApi.getFile(`/temp/convert/pandoc/${finalFilename}`, "text")
      targetExists = existing !== null
      n++
    }
    const toFilePath = `/temp/convert/pandoc/${finalFilename}`

    // Convert the file
    pluginInstance.logger.info(`convertPandoc from [./../${originalFilename}.${ext}] to [./../${finalFilename}]`)
    const convertResult = await pluginInstance.kernelApi.convertPandoc(
      `./../${originalFilename}.${ext}`,
      `./../${finalFilename}`
    )
    if (convertResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgFileConvertError}：${convertResult.msg}`, 7000, "error")
      return null
    }

    // Read the converted md text
    let mdText = (await pluginInstance.kernelApi.getFile(toFilePath, "text")) ?? ""
    if (mdText === "") {
      showMessage(pluginInstance.i18n.msgFileConvertEmpty, 7000, "error")
      return null
    }

    // Built-in text processing
    const importConfig = await loadImporterConfig(pluginInstance)
    if (importConfig.bundledFnSwitch !== false) {
      pluginInstance.logger.info("Using bundled handler process text")
      mdText = removeLinks(mdText)
      mdText = removeEmptyLines(mdText)
      mdText = replaceImagePath(mdText)
      mdText = removeFootnotes(mdText)
      // 给 pandoc 输出的 HTML 表格注入边框（复杂表格无法用管道表格表示，被渲染为 HTML 块，默认无边框）
      mdText = addTableBorder(mdText)
    }

    // Custom text processing
    if (importConfig.customFnSwitch) {
      pluginInstance.logger.warn("Using custom handler process text")
      try {
        mdText = getExports(importConfig.customFn)(mdText)
      } catch (e) {
        showMessage(`${pluginInstance.i18n.customFnHandlerError} ${e.toString()}`, 5000, "error")
        throw e
      }
    }

    // Save the processed final text
    await pluginInstance.kernelApi.saveTextData(finalFilename, mdText)
    return toFilePath
  }

  /**
   * Import a single file.
   *
   * @param pluginInstance
   * @param toFilePath - the md file path under /temp/convert/pandoc (returned by uploadAndConvert)
   * @param toNotebookId
   */
  public static async singleImport(pluginInstance: ImporterPlugin, toFilePath: string, toNotebookId: string) {
    await ImportService.copyToSafePath()
    const mdResult = await ImportService.importMdFile(pluginInstance, toNotebookId, toFilePath)
    if (mdResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}=>${toFilePath}`, 7000, "error")
    } else if (mdResult.hasNetAssets) {
      // 网络图片无法自动定位文档 id 转换，提示用户用思源内置功能（文档右上角 ··· → 网络资源文件转换本地）
      showMessage(pluginInstance.i18n.netAssetsToLocalTip, 8000, "info")
    }
    await pluginInstance.kernelApi.openNotebook(toNotebookId)
    await ImportService.refreshUI(pluginInstance)
    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  /**
   * Batch import: orchestrates only, calling the shared atomic single-file import in a loop.
   *
   * @param pluginInstance
   * @param toNotebookId
   */
  public static async multiImport(pluginInstance: ImporterPlugin, toNotebookId: string) {
    await ImportService.copyToSafePath()
    const fs = window.require("fs")

    let files: string[]
    try {
      files = fs.readdirSync(SAFE_PANDOC_DIR)
    } catch (e) {
      showMessage(`${pluginInstance.i18n.msgReadDirFailed}：${e.toString()}`, 7000, "error")
      return
    }

    const mdFiles = files.filter((f) => /\.(md|markdown)$/i.test(f))
    if (mdFiles.length === 0) {
      showMessage(pluginInstance.i18n.msgFileNotEmpty, 7000, "error")
      return
    }

    let failCount = 0
    let hasNetAssets = false
    for (const filename of mdFiles) {
      const mdResult = await ImportService.importMdFile(
        pluginInstance,
        toNotebookId,
        `/temp/convert/pandoc/${filename}`
      )
      if (mdResult.code !== 0) {
        failCount++
        pluginInstance.logger.error(`import ${filename} failed: ${mdResult.msg}`)
      } else if (mdResult.hasNetAssets) {
        hasNetAssets = true
      }
    }

    if (failCount > 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}：${failCount}/${mdFiles.length}`, 7000, "error")
    } else if (hasNetAssets) {
      showMessage(pluginInstance.i18n.netAssetsToLocalTip, 8000, "info")
    }
    await pluginInstance.kernelApi.openNotebook(toNotebookId)
    await ImportService.refreshUI(pluginInstance)
    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  /**
   * Clean up the temp directories (convert dir and safe dir) - the only cleanup entry.
   * Shared by the manual page cleanup and the pre-import cleanup; no duplicated
   * implementations.
   *
   * @param pluginInstance
   */
  public static async cleanTemp(pluginInstance: ImporterPlugin) {
    await pluginInstance.kernelApi.removeFile("/temp/convert/pandoc")
    await pluginInstance.kernelApi.removeFile("/temp/export/convert/pandoc")
  }

  /**
   * Batch import: recursively upload a directory tree (handle) to the temp directory,
   * keeping relative paths. Convert sources are handled by the UI loop calling
   * uploadAndConvert; all other files are uploaded as assets.
   *
   * @param pluginInstance
   * @param dirHandle - showDirectoryPicker 返回的目录句柄
   * @param tempDir - 目标临时目录（相对 /temp/convert/pandoc）
   */
  public static async uploadDirTreeFromHandle(
    pluginInstance: ImporterPlugin,
    dirHandle: any,
    tempDir: string
  ) {
    const entries = await dirHandle.values()
    for await (const entry of entries) {
      if (entry.kind === "directory") {
        await ImportService.uploadDirTreeFromHandle(pluginInstance, entry, `${tempDir}/${entry.name}`)
      } else {
        const file = await entry.getFile()
        const relPath = `${tempDir}/${file.name}`
        const uploadResult = await pluginInstance.kernelApi.putFile(`/temp/convert/pandoc/${relPath}`, file)
        if (uploadResult.code !== 0) {
          pluginInstance.logger.warn(`upload asset failed: ${relPath}: ${uploadResult.msg}`)
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////
  // private function
  //////////////////////////////////////////////////////////////////

  /**
   * 公共原子逻辑：将 SAFE_PANDOC_DIR 中的单个 md 导入指定笔记本。
   * 单文件导入与批量导入循环共用，禁止各自实现。
   *
   * 注意：localPath 必须使用 Windows 原生路径（反斜杠），否则内核 filepath.WalkDir
   * 拼接的子路径与 strings.TrimPrefix 分隔符不匹配，会导致目录导入死循环。
   *
   * @param pluginInstance
   * @param toNotebookId
   * @param toFilePath - the md file path under /temp/convert/pandoc
   */
  private static async importMdFile(pluginInstance: ImporterPlugin, toNotebookId: string, toFilePath: string) {
    const filename = toFilePath.split("/").pop() || toFilePath
    const path = window.require("path")
    const localPath = path.join(SAFE_PANDOC_DIR, filename)

    // 判断导入内容是否包含网络图片，用于导入完成后提示用户用思源内置功能转换本地（时序：文档存在后才能转换）
    let hasNetAssets = false
    try {
      const fs = window.require("fs")
      hasNetAssets = containsNetAssets(fs.readFileSync(localPath, "utf-8"))
    } catch (e) {
      // 读取失败时忽略，不影响导入
    }

    const mdResult = await pluginInstance.kernelApi.importStdMd(localPath, toNotebookId, `/`)
    return { ...mdResult, hasNetAssets }
  }

  /**
   * 通用图片迁移：把 md 文本里引用的本地图片（相对 / 绝对路径）复制到 md 同目录
   * （/temp/convert/pandoc，经 copyToSafePath 复制到 SAFE_PANDOC_DIR），并把引用改写成
   * **相对路径** `<文件名>_<父目录路径hash>.<ext>`。
   *
   * 这是「能显示」的关键：内核 importStdMd 只会对「md 同目录内的相对路径」图片做
   * lift（拷贝进 data/assets 并注册、改写为 assets/<名称>）。绝对路径或不在 md 目录内的
   * 图片会被 importStdMd 直接跳过，不会注册、也就无法显示。因此不能提前拷进 data/assets
   * 再用 assets/ 引用，而必须放到 md 同目录用相对引用，让内核自己 lift。
   *
   * 该方法与来源格式无关（md / docx / pdf / html 等经转换后得到的 md 文本均可使用）。
   * 用「文件名 + 父目录路径 hash」命名，保留可读文件名、同名图片天然去重、同一图多处引用只复制一次。
   * 网络图、锚点、siyuan:// 与已是 assets/ 的引用不动。
   *
   * @param pluginInstance
   * @param mdText - 待处理的 md 文本
   * @param bases - 解析相对路径的基准目录数组（按顺序尝试）；绝对路径直接使用
   * @returns 改写后的 md 文本与迁移的图片数
   */
  private static async migrateMdImagesToAssets(
    pluginInstance: ImporterPlugin,
    mdText: string,
    bases: string[]
  ): Promise<{ rewritten: string; count: number }> {
    const path = window.require("path")
    const fs = window.require("fs")
    const crypto = window.require("crypto")

    const IMG_RE = /!\[([^\]]*)\]\(\s*<?([^)>]+?)>?\s*\)/g
    const srcToTarget = new Map<string, string>() // srcAbs -> temp 相对路径（posix）

    const isIgnored = (p: string) =>
      /^(https?:|ftp:|data:|mailto:|#|siyuan:\/\/|\/\/)/i.test(p) ||
      p.startsWith("assets/") ||
      p.startsWith("data/assets/")
    const normalizeRef = (p: string) =>
      p.replace(/^<(.+)>$/, "$1").replace(/^["']|["']$/g, "").split("#")[0].trim()

    // 解析本地图片绝对路径：绝对路径直接用；相对路径按 bases 顺序尝试（找到真实存在的文件）
    const resolveLocal = (ref: string): string | null => {
      let fixed = ref
      try {
        fixed = decodeURIComponent(fixed)
      } catch (_e) {
        // keep as-is
      }
      const cleaned = normalizeRef(fixed)
      if (!cleaned) return null
      if (path.isAbsolute(cleaned)) {
        const a = path.normalize(cleaned)
        return fs.existsSync(a) ? a : null
      }
      for (const base of bases) {
        const a = path.resolve(base, cleaned)
        if (fs.existsSync(a)) return a
      }
      return null
    }

    const hashParent = (srcAbs: string): string => {
      const parent = path.dirname(srcAbs).split(path.sep).join("/")
      try {
        return crypto.createHash("sha256").update(parent).digest("hex").slice(0, 12)
      } catch (_e) {
        let h = 5381
        for (let i = 0; i < parent.length; i++) h = ((h << 5) + h + parent.charCodeAt(i)) | 0
        return (h >>> 0).toString(16)
      }
    }
    // 放到 md 同目录（/temp/convert/pandoc）的相对文件名（扁平、无目录穿越），供 importStdMd lift
    const relFor = (srcAbs: string): string => {
      const base = path.basename(srcAbs)
      const ext = path.extname(base)
      const stem = ext ? base.slice(0, -ext.length) : base
      return `${stem}_${hashParent(srcAbs)}${ext}`
    }

    let m: RegExpExecArray | null
    while ((m = IMG_RE.exec(mdText)) !== null) {
      const ref0 = m[2].trim()
      if (isIgnored(ref0)) continue
      const srcAbs = resolveLocal(ref0)
      if (!srcAbs) {
        pluginInstance.logger.warn(`md image migrate: not found, skip: ${ref0}`)
        continue
      }
      if (srcToTarget.has(srcAbs)) continue
      const rel = relFor(srcAbs)
      // 拷贝到 md 同目录（相对引用），由 importStdMd 负责 lift 进 assets 并注册
      await ImportService.uploadLocalFile(pluginInstance, srcAbs, rel)
      srcToTarget.set(srcAbs, rel)
    }

    let count = 0
    const rewritten = mdText.replace(IMG_RE, (full, alt, pathCap) => {
      const ref0 = pathCap.trim()
      if (isIgnored(ref0)) return full
      const srcAbs = resolveLocal(ref0)
      if (!srcAbs) return full
      const rel = srcToTarget.get(srcAbs)
      if (!rel) return full
      count++
      return `![${alt}](${rel})`
    })

    return { rewritten, count }
  }

  private static getFileMeta(file: File) {
    const fromFilename = typeof file?.name === "string" ? file.name : ""
    const lastDotIndex = fromFilename.lastIndexOf(".")
    const hasExtension = lastDotIndex > 0 && lastDotIndex < fromFilename.length - 1
    const originalFilename = hasExtension ? fromFilename.substring(0, lastDotIndex) : fromFilename

    return {
      fromFilename,
      originalFilename: ImportService.filterFilename(originalFilename),
      ext: hasExtension ? fromFilename.substring(lastDotIndex + 1).toLowerCase() : "",
    }
  }

  /**
   * Sanitize a file name to match the kernel rules (FilterFileName + FilterUploadFileName),
   * so upload/convert/import do not fail with "invalid file path" for names containing
   * characters like %, #, &, [, ], (, ), etc.
   *
   * @param name - the original file name without extension
   * @returns the sanitized file name
   */
  private static filterFilename(name: string): string {
    // FilterFileName: replace path separators and invalid chars with "_"
    let ret = name
      .replace(/[\\/:*?"'<>|]/g, "_")
      .replace(/[\u0000-\u001f]/g, "")
      .trim()
    // FilterUploadFileName: remove upload-invalid chars
    ret = ret.replace(/[~[\]()!`&{}=#%$;]/g, "")
    // FilterFileName: trim trailing dots
    ret = ret.replace(/\.+$/, "")
    return ret === "" ? "untitled" : ret
  }

  /**
   * 将临时目录复制到安全路径（内核仅允许导入 temp/export/*）。
   * 复制前清空目标，避免上次残留文件被重复导入。
   */
  private static async copyToSafePath() {
    const fs = (window as any).require("fs")
    if (fs.existsSync(SAFE_PANDOC_DIR)) {
      await fs.promises.rm(SAFE_PANDOC_DIR, { recursive: true, force: true })
    }
    await copyDir(`${workspaceDir}/temp/convert/pandoc`, SAFE_PANDOC_DIR)
  }

  /**
   * 导入完成后无感刷新文档树。reloadFiletree 触发内核推送 reloadFiletree 事件，
   * 前端收到后重新加载文档树（不刷新页面）。
   */
  private static async refreshUI(pluginInstance: ImporterPlugin) {
    try {
      await pluginInstance.kernelApi.reloadFiletree()
    } catch (e) {
      pluginInstance.logger.warn(`reloadFiletree failed: ${e?.toString?.() ?? e}`)
    }
  }

  /**
   * 获取文件在磁盘上的源目录（仅单个导入的 input[type=file] 场景可用）。
   * 新版 Electron 通过 webUtils.getPathForFile 获取，旧版兼容 file.path；
   * 批量导入（showDirectoryPicker）拿不到，返回 null（资源由 UI 上传）。
   */
  private static getSourceDir(file: File): string | null {
    const path = window.require("path")
    try {
      const electron = window.require("electron")
      const p = electron?.webUtils?.getPathForFile?.(file)
      if (p) {
        return path.dirname(p)
      }
    } catch (_e) {
      // ignore when the electron module is unavailable
    }
    const legacyPath = (file as any)?.path
    if (typeof legacyPath === "string" && legacyPath !== "") {
      return path.dirname(legacyPath)
    }
    return null
  }

  /**
   * 解析 md 文本中的本地资源引用，并上传到临时目录（保持相对路径）。
   * 这样导入时内核能从 md 所在目录找到引用的图片等资源。
   */
  private static async uploadMdReferencedAssets(pluginInstance: ImporterPlugin, file: File, srcDir: string) {
    const path = window.require("path")
    const mdText = await file.text()
    const regex = /!\[[^\]]*\]\(([^)\s]+)\)/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(mdText)) !== null) {
      let ref = match[1].trim()
      // skip remote, inline and anchor references
      if (/^(https?:|data:|#|siyuan:|<)/.test(ref)) {
        continue
      }
      ref = ref.split("#")[0]
      ref = decodeURIComponent(ref)
      ref = ref.replace(/^\.\//, "").replace(/^\/+/, "")
      if (ref === "") {
        continue
      }
      const absPath = path.join(srcDir, ref)
      const fs = window.require("fs")
      if (fs.existsSync(absPath)) {
        await ImportService.uploadLocalFile(pluginInstance, absPath, ref)
      }
    }
  }

  /**
   * Upload a single local file to the temp directory.
   *
   * @param pluginInstance
   * @param absPath - 本地绝对路径
   * @param tempRelPath - 相对 /temp/convert/pandoc 的路径
   */
  private static async uploadLocalFile(pluginInstance: ImporterPlugin, absPath: string, tempRelPath: string) {
    const path = window.require("path")
    const fs = window.require("fs")
    const data = fs.readFileSync(absPath)
    const file = new File([data], path.basename(absPath))
    const uploadResult = await pluginInstance.kernelApi.putFile(`/temp/convert/pandoc/${tempRelPath}`, file)
    if (uploadResult.code !== 0) {
      pluginInstance.logger.warn(`upload asset failed: ${tempRelPath}: ${uploadResult.msg}`)
    }
  }

  /**
   * Recursively upload a local directory to the temp directory (keeping relative paths),
 * used for the {name}_files asset folder of html files.
   */
  private static async uploadDirTreeFromPath(pluginInstance: ImporterPlugin, absDir: string, tempDir: string) {
    const path = window.require("path")
    const fs = window.require("fs")
    if (!fs.existsSync(absDir)) {
      return
    }
    const entries = fs.readdirSync(absDir)
    for (const name of entries) {
      const absPath = path.join(absDir, name)
      if (fs.statSync(absPath).isDirectory()) {
        await ImportService.uploadDirTreeFromPath(pluginInstance, absPath, `${tempDir}/${name}`)
      } else {
        await ImportService.uploadLocalFile(pluginInstance, absPath, `${tempDir}/${name}`)
      }
    }
  }
}

