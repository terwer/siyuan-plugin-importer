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
  import { isFileExists, removeEmptyLines } from "../utils/utils"

  export let pluginInstance
  export let dialog

  const startImport = async () => {
    // pluginInstance.saveData(STORAGE_NAME, inputElement.value);
    dialog.destroy()
    await doImport()
  }

  const doImport = async function () {
    showMessage(`文件转换中，请稍后...`, 1000, "info")

    const filename = "foo"
    const toFilePath = `/temp/convert/pandoc/${filename}.md`

    // 检测重复导入
    // const mdExists = await isFileExists(pluginInstance.kernelApi, toFilePath, "text")
    // if (mdExists) {
    //   showMessage(`文档 ${filename} 已存在，请删除文档之后再重新导入`, 7000, "error")
    //   return
    // }

    // 文件转换
    const convertResult = await pluginInstance.kernelApi.convertPandoc()
    if (convertResult.code !== 0) {
      showMessage(`文件转换失败，错误信息如下：${convertResult.msg}`, 7000, "error")
      return
    }

    // 读取文件
    let mdText = (await pluginInstance.kernelApi.getFile(toFilePath, "text")) ?? ""
    if (mdText === "") {
      showMessage("文件转换失败，内容为空", 7000, "error")
      return
    }

    // 文本处理
    mdText = removeEmptyLines(mdText)

    // 创建 MD 文档
    await pluginInstance.kernelApi.createDocWithMd("20220621105123-dlyn6nl", `/foo`, mdText)

    // 文件清理
    // 暂时不清理

    showMessage("文件导入成功", 5000, "info")
  }
</script>

<div class="b3-dialog__content importer-form-container">
  <div class="config__tab-container">
    <label class="fn__flex b3-label config__item">
      <div class="fn__flex-1">
        目标笔记本
        <div class="b3-label__text">导入的目标笔记本，已选 <span class="selected">笔记本一</span></div>
      </div>
      <span class="fn__space" />
      <select id="blockEmbedMode" class="b3-select fn__flex-center fn__size200">
        <option value="0">默认笔记本</option>
        <option value="1" selected="">笔记本一</option>
      </select>
    </label>

    <div class="fn__flex b3-label config__item">
      <div class="fn__flex-1 fn__flex-center">
        导入文件
        <div class="b3-label__text">将 epub, docx 等格式转换成Markdown临时文件，然后创建文档</div>
      </div>
      <span class="fn__space" />
      <button class="b3-button b3-button--outline fn__flex-center fn__size200" style="position: relative">
        <input id="importData" class="b3-form__upload" type="file" />
        <svg><use xlink:href="#iconDownload" /></svg>{pluginInstance.i18n.startImport}
      </button>
    </div>
  </div>
</div>

<style>
  .importer-form-container .config__tab-container{
    height: unset;
  }
  .selected {
    color: red;
  }
</style>
