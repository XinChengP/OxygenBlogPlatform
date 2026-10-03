'use client';

import { PrismLight } from 'react-syntax-highlighter';

// prettier-ignore
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
// prettier-ignore
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
// prettier-ignore
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
// prettier-ignore
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
// prettier-ignore
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
// prettier-ignore
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
// prettier-ignore
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
// prettier-ignore
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
// prettier-ignore
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
// prettier-ignore
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
// prettier-ignore
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
// prettier-ignore
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp';
// prettier-ignore
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
// prettier-ignore
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
// prettier-ignore
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml';
// prettier-ignore
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
// prettier-ignore
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go';
// prettier-ignore
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust';
// prettier-ignore
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php';
// prettier-ignore
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff';
// prettier-ignore
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker';

/**
 * 按需注册的 Prism 高亮器
 *
 * 全量 Prism 入口会把 300 种语言定义全部打进引用方的 chunk（gzip 60KB+），
 * 而博客正文与编辑器实际用到的语言非常有限。
 * 这里只注册常用语言（含博客文章中已出现的 bash/html/cmd 场景所需的 bash 与 markup），
 * 使代码块高亮能力保留、bundle 体积大幅下降。
 *
 * 新增支持的语言：从 react-syntax-highlighter/dist/esm/languages/prism/
 * 引入对应模块后，仿照下方再加一行 registerLanguage 即可。
 * 未注册的语言不会报错，按纯文本渲染。
 *
 * 注册名需与 normalizeLanguage（BlogMarkdownBase.tsx）的归一化结果对齐：
 * sh/shell/zsh → bash、py → python、cxx/c++ → cpp、yml → yaml。
 */
const LANGUAGES: Array<[string, unknown]> = [
  ['javascript', javascript],
  ['jsx', jsx],
  ['typescript', typescript],
  ['tsx', tsx],
  ['html', markup],
  ['xml', markup],
  ['css', css],
  ['json', json],
  ['bash', bash],
  ['python', python],
  ['c', c],
  ['cpp', cpp],
  ['csharp', csharp],
  ['java', java],
  ['sql', sql],
  ['yaml', yaml],
  ['markdown', markdown],
  ['go', go],
  ['rust', rust],
  ['php', php],
  ['diff', diff],
  ['dockerfile', docker],
];

for (const [name, grammar] of LANGUAGES) {
  PrismLight.registerLanguage(name, grammar as Parameters<typeof PrismLight.registerLanguage>[1]);
}

export default PrismLight;
