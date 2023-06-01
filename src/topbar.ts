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

import ImporterPlugin from "./index"
import { Dialog, getFrontend, Menu } from "siyuan"
import ImportForm from "./lib/ImportForm.svelte"
import { iconImporter } from "./utils/svg"
import ImportSetting from "./lib/ImportSetting.svelte"

/**
 * 顶栏按钮
 *
 * @param pluginInstance - 插件实例
 * @author terwer
 * @version 1.0.0
 * @since 1.0.0
 */
export async function initTopbar(pluginInstance: ImporterPlugin) {
  const topBarElement = pluginInstance.addTopBar({
    icon: iconImporter.iconImporter,
    title: pluginInstance.i18n.importer,
    position: "right",
    callback: () => {
      pluginInstance.logger.info(`this.i18n.importer added toolbar`)
    },
  })

  topBarElement.addEventListener("click", async () => {
    const frontEnd = getFrontend()
    const isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile"
    const importFormId = "siyuan-import-form"
    const d = new Dialog({
      title: `${pluginInstance.i18n.selectFile} - ${pluginInstance.i18n.importer}`,
      content: `<div id="${importFormId}"></div>`,
      width: isMobile ? "92vw" : "720px",
    })
    new ImportForm({
      target: document.getElementById(importFormId) as HTMLElement,
      props: {
        pluginInstance: pluginInstance,
        dialog: d,
      },
    })
  })

  // 添加右键菜单
  topBarElement.addEventListener("contextmenu", () => {
    let rect = topBarElement.getBoundingClientRect()
    // 如果获取不到宽度，则使用更多按钮的宽度
    if (rect.width === 0) {
      rect = document.querySelector("#barMore").getBoundingClientRect()
    }
    initContextMenu(pluginInstance, rect)
  })

  const initContextMenu = async (pluginInstance: ImporterPlugin, rect: DOMRect) => {
    const menu = new Menu("importerContextMenu")

    // 设置
    menu.addItem({
      iconHTML: iconImporter.iconSetting,
      label: pluginInstance.i18n.setting,
      click: () => {
        const settingId = "siyuan-importing-setting"
        const d = new Dialog({
          title: `${pluginInstance.i18n.setting} - ${pluginInstance.i18n.importer}`,
          content: `<div id="${settingId}"></div>`,
          width: pluginInstance.isMobile ? "92vw" : "720px",
        })
        new ImportSetting({
          target: document.getElementById(settingId) as HTMLElement,
          props: {
            pluginInstance: pluginInstance,
            dialog: d,
          },
        })
      },
    })

    if (pluginInstance.isMobile) {
      menu.fullscreen()
    } else {
      menu.open({
        x: rect.right,
        y: rect.bottom,
        isLeft: true,
      })
    }
  }
}
