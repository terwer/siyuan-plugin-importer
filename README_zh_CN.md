[English](README.md)

# 导入工具

<img src="./icon.png" width="160" height="160" alt="icon">

将 md, epub, docx, html 等格式的文件导入到思源笔记。目前支持的格式：.md, .epub, .docx, .html, .opml。

> 重要提示：由于 292 本体改动，此版本仅支持 292 以上客户端，低于此版本，请使用旧版插件！

## 核心特色

- **选择笔记**：支持选择笔记本，下次打开可自动记忆上次选择的笔记本
- **一键导入**：选择文件，一键导入即可，零配置
- **参数配置**：支持禁用自带的文本处理，支持强大的自定义处理函数配置，转换之后的 MD 文本怎么处理，完全由你自己说了算。

## FAQ

* Q1：导入工具插件怎么安装？安装之后在哪里找到他的入口？

  A1：找到 **`集市->插件->导入工具`** 下载启用即可。

  安装完成后，在顶部右侧工具栏找到 `导入工具` 图标，点击按照弹窗操作即可。

* Q2: 能否支持 mobi 文件？能否支持 Markdown 文件夹？

  A2：参考 https://github.com/terwer/siyuan-plugin-importer/issues/31 ，可先用 https://products.aspose.app/words/conversion/mobi-to-md 转换，然后用笔记本自带的导入文件夹实现。
  
  笔记已经自带导入 Markdown 文件夹功能，这个功能请直接使用笔记本自带的导入即可。
    
  插件只做增强，解决本体未解决的问题，对于这些重叠的功能，插件暂不做了。

* Q3：能否支持 docker 或者 移动端？

  A3：抱歉。受限于 pandoc ，docker 和移动端按时无法使用。请使用 PC 客户端。

## 更新历史

✨ 时隔两年，首次更新。由于工作繁忙，插件维护一度停滞，导致部分用户无法正常使用，在此深表歉意 🙏。现在插件已经恢复维护，可以正常使用了 🚀。

**1.8.0 (2025-06-15)**
### Bug Fixes
* 修复新版本导入问题
### Features
* 导入设置添加标签页导航
### Code Refactoring
* 移除未使用的组件，更新样式
* 技术栈从 Svelte 迁移到 Vue 3

**1.7.0 (2023-06-25)**
### Features
* 兼容 292 版本api改动
* 转换参数改为 gfm

**v1.6.0 主要更新**

### Features
* [#47](https://github.com/terwer/siyuan-plugin-importer/issues/47) 导入html支持图片 ([870b5fb](https://github.com/terwer/siyuan-plugin-importer/commit/870b5fb24c9806a5844615dfd4c743bec1a75a86))
* 优化 pandoc 参数 ([6e0ca9f](https://github.com/terwer/siyuan-plugin-importer/commit/6e0ca9f6698f8671c90cf36e02175b3cd772dbc2))
* 优化图标，新图标，新气象 ([d188b74](https://github.com/terwer/siyuan-plugin-importer/commit/d188b745e2e1a9caa60d409829fbc3d9f0ad1c6e))
* 优化帮助文档 ([b626917](https://github.com/terwer/siyuan-plugin-importer/commit/b62691718a46051974637e3d9f020dde639e1e69))
* 优化界面交互 ([ef435aa](https://github.com/terwer/siyuan-plugin-importer/commit/ef435aa6a51477874a740ed3a35a90be589334ca))
* 优化转换参数 ([843446a](https://github.com/terwer/siyuan-plugin-importer/commit/843446abe3279282b482443d89430010857f7927))
* 升级 siyuan 到 0.7.2，兼容最新 api ，解决 ismobile报错问题 ([531628f](https://github.com/terwer/siyuan-plugin-importer/commit/531628f41b197e2791efa35bf53263b7e0e5af12))
* 导入 md 支持资源文件 ([33a20c7](https://github.com/terwer/siyuan-plugin-importer/commit/33a20c7cdd19991235b507194c23a4017e3c872a))
* 支持自定义处理函数、支持禁用自带处理函数 ([f5452e2](https://github.com/terwer/siyuan-plugin-importer/commit/f5452e22a3e75f728676d5ca51766e199bccb61e))
* 新增自定义处理函数配置 ([f4a28a7](https://github.com/terwer/siyuan-plugin-importer/commit/f4a28a7b87e47124ab5bbb562686d6e91425701e))
* 显示临时文件夹路径，支持桌面端、桌面端浏览器 ([bc8c878](https://github.com/terwer/siyuan-plugin-importer/commit/bc8c878351a0642afd6a27a6045674649e57b242))
* 调整兼容性，最低版本为289，仅支持桌面端 ([93761c9](https://github.com/terwer/siyuan-plugin-importer/commit/93761c908c947c22bde1a35e9fc19292ffcbf29c))

**v1.5.3 主要更新**
* 优化移动端图标展示，注：移动端没有pandoc，导入功能暂不可用

**v1.5.2 主要更新**
* hash临时路径小写 ([38a2972](https://github.com/terwer/siyuan-plugin-importer/commit/38a29729b76c477d217e01d2770ccc4da793944d))
* 新增校验，批量导入之前必须清除临时文件 ([508999d](https://github.com/terwer/siyuan-plugin-importer/commit/508999d5cb01246a69c2c979f08f370933cc4630))

**v1.5.1 主要更新**

特性和问题修复

* [#33](https://github.com/terwer/siyuan-plugin-importer/issues/33) 支持选择目录批量导入 ([2e58a37](https://github.com/terwer/siyuan-plugin-importer/commit/2e58a37cc833061b8d12f1c9be96ad72a2df98f2))
* [#38](https://github.com/terwer/siyuan-plugin-importer/issues/38) 换行符问题 ([74c00c0](https://github.com/terwer/siyuan-plugin-importer/commit/74c00c095aae20077b7a79709c2d2721859f947e))
* 卸载不删除配置 ([a913034](https://github.com/terwer/siyuan-plugin-importer/commit/a9130349120f03e2705d886de9d3a470fa019513))
* 支持手动清理临时文件 ([5687248](https://github.com/terwer/siyuan-plugin-importer/commit/5687248f1aae2629ced3171f4b15f2def9babca0))
* 支持md文件导入，md无需转换，其他格式，先转换，后导入

开发重构

* i18n文件夹移动到src目录 ([0234c50](https://github.com/terwer/siyuan-plugin-importer/commit/0234c509a2dbadf851bce73ddc961c305cded145))

**v1.5.0 主要更新**

- 解决导入epub后，里面的图片会出现在未引用资源里面，容易被误清除问题，现在文档导入后，资源文件不会出现在未引用里面了。删除文档后，未引用资源可见。
- 重复导入现在会创建新的文章了
- 资源文件不在自定义hash命名，直接让导入API自己去处理

**v1.4.1 主要更新**

- 优化去除链接规则
- 屏蔽掉一部分 notebook

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