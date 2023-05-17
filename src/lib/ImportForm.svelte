<!--
  - Copyright (c) 2023, Terwer . All rights reserved.
  - DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
  -
  - This code is free software; you can redistribute it and/or modify it
  - under the terms of the GNU General Public License version 2 only, as
  - published by the Free Software Foundation.  Terwer designates this
  - particular file as subject to the "Classpath" exception as provided
  - by Terwer in the LICENSE file that accompanied this code.
  -
  - This code is distributed in the hope that it will be useful, but WITHOUT
  - ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
  - FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
  - version 2 for more details (a copy is included in the LICENSE file that
  - accompanied this code).
  -
  - You should have received a copy of the GNU General Public License version
  - 2 along with this work; if not, write to the Free Software Foundation,
  - Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
  -
  - Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
  - or visit www.terwer.space if you need additional information or have any
  - questions.
  -->

<script lang="ts">
  import { showMessage } from "siyuan"
  import ImporterPlugin from "../index"
  import { removeEmptyLines, replaceImagePath } from "../utils/utils"
  import { onMount } from "svelte"
  import { loadImporterConfig, saveImporterConfig } from "../store/config"
  import { isDev } from "../Constants"

  export let pluginInstance: ImporterPlugin
  export let dialog

  let importerConfig
  let notebooks = []
  let toNotebookId
  let toNotebookName

  const startImport = async (
    event: InputEvent & {
      target: HTMLInputElement
    }
  ) => {
    pluginInstance.logger.debug(`${pluginInstance.i18n.startImport}...`)
    dialog.destroy()

    // showMessage(`文件上传中，请稍后...`, 1000, "info")
    const files = event.target.files ?? []
    if (files.length === 0) {
      showMessage(`${pluginInstance.i18n.msgFileNotEmpty}`, 7000, "error")
      return
    }

    await doImport(files[0])
  }

  const doImport = async function (file: any) {
    // 给个提示，免得用户以为界面是卡主了
    showMessage(`${pluginInstance.i18n.msgConverting}...`, 1000, "info")

    const fromFilename = file.name
    let filename = fromFilename.substring(0, fromFilename.lastIndexOf("."))
    // 去除标题多余的空格，包括开始中间以及结尾的空格
    filename = filename.replace(/\s+/g, "")

    const fromFilePath = `/temp/convert/pandoc/${fromFilename}`
    const uploadResult = await pluginInstance.kernelApi.putFile(fromFilePath, file)
    if (uploadResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgFileUploadError}：${uploadResult.msg}`, 7000, "error")
      return
    }

    // 文件转换
    const toFilename = `${filename}.md`
    const toFilePath = `/temp/convert/pandoc/${toFilename}`
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
    // 去除空行
    mdText = removeEmptyLines(mdText)
    // 资源路径
    mdText = replaceImagePath(mdText)

    // 创建 MD 文档
    const mdResult = await pluginInstance.kernelApi.createDocWithMd(toNotebookId, `/${filename}`, mdText)
    if (mdResult.code !== 0) {
      showMessage(`${pluginInstance.i18n.msgDocCreateFailed}=>${toFilePath}`, 7000, "error")
    }
    const pageId = mdResult.data as string
    let docIds = importerConfig.docIds ?? []

    // 检测重复导入
    if (docIds.includes(pageId)) {
      showMessage(`${pluginInstance.i18n.msgDocAlreadyImported} [${filename}]`, 7000, "info")
    } else {
      docIds.push(pageId)
    }

    importerConfig.docIds = docIds
    await saveImporterConfig(pluginInstance, importerConfig)

    // 文件清理
    if (!isDev) {
      await pluginInstance.kernelApi.removeFile(fromFilePath)
      await pluginInstance.kernelApi.removeFile(toFilePath)
      await pluginInstance.logger.info(pluginInstance.i18n.msgTempFileCleaned)
    }

    // 打开笔记本
    await pluginInstance.kernelApi.openNotebook(toNotebookId)

    showMessage(pluginInstance.i18n.msgImportSuccess, 5000, "info")
  }

  const notebookChange = async function () {
    // 显示当前选择的名称
    const currentNotebook = notebooks.find((n) => n.id === toNotebookId)
    toNotebookName = currentNotebook.name

    importerConfig = await loadImporterConfig(pluginInstance)
    importerConfig.notebook = toNotebookId

    await saveImporterConfig(pluginInstance, importerConfig)
    pluginInstance.logger.info(`${pluginInstance.i18n.notebookConfigUpdated}=>`, toNotebookId)
  }

  onMount(async () => {
    // 加载配置
    importerConfig = await loadImporterConfig(pluginInstance)

    const res = await pluginInstance.kernelApi.lsNotebooks()
    const data = res.data as any
    notebooks = data.notebooks ?? []
    // 选中，若是没保存，获取第一个
    toNotebookId = importerConfig?.notebook ?? notebooks[0].id
    const currentNotebook = notebooks.find((n) => n.id === toNotebookId)
    toNotebookName = currentNotebook.name

    pluginInstance.logger.info(`${pluginInstance.i18n.selected} [${toNotebookName}] toNotebookId=>`, toNotebookId)
  })
</script>

<div class="b3-dialog__content importer-form-container">
  <div class="config__tab-container">
    <label class="fn__flex b3-label config__item">
      <div class="fn__flex-1">
        {pluginInstance.i18n.targetNotebook}
        <div class="b3-label__text">
          {pluginInstance.i18n.selectNotebookTip} <span class="selected">[{toNotebookName}]</span>
        </div>
      </div>
      <span class="fn__space" />
      <select
        id="blockEmbedMode"
        class="b3-select fn__flex-center fn__size200"
        bind:value={toNotebookId}
        on:change={notebookChange}
      >
        {#each notebooks as notebook}
          <option value={notebook.id}>{notebook.name}</option>
        {:else}
          <!-- this block renders when photos.length === 0 -->
          <option value="0">{pluginInstance.i18n.loading}...</option>
        {/each}
      </select>
    </label>

    <div class="fn__flex b3-label config__item">
      <div class="fn__flex-1 fn__flex-center">
        {pluginInstance.i18n.importFile}
        <div class="b3-label__text">{pluginInstance.i18n.importTip}</div>
      </div>
      <span class="fn__space" />
      <button class="b3-button b3-button--outline fn__flex-center fn__size200" style="position: relative">
        <input
          id="importData"
          class="b3-form__upload"
          type="file"
          accept=".docx,.epub,.html,.opml"
          on:change={startImport}
        />
        <svg>
          <use xlink:href="#iconDownload" />
        </svg>{pluginInstance.i18n.startImport}
      </button>
    </div>

    <div class="fn__flex b3-label config__item">{pluginInstance.i18n.supportedTypes}</div>
  </div>
</div>

<style>
  .importer-form-container .config__tab-container {
    height: unset;
  }

  .selected {
    color: red;
  }
</style>
