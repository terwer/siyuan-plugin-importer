[中文](README_zh_CN.md)

# siyuan-plugin-importer

Import epub, docx, html, etc. into Siyuan notes. Currently supported formats: .epub, .docx, .html, .opml.

## Core Features

- **Select Notes**: Support for selecting a notebook, the next time you open it, you can automatically remember the notebook you selected last time
- **One-click import**: Select a file, one-click import, zero configuration

## FAQ

* Q1：How to install the import tool plug-in? Where can I find his entrance after installation?

  A1：Find **`Marketplace->Plugins->Importer`** download and enable.

  After the installation is complete, find the `Importer` icon on the top right toolbar, and click to follow the pop-up window.

## Changelog
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