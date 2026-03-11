/**
 * 页面渲染测试
 * 测试主界面的渲染、布局、元素显示
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock 组件（根据实际项目调整）
const MockApp: React.FC = () => {
  return (
    <div data-testid="app-container" className="app-container">
      <header data-testid="app-header">
        <h1>ComfyUI Desktop</h1>
      </header>
      <main data-testid="app-main">
        <div data-testid="status-panel">状态面板</div>
        <div data-testid="control-panel">控制面板</div>
      </main>
      <footer data-testid="app-footer">
        <p>版本 3.0.0</p>
      </footer>
    </div>
  );
};

describe('页面渲染测试', () => {
  describe('基础渲染', () => {
    test('应该成功渲染应用容器', () => {
      render(<MockApp />);
      expect(screen.getByTestId('app-container')).toBeInTheDocument();
    });

    test('应该渲染头部', () => {
      render(<MockApp />);
      expect(screen.getByTestId('app-header')).toBeInTheDocument();
      expect(screen.getByText('ComfyUI Desktop')).toBeInTheDocument();
    });

    test('应该渲染主体内容', () => {
      render(<MockApp />);
      expect(screen.getByTestId('app-main')).toBeInTheDocument();
    });

    test('应该渲染底部', () => {
      render(<MockApp />);
      expect(screen.getByTestId('app-footer')).toBeInTheDocument();
      expect(screen.getByText(/版本/)).toBeInTheDocument();
    });
  });

  describe('布局结构', () => {
    test('应该包含状态面板', () => {
      render(<MockApp />);
      expect(screen.getByTestId('status-panel')).toBeInTheDocument();
    });

    test('应该包含控制面板', () => {
      render(<MockApp />);
      expect(screen.getByTestId('control-panel')).toBeInTheDocument();
    });

    test('所有主要区域应存在', () => {
      render(<MockApp />);

      const container = screen.getByTestId('app-container');
      const header = screen.getByTestId('app-header');
      const main = screen.getByTestId('app-main');
      const footer = screen.getByTestId('app-footer');

      expect(container).toContainElement(header);
      expect(container).toContainElement(main);
      expect(container).toContainElement(footer);
    });
  });

  describe('响应式布局', () => {
    test('容器应有正确的类名', () => {
      render(<MockApp />);
      const container = screen.getByTestId('app-container');
      expect(container).toHaveClass('app-container');
    });
  });

  describe('可访问性', () => {
    test('标题应该是 h1', () => {
      render(<MockApp />);
      const title = screen.getByRole('heading', { level: 1 });
      expect(title).toHaveTextContent('ComfyUI Desktop');
    });

    test('应该有语义化的 HTML 结构', () => {
      render(<MockApp />);

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });
  });

  describe('快照测试', () => {
    test('页面应匹配快照', () => {
      const { container } = render(<MockApp />);
      expect(container).toMatchSnapshot();
    });
  });
});
