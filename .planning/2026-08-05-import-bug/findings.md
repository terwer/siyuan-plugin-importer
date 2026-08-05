# 发现与调研记录

**日期**: 2026-08-05

## 发现12：004测试关键线索

前端日志：
```
22:55:59 插件加载
22:56:00 选中笔记本
22:56:07 uploadAndConvert → copyToSafePath
22:56:07 Copied converted files... ← 日志停在这里！
```

**关键**：
1. 没有 `base-api` 的"开始向思源请求数据 /api/import/importStdMd" 日志
2. 内核日志只有1行"loaded petals"，没有任何 importStdMd 请求记录
3. 请求根本没到内核！

前端第一行错误（22:55:58，插件刚加载就报）：
```
fetch post failed [TypeError: Cannot read properties of undefined (reading 'fileTree')], url [/api/notebook/lsNotebooks]
```

## 发现13：lsNotebooks 报错分析

这个错误是**思源前端自身**（不是插件）在 `onload` 时调用 `/api/notebook/lsNotebooks` 时崩溃，因为 `window.siyuan` 上下文中某个 `fileTree` 对象未就绪。

但插件日志显示 `lsNotebooks` 是通过插件自己发的（`base-api` 打印了），并成功返回 code:0。所以这个 `fileTree` 报错来自**思源前端的其他代码**，可能与插件无关。

## 发现14：真正问题

日志在 copyToSafePath 停止 + 没有 importStdMd 请求日志 = **multiImport 在 copyToSafePath 后抛异常**。

可能原因：
1. isDev 日志不打印了？但 uploadAndConvert 阶段 base-api 在打印
2. `importStdMd` 的 `await` 卡住或异常被吞
3. waitMoveAndCleanup 在 importStdMd 之前就抛了？不可能，代码顺序是 importStdMd 然后 waitMove...

**疑问**：为什么 copyToSafePath 之后没有 importStdMd 的 base-api 请求日志？

需要用户确认：是否插件有 reload？22:55:58 和 22:56:00 之间思源前端报错 fileTree，这是否意味着思源前端崩了导致后续 API 调用都失败？