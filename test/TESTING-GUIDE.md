# 测试实施指南

## 一、测试环境配置

### 1.1 已安装依赖

```json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "jest-environment-jsdom": "^29.7.0",
    "@playwright/test": "^1.40.0"
  }
}
```

### 1.2 配置文件

- `test/jest.config.js` - 主进程测试配置
- `test/jest.renderer.config.js` - 渲染进程测试配置
- `test/playwright.config.js` - E2E 测试配置
- `tsconfig.json` - TypeScript 配置（已添加 JSX 支持）

## 二、测试执行命令

### 2.1 单元测试

```bash
# 运行所有单元测试
npm run test:unit

# 运行主进程单元测试
npm run test:unit:main

# 运行渲染进程单元测试
npm run test:unit:renderer

# 运行特定测试文件
npx jest test/unit/main/config/nested-path.test.ts

# 监听模式
npm run test:unit:watch

# 生成覆盖率报告
npm run test:unit:coverage
```

### 2.2 E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定测试
npx playwright test test/e2e/normal/select-portable-and-start.test.ts

# UI 模式
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug
```

### 2.3 完整测试

```bash
# 运行所有测试
npm run test:all

# 检查测试质量
npm run check:test-quality
```

## 三、测试文件组织

### 3.1 目录结构

```
test/
├── unit/                    # 单元测试
│   ├── main/               # 主进程测试
│   │   ├── config/         # 配置管理测试
│   │   ├── service/        # 服务管理测试
│   │   └── ipc/            # IPC 通信测试
│   ├── renderer/           # 渲染进程测试
│   │   ├── ui/             # UI 组件测试
│   │   ├── dialog/         # 对话框测试
│   │   └── error/          # 错误处理测试
│   └── common/             # 通用工具测试
├── e2e/                    # E2E 测试
│   ├── normal/             # 正常流程测试
│   ├── abnormal/           # 异常场景测试
│   └── boundary/           # 边界场景测试
├── mocks/                  # Mock 文件
├── utils/                  # 测试工具
└── setup-*.ts              # 测试设置文件
```

### 3.2 命名规范

- 测试文件：`*.test.ts` 或 `*.test.tsx`
- Mock 文件：`*.mock.ts`
- 工具文件：`*.ts`（不含 `.test`）
- 配置文件：`*.config.js`

## 四、测试编写规范

### 4.1 测试结构

```typescript
describe('功能模块名称', () => {
  beforeEach(() => {
    // 测试前准备
  });

  afterEach(() => {
    // 测试后清理
  });

  describe('子功能', () => {
    test('应该正确处理正常情况', () => {
      // Arrange - 准备
      // Act - 执行
      // Assert - 断言
    });

    test('应该正确处理异常情况', () => {
      // ...
    });
  });
});
```

### 4.2 测试命名

- 使用中文描述测试场景
- 使用"应该"开头描述预期行为
- 测试名称应清晰表达测试意图

**示例：**
```typescript
test('应该成功启动服务', () => {});
test('无效端口应抛出错误', () => {});
test('配置应在重启后保持', () => {});
```

### 4.3 Mock 使用

```typescript
// 使用项目提供的 Mock
import { MockElectronStore } from '../mocks/electron-store.mock';
import { MockPortableService } from '../mocks/portable-service.mock';

// 创建实例
const store = new MockElectronStore();
const service = new MockPortableService();

// 重置状态
afterEach(() => {
  store.clear();
  service.reset();
});
```

## 五、测试覆盖重点

### 5.1 主进程测试重点

1. **配置管理**
   - 嵌套路径读写
   - 配置验证
   - 持久化与恢复

2. **服务管理**
   - 启动/停止/重启
   - 状态转换
   - 异常处理

3. **IPC 通信**
   - 消息传递
   - 错误处理
   - 并发处理

### 5.2 渲染进程测试重点

1. **UI 组件**
   - 渲染正确性
   - 状态管理
   - 用户交互

2. **表单验证**
   - 输入验证
   - 错误提示
   - 提交处理

3. **错误处理**
   - 错误显示
   - 用户提示
   - 恢复机制

### 5.3 E2E 测试重点

1. **正常流程**
   - 完整业务流程
   - 用户操作路径
   - 数据流转

2. **异常场景**
   - 错误处理
   - 用户提示
   - 恢复机制

3. **边界场景**
   - 极限值
   - 并发操作
   - 性能测试

## 六、持续集成

### 6.1 CI 配置建议

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 6.2 测试质量检查

```bash
# 检查测试覆盖率
npm run test:unit:coverage

# 检查测试质量
npm run check:test-quality

# 检查所有
npm run check:all
```

## 七、常见问题解决

### 7.1 渲染进程测试失败

**问题：** JSX 相关错误

**解决：**
```bash
# 确保已安装依赖
npm install --save-dev @types/react @types/react-dom

# 检查 tsconfig.json
# 确保 "jsx": "react" 已配置
```

### 7.2 Mock 不生效

**问题：** Mock 未被正确应用

**解决：**
```typescript
// 确保在测试文件顶部导入 Mock
import { MockElectronStore } from '../mocks/electron-store.mock';

// 确保在 beforeEach 中初始化
beforeEach(() => {
  store = new MockElectronStore();
});
```

### 7.3 异步测试超时

**问题：** 测试超时失败

**解决：**
```typescript
// 增加超时时间
test('长时间操作', async () => {
  // ...
}, 30000); // 30 秒超时

// 或在配置中设置
// testTimeout: 30000
```

## 八、测试最佳实践

### 8.1 测试原则

1. **独立性**：每个测试应独立运行，不依赖其他测试
2. **可重复性**：测试结果应稳定可重复
3. **快速性**：单元测试应快速执行
4. **清晰性**：测试意图应清晰明确

### 8.2 避免的反模式

❌ 测试之间共享状态
❌ 测试实现细节
❌ 过度 Mock
❌ 测试过多内容
❌ 忽略异步操作

### 8.3 推荐模式

✅ 测试行为而非实现
✅ 使用有意义的测试数据
✅ 合理使用 Mock
✅ 测试边界情况
✅ 保持测试简单

## 九、测试维护

### 9.1 定期检查

- 每周运行完整测试套件
- 检查测试覆盖率变化
- 更新过时的测试用例
- 清理无用的测试代码

### 9.2 测试重构

- 当功能变更时同步更新测试
- 提取公共测试逻辑到工具函数
- 优化测试性能
- 改进测试可读性

## 十、下一步行动

### 10.1 立即执行

1. ✅ 修复渲染进程测试配置
2. ✅ 运行完整测试套件
3. ✅ 生成覆盖率报告
4. ✅ 修复失败的测试

### 10.2 短期计划（1-2周）

1. 补充缺失的测试用例
2. 提高测试覆盖率到 80%
3. 集成 CI/CD 流程
4. 编写测试文档

### 10.3 长期计划（1个月）

1. 建立测试质量监控
2. 定期测试审查
3. 测试培训与分享
4. 持续优化测试体系

---

**最后更新：** 2026-03-03
**维护者：** 开发团队
