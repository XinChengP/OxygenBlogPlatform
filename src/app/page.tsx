"use client"
import { lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { mainTitle, mainTitleBlueDecoration, subTitle, subTitleBlueDecoration, subTitleBlueDecorationClass, TypewriterTexts} from '@/setting/HomeSetting'
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

// 动态导入大型组件
const BoxReveal = lazy(() => import('@/components/magicui/box-reveal'));
const Meteors = lazy(() => import('@/components/magicui/meteors'));
const Typewriter = lazy(() => import('../components/ui/typewriter'));

export default function Home() {
  const router = useRouter();
  const { containerStyle, sectionStyle } = useBackgroundStyle('home');

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <Suspense fallback={null}>
        <Meteors />
      </Suspense>
      {/* 欢迎部分 */}
      <section className={`${sectionStyle.className} min-h-screen flex items-center justify-center pb-32`} style={sectionStyle.style}>
       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10">

          <Suspense fallback={<div className="h-[5.5rem] sm:h-[6rem] lg:h-[5.5rem] flex items-center justify-center">
            <div className="text-5xl sm:text-6xl lg:text-[5.5rem] font-semibold leading-tight title">
              {mainTitle}<span className="text-primary">{mainTitleBlueDecoration}</span>
            </div>
          </div>}>
            <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
              <p className="text-5xl sm:text-6xl lg:text-[5.5rem] font-semibold leading-tight title">
              {mainTitle}<span className="text-primary">{mainTitleBlueDecoration}</span>
              </p>
            </BoxReveal>
          </Suspense>
 
          <Suspense fallback={<div className="h-[2rem] sm:h-[2.5rem] lg:h-[2rem] flex items-center justify-center">
            <div className="text-xl sm:text-2xl lg:text-[2rem] title">
              {subTitle}
              <span className={subTitleBlueDecorationClass}>{subTitleBlueDecoration}</span>
            </div>
          </div>}>
            <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
              <h2 className="mt-1 sm:mt-[.5rem] text-xl sm:text-2xl lg:text-[2rem] title">
                {subTitle}
              <span className={subTitleBlueDecorationClass}>{subTitleBlueDecoration}</span>
              </h2>
            </BoxReveal>
          </Suspense>

         <Suspense fallback={<div className="h-[1.3rem] text-lg sm:text-xl lg:text-[1.3rem]">
           <span className="opacity-50">加载中...</span>
         </div>}>
           <div className="mt-1 sm:mt-2 text-lg sm:text-xl lg:text-[1.3rem]">
              <Typewriter texts={TypewriterTexts} delay={0.5} ></Typewriter>
           </div>
         </Suspense>
         
         <Suspense fallback={<div className="h-[3rem] flex items-center justify-center">
           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center py-4 sm:py-6 px-4 sm:px-6">
             <button className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg">
               浏览文章
             </button>
             <button className="bg-transparent hover:bg-primary/10 text-primary border-2 border-primary hover:border-primary/80 px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5">
               了解更多
             </button>
           </div>
         </div>}>
           <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
           <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-6 lg:mt-8 w-full sm:w-auto py-4 sm:py-6 px-4 sm:px-6">
                {/* 主要按钮 - 浏览文章 */}
                <button 
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg nav-link"
                onClick={() => router.push('/blogs')}
                >
                浏览文章
                </button>
                {/* 次要按钮 - 了解更多 */}
                <button 
                className="bg-transparent hover:bg-primary/10 text-primary border-2 border-primary hover:border-primary/80 px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 nav-link"
                onClick={() => router.push('/about')}
                >
                了解更多
                </button>
                {/* 测试按钮 - 测试消息 */}
                <button 
                className="bg-secondary hover:bg-secondary/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg nav-link"
                onClick={() => {
                  if (window.showMessage) {
                    window.showMessage('天依：欢迎来到我的博客！点击这里可以浏览文章，或者去了解更多关于我的信息～');
                  } else {
                    alert('Live2D消息功能尚未就绪，请稍后再试～');
                  }
                }}
                >
                测试消息
                </button>
             </div>
           </BoxReveal>
         </Suspense>
         
        </div>
      </section>
    </div>
  );
}
