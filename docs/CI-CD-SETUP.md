# CI/CD 配置说明

## 一、CI/CD 概述

本项目已配置完整的 CI/CD 流程，包括：

- ✅ 自动化测试（单元测试、集成测试、E2E 测试）
- ✅ 代码质量检查（ESLint、TypeScript、Prettier）
- ✅ 覆盖率报告（Codecov 集成）
- ✅ 多平台测试（Windows、Ubuntu、macOS）
- ✅ 多 Node.js 版本测试（18.x、20.x）

## 二、工作流配置

### 2.1 CI 工作流（ci.yml）

**触发条件：**
- Push 到 main 或 develop 分支
- Pull Request 到 main 或 develop 分支

**执行步骤：**
1. **质量检查** (quality-check)
   - ESLint 代码检查
   - TypeScript 类型检查
   - Prettier 格式检查
   - 代码重复检查
   - 测试质量检查

2. **测试** (test)
   - 运行单元测试
   - 运行集成测试
   - 上传覆盖率报告

3. **构建** (build)
   - 构建应用
   - 上传构建产物

### 2.2 测试工作流（test.yml）

**触发条件：**
- Push 到 main 或 develop 分支
- Pull Request 到 main 或 develop 分支
- 手动触发

**执行步骤：**
1. **多平台测试** (test)
   - 在 Windows、Ubuntu、macOS 上运行
   - 使用 Node.js 18.x 和 20.x
   - 运行单元测试和集成测试
   - 生成覆盖率报告

2. **E2E 测试** (e2e-test)
   - 在 Windows 上运行
   - 安装 Playwright 浏览器
   - 运行 E2E 测试

3. **测试报告** (test-report)
   - 生成测试总结
   - 汇总所有测试结果

## 三、配置文件

### 3.1 GitHub Actions 配置

```
.github/
└── workflows/
    ├── ci.yml          # CI 工作流
    └── test.yml        # 测试工作流
```

### 3.2 Codecov 配置

```
codecov.yml            # Codecov 配置
```

**配置说明：**
- 目标覆盖率：80%
- 阈值：5%
- 忽略测试文件和脚本文件
- 支持分支覆盖检测

## 四、使用方法

### 4.1 本地测试

```bash
# 运行所有测试
npm run test:all

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 生成覆盖率报告
npm run test:unit:coverage
```

### 4.2 查看测试结果

**GitHub Actions：**
1. 进入项目的 Actions 页面
2. 选择对应的工作流运行
3. 查看详细的测试结果和日志

**Codecov：**
1. 进入 Codecov 项目页面
2. 查看覆盖率报告和趋势
3. 查看 PR 的覆盖率变化

### 4.3 手动触发工作流

1. 进入 Actions 页面
2. 选择 "Test" 工作流
3. 点击 "Run workflow"
4. 选择分支并运行

## 五、质量标准

### 5.1 测试标准

| 指标 | 标准 | 说明 |
|------|------|------|
| 测试通过率 | 100% | 所有测试必须通过 |
| 覆盖率 | ≥80% | 核心代码覆盖率 |
| 执行时间 | <30s | 单元测试执行时间 |
| E2E 测试 | 通过 | 关键流程测试 |

### 5.2 代码质量标准

| 检查项 | 标准 | 说明 |
|--------|------|------|
| ESLint | 无错误 | 代码规范检查 |
| TypeScript | 无错误 | 类型检查 |
| Prettier | 格式正确 | 代码格式化 |
| 重复代码 | <5% | 代码重复检测 |

## 六、故障排查

### 6.1 常见问题

**问题1：测试失败**
```bash
# 本地运行测试
npm run test:unit

# 查看详细错误
npm run test:unit -- --verbose
```

**问题2：覆盖率不足**
```bash
# 生成覆盖率报告
npm run test:unit:coverage

# 查看报告
open coverage/unit-main/lcov-report/index.html
```

**问题3：E2E 测试失败**
```bash
# 安装 Playwright 浏览器
npx playwright install

# 运行 E2E 测试
npm run test:e2e

# 调试模式
npm run test:e2e:debug
```

### 6.2 日志查看

**GitHub Actions 日志：**
1. 进入工作流运行页面
2. 点击失败的任务
3. 展开失败的步骤
4. 查看详细错误信息

**本地日志：**
```bash
# 查看测试结果
cat test-results/junit.xml

# 查看覆盖率
cat coverage/unit-main/lcov.info
```

## 七、最佳实践

### 7.1 提交前检查

```bash
# 运行所有检查
npm run check:all

# 或分步运行
npm run lint
npm run typecheck
npm run test:unit
```

### 7.2 PR 检查清单

- [ ] 所有测试通过
- [ ] 覆盖率未降低
- [ ] ESLint 无错误
- [ ] TypeScript 无错误
- [ ] 代码格式正确
- [ ] 文档已更新

### 7.3 分支策略

- **main**: 生产分支，保护分支
- **develop**: 开发分支，保护分支
- **feature/***: 功能分支
- **bugfix/***: 修复分支

## 八、监控与告警

### 8.1 监控指标

- 测试通过率
- 测试执行时间
- 覆盖率变化
- 构建成功率

### 8.2 告警配置

**GitHub Actions 通知：**
- 失败时发送邮件通知
- PR 检查失败时评论

**Codecov 通知：**
- 覆盖率下降时告警
- PR 覆盖率变化时评论

## 九、维护与更新

### 9.1 定期维护

- 每周检查测试稳定性
- 每月更新依赖版本
- 每季度审查 CI/CD 配置

### 9.2 配置更新

**更新 Node.js 版本：**
```yaml
matrix:
  node-version: [18.x, 20.x, 22.x]
```

**更新操作系统：**
```yaml
matrix:
  os: [windows-latest, ubuntu-latest, macos-latest]
```

**更新覆盖率目标：**
```yaml
# codecov.yml
coverage:
  status:
    project:
      default:
        target: 85%  # 提高目标
```

## 十、总结

### 10.1 CI/CD 优势

✅ **自动化**
- 自动运行测试
- 自动检查代码质量
- 自动生成报告

✅ **质量保证**
- 多平台测试
- 多版本测试
- 覆盖率监控

✅ **效率提升**
- 快速反馈
- 问题早发现
- 减少人工检查

### 10.2 下一步计划

- [ ] 添加性能测试
- [ ] 添加安全扫描
- [ ] 配置自动部署
- [ ] 优化测试性能

---

**创建时间：** 2026-03-03
**最后更新：** 2026-03-03
**维护者：** 开发团队
