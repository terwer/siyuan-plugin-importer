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
  import ImporterPlugin from "../index"
  import { loadImporterConfig, saveImporterConfig } from "../store/config"
  import { showMessage, confirm } from "siyuan"
  import { onMount } from "svelte"
  import { ImportService } from "../service/importService"
  import { workspaceDir } from "../Constants"

  export let pluginInstance: ImporterPlugin
  export let dialog

  let importerConfig
  let notebooks = []
  let toNotebookId
  let toNotebookName
  // 用户指南不应该作为可以写入的笔记本
  const hiddenNotebook: Set<string> = new Set(["思源笔记用户指南", "SiYuan User Guide"])
  let tempCount = 0
  const allowedExtensions = ["docx", "epub", "md", "html", "opml"]

  // events
  const notebookChange = async function () {
    // 显示当前选择的名称
    const currentNotebook = notebooks.find((n) => n.id === toNotebookId)
    toNotebookName = currentNotebook.name

    importerConfig = await loadImporterConfig(pluginInstance)
    importerConfig.notebook = toNotebookId

    await saveImporterConfig(pluginInstance, importerConfig)
    pluginInstance.logger.info(`${pluginInstance.i18n.notebookConfigUpdated}=>`, toNotebookId)
  }

  const cleanTemp = async () => {
    const tempPath = `/temp/convert/pandoc`
    await pluginInstance.kernelApi.removeFile(`${tempPath}`)
    await reloadTempFiles()

    showMessage(pluginInstance.i18n.msgTempFileCleaned, 5000, "info")
  }

  // lifecycle
  onMount(async () => {
    await reloadTempFiles()

    // 加载配置
    importerConfig = await loadImporterConfig(pluginInstance)

    const res = await pluginInstance.kernelApi.lsNotebooks()
    const data = res.data as any
    notebooks = data.notebooks ?? []
    // 没有必要把所有笔记本都列出来
    notebooks = notebooks.filter((notebook) => !notebook.closed && !hiddenNotebook.has(notebook.name))
    // 选中，若是没保存，获取第一个
    toNotebookId = importerConfig?.notebook ?? notebooks[0].id
    const currentNotebook = notebooks.find((n) => n.id === toNotebookId)
    toNotebookName = currentNotebook.name

    pluginInstance.logger.info(`${pluginInstance.i18n.selected} [${toNotebookName}] toNotebookId=>`, toNotebookId)
  })

  // utils
  const reloadTempFiles = async () => {
    const tempPath = `/temp/convert/pandoc`
    // 临时文件
    const tempFiles = await pluginInstance.kernelApi.readDir(tempPath)
    if (tempFiles.code === 0 && tempFiles.data.length > 0) {
      tempCount = tempFiles.data.length
    }
    if (tempFiles.code === 404) {
      tempCount = 0
    }
  }
  /**
   * 读取文件
   * @param entry
   */
  const readFile = async (entry) => {
    const file = await entry.getFile()
    const reader = new FileReader()
    reader.readAsArrayBuffer(file)
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const arrayBuffer = reader.result
        const fileContent = new Blob([arrayBuffer], { type: file.type })
        const fileName = file.name
        resolve(new File([fileContent], fileName))
      }
      reader.onerror = reject
    })
  }

  const openTempFolder = () => {
    confirm("⚠️临时文件路径", `${workspaceDir}/temp/convert/pandoc`, () => {})
  }

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      // 处理按键事件
      event.preventDefault()
    }
  }

  // =================
  // 单文件转换开始
  // =================
  const selectFile = async (
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
    const file = files[0]

    // 给个提示，免得用户以为界面是卡主了
    showMessage(`${pluginInstance.i18n.msgConverting} ${file.name}...`, 1000, "info")

    // 转换
    const toFilePath = await ImportService.uploadAndConvert(pluginInstance, file)
    // 导入
    await ImportService.singleImport(pluginInstance, toFilePath, toNotebookId)
  }
  // =================
  // 单文件转换结束
  // =================

  // =================
  // 批量转换开始
  // =================
  const selectFolder = async () => {
    // 批量导入之前先清空临时文件
    if (tempCount > 0) {
      showMessage(`${pluginInstance.i18n.tempCountExists}`, 1000, "error")
      return
    }

    const result = await window.showDirectoryPicker()
    dialog.destroy()

    const entries = await result.values()
    for await (const entry of entries) {
      if (entry.kind === "directory") {
        continue
      }

      const fileName = entry.name
      const ext = fileName.split(".").pop().toLowerCase()

      if (!allowedExtensions.includes(ext)) {
        console.warn(`${pluginInstance.i18n.importTipNotAllowed} ${fileName}`)
        continue
      }

      // 循环上传并转换
      showMessage(`${fileName} ${pluginInstance.i18n.msgConverting}...`, 5000, "info")
      const file = await readFile(entry)
      await ImportService.uploadAndConvert(pluginInstance, file)
    }

    // 批量导入
    await ImportService.multiImport(pluginInstance, toNotebookId)
  }
  // =================
  // 批量转换结束
  // =================
