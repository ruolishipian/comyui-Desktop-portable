# ComfyUI-Desktop 自动化代码代理指南

本文档为自动化代码代理（如 CodeArts）提供在 ComfyUI-Desktop 项目中工作的指导。

## 项目概览

**项目类型**：基于 Electron 的桌面应用程序，为 ComfyUI（AI 图像生成工具）提供便携桌面版本。

**核心技术栈**：
- Electron v31.3.1 + Node.js >= 18.0.0
- TypeScript 5.3.3（完整类型支持）
- React（前端界面）
- Jest + Playwright（测试框架）

## 构建和开发命令

### 开发构建
```bash
npm run build            # TypeScript 编译 + 资源复制
npm run build:watch     # TypeScript 监听模式
npm run copy-assets     # 复制资源文件到 dist 目录
npm run start           # 生产模式启动
npm run start:dev       # 开发模式启动
```

### Windows 构建
```bash
npm run build:win              # Windows 基础构建
npm run build:win:installer    # NSIS 安装包
npm run build:win:portable     # ZIP 便携版
npm run build:win:all          # 所有格式打包
npm run prepackage            # 打包前检查
npm run verify:icon           # 验证图标嵌入
```

### 代码质量检查
```bash
npm run lint           # ESLint 检查 .ts 文件
npm run lint:fix      # ESLint 自动修复
npm run typecheck     # TypeScript 类型检查
npm run typecheck:test # 测试文件类型检查
npm run typecheck:all  # 全部类型检查
npm run check-duplicates  # JSCPD 重复代码检测（5行，50令牌）
npm run format        # Prettier 格式化所有文件
npm run quality-check # 自定义质量检查脚本
npm run check-all     # lint + typecheck + duplicates
npm run check:test-quality # 测试文件质量检查
npm run check:all     # 完整检查（代码质量+测试质量）
```

### 测试命令
```bash
# 单元测试
npm run test                     # 或 npm run test:unit
npm run test:unit:main          # 仅主进程测试
npm run test:unit:renderer      # 仅渲染进程测试
npm run test:unit:watch         # 监听模式单元测试
npm run test:unit:coverage      # 单元测试覆盖率报告
npm run test:quick              # 仅运行更改的测试文件
npm run test:parallel           # 并行运行测试（最多4进程）

# 集成测试
npm run test:integration        # 集成测试

# 端到端测试
npm run test:e2e                # Playwright E2E 测试
npm run test:e2e:ui             # Playwright UI 模式
npm run test:e2e:debug          # Playwright 调试模式

# 完整测试套件
npm run test:all                # 单元 + 集成 + E2E 测试
npm run test:coverage           # 上传到 Coveralls

# 运行单个测试的命令
npx jest test/unit/main/config/nested-path.test.ts                 # 运行特定文件
npm run test:unit:main -- test/unit/main/config/nested-path.test.ts # 主进程测试
npm run test:unit:renderer -- test/unit/renderer/component.test.ts # 渲染进程测试
npm run test:unit -- --testNamePattern="特定测试描述"               # 测试过滤器
npm run test:unit -- --testPathPattern="特定文件路径"                # 文件路径过滤器
```

## 代码风格指南

### 代码规范配置
- **ESLint 配置文件**：`.eslintrc.js`
- **Prettier 配置文件**：`.prettierrc`
- **TypeScript 配置**：`tsconfig.json`

### 核心 ESLint 规则
- **行宽限制**：最大 120 字符（忽略注释和字符串）
- **引号**：单引号
- **分号**：必须使用
- **缩进**：2 空格
- **console 限制**：仅允许 `warn`、`error`、`info`、`log`
- **变量声明**：优先使用 `const`，禁止 `var`
- **类型安全**：严格模式，限制 `any` 类型使用
- **Promise 处理**：必须正确处理，禁止未处理的 Promise
- **命名约定**：camelCase（变量/函数）、PascalCase（类型）、UPPER_CASE（常量）

