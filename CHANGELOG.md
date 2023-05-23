# Changelog

## [1.5.1](https://github.com/terwer/siyuan-plugin-importer/compare/v1.5.0...v1.5.1) (2023-05-23)
### Bug Fixes
* [#33](https://github.com/terwer/siyuan-plugin-importer/issues/33) 支持选择目录批量导入 ([2e58a37](https://github.com/terwer/siyuan-plugin-importer/commit/2e58a37cc833061b8d12f1c9be96ad72a2df98f2))
* [#38](https://github.com/terwer/siyuan-plugin-importer/issues/38) 换行符问题 ([74c00c0](https://github.com/terwer/siyuan-plugin-importer/commit/74c00c095aae20077b7a79709c2d2721859f947e))
* 卸载不删除配置 ([a913034](https://github.com/terwer/siyuan-plugin-importer/commit/a9130349120f03e2705d886de9d3a470fa019513))
* 支持手动清理临时文件 ([5687248](https://github.com/terwer/siyuan-plugin-importer/commit/5687248f1aae2629ced3171f4b15f2def9babca0))
* 支持md文件导入，md无需转换，其他格式，先转换，后导入
### Miscellaneous
* i18n文件夹移动到src目录 ([0234c50](https://github.com/terwer/siyuan-plugin-importer/commit/0234c509a2dbadf851bce73ddc961c305cded145))
## [1.5.0](https://github.com/terwer/siyuan-plugin-importer/compare/v1.4.1...v1.5.0) (2023-05-19)
### Features
* [#20](https://github.com/terwer/siyuan-plugin-importer/issues/20) 导入epub后，里面的图片会出现在未引用资源里面，容易被误清除 ([824cf2a](https://github.com/terwer/siyuan-plugin-importer/commit/824cf2a96f277be058a896c045793f21a44c7b08))
* 重复导入现在会创建新的文章了
* 资源文件不在自定义hash命名，直接让导入api自己去处理
## [1.4.1](https://github.com/terwer/siyuan-plugin-importer/compare/v1.4.0...v1.4.1) (2023-05-18)
* [#22](https://github.com/terwer/siyuan-plugin-importer/issues/22) 优化去除链接规则 ([eec21f5](https://github.com/terwer/siyuan-plugin-importer/commit/eec21f55ced3d3bc51aed535306abe9b5d0d6780))
* 屏蔽掉一部分 notebook 感谢 @frostime 的贡献
* hash 路径使用小写字母 ([075902e](https://github.com/terwer/siyuan-plugin-importer/commit/075902e00ebfad409ede86e5e610a848877db2cb))
## [1.4.0](https://github.com/terwer/siyuan-plugin-importer/compare/v1.3.0...v1.4.0) (2023-05-18)
* [#16](https://github.com/terwer/siyuan-plugin-importer/issues/16) [#18](https://github.com/terwer/siyuan-plugin-importer/issues/18) 修复路径问题，删除无法点击的链接 ([b720f29](https://github.com/terwer/siyuan-plugin-importer/commit/b720f29fe46e196cd45e3ec5e23f9588a90c4d55))
* 路径新增hash，防止多个文件有相同图片时候，图片被覆盖，例如：/assets/import/1nmels/cover.jpeg
* pandoc生成的目录链接不可点击，暂时去掉
* pandoc脚注不能跳转，暂时去掉保持标题清爽
* [#17](https://github.com/terwer/siyuan-plugin-importer/issues/17) 修复部分场景下，顶部 svg 显示异常问题
* 监控i18n等文件状态 ([1086d8b](https://github.com/terwer/siyuan-plugin-importer/commit/1086d8b2afc82182a9123722c59169d2c1314594))
## [1.3.0](https://github.com/terwer/siyuan-plugin-importer/compare/v1.2.0...v1.3.0) (2023-05-17)
* 支持图片导入 ([6387db2](https://github.com/terwer/siyuan-plugin-importer/commit/6387db2273ad23ea6161b4a4ed681591494bacf1))
## [1.2.0](https://github.com/terwer/siyuan-plugin-importer/compare/v1.1.0...v1.2.0) (2023-05-17)
* 自动打包暂时不好用，改为手动上传 package.zip ([e1a8ffb](https://github.com/terwer/siyuan-plugin-importer/commit/e1a8ffbb16a7a51de5271c3850ec39a4123ca84f))
### Code Refactoring
* 调整打包结构，适应集市规则 ([a70a921](https://github.com/terwer/siyuan-plugin-importer/commit/a70a921744ba8f6c8c01c175bef232f7e65876f5))
## [1.1.0](https://github.com/terwer/siyuan-plugin-importer/compare/v1.0.0...v1.1.0) (2023-05-17)
* 初始化插件项目 ([e41c745](https://github.com/terwer/siyuan-plugin-importer/commit/e41c7458cf8f3882b072e214a78fb858d33a29f6))
* 完善国际化以及项目说明 ([07a2099](https://github.com/terwer/siyuan-plugin-importer/commit/07a2099912318ea8f73e666b70f1d0d438f78ee7))
* 完成导入epub基础功能 ([a0580fa](https://github.com/terwer/siyuan-plugin-importer/commit/a0580fabfba2834cdd73bfa5d4ce2da79ba52a5a))
* 完成导出epub、docx、opml、html测试 ([1d671b6](https://github.com/terwer/siyuan-plugin-importer/commit/1d671b697b006d881315a90dfd45310d415272a1))
* 导入工具第一个版本 ([1fc739b2](https://github.com/terwer/siyuan-plugin-importer/commit/1fc739b676ba51460c7f57e4e22c00869517b74f))
* 插件最小化运行单位 ([155a825](https://github.com/terwer/siyuan-plugin-importer/commit/155a825461bf447d45083329ccce9eb93b3857d6))
* 新增kernelapi ([80ca482](https://github.com/terwer/siyuan-plugin-importer/commit/80ca4829e5949c871ddaacad2e6fced1771bd336))
* **main:** release 1.0.0 ([74258ce](https://github.com/terwer/siyuan-plugin-importer/commit/74258ce418a45bd64c7a4c2b947508a842691605))