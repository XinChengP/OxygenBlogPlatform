import { dirname } from "path";
import { fileURLToPath } from "url";
import typescriptParser from "@typescript-eslint/parser";

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
      // 允许使用 img 标签（禁用 Next.js 的 img 元素警告）
      "@next/next/no-img-element": "off",
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
      "node_modules/**",
      "scripts/**",
      "*.config.*",
    ],
  },
];

export default eslintConfig;
