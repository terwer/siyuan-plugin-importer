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

import KernelApi from "../api/kernel-api"
import { dataDir } from "../Constants"

/**
 * 文件是否存在
 *
 * @param kernelApi - kernelApi
 * @param hpath - 路径
 * @param type - 类型
 */
export const isFileExistsByHpath = async (kernelApi: KernelApi, hpath: string, type: "text" | "json") => {
  try {
    const res = await kernelApi.getFile(hpath, type)
    return res !== null
  } catch {
    return false
  }
}

/**
 * 文件是否存在
 *
 * @param kernelApi - kernelApi
 * @param p - 路径
 * @param type - 类型
 */
export const isFileExists = async (kernelApi: KernelApi, p: string, type: "text" | "json") => {
  try {
    const res = await kernelApi.getFile(p, type)
    return res !== null
  } catch {
    return false
  }
}

/**
 * 删除空行
 *
 * @param str - 字符串
 */
// 删除图片
// export const removeEmptyLines = (str: string): string => str.replace(/^#+\s*\n|!\[.*?\]\(.*?\)\n+|\n\u00A0+/gm, "\n")
// 保留图片
export const removeEmptyLines = (str: string): string => str.replace(/^#+\s*\n|\n\u00A0+/gm, "\n")

/**
 * 修复图片路径
 *
 * @param mdText - markdown 文本
 */
export const replaceImagePath = (mdText: string): string => {
  const basePath = dataDir
  const regex = /!\[(.*?)\]\((\/.*?)\)/g
  return mdText.replace(regex, (match, p1, p2) => {
    if (p2.includes(basePath)) {
      return `![${p1}](${p2.replace(basePath, "")})`
    }
    return match
  })
}
