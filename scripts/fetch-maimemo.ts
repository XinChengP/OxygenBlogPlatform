/**
 * 墨墨背单词数据同步脚本
 *
 * 用法（在项目根目录）：
 *   npm run maimemo                     # 拉取数据写入 src/data/maimemo-stats.json
 *   npm run maimemo -- --push           # 同步后自动 git 提交并推送
 *   npm run maimemo -- --set-token      # 交互式录入 Token（Windows DPAPI 加密保存，不落明文）
 *
 * Token 来源优先级：
 *   1. 环境变量 MAIMEMO_API_TOKEN（GitHub Actions 用 Secrets 注入）
 *   2. .maimemo-token.enc（--set-token 生成的 DPAPI 加密文件，仅当前 Windows 用户可解密）
 *   3. .env 文件中的 MAIMEMO_API_TOKEN（明文兜底，兼容旧配置）
 *
 * Token 在墨墨 App：我的 → 更多设置 → 实验功能 → 开放 API
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { syncMaimemoStats, resolveMaimemoToken } from '../src/utils/maimemoSync';

const TOKEN_FILE = () => path.join(process.cwd(), '.maimemo-token.enc');

/** 极简 .env 加载器（Next dev 会自动加载，但独立脚本需要自己读） */
function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

/**
 * 交互式录入 Token 并以 DPAPI 加密保存
 *
 * 通过 PowerShell Read-Host -AsSecureString 录入（输入不回显），
 * ConvertFrom-SecureString 用 Windows 当前用户的 DPAPI 密钥加密成密文落盘。
 */
async function setTokenInteractively(): Promise<number> {
  if (process.platform !== 'win32') {
    console.error('❌ --set-token 仅支持 Windows；其他平台请用环境变量 MAIMEMO_API_TOKEN 传入');
    return 1;
  }

  const quotedPath = `'${TOKEN_FILE().replace(/'/g, "''")}'`;
  const command =
    `$p = '请粘贴墨墨Token后回车（输入不回显）'; ` +
    `$s = Read-Host -Prompt $p -AsSecureString; ` +
    `if ($s.Length -eq 0) { Write-Host '未输入内容'; exit 1 }; ` +
    `ConvertFrom-SecureString -SecureString $s | Set-Content -Path ${quotedPath} -Encoding UTF8; ` +
    `Write-Output 'SAVED'`;

  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error('❌ Token 保存失败');
    return result.status ?? 1;
  }

  // 解密回读校验（明文只进内存，不打印）
  const { token, source } = await resolveMaimemoToken();
  if (source === 'dpapi' && token) {
    console.log(`✅ Token 已加密保存到 .maimemo-token.enc（DPAPI，仅当前 Windows 用户可解密）`);
    return 0;
  }
  console.error('❌ 保存后校验失败，请重试');
  return 1;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    console.log(`
📚 墨墨背单词数据同步

用法：
  npm run maimemo                     同步数据到 src/data/maimemo-stats.json
  npm run maimemo -- --push           同步后自动 git 提交并推送
  npm run maimemo -- --set-token      交互式录入 Token（DPAPI 加密保存，不落明文）

Token 来源优先级：环境变量 MAIMEMO_API_TOKEN > .maimemo-token.enc（加密文件）> .env
`);
    process.exit(0);
  }

  if (args.includes('--set-token')) {
    process.exit(await setTokenInteractively());
  }

  const shouldPush = args.includes('--push');

  loadEnvFile();

  console.log('📚 正在从墨墨背单词开放 API 同步数据...');
  const result = await syncMaimemoStats();

  if (!result.success) {
    console.error(`❌ ${result.message}`);
    process.exit(1);
  }

  console.log(`✅ ${result.message}`);
  console.log('   文件：src/data/maimemo-stats.json');

  if (shouldPush) {
    const { simpleGit } = await import('simple-git');
    try {
      const git = simpleGit();
      const statsFile = path.join('src', 'data', 'maimemo-stats.json');
      await git.add(statsFile);
      await git.commit(`maimemo: 同步背单词数据 ${new Date().toLocaleDateString('zh-CN')}`);
      await git.push();
      console.log('🚀 已提交并推送，等 CI 构建完成后网页就会更新');
    } catch (error) {
      console.error('⚠️ 自动推送失败，请手动执行 git push：', error instanceof Error ? error.message : error);
    }
  } else {
    console.log('💡 提醒：前台页面要等这个文件提交推送并重新构建后才会更新，可加 --push 自动推送。');
  }
}

main().catch(error => {
  console.error('❌ 同步失败：', error instanceof Error ? error.message : error);
  process.exit(1);
});
