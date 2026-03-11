/**
 * 配置面板测试
 * 测试配置面板的渲染、输入、验证、保存
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock 配置面板组件
interface ConfigPanelProps {
  initialConfig?: {
    port?: number;
    autoStart?: boolean;
    modelDir?: string;
  };
  onSave?: (config: any) => void;
}

const MockConfigPanel: React.FC<ConfigPanelProps> = ({ initialConfig, onSave }) => {
  const [config, setConfig] = useState({
    port: initialConfig?.port ?? 8188,
    autoStart: initialConfig?.autoStart ?? true,
    modelDir: initialConfig?.modelDir ?? ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (config.port < 1 || config.port > 65535) {
      newErrors.port = '端口必须在 1-65535 之间';
    }

    if (config.modelDir && !config.modelDir.startsWith('/')) {
      newErrors.modelDir = '路径必须以 / 开头';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave?.(config);
    }
  };

  return (
    <div data-testid="config-panel">
      <div>
        <label htmlFor="port">端口</label>
        <input
          id="port"
          type="number"
          value={config.port}
          onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
          data-testid="port-input"
        />
        {errors.port && <span data-testid="port-error">{errors.port}</span>}
      </div>

      <div>
        <label htmlFor="autoStart">自动启动</label>
        <input
          id="autoStart"
          type="checkbox"
          checked={config.autoStart}
          onChange={(e) => setConfig({ ...config, autoStart: e.target.checked as true })}
          data-testid="autoStart-checkbox"
        />
      </div>

      <div>
        <label htmlFor="modelDir">模型目录</label>
        <input
          id="modelDir"
          type="text"
          value={config.modelDir}
          onChange={(e) => setConfig({ ...config, modelDir: e.target.value })}
          data-testid="modelDir-input"
        />
        {errors.modelDir && <span data-testid="modelDir-error">{errors.modelDir}</span>}
      </div>

      <button onClick={handleSave} data-testid="save-button">
        保存
      </button>
    </div>
  );
};

describe('配置面板测试', () => {
  describe('基础渲染', () => {
    test('应该渲染配置面板', () => {
      render(<MockConfigPanel />);
      expect(screen.getByTestId('config-panel')).toBeInTheDocument();
    });

    test('应该显示所有配置项', () => {
      render(<MockConfigPanel />);

      expect(screen.getByLabelText('端口')).toBeInTheDocument();
      expect(screen.getByLabelText('自动启动')).toBeInTheDocument();
      expect(screen.getByLabelText('模型目录')).toBeInTheDocument();
    });

    test('应该显示保存按钮', () => {
      render(<MockConfigPanel />);
      expect(screen.getByTestId('save-button')).toBeInTheDocument();
    });
  });

  describe('初始值', () => {
    test('应使用默认值初始化', () => {
      render(<MockConfigPanel />);

      expect(screen.getByTestId('port-input')).toHaveValue(8188);
      expect(screen.getByTestId('autoStart-checkbox')).toBeChecked();
      expect(screen.getByTestId('modelDir-input')).toHaveValue('');
    });

    test('应使用传入的初始值', () => {
      render(<MockConfigPanel initialConfig={{ port: 9999, autoStart: false, modelDir: '/models' }} />);

      expect(screen.getByTestId('port-input')).toHaveValue(9999);
      // autoStart 为 false 时，checkbox 不应被选中
      const checkbox = screen.getByTestId('autoStart-checkbox');
      expect(checkbox).not.toBeChecked();
      expect(screen.getByTestId('modelDir-input')).toHaveValue('/models');
    });
  });

  describe('输入交互', () => {
    test('应该能修改端口号', () => {
      render(<MockConfigPanel />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '9999' } });

      expect(portInput).toHaveValue(9999);
    });

    test('应该能切换自动启动', () => {
      render(<MockConfigPanel />);

      const checkbox = screen.getByTestId('autoStart-checkbox');
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    test('应该能输入模型目录', () => {
      render(<MockConfigPanel />);

      const input = screen.getByTestId('modelDir-input');
      fireEvent.change(input, { target: { value: '/path/to/models' } });

      expect(input).toHaveValue('/path/to/models');
    });
  });

  describe('验证', () => {
    test('无效端口应显示错误', () => {
      render(<MockConfigPanel />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '0' } });
      fireEvent.click(screen.getByTestId('save-button'));

      expect(screen.getByTestId('port-error')).toHaveTextContent('端口必须在 1-65535 之间');
    });

    test('端口超出范围应显示错误', () => {
      render(<MockConfigPanel />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '70000' } });
      fireEvent.click(screen.getByTestId('save-button'));

      expect(screen.getByTestId('port-error')).toBeInTheDocument();
    });

    test('无效路径应显示错误', () => {
      render(<MockConfigPanel />);

      const input = screen.getByTestId('modelDir-input');
      fireEvent.change(input, { target: { value: 'invalid-path' } });
      fireEvent.click(screen.getByTestId('save-button'));

      expect(screen.getByTestId('modelDir-error')).toHaveTextContent('路径必须以 / 开头');
    });

    test('有效输入不应显示错误', () => {
      render(<MockConfigPanel />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '9999' } });
      fireEvent.click(screen.getByTestId('save-button'));

      expect(screen.queryByTestId('port-error')).not.toBeInTheDocument();
    });
  });

  describe('保存功能', () => {
    test('点击保存应调用 onSave', () => {
      const handleSave = jest.fn();
      render(<MockConfigPanel onSave={handleSave} />);

      fireEvent.click(screen.getByTestId('save-button'));

      expect(handleSave).toHaveBeenCalled();
    });

    test('保存时应传递正确的配置', () => {
      const handleSave = jest.fn();
      render(<MockConfigPanel onSave={handleSave} />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '9999' } });

      fireEvent.click(screen.getByTestId('save-button'));

      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({ port: 9999 })
      );
    });

    test('验证失败时不应调用 onSave', () => {
      const handleSave = jest.fn();
      render(<MockConfigPanel onSave={handleSave} />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '0' } });

      fireEvent.click(screen.getByTestId('save-button'));

      expect(handleSave).not.toHaveBeenCalled();
    });
  });

  describe('可访问性', () => {
    test('输入框应有正确的标签', () => {
      render(<MockConfigPanel />);

      expect(screen.getByLabelText('端口')).toBeInTheDocument();
      expect(screen.getByLabelText('自动启动')).toBeInTheDocument();
      expect(screen.getByLabelText('模型目录')).toBeInTheDocument();
    });

    test('错误信息应可访问', () => {
      render(<MockConfigPanel />);

      const portInput = screen.getByTestId('port-input');
      fireEvent.change(portInput, { target: { value: '0' } });
      fireEvent.click(screen.getByTestId('save-button'));

      const error = screen.getByTestId('port-error');
      expect(error).toBeInTheDocument();
    });
  });
});
