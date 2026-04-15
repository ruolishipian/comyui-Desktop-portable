"""
sitecustomize.py - Python 启动时自动加载的站点自定义模块

此模块解决两个兼容性问题：

1. Windows 中文系统 subprocess UnicodeDecodeError
   当设置 PYTHONUTF8=1 后，Python 的 subprocess 模块在 text=True 模式下
   使用 UTF-8 解码子进程输出。但 Windows 上的原生程序（git、pip 等）输出
   使用系统本地编码（GBK/cp936），导致 UTF-8 解码失败：
     UnicodeDecodeError: 'utf-8' codec can't decode byte 0xb2 in position 7
   修复：Monkey-patch subprocess.Popen，自动添加 errors='replace'。

2. gitpython str/bytes endswith TypeError (Python 3.13+)
   gitpython 的 Git.execute() 中使用 stdout_value.endswith(newline)，
   但 stdout_value 可能是 str 而 newline 是 bytes（或反之），导致：
     TypeError: endswith first arg must be str or a tuple of str, not bytes
   修复：在 Python 启动时直接 import git.cmd 并 patch Git.execute。
   此修复在 gitpython 升级后仍然生效，无需重新 patch 源码。
"""

import subprocess
import sys

# ========== 修复 1: subprocess UnicodeDecodeError ==========
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


# ========== 修复 2: gitpython str/bytes endswith TypeError ==========
# 直接在启动时 import git.cmd 并 patch，确保在任何代码调用
# Git.execute() 之前 patch 已生效。
try:
    import git.cmd as _git_cmd
except (ImportError, TypeError):
    pass
else:
    if not getattr(_git_cmd, '_endswith_compat_patched', False):
        def _safe_endswith(value, suffix):
            """Type-safe endswith that handles str/bytes mismatch."""
            if isinstance(value, bytes) and isinstance(suffix, bytes):
                return value.endswith(suffix)
            if isinstance(value, str) and isinstance(suffix, str):
                return value.endswith(suffix)
            return False

        _orig_execute = _git_cmd.Git.execute

        def _patched_execute(self, *args, **kwargs):
            try:
                return _orig_execute(self, *args, **kwargs)
            except TypeError as e:
                if "endswith" not in str(e):
                    raise
                # endswith TypeError: stdout_value 和 newline 类型不匹配
                # 跳过有问题的 newline 剥离逻辑，手动安全处理
                kwargs2 = dict(kwargs)
                kwargs2['strip_newline_in_stdout'] = False
                result = _orig_execute(self, *args, **kwargs2)
                # 手动剥离尾部换行
                if isinstance(result, (str, bytes)):
                    nl = b"\n" if isinstance(result, bytes) else "\n"
                    if _safe_endswith(result, nl):
                        result = result[:-1]
                return result

        _git_cmd.Git.execute = _patched_execute
        _git_cmd._endswith_compat_patched = True