### TypeScript 命名约定
```javascript
'@typescript-eslint/naming-convention': [
  'error',
  { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
  { selector: 'function', format: ['camelCase', 'PascalCase'] },
  { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
  { selector: 'property', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
  { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'], leadingUnderscore: 'require' },
  { selector: 'typeLike', format: ['PascalCase'] }
]
```

### 导入顺序
1. `builtin` - Node.js 内置模块
2. `external` - 第三方依赖
3. `internal` - 项目内部模块（`@/`, `@modules/`）
4. `parent` - 父目录导入
5. `sibling` - 同级目录导入
6. `index` - 目录索引文件
7. `type` - 类型导入

每组之间需要有空行，按字母顺序排序（不区分大小写）。

### 测试文件宽松规则
测试文件（`test/**/*.ts`）放宽了以下规则：
- 允许使用 `any` 类型
- 关闭命名约定规则
- 关闭未使用变量检查
- 关闭导入顺序规则
- 关闭 Promise 相关规则

### 错误处理最佳实践
- 使用 try-catch 处理异步错误
- Promise 必须使用 `.catch()` 或 try-catch
- 禁止抛出字面量错误（使用 `Error` 构造函数）
- 优先使用可选链（`?.`）和空值合并运算符（`??`）
- 使用类型推断和类型守卫

## 目录结构约定
```
src/
├── main/          # 主进程代码
├── renderer/      # 渲染进程代码
├── modules/       # 模块化功能
└── types/         # TypeScript 类型定义

test/
├── unit/          # 单元测试
│   ├── common/    # 通用工具测试
│   ├── main/      # 主进程测试
│   └── renderer/  # 渲染进程测试
├── integration/   # 集成测试
├── e2e/          # 端到端测试
├── types/        # 测试类型定义
├── utils/        # 测试工具
├── mocks/        # Mock 文件
└── setup.ts      # 测试配置
```

## Git 工作流

### 预提交钩子（Husky）
```json
{
  "*.{js,ts}": ["eslint --fix", "prettier --write", "git add"],
  "test/**/*.{ts,tsx}": ["eslint --fix", "prettier --write", "git add"]
}
```

### 预推送钩子
```bash
npm run check:test-quality
```

## 测试覆盖率要求
- **分支覆盖率**：≥ 70%
- **函数覆盖率**：≥ 80%
- **行覆盖率**：≥ 80%
- **语句覆盖率**：≥ 80%

通过 Jest 强制执行，配置在 `test/jest.config.js` 中。

## CI/CD 配置
GitHub Actions 工作流位于 `.github/workflows/build.yml`：
- 触发条件：标签推送 (`v*`) 或手动触发
- 环境：windows-latest
- 步骤：安装依赖、清理缓存、构建、检查产物、打包、发布
- 输出：NSIS 安装包 + ZIP 便携版

## 快速参考

### 故障排除
```bash
# 类型检查失败
npm run typecheck:all -- --noEmit

# ESLint 错误
npm run lint:fix

# 测试失败（查看详细输出）
npm run test:unit -- --verbose

# 仅运行失败的测试
npm run test:unit -- --onlyFailures

# 调试特定测试
npm run test:unit -- --testNamePattern="失败测试名"

# 构建失败
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Jest 配置文件
- `test/jest.config.js` - 主进程测试配置
- `test/jest.renderer.config.js` - 渲染进程测试配置
- `test/jest.integration.config.js` - 集成测试配置
- `test/playwright.config.js` - E2E 测试配置

### 测试文件特殊规则
- 测试文件使用中文描述，以"应该"开头（如：`test('应该成功启动服务', () => {})`）
- 测试分类：正常情况、异常情况、边界情况
- Mock 使用项目提供的工具

---

**最后更新**：2026年5月14日  
**维护者**：自动化代码代理（CodeArts）  
**版本**：2.0.0