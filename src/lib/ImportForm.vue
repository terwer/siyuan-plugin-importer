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
import { ref, computed, onMounted } from 'vue'
import { loadImporterConfig, saveImporterConfig } from "../store/config"
import { showMessage, confirm } from "siyuan"
import { ImportService} from "../service/importService"
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
const allowedMultiExtensions = ["docx", "epub", "opml", "md", "html"]

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
    // 页面手动清理：统一走 ImportService.cleanTemp（转换目录 + 安全目录）
    await ImportService.cleanTemp(props.pluginInstance)
    await reloadTempFiles()

    showMessage(props.pluginInstance.i18n.msgTempFileCleaned, 5000, "info")
}

// 导入前确认并清理上次残留的临时文件（唯一清理入口）
const confirmCleanTemp = async (): Promise<boolean> => {
    if (tempCount.value <= 0) {
        return true
    }
    return await new Promise<boolean>((resolve) => {
        confirm(
            props.pluginInstance.i18n.cleanTemp ?? "清理临时文件",
            props.pluginInstance.i18n.cleanTempConfirm ?? "检测到上次的临时文件，导入前将清理，是否继续？",
            () => {
                ImportService.cleanTemp(props.pluginInstance).then(() => {
                    reloadTempFiles()
                    resolve(true)
                })
            },
            () => resolve(false)
        )
    })
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

const showTempPaths = ref(false)
// 临时目录（转换目录 + 安全目录），点击某个路径直接打开
const convertTempDir = computed(() => window.require("path").join(workspaceDir, "temp", "convert", "pandoc"))
const safeTempDir = computed(() => window.require("path").join(workspaceDir, "temp", "export", "convert", "pandoc"))

// 点击切换显示/隐藏临时目录路径
const toggleTempPaths = () => {
    showTempPaths.value = !showTempPaths.value
}

// 点击某个目录路径，用资源管理器直接打开
const openTempDir = (dir: string) => {
    const fs = window.require("fs")
    if (!fs.existsSync(dir)) {
        return
    }
    // 插件环境无 @electron/remote，用 Node child_process 调系统文件管理器
    const cp = window.require("child_process")
    try {
        if (process.platform === "win32") {
            cp.exec(`explorer "${dir}"`)
        } else {
            cp.exec(`open "${dir}"`)
        }
    } catch (e) {
        console.warn(`open dir failed: ${dir}`, e)
    }
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

    // 导入前确认并清理上次残留的临时文件
    const cleaned = await confirmCleanTemp()
    if (!cleaned) {
        return
    }

    // 给个提示，免得用户以为界面是卡主了
    showMessage(`${props.pluginInstance.i18n.msgConverting} ${file.name}...`, 1000, "info")

    // 转换
    const uploadResult = await ImportService.uploadAndConvert(props.pluginInstance, file)
    if (!uploadResult) {
        return
    }
    // 导入
    await ImportService.singleImport(props.pluginInstance, uploadResult, toNotebookId.value)
}

const selectFolder = async () => {
    // 导入前确认并清理上次残留的临时文件
    const cleaned = await confirmCleanTemp()
    if (!cleaned) {
        return
    }

    const result = await (window as any).showDirectoryPicker()
    props.dialog.destroy()

    const entries = await result.values()
    // 第一遍：先上传所有资源（子目录树 + 顶层非转换源文件），
    // 确保 html/docx 转换时引用的资源已就绪
    const convertTargets: { entry: any; fileName: string; ext: string }[] = []
    for await (const entry of entries) {
        if (entry.kind === "directory") {
            // 子目录递归上传（md 引用的图片等资源、html 的 {name}_files 资源保持相对路径）
            await ImportService.uploadDirTreeFromHandle(props.pluginInstance, entry, entry.name)
            continue
        }

        const fileName = entry.name
        const ext = fileName.split(".").pop().toLowerCase()

        if (allowedMultiExtensions.includes(ext)) {
            convertTargets.push({ entry, fileName, ext })
        } else {
            // 顶层资源文件（图片等）直接上传，作为 md 引用的资源
            try {
                const file = await readFile(entry)
                await props.pluginInstance.kernelApi.putFile(`/temp/convert/pandoc/${fileName}`, file)
            } catch (e) {
                console.warn(`upload asset failed: ${fileName}`, e)
            }
        }
    }

    // 第二遍：先处理 md（直接上传，占用原名），再转换其他格式，
    // 保证转换产物检测到同名 md 后自动改名，不覆盖用户文件
    const mdTargets = convertTargets.filter((t) => t.ext === "md")
    const convertSourceTargets = convertTargets.filter((t) => t.ext !== "md")
    for (const target of [...mdTargets, ...convertSourceTargets]) {
        showMessage(`${target.fileName} ${props.pluginInstance.i18n.msgConverting}...`, 5000, "info")
        const file = await readFile(target.entry)
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

                        <span class="link" @click="toggleTempPaths" @keydown="handleKeyDown">显示临时文件夹路径</span>
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

            <div v-if="showTempPaths" class="temp-paths">
                <div class="temp-path" @click="openTempDir(convertTempDir)" @keydown="handleKeyDown" role="button" tabindex="0">{{ convertTempDir }}</div>
                <div class="temp-path" @click="openTempDir(safeTempDir)" @keydown="handleKeyDown" role="button" tabindex="0">{{ safeTempDir }}</div>
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

<style lang="stylus" scoped>
.importer-form-container
  .selected
    color red
    padding 0 4px

  .highlight
    color red

  .link
    color var(--b3-theme-primary)
    cursor pointer

  .temp-paths
    margin 8px 0 0 24px
    font-size 12px

    .temp-path
      color var(--b3-theme-primary)
      cursor pointer
      word-break break-all
      padding 2px 0

      &:hover
        text-decoration underline

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