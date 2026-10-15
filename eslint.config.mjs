import { dirname } from "path";
import { fileURLToPath } from "url";
import typescriptParser from "@typescript-eslint/parser";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin,
    },
    rules: {
      // 禁止隐式 any，但允许显式 any
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // 关闭强制 const 规则
      "prefer-const": "off",
      // 关闭未使用变量警告（暂时保持宽松）
      "@typescript-eslint/no-unused-vars": "off",
      // 关闭 require 警告
      "@typescript-eslint/no-require-imports": "off",
      // 关闭 prefer-spread 警告
      "prefer-spread": "off",
    },
  },
  {
    // 忽略文件配置
    ignores: [
      "out/**",
      ".next/**",
      "build/**",
      "build_*/**",
      "node_modules/**",
      "scripts/**",
      "public/**",
      "electron/**",
      "admin-backup/**",
      // Twikoo 评论后端的部署副本：属于独立的 Cloudflare Workers 项目，
      // 有自己的 package.json 与依赖，其 .js 文件不在本仓库的 tsconfig 范围内，
      // 用本仓库的 TypeScript 解析器去 lint 会直接报「不在项目内」的错误。
      "cloudflare/**",
      "*.config.*",
      "**/*.test.ts",
      "src/setting/**",
    ],
  },
];

export default eslintConfig;
