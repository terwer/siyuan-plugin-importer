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

import { mediaDir, workspaceDir } from "../Constants"
import { getBackend, getFrontend, showMessage } from "siyuan"
import ImporterPlugin from "../index"
import {
  copyDir,
  getExports,
  isPC,
  removeEmptyLines,
  removeFootnotes,
  removeLinks,
  replaceImagePath,
} from "../utils/utils"
import shortHash from "shorthash2"
import { loadImporterConfig } from "../store/config"

export class ImportService {
  /**
   * 上传并转换，md、html 不上传
   *
   * @param pluginInstance
   * @param file
   */
  public static async uploadAndConvert(pluginInstance: ImporterPlugin, file: any) {
    const { fromFilename, originalFilename, ext } = ImportService.getFileMeta(file)

    // 修正文件名
    // 去除标题多余的空格，包括开始中间以及结尾的空格
    // const filename = originalFilename.replace(/\s+/g, "")
    const toFilename = `${originalFilename}.md`

    // md 直接返回
    if (ext === "md") {
      const toFilePath = `/temp/convert/pandoc/${toFilename}`
      pluginInstance.logger.info(`upload md file to ${toFilePath}`)
      const uploadResult = await pluginInstance.kernelApi.putFile(toFilePath, file)
      if (uploadResult.code !== 0) {
        showMessage(`${pluginInstance.i18n.msgFileUploadError}：${uploadResult.msg}`, 7000, "error")
        return
      }
      return {
        toFilePath: toFilePath,
        isMd: true,
      }
    }

    if (ext === "html") {
      await ImportService.copyHtmlAssets(pluginInstance, file, fromFilename, originalFilename)
    }

    // =================================================
    // 下面是非 html、 md文件的处理、先上传源文件，然后转换
    // =================================================

    const fromFilePath = `/temp/convert/pandoc/${fromFilename}`
    const toFilePath = `/temp/convert/pandoc/${toFilename}`

    // 文件上传
    const uploadFilePath = fromFilePath
    pluginInstance.logger.info(`upload file from ${uploadFilePath} to /temp/convert/pandoc`)
    const uploadResult = await pluginInstance.kernelApi.putFile(uploadFilePath, file)
    if (uploadResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgFileUploadError}：${uploadResult.msg}`, 7000, "error")
      return
    }

    // 文件转换
    const fromAbsPath = `./../${fromFilename}`
    const toAbsPath = `./../${toFilename}`
    pluginInstance.logger.info(`convertPandoc from [${fromAbsPath}] to [${toAbsPath}]`)
    const convertResult = await pluginInstance.kernelApi.convertPandoc(fromAbsPath, toAbsPath)
    if (convertResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgFileConvertError}：${convertResult.msg}`, 7000, "error")
      return
    }

    // 读取文件
    let mdText = (await pluginInstance.kernelApi.getFile(toFilePath, "text")) ?? ""
    if (mdText === "") {
      showMessage(pluginInstance.i18n.msgFileConvertEmpty, 7000, "error")
      return
    }

    // 文本处理
    const importConfig = await loadImporterConfig(pluginInstance)
    if (importConfig.bundledFnSwitch !== false) {
      pluginInstance.logger.info("Using bundled handler process text")
      // 删除目录中链接
      mdText = removeLinks(mdText)
      // 去除空行
      mdText = removeEmptyLines(mdText)
      // 资源路径
      mdText = replaceImagePath(mdText)
      // 去除脚注
      mdText = removeFootnotes(mdText)
    }

    // 自定义文本处理
    if (importConfig.customFnSwitch) {
      pluginInstance.logger.warn("Using custom handler process text")
      try {
        const customFn = importConfig.customFn
        const exportsFn = getExports(customFn)
        mdText = exportsFn(mdText)
      } catch (e) {
        showMessage(`${pluginInstance.i18n.customFnHandlerError} ${e.toString()}`, 5000, "error")
        throw e
      }
    }

    // 保存处理的最终文本
    await pluginInstance.kernelApi.saveTextData(`${toFilename}`, mdText)

    return {
      toFilePath: toFilePath,
      isMd: false,
    }
  }

  public static async singleImport(
    pluginInstance: ImporterPlugin,
    toFilePath: string,
    toNotebookId: string,
    isMd: boolean
  ) {
    // 探测 importStdMd 是否可用，卡死则提示重启
    const ok = await ImportService.probeImport(toNotebookId)
    if (!ok) {
      showMessage(
        "当前会话已经导入过，请重启思源笔记即可再次导入。",
        0,
        "error"
      )
      return
    }

    await ImportService.copyToSafePath(pluginInstance)
    const filename = toFilePath.split("/").pop() || toFilePath
    const localPath = `${workspaceDir}/temp/export/convert/pandoc/${filename}`
    const mdResult = await pluginInstance.kernelApi.importStdMd(localPath, toNotebookId, `/`)
    if (mdResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}=>${toFilePath}`, 7000, "error")
    }
    await pluginInstance.kernelApi.openNotebook(toNotebookId)
    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  public static async multiImport(pluginInstance: ImporterPlugin, toNotebookId: string) {
    // 探测 importStdMd 是否可用，卡死则提示重启
    const ok = await ImportService.probeImport(toNotebookId)
    if (!ok) {
      showMessage(
        "当前会话已经导入过，请重启思源笔记即可再次导入。",
        0,
        "error"
      )
      return
    }
    await ImportService.copyToSafePath(pluginInstance)
    const localPath = `${workspaceDir}/temp/export/convert/pandoc`
    const mdResult = await pluginInstance.kernelApi.importStdMd(localPath, toNotebookId, `/`)
    if (mdResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}=>${localPath}`, 7000, "error")
    }
    await pluginInstance.kernelApi.openNotebook(toNotebookId)
    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  //////////////////////////////////////////////////////////////////
  // private function
  //////////////////////////////////////////////////////////////////

  private static getFileMeta(file: any) {
    const fromFilename = typeof file?.name === "string" ? file.name : ""
    const lastDotIndex = fromFilename.lastIndexOf(".")
    const hasExtension = lastDotIndex > 0 && lastDotIndex < fromFilename.length - 1

    return {
      fromFilename,
      originalFilename: hasExtension ? fromFilename.substring(0, lastDotIndex) : fromFilename,
      ext: hasExtension ? fromFilename.substring(lastDotIndex + 1).toLowerCase() : "",
    }
  }

  private static async copyHtmlAssets(pluginInstance: ImporterPlugin, file: any, fromFilename: string, originalFilename: string) {
    if (!isPC()) {
      return
    }

    pluginInstance.logger.info(`copying html assets...`)

    const filePath = typeof file?.path === "string" ? file.path.trim() : ""
    if (filePath === "") {
      pluginInstance.logger.warn(`skip copying html assets because file.path is unavailable: ${fromFilename}`)
      return
    }

    const path = window.require("path")
    const dirPath = path.dirname(filePath)
    const fullDirPath = path.join(dirPath, `${originalFilename}_files`)
    pluginInstance.logger.info("fullDirPath=>", fullDirPath)

    await copyDir(fullDirPath, `${workspaceDir}/temp/convert/pandoc/${originalFilename}_files`)
  }

  /**
   * 探测 importStdMd 是否可用。思源内核在删除已导入文档后，后续 importStdMd 会永久挂起，
   * 非重启无法恢复。此处用敏感路径做超时探测：正常情况秒返 error，挂死则超时。
   * @returns true = 可用，false = 卡死
   */
  private static async probeImport(toNotebookId: string, timeoutMs = 3000): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch("/api/import/importStdMd", {
        method: "POST",
        body: JSON.stringify({
          localPath: `${workspaceDir}/temp/convert/pandoc/_probe_.md`,
          notebook: toNotebookId,
          toPath: "/",
        }),
        signal: controller.signal,
      })
      await resp.json()
      return true // 正常返回（无论 code 是什么）
    } catch {
      return false // 超时或网络错误 = 卡死
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * 复制到安全路径 + 创建 pandoc.md 占位文件（阻止内核创建空 /pandoc 节点）
   * import.go:1203-1206 检测到 pandoc.md 存在则跳过空节点创建
   */
  private static async copyToSafePath(_pluginInstance: ImporterPlugin) {
    const srcPath = `${workspaceDir}/temp/convert/pandoc`
    const destPath = `${workspaceDir}/temp/export/convert/pandoc`
    await copyDir(srcPath, destPath)
    const fs = (window as any).require("fs")
    const placeholder = `${workspaceDir}/temp/export/convert/pandoc.md`
    try { fs.writeFileSync(placeholder, "") } catch (_e) { /* ignore */ }
  }
}
