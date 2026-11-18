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

/**
 * 文本颜色保留的公共实现。
 *
 * 思源 Lute 会把 markdown 里的内联 `<span style="color: ...">` 解析成文本标记
 * （.sy 中的 NodeTextMark），因此它是导入后仍能保留文字颜色、且随主题正常渲染的
 * 通用载体。pandoc 只在 span 与标题上保留 style 属性；HTML 里写在 `<font color>`、
 * `<p style="color: ...">`、`<td style="color: ...">` 等元素上的颜色会在转换时丢失，
 * 所以导入 HTML 前先把这些颜色统一提升到 span 上。
 */

/** 导入时保留的内联颜色属性，其余样式（字体、字号、对齐等）仍交给原有清理逻辑丢弃。 */
export const HTML_COLOR_PROPERTIES = ["color", "background-color"] as const

const COLOR_PROPERTY_SET = new Set<string>(HTML_COLOR_PROPERTIES)

/** 解析内联 style，保留声明顺序（不展开简写、不做 CSS 归一化）。 */
export function parseStyleDeclarations(style: string): Array<{ property: string; value: string }> {
  const declarations: Array<{ property: string; value: string }> = []
  for (const part of (style ?? "").split(";")) {
    const separator = part.indexOf(":")
    if (separator < 0) {
      continue
    }
    const property = part.slice(0, separator).trim().toLowerCase()
    const value = part.slice(separator + 1).trim()
    if (property !== "" && value !== "") {
      declarations.push({ property, value })
    }
  }
  return declarations
}

/**
 * 只接受可以安全写回 style 属性的颜色值，避免把任意文本当成样式注入。
 * 支持 hex、rgb()/hsl()、颜色名、var(--b3-font-colorN) 等常见写法。
 */
export function sanitizeColorValue(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/\s*!important\s*$/i, "")
    .trim()
  if (normalized === "") {
    return null
  }
  if (/[;{}<>"']/.test(normalized)) {
    return null
  }
  if (/url\s*\(|expression\s*\(/i.test(normalized)) {
    return null
  }
  return normalized
}

/** 从内联 style 提取受支持的颜色声明，格式为 `color: red` / `background-color: #fff`。 */
export function extractColorDeclarations(style: string): string[] {
  const declarations: string[] = []
  for (const { property, value } of parseStyleDeclarations(style)) {
    if (!COLOR_PROPERTY_SET.has(property)) {
      continue
    }
    const safe = sanitizeColorValue(value)
    if (safe !== null) {
      declarations.push(`${property}: ${safe}`)
    }
  }
  return declarations
}

/** 从 pandoc 的行内属性串（`{#id style="color: red"}`）里取出 style 值。 */
export function getIalStyle(attributes: string): string {
  const match = (attributes ?? "").match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
  return match ? match[1] ?? match[2] ?? "" : ""
}

/** 用内联 span 保留颜色；没有可保留颜色时原样返回，不影响原有清理行为。 */
export function wrapWithColor(content: string, declarations: string[]): string {
  if (declarations.length === 0) {
    return content
  }
  return `<span style="${declarations.join("; ")}">${content}</span>`
}

/** 去掉 style 中的颜色声明，保留其余样式（可能与 pandoc 的无损转换有关）。 */
function styleWithoutColor(style: string): string {
  return parseStyleDeclarations(style)
    .filter((declaration) => !COLOR_PROPERTY_SET.has(declaration.property))
    .map((declaration) => `${declaration.property}: ${declaration.value}`)
    .join("; ")
}

/** 把颜色声明追加到元素 style 中；元素已声明的同名属性优先（模拟 CSS 继承覆盖）。 */
function appendColorDeclarations(element: Element, declarations: string[]): void {
  if (declarations.length === 0) {
    return
  }
  const existingStyle = element.getAttribute("style") ?? ""
  const existingProperties = new Set(parseStyleDeclarations(existingStyle).map((declaration) => declaration.property))
  const additions = declarations.filter((declaration) => {
    const property = declaration.slice(0, declaration.indexOf(":")).trim().toLowerCase()
    return !existingProperties.has(property)
  })
  if (additions.length === 0) {
    return
  }
  const merged = [existingStyle.replace(/;\s*$/, "").trim(), ...additions].filter((part) => part !== "").join("; ")
  element.setAttribute("style", merged)
}

/**
 * 把 `<font color>` 标签转成带 style 的 span。
 * 只转换带 color 的 font；其余 font 由 pandoc 忽略标签、保留内容，不需要处理。
 */
function convertFontColorTags(doc: Document): void {
  for (const font of Array.from(doc.querySelectorAll("font"))) {
    const color = font.getAttribute("color")
    if (color === null) {
      continue
    }
    const span = doc.createElement("span")
    for (const attribute of Array.from(font.attributes)) {
      if (attribute.name.toLowerCase() !== "color") {
        span.setAttribute(attribute.name, attribute.value)
      }
    }
    appendColorDeclarations(span, extractColorDeclarations(`color: ${color}`))
    while (font.firstChild !== null) {
      span.appendChild(font.firstChild)
    }
    font.replaceWith(span)
  }
}

const TEXT_NODE = 3
const ELEMENT_NODE = 1

/** 行内标签：可以把整个元素包进 span，且不破坏 HTML 结构。 */
const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "big",
  "cite",
  "code",
  "data",
  "del",
  "dfn",
  "em",
  "font",
  "i",
  "ins",
  "kbd",
  "label",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "time",
  "tt",
  "u",
  "var",
])

