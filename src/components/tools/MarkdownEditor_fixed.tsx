  // 计算详细的文字统计信息
  const calculateTextStats = useCallback((text: string) => {
    if (!text) {
      return {
        wordCount: 0,
        charCount: 0,
        chineseChars: 0,
        englishWords: 0,
        numbers: 0,
        punctuation: 0,
        spaces: 0,
        lines: 0,
        paragraphs: 0
      };
    }

    // 中文字符统计（Unicode范围：\u4e00-\u9fff）
    const chineseMatches = text.match(/[\u4e00-\u9fff]/g);
    const chineseChars = chineseMatches ? chineseMatches.length : 0;
    
    // 英文单词统计（改进的正则表达式）
    const englishMatches = text.match(/[a-zA-Z]+/g);
    const englishWords = englishMatches ? englishMatches.length : 0;
    
    // 数字统计
    const numberMatches = text.match(/\d+/g);
    const numbers = numberMatches ? numberMatches.length : 0;
    
    // 标点符号统计（中英文标点）
    const punctuationMatches = text.match(/[，。！？；：","（）【】《》〈〉「」『』〔〕［］｛｝、·‥…—–―‖｜¦]/g);
    const punctuation = punctuationMatches ? punctuationMatches.length : 0;
    
    // 空格统计
    const spaceMatches = text.match(/ /g);
    const spaces = spaceMatches ? spaceMatches.length : 0;
    
    // 行数统计
    const lines = text.split('\n').length;
    
    // 段落数统计（按空行分隔）
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
    
    // 总字数（中文字符 + 英文单词）
    const wordCount = chineseChars + englishWords;
    
    return {
      wordCount,
      charCount: text.length,
      chineseChars,
      englishWords,
      numbers,
      punctuation,
      spaces,
      lines,
      paragraphs
    };
  }, []);