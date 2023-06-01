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
import { getBackend, getFrontend } from "siyuan"

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

function convertPathToUnixStyle(path) {
  // 使用 replace() 函数将所有反斜杠替换为斜杠
  return path.replace(/\\/g, "/")
}
/**
 * 修复图片路径
 *
 * @param mdText - markdown 文本
 */
export function replaceImagePath(mdText) {
  const regex = /!\[(.*?)\]\(([^\s]*?)\)/g
  return mdText.replace(regex, (match, p1, p2) => {
    const imagePath = p2

    if (!imagePath.startsWith(dataDir)) {
      return match
    }

    const relativePath = convertPathToUnixStyle(imagePath.substring(dataDir.length))

    return `![${p1}](${relativePath})`
  })
}

// 将字符串中形如"xxx^yyy"的部分替换成"xxx"
export function removeFootnotes(text) {
  const regex = /\^\(\[.*[0-9].*]\(#.*#.*\)\)/g // 匹配格式为 ^[[数字]](#链接) 的脚注
  return text.replace(regex, "") // 使用空字符串替换匹配到的脚注
}

// 删除目录中的内部链接
export function removeLinks(text) {
  const regex = /\[([^\]]+)]\(([^)]+)\)/g
  return text.replace(regex, (match, p1, p2) => {
    if (p2.includes("./Text") || p2.includes("#") || p2.includes("kindle:")) {
      return p1
    } else {
      return match
    }
  })
}

export const isPC = () => {
  const backEnd = getBackend()
  const frontEnd = getFrontend()
  const isPcBack = backEnd === "windows" || "linux" || "darvin"
  const isPcFront = frontEnd === "desktop"
  return isPcBack && isPcFront
}

async function mkdirp(dir) {
  const fs = window.require("fs/promises")
  const path = window.require("path")
  const absPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir)
  try {
    await fs.access(absPath)
    // 如果路径已经存在，则直接返回
    return absPath
  } catch (e) {
    if (e.code === "ENOENT") {
      // 如果路径不存在，则递归创建上级目录
      await mkdirp(path.dirname(absPath))
      return fs.mkdir(absPath)
    } else {
      throw e
    }
  }
}

export const copyDir = async (src, dest) => {
  if (!isPC()) {
    console.warn("Not PC, it will not work")
    return
  }
  const fs = window.require("fs")
  const path = window.require("path")

  if(!fs.existsSync(src)){
    console.warn("Can not get path")
    return
  }

  // 创建文件夹
  if (!fs.existsSync(dest)) {
    await mkdirp(dest)
  }
  // 读取源文件夹
  const files = fs.readdirSync(src)
  // 遍历源文件夹中的文件/文件夹
  for (let file of files) {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    // 判断是否为文件夹
    if (fs.statSync(srcPath).isDirectory()) {
      // 递归拷贝文件夹
      copyDir(srcPath, destPath)
    } else {
      // 拷贝文件
      fs.copyFileSync(srcPath, destPath)
    }
  }
}
