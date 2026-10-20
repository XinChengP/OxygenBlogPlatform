/**
 * 静态导出构建包装脚本
 *
 * 背景：
 * 原先 package.json 用 `prepare && next build && restore` 串联三个步骤。
 * `&&` 在构建失败时会短路，restore 永远不执行，导致 src/actions/*.ts
 * 被留在「空实现」状态，下一次本地开发的后台管理会拿到空数据。
 *
 * 本脚本用 try/finally 保证：
 * 1. prepare 执行后，无论 next build 成功还是失败，都一定执行 restore；
 * 2. 保留 next build 的退出码，构建失败仍会让 CI 正确判红；
 * 3. restore 自身失败时额外返回非零码，避免静默留下脏文件。
 */

const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const prepareScript = path.join(__dirname, 'prepare-static-export.js');
const responsiveImagesScript = path.join(__dirname, 'generate-responsive-images.js');

/**
 * 生成博客正文图片的响应式 WebP 变体。
 *
 * 必须在 next build 之前执行：BlogArticleImage 会在构建期导入
 * src/data/blogImageManifest.json，清单与变体文件需要先就位。
 * @returns {number} 退出码
 */
function runResponsiveImages() {
  const result = spawnSync(process.execPath, [responsiveImagesScript], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  return result.status === null ? 1 : result.status;
}

/**
 * 执行 prepare-static-export.js 的指定子命令
 * @param {'prepare'|'restore'} command 子命令
 * @returns {number} 退出码
 */
function runPrepareScript(command) {
  const result = spawnSync(process.execPath, [prepareScript, command], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  return result.status === null ? 1 : result.status;
}

/**
 * 定位 Next.js 的 CLI 入口
 * 通过 next/package.json 反推目录，避免依赖 node_modules/.bin 的
 * Windows 批处理包装（spawnSync 直接执行 .cmd 在不同 Node 版本上行为不一致）。
 * @returns {string} next 可执行文件绝对路径
 */
function resolveNextBin() {
  const nextPkgPath = require.resolve('next/package.json', { paths: [projectRoot] });
  return path.join(path.dirname(nextPkgPath), 'dist', 'bin', 'next');
}

function main() {
  // 步骤 0：生成博客正文图片的响应式变体与尺寸清单
  const responsiveStatus = runResponsiveImages();
  if (responsiveStatus !== 0) {
    console.error('响应式图片生成失败，构建已终止。');
    process.exit(responsiveStatus);
  }

  // 步骤 1：替换 actions 为静态导出空实现
  const prepareStatus = runPrepareScript('prepare');
  if (prepareStatus !== 0) {
    // prepare 中途失败时也尝试恢复，避免只替换了一部分文件
    runPrepareScript('restore');
    console.error('静态导出准备失败，构建已终止。');
    process.exit(prepareStatus);
  }

  let buildStatus = 1;

  try {
    // 步骤 2：执行生产构建（webpack，避免 Turbopack 生产构建偶发缺 chunk）
    const build = spawnSync(process.execPath, [resolveNextBin(), 'build', '--webpack'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: process.env,
    });
    buildStatus = build.status === null ? 1 : build.status;
  } finally {
    // 步骤 3：无条件恢复原始 actions 文件
    const restoreStatus = runPrepareScript('restore');
    if (restoreStatus !== 0) {
      console.error('原始 actions 文件恢复失败，请检查 .bak 文件是否残留。');
      // 构建成功但恢复失败时，也必须以非零码退出，防止脏文件被提交
      if (buildStatus === 0) {
        buildStatus = restoreStatus;
      }
    }
  }

  process.exit(buildStatus);
}

main();
