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
import { getBackend, getFrontend } from "siyuan"
import { StrUtil } from "zhi-common"

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
    if (type === "text") {
      return !StrUtil.isEmptyString(res)
    }
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
 * 修复要点
 * 1、转 unix 路径
 * 2、修复 pandoc 资源路径
 *
 * @param mdText - markdown 文本
 */
export function replaceImagePath(mdText) {
  const regex = /!\[(.*?)\]\(([^\s]*?)\)/g
  return mdText.replace(regex, (match, p1, p2) => {
    let title = p1
    let imagePath = p2

    // console.log("p1=>", title)
    // console.log("p2=>", imagePath)

    // 修复资源路径
    imagePath = convertPathToUnixStyle(imagePath)
    // 修复 pandoc 路径问题
    imagePath = imagePath.replace(/\.\/\.\.\/assets/g, "./assets")

    return `![${title}](${imagePath})`
  })
}

/**
 * 清理 pandoc markdown 输出里的原生语法残留。
 *
 * 1.10.0 起转换格式由 `gfm-raw_html` 改为 `markdown`（为了复杂表格输出 HTML、公式输出
 * `$...$`）。markdown 输出会保留 pandoc 专属语法，而思源 Lute 不识别它们，会原样当作
 * 正文显示，即用户看到的「源文件代码」：
 * - 行内 span 属性：`[COPYRIGHT]{#Copyright.xhtml_entitle style="font-weight: bold"}`
 * - 标题属性：`# 第一章 {.chapter}`
 * - 链接/图片属性：`[\[16\]](#footnote_16){#fnref16}`、`![图](a.png){width="50%"}`
 * - 围栏 div：`::: part` / `:::: {#id .class}` / `:::`
 * - 空锚点：`[]{#ch001.xhtml}`
 *
 * 内置处理函数负责去掉这些属性与围栏，只保留可阅读的内容（属性里的字体、颜色、宽度等
 * 思源本身也无法通过导入的 markdown 保留，留着只会变成可见源码）。
 *
 * @param text - pandoc 输出的 markdown 文本
 */
