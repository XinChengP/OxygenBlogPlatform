'use client';

import { calculateAdvancedWordCount, calculateReadingTime } from '@/utils/wordCountUtils';
import { useState } from 'react';

export default function WordCountTest() {
  const [inputText, setInputText] = useState('');
  const [stats, setStats] = useState(null);
  const [readingTime, setReadingTime] = useState(0);

  const handleTextChange = (text) => {
    setInputText(text);
    const wordStats = calculateAdvancedWordCount(text);
    const time = calculateReadingTime(text);
    setStats(wordStats);
    setReadingTime(time);
  };

  const testCases = [
    '这是一个测试文本',
    'Hello World',
    'Hello 世界，这是一个测试 world',
    '我有123个苹果和456个橙子',
    '你好，世界！这是一个测试。',
    '# 标题\n\n**加粗**和*斜体*文本',
    '测试文本。'.repeat(100)
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">字数统计算法测试</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">输入文本：</label>
        <textarea
          className="w-full h-40 p-4 border rounded-lg resize-none"
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="在此输入文本进行测试..."
        />
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">快速测试用例：</h3>
        <div className="flex flex-wrap gap-2">
          {testCases.map((testCase, index) => (
            <button
              key={index}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              onClick={() => handleTextChange(testCase)}
            >
              测试 {index + 1}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">统计结果</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">总字数</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalWords}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">总字符数</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalChars}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">中文字符</div>
              <div className="text-2xl font-bold text-red-600">{stats.chineseChars}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">英文单词</div>
              <div className="text-2xl font-bold text-purple-600">{stats.englishWords}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">数字</div>
              <div className="text-2xl font-bold text-orange-600">{stats.numbers}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">标点符号</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.punctuation}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">空格</div>
              <div className="text-2xl font-bold text-gray-600">{stats.spaces}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">行数</div>
              <div className="text-2xl font-bold text-indigo-600">{stats.lines}</div>
            </div>
            <div className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-600">段落数</div>
              <div className="text-2xl font-bold text-pink-600">{stats.paragraphs}</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <div className="text-sm text-gray-600">预计阅读时间</div>
            <div className="text-2xl font-bold text-blue-700">{readingTime} 分钟</div>
          </div>
        </div>
      )}
    </div>
  );
}