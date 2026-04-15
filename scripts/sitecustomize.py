"""
sitecustomize.py - Python 启动时自动加载的站点自定义模块

此模块解决 Windows 中文系统上 ComfyUI 及其插件（如 ComfyUI-Manager）
在调用 subprocess 时因编码不匹配导致的 UnicodeDecodeError 问题。

问题原因：
  当设置 PYTHONUTF8=1 后，Python 的 subprocess 模块在 text=True 模式下
  使用 UTF-8 解码子进程输出。但 Windows 上的原生程序（git、pip 等）输出
  使用系统本地编码（GBK/cp936），导致 UTF-8 解码失败：
    UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb2 in position 7

修复方式：
  Monkey-patch subprocess.Popen，在创建文本模式管道时自动添加 errors='replace'，
  使解码遇到无效字节时用替换字符（�）代替，而非抛出异常。
  这与 Python 3.7+ 的 subprocess errors 参数行为一致。

注意：
  gitpython 的 str/bytes endswith TypeError 修复由启动器在每次启动时
  自动 patch git/cmd.py 源码来实现（见 _patchGitpython 方法），
  因为 git/cmd.py 的顶层 import 会触发 git/__init__.py 的 refresh()，
  无法通过运行时 monkey-patch 在 refresh() 之前生效。
"""

import subprocess
import sys

# 仅在 Windows 上且启用了 UTF-8 模式时需要修复
if sys.platform == 'win32' and sys.flags.utf8_mode:
    _original_popen_init = subprocess.Popen.__init__

    def _patched_popen_init(self, args, **kwargs):
        # 如果使用了文本模式（text=True 或 universal_newlines=True 或 encoding 被指定）
        # 且没有显式设置 errors 参数，则自动添加 errors='replace'
        if kwargs.get('text', False) or kwargs.get('universal_newlines', False) or 'encoding' in kwargs:
            if 'errors' not in kwargs:
                kwargs['errors'] = 'replace'
        _original_popen_init(self, args, **kwargs)

    # 应用 monkey-patch
    subprocess.Popen.__init__ = _patched_popen_init
