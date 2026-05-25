'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import BackgroundLayer from '@/components/BackgroundLayer';
import { useTheme } from 'next-themes';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { getAssetPath } from '@/utils/assetUtils';
import PageHeader from '@/components/ui/PageHeader';
import { trackToolView } from '@/components/Analytics';



interface DetailedResult {
  origin: string;
  pinyin: string[];
  isHeteronym: boolean;
  isNonChinese?: boolean;
}

interface PinyinOptions {
  toneStyle: 'mark' | 'number' | 'none';
  heteronym: boolean;
  separator: string;
  lowercase: boolean;
  nonChinese: 'keep' | 'remove' | 'replace';
  replaceChar: string;
  outputFormat: 'full' | 'initials' | 'both';
  uFormat: 'ü' | 'v';
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
  const [pinyinConverter, setPinyinConverter] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOutput, setEditedOutput] = useState('');// 多音字选择状态
  const [heteronymSelections, setHeteronymSelections] = useState<Record<string, number>>({});
  
  // 读音选择菜单状态
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    charIndex: number;
    x: number;
    y: number;
    char: string;
    pinyins: string[];
    currentSelection: number;
  }>({ visible: false, charIndex: -1, x: 0, y: 0, char: '', pinyins: [], currentSelection: 0 });

  // 调试状态
  const [options, setOptions] = useState<PinyinOptions>({
    toneStyle: 'none',
    heteronym: false,
    separator: ' ',
    lowercase: true,
    nonChinese: 'remove',
    replaceChar: '',
    outputFormat: 'full',
    uFormat: 'v'
  });
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [showOnlyHeteronyms, setShowOnlyHeteronyms] = useState(false);
  const [hideNonChinese, setHideNonChinese] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 拼音转换器页面浏览统计 - 在组件挂载时上报
  useEffect(() => {
    if (mounted) {
      // 延迟上报，确保 SDK 已加载
      const timer = setTimeout(() => {
        trackToolView('拼音转换器', '文本工具');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // 加载拼音转换器
  useEffect(() => {
    // 防止重复加载
    if ((window as any).__pinyinConverterLoading) {
      return;
    }
    
    const loadPinyinConverter = async () => {
      try {
        // 检查是否已经加载过
        if ((window as any).PinyinConverter) {
          const pinyinLib = (window as any).PinyinConverter;
          if (pinyinLib && pinyinLib.getPinyinConverter) {
            const converter = await pinyinLib.getPinyinConverter();
            setPinyinConverter(converter);
            setIsLoading(false);
            return;
          }
        }
        
        // 标记正在加载
        (window as any).__pinyinConverterLoading = true;
        
        // 使用script标签动态加载库
        const script = document.createElement('script');
        script.src = getAssetPath('/tools/pinyin-converter.js');
        script.type = 'text/javascript';
        script.async = true;
        
        // 调试路径信息
        console.log('拼音转换器脚本路径:', getAssetPath('/tools/pinyin-converter.js'));
        console.log('当前页面路径:', window.location.pathname);
        console.log('基础路径检测:', {
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          basePath: (window as any).__NEXT_DATA__?.runtimeConfig?.basePath,
          repoName: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME
        });
        
        script.onload = async () => {
          try {
            // 等待全局变量可用
            let retryCount = 0;
            const maxRetries = 20;
            
            const checkAndInit = async () => {
              if (retryCount >= maxRetries) {
                throw new Error('PinyinConverter not available after maximum retries');
              }
              
              const pinyinLib = (window as any).PinyinConverter;
              if (pinyinLib && pinyinLib.getPinyinConverter) {
                try {
                  const converter = await pinyinLib.getPinyinConverter();
                  setPinyinConverter(converter);
                  setIsLoading(false);
                  delete (window as any).__pinyinConverterLoading;
                } catch (error) {
                  console.error('获取拼音转换器实例失败:', error);
                  throw error;
                }
              } else {
                retryCount++;
                console.log(`等待PinyinConverter可用，重试 ${retryCount}/${maxRetries}`);
                setTimeout(checkAndInit, 300);
              }
            };
            
            await checkAndInit();
          } catch (error) {
            console.error('初始化拼音转换器失败:', error);
            setIsLoading(false);
            delete (window as any).__pinyinConverterLoading;
          }
        };
        
        script.onerror = () => {
          console.error('加载拼音转换器脚本失败');
          setIsLoading(false);
          delete (window as any).__pinyinConverterLoading;
        };
        
        document.head.appendChild(script);
        
        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (error) {
        console.error('加载拼音转换器失败:', error);
        setIsLoading(false);
        delete (window as any).__pinyinConverterLoading;
      }
    };

    loadPinyinConverter();
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
      const toneMap: Record<string, string> = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü' };
      return toneMap[match] || match;
    }).replace(/\d$/, ''); // 移除末尾的数字声调

    // 获取首字母
    return cleanPinyin.charAt(0).toUpperCase();
  }, []);

  // 转换 ü 为 v（根据用户设置）
  const convertUFormat = useCallback((pinyin: string, uFormat: 'ü' | 'v'): string => {
    if (uFormat === 'ü') {
      return pinyin;
    }
    // 将 ü 替换为 v
    return pinyin.replace(/ü/g, 'v');
  }, []);

  // 转换拼音 - 使用拼音转换器库
  const convertToPinyin = useCallback(async (text: string, options: PinyinOptions) => {
    if (!pinyinConverter || !text) return { text: '', detailed: [] };

    try {
      // 使用拼音转换器库进行转换
      const converterOptions = {
        toneStyle: options.toneStyle,
        outputFormat: options.outputFormat,
        separator: options.separator,
        nonChinese: options.nonChinese,
        replaceChar: options.replaceChar,
        lowercase: options.lowercase,
        heteronym: true // 启用多音字支持
      };
      
      // 获取详细转换结果
      const detailedResults = pinyinConverter.convert(text, converterOptions);
      
      // 为每个结果添加 isNonChinese 字段
      const resultsWithNonChineseFlag = detailedResults.map((result: any) => {
        // 检查是否为非中文字符
        const isNonChinese = !pinyinConverter.isChinese(result.origin);
        return {
          ...result,
          isNonChinese
        };
      });
      
      // 应用用户的多音字选择
          const processedResults = resultsWithNonChineseFlag.map((result: any, index: number) => {
            if (result.isHeteronym && result.pinyin.length > 1) {
              // 检查是否有用户选择的多音字
              const charKey = `${result.origin}_${index}`;
              const userSelection = heteronymSelections[charKey];
              
              if (userSelection !== undefined && userSelection < result.pinyin.length) {
                // 使用用户选择的读音
                const selectedPinyin = result.pinyin[userSelection];
                
                // 根据选项处理选中的拼音
                let processedPinyin = selectedPinyin;
                
                // 处理声调
                if (options.toneStyle === 'none') {
                  processedPinyin = processedPinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (match: string) => {
                    const toneMap: Record<string, string> = { 
                      'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 
                      'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 
                      'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 
                      'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 
                      'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 
                      'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü' 
                    };
                    return toneMap[match] || match;
                  });
                } else if (options.toneStyle === 'number') {
                  processedPinyin = convertToneMarkToNumber(selectedPinyin);
                }
                
                // 处理大小写
                if (options.lowercase) {
                  processedPinyin = processedPinyin.toLowerCase();
                }
                
                // 处理 ü/v 格式
                processedPinyin = convertUFormat(processedPinyin, options.uFormat);
                
                // 处理输出格式
                let finalOutput = processedPinyin;
                if (options.outputFormat === 'initials') {
                  finalOutput = getPinyinInitials(processedPinyin);
                } else if (options.outputFormat === 'both') {
                  const initials = getPinyinInitials(processedPinyin);
                  finalOutput = `${processedPinyin}(${initials})`;
                }
                
                return {
                  ...result,
                  pinyin: result.pinyin, // 保留所有读音，不覆盖原始数组
                  selectedPinyinIndex: userSelection, // 记录选择的索引
                  selectedPinyin: finalOutput // 添加选中的拼音用于输出显示
                };
              }
            }
            
            return result;
          });
      
      // 构建最终的文本输出
      let finalText = '';
      if (options.outputFormat === 'both') {
        finalText = processedResults.map((result: any) => {
          // 如果有选中的拼音，使用选中的；否则使用第一个
          let pinyin = result.selectedPinyin || result.pinyin[0];
          // 处理 ü/v 格式
          pinyin = convertUFormat(pinyin, options.uFormat);
          if (options.outputFormat === 'both' && result.isHeteronym) {
            const initials = getPinyinInitials(pinyin);
            return `${pinyin}(${initials})`;
          }
          return pinyin;
        }).join('');
      } else {
        finalText = processedResults.map((result: any) => {
          // 如果有选中的拼音，使用选中的；否则使用第一个
          let pinyin = result.selectedPinyin || result.pinyin[0];
          // 处理 ü/v 格式
          pinyin = convertUFormat(pinyin, options.uFormat);
          return pinyin;
        }).join(options.separator);
      }
      
      return { text: finalText, detailed: processedResults };
      
    } catch (error) {
      console.error('拼音转换失败:', error);
      return { text: text, detailed: [] };
    }
  }, [heteronymSelections, convertToneMarkToNumber, getPinyinInitials, convertUFormat, pinyinConverter]); // 移除不必要的options依赖

  // 处理输入变化
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
  }, []);

  // 处理选项变化
  const handleOptionChange = useCallback((key: keyof PinyinOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // 处理多音字选择
  const handleHeteronymSelect = useCallback(async (charKey: string, pinyinIndex: number) => {
    setHeteronymSelections(prev => ({
      ...prev,
      [charKey]: pinyinIndex
    }));
    
    // 高亮显示对应的转换结果
    const resultElement = document.querySelector(`[data-char-key="${charKey}"]`);
    
    if (resultElement) {
      // 添加高亮动画效果
      resultElement.classList.add('ring-2', 'ring-[#66ccff]', 'ring-opacity-75');
      resultElement.classList.add('bg-[#66ccff]', 'bg-opacity-10');
      
      // 滚动到对应位置
      resultElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
      
      // 3秒后移除高亮
      setTimeout(() => {
        resultElement.classList.remove('ring-2', 'ring-[#66ccff]', 'ring-opacity-75');
        resultElement.classList.remove('bg-[#66ccff]', 'bg-opacity-10');
      }, 3000);
    }
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
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Live2D联动：发送复制成功事件，使用个性化消息
      try {
        const { emitLive2DEvent } = await import('@/utils/live2dEventEmitter');
        
        let message = '';
        
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
        
        emitLive2DEvent('custom-message', {
          message,
          type: 'copy-success',
          feature: 'pinyin-converter',
          copiedText: textToCopy.substring(0, 50) // 只发送前50个字符，避免太长
        });
      } catch {
        // Live2D联动失败，静默处理
      }
      
    } catch {
      // Live2D联动：发送复制失败事件，使用个性化消息
      try {
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
      } catch {
        // Live2D联动失败，静默处理
      }
    }
  }, [isEditing, editedOutput, outputText]); // 修复依赖数组 - textToCopy是内部变量，不需要在依赖中

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
    if (inputText && pinyinConverter) {
      const performConversion = async () => {
        try {
          const result = await convertToPinyin(inputText, options);
          setOutputText(result.text);
          setDetailedResults(result.detailed);
        } catch (error) {
          console.error('初始转换失败:', error);
        }
      };
      performConversion();
    }
  }, [inputText, pinyinConverter, options, convertToPinyin]); // 添加convertToPinyin依赖

  // 当多音字选择变化时重新转换
  useEffect(() => {
    if (inputText && pinyinConverter) {
      const performConversion = async () => {
        try {
          const result = await convertToPinyin(inputText, options);
          setOutputText(result.text);
          setDetailedResults(result.detailed);
        } catch (error) {
          console.error('多音字选择后转换失败:', error);
        }
      };
      performConversion();
    }
  }, [heteronymSelections, convertToPinyin, inputText, options, pinyinConverter]); // 添加缺失的依赖

  // 高亮显示转换结果中的多音字拼音
  const highlightHeteronymInOutput = useCallback((outputText: string, detailedResults: DetailedResult[]) => {
    if (!outputText || !detailedResults.length) return outputText;

    // 直接重建输出，确保与detailedResults一一对应
    const parts = detailedResults.map((result, index) => {
      let expectedOutput = '';
      
      if (result.isNonChinese) {
        // 非中文字符直接输出处理后的结果
        expectedOutput = result.pinyin[0];
      } else if (result.isHeteronym) {
        // 多音字处理
        const charKey = `${result.origin}_${index}`;
        const userSelection = heteronymSelections[charKey];
        let currentPinyin = result.pinyin[0]; // 默认使用第一个
        
        if (userSelection !== undefined && userSelection < result.pinyin.length) {
          currentPinyin = result.pinyin[userSelection];
        }
        
        // 处理拼音格式（与转换逻辑一致）
        let processedPinyin = currentPinyin;
        if (options.toneStyle === 'none') {
          processedPinyin = currentPinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (match) => {
            const toneMap: Record<string, string> = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü' };
            return toneMap[match] || match;
          });
        } else if (options.toneStyle === 'number') {
          processedPinyin = convertToneMarkToNumber(currentPinyin);
        }
        
        if (options.lowercase) {
          processedPinyin = processedPinyin.toLowerCase();
        }
        
        // 处理 ü/v 格式
        processedPinyin = convertUFormat(processedPinyin, options.uFormat);
        
        // 处理输出格式
        let finalPinyin = processedPinyin;
        if (options.outputFormat === 'initials') {
          finalPinyin = getPinyinInitials(processedPinyin);
        } else if (options.outputFormat === 'both') {
          const initials = getPinyinInitials(processedPinyin);
          finalPinyin = `${processedPinyin}(${initials})`;
        }
        
        expectedOutput = finalPinyin;
      } else {
        // 普通中文字符（非多音字）
        let processedPinyin = result.pinyin[0];
        
        if (options.toneStyle === 'none') {
          processedPinyin = processedPinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (match) => {
            const toneMap: Record<string, string> = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü' };
            return toneMap[match] || match;
          });
        } else if (options.toneStyle === 'number') {
          processedPinyin = convertToneMarkToNumber(processedPinyin);
        }
        
        if (options.lowercase) {
          processedPinyin = processedPinyin.toLowerCase();
        }
        
        // 处理 ü/v 格式
        processedPinyin = convertUFormat(processedPinyin, options.uFormat);
        
        if (options.outputFormat === 'initials') {
          expectedOutput = getPinyinInitials(processedPinyin);
        } else if (options.outputFormat === 'both') {
          const initials = getPinyinInitials(processedPinyin);
          expectedOutput = `${processedPinyin}(${initials})`;
        } else {
          expectedOutput = processedPinyin;
        }
      }
      
      // 如果是多音字，添加高亮
      if (result.isHeteronym) {
        return `<span class="bg-[#66ccff] bg-opacity-30 px-1 rounded font-bold cursor-pointer hover:bg-opacity-50 transition-all duration-200 heteronym-clickable" title="点击切换读音: ${result.origin}" data-char-index="${index}" data-char="${result.origin}" style="cursor: pointer;">${expectedOutput}</span>`;
      }
      
      return expectedOutput;
    });
    
    // 使用相同的分隔符连接
    if (options.outputFormat === 'both') {
      return parts.join('');
    } else {
      return parts.join(options.separator);
    }
  }, [heteronymSelections, options.toneStyle, options.outputFormat, options.lowercase, options.uFormat, convertToneMarkToNumber, getPinyinInitials, convertUFormat, options.separator]);

  // 处理转换结果中的多音字点击
  const handleOutputCharClick = useCallback((char: string, index: number) => {
    // 查找对应的详情卡片 - 使用与UI渲染相同的charKey格式
    const charKey = `${char}_${index}`;
    const detailElement = document.querySelector(`[data-char-key="${charKey}"]`);
    if (detailElement) {
      // 添加高亮效果
      detailElement.classList.add('ring-2', 'ring-[#66ccff]', 'ring-opacity-75');
      detailElement.classList.add('bg-[#66ccff]', 'bg-opacity-10');
      
      // 滚动到对应位置
      detailElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest',
        inline: 'nearest'
      });
      
      // 3秒后移除高亮
      setTimeout(() => {
        detailElement.classList.remove('ring-2', 'ring-[#66ccff]', 'ring-opacity-75');
        detailElement.classList.remove('bg-[#66ccff]', 'bg-opacity-10');
      }, 3000);
    }
  }, []);

  // 处理转换结果中的多音字点击切换读音
  const handleOutputPinyinClick = useCallback((charIndex: number) => {
    // 查找对应的多音字
    if (charIndex < detailedResults.length) {
      const result = detailedResults[charIndex];
      
      if (result && result.isHeteronym && result.pinyin.length > 1) {
        const charKey = `${result.origin}_${charIndex}`;
        const currentSelection = heteronymSelections[charKey] || 0;
        
        // 直接循环切换读音（不显示菜单，简化交互）
        const nextSelection = (currentSelection + 1) % result.pinyin.length;
        
        // 更新选择
        setHeteronymSelections(prev => ({
          ...prev,
          [charKey]: nextSelection
        }));
        
        // 添加点击反馈效果
        const clickedElement = document.querySelector(`[data-char-index="${charIndex}"]`);
        if (clickedElement) {
          clickedElement.classList.add('animate-pulse');
          setTimeout(() => {
            clickedElement.classList.remove('animate-pulse');
          }, 300);
        }
        
        // 触发Live2D联动
        if (typeof window !== 'undefined' && (window as any).live2dController) {
          (window as any).live2dController.triggerEvent('copy', `切换读音: ${result.origin} → ${result.pinyin[nextSelection]}`);
        }
      }
    }
  }, [heteronymSelections, detailedResults]); // 移除不必要的handleHeteronymSelect依赖

  // 处理读音选择
  const handlePinyinSelection = useCallback((charIndex: number, pinyinIndex: number) => {
    if (charIndex < detailedResults.length) {
      const result = detailedResults[charIndex];
      if (result) {
        const charKey = `${result.origin}_${charIndex}`;
        
        // 更新选择
        setHeteronymSelections(prev => ({
          ...prev,
          [charKey]: pinyinIndex
        }));
        
        // 隐藏菜单
        setSelectionMenu(prev => ({ ...prev, visible: false }));
        
        // 触发Live2D联动
        if (typeof window !== 'undefined' && (window as any).live2dController) {
          (window as any).live2dController.triggerEvent('copy', `选择读音: ${result.origin} → ${result.pinyin[pinyinIndex]}`);
        }
      }
    }
  }, [detailedResults]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (selectionMenu.visible) {
        setSelectionMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (selectionMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [selectionMenu.visible]);

  // 设置全局点击处理函数
  useEffect(() => {
    // 将处理函数挂载到window对象上，供HTML中的onclick使用
    (window as any).handleOutputCharClick = handleOutputCharClick;
    (window as any).handleOutputPinyinClick = handleOutputPinyinClick;
    (window as any).handlePinyinSelection = handlePinyinSelection;
    
    // 清理函数
    return () => {
      delete (window as any).handleOutputCharClick;
      delete (window as any).handleOutputPinyinClick;
      delete (window as any).handlePinyinSelection;
    };
  }, [handleOutputCharClick, handleOutputPinyinClick, handlePinyinSelection]);

  // 使用事件委托处理多音字点击
  useEffect(() => {
    const handleClick = (_event: MouseEvent) => {
      const target = _event.target as HTMLElement;
      const clickableElement = target.closest('[data-char-index]') as HTMLElement;
      
      if (clickableElement) {
        const charIndex = parseInt(clickableElement.getAttribute('data-char-index') || '-1', 10);
        
        if (charIndex >= 0) {
          _event.preventDefault();
          _event.stopPropagation();
          handleOutputPinyinClick(charIndex);
        }
      }
    };

    // 添加事件监听器到document
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };

  }, [handleOutputPinyinClick, detailedResults, heteronymSelections]); // 修复依赖数组 - options已经在handleOutputPinyinClick依赖中

  // 如果组件未挂载，返回 null - 这必须在所有的 Hooks 之后
  if (!mounted) {
    return null;
  }

  // 获取高亮后的输出文本
  const highlightedOutput = highlightHeteronymInOutput(outputText, detailedResults);

  const isDark = resolvedTheme === 'dark';

  return (
    <main 
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''} ${containerStyle.className}`}
      style={containerStyle.style}
    >
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

      {/* 主内容区域 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <PageHeader
          title="拼音转换器"
          description="智能中文转拼音工具，支持多音字识别和多种输出格式"
          size="lg"
          className="mb-12"
        />

        {/* 转换配置选项 */}
        <motion.div 
          className="mb-6 backdrop-blur-md bg-card/90 rounded-lg border border-border/50 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-foreground">转换选项</h2>
          </div>
          
          {/* 转换选项控制 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* 声调样式 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">声调样式</h3>
              <div className="flex gap-1">
                {[
                  { key: 'mark', label: '符号' },
                  { key: 'number', label: '数字' },
                  { key: 'none', label: '无' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('toneStyle', key)}
                    className={`px-2 py-1 text-xs rounded transition-all duration-200 flex-1 ${
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
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">输出格式</h3>
              <div className="flex gap-1">
                {[
                  { key: 'full', label: '完整' },
                  { key: 'initials', label: '首字母' },
                  { key: 'both', label: '两者' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('outputFormat', key)}
                    className={`px-2 py-1 text-xs rounded transition-all duration-200 flex-1 ${
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
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">分隔符</h3>
              <div className="flex gap-1">
                {[
                  { key: 'space', label: '空格', value: ' ' },
                  { key: 'none', label: '无', value: '' },
                  { key: 'custom', label: '自定义', value: 'custom' }
                ].map(({ key, label, value }) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (value === 'custom') {
                        setIsCustomMode(true);
                        handleOptionChange('separator', '');
                      } else {
                        setIsCustomMode(false);
                        handleOptionChange('separator', value);
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded transition-all duration-200 ${
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
                  className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-[#66ccff] focus:border-transparent ${
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
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">非中文字符</h3>
              <div className="flex gap-1">
                {[
                  { key: 'keep', label: '保留' },
                  { key: 'remove', label: '移除' },
                  { key: 'replace', label: '替换' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('nonChinese', key)}
                    className={`px-2 py-1 text-xs rounded transition-all duration-200 flex-1 ${
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
                  className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-[#66ccff] focus:border-transparent ${
                    isDark 
                      ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  maxLength={1}
                />
              )}
            </div>

            {/* ü/v 格式切换 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">ü 显示格式</h3>
              <div className="flex gap-1">
                {[
                  { key: 'ü', label: 'ü' },
                  { key: 'v', label: 'v' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleOptionChange('uFormat', key)}
                    className={`px-2 py-1 text-xs rounded transition-all duration-200 flex-1 ${
                      options.uFormat === key
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
          </div>

          {/* 输入文本区域 */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="请输入要转换的中文文本...例如：华风夏韵，洛水天依"
              className={`w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-[#66ccff] focus:border-transparent transition-all duration-200 ${
                inputText ? 'pr-12' : ''
              } ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            {inputText && (
              <button
                onClick={clearInput}
                className={`absolute bottom-4 right-4 w-6 h-6 flex items-center justify-center rounded-full text-xs transition-all duration-200 hover:scale-110 ${
                  isDark 
                    ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-600'
                }`}
                title="清空文本"
              >
                ✕
              </button>
            )}
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
                <pre 
                  className="whitespace-pre-wrap font-mono text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightedOutput || '转换结果将在这里显示...' 
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* 读音选择菜单 */}
        {selectionMenu.visible && (
          <div 
            className="fixed z-50 backdrop-blur-md bg-card/95 rounded-lg border border-border/50 shadow-lg p-2 min-w-[120px]"
            style={{ 
              left: selectionMenu.x, 
              top: selectionMenu.y,
              transform: 'translate(-50%, -100%) translateY(-10px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium text-foreground mb-2 px-2">
              选择&quot;{selectionMenu.char}&quot;的读音：
            </div>
            <div className="space-y-1">
              {selectionMenu.pinyins.map((pinyin, index) => (
                <button
                  key={index}
                  onClick={() => handlePinyinSelection(selectionMenu.charIndex, index)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-all duration-200 ${
                    index === selectionMenu.currentSelection
                      ? 'bg-[#66ccff] text-white shadow-md'
                      : isDark
                      ? 'hover:bg-gray-700 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {pinyin}
                  {index === selectionMenu.currentSelection && (
                    <span className="ml-1 text-xs opacity-75">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

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
              <div className="flex space-x-2">
                <button
                  onClick={() => setHideNonChinese(!hideNonChinese)}
                  className={`px-2 py-1 text-xs rounded-md transition-all duration-200 ${
                    hideNonChinese
                      ? 'bg-[#66ccff] text-white shadow-md'
                      : isDark
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {hideNonChinese ? '显示非中文字符' : '隐藏非中文字符'}
                </button>
                <button
                  onClick={() => setShowOnlyHeteronyms(!showOnlyHeteronyms)}
                  className={`px-2 py-1 text-xs rounded-md transition-all duration-200 ${
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
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {detailedResults
                .filter(result => {
                  // 隐藏非中文字符
                  if (hideNonChinese && result.isNonChinese) {
                    return false;
                  }
                  // 只显示多音字
                  if (showOnlyHeteronyms && !result.isHeteronym) {
                    return false;
                  }
                  return true;
                })
                .map((result, index) => {
                  const charKey = `${result.origin}_${index}`;
                  const userSelection = heteronymSelections[charKey];
                  const isSelected = userSelection !== undefined;
                  
                  return (
                    <div 
                      key={index} 
                      data-char-key={charKey}
                      className={`p-2 rounded-lg border transition-all duration-200 ${
                        isDark 
                          ? 'bg-gray-800/30 border-gray-600 hover:bg-gray-700/30' 
                          : 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/50'
                      } ${
                        isSelected ? 'ring-2 ring-[#66ccff] ring-opacity-50 bg-[#66ccff] bg-opacity-10 shadow-md transform scale-105' : ''
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg font-bold text-foreground mb-1">{result.origin}</div>
                        {result.isHeteronym ? (
                          <div className="flex flex-wrap gap-2 justify-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                            {result.pinyin.map((pinyin, pinyinIndex) => {
                              // 确定当前按钮是否被选中
                              const isThisSelected = userSelection === pinyinIndex;
                              
                              return (
                                <button
                                  key={pinyinIndex}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleHeteronymSelect(charKey, pinyinIndex);
                                  }}
                                  className={`px-2 py-1 text-[11px] rounded transition-all duration-200 font-semibold relative border shadow-sm ${
                                    isThisSelected
                                      ? 'bg-[#66ccff] text-white shadow-lg ring-2 ring-[#66ccff] ring-opacity-50 transform scale-105 border-[#66ccff]'
                                      : isDark
                                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:shadow-md border-gray-400 hover:border-gray-300 opacity-90 hover:opacity-100'
                                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-md border-gray-300 hover:border-gray-400 opacity-90 hover:opacity-100'
                                  }`}
                                  title={`选择读音: ${pinyin}`}
                                >
                                  {pinyin}
                                </button>
                              );
                            })}
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
            {hideNonChinese && detailedResults.filter(result => !result.isNonChinese).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>当前文本中没有中文字符</p>
              </div>
            )}
          </motion.div>
        )}
      </main>

      
    </main>
  );
}