# 健康检查改进方案

## 问题分析

### 实际日志
```
[02:11:15] [错误] ComfyUI 服务无响应: The operation was aborted due to timeout
[02:11:30] [错误] ComfyUI 服务无响应: The operation was aborted due to timeout
[02:11:45] [错误] ComfyUI 服务无响应: The operation was aborted due to timeout
[02:11:45] [错误] ComfyUI 服务连续 3 次无响应
[02:11:45] [信息] 健康检查已停止
```

### 问题原因

**健康检查过于严格**：
1. **检查间隔过短**：15秒检查一次
2. **超时时间过短**：5秒超时
3. **失败阈值过低**：连续失败3次就判定为失败
4. **缺少宽容期**：启动后立即严格检查

**ComfyUI 初始化慢**：
```
[02:11:20] [信息] [WeiLin-ComfyUI-Tools] 正在初始化数据库...
[02:11:41] [信息] [pinyin_index] Filling pinyin columns...
[02:11:41] [信息] [WeiLin-ComfyUI-Tools] 数据库初始化完成（耗时: 21.11秒）
```

**冲突**：
- ComfyUI 需要 21 秒初始化数据库
- 健康检查 15 秒检查一次，5 秒超时
- 连续 3 次超时 = 45 秒就判定失败
- 实际服务正常，只是初始化慢

## 改进方案

### 1. 调整健康检查参数

#### 改进前
```typescript
private readonly _healthCheckInterval = 15000;  // 15秒检查一次
private readonly _healthCheckTimeout = 5000;    // 5秒超时
private readonly _maxConsecutiveFailures = 3;   // 连续失败3次
```

#### 改进后
```typescript
private readonly _healthCheckInterval = 30000;  // 30秒检查一次 ✅
private readonly _healthCheckTimeout = 10000;   // 10秒超时 ✅
private readonly _maxConsecutiveFailures = 5;   // 连续失败5次 ✅
private readonly _healthCheckGracePeriod = 60000; // 60秒宽容期 ✅
```

### 2. 增加宽容期机制

**核心逻辑**：
```typescript
// 检查是否在宽容期内
const elapsed = Date.now() - this._healthCheckStartTime;
const inGracePeriod = elapsed < this._healthCheckGracePeriod;

// 在宽容期内，忽略超时错误
if (inGracePeriod && error?.name === 'AbortError') {
  logger.info(`健康检查超时（宽容期内，忽略）: 启动后 ${Math.floor(elapsed / 1000)} 秒`);
  // 不增加失败计数
  return;
}
```

**效果**：
- 启动后 60 秒内，健康检查超时不会增加失败计数
- 允许 ComfyUI 有足够时间初始化
- 避免误判正在启动的服务

### 3. 改进超时错误处理

#### 改进前
```typescript
catch (err) {
  // 忽略超时错误
  if (error?.name !== 'AbortError') {
    this._consecutiveFailures++;
  }
}
```

#### 改进后
```typescript
catch (err) {
  // 1. 宽容期内的超时：忽略
  if (inGracePeriod && error?.name === 'AbortError') {
    logger.info('健康检查超时（宽容期内，忽略）');
    return; // 不增加计数
  }
  
  // 2. 其他错误：增加计数
  if (error?.name !== 'AbortError') {
    logger.error('ComfyUI 服务无响应');
    this._consecutiveFailures++;
  } 
  // 3. 宽容期外的超时：增加计数
  else {
    logger.warn('健康检查超时（连续失败计数）');
    this._consecutiveFailures++;
  }
}
```

## 参数对比

| 参数 | 改进前 | 改进后 | 说明 |
|------|--------|--------|------|
| **检查间隔** | 15秒 | 30秒 | 减少检查频率，降低干扰 |
| **超时时间** | 5秒 | 10秒 | 给予更多响应时间 |
| **失败阈值** | 3次 | 5次 | 更宽容的失败判定 |
| **宽容期** | ❌ 无 | ✅ 60秒 | 启动后保护期 |

## 时间线对比

### 改进前（误判）

```
00:00  ComfyUI 启动
00:15  健康检查 #1 → 超时（正在初始化）→ 失败计数 = 1
00:30  健康检查 #2 → 超时（正在初始化）→ 失败计数 = 2
00:45  健康检查 #3 → 超时（正在初始化）→ 失败计数 = 3
       ❌ 达到阈值，判定失败，停止服务
00:50  实际：ComfyUI 初始化完成，正常运行
       结果：误判导致服务被错误停止
```

### 改进后（正确）

```
00:00  ComfyUI 启动，健康检查开始
00:30  健康检查 #1 → 超时（宽容期内）→ 忽略，失败计数 = 0
01:00  健康检查 #2 → 超时（宽容期内）→ 忽略，失败计数 = 0
       宽容期结束
01:30  健康检查 #3 → 成功 → 失败计数 = 0
02:00  健康检查 #4 → 成功 → 失败计数 = 0
       ✅ 服务正常运行
```

