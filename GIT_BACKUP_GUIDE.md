# Git 自动备份使用指南

## 功能说明

自动备份脚本会自动将你的代码修改提交并推送到 GitHub 远程仓库。

---

## 使用方法

### 1. 手动备份（单次）

```bash
# 方法 1: 直接运行
node auto-backup.js

# 方法 2: 使用 npm 命令
npm run backup
```

**执行流程**：
1. 检查是否有修改
2. 添加所有修改 (`git add .`)
3. 提交修改 (`git commit`)
4. 推送到 GitHub (`git push`)

---

### 2. 定时自动备份（持续运行）

```bash
# 方法 1: 直接运行
node auto-backup-schedule.js

# 方法 2: 使用 npm 命令
npm run backup:start
```

**默认配置**：
- 备份间隔: 30 分钟
- 立即执行一次备份
- 然后每隔 30 分钟自动备份

**修改备份间隔**：

编辑 `auto-backup-schedule.js` 第 11 行：

```javascript
const CONFIG = {
  interval: 30 * 60 * 1000, // 30分钟
  // interval: 10 * 60 * 1000, // 10分钟
  // interval: 60 * 60 * 1000, // 1小时
  // interval: 5 * 60 * 1000,  // 5分钟
};
```

**停止定时备份**：
- 按 `Ctrl + C` 停止

---

## 工作原理

### 网络正常时

```
✅ 检测修改 → ✅ 添加文件 → ✅ 提交 → ✅ 推送到 GitHub
```

### 网络异常时

```
✅ 检测修改 → ✅ 添加文件 → ✅ 提交 → ❌ 推送失败
                                              ↓
                                        自动重试 3 次
                                              ↓
                                    仍然失败 → 本地已保存
                                              ↓
                                    等待网络恢复后手动推送
```

---

## 常见问题

### Q1: 推送失败怎么办？

**原因**：
- 网络连接问题
- GitHub 访问受限
- 代理配置问题

**解决方案**：

```bash
# 1. 检查网络连接
ping github.com

# 2. 手动推送
git push origin new-main

# 3. 或等待网络恢复后再次运行备份脚本
npm run backup
```

### Q2: 如何查看备份状态？

```bash
# 查看本地提交历史
git log --oneline -10

# 查看远程仓库状态
git remote -v

# 查看当前分支
git branch
```

### Q3: 如何恢复到之前的版本？

```bash
# 查看提交历史
git log --oneline

# 恢复到指定版本
git reset --hard <commit-id>

# 或创建新分支保留当前修改
git checkout -b backup-branch
```

### Q4: 如何修改提交信息格式？

编辑 `auto-backup.js` 第 13 行：

```javascript
const CONFIG = {
  commitMessage: `auto: 自动备份 - ${new Date().toLocaleString('zh-CN')}`,
  // 自定义格式示例：
  // commitMessage: `backup: ${new Date().toISOString()}`,
  // commitMessage: `chore: auto backup on ${Date.now()}`,
};
```

---

## 推荐配置

### 开发时

```bash
# 启动定时备份（每 30 分钟）
npm run backup:start
```

### 提交重要修改时

```bash
# 手动备份
npm run backup
```

### 配合 IDE 使用

在 VS Code 中添加任务：

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Git Backup",
      "type": "npm",
      "script": "backup",
      "problemMatcher": []
    }
  ]
}
```

然后使用快捷键 `Ctrl+Shift+B` 快速备份。

---

## 安全建议

1. **定期检查远程仓库**
   ```bash
   git log origin/new-main --oneline -10
   ```

2. **重要修改前手动备份**
   ```bash
   npm run backup
   ```

3. **定期清理旧提交**（可选）
   ```bash
   git gc --prune=now
   ```

---

## 文件说明

- `auto-backup.js` - 单次备份脚本
- `auto-backup-schedule.js` - 定时备份服务
- `package.json` - npm 命令配置

---

## 技术支持

如有问题，请检查：
1. 网络连接是否正常
2. Git 配置是否正确
3. GitHub 权限是否配置

---

生成时间: 2026-03-12
