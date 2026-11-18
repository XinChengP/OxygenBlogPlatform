import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * ESLint 配置（Flat Config）
 *
 * 规则来源：
 * - eslint-config-next/core-web-vitals：Next.js 基础规则 + 核心 Web Vitals
 * - eslint-config-next/typescript：typescript-eslint recommended
 *
 * 说明：
 * - 旧配置只注册了 parser/plugin，没有任何规则生效；这里改为直接展开官方配置。
 * - `any`、未使用变量等规则按项目现状降级为 warn，避免一次性阻断 CI；
 *   新代码仍会在输出中看到提示。
 * - 纯脚本、构建产物、Cloudflare Worker 和 Electron 使用各自的运行时/依赖，
 *   不在本仓库前端 lint 范围内（后续可拆分为独立 lint 配置）。
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 项目现有代码大量使用显式 any，先保留为警告，后续逐步收敛
      '@typescript-eslint/no-explicit-any': 'warn',
      // 部分工具函数为了按需加载 JSON/可选模块使用 require，保留现有写法
      '@typescript-eslint/no-require-imports': 'off',
      // 播放器回调历史遗留 Function 类型，先提示、不阻断
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-this-alias': 'warn',
      // 未使用变量改为警告，允许以 _ 开头的占位参数
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // React 19 不再需要显式引入 React；Next 已处理 JSX 运行时
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // 中文文案中经常出现英文引号/撇号，不做 HTML 实体强制
      'react/no-unescaped-entities': 'off',
      // 项目使用 TypeScript，运行时 props 校验由类型系统承担
      'react/prop-types': 'off',
      // 静态导出场景下大量使用原生 img，保留提示但暂不阻断
      '@next/next/no-img-element': 'warn',
      // 外链/静态页中存在 <a> 替代 Link 的场景，保留提示
      '@next/next/no-html-link-for-pages': 'warn',
      // React Hooks 规则：真正的规则错误保留 error
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-render': 'error',
      /*
        以下规则来自 React Compiler 的迁移诊断（v7 新增），
        当前项目尚未接入 React Compiler，开启后会对大量合法的
        数据加载型 useEffect 产生噪音，先关闭；接入 compiler 时再逐项开启。
      */
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
      // 开发期保留 console；静态导出构建由 next.config.ts 的 removeConsole 处理
      'no-console': 'off',
    },
  },
  globalIgnores([
    // 构建产物与依赖
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'build_*/**',
    '.venv/**',
    // 本地备份/迁移/截图
    'admin-backup/**',
    '.backup/**',
    '.build-backup/**',
    '.migration-tmp/**',
    '.screenshots/**',
    '.trae/**',
    // 非前端运行时
    'scripts/**',
    'electron/**',
    'cloudflare/**',
    'public/**',
    // 配置文件本身不参与业务 lint
    '*.config.*',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
