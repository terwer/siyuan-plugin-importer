# 任务计划：修复"导入第二次必卡死"

**日期**: 2026-08-09
**状态**: 🟢 内核修复验证通过（多次导入 + 换笔记本无卡死）

## 目标

导入第二次必卡死，必须重启思源才能恢复。完全不可接受，需要根治。

## 根因（goroutine dump 铁证确认）

**思源 3.7.3 内核 `ImportFromLocalPath` 目录导入排序循环死循环**：
- import.go:1180 子目录首次出现时 `targetPaths[dir]` 为空 → `path.Join("", id)` 生成相对路径
- import.go:1560-1578 排序循环：`path.Dir(".")` 永远等于 "."，无法到达 `baseTargetPath="/"` → 无限死循环
- importStdMd 永不返回 → 永久持有 syncLock → 云同步/后续导入全部永久挂起

## 修复（kernel/model/import.go，两处）

1. 1179 区域：父目录映射为空时回退 `baseTargetPath`，杜绝相对路径产生（治本）
2. 1560 循环：相对路径补 `/` 前缀 + `nextParent == parent` 时 break 防死循环（兜底）

## 验证

- [x] 用户实机：司库 docx（50图）导入成功，dump 无死锁
- [x] 测试文件批量导入：多次 + 换笔记本，均无卡死 ✅

## 收尾

- [ ] 清理插件侧失效的 probeImport（恒 true，形同虚设）
- [ ] 官方 issue 材料（复现证据 + 深度分析 + 根因修正 diff）