export function removePandocMarkup(text: string): string {
  let result = text

  // 1. 列表项里的围栏 div（如 `1.  ::: {#footnote-1}`）：保留列表序号，去掉围栏及属性
  result = result.replace(/^([ \t]*(?:\d+[.)]|[+*-])[ \t]+):{3,}[^\n]*$/gm, "$1")
  // 2. 独立成行的围栏 div（`::: part`、`:::: {#id .class}`、结尾的 `:::`），只去围栏，保留内部内容
  result = result.replace(/^[ \t]*:{3,}[^\n]*$/gm, "")

  // 3. 空 span 锚点 `[]{#id}`（pandoc 用它在正文里保留 epub 锚点，无可见内容）
  result = result.replace(/\[\]\{[^}\n]*\}/g, "")

  // 4. 链接 / 图片上的属性：`[文本](url){#id}`、`![图](a.png){width="50%"}` → 去掉 `{...}`
  result = result.replace(/(!?\[(?:[^\[\]\\\n]|\\.)*\]\([^)\n]*\))\{[^}\n]*\}/g, "$1")

  // 5. 行内 span：`[文本]{#id style="..."}` → `文本`
  result = result.replace(/\[((?:[^\[\]\\\n]|\\.)*)\]\{[^}\n]*\}/g, "$1")

  // 6. 标题上的属性：`## 标题 {#id .class}` → `## 标题`
  result = result.replace(/^(#{1,6}[ \t]+.*?)[ \t]*\{[^}\n]*\}[ \t]*$/gm, "$1")

  // 第 1 步去掉围栏后可能残留行尾空格
  return result.replace(/[ \t]+$/gm, "")
}

// 将字符串中形如"xxx^yyy"的部分替换成"xxx"
export function removeFootnotes(text) {
  // 脚注链接文本形如 `[\[16\]](#part0019.xhtml_footnote_16)`，链接以 `#` 锚点开头
  // （兼容旧 gfm 输出的 `(#part0019.html#footnote_16)` 双 `#` 形式）
  const footnoteLink = String.raw`\[(?:[^\[\]\\\n]|\\.)*?[0-9](?:[^\[\]\\\n]|\\.)*?\]\(#[^)\n]*\)`
  // pandoc markdown 输出：`^[\[16\]](#part0019.xhtml_footnote_16)^`（上标包住脚注链接）；
  // 链接后的 `{#fnref16}` 属性可能尚未清理，一并容忍
  const superscript = new RegExp(String.raw`\^${footnoteLink}(?:\{[^}\n]*\})?\^`, "g")
  // 历史 gfm 输出：`^([\[16\]](#part0019.html#footnote_16))`（括号包住脚注链接）
  const parenthesized = new RegExp(String.raw`\^\(${footnoteLink}(?:\{[^}\n]*\})?\)`, "g")
  return text.replace(superscript, "").replace(parenthesized, "")
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

/**
 * 表格边框常亮样式。
 *
 * 复杂表格（含合并单元格 colspan/rowspan）无法用 GFM 管道表格表达，pandoc 会输出 HTML <table>，
 * 思源 Lute 将其作为 HTML 块渲染。原生 HTML 表格默认无边框，这里给这些 HTML 表格注入内联边框样式，
 * 使其在思源内也能看到漂亮的边框。
 *
 * 使用思源 CSS 变量 --b3-border-color（跟随主题），并带 #d0d0d0 兜底，避免 HTML 块作用域内拿不到变量。
 */
const TABLE_BORDER_STYLE = "border-collapse: collapse"
const CELL_BORDER_STYLE = "border: 1px solid var(--b3-border-color, #d0d0d0); padding: 6px 12px"

/**
 * 将样式追加到已有 style 属性，保留原有属性值（如 pandoc 输出的 text-align、colspan 等），不覆盖。
 */
function attrsWithBorder(attrs: string, styleToAdd: string): string {
  const doubleQuoteStyle = /style\s*=\s*"([^"]*)"/i
  const doubleQuoteMatch = attrs.match(doubleQuoteStyle)
  if (doubleQuoteMatch) {
    const existing = doubleQuoteMatch[1].replace(/;*\s*$/, "").trim()
    const merged = existing ? `${existing}; ${styleToAdd}` : styleToAdd
    return attrs.replace(doubleQuoteStyle, `style="${merged}"`)
  }
  const singleQuoteStyle = /style\s*=\s*'([^']*)'/i
  const singleQuoteMatch = attrs.match(singleQuoteStyle)
  if (singleQuoteMatch) {
    const existing = singleQuoteMatch[1].replace(/;*\s*$/, "").trim()
    const merged = existing ? `${existing}; ${styleToAdd}` : styleToAdd
    return attrs.replace(singleQuoteMatch[0], `style='${merged}'`)
  }
  return `${attrs} style="${styleToAdd}"`
}

/**
 * 给 pandoc 输出的 HTML <table> 及相关单元格注入边框样式。
 *
 * 非破坏性：
 * - 只匹配真实的 HTML <table>/<th>/<td> 标签，不影响普通文本；
 * - 合并而非覆盖已有 style（如 text-align: center、colspan）；
 * - 不影响 GFM 管道表格（| a | b |）与思源原生表格块。
 *
 * @param text - markdown 文本
 */
export function addTableBorder(text: string): string {
  return text
    .replace(/<table\b([^>]*)>/gi, (_match, attrs) => `<table${attrsWithBorder(attrs, TABLE_BORDER_STYLE)}>`)
    .replace(/<(th|td)\b([^>]*)>/gi, (_match, tag, attrs) => `<${tag}${attrsWithBorder(attrs, CELL_BORDER_STYLE)}>`)
}

/**
 * 判断 markdown 文本中是否包含网络（远程）图片引用（如 ![alt](https://...)）。
 * 用于判断导入后是否需要提示用户将网络资源转换为本地（思源内置「网络资源文件转换本地」）。
 *
 * @param text - markdown 文本
 */
export function containsNetAssets(text: string): boolean {
  return /!\[[^\]]*\]\(\s*https?:\/\/[^)\s]+/i.test(text)
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

  if (!fs.existsSync(src)) {
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
      await copyDir(srcPath, destPath)
    } else {
      // 异步拷贝文件，避免大文件阻塞 UI
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

export const getExports = (jsText) => {
  return eval(jsText)
}