## 判定逻辑

### 宽容期内（启动后 60 秒）

| 情况 | 操作 | 失败计数 |
|------|------|---------|
| 健康检查成功 | 重置计数 | 0 |
| 健康检查超时 | **忽略** | 不变 |
| 其他错误 | 增加计数 | +1 |

### 宽容期外（启动 60 秒后）

| 情况 | 操作 | 失败计数 |
|------|------|---------|
| 健康检查成功 | 重置计数 | 0 |
| 健康检查超时 | 增加计数 | +1 |
| 其他错误 | 增加计数 | +1 |

### 失败判定

```
连续失败次数 >= 5 次 → 标记为失败 → 尝试自动恢复
```

## 改进效果

### 1. 避免误判

**场景**：ComfyUI 初始化数据库需要 21 秒

**改进前**：
- 15 秒检查一次
- 5 秒超时
- 3 次失败 = 45 秒判定失败
- ❌ 误判

**改进后**：
- 60 秒宽容期
- 宽容期内超时不计数
- ✅ 正确等待初始化完成

### 2. 更可靠的监控

**改进前**：
- 检查过于频繁
- 容易误判
- 用户困惑

**改进后**：
- 检查间隔合理
- 宽容期保护
- 日志清晰明确

### 3. 更好的用户体验

**改进前**：
```
[错误] ComfyUI 服务无响应
[错误] ComfyUI 服务连续 3 次无响应
[信息] 健康检查已停止
```
→ 服务被停止，用户需要手动重启

**改进后**：
```
[信息] 健康检查已启动
[信息] 宽容期: 启动后 60 秒内的超时将被忽略
[信息] 健康检查超时（宽容期内，忽略）: 启动后 30 秒
[信息] 健康检查成功
```
→ 服务正常运行，用户无感知

## 配置建议

### 根据环境调整

#### 快速启动（SSD，少量插件）
```typescript
_healthCheckGracePeriod = 30000;  // 30秒宽容期
_maxConsecutiveFailures = 3;      // 3次失败阈值
```

#### 正常启动（默认）
```typescript
_healthCheckGracePeriod = 60000;  // 60秒宽容期
_maxConsecutiveFailures = 5;      // 5次失败阈值
```

#### 慢速启动（HDD，大量插件）
```typescript
_healthCheckGracePeriod = 120000; // 120秒宽容期
_maxConsecutiveFailures = 7;      // 7次失败阈值
```

### 监控日志

关键日志信息：
```
[信息] 健康检查已启动
[信息] 宽容期: 启动后 60 秒内的超时将被忽略
[信息] 健康检查超时（宽容期内，忽略）: 启动后 30 秒
[警告] 健康检查超时（连续失败: 1/5）
[错误] ComfyUI 服务连续 5 次超时无响应
```

## 技术细节

### 时间计算

```typescript
// 启动时记录
this._healthCheckStartTime = Date.now();

// 检查时计算
const elapsed = Date.now() - this._healthCheckStartTime;
const inGracePeriod = elapsed < this._healthCheckGracePeriod;
```

### 错误类型判断

```typescript
try {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000) // 10秒超时
  });
} catch (err) {
  const error = err as Error;
  
  if (error.name === 'AbortError') {
    // 这是超时错误
  } else {
    // 这是其他错误（网络、服务器等）
  }
}
```

## 对比总结

### 改进前
- ❌ 检查间隔：15秒（过于频繁）
- ❌ 超时时间：5秒（过于严格）
- ❌ 失败阈值：3次（过低）
- ❌ 宽容期：无（缺少保护）
- ❌ 误判风险：高

### 改进后
- ✅ 检查间隔：30秒（合理）
- ✅ 超时时间：10秒（宽松）
- ✅ 失败阈值：5次（合适）
- ✅ 宽容期：60秒（启动保护）
- ✅ 误判风险：低

## 后续优化

### 1. 动态宽容期

根据插件数量自动调整：
```typescript
const pluginCount = countPlugins();
const gracePeriod = Math.max(30000, pluginCount * 2000);
```

### 2. 智能检测

分析启动日志，判断初始化进度：
```typescript
if (log.includes('数据库初始化完成')) {
  // 可以提前结束宽容期
}
```

### 3. 分级监控

不同端点使用不同阈值：
```typescript
// 核心端点：严格检查
await fetch('/system_stats', { timeout: 5000 });

// 非核心端点：宽松检查
await fetch('/queue', { timeout: 15000 });
```

---

**更新日期**：2026年5月14日  
**版本**：2.0.0  
**作者**：CodeArts
