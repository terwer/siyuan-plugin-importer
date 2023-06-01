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
import { removeEmptyLines, removeFootnotes, removeLinks, replaceImagePath } from "../utils/utils"

export class ImportService {
  public static async uploadAndConvert(pluginInstance: ImporterPlugin, file: any) {
    const fromFilename = file.name

    // 修正文件名
    let filename = fromFilename.substring(0, fromFilename.lastIndexOf("."))
    // 去除标题多余的空格，包括开始中间以及结尾的空格
    filename = filename.replace(/\s+/g, "")
    const toFilename = `${filename}.md`

    // 扩展名
    const ext = fromFilename.split(".").pop().toLowerCase()
    if (ext === "md") {
      pluginInstance.logger.info(`import md from ${file.path}`)
      return file.path
    }

    const fromFilePath = `/temp/convert/pandoc/${fromFilename}`
    const toFilePath = `/temp/convert/pandoc/${toFilename}`

    // 文件上传
    if (ext !== "md") {
      const uploadFilePath = fromFilePath
      pluginInstance.logger.info(`upload file from ${uploadFilePath} to /temp/convert/pandoc`)
      const uploadResult = await pluginInstance.kernelApi.putFile(uploadFilePath, file)
      if (uploadResult.code !== 0) {
        showMessage(`${pluginInstance.i18n.msgFileUploadError}：${uploadResult.msg}`, 7000, "error")
        return
      }
    }

    // 文件转换
    // 不是 md 才需要转换
    if (ext !== "md") {
      const convertResult = await pluginInstance.kernelApi.convertPandoc(
        "markdown_strict-raw_html",
        fromFilename,
        toFilename
      )
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
      // 删除目录中链接
      mdText = removeLinks(mdText)
      // 去除空行
      mdText = removeEmptyLines(mdText)
      // 资源路径
      mdText = replaceImagePath(mdText)
      // 去除脚注
      mdText = removeFootnotes(mdText)
      await pluginInstance.kernelApi.saveTextData(`${toFilename}`, mdText)
    }

    return toFilePath
  }

  public static async singleImport(pluginInstance: ImporterPlugin, toFilePath: string, toNotebookId: string) {
    const ext = toFilePath.split(".").pop().toLowerCase()
    const isMd = ext === "md"
    // 导入 MD 文档
    const localPath = isMd ? toFilePath : `${workspaceDir}${toFilePath}`
    const mdResult = await pluginInstance.kernelApi.importStdMd(localPath, toNotebookId, `/`)
    if (mdResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}=>${toFilePath}`, 7000, "error")
    }

    // 打开笔记本
    await pluginInstance.kernelApi.openNotebook(toNotebookId)

    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  public static async multiImport(pluginInstance: ImporterPlugin, toNotebookId: string) {
    // 导入 MD 文档
    const localPath = `${workspaceDir}/temp/convert/pandoc`
    const mdResult = await pluginInstance.kernelApi.importStdMd(localPath, toNotebookId, `/`)
    if (mdResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}=>${localPath}`, 7000, "error")
    }

    // 打开笔记本
    await pluginInstance.kernelApi.openNotebook(toNotebookId)

    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  //////////////////////////////////////////////////////////////////
  // private function
  //////////////////////////////////////////////////////////////////
}
