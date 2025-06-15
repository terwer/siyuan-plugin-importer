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

<script setup lang="ts">
// =============== 类型定义 ===============
interface Props {
    pluginInstance: any
    dialog: any
}

// =============== 组件引入 ===============
import { ref, onMounted } from 'vue'
import ImporterPlugin from "../index"
import { loadImporterConfig, saveImporterConfig } from "../store/config"
import { showMessage, confirm } from "siyuan"
import { ImportService } from "../service/importService"
import { workspaceDir } from "../Constants"

// =============== Props 定义 ===============
const props = defineProps<Props>()

// =============== 响应式数据 ===============
const importerConfig = ref(null)
const notebooks = ref([])
const toNotebookId = ref('')
const toNotebookName = ref('')
const tempCount = ref(0)
const showSingleImportTip = ref(false)
const showMultiImportTip = ref(false)

// 常量
const hiddenNotebook = new Set(["思源笔记用户指南", "SiYuan User Guide"])
const allowedMultiExtensions = ["docx", "epub", "opml"]

// =============== 方法 ===============
const notebookChange = async () => {
    // 显示当前选择的名称
    const currentNotebook = notebooks.value.find((n) => n.id === toNotebookId.value)
    toNotebookName.value = currentNotebook.name

    importerConfig.value = await loadImporterConfig(props.pluginInstance)
    importerConfig.value.notebook = toNotebookId.value

    await saveImporterConfig(props.pluginInstance, importerConfig.value)
    props.pluginInstance.logger.info(`${props.pluginInstance.i18n.notebookConfigUpdated}=>`, toNotebookId.value)
}

const reloadTempFiles = async () => {
    const tempPath = `/temp/convert/pandoc`
    // 临时文件
    const tempFiles = await props.pluginInstance.kernelApi.readDir(tempPath)
    if (tempFiles.code === 0 && tempFiles.data.length > 0) {
        tempCount.value = tempFiles.data.length
    }
    if (tempFiles.code === 404) {
        tempCount.value = 0
    }
}

const cleanTemp = async () => {
    const tempPath = `/temp/convert/pandoc`
    await props.pluginInstance.kernelApi.removeFile(`${tempPath}`)
    await reloadTempFiles()

    showMessage(props.pluginInstance.i18n.msgTempFileCleaned, 5000, "info")
}

const readFile = async (entry: any) => {
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
    confirm("⚠️临时文件路径", `${workspaceDir}/temp/convert/pandoc`, () => { })
}

const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
        // 处理按键事件
        event.preventDefault()
    }
}

const selectFile = async (event: Event) => {
    props.pluginInstance.logger.debug(`${props.pluginInstance.i18n.startImport}...`)
    props.dialog.destroy()

    const files = (event.target as HTMLInputElement).files ?? []
    if (files.length === 0) {
        showMessage(`${props.pluginInstance.i18n.msgFileNotEmpty}`, 7000, "error")
        return
    }
    const file = files[0]

    // 给个提示，免得用户以为界面是卡主了
    showMessage(`${props.pluginInstance.i18n.msgConverting} ${file.name}...`, 1000, "info")

    // 转换
    const uploadResult = await ImportService.uploadAndConvert(props.pluginInstance, file)
    // 导入
    await ImportService.singleImport(props.pluginInstance, uploadResult.toFilePath, toNotebookId.value, uploadResult.isMd)
}

const selectFolder = async () => {
    // 批量导入之前先清空临时文件
    if (tempCount.value > 0) {
        showMessage(`${props.pluginInstance.i18n.tempCountExists}`, 1000, "error")
        return
    }

    const result = await window.showDirectoryPicker()
    props.dialog.destroy()

    const entries = await result.values()
    for await (const entry of entries) {
        if (entry.kind === "directory") {
            continue
        }

        const fileName = entry.name
        const ext = fileName.split(".").pop().toLowerCase()

        if (!allowedMultiExtensions.includes(ext)) {
            console.warn(`${props.pluginInstance.i18n.importTipNotAllowed} ${fileName}`)
            continue
        }

        // 循环上传并转换
        showMessage(`${fileName} ${props.pluginInstance.i18n.msgConverting}...`, 5000, "info")
        const file = await readFile(entry)
        await ImportService.uploadAndConvert(props.pluginInstance, file)
    }

    // 批量导入
    await ImportService.multiImport(props.pluginInstance, toNotebookId.value)
}

const toggleSingleHighlight = () => {
    showSingleImportTip.value = !showSingleImportTip.value
}

const toggleMultiHighlight = () => {
    showMultiImportTip.value = !showMultiImportTip.value
    console.log(showMultiImportTip.value)
}

// =============== 生命周期钩子 ===============
onMounted(async () => {
    await reloadTempFiles()

    // 加载配置
    importerConfig.value = await loadImporterConfig(props.pluginInstance)

    const res = await props.pluginInstance.kernelApi.lsNotebooks()
    const data = res.data
    notebooks.value = data.notebooks ?? []
    // 没有必要把所有笔记本都列出来
    notebooks.value = notebooks.value.filter((notebook) => !notebook.closed && !hiddenNotebook.has(notebook.name))
    // 选中，若是没保存，获取第一个
    toNotebookId.value = importerConfig.value?.notebook ?? notebooks.value[0]?.id
    const currentNotebook = notebooks.value.find((n) => n.id === toNotebookId.value)
    toNotebookName.value = currentNotebook?.name

    props.pluginInstance.logger.info(`${props.pluginInstance.i18n.selected} [${toNotebookName.value}] toNotebookId=>`, toNotebookId.value)
})
</script>

