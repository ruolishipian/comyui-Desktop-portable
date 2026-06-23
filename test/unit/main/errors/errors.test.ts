import { FatalError, AppError, ErrorType } from '../../../../src/modules/errors';

describe('Errors', () => {
  test('FatalError 应该正确创建', () => {
    const error = new FatalError('test fatal');
    expect(error.message).toBe('test fatal');
    expect(error.name).toBe('FatalError');
  });

  test('AppError 应该正确创建', () => {
    const error = new AppError(ErrorType.CONFIG, 'test app error');
    expect(error.message).toBe('test app error');
    expect(error.name).toBe('AppError');
    expect(error.type).toBe(ErrorType.CONFIG);
  });

  test('FatalError 应该是 Error 的实例', () => {
    const error = new FatalError('test');
    expect(error).toBeInstanceOf(Error);
  });

  test('AppError 应该是 Error 的实例', () => {
    const error = new AppError(ErrorType.PROCESS, 'test');
    expect(error).toBeInstanceOf(Error);
  });
});
