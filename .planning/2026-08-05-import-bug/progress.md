# 进度日志

## 会话 1 — 2026-08-05

### 21:40-21:50 — 问题1根因
- isSensitivePath 白名单仅 temp/export/*
- 已修复：copyToSafePath

### 22:10 — 双路径清理
- ImportForm.vue cleanTemp/openTempFolder 覆盖双路径

### 22:30 — 错误方案（003崩掉）
- waitAndCleanPandoc 用 removeDoc 轮询
- file.go:1888-1927 removeDoc 级联删除 → 全丢
- 内核日志 1415 行铁证：22:39:12 删 pandoc，子文档还在异步创建

### 22:40 — 真正方案固化
关键技术点：
- importStdMd 异步，code:0 只是提交
- 目录导入创建 /pandoc 父节点 + 子文档在 /pandoc/ 下
- removeDoc 会级联删除子文档
- 必须先 moveDocsByID 移走子文档，再 removeDoc 删空父节点

### 22:45 — 实施
- kernel-api.ts 新增：
  - getIDsByHPath(hPath, notebook)
  - moveDocsByID(fromIDs, toID)  ← toID=笔记本ID 自动到根
- importService.ts:
  - waitAndCleanPandoc → waitMoveAndCleanup
  - ① 轮询 getIDsByHPath("/pandoc") 等子文档落地（最多30×500ms）
  - ② moveDocsByID(childIds, notebookId) 移子文档到根
  - ③ removeDoc("/pandoc") 删空父节点
  - 移动失败则不删父节点，避免级联
- 构建 ✅ 29 modules, 1.68s

### 下一步
- 用户实机验证