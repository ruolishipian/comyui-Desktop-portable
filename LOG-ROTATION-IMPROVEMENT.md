# 日志管理改进方案

## 问题分析

### 原有日志管理机制

#### 启动器日志 (`comfyui-{date}.log`)
- ✅ **有分段清理功能**：每 10MB 自动轮转
- ✅ **有大小限制**：默认 10MB 上限
- ✅ **有过期清理**：默认保留 7 天
- ✅ **有数量限制**：最多保留 50 个文件

#### ComfyUI 日志 (`comfyui-output.log`)
- ❌ **没有分段清理功能**：文件会无限增长
- ❌ **没有大小限制**：已达 22MB+
- ❌ **没有过期清理**：旧日志不自动删除
- ❌ **影响性能**：大文件写入变慢

## 改进方案

### 新增功能

#### 1. **ComfyUI 日志自动轮转**

```typescript
// 配置参数
private readonly _comfyUILogMaxSize = 50 * 1024 * 1024; // 50MB 上限
private readonly _comfyUIRotateCheckInterval = 60000;   // 1分钟检查一次
private readonly maxFiles = 10;                          // 最多保留10个轮转文件
```

**轮转逻辑**：
1. 每分钟检查一次日志文件大小
2. 当文件超过 50MB 时，执行轮转：
   - 重命名为 `comfyui-output_{timestamp}.log`
   - 创建新的空日志文件
   - 清理旧的轮转文件

#### 2. **旧日志自动清理**

**清理规则**：
- **数量限制**：最多保留 10 个轮转文件
- **时间限制**：默认保留 7 天（与启动器日志一致）
- **双重清理**：
  1. 超过数量 → 删除最旧的文件
  2. 超过天数 → 删除过期文件

#### 3. **启动时清理**

```typescript
// 应用启动时
void this._cleanOldComfyUILogs();
```

**优点**：
- 及时清理历史遗留的大文件
- 避免首次启动时性能问题

## 实现细节

### 核心方法

#### 1. `_rotateComfyUILogFile()`
```typescript
// 检查文件大小并轮转
if (stats.size > this._comfyUILogMaxSize) {
  // 重命名: comfyui-output.log -> comfyui-output_2026-05-14T12-30-45-123Z.log
  // 创建新的空文件
  // 清理旧文件
}
```

#### 2. `_cleanOldComfyUILogs()`
```typescript
// 筛选轮转日志文件
const files = files.filter(f => 
  f.startsWith('comfyui-output_') && f.endsWith('.log')
);

// 按修改时间排序（新的在前）
files.sort((a, b) => b.mtime - a.mtime);

// 删除超过数量的文件
if (files.length > maxFiles) {
  deleteFiles(files.slice(maxFiles));
}

// 删除超过天数的文件
files.filter(f => f.mtime < cutoff).forEach(deleteFile);
```

### 集成点

#### 1. **初始化时**
```typescript
public init(): void {
  // ... 创建日志文件
  
  // 启动时清理 ComfyUI 旧日志
  void this._cleanOldComfyUILogs();
}
```

#### 2. **写入时**
```typescript
private async _processComfyUIWriteQueue(): Promise<void> {
  // 检查日志轮转
  if (now - this._lastComfyUIRotateCheck > interval) {
    await this._rotateComfyUILogFile();
    this._lastComfyUIRotateCheck = now;
  }
  
  // 写入日志
  await fs.promises.appendFile(file, data);
}
```

## 配置说明

### 日志配置参数

所有参数在 `config.json` 中的 `logs` 字段：

```json
{
  "logs": {
    "enable": true,           // 启用日志
    "level": "info",          // 日志级别
    "realtime": true,         // 实时推送
    "maxSize": 10485760,      // 启动器日志大小限制 (10MB)
    "keepDays": 7             // 保留天数
  }
}
```

### ComfyUI 日志固定参数

| 参数 | 值 | 说明 |
|------|-----|------|
| **大小限制** | 50MB | 超过自动轮转 |
| **检查间隔** | 1分钟 | 轮转检查频率 |
| **数量限制** | 10个 | 轮转文件数量上限 |
| **保留天数** | 配置值 | 与启动器日志一致 |

## 文件命名规则

### 启动器日志
```
comfyui-2026-05-13.log          # 今日日志
comfyui-2026-05-12.log          # 昨日日志
comfyui-2026-05-11.log          # 前日日志
comfyui-2026-05-10.log.1747123456789  # 轮转日志
```

### ComfyUI 日志
```
comfyui-output.log                    # 当前日志
comfyui-output_2026-05-13T12-30-45-123Z.log  # 轮转日志1
comfyui-output_2026-05-12T08-15-30-456Z.log  # 轮转日志2
comfyui-output_2026-05-11T16-45-15-789Z.log  # 轮转日志3
```

## 性能影响

### 改进前
- ❌ 单文件 22MB+，写入性能下降
- ❌ 读取大文件慢
- ❌ 占用过多磁盘空间
- ❌ 无自动清理机制

### 改进后
- ✅ 单文件最大 50MB，性能稳定
- ✅ 自动轮转，文件大小可控
- ✅ 自动清理，磁盘空间合理
- ✅ 启动时清理，避免历史遗留

## 使用场景

### 场景 1：长时间运行
**问题**：ComfyUI 输出大量日志，文件持续增长
**解决**：自动轮转，保持单文件大小在 50MB 以内

### 场景 2：多次启动
**问题**：历史日志文件越来越多
**解决**：启动时自动清理，保留最近 10 个轮转文件

### 场景 3：磁盘空间有限
**问题**：日志文件占用过多空间
**解决**：自动删除 7 天前的旧日志

### 场景 4：性能优化
**问题**：大文件写入慢，影响实时输出
**解决**：小文件写入快，性能提升

## 监控和调试

### 日志轮转日志
```
[Logger] ComfyUI 日志轮转: comfyui-output.log -> comfyui-output_2026-05-14T12-30-45-123Z.log
[Logger] 清理 ComfyUI 旧日志完成，删除了 3 个文件
```

### 检查日志文件
```bash
# 查看日志目录
ls -lh logs/

# 输出示例
-rw-r--r-- 1 user group  48M May 14 12:30 comfyui-output.log
-rw-r--r-- 1 user group  50M May 13 15:45 comfyui-output_2026-05-13T15-45-30-123Z.log
-rw-r--r-- 1 user group  50M May 12 10:20 comfyui-output_2026-05-12T10-20-15-456Z.log
```

## 对比总结

| 功能 | 启动器日志 | ComfyUI 日志（改进前） | ComfyUI 日志（改进后） |
|------|------------|----------------------|---------------------|
| **自动轮转** | ✅ | ❌ | ✅ |
| **大小限制** | ✅ 10MB | ❌ | ✅ 50MB |
| **过期清理** | ✅ 7天 | ❌ | ✅ 7天 |
| **数量限制** | ✅ 50个 | ❌ | ✅ 10个 |
| **启动清理** | ✅ | ❌ | ✅ |
| **性能优化** | ✅ | ❌ | ✅ |

## 建议

### 1. 磁盘空间监控
定期检查日志目录大小：
```bash
du -sh logs/
```

### 2. 日志级别调整
如果日志过多，可以调整级别：
```json
{
  "logs": {
    "level": "warn"  // 只记录警告和错误
  }
}
```

### 3. 保留天数调整
根据磁盘空间调整：
```json
{
  "logs": {
    "keepDays": 3  // 磁盘空间紧张时减少保留天数
  }
}
```

### 4. 手动清理
如果需要立即清理：
```bash
# 删除所有 ComfyUI 轮转日志
rm logs/comfyui-output_*.log

# 清空当前日志
echo "" > logs/comfyui-output.log
```

## 后续优化

### 1. 压缩旧日志
```typescript
// 未来可以添加压缩功能
await compress(rotatedFile, `${rotatedFile}.gz`);
await unlink(rotatedFile);
```

### 2. 日志分析
```typescript
// 提取关键错误信息
const errors = await extractErrors(logFile);
// 生成日志报告
await generateReport(errors);
```

### 3. 远程日志
```typescript
// 上传关键日志到服务器
await uploadCriticalLogs(errors);
```

---

**更新日期**：2026年5月14日  
**版本**：2.0.0  
**作者**：CodeArts
