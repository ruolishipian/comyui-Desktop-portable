'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RH_EXE = path.resolve(__dirname, 'rh', 'ResourceHacker.exe');

exports.default = async function embedIcon(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exePath = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.exe');
  const iconPath = path.resolve('assets', 'icon.ico');

  if (!fs.existsSync(exePath)) {
    console.warn('[embed-icon] EXE not found: ' + exePath);
    return;
  }
  if (!fs.existsSync(iconPath)) {
    console.warn('[embed-icon] icon.ico not found: ' + iconPath);
    return;
  }
  if (!fs.existsSync(RH_EXE)) {
    console.warn('[embed-icon] ResourceHacker.exe not found: ' + RH_EXE);
    return;
  }

  console.log('[embed-icon] Embedding icon with Resource Hacker...');

  const rhResult = spawnSync(RH_EXE, [
    '-open', exePath,
    '-save', exePath,
    '-resource', iconPath,
    '-mask', 'ICONGROUP,MAINICON,0',
    '-action', 'addoverwrite',
    '-log', 'NUL',
  ], { stdio: 'pipe' });

  if (rhResult.status !== 0) {
    console.error('[embed-icon] Resource Hacker failed with exit code: ' + rhResult.status);
    console.error('[embed-icon] stderr: ' + (rhResult.stderr || '').toString());
    return;
  }

  console.log('[embed-icon] Icon embedded successfully');

  const appInfo = context.packager.appInfo;
  const rcedit = require('rcedit');
  try {
    await rcedit(exePath, {
      'file-version': appInfo.version,
      'product-version': appInfo.version,
      'version-string': {
        CompanyName: appInfo.companyName || '',
        FileDescription: appInfo.productName,
        LegalCopyright: appInfo.copyright || '',
        ProductName: appInfo.productName,
        OriginalFilename: path.basename(exePath),
      },
    });
    console.log('[embed-icon] Version info embedded successfully');
  } catch (err) {
    console.warn('[embed-icon] Version info embedding failed: ' + err.message);
  }
};