/** 无内容元素，不能也不需要包 span。 */
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])

/**
 * 递归把元素上的文本颜色下推并包成 span：
 * - span 本身保留 style，交给 pandoc 输出行内属性；
 * - 行内元素（b/i/a/code 等）整体包一层颜色 span，这样 pandoc 会输出
 *   `[**粗体**]{style="color:..."}`，思源解析后粗体与颜色都能保留；
 * - 其余元素（p/td/h1/div 等）把颜色下推到子节点，避免产生非法的块级嵌套；
 * - 文本节点直接包成带颜色的 span。
 */
function normalizeElementColors(element: Element): void {
  const tagName = element.tagName.toLowerCase()
  if (tagName === "span") {
    for (const child of Array.from(element.children)) {
      normalizeElementColors(child)
    }
    return
  }

  const style = element.getAttribute("style") ?? ""
  const declarations = extractColorDeclarations(style)
  if (declarations.length === 0) {
    for (const child of Array.from(element.children)) {
      normalizeElementColors(child)
    }
    return
  }

  const remaining = styleWithoutColor(style)
  if (remaining === "") {
    element.removeAttribute("style")
  } else {
    element.setAttribute("style", remaining)
  }

  const doc = element.ownerDocument
  if (INLINE_TAGS.has(tagName) && !VOID_TAGS.has(tagName) && element.parentNode !== null) {
    const span = doc.createElement("span")
    span.setAttribute("style", declarations.join("; "))
    element.parentNode.insertBefore(span, element)
    span.appendChild(element)
    for (const child of Array.from(element.children)) {
      normalizeElementColors(child)
    }
    return
  }

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === TEXT_NODE) {
      if (child.textContent === null || child.textContent.trim() === "") {
        continue
      }
      const span = doc.createElement("span")
      span.setAttribute("style", declarations.join("; "))
      element.insertBefore(span, child)
      span.appendChild(child)
    } else if (child.nodeType === ELEMENT_NODE) {
      appendColorDeclarations(child as Element, declarations)
    }
  }
  for (const child of Array.from(element.children)) {
    normalizeElementColors(child)
  }
}

/**
 * 导入 HTML 前规范化文本颜色。
 *
 * 产出的 HTML 仍交给 pandoc 转换；pandoc 对 span 上的 style 会输出
 * `[文本]{style="color: ..."}`，再由 removePandocMarkup 转回思源可识别的内联 span。
 * 这样 HTML 中 span / font / 块级元素上的内联颜色都能保留，而不依赖某个具体 HTML 结构。
 *
 * 注意：仅处理内联 style 与 `<font color>`；外链样式表或 class 定义的颜色无法在此解析。
 */
export function normalizeHtmlColors(html: string): string {
  if (typeof DOMParser === "undefined") {
    return html
  }
  const doc = new DOMParser().parseFromString(html, "text/html")
  if (doc.body === null) {
    return html
  }
  convertFontColorTags(doc)
  normalizeElementColors(doc.body)
  return doc.documentElement.outerHTML
}
