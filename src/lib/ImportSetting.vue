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
import { confirm, showMessage } from "siyuan"
import { loadImporterConfig, saveImporterConfig } from "../store/config"
import { getExports } from "../utils/utils"

// =============== Props 定义 ===============
const props = defineProps<Props>()

// =============== 响应式数据 ===============
const bundledFnSwitch = ref(true)
const customFnSwitch = ref(false)
const customFn = ref('')
const importerConfig = ref({})
const testInput = ref(`我衷心期盼，子孙后代们读到这封信时，会带着一种自豪感和正当的优越感。

## 评伯特兰·罗素的知识论^([\\[16\\]](#part0019.html#footnote_16))

当编者要我就罗素写点东西时，出于对这位作者的钦佩和尊敬，我立刻答应了下来。`)
const testOutput = ref('')
const showTest = ref(false)

// =============== 方法 ===============
const onSaveSetting = async () => {
    props.dialog.destroy()

    importerConfig.value.bundledFnSwitch = bundledFnSwitch.value
    importerConfig.value.customFnSwitch = customFnSwitch.value
    importerConfig.value.customFn = customFn.value
    await saveImporterConfig(props.pluginInstance, importerConfig.value)
    props.pluginInstance.logger.info("saved important config =>", importerConfig.value)
    showMessage(`${props.pluginInstance.i18n.importConfigSaveSuccess}`, 2000, "info")
}

const onCancel = async () => {
    props.dialog.destroy()
}

const updateSwitch = (event: Event) => {
    event.stopPropagation()

    if (!customFnSwitch.value) {
        confirm(
            `⚠️${props.pluginInstance.i18n.enableCustomFn}`,
            `${props.pluginInstance.i18n.enableCustomFnTips}`,
            () => {
                const inputEl = document.querySelector("#customFnSwitch") as HTMLInputElement
                inputEl.checked = customFnSwitch.value
            },
            () => {
                customFnSwitch.value = !customFnSwitch.value
            }
        )
    }
}

const updateBundledFnSwitch = (event: Event) => {
    event.stopPropagation()

    if (bundledFnSwitch.value) {
        confirm(
            `⚠️${props.pluginInstance.i18n.bundledFnSwitch}`,
            `${props.pluginInstance.i18n.disableBundledFnSwitchTips}`,
            () => {
                const inputEl = document.querySelector("#bundledFnSwitch") as HTMLInputElement
                inputEl.checked = bundledFnSwitch.value
            },
            () => {
                bundledFnSwitch.value = !bundledFnSwitch.value
            }
        )
    }
}

const testFn = () => {
    const exportsFn = getExports(customFn.value)
    testOutput.value = exportsFn(testInput.value)
    showTest.value = true
}

const hideTest = () => {
    showTest.value = false
}

// =============== 生命周期钩子 ===============
onMounted(async () => {
    // 加载配置
    importerConfig.value = await loadImporterConfig(props.pluginInstance)

    bundledFnSwitch.value = importerConfig.value.bundledFnSwitch ?? true
    customFnSwitch.value = importerConfig.value.customFnSwitch ?? false
    customFn.value = importerConfig.value.customFn ?? `// 您可以参考这个案例进行修改，注意：请勿修改方法名和参数名，只需修改customFn内部实现即可
// 将字符串中形如"xxx^yyy"的部分替换成"xxx"
const customFn = (mdText) => {
    const regex = /\\^\\(\\[.*[0-9].*]\\(#.*#.*\\)\\)/g // 匹配格式为 ^[[数字]](#链接) 的脚注
    return mdText.replace(regex, "") // 使用空字符串替换匹配到的脚注
}

module.exports = customFn`
})
</script>

<template>
    <div class="b3-dialog__content importer-setting-container">
        <div class="config__tab-container">
            <label class="fn__flex b3-label config__item">
                <div class="fn__flex-1">
                    {{ pluginInstance.i18n.bundledFnSwitch }}
                    <div class="b3-label__text">{{ pluginInstance.i18n.bundledFnSwitchTips }}</div>
                </div>
                <span class="fn__space"></span>
                <input id="bundledFnSwitch" class="b3-switch fn__flex-center" type="checkbox"
                    @click="updateBundledFnSwitch" v-model="bundledFnSwitch" />
            </label>

            <label class="fn__flex b3-label config__item">
                <div class="fn__flex-1">
                    {{ pluginInstance.i18n.customFnSwitch }}
                    <div class="b3-label__text">{{ pluginInstance.i18n.customFnSwitchTips }}</div>
                </div>
                <span class="fn__space"></span>
                <input id="customFnSwitch" class="b3-switch fn__flex-center" type="checkbox" @click="updateSwitch"
                    v-model="customFnSwitch" />
            </label>

            <label class="fn__flex b3-label config__item">
                <div class="fn__flex-1">
                    {{ pluginInstance.i18n.customFnHandler }}
                    <div class="b3-label__text">
                        {{ pluginInstance.i18n.customFnHandlerTips }}
                        <a href="https://www.regextester.com" target="_blank">https://www.regextester.com</a>
                    </div>
                    <div class="fn__hr" />
                    <textarea class="b3-text-field fn__block"
                        :placeholder="pluginInstance.i18n.customFnHandlerPlaceholder" rows="8" spellcheck="false"
                        v-model="customFn" />
                </div>
            </label>

            <label class="fn__flex b3-label config__item">
                <div class="fn__flex-1">
                    <button class="b3-button b3-button--outline fn__flex-right fn__size200"
                        @click="testFn">开始测试</button>
                    <button
                        :class="showTest ? 'b3-button b3-button--outline fn__flex-right fn__size200 pull-right' : 'b3-button b3-button--outline fn__flex-right fn__size200 pull-right hidden'"
                        @click="hideTest">
                        隐藏结果
                    </button>
                    <div class="fn__hr" />
                    {{ pluginInstance.i18n.testInput }}
                    <textarea class="b3-text-field fn__block test-data-item" rows="6" spellcheck="false"
                        v-model="testInput" />
                    <div :class="showTest ? '' : 'hidden'">
                        {{ pluginInstance.i18n.testOutput }}
                        <textarea class="b3-text-field fn__block test-data-item"
                            :placeholder="pluginInstance.i18n.testOutputPlaceholder" rows="6" spellcheck="false"
                            v-model="testOutput" />
                    </div>
                </div>
            </label>

            <div class="b3-dialog__action">
                <button class="b3-button b3-button--cancel" @click="onCancel">{{ pluginInstance.i18n.cancel }}</button>
                <div class="fn__space" />
                <button class="b3-button b3-button--text" @click="onSaveSetting">{{ pluginInstance.i18n.save }}</button>
            </div>
        </div>
    </div>
</template>

<style lang="stylus">
.b3-switch
  position relative
  display inline-block
  width 40px
  height 20px

  input
    opacity 0
    width 0
    height 0

  &__text
    position absolute
    cursor pointer
    top 0
    left 0
    right 0
    bottom 0
    background-color #ccc
    transition .4s
    border-radius 20px

    &:before
      position absolute
      content ""
      height 16px
      width 16px
      left 2px
      bottom 2px
      background-color white
      transition .4s
      border-radius 50%

input:checked + .b3-switch__text
  background-color var(--b3-theme-primary)

  &:before
    transform translateX(20px)

.test-data-item
  margin 4px 0

.pull-right
  float right

.hidden
  display none
</style>