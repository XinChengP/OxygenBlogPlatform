'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: string;
  strict: string;
  reactionsEnabled: string;
  emitMetadata: string;
  inputPosition: string;
  theme: string;
  lang: string;
}

export default function GiscusTest() {
  const { resolvedTheme } = useTheme();
  const [config, setConfig] = useState<GiscusConfig>({
    repo: '[在此输入仓库]',
    repoId: '[在此输入仓库 ID]',
    category: '[在此输入分类名]',
    categoryId: '[在此输入分类 ID]',
    mapping: 'pathname',
    strict: '0',
    reactionsEnabled: '1',
    emitMetadata: '0',
    inputPosition: 'bottom',
    theme: resolvedTheme === 'dark' ? 'dark_dimmed' : 'light',
    lang: 'zh-CN'
  });
  
  const [giscusScript, setGiscusScript] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  useEffect(() => {
    // 生成Giscus脚本
    const script = `<script src="https://giscus.app/client.js"
        data-repo="${config.repo}"
        data-repo-id="${config.repoId}"
        data-category="${config.category}"
        data-category-id="${config.categoryId}"
        data-mapping="${config.mapping}"
        data-strict="${config.strict}"
        data-reactions-enabled="${config.reactionsEnabled}"
        data-emit-metadata="${config.emitMetadata}"
        data-input-position="${config.inputPosition}"
        data-theme="${config.theme}"
        data-lang="${config.lang}"
        crossorigin="anonymous"
        async>
</script>`;
    setGiscusScript(script);
  }, [config]);

  const handleConfigChange = (key: keyof GiscusConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setConfig({
      repo: '[在此输入仓库]',
      repoId: '[在此输入仓库 ID]',
      category: '[在此输入分类名]',
      categoryId: '[在此输入分类 ID]',
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom',
      theme: resolvedTheme === 'dark' ? 'dark_dimmed' : 'light',
      lang: 'zh-CN'
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Giscus 评论系统配置</h1>
      
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">配置参数</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">仓库</label>
            <input
              type="text"
              value={config.repo}
              onChange={(e) => handleConfigChange('repo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">仓库 ID</label>
            <input
              type="text"
              value={config.repoId}
              onChange={(e) => handleConfigChange('repoId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">分类名</label>
            <input
              type="text"
              value={config.category}
              onChange={(e) => handleConfigChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">分类 ID</label>
            <input
              type="text"
              value={config.categoryId}
              onChange={(e) => handleConfigChange('categoryId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">映射方式</label>
            <select
              value={config.mapping}
              onChange={(e) => handleConfigChange('mapping', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="pathname">路径名</option>
              <option value="url">完整 URL</option>
              <option value="title">页面标题</option>
              <option value="og:title">OG 标题</option>
              <option value="specific">特定术语</option>
              <option value="number">讨论编号</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">严格模式</label>
            <select
              value={config.strict}
              onChange={(e) => handleConfigChange('strict', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="0">关闭</option>
              <option value="1">开启</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">启用反应</label>
            <select
              value={config.reactionsEnabled}
              onChange={(e) => handleConfigChange('reactionsEnabled', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="0">关闭</option>
              <option value="1">开启</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">发送元数据</label>
            <select
              value={config.emitMetadata}
              onChange={(e) => handleConfigChange('emitMetadata', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="0">关闭</option>
              <option value="1">开启</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">输入框位置</label>
            <select
              value={config.inputPosition}
              onChange={(e) => handleConfigChange('inputPosition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="top">顶部</option>
              <option value="bottom">底部</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">主题</label>
            <select
              value={config.theme}
              onChange={(e) => handleConfigChange('theme', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="dark_dimmed">深色暗淡</option>
              <option value="dark_high_contrast">深色高对比</option>
              <option value="dark_tritanopia">深色色盲友好</option>
              <option value="light_high_contrast">浅色高对比</option>
              <option value="light_tritanopia">浅色色盲友好</option>
              <option value="preferred_color_scheme">跟随系统</option>
              <option value="transparent_dark">透明深色</option>
              <option value="noborder_light">无边框浅色</option>
              <option value="noborder_dark">无边框深色</option>
              <option value="cobalt">钴蓝</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">语言</label>
            <select
              value={config.lang}
              onChange={(e) => handleConfigChange('lang', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            >
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            重置为默认值
          </button>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {previewMode ? '隐藏预览' : '显示预览'}
          </button>
        </div>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">生成的脚本</h2>
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto text-sm">
          <code>{giscusScript}</code>
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(giscusScript)}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          复制脚本
        </button>
      </div>
      
      {previewMode && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">评论预览</h2>
          <div className="giscus-container">
            <div id="giscus-preview" className="w-full" />
          </div>
        </div>
      )}
      
      {previewMode && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 移除现有的giscus脚本
                const existingScript = document.querySelector('script[src*="giscus"]');
                if (existingScript) {
                  existingScript.remove();
                }
                
                // 清空容器
                const container = document.getElementById('giscus-preview');
                if (container) {
                  container.innerHTML = '';
                  
                  // 创建新的giscus脚本
                  const script = document.createElement('script');
                  script.src = 'https://giscus.app/client.js';
                  script.setAttribute('data-repo', '${config.repo}');
                  script.setAttribute('data-repo-id', '${config.repoId}');
                  script.setAttribute('data-category', '${config.category}');
                  script.setAttribute('data-category-id', '${config.categoryId}');
                  script.setAttribute('data-mapping', '${config.mapping}');
                  script.setAttribute('data-strict', '${config.strict}');
                  script.setAttribute('data-reactions-enabled', '${config.reactionsEnabled}');
                  script.setAttribute('data-emit-metadata', '${config.emitMetadata}');
                  script.setAttribute('data-input-position', '${config.inputPosition}');
                  script.setAttribute('data-theme', '${config.theme}');
                  script.setAttribute('data-lang', '${config.lang}');
                  script.setAttribute('crossorigin', 'anonymous');
                  script.setAttribute('async', 'true');
                  
                  container.appendChild(script);
                }
              })();
            `
          }}
        />
      )}
    </div>
  );
}