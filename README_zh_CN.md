[English](README.md)

# 导入工具

![](https://raw.githubusercontent.com/terwer/siyuan-plugin-importer/main/icon.png)

将 epub, docx, html 等格式的文件导入到思源笔记。目前支持的格式：.epub, .docx, .html, .opml。

## 核心特色

- **选择笔记**：支持选择笔记本，下次打开可自动记忆上次选择的笔记本
- **一键导入**：选择文件，一键导入即可，零配置

## FAQ

* Q1：导入工具插件怎么安装？安装之后在哪里找到他的入口？

  A1：找到 **`集市->插件->导入工具`** 下载启用即可。

  安装完成后，在顶部右侧工具栏找到 `导入工具` 图标，点击按照弹窗操作即可。

## 更新历史

**v1.4.0 主要更新**

总之，这个版本强烈建议所有用户升级，防止之前的路径问题导致资源文件无法跨平台，同时在其他方面也有更好的用户体验。

- 修复 Windows 路径替换未生效问题
  例如，转换后的路径：C:\Users\terwer\Documents\mydocs\SiyuanWorkspace\public\data/assets/import/cover.jpeg
  现在，在Windows平台，可正常显示为：/assets/import/cover.jpeg

- 路径新增hash，防止多个文件有相同图片时候，图片被覆盖，例如：/assets/import/1nMELS/cover.jpeg

- pandoc生成的目录链接不可点击，暂时去掉

- pandoc脚注不能跳转，暂时去掉保持标题清爽

- 修复部分场景下，顶部 svg 显示异常问题

**v1.3.0 主要更新**

- 支持图片导入

**v1.2.0 主要更新**

- 支持文本导入
- 去除部分多余的空行

更多更新记录请查看 [CHANGELOG](https://github.com/terwer/siyuan-plugin-importer/blob/main/CHANGELOG.md)

## 捐赠

如果您认可这个项目，请我喝一杯咖啡吧，这将鼓励我持续更新，并创作出更多好用的工具~

### 微信

<div>
<img src="https://static-rs-terwer.oss-cn-beijing.aliyuncs.com/donate/wechat.jpg" alt="wechat" style="width:280px;height:375px;" />
</div>

### 支付宝

<div>
<img src="https://static-rs-terwer.oss-cn-beijing.aliyuncs.com/donate/alipay.jpg" alt="alipay" style="width:280px;height:375px;" />
</div>

## 感谢

感谢 [思源笔记](https://github.com/siyuan-note/siyuan) 和 [pandoc](https://github.com/jgm/pandoc) 对本插件的大力支持