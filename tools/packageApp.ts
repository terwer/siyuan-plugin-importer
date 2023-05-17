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

import minimist from "minimist"
import FileUtils from "./utils/fileUtils"

/**
 * 插件打包
 *
 * @author terwer
 * @version 1.0.0
 * @since 1.0.0
 */
class PackageApp {
  public async packagePlugin(isTest: boolean) {
    // zip to build/package.zip etc.
    const zipTo = "./build/package.zip"
    await FileUtils.makeZip("./dist", zipTo)
    console.log(`plugin packaged to ${zipTo}`)

    // 开发测试阶段，拷贝到插件目录
    if (isTest) {
      // copy to local plugin folder
      await FileUtils.cp(
        "./dist",
        "/Users/terwer/Documents/mydocs/SiYuanWorkspace/public/data/plugins/siyuan-importer",
        true,
        true
      )
    }
  }
}

// 本地生产测试
// pnpm package -t
//
// 生产环境打包
// pnpm package
;(async () => {
  const args = minimist(process.argv.slice(2))
  const isTest = args.test || args.t || false

  const packageApp = new PackageApp()
  // plugin
  await packageApp.packagePlugin(isTest)
  console.log("app packaged.")
})()
