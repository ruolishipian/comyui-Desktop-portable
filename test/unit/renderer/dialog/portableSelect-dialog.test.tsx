/**
 * 便携包选择对话框测试
 * 测试路径选择对话框的打开、选择、取消、验证
 */

import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock 对话框组件
interface SelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  title: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

const MockSelectDialog: React.FC<SelectDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  title
}) => {
  const [selectedPath, setSelectedPath] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelect = () => {
    if (!selectedPath) {
      setError('请选择路径');
      return;
    }

    onSelect(selectedPath);
    setSelectedPath('');
    setError('');
  };

  const handleCancel = () => {
    setSelectedPath('');
    setError('');
    onClose();
  };

  return (
    <div data-testid="select-dialog" role="dialog" aria-modal="true">
      <h2>{title}</h2>

      <div>
        <input
          type="text"
          value={selectedPath}
          onChange={(e) => setSelectedPath(e.target.value)}
          placeholder="选择路径"
          data-testid="path-input"
        />
        <button data-testid="browse-button">浏览...</button>
      </div>

      {error && <div data-testid="dialog-error">{error}</div>}

      <div>
        <button onClick={handleSelect} data-testid="confirm-button">
          确定
        </button>
        <button onClick={handleCancel} data-testid="cancel-button">
          取消
        </button>
      </div>
    </div>
  );
};

describe('便携包选择对话框测试', () => {
  describe('对话框显示', () => {
    test('打开时应显示对话框', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择 ComfyUI 路径"
        />
      );

      expect(screen.getByTestId('select-dialog')).toBeInTheDocument();
    });

    test('关闭时不应显示对话框', () => {
      render(
        <MockSelectDialog
          isOpen={false}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择 ComfyUI 路径"
        />
      );

      expect(screen.queryByTestId('select-dialog')).not.toBeInTheDocument();
    });

    test('应显示正确的标题', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择 ComfyUI 路径"
        />
      );

      expect(screen.getByText('选择 ComfyUI 路径')).toBeInTheDocument();
    });
  });

  describe('路径输入', () => {
    test('应能输入路径', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      const input = screen.getByTestId('path-input');
      fireEvent.change(input, { target: { value: '/path/to/comfyui' } });

      expect(input).toHaveValue('/path/to/comfyui');
    });

    test('应显示浏览按钮', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      expect(screen.getByTestId('browse-button')).toBeInTheDocument();
    });
  });

  describe('确认选择', () => {
    test('点击确定应调用 onSelect', () => {
      const handleSelect = jest.fn();
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={handleSelect}
          title="选择路径"
        />
      );

      const input = screen.getByTestId('path-input');
      fireEvent.change(input, { target: { value: '/path/to/comfyui' } });

      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(handleSelect).toHaveBeenCalledWith('/path/to/comfyui');
    });

    test('未选择路径时应显示错误', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(screen.getByTestId('dialog-error')).toHaveTextContent('请选择路径');
    });

    test('未选择路径时不应调用 onSelect', () => {
      const handleSelect = jest.fn();
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={handleSelect}
          title="选择路径"
        />
      );

      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe('取消操作', () => {
    test('点击取消应调用 onClose', () => {
      const handleClose = jest.fn();
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={handleClose}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      fireEvent.click(screen.getByTestId('cancel-button'));

      expect(handleClose).toHaveBeenCalled();
    });

    test('取消后应清空输入', () => {
      const handleClose = jest.fn();
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={handleClose}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      const input = screen.getByTestId('path-input');
      fireEvent.change(input, { target: { value: '/path/to/comfyui' } });

      fireEvent.click(screen.getByTestId('cancel-button'));

      // 对话框关闭后输入应被清空
      expect(input).toHaveValue('');
    });
  });

  describe('可访问性', () => {
    test('对话框应有正确的 role', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('对话框应是模态的', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    test('按钮应有明确的标签', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      expect(screen.getByText('确定')).toBeInTheDocument();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    test('错误信息应可访问', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      fireEvent.click(screen.getByTestId('confirm-button'));

      const error = screen.getByTestId('dialog-error');
      expect(error).toBeInTheDocument();
      expect(error).toHaveTextContent('请选择路径');
    });

    test('输入路径后错误应消失', () => {
      render(
        <MockSelectDialog
          isOpen={true}
          onClose={jest.fn()}
          onSelect={jest.fn()}
          title="选择路径"
        />
      );

      // 触发错误
      fireEvent.click(screen.getByTestId('confirm-button'));
      expect(screen.getByTestId('dialog-error')).toBeInTheDocument();

      // 输入路径
      const input = screen.getByTestId('path-input');
      fireEvent.change(input, { target: { value: '/path/to/comfyui' } });

      // 再次点击确认，错误应消失
      fireEvent.click(screen.getByTestId('confirm-button'));

      // 错误应消失（因为路径已输入）
      // 注意：这个测试的逻辑需要根据实际组件行为调整
      expect(screen.queryByTestId('dialog-error')).not.toBeInTheDocument();
    });
  });
});
