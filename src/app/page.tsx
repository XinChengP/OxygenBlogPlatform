"use client"
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { mainTitle, mainTitleBlueDecoration, subTitle, subTitleBlueDecoration, subTitleBlueDecorationClass, TypewriterTexts} from '@/setting/HomeSetting'
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

// 动态导入动画组件，禁用SSR以避免hydration不匹配
const BoxReveal = dynamic(() => import('@/components/magicui/box-reveal'), { ssr: false });
import Meteors from '@/components/magicui/meteors';
import Typewriter from '@/components/ui/typewriter';

/**
 * 首页组件
 * 应用性能优化：GPU加速、CSS动画替代JS动画、will-change优化
 */
export default function Home() {
  const router = useRouter();
  const { containerStyle, sectionStyle } = useBackgroundStyle('home');

  return (
    <div className={`${containerStyle.className} hero-optimized`} style={containerStyle.style}>
      {/* 流星背景动画 - 使用优化后的类名 */}
      <Meteors />
      {/* 欢迎部分 - 应用性能优化类 */}
      <section className={`${sectionStyle.className} min-h-screen flex items-center justify-center pb-32`} style={sectionStyle.style}>
       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10 hero-optimized">

            {/* 主标题 - 应用GPU加速 */}
            <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
              <p className="text-5xl sm:text-6xl lg:text-[5.5rem] font-semibold leading-tight title gpu-accelerated">
              {mainTitle}<span className="text-primary">{mainTitleBlueDecoration}</span>
              </p>
            </BoxReveal>
 
            {/* 副标题 - 应用GPU加速 */}
            <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
              <h2 className="mt-1 sm:mt-[.5rem] text-xl sm:text-2xl lg:text-[2rem] title gpu-accelerated">
                {subTitle}
              {/* 锦依卫文字 - 应用渐变动画优化 */}
              <span className={`${subTitleBlueDecorationClass} text-gradient-animate`}>{subTitleBlueDecoration}</span>
              </h2>
            </BoxReveal>

         {/* 打字机效果 - 应用GPU加速 */}
         <div className="mt-1 sm:mt-2 text-lg sm:text-xl lg:text-[1.3rem] gpu-accelerated">
            <Typewriter texts={TypewriterTexts} delay={0.5} ></Typewriter>
         </div>
         
         {/* 按钮组 - 使用CSS动画优化替代transform */}
         <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-6 lg:mt-8 w-full sm:w-auto py-4 sm:py-6 px-4 sm:px-6">
                {/* 主要按钮：天依蓝背景 + 悬停光晕 + 箭头图标，强化行动引导 */}
                <button
                  className="group bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium btn-hover-lift shadow-lg shadow-primary/25 hover:shadow-primary/40 nav-link flex items-center justify-center gap-2"
                  onClick={() => router.push('/blogs')}
                >
                  浏览文章
                  {/* 箭头图标：悬停时向右位移，暗示进入页面 */}
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                {/* 次要按钮：描边样式 + 悬停光晕 + 信息图标，与主按钮形成层级对比 */}
                <button
                  className="group bg-transparent hover:bg-primary/10 text-primary border-2 border-primary hover:border-primary/80 px-8 py-3 rounded-lg font-medium btn-hover-lift shadow-lg shadow-primary/10 hover:shadow-primary/25 nav-link flex items-center justify-center gap-2"
                  onClick={() => router.push('/about')}
                >
                  了解更多
                  {/* 信息图标：悬停时轻微放大，吸引注意力 */}
                  <svg
                    className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
             </div>
         </BoxReveal>
         
        </div>
      </section>
    </div>
  );
}
