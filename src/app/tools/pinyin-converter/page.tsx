'use client';

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import BackgroundLayer from '@/components/BackgroundLayer';
import { useTheme } from 'next-themes';
import { getAssetPath } from '@/utils/assetUtils';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

// 动态导入ScrollToTop组件
const LazyScrollToTop = lazy(() => import('@/components/ScrollToTop'));

interface DetailedResult {
  origin: string;
  pinyin: string[];
  isHeteronym: boolean;
}

interface PinyinOptions {
  toneStyle: 'mark' | 'number' | 'none';
  heteronym: boolean;
  separator: string;
  lowercase: boolean;
  nonChinese: 'keep' | 'remove' | 'replace';
  replaceChar: string;
  outputFormat: 'full' | 'initials' | 'both';
}

// 拼音转换器组件
export default function PinyinConverter() {
  const { resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('tools');
  const [mounted, setMounted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [detailedResults, setDetailedResults] = useState<DetailedResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pinyinData, setPinyinData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState('');
  const [heteronymSelections, setHeteronymSelections] = useState<Record<string, number>>({});
  const [options, setOptions] = useState<PinyinOptions>({
    toneStyle: 'none',
    heteronym: false,
    separator: ' ',
    lowercase: true,
    nonChinese: 'remove',
    replaceChar: '',
    outputFormat: 'full'
  });
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showOnlyHeteronyms, setShowOnlyHeteronyms] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 加载拼音数据
  useEffect(() => {
    const loadPinyinData = async () => {
      try {
        const response = await fetch(getAssetPath('/tools/pinyin-data/pinyin.txt'));
        const text = await response.text();
        
        // 解析拼音数据
        const data = new Map();
        text.split(/\r?\n/).forEach(line => {
          // 跳过注释行
          if (line.startsWith('#') || !line.trim()) return;
          
          // 处理 Unicode 编码格式: U+3007: líng,yuán,xīng
          const unicodeMatch = line.match(/U\+([0-9A-Fa-f]+):\s*([^#]+)/);
          if (unicodeMatch) {
            const unicodeCode = unicodeMatch[1];
            const pinyinPart = unicodeMatch[2].trim();
            
            // 将 Unicode 编码转换为字符
            const char = String.fromCodePoint(parseInt(unicodeCode, 16));
            const pinyins = pinyinPart.split(',').map(p => p.trim());
            
            data.set(char, pinyins);
          } else {
            // 处理简单格式: 字符:拼音
            const [char, pinyin] = line.split(':');
            if (char && pinyin) {
              data.set(char, pinyin.split(',').map(p => p.trim()));
            }
          }
        });
        
        setPinyinData(data);
        setIsLoading(false);
        console.log('拼音数据加载成功，字符数量:', data.size);
      } catch (error) {
        console.error('加载拼音数据失败:', error);
        setIsLoading(false);
      }
    };

    loadPinyinData();
  }, []);

  // 符号声调转数字声调 - 数字放在拼音后面
  const convertToneMarkToNumber = useCallback((pinyin: string): string => {
    const reverseToneMap: { [key: string]: string } = {
      'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
      'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
      'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
      'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
      'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
      'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4'
    };

    let result = pinyin;
    let toneNumber = '';
    
    // 查找带声调的元音并提取声调数字
    for (const [mark, number] of Object.entries(reverseToneMap)) {
      if (result.includes(mark)) {
        result = result.replace(mark, number[0]); // 替换为普通字母
        toneNumber = number[1]; // 提取声调数字
        break;
      }
    }

    // 将数字添加到拼音末尾
    return toneNumber ? result + toneNumber : result;
  }, []);

  // 获取拼音首字母
  const getPinyinInitials = useCallback((pinyin: string): string => {
    // 移除声调符号和数字
    const cleanPinyin = pinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (match) => {
      const toneMap = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü' };
      return toneMap[match] || match;
    }).replace(/\d$/, ''); // 移除末尾的数字声调

    // 获取首字母
    return cleanPinyin.charAt(0).toUpperCase();
  }, []);

  // 转换拼音
  const convertToPinyin = useCallback((text: string, options: PinyinOptions) => {
    if (!pinyinData || !text) return { text: '', detailed: [] };

    const detailedResults: DetailedResult[] = [];
    const result: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // 处理非中文字符
      if (!/[\u4e00-\u9fa5]/.test(char)) {
        switch (options.nonChinese) {
          case 'keep':
            result.push(char);
            break;
          case 'remove':
            break;
          case 'replace':
            const replaceChar = options.replaceChar || '';
            result.push(replaceChar);
            break;
        }
        continue;
      }

      // 查找拼音
      const pinyins = pinyinData.get(char);
      if (!pinyins || pinyins.length === 0) {
        result.push(char);
        continue;
      }

      // 处理多音字 - 使用用户选择或默认第一个
      let selectedPinyin = pinyins[0];
      const selectionKey = `${char}_${i}`;
      const userSelection = heteronymSelections[selectionKey];
      
      if (userSelection !== undefined && userSelection < pinyins.length) {
        // 用户有选择，使用用户选择的读音
        selectedPinyin = pinyins[userSelection];
      } else {
        // 用户没有选择，使用默认第一个读音
        selectedPinyin = pinyins[0];
      }

      // 处理声调
      let processedPinyin = selectedPinyin;
      if (options.toneStyle === 'none') {
        // 移除所有声调
        processedPinyin = selectedPinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (match) => {
          const toneMap = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü' };
          return toneMap[match] || match;
        });
      } else if (options.toneStyle === 'number') {
        // 转换为数字声调
        processedPinyin = convertToneMarkToNumber(selectedPinyin);
      }

      // 处理大小写
      if (options.lowercase) {
        processedPinyin = processedPinyin.toLowerCase();
      }

      // 处理输出格式
      let finalOutput = processedPinyin;
      if (options.outputFormat === 'initials') {
        finalOutput = getPinyinInitials(processedPinyin);
      } else if (options.outputFormat === 'both') {
        const initials = getPinyinInitials(processedPinyin);
        finalOutput = `${processedPinyin}(${initials})`;
      }

      // 添加到结果
      if (options.outputFormat !== 'both') {
        result.push(finalOutput);
      } else {
        result.push(finalOutput);
      }

      // 添加到详细结果
      detailedResults.push({
        origin: char,
        pinyin: pinyins,
        isHeteronym: pinyins.length > 1
      });
    }

    // 添加分隔符
    let finalText = '';
    if (options.outputFormat === 'both') {
      finalText = result.join('');
    } else {
      finalText = result.join(options.separator);
    }

    return { text: finalText, detailed: detailedResults };
  }, [pinyinData, heteronymSelections, convertToneMarkToNumber, getPinyinInitials]);

  // 处理输入变化
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
  }, []);

  // 处理选项变化
  const handleOptionChange = useCallback((key: keyof PinyinOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // 处理多音字选择
  const handleHeteronymSelect = useCallback((charKey: string, pinyinIndex: number) => {
    setHeteronymSelections(prev => ({
      ...prev,
      [charKey]: pinyinIndex
    }));
  }, []);

  // 清空输入
  const clearInput = useCallback(() => {
    setInputText('');
    setOutputText('');
    setDetailedResults([]);
    setHeteronymSelections({});
  }, []);

  // 复制结果
  const copyResult = useCallback(async () => {
    const textToCopy = isEditing ? editedOutput : outputText;
    console.log(`[PinyinConverter] 开始复制，内容长度: ${textToCopy.length}`);
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      console.log(`[PinyinConverter] 复制成功`);
      
      // Live2D联动：发送复制成功事件，使用个性化消息
      try {
        console.log(`[PinyinConverter] 开始加载Live2D事件发射器`);
        const { emitLive2DEvent } = await import('@/utils/live2dEventEmitter');
        console.log(`[PinyinConverter] Live2D事件发射器加载成功`);
        
        // 根据复制内容长度和内容类型选择不同的消息
        let message = '拼音转换结果已复制到剪贴板！';
        
        if (textToCopy.length > 50) {
          // 长内容复制
          const longMessages = [
            '复制了这么多拼音，是要做笔记吗？',
            '天依看到你复制了好多内容呢～',
            '这么多拼音，记得好好保存哦！',
            '复制成功！这些拼音看起来很重要呢～'
          ];
          message = longMessages[Math.floor(Math.random() * longMessages.length)];
        } else if (textToCopy.length > 10) {
          // 中等长度内容
          const mediumMessages = [
            '拼音复制成功啦！',
            '天依帮你复制好了～',
            '复制完成！记得检查哦～',
            '拼音已复制，可以粘贴使用啦！'
          ];
          message = mediumMessages[Math.floor(Math.random() * mediumMessages.length)];
        } else if (textToCopy.length > 0) {
          // 短内容
          const shortMessages = [
            '复制成功！',
            '搞定啦～',
            '已复制！',
            '完成！'
          ];
          message = shortMessages[Math.floor(Math.random() * shortMessages.length)];
        }
        
        console.log(`[PinyinConverter] 准备发送Live2D事件，消息: ${message}`);
        emitLive2DEvent('custom-message', {
          message,
          type: 'copy-success',
          feature: 'pinyin-converter',
          copiedText: textToCopy.substring(0, 50) // 只发送前50个字符，避免太长
        });
        console.log(`[PinyinConverter] Live2D事件发送成功`);
      } catch (live2dError) {
        console.error('[PinyinConverter] Live2D联动失败:', live2dError);
      }
      
    } catch (error) {
      console.error('[PinyinConverter] 复制失败:', error);
      
      // Live2D联动：发送复制失败事件，使用个性化消息
      try {
        console.log(`[PinyinConverter] 复制失败，尝试发送错误事件`);
        const { emitLive2DEvent } = await import('@/utils/live2dEventEmitter');
        
        const errorMessages = [
          '复制失败了，请重试哦～',
          '天依没能帮你复制成功，再试一次吧～',
          '出错了，检查一下再试试？',
          '复制遇到问题了呢，重新试试～'
        ];
        const message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        
        emitLive2DEvent('custom-message', {
          message,
          type: 'copy-error',
          feature: 'pinyin-converter'
        });
        console.log(`[PinyinConverter] 错误事件发送成功`);
      } catch (live2dError) {
        console.error('[PinyinConverter] Live2D错误事件发送失败:', live2dError);
      }
    }
  }, [isEditing, editedOutput, outputText]);

  // 切换编辑模式
  const toggleEditMode = useCallback(() => {
    if (isEditing) {
      // 退出编辑模式，保存编辑的内容
      setOutputText(editedOutput);
    } else {
      // 进入编辑模式
      setEditedOutput(outputText);
    }
    setIsEditing(!isEditing);
  }, [isEditing, editedOutput, outputText]);

  // 初始转换 - 这个 useEffect 必须在所有其他 Hooks 之后调用
  useEffect(() => {
    if (inputText && pinyinData) {
      const { text, detailed } = convertToPinyin(inputText, options);
      setOutputText(text);
      setDetailedResults(detailed);
    }
  }, [inputText, pinyinData, convertToPinyin, options]);

  // 如果组件未挂载，返回 null - 这必须在所有 Hooks 之后
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`min-h-screen ${containerStyle} relative`}>
      <BackgroundLayer />
      
      {/* 加载状态容器 */}
      {isLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff] mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">正在加载拼音数据...</p>
          </div>
        </div>
      )}



      {/* 右下角导航按钮 */}
      <div className="fixed bottom-4 right-4 z-50">
        <Suspense fallback={<div>Loading...</div>}>
          <LazyScrollToTop />
        </Suspense>
      </div>

      {/* 主内容区域 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 mt-16">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">拼音转换器</h1>
          <p className="text-lg text-muted-foreground">智能中文转拼音工具，支持多音字识别和多种输出格式</p>
        </motion.div>

        {/* 转换配置选项 */}
        <motion.div 
          className="mb-6 backdrop-blur-md bg-card/90 rounded-lg border border-border/50 p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">转换选项</h2>
          
          <div className="flex flex-wrap items-center gap-6">
            {/* 声调样式 */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground whitespace-nowrap">声调样式</h3>
              <div className="flex gap-1">
                {[
                  { key: 'mark', label: '符号声调' },
                  { key: 'number', label: '数字声调' },
                  { key: 'none', label: '无声调' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('toneStyle', key)}
                    className={`px-2.5 py-1 text-xs rounded transition-all duration-200 ${
                      options.toneStyle === key
                        ? 'bg-[#66ccff] text-white shadow-md'
                        : isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 输出格式 */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground whitespace-nowrap">输出格式</h3>
              <div className="flex gap-1">
                {[
                  { key: 'full', label: '完整拼音' },
                  { key: 'initials', label: '首字母' },
                  { key: 'both', label: '拼音+首字母' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('outputFormat', key)}
                    className={`px-2.5 py-1 text-xs rounded transition-all duration-200 ${
                      options.outputFormat === key
                        ? 'bg-[#66ccff] text-white shadow-md'
                        : isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 分隔符设置 */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground whitespace-nowrap">分隔符</h3>
              <div className="flex gap-1">
                {[
                  { key: 'space', label: '空格', value: ' ' },
                  { key: 'none', label: '无分隔', value: '' },
                  { key: 'custom', label: '自定义', value: 'custom' }
                ].map(({ key, label, value }) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (value === 'custom') {
                        // 点击自定义时，强制进入自定义模式，输入框显示空字符串
                        setIsCustomMode(true);
                        handleOptionChange('separator', '');
                      } else {
                        setIsCustomMode(false);
                        handleOptionChange('separator', value);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs rounded transition-all duration-200 ${
                      (key === 'custom' && isCustomMode) ||
                      (key !== 'custom' && options.separator === value)
                        ? 'bg-[#66ccff] text-white shadow-md'
                        : isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {isCustomMode && (
                <input
                  type="text"
                  value={options.separator}
                  onChange={(e) => handleOptionChange('separator', e.target.value)}
                  placeholder="自定义分隔符"
                  className={`w-20 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-[#66ccff] focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  maxLength={3}
                  autoFocus
                />
              )}
            </div>

            {/* 非中文字符处理 */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground whitespace-nowrap">非中文字符</h3>
              <div className="flex gap-1">
                {[
                  { key: 'keep', label: '保留' },
                  { key: 'remove', label: '移除' },
                  { key: 'replace', label: '替换' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('nonChinese', key)}
                    className={`px-2.5 py-1 text-xs rounded transition-all duration-200 ${
                      options.nonChinese === key
                        ? 'bg-[#66ccff] text-white shadow-md'
                        : isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {options.nonChinese === 'replace' && (
                <input
                  type="text"
                  value={options.replaceChar}
                  onChange={(e) => handleOptionChange('replaceChar', e.target.value.slice(0, 1))}
                  placeholder="替换字符"
                  className={`w-16 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-[#66ccff] focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  maxLength={1}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* 输入区域 */}
        <motion.div 
          className="mb-8 backdrop-blur-md bg-card/90 rounded-lg border border-border/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-semibold text-foreground mb-4">输入文本</h2>
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="请输入要转换的中文文本...例如：华风夏韵，洛水天依"
              className={`w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-[#66ccff] focus:border-transparent transition-all duration-200 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <div className="absolute bottom-4 right-4 flex space-x-2">
              <button
                onClick={clearInput}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                清空
              </button>
            </div>
          </div>
        </motion.div>

        {/* 转换结果区域 */}
        <motion.div 
          className="mb-8 backdrop-blur-md bg-card/90 rounded-lg border border-border/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-foreground">转换结果</h2>
            <div className="flex space-x-2">
              <button
                onClick={toggleEditMode}
                className={`px-4 py-2 rounded-md transition-all duration-200 ${
                  isEditing
                    ? 'bg-[#66ccff] text-white'
                    : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {isEditing ? '保存' : '编辑'}
              </button>
              <button
                onClick={copyResult}
                className="px-4 py-2 bg-[#66ccff] text-white rounded-md hover:bg-[#55bbee] transition-all duration-200"
              >
                复制结果
              </button>
            </div>
          </div>
          
          <div className="relative">
            {isEditing ? (
              <textarea
                value={editedOutput}
                onChange={(e) => setEditedOutput(e.target.value)}
                className={`w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-[#66ccff] focus:border-transparent transition-all duration-200 ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            ) : (
              <div className={`w-full h-32 p-4 border rounded-lg overflow-y-auto ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-600 text-white' 
                  : 'bg-white/50 border-gray-300 text-gray-900'
              }`}>
                <pre className="whitespace-pre-wrap font-mono text-sm">{outputText || '转换结果将在这里显示...'}</pre>
              </div>
            )}
          </div>
        </motion.div>

        {/* 转换详情表格 */}
        {detailedResults.length > 0 && (
          <motion.div 
            className="backdrop-blur-md bg-card/90 rounded-lg border border-border/50 p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold text-foreground">转换详情</h2>
              <button
                onClick={() => setShowOnlyHeteronyms(!showOnlyHeteronyms)}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                  showOnlyHeteronyms
                    ? 'bg-[#66ccff] text-white shadow-md'
                    : isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {showOnlyHeteronyms ? '显示全部' : '只显示多音字'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {detailedResults
                .filter(result => !showOnlyHeteronyms || result.isHeteronym)
                .map((result, index) => {
                  const charKey = `${result.origin}_${index}`;
                  const userSelection = heteronymSelections[charKey];
                  
                  return (
                    <div key={index} className={`p-2 rounded-lg border transition-all duration-200 ${
                      isDark 
                        ? 'bg-gray-800/30 border-gray-600 hover:bg-gray-700/30' 
                        : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/50'
                    }`}>
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground mb-1">{result.origin}</div>
                        {result.isHeteronym ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {result.pinyin.map((pinyin, pinyinIndex) => (
                              <button
                                key={pinyinIndex}
                                onClick={() => handleHeteronymSelect(charKey, pinyinIndex)}
                                className={`px-1.5 py-0.5 text-xs rounded transition-all duration-200 ${
                                  userSelection === pinyinIndex
                                    ? 'bg-[#66ccff] text-white'
                                    : isDark
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {pinyin}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-[#66ccff] font-medium">{result.pinyin[0]}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            {showOnlyHeteronyms && detailedResults.filter(result => result.isHeteronym).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>当前文本中没有发现多音字</p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}