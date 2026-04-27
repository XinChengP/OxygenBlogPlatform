/**
 * 关于页面
 * 展示个人信息和博客介绍
 * 使用与其他页面统一的布局风格：PageHeader + 左右布局
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Cover } from '@/components/ui/cover';
import { EvervaultCard, Icon } from '@/components/ui/evervault-card';
import OptimizedIcon from '@/components/core/OptimizedIcon';
import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

// 导入配置
import {
  BeforeAnimationText,
  AnimationText,
  name,
  slogan,
  mail,
  github,
  bilibili,
  isBorder,
} from '@/setting/AboutSetting';

/**
 * 关于页面组件
 * 使用与其他页面统一的布局风格
 */
export default function AboutPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 毛玻璃样式函数 - 与其他页面保持一致
  const getGlassStyle = (baseStyle: string = '') => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 如果还没有挂载，显示默认样式避免闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 pt-[80px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 页面标题 - 使用统一的 PageHeader 组件 */}
        <PageHeader
          title="关于我"
          description="了解我的博客、技术栈和联系方式"
          size="lg"
          className="mb-8"
          gradientStyle="primary"
        />

        {/* 左右布局：左侧边栏 + 右侧主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧边栏 - 个人信息卡片 */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* 个人信息卡片 - 合并联系我 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={getGlassStyle("rounded-2xl shadow-xl border overflow-hidden")}
            >
              {/* 标语区域 */}
              <div className="p-6 text-center border-b border-border/50">
                <div className="text-xl sm:text-2xl font-semibold relative z-20 py-2 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60">
                  {BeforeAnimationText}
                  <Cover>{AnimationText}</Cover>
                </div>
              </div>

              {/* EvervaultCard 区域 */}
              <div className="p-6">
                <div className={`${isBorder ? 'border border-black/[0.2] dark:border-white/[0.2]' : ''} flex flex-col items-center relative`}>
                  {isBorder && <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />}
                  {isBorder && <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />}
                  {isBorder && <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />}
                  {isBorder && <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />}

                  <div className="w-full h-64">
                    <EvervaultCard />
                  </div>

                  <h2 className="dark:text-white text-black mt-4 font-medium text-center w-full text-lg title">
                    {name}
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm mt-4 text-center leading-relaxed">
                  {slogan}
                </p>
              </div>

              {/* 联系我 - 合并到个人信息卡片底部 */}
              <div className="px-6 pb-6">
                {/* 使用 flex + justify-center 让社交图标整体居中 */}
                <div className="flex justify-center">
                  <div className="grid grid-cols-4 gap-2">
                  {/* Email */}
                  <motion.a
                    href={`mailto:${mail}`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                    title="邮箱联系"
                  >
                    <OptimizedIcon
                      src="/assets/mail.svg"
                      alt="Mail"
                      className="text-foreground"
                      width={18}
                      height={18}
                    />
                  </motion.a>
                  {/* GitHub */}
                  <motion.a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                    title="GitHub"
                  >
                    <OptimizedIcon
                      src="/assets/github.svg"
                      alt="GitHub"
                      className="text-foreground"
                      width={18}
                      height={18}
                    />
                  </motion.a>
                  {/* Bilibili - 使用 SVG 矢量图优化加载 */}
                  <motion.a
                    href={bilibili}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                    title="哔哩哔哩"
                  >
                    <OptimizedIcon
                      src="/assets/bilibili.svg?v=2"
                      alt="Bilibili"
                      className="text-foreground"
                      width={18}
                      height={18}
                    />
                  </motion.a>
                  {/* VSQX - 使用 SVG 矢量图优化加载 */}
                  <motion.a
                    href="https://www.vsqx.top/space/16984"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-border hover:border-primary/50 transition-all duration-300"
                    title="VSQX"
                  >
                    <OptimizedIcon
                      src="/assets/vsqx.svg?v=2"
                      alt="VSQX"
                      className="text-foreground"
                      width={18}
                      height={18}
                    />
                  </motion.a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 兴趣爱好卡片 - 移动到左侧边栏 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className={getGlassStyle("rounded-2xl p-6 border shadow-lg")}
            >
              <div className="flex items-center mb-4">
                <h3 className="text-xl font-semibold text-foreground">兴趣爱好</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['洛天依', '乒乓球', '围棋', 'Video', 'Minecraft', 'Genshin Impact', 'Roco kingdom'].map((tag, index) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                    className="px-3 py-1 text-sm rounded-full border border-primary/20 bg-primary/10 text-primary transition-all duration-300 hover:scale-105 cursor-default"
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.aside>

          {/* 右侧主内容区 */}
          <motion.main
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-3"
          >
            {/* 关于卡片 - 合并所有内容 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className={getGlassStyle("rounded-2xl p-6 border shadow-lg")}
            >
              {/* 关于我 */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h3 className="text-xl font-semibold text-foreground">关于我</h3>
                </div>
                <div className="text-muted-foreground leading-relaxed space-y-4">
                  <p className="indent-8">
                    一个机械工程专业的25级大学牲。
                  </p>
                  <p className="indent-8">
                    总想搞一些东西，总是在焦虑之中，总爱碎碎念。。。
                  </p>
                  <div className="my-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground/80 mb-2">来个超绝比喻介绍一下自己：</p>
                    <p className="italic">
                      就像冬日清晨的桥梁，<br />
                      热爱就在桥的另一侧，<br />
                      明明有路，却总被雾笼罩着。<br />
                      至于无感的事物，<br />
                      就好似桥梁站在桥边，<br />
                      举目望去，<br />
                      唯有一片空白。
                    </p>
                  </div>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-border/50 my-6"></div>

              {/* 关于本站 */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h3 className="text-xl font-semibold text-foreground">关于本站</h3>
                </div>
                <div className="text-muted-foreground leading-relaxed space-y-3 text-sm">
                  <p className="indent-8">
                    这就要追溯到longlong years ago了（
                  </p>
                  <p className="indent-8">
                    初三（还是初二？）那会在QQ空间看到有好友（不熟的那种）搞了个网站，觉得挺厉害，然后就没有然后了（bushi）。高一，超绝班级职务是四大部门，然后稀里糊涂整了个宣传部网络分部（宣网部）部长，我就寻思给班级搞个网站，然后了解了一点，发现一窍不通，而且财力不济，然后就咕咕咕了。之后就是本博客的故事了，首先登场的是额滴高中哥们，来自TUT（怎么这么像颜文字qwq）的Allenwdk，在高考完的暑假里用他学长搞的模版（没错我也用了这个模版）搞了个博客，我了解到消息后鸽了三个月菜严肃学习，然后本博客诞生了。后来瞎搞了一段时间后，想搞一搞动态博客，买了个五年的域名（xinchengp.cn），又斥巨资租了一年的服务器（俺颇有家资），到手里发现一点不会搞，磕磕绊绊在b站上搜教程，看文档，头都要大了，最后折腾了一番放弃了（看看事故现场www.xinchengp.cn，26年12月就到期了），还是老老实实的整现在的小博客吧。就顺手把买的那个域名替换掉了原来github自带的。（blog.xinchengp.cn）
                  </p>
                  <p className="text-primary font-medium text-center">关于本站的故事未完待续。。。</p>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-border/50 my-6"></div>

              {/* 关于域名 */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <h3 className="text-xl font-semibold text-foreground">关于域名</h3>
                </div>
                <div className="text-muted-foreground leading-relaxed space-y-3 text-sm">
                  <p className="indent-8">
                    Longlonglong years ago，我的QQ昵称就叫心想事成，一直没换过（别问为啥没换过，单纯就是取名废）。
                  </p>
                  <p className="indent-8">
                    后来其他平台上用过各式各样的id，比如菜鷄（Cay_Jir），诶嘿（Eiheir），用久了总感觉这不是我自己（雾）
                  </p>
                  <p className="indent-8">
                    高三那年三四月的时候，大半夜的感觉无聊，那就入坑一下崩铁吧，于是直接用鸽子的米游社账号（额滴原神账号也是这个）注册一个，然后就是喜闻乐见的起名环节了，思来想去不知道起什么好，就决定从我的QQ昵称入手，先取了首尾俩字&ldquo;心成&rdquo;，但是看上去怪怪的，又联想到心想事&ldquo;橙&rdquo;这个经典语录，那就&ldquo;心橙&rdquo;，又寻思再把&ldquo;心&rdquo;谐音换掉，由于高中沉迷原神，那段时间天天刷余响套（来歆余响），嗯，这个&ldquo;歆&rdquo;挺好，于是乎就这样我的第4代（或者1代ProplusMax）互联网id歆橙（Xincheng）诞生了，至于域名多了个p，一是因为这个域名被注册了，二是因为我想做一个P主（调歌！），所以在后面加了一个p。
                  </p>
                  <p className="indent-8">
                    至于选择.cn，一个是因为权威（确信），一个是因为相对比较便宜（超绝.com贵上天了，只恨财力不济）。
                  </p>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t border-border/50 my-6"></div>

              {/* 最后的最后 */}
              <div className="text-center py-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                <p className="text-muted-foreground leading-relaxed">
                  ·最后的最后，感谢你看到这里，听一个自我内耗大学生的碎碎念awa
                </p>
              </div>
            </motion.div>
          </motion.main>
        </div>
      </div>
    </div>
  );
}
