import { describe, expect, it } from "vitest"
import { extractColorDeclarations, normalizeHtmlColors } from "./html-color"

describe("extractColorDeclarations", () => {
  it("提取 color 与 background-color，忽略其它样式", () => {
    expect(extractColorDeclarations("font-family:'PingFang SC'; color:#e03e2d; font-size:12px")).toEqual([
      "color: #e03e2d",
    ])
    expect(extractColorDeclarations("background-color: yellow; color: black")).toEqual([
      "background-color: yellow",
      "color: black",
    ])
  })

  it("支持 rgb()/var()/颜色名，拒绝 url() 与带引号的可疑值", () => {
    expect(extractColorDeclarations("color: rgb(224, 62, 45)")).toEqual(["color: rgb(224, 62, 45)"])
    expect(extractColorDeclarations("color: var(--b3-font-color1)")).toEqual(["color: var(--b3-font-color1)"])
    expect(extractColorDeclarations("color: red")).toEqual(["color: red"])
    expect(extractColorDeclarations("color: url(https://example.com/a.png)")).toEqual([])
    expect(extractColorDeclarations('color: "red"')).toEqual([])
  })
})

describe("normalizeHtmlColors", () => {
  it("保留 span 上的内联颜色", () => {
    const output = normalizeHtmlColors('<p><span style="color:#e03e2d">红</span></p>')
    expect(output).toContain('<span style="color:#e03e2d">红</span>')
  })

  it("<font color> 转成带颜色的 span", () => {
    const output = normalizeHtmlColors('<p><font color="#c00000">font 红</font></p>')
    expect(output).toContain('<span style="color: #c00000">font 红</span>')
    expect(output).not.toContain("<font")
  })

  it("块级元素上的颜色下推到文本 span，并保留其余样式", () => {
    const output = normalizeHtmlColors('<p style="color:#c00000;font-size:18px">段落红</p>')
    expect(output).toContain('<span style="color: #c00000">段落红</span>')
    expect(output).toContain("font-size: 18px")
    expect(output).not.toMatch(/<p[^>]*color/)
  })

  it("混合行内元素上的颜色也能保留（文本成 span，粗体整体包 span）", () => {
    const output = normalizeHtmlColors('<p style="color:red;font-size:18px">文本 <b>粗体</b></p>')
    expect(output).toContain('<span style="color: red">文本 </span>')
    expect(output).toContain('<span style="color: red"><b>粗体</b></span>')
    expect(output).toContain("font-size: 18px")
  })

  it("子元素自己的颜色优先于父元素（模拟 CSS 继承）", () => {
    const output = normalizeHtmlColors('<p style="color:red"><span style="color:blue">蓝</span>红</p>')
    expect(output).toMatch(/<span style="color:\s*blue">蓝<\/span>/)
    expect(output).toContain('<span style="color: red">红</span>')
  })

  it("父容器的颜色继承到块级子元素（div > p）", () => {
    const output = normalizeHtmlColors('<div style="color:#00b050"><p>a</p><p>b</p></div>')
    expect(output).toContain('<span style="color: #00b050">a</span>')
    expect(output).toContain('<span style="color: #00b050">b</span>')
    expect(output).not.toMatch(/<div[^>]*color/)
  })

  it("同时保留文字颜色与背景色", () => {
    const output = normalizeHtmlColors('<p style="background-color:yellow;color:black">高亮</p>')
    expect(output).toContain('<span style="background-color: yellow; color: black">高亮</span>')
  })

  it("无颜色时不产生多余 span，只保留原有样式", () => {
    const output = normalizeHtmlColors('<p style="font-size:18px">正文</p>')
    expect(output).not.toContain("color:")
    expect(output).toContain('<p style="font-size:18px">正文</p>')
  })

  it("保留 <a> 链文本的颜色（交给 pandoc 输出带颜色 span 的链接）", () => {
    const output = normalizeHtmlColors('<p><a href="https://example.com" style="color:#c00000">链接</a></p>')
    expect(output).toContain('<span style="color: #c00000"><a href="https://example.com">链接</a></span>')
  })

  it("旧式/未知块级标签不会被非法包进 span（center 下推到文本）", () => {
    const output = normalizeHtmlColors('<center style="color:red">居中红</center>')
    expect(output).toContain('<center><span style="color: red">居中红</span></center>')
  })

  it("普通 HTML 结构保持完整，相对资源路径不受影响", () => {
    const output = normalizeHtmlColors('<p><img src="pic.png"><br>正文</p>')
    expect(output).toContain('<img src="pic.png">')
    expect(output).toContain("<br>")
    expect(output).toContain("正文")
  })
})
