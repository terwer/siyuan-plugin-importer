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
  import { onMount } from "svelte"
  import { confirm, showMessage } from "siyuan"
  import { loadImporterConfig, saveImporterConfig } from "../store/config"
  import { getExports } from "../utils/utils"

  export let pluginInstance: ImporterPlugin
  export let dialog

  let bundledFnSwitch = true
  let customFnSwitch = false
  let customFn
  let importerConfig = {}

  const onSaveSetting = async () => {
    dialog.destroy()

    importerConfig.bundledFnSwitch = bundledFnSwitch
    importerConfig.customFnSwitch = customFnSwitch
    importerConfig.customFn = customFn
    await saveImporterConfig(pluginInstance, importerConfig)
    pluginInstance.logger.info("saved important config =>", importerConfig)
    showMessage(`${pluginInstance.i18n.importConfigSaveSuccess}`, 2000, "info")
  }

  const onCancel = async () => {
    dialog.destroy()
  }

  const updateSwitch = (event) => {
    event.stopPropagation()

    if (!customFnSwitch) {
      confirm(
        `⚠️${pluginInstance.i18n.enableCustomFn}`,
        `${pluginInstance.i18n.enableCustomFnTips}`,
        () => {
          const inputEl = document.querySelector("#customFnSwitch")
          inputEl.checked = customFnSwitch
        },
        () => {
          customFnSwitch = !customFnSwitch
        }
      )
    }
  }

  const updateBundledFnSwitch = (event) => {
    event.stopPropagation()

    if (bundledFnSwitch) {
      confirm(
        `⚠️${pluginInstance.i18n.bundledFnSwitch}`,
        `${pluginInstance.i18n.disableBundledFnSwitchTips}`,
        () => {
          const inputEl = document.querySelector("#bundledFnSwitch")
          inputEl.checked = bundledFnSwitch
        },
        () => {
          bundledFnSwitch = !bundledFnSwitch
        }
      )
    }
  }

  let testInput = `我衷心期盼，子孙后代们读到这封信时，会带着一种自豪感和正当的优越感。

## 评伯特兰·罗素的知识论^([\\[16\\]](#part0019.html#footnote_16))

当编者要我就罗素写点东西时，出于对这位作者的钦佩和尊敬，我立刻答应了下来。`
  let testOutput = ""
  let showTest = false
  const testFn = () => {
    const exportsFn = getExports(customFn)
    testOutput = exportsFn(testInput)
    showTest = true
    // console.log("test exportsFn=>", result)
  }

  const hideTest = () => {
    showTest = false
  }

  onMount(async () => {
    // 加载配置
    importerConfig = await loadImporterConfig(pluginInstance)

    bundledFnSwitch = importerConfig.bundledFnSwitch ?? true
    customFnSwitch = importerConfig.customFnSwitch ?? false
    customFn =
      importerConfig.customFn ??
      `// 您可以参考这个案例进行修改，注意：请勿修改方法名和参数名，只需修改customFn内部实现即可
// 将字符串中形如"xxx^yyy"的部分替换成"xxx"
const customFn = (mdText) => {
  const regex = /\\^\\(\\[.*[0-9].*]\\(#.*#.*\\)\\)/g // 匹配格式为 ^[[数字]](#链接) 的脚注
  return mdText.replace(regex, "") // 使用空字符串替换匹配到的脚注
}

module.exports = customFn`
  })
</script>

<div class="config__tab-container">
  <label class="fn__flex b3-label">
    <div class="fn__flex-1">
      {pluginInstance.i18n.bundledFnSwitch}
      <div class="b3-label__text">{pluginInstance.i18n.bundledFnSwitchTips}</div>
    </div>
    <span class="fn__space"></span>
    <input
      id="bundledFnSwitch"
      class="b3-switch fn__flex-center"
      type="checkbox"
      on:click={(event) => updateBundledFnSwitch(event)}
      bind:checked={bundledFnSwitch}
    />
  </label>

  <label class="fn__flex b3-label">
    <div class="fn__flex-1">
      {pluginInstance.i18n.customFnSwitch}
      <div class="b3-label__text">{pluginInstance.i18n.customFnSwitchTips}</div>
    </div>
    <span class="fn__space" ></span>
    <input
      id="customFnSwitch"
      class="b3-switch fn__flex-center"
      type="checkbox"
      on:click={(event) => updateSwitch(event)}
      bind:checked={customFnSwitch}
    />
  </label>

  <label class="fn__flex b3-label">
    <div class="fn__flex-1">
      {pluginInstance.i18n.customFnHandler}
      <div class="b3-label__text">
        {pluginInstance.i18n.customFnHandlerTips}
        <a href="https://www.regextester.com" target="_blank">https://www.regextester.com</a>
      </div>
      <div class="fn__hr" ></div>
      <textarea
        class="b3-text-field fn__block"
        placeholder={pluginInstance.i18n.customFnHandlerPlaceholder}
        rows="8"
        spellcheck="false"
        bind:value={customFn}
      ></textarea>
    </div>
  </label>

  <label class="fn__flex b3-label">
    <div class="fn__flex-1">
      <button class="b3-button b3-button--outline fn__flex-right fn__size200" on:click={testFn}> 开始测试 </button>
      <button
        class={showTest
          ? "b3-button b3-button--outline fn__flex-right fn__size200 pull-right"
          : "b3-button b3-button--outline fn__flex-right fn__size200 pull-right hidden"}
        on:click={hideTest}
      >
        隐藏结果
      </button>
      <div class="fn__hr" ></div>
      {pluginInstance.i18n.testInput}
      <textarea class="b3-text-field fn__block test-data-item" rows="6" spellcheck="false" bind:value={testInput} ></textarea>
      <div class={showTest ? "" : "hidden"}>
        {pluginInstance.i18n.testOutput}
        <textarea
          class="b3-text-field fn__block test-data-item"
          placeholder={pluginInstance.i18n.testOutputPlaceholder}
          rows="6"
          spellcheck="false"
          bind:value={testOutput}
        ></textarea>
      </div>
    </div>
  </label>

  <div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel" on:click={onCancel}>{pluginInstance.i18n.cancel}</button>
    <div class="fn__space"></div>
    <button class="b3-button b3-button--text" on:click={onSaveSetting}>{pluginInstance.i18n.save}</button>
  </div>
</div>

<style lang="stylus">
.test-data-item
  margin 4px 0
.pull-right
  float right
.hidden
  display none
</style>
