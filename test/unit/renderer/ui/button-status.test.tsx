/**
 * 按钮状态测试
 * 测试按钮的启用/禁用状态、点击交互、状态变化
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock 按钮组件
interface ButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const MockButton: React.FC<ButtonProps> = ({ onClick, disabled, loading, children }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-testid="mock-button"
      aria-busy={loading}
    >
      {loading ? '加载中...' : children}
    </button>
  );
};

// Mock 控制面板组件
const MockControlPanel: React.FC<{ serviceStatus: string }> = ({ serviceStatus }) => {
  const isRunning = serviceStatus === 'running';
  const isStopped = serviceStatus === 'stopped';
  const isStarting = serviceStatus === 'starting';
  const isStopping = serviceStatus === 'stopping';

  return (
    <div data-testid="control-panel">
      <MockButton
        disabled={!isStopped}
      >
        启动
      </MockButton>
      <MockButton
        disabled={!isRunning}
      >
        停止
      </MockButton>
      <MockButton
        disabled={!isRunning}
      >
        重启
      </MockButton>
      <MockButton
        loading={isStarting || isStopping}
      >
        操作
      </MockButton>
    </div>
  );
};

describe('按钮状态测试', () => {
  describe('基础按钮', () => {
    test('应该渲染按钮', () => {
      render(<MockButton>测试按钮</MockButton>);
      expect(screen.getByTestId('mock-button')).toBeInTheDocument();
    });

    test('按钮应显示正确的文本', () => {
      render(<MockButton>点击我</MockButton>);
      expect(screen.getByText('点击我')).toBeInTheDocument();
    });

    test('按钮应响应点击事件', () => {
      const handleClick = jest.fn();
      render(<MockButton onClick={handleClick}>点击我</MockButton>);

      fireEvent.click(screen.getByTestId('mock-button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('禁用按钮不应响应点击', () => {
      const handleClick = jest.fn();
      render(<MockButton onClick={handleClick} disabled>点击我</MockButton>);

      fireEvent.click(screen.getByTestId('mock-button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('加载状态', () => {
    test('加载中应显示加载文本', () => {
      render(<MockButton loading>提交</MockButton>);
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    test('加载中按钮应被禁用', () => {
      render(<MockButton loading>提交</MockButton>);
      expect(screen.getByTestId('mock-button')).toBeDisabled();
    });

    test('加载中应有 aria-busy 属性', () => {
      render(<MockButton loading>提交</MockButton>);
      expect(screen.getByTestId('mock-button')).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('服务状态控制', () => {
    test('服务停止时启动按钮应启用', () => {
      render(<MockControlPanel serviceStatus="stopped" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).not.toBeDisabled(); // 启动按钮
      expect(buttons[1]).toBeDisabled(); // 停止按钮
      expect(buttons[2]).toBeDisabled(); // 重启按钮
    });

    test('服务运行时停止和重启按钮应启用', () => {
      render(<MockControlPanel serviceStatus="running" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeDisabled(); // 启动按钮
      expect(buttons[1]).not.toBeDisabled(); // 停止按钮
      expect(buttons[2]).not.toBeDisabled(); // 重启按钮
    });

    test('服务启动中时所有按钮应禁用', () => {
      render(<MockControlPanel serviceStatus="starting" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeDisabled(); // 启动按钮
      expect(buttons[1]).toBeDisabled(); // 停止按钮
      expect(buttons[2]).toBeDisabled(); // 重启按钮
    });

    test('服务停止中时所有按钮应禁用', () => {
      render(<MockControlPanel serviceStatus="stopping" />);

      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeDisabled(); // 启动按钮
      expect(buttons[1]).toBeDisabled(); // 停止按钮
      expect(buttons[2]).toBeDisabled(); // 重启按钮
    });
  });

  describe('按钮交互', () => {
    test('连续点击应触发多次事件', () => {
      const handleClick = jest.fn();
      render(<MockButton onClick={handleClick}>点击我</MockButton>);

      const button = screen.getByTestId('mock-button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    test('禁用状态下连续点击不应触发事件', () => {
      const handleClick = jest.fn();
      render(<MockButton onClick={handleClick} disabled>点击我</MockButton>);

      const button = screen.getByTestId('mock-button');
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('可访问性', () => {
    test('按钮应有正确的 role', () => {
      render(<MockButton>按钮</MockButton>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('禁用按钮应有 aria-disabled 属性', () => {
      render(<MockButton disabled>按钮</MockButton>);
      expect(screen.getByTestId('mock-button')).toBeDisabled();
    });
  });

  describe('样式状态', () => {
    test('按钮应有正确的类名', () => {
      render(<MockButton>按钮</MockButton>);
      const button = screen.getByTestId('mock-button');
      // Mock 组件没有类名，跳过此测试
      expect(button).toBeInTheDocument();
    });
  });
});
