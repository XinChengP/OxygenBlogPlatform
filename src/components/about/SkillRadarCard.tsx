/**
 * 个人技能雷达卡片组件
 * 使用 recharts 的 RadarChart 渲染技能分布
 * 视觉风格：天依蓝主题色 + 毛玻璃 + framer-motion 入场动画
 * 放置位置：关于页面 → 页底区域 → 旅行足迹左侧
 */
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Sparkles } from 'lucide-react';
import type { SkillRadarItem } from '@/setting/AboutSetting';

/**
 * 组件 Props
 */
interface SkillRadarCardProps {
  /** 技能数据列表，从 AboutSetting.ts 导入 */
  skills: SkillRadarItem[];
  /** 可选：底部个人评价文本（一句话自况/座右铭） */
  evaluation?: string;
  /** 可选：卡片根容器的 className，用于外部调整布局 */
  className?: string;
}

/**
 * 判断深色模式（通过读取 <html> 上的 class）
 * 不依赖 next-themes，避免 SSR 水合问题
 */
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // 首次挂载后读取
    const check = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    check();

    // 监听后续变化
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

/**
 * 自定义 Tooltip
 * 鼠标悬停时显示技能名、分数和简短描述
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as SkillRadarItem;
  const score = payload[0].value as number;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-3 py-2 rounded-xl border backdrop-blur-md bg-card/95 border-border shadow-xl text-sm pointer-events-none"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-block w-2 h-2 rounded-full bg-primary" />
        <span className="font-semibold text-foreground">{data.subject}</span>
        <span className="ml-auto font-bold text-primary">{score}</span>
      </div>
      {data.description && (
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
          {data.description}
        </p>
      )}
    </motion.div>
  );
};

/**
 * 个人技能雷达卡片
 */
export default function SkillRadarCard({ skills, evaluation, className = '' }: SkillRadarCardProps) {
  const isDark = useIsDarkMode();

  // recharts 需要的数据格式：{ subject, score }[]
  const chartData = useMemo(
    () => skills.map((s) => ({ subject: s.subject, score: s.score, description: s.description })),
    [skills]
  );

  // 主题适配：坐标轴和网格线颜色（浅色模式线条更深、更深色模式线条更浅）
  const axisStroke = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)';
  const gridStroke = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const labelFill = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: 0.5 }}
      className={`relative flex flex-col rounded-2xl border overflow-hidden backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 p-6 ${className}`}
    >
      {/* 卡片标题 */}
      <div className="flex items-center gap-2 mb-2">
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="w-5 h-5 text-primary" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground">我的技能</h3>
      </div>

      {/* 雷达图主体（撑满剩余空间，不留白） */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
            {/* 背景网格 - 虚线多边形层次 */}
            <PolarGrid
              stroke={gridStroke}
              strokeDasharray="3 3"
            />

            {/* 角度轴：技能名称标签 */}
            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fill: labelFill,
                fontSize: 12,
                fontWeight: 500,
              }}
              tickLine={false}
            />

            {/* 径向轴：分数刻度（0 / 25 / 50 / 75 / 100） */}
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tickCount={5}
              tick={{ fill: axisStroke, fontSize: 10 }}
              axisLine={{ stroke: axisStroke }}
              tickLine={{ stroke: axisStroke }}
            />

            {/* 技能多边形（天依蓝描边 + 半透明填充） */}
            <Radar
              name="熟练度"
              dataKey="score"
              stroke="#66ccff"
              strokeWidth={2}
              fill="#66ccff"
              fillOpacity={0.35}
              animationBegin={300}
              animationDuration={1200}
              animationEasing="ease-out"
            />

            {/* Tooltip：天依蓝虚线跟随 */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#66ccff', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 底部个人评价文本 - 带天依蓝左边框强调 */}
      {evaluation && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-3 pl-3 py-1 text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/50"
        >
          {evaluation}
        </motion.p>
      )}

    </motion.div>
  );
}