</script>

<div class="b3-dialog__content importer-form-container">
  <div class="config__tab-container">
    <label class="fn__flex b3-label config__item">
      <div class="fn__flex-1">
        {pluginInstance.i18n.targetNotebook}
        <div class="b3-label__text">
          {pluginInstance.i18n.selectNotebookTip}<span class="selected">[{toNotebookName}]</span>
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
          <option value="0">{pluginInstance.i18n.loading}...</option>
        {/each}
      </select>
    </label>

    <div class="fn__flex b3-label config__item">
      <div class="fn__flex-1 fn__flex-center">
        {pluginInstance.i18n.importFile}
        <div class="b3-label__text">
          <div>{pluginInstance.i18n.importTip}</div>
          <div class="highlight">{pluginInstance.i18n.importSingleNotice}</div>
        </div>
      </div>
      <span class="fn__space" />
      <button class="b3-button b3-button--outline fn__flex-center fn__size200" style="position: relative">
        <input
          id="importData"
          class="b3-form__upload"
          type="file"
          accept=".md,.docx,.epub,.html,.opml"
          on:change={selectFile}
        />
        <svg>
          <use xlink:href="#iconDownload" />
        </svg>{pluginInstance.i18n.startImport}
      </button>
    </div>

    <div class="fn__flex b3-label config__item">
      <div class="fn__flex-1 fn__flex-center">
        {pluginInstance.i18n.importFolder}
        <div class="b3-label__text">
          <div>{pluginInstance.i18n.importFolderTip}</div>
          <div class="highlight">{pluginInstance.i18n.importNotRecursive}</div>
        </div>
      </div>
      <span class="fn__space" />
      <button class="b3-button b3-button--outline fn__flex-center fn__size200" style="position: relative">
        <input id="batchImportData" class="b3-form__upload" on:click={selectFolder} />
        <svg>
          <use xlink:href="#iconDownload" />
        </svg>{pluginInstance.i18n.importFolder}
      </button>
    </div>

    <div class="fn__flex b3-label config__item">
      <div class="fn__flex-1 fn__flex-center">
        {pluginInstance.i18n.cleanTemp}
        <div class="b3-label__text">
          {pluginInstance.i18n.tempTotal} <span class="selected"> [ {tempCount} ] </span>
          {pluginInstance.i18n.tempCount}

          <span class="link" on:click={openTempFolder} on:keydown={handleKeyDown}>显示临时文件夹路径</span>
        </div>
      </div>
      <span class="fn__space" />
      <button
        id="removeAll"
        class="b3-button b3-button--outline fn__flex-center fn__size200"
        style="position: relative"
      >
        <input id="batchRemoveData" class="b3-form__upload" on:click={cleanTemp} />
        <svg class="svg"><use xlink:href="#iconTrashcan" /></svg>
        {pluginInstance.i18n.clean}
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
    padding: 0 4px;
  }

  .highlight {
    color: red;
  }

  .link {
    color: var(--b3-theme-primary);
    cursor: pointer;
  }
</style>