<template>
    <div class="b3-dialog__content importer-form-container">
        <div class="config__tab-container">
            <label class="fn__flex b3-label config__item">
                <div class="fn__flex-1">
                    {{ pluginInstance.i18n.targetNotebook }}
                    <div class="b3-label__text">
                        {{ pluginInstance.i18n.selectNotebookTip }}<span class="selected">[{{ toNotebookName }}]</span>
                    </div>
                </div>
                <span class="fn__space" />
                <select id="blockEmbedMode" class="b3-select fn__flex-center fn__size200" v-model="toNotebookId"
                    @change="notebookChange">
                    <option v-for="notebook in notebooks" :key="notebook.id" :value="notebook.id">
                        {{ notebook.name }}
                    </option>
                    <option v-if="!notebooks.length" value="0">{{ pluginInstance.i18n.loading }}...</option>
                </select>
            </label>

            <div class="fn__flex b3-label config__item">
                <div class="fn__flex-1 fn__flex-center">
                    {{ pluginInstance.i18n.importFile }}
                    <div class="b3-label__text tips" @click="toggleSingleHighlight" @keydown="handleKeyDown">
                        <div>
                            {{ pluginInstance.i18n.importTip }}
                            <span :class="showSingleImportTip ? 'sign hidden' : 'sign'">({{
                                pluginInstance.i18n.importTipHelp }})</span>
                        </div>
                        <div :class="showSingleImportTip ? 'highlight' : 'highlight hidden'">{{
                            pluginInstance.i18n.importSingleNotice1 }}</div>
                        <div :class="showSingleImportTip ? 'highlight' : 'highlight hidden'">{{
                            pluginInstance.i18n.importSingleNotice2 }}</div>
                        <div :class="showSingleImportTip ? 'highlight' : 'highlight hidden'">{{
                            pluginInstance.i18n.importSingleNotice3 }}</div>
                    </div>
                </div>
                <span class="fn__space" />
                <button class="b3-button b3-button--outline fn__flex-center fn__size200" style="position: relative">
                    <input id="importData" class="b3-form__upload" type="file" accept=".md,.docx,.epub,.html,.opml"
                        @change="selectFile" />
                    <svg>
                        <use xlink:href="#iconDownload" />
                    </svg>
                    {{ pluginInstance.i18n.startImport }}
                </button>
            </div>

            <div class="fn__flex b3-label config__item">
                <div class="fn__flex-1 fn__flex-center">
                    {{ pluginInstance.i18n.importFolder }}
                    <div class="b3-label__text tips" @click="toggleMultiHighlight" @keydown="handleKeyDown">
                        <div>
                            {{ pluginInstance.i18n.importFolderTip }}
                            <span :class="showMultiImportTip ? 'sign hidden' : 'sign'">({{
                                pluginInstance.i18n.importTipHelp }})</span>
                        </div>
                        <div :class="showMultiImportTip ? 'highlight' : 'highlight hidden'">{{
                            pluginInstance.i18n.importNotRecursive1 }}</div>
                        <div :class="showMultiImportTip ? 'highlight' : 'highlight hidden'">{{
                            pluginInstance.i18n.importNotRecursive2 }}</div>
                        <div :class="showMultiImportTip ? 'highlight' : 'highlight hidden'">{{
                            pluginInstance.i18n.importNotRecursive3 }}</div>
                    </div>
                </div>
                <span class="fn__space" />
                <button class="b3-button b3-button--outline fn__flex-center fn__size200" style="position: relative">
                    <input id="batchImportData" class="b3-form__upload" @click="selectFolder" />
                    <svg>
                        <use xlink:href="#iconDownload" />
                    </svg>
                    {{ pluginInstance.i18n.importFolder }}
                </button>
            </div>

            <div class="fn__flex b3-label config__item">
                <div class="fn__flex-1 fn__flex-center">
                    {{ pluginInstance.i18n.cleanTemp }}
                    <div class="b3-label__text">
                        {{ pluginInstance.i18n.tempTotal }} <span class="selected"> [ {{ tempCount }} ] </span>
                        {{ pluginInstance.i18n.tempCount }}

                        <span class="link" @click="openTempFolder" @keydown="handleKeyDown">显示临时文件夹路径</span>
                    </div>
                </div>
                <span class="fn__space" />
                <button id="removeAll" class="b3-button b3-button--outline fn__flex-center fn__size200"
                    style="position: relative">
                    <input id="batchRemoveData" class="b3-form__upload" @click="cleanTemp" />
                    <svg class="svg">
                        <use xlink:href="#iconTrashcan" />
                    </svg>
                    {{ pluginInstance.i18n.clean }}
                </button>
            </div>

            <div class="fn__flex b3-label config__item">
                {{ pluginInstance.i18n.reportBug1 }}
                &nbsp;<a href="https://github.com/terwer/siyuan-plugin-importer/issues/new" target="_blank">{{
                    pluginInstance.i18n.reportBug2 }}</a>&nbsp;
                {{ pluginInstance.i18n.reportBug3 }}
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
.selected
  color red
  padding 0 4px

.highlight
  color red

.link
  color var(--b3-theme-primary)
  cursor pointer

.tips
  cursor pointer

.b3-label__text
  .sign
    cursor pointer
    color var(--b3-theme-primary)

.highlight.hidden,
.sign.hidden
  display none
</style>