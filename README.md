[中文](README_zh_CN.md)

# siyuan-plugin-importer

<img src="./icon.png" width="160" height="160" alt="icon">

Import md, epub, docx, html, etc. into Siyuan notes. Currently supported formats: .md, .epub, .docx, .html, .opml.

> Important: Due to the 292 ontology change, this version only supports clients above 292, below this version, please use the old version of the plugin!

## Core Features

- **Select Notes**: Support for selecting a notebook, the next time you open it, you can automatically remember the notebook you selected last time
- **One-click import**: Select a file, one-click import, zero configuration

## FAQ

* Q1：How to install the import tool plug-in? Where can I find his entrance after installation?

  A1：Find **`Marketplace->Plugins->Importer`** download and enable.

  After the installation is complete, find the `Importer` icon on the top right toolbar, and click to follow the pop-up window.

## Changelog

**1.7.0 (2023-06-25)**
### Features
* Compatible with API changes in version 292
* Conversion parameter changed to GFM

**v1.6.0 major update**

### Features
* [#47](https://github.com/terwer/siyuan-plugin-importer/issues/47) Import html support images ([870b5fb](https://github.com/terwer/siyuan-plugin-importer/commit/870b5fb24c9806a5844615dfd4c743bec1a75a86))
* Optimize pandoc parameters ([6e0ca9f](https://github.com/terwer/siyuan-plugin-importer/commit/6e0ca9f6698f8671c90cf36e02175b3cd772dbc2))
* Optimize icon, new icon, new weather ([d188b74](https://github.com/terwer/siyuan-plugin-importer/commit/d188b745e2e1a9caa60d409829fbc3d9f0ad1c6e))
* Optimize help documentation ([b626917](https://github.com/terwer/siyuan-plugin-importer/commit/b62691718a46051974637e3d9f020dde639e1e69))
* Optimize interface interaction ([ef435aa](https://github.com/terwer/siyuan-plugin-importer/commit/ef435aa6a51477874a740ed3a35a90be589334ca))
* Optimize conversion parameters ([843446a](https://github.com/terwer/siyuan-plugin-importer/commit/843446abe3279282b482443d89430010857f7927))
* Upgrade siyuan to 0.7.2, compatible with latest api, solve ismobile error problem ([531628f](https://github.com/terwer/siyuan-plugin-importer/commit/531628f41b197e2791efa35bf53263b7e0e5af12))
* Import md support resource files ([33a20c7](https://github.com/terwer/siyuan-plugin-importer/commit/33a20c7cdd19991235b507194c23a4017e3c872a))
* Support custom processing functions, support disabling built-in processing functions ([f5452e2](https://github.com/terwer/siyuan-plugin-importer/commit/f5452e22a3e75f728676d5ca51766e199bccb61e))
* Add custom processing function configuration ([f4a28a7](https://github.com/terwer/siyuan-plugin-importer/commit/f4a28a7b87e47124ab5bbb562686d6e91425701e))
* Display temporary folder path, support desktop and desktop browsers ([bc8c878](https://github.com/terwer/siyuan-plugin-importer/commit/bc8c878351a0642afd6a27a6045674649e57b242))
* Adjust the compatibility, the minimum version is 289, only support desktop ([93761c9](https://github.com/terwer/siyuan-plugin-importer/commit/93761c908c947c22bde1a35e9fc19292ffcbf29c))

**v1.5.3 major update**
* Optimize the icon display on the mobile terminal, note: there is no pandoc on the mobile terminal, and the import function is temporarily unavailable

**v1.5.2 major update**
* hash temporary path lowercase ([38a2972](https://github.com/terwer/siyuan-plugin-importer/commit/38a29729b76c477d217e01d2770ccc4da793944d))
* New verification, temporary files must be cleared before batch import ([508999d](https://github.com/terwer/siyuan-plugin-importer/commit/508999d5cb01246a69c2c979f08f370933cc4630))

**v1.5.1 major update**

Features and bug fixes

* [#33](https://github.com/terwer/siyuan-plugin-importer/issues/33) Support batch import of selected directories ([2e58a37](https://github.com/terwer/siyuan-plugin-importer/commit/2e58a37cc833061b8d12f1c9be96ad72a2df98f2))
* [#38](https://github.com/terwer/siyuan-plugin-importer/issues/38) line break problem([74c00c0](https://github.com/terwer/siyuan-plugin-importer/commit/74c00c095aae20077b7a79709c2d2721859f947e))
* Uninstall does not delete configuration ([a913034](https://github.com/terwer/siyuan-plugin-importer/commit/a9130349120f03e2705d886de9d3a470fa019513))
* Support manual cleaning of temporary files ([5687248](https://github.com/terwer/siyuan-plugin-importer/commit/5687248f1aae2629ced3171f4b15f2def9babca0))
* Support md file import, md does not need to be converted, other formats, convert first, then import

Development refactoring

* Move the i18n folder to the src directory ([0234c50](https://github.com/terwer/siyuan-plugin-importer/commit/0234c509a2dbadf851bce73ddc961c305cded145))
**v1.5.0 major update**

- Solve the problem that after importing epub, the pictures in it will appear in the unreferenced resources, which are easy to be cleared by mistake. Now after the document is imported, the resource files will not appear in the unreferenced ones. Unreferenced resources are visible after the document is deleted.
- Repeated imports now create new articles
- The resource file is not named in the custom hash, directly let the import API handle it by itself

**v1.4.1 major update**

- Optimize link removal rules
- Block some notebooks

**v1.4.0 major update**

In short, this version is strongly recommended for all users to upgrade, to prevent resource files from being unable to cross-platform due to previous path problems, and to have a better user experience in other aspects.

- Fix the problem that Windows path replacement does not take effect
  For example, the converted path: C:\Users\terwer\Documents\mydocs\SiyuanWorkspace\public\data/assets/import/cover.jpeg
  Now, on the Windows platform, it can be displayed normally as: /assets/import/cover.jpeg

- A new hash is added to the path to prevent the image from being overwritten when multiple files have the same image, for example: /assets/import/1nMELS/cover.jpeg

- The directory link generated by pandoc is not clickable, temporarily removed

- The pandoc footnote cannot be jumped, temporarily remove it to keep the title clean

- Fix the abnormal display problem of the top svg in some scenes

**v1.3.0 major update**

- Support image import

**v1.2.0 major update**

- Support text import
- Remove some redundant blank lines

For more update records, please check [CHANGELOG](https://github.com/terwer/siyuan-plugin-importer/blob/main/CHANGELOG.md)

## Donate

If you approve of this project, invite me to have a cup of coffee, which will encourage me to keep updating and create
more useful tools~

### Wechat

<div>
<img src="https://static-rs-terwer.oss-cn-beijing.aliyuncs.com/donate/wechat.jpg" alt="wechat" style="width:280px;height:375px;" />
</div>

### Alipay

<div>
<img src="https://static-rs-terwer.oss-cn-beijing.aliyuncs.com/donate/alipay.jpg" alt="alipay" style="width:280px;height:375px;" />
</div>

## Thanks

Thanks to [siyuan-note](https://github.com/siyuan-note/siyuan) and [pandoc](https://github.com/jgm/pandoc) for their strong support for this plugin