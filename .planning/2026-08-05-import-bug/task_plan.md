# 任务计划：导入功能修复

**日期**: 2026-08-05
**状态**: 🟢 代码完成（待验证）

## 问题与根因

| # | 问题 | 根因 | 状态 |
|---|------|------|------|
| 1 | 敏感路径 | path.go:499-504 白名单 temp/export/* | 🟢 已修复 |
| 2 | /pandoc 空父节点 | import.go:1192-1211 目录创建空节点 | 🟢 已修复 |
| 3 | 未切换展开 | importStdMd 异步，openNotebook 过早 | 🟢 已修复 |

## 003崩掉的真正原因（铁证：siyuan.log:1415）

```
22:38:57  importStdMd 返回 code:0  ← 仅提交
22:38:57  waitAndCleanPandoc 开始轮询 removeDoc
22:39:12  removeDoc("/pandoc") 成功，但 existChildren=false
          → 父节点删掉，子文档还没写盘 → 全部丢失
```
- `file.go:1888-1927` removeDoc 收集 RootChildIDs 并 `box.Remove(childrenDir)` 级联删除

## 修复方案（保留目录批量导入）

```
multiImport:
  copyToSafePath()
  importStdMd(目录)                        ← 保留批量API
  waitMoveAndCleanup():
    ① 轮询 getIDsByHPath("/pandoc", notebook)
       └─ 返回非空 ID 列表 = 子文档已落地
    ② moveDocsByID(childIds, notebookId)   ← 移子文档到根
       └─ toID=笔记本ID 时内核自动设 toPath="/"
       └─ 失败则 return，不删父节点（防级联）
    ③ removeDoc(notebook, "/pandoc")       ← 此时已空，安全
  openNotebook()                           ← 文档树已更新
```

## 修改文件

| 文件 | 新增/修改 |
|------|-----------|
| `src/api/kernel-api.ts` | removeDoc, getIDsByHPath, moveDocsByID |
| `src/service/importService.ts` | multiImport + waitMoveAndCleanup（替换 waitAndCleanPandoc） |

## 构建验证

✅ pnpm build — 29 modules, 1.68s, 零错误