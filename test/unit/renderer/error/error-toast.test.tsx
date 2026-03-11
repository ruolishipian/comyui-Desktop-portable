/**
 * 错误提示测试
 * 测试错误提示的显示、隐藏、样式、交互
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock 错误提示组件
interface ErrorToastProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

const MockErrorToast: React.FC<ErrorToastProps> = ({
  message,
  type = 'error',
  duration: _duration = 3000,
  onClose
}) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <div
      data-testid="error-toast"
      role="alert"
      className={`toast toast-${type}`}
    >
      <span data-testid="toast-message">{message}</span>
      <button
        onClick={handleClose}
        data-testid="close-button"
        aria-label="关闭"
      >
        ×
      </button>
    </div>
  );
};

// Mock 错误提示容器
const MockToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'error' | 'warning' | 'info' }>>([]);

  const addToast = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(toasts.filter(t => t.id !== id));
  };

  return (
    <div>
      <button
        onClick={() => addToast('错误消息', 'error')}
        data-testid="add-error"
      >
        添加错误
      </button>
      <button
        onClick={() => addToast('警告消息', 'warning')}
        data-testid="add-warning"
      >
        添加警告
      </button>
      <button
        onClick={() => addToast('信息消息', 'info')}
        data-testid="add-info"
      >
        添加信息
      </button>

      <div data-testid="toast-container">
        {toasts.map(toast => (
          <MockErrorToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

describe('错误提示测试', () => {
  describe('基础显示', () => {
    test('应该显示错误提示', () => {
      render(<MockErrorToast message="发生错误" />);

      expect(screen.getByTestId('error-toast')).toBeInTheDocument();
    });

    test('应该显示正确的消息', () => {
      render(<MockErrorToast message="发生错误" />);

      expect(screen.getByTestId('toast-message')).toHaveTextContent('发生错误');
    });

    test('应该显示关闭按钮', () => {
      render(<MockErrorToast message="发生错误" />);

      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });
  });

  describe('类型样式', () => {
    test('错误类型应有正确的类名', () => {
      render(<MockErrorToast message="错误" type="error" />);

      expect(screen.getByTestId('error-toast')).toHaveClass('toast-error');
    });

    test('警告类型应有正确的类名', () => {
      render(<MockErrorToast message="警告" type="warning" />);

      expect(screen.getByTestId('error-toast')).toHaveClass('toast-warning');
    });

    test('信息类型应有正确的类名', () => {
      render(<MockErrorToast message="信息" type="info" />);

      expect(screen.getByTestId('error-toast')).toHaveClass('toast-info');
    });
  });

  describe('关闭功能', () => {
    test('点击关闭按钮应隐藏提示', () => {
      render(<MockErrorToast message="发生错误" />);

      fireEvent.click(screen.getByTestId('close-button'));

      expect(screen.queryByTestId('error-toast')).not.toBeInTheDocument();
    });

    test('关闭时应调用 onClose 回调', () => {
      const handleClose = jest.fn();
      render(<MockErrorToast message="发生错误" onClose={handleClose} />);

      fireEvent.click(screen.getByTestId('close-button'));

      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('多个提示', () => {
    test('应能显示多个提示', () => {
      render(<MockToastContainer />);

      fireEvent.click(screen.getByTestId('add-error'));
      fireEvent.click(screen.getByTestId('add-warning'));
      fireEvent.click(screen.getByTestId('add-info'));

      const toasts = screen.getAllByTestId('error-toast');
      expect(toasts).toHaveLength(3);
    });

    test('应能单独关闭每个提示', () => {
      render(<MockToastContainer />);

      fireEvent.click(screen.getByTestId('add-error'));
      fireEvent.click(screen.getByTestId('add-warning'));

      const closeButtons = screen.getAllByTestId('close-button');
      const firstButton = closeButtons[0];
      if (firstButton) {
        fireEvent.click(firstButton);
      }

      const toasts = screen.getAllByTestId('error-toast');
      expect(toasts).toHaveLength(1);
    });
  });

  describe('可访问性', () => {
    test('提示应有 alert role', () => {
      render(<MockErrorToast message="发生错误" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    test('关闭按钮应有 aria-label', () => {
      render(<MockErrorToast message="发生错误" />);

      expect(screen.getByTestId('close-button')).toHaveAttribute('aria-label', '关闭');
    });
  });

  describe('消息内容', () => {
    test('应支持长文本', () => {
      const longMessage = '这是一个很长的错误消息，用于测试错误提示组件是否能够正确显示长文本内容，而不会出现布局问题或文本截断。';

      render(<MockErrorToast message={longMessage} />);

      expect(screen.getByTestId('toast-message')).toHaveTextContent(longMessage);
    });

    test('应支持特殊字符', () => {
      const specialMessage = '错误: 文件路径包含非法字符 < > : " | ? *';

      render(<MockErrorToast message={specialMessage} />);

      expect(screen.getByTestId('toast-message')).toHaveTextContent(specialMessage);
    });

    test('应支持多行文本', () => {
      const multilineMessage = '错误详情:\n第一行\n第二行\n第三行';

      render(<MockErrorToast message={multilineMessage} />);

      expect(screen.getByTestId('toast-message')).toHaveTextContent('错误详情:');
    });
  });

  describe('交互测试', () => {
    test('快速连续添加和关闭应正常工作', () => {
      render(<MockToastContainer />);

      // 快速添加多个提示
      fireEvent.click(screen.getByTestId('add-error'));
      fireEvent.click(screen.getByTestId('add-error'));
      fireEvent.click(screen.getByTestId('add-error'));

      expect(screen.getAllByTestId('error-toast')).toHaveLength(3);

      // 快速关闭所有提示
      const closeButtons = screen.getAllByTestId('close-button');
      closeButtons.forEach(button => fireEvent.click(button));

      expect(screen.queryByTestId('error-toast')).not.toBeInTheDocument();
    });
  });
});
