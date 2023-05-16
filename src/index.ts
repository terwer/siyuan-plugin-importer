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

import { App, Dialog, IObject, isMobile, Plugin } from "siyuan"
import { createLogger } from "./utils/simple-logger"
import KernelApi from "./api/kernel-api"
import { isDev } from "./Constants"
import ImportForm from "./lib/ImportForm.svelte"
import "./index.styl"

export default class ImporterPlugin extends Plugin {
  private logger
  private kernelApi

  constructor(options: { app: App; id: string; name: string; i18n: IObject }) {
    super(options)

    this.logger = createLogger("index")
    this.kernelApi = new KernelApi()
  }

  onload() {
    if (isDev) {
      this.logger.warn("DEV mode is enabled")
    }

    const topBarElement = this.addTopBar({
      icon: "iconEmoji",
      title: this.i18n.importer,
      position: "right",
      callback: () => {
        this.logger.info(`this.i18n.importer added toolbar`)
      },
    })
    topBarElement.addEventListener("click", async () => {
      const importFormId = "siyuan-import-form"
      const d = new Dialog({
        title: `${this.i18n.selectFile} - ${this.i18n.importer}`,
        content: `<div id="${importFormId}"></div>`,
        width: isMobile() ? "92vw" : "720px",
      })
      new ImportForm({
        target: document.getElementById(importFormId) as HTMLElement,
        props: {
          pluginInstance: this,
          dialog: d,
        },
      })
    })

    this.logger.info("Importer loaded")
  }

  onunload() {
    this.logger.info("Importer loaded")
  }
}
