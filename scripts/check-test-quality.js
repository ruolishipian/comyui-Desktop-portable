#!/usr/bin/env node

/**
 * 测试文件质量检查脚本
 * 确保测试文件符合项目质量标准
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`\n${description}...`, 'cyan');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✓ ${description}通过`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`✗ ${description}失败`, 'red');
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.log(error.stderr);
    }
    return { success: false, error };
  }
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    log(`✓ ${description}存在`, 'green');
    return true;
  } else {
    log(`✗ ${description}不存在: ${filePath}`, 'red');
    return false;
  }
}

function checkTypeDeclarations() {
  log('\n=== 检查类型声明文件 ===', 'blue');

  const requiredFiles = [
    { path: 'test/types/jest.d.ts', desc: 'Jest 类型声明' },
    { path: 'test/types/playwright.d.ts', desc: 'Playwright 类型声明' }
  ];

  let allExist = true;
  requiredFiles.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      allExist = false;
    } else {
      // 检查文件内容是否有效
      const filePath = path.join(__dirname, '..', file.path);
      const content = fs.readFileSync(filePath, 'utf8');

      // 检查是否有明显的语法错误标记
      if (content.includes('};};') || content.includes('};\n};')) {
        log(`✗ ${file.desc} 存在语法错误（多余的分号或大括号）`, 'red');
        allExist = false;
      }

      // 检查文件是否以正确的声明开始（更严格的检查）
      const trimmedContent = content.trimStart();
      if (!trimmedContent.startsWith('/**') && !trimmedContent.startsWith('declare')) {
        log(`✗ ${file.desc} 文件开头格式错误（应以 /** 或 declare 开头）`, 'red');
        allExist = false;
      } else {
        // 检查开头是否有非法字符
        const firstLine = content.split('\n')[0];
        if (firstLine && !firstLine.startsWith('/**') && !firstLine.startsWith('declare')) {
          log(`✗ ${file.desc} 文件开头存在非法字符：${firstLine.charAt(0)}`, 'red');
          allExist = false;
        }
      }

      // 使用 TypeScript 编译器检查语法
      try {
        const result = execSync(`npx tsc --noEmit ${file.path}`, {
          cwd: path.join(__dirname, '..'),
          encoding: 'utf8',
          stdio: 'pipe'
        });
      } catch (error) {
        // execSync 在有错误时会抛出异常
        if (error.stderr && error.stderr.includes('error')) {
          log(`✗ ${file.desc} TypeScript 语法错误`, 'red');
          // 显示错误详情（只显示前3行）
          const errorLines = error.stderr.split('\n').slice(0, 3);
          errorLines.forEach(line => {
            if (line.trim()) {
              log(`  ${line}`, 'red');
            }
          });
          allExist = false;
        } else if (error.stdout && error.stdout.includes('error')) {
          log(`✗ ${file.desc} TypeScript 语法错误`, 'red');
          // 显示错误详情（只显示前3行）
          const errorLines = error.stdout.split('\n').slice(0, 3);
          errorLines.forEach(line => {
            if (line.trim()) {
              log(`  ${line}`, 'red');
            }
          });
          allExist = false;
        }
      }
    }
  });

  return allExist;
}

function checkTestConfig() {
  log('\n=== 检查测试配置文件 ===', 'blue');

  const configFiles = [
    { path: 'test/jest.config.js', desc: 'Jest 主进程配置' },
    { path: 'test/jest.renderer.config.js', desc: 'Jest 渲染进程配置' },
    { path: 'test/playwright.config.js', desc: 'Playwright E2E 配置' },
    { path: 'test/setup-mocks.js', desc: '全局 Mock 设置' }
  ];

  let allExist = true;
  configFiles.forEach(file => {
    if (!checkFileExists(file.path, file.desc)) {
      allExist = false;
    }
  });

  return allExist;
}

function checkTsConfig() {
  log('\n=== 检查 TypeScript 配置 ===', 'blue');

  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');

  let allValid = true;

  // 检查是否包含测试文件
  if (!tsconfigContent.includes('"test/**/*.ts"')) {
    log('✗ tsconfig.json 未包含测试文件 (test/**/*.ts)', 'red');
    allValid = false;
  } else {
    log('✓ tsconfig.json 已包含测试文件', 'green');
  }

  // 检查是否关闭了 noUnusedLocals
  if (!tsconfigContent.includes('"noUnusedLocals": false')) {
    log('⚠ tsconfig.json 建议关闭 noUnusedLocals（测试文件可能有未使用的变量）', 'yellow');
  } else {
    log('✓ tsconfig.json 已关闭 noUnusedLocals', 'green');
  }

  // 检查是否关闭了 noUnusedParameters
  if (!tsconfigContent.includes('"noUnusedParameters": false')) {
    log('⚠ tsconfig.json 建议关闭 noUnusedParameters（测试文件可能有未使用的参数）', 'yellow');
  } else {
    log('✓ tsconfig.json 已关闭 noUnusedParameters', 'green');
  }

  return allValid;
}

function checkEslintConfig() {
  log('\n=== 检查 ESLint 配置 ===', 'blue');

  const eslintrcPath = path.join(__dirname, '..', '.eslintrc.js');
  const eslintrcContent = fs.readFileSync(eslintrcPath, 'utf8');

  let allValid = true;

  // 检查是否有测试文件的 override
  if (!eslintrcContent.includes("files: ['test/**/*.ts'")) {
    log('✗ .eslintrc.js 未配置测试文件的特殊规则', 'red');
    allValid = false;
  } else {
    log('✓ .eslintrc.js 已配置测试文件的特殊规则', 'green');
  }

  // 检查是否关闭了测试文件的严格规则
  const requiredRules = [
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-unused-vars',
    '@typescript-eslint/no-var-requires'
  ];

  requiredRules.forEach(rule => {
    if (!eslintrcContent.includes(rule)) {
      log(`⚠ .eslintrc.js 建议为测试文件配置 ${rule}`, 'yellow');
    } else {
      log(`✓ .eslintrc.js 已配置 ${rule}`, 'green');
    }
  });

  return allValid;
}

function runTypeCheck() {
  log('\n=== 运行 TypeScript 类型检查 ===', 'blue');
  return execCommand('npx tsc --noEmit', 'TypeScript 类型检查');
}

function runEslintCheck() {
  log('\n=== 运行 ESLint 检查 ===', 'blue');
  return execCommand('npx eslint test/ --ext .ts,.tsx', 'ESLint 检查');
}

function runPrettierCheck() {
  log('\n=== 运行 Prettier 检查 ===', 'blue');
  return execCommand('npx prettier --check "test/**/*.{ts,tsx,js,jsx,json,md}"', 'Prettier 格式检查');
}

function main() {
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     测试文件质量检查                        ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');

  const results = {
    typeDeclarations: checkTypeDeclarations(),
    testConfig: checkTestConfig(),
    tsConfig: checkTsConfig(),
    eslintConfig: checkEslintConfig(),
    typeCheck: runTypeCheck().success,
    eslintCheck: runEslintCheck().success,
    prettierCheck: runPrettierCheck().success
  };

  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║              检查结果汇总                   ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');

  const allPassed = Object.values(results).every(result => result === true);

  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✓ 通过' : '✗ 失败';
    const color = value ? 'green' : 'red';
    log(`${key}: ${status}`, color);
  });

  if (allPassed) {
    log('\n✓ 所有检查通过！测试文件质量符合标准。', 'green');
    process.exit(0);
  } else {
    log('\n✗ 部分检查失败！请修复上述问题。', 'red');
    process.exit(1);
  }
}

// 运行主函数
main();
