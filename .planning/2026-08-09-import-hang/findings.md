# 发现与调研记录

**日期**: 2026-08-09
**任务**: 修复"导入第二次必卡死"
**源码**: 本地思源 3.7.3 `D:\Users\Administrator\Documents\myproject\my-note`（git tag v3.7.3）

## 发现1：probeImport 探测完全失效（铁证）

插件 `src/service/importService.ts:235-255` probeImport 用：
```
localPath: `${workspaceDir}/temp/convert/pandoc/_probe_.md`
```

内核 `kernel/util/path.go:499-504`：
```go
// 只允许导出工作空间/temp/export 目录，不允许导出工作空间/temp 目录
workspaceTempExportPrefix := strings.ToLower(filepath.Join(WorkspaceDir, "temp", "export"))
workspaceTempPrefix := strings.ToLower(filepath.Join(WorkspaceDir, "temp"))
if strings.HasPrefix(toCheckPathLower, workspaceTempPrefix) && !strings.HasPrefix(toCheckPathLower, workspaceTempExportPrefix) {
    return true  // 敏感路径！
}
```

`kernel/api/import.go:452-458`：命中敏感路径 → handler 秒回 code:-1，**不进入 ImportFromLocalPath**。

→ probe 恒返回 true（"可用"），挂起时也返回 true，探测形同虚设。

## 发现2：WorkingDir 是程序目录，不是工作空间

`app/electron/main.js:1137`：
```js
const cmds = ["serve", "--port", currentKernelPort, "--wd", appDir, "--attach-ui"];
```
→ `WorkingDir = appDir`（如 `C:\Program Files\SiYuan\app`）。
→ `IsSubPath(WorkingDir, localPath)` 不会拦截工作空间路径（工作空间在 `D:\...\SiyuanWorkspace\public`）。
→ 真实导入路径 `temp/export/convert/pandoc/*.md` 能通过检查进入 ImportFromLocalPath。

## 发现3：ImportFromLocalPath 的两个永久阻塞点

`kernel/model/import.go:1078`：
```go
func ImportFromLocalPath(boxID, localPath string, toPath string) (err error) {
    ...
    lockSync()        // ← 阻塞点1：全局 syncLock（kernel/model/sync.go:171-174）
    defer unlockSync()
    FlushTxQueue()    // ← 阻塞点2：无限等待（kernel/model/transaction.go:59-64）
    ...
}
```

`FlushTxQueue`:
```go
func FlushTxQueue() {
	time.Sleep(50 * time.Millisecond)
	for 0 < txQueueSize() || isFlushing.Load() {
		time.Sleep(10 * time.Millisecond)
	}
}
```

`lockSync` 还被云同步 `syncData`（S3/WebDAV，网络慢时持锁久）、`importSY`、`ImportData` 使用。

## 发现4：createDocWithMd 是安全替代 API

`kernel/model/file.go:1264 CreateWithMarkdown`：
```go
func CreateWithMarkdown(...) {
	createDocLock.Lock()      // 独立锁，不是 syncLock
	defer createDocLock.Unlock()
	box := Conf.Box(boxID)
	...
	FlushTxQueue()
	dom := luteEngine.Md2BlockDOM(md, false)
	retID, err = createDocsByHPath(box.ID, hPath, dom, parentID, id, titleEmpty)
	...
}
```
- 不依赖 lockSync → 云同步持锁不阻塞它
- 前端日常"新建文档"全走它（`app/src/util/newFile.ts:102`），高频调用无挂起问题
- 标题限制 512 字符（filetree.go:886），未发现 markdown 正文大小限制
- 注意：`util.NewLute()`（非 StdLute），md 解析行为与 importStdMd 的 `parseStdMd`（NewStdLute + YAML front matter + htmlBlock2Media 等后处理）不同 → 走此方案时 html/audio/video 块处理可能退化，需测试

## 发现5：云同步会长期持有 syncLock（间接证据）

`kernel/model/sync.go:188`：
```go
func syncData(exit, byHand bool) {
	defer logging.Recover()
	if !checkSync(false, exit, byHand) { return }
	lockSync()
	defer unlockSync()
	...
}
```
用户日志（`public/temp/siyuan.log`）显示 S3 同步（oss.terwergreen.com）每次 1-14s，且 8/8 18:55 同步失败重试。若同步过程中导入 → 排队等待。

## 发现6：8/8 18:55 大规模删除（复现场景旁证）

`public/temp/siyuan.log` 8/8 18:55:36-37 有 300+ 条 `sync.go:285: local remove [...]`（用户删除了大量文档，正是"导入→删除→再导入"卡死场景的操作序列）。且 18:52-18:53 一小时内思源重启两次（pandoc 初始化两次）→ 与"卡死→重启→再试"吻合。

## 待确认

- 第二次导入挂起的确切内核位置（lockSync vs FlushTxQueue）—— 需要用户复现时抓 goroutine dump 或内核日志，但插件侧修复不依赖此细节
- createDocWithMd 对大 md（MB 级）的实际表现

## 发现7：dev 模式自带 pprof，可精确定位挂起（复现方案）

`kernel/server/serve.go:1001-1018`：
```go
func serveDebug(ginServer *gin.Engine) {
	if "prod" == util.Mode { return }  // 生产模式不注册
	ginServer.GET("/debug/pprof/goroutine", gin.WrapF(pprof.Index))
	...
}
```
→ 用 `--mode dev` 启动内核，卡死后访问 `http://127.0.0.1:6806/debug/pprof/goroutine?debug=2` 即可抓取全部 goroutine 栈，精确定位永久阻塞点。

### 复现步骤（给用户）
1. 完全退出桌面版思源（托盘退出，确认内核进程结束）
2. dev 模式启动：
   ```
   & "C:\Program Files\SiYuan\resources\kernel\SiYuan-Kernel.exe" serve --workspace "D:\Users\Administrator\Documents\mydocs\SiyuanWorkspace\public" --mode dev --port 6806 --wd "C:\Program Files\SiYuan\resources"
   ```
3. 浏览器打开 http://127.0.0.1:6806（输入访问授权码）
4. 插件导入第一个文件 → 成功；再导入第二个 → 卡死
5. 卡死后立即访问 `http://127.0.0.1:6806/debug/pprof/goroutine?debug=2` 保存 dump
6. 提供 dump + dev 日志（控制台 + `public/temp/siyuan.log`）

已知：用户 8/8 18:55 日志显示 S3 同步 + 大规模删除文档（sync.go:285 local remove x300+），与"导入→删除→再导入"场景吻合。

## 发现8：死循环铁证（goroutine dump，19:19 复现）

dump 文件：`C:\Users\Administrator\AppData\Local\Temp\opencode\goroutine-dump-1.txt`

```
goroutine 153 [sync.Mutex.Lock, 1 minutes]:      ← SyncDataJob 云同步
model.lockSync() (sync.go:172)
model.syncData → model.SyncData → model.SyncDataJob

goroutine 54667 [runnable]:                      ← 真实导入持锁执行中
model.ImportFromLocalPath (import.go:1571)
model.api.importStdMd (api/import.go:460)
```

**死锁链条**：importStdMd 持 syncLock 卡在 import.go:1571（排序循环）→ 云同步 SyncDataJob 等 lockSync 1 分钟+ → 所有需要 lockSync 的操作（再次导入等）永久挂起。

### 死循环根因（3.7.3 import.go 目录导入）

- import.go:1180：`targetPath = path.Join(targetPaths[path.Dir(curRelPath)], id)`
  - 子目录首次出现时 `targetPaths[dir]` 为空 → `path.Join("", id)` = **相对路径**
  - 子目录下 md 文件的 tree.Path 变成相对路径（如 "id.sy/xxx.sy"）
- import.go:1560-1578 排序循环：
  - `parent = path.Dir(p)`，相对路径 → `path.Dir(".") = "."` 永远不等于 `baseTargetPath="/"` → **无限死循环**
- 触发条件：multiImport 复制整个 temp/convert/pandoc，目录中出现**子目录+md**（如 html 导入遗留的 `xxx_files/` 结构）

## 发现10：真正根因反转（调试日志实锤，20:34 复现）

用户质疑"为什么第二次才卡死"→ 加调试日志重测 → **第一次导入就卡死**。

```
[IMP-DEBUG] walk rel=[/] target=[/20260809203453-bodp759.sy] isDir=true                ← root OK（curRelPath="" 分支）
[IMP-DEBUG] walk rel=[D:/Users/.../pandoc/assets] target=[20260809203453-netk0iv.sy]   ← curRelPath=完整绝对路径！
[IMP-DEBUG] walk rel=[D:/.../pandoc/hang-test.md] target=[20260809203453-e89vw2n.sy]   ← tree.Path=相对路径！
[IMP-DEBUG] sort loop iter=100000 p=[.] parent=[.] baseTargetPath=[/]                  ← 死循环实锤
```

### 真正根因（import.go:1171）

```go
curRelPath := filepath.ToSlash(strings.TrimPrefix(currentPath, localPath))
```

- 插件 localPath = `D:/.../pandoc`（**正斜杠**，JS 拼接）
- 内核 `filepath.WalkDir` 子条目用 `filepath.Join`（Windows **反斜杠**）→ `D:\...\pandoc\assets`
- `strings.TrimPrefix` 分隔符敏感 → **恒匹配失败** → curRelPath = 完整绝对路径
- `targetPaths[path.Dir(绝对路径)]` 永远 miss → dirPath="" → `tree.Path = "{id}.sy"`（相对）
- 排序循环 `path.Dir(".")="."` ≠ baseTargetPath="/" → **无限死循环**（CPU 忙转，dump 显示 import.go:1571 runnable）

**注意**：root 自身（curRelPath==""）走 if 分支正常 → 这就是为什么 1175 的 `if "" == curRelPath` 只救 root，救不了子条目。

### 修复（替代原 patch）

```go
curRelPath, relErr := filepath.Rel(localPath, currentPath)  // 正确处理分隔符
if nil != relErr { curRelPath = currentPath }
curRelPath = filepath.ToSlash(curRelPath)
curRelPath = strings.TrimPrefix(curRelPath, "./")
```
- 原 patch（1179 回退 + 排序循环 guard）已回滚
- filepath.Rel 修复已编译（20:44），待验证

### 待解之谜：为什么用户第一次导入成功？

按此根因，目录含 md 必死循环（20:34 实测第一次就卡）。用户观察"第一次成功、第二次必卡死"。可能解释：
- 第一次导入时 pandoc 目录里无 md（转换失败/空 md/纯资源）→ hPathsIDs 空 → 排序循环不执行
- 第一次导入用的笔记本/路径差异
- **待用户确认第一次导入的具体情况**

