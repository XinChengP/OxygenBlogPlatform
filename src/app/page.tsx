"use client"
import { useRouter } from 'next/navigation';
import { mainTitle, mainTitleBlueDecoration, subTitle, subTitleBlueDecoration, subTitleBlueDecorationClass, TypewriterTexts} from '@/setting/HomeSetting'
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

import Meteors from '@/components/magicui/meteors';
import Typewriter from '@/components/ui/typewriter';
import HomeBackgroundFX from '@/components/home/HomeBackgroundFX';

export default function Home() {
  const router = useRouter();
  const { containerStyle, sectionStyle } = useBackgroundStyle('home');

  return (
    <>
      {/* 背景特效只在首页挂载；流星继续使用下面的原样式 Meteors */}
      <HomeBackgroundFX />
      <div
        className={`${containerStyle.className} hero-optimized`}
        style={containerStyle.style}
        data-home-fx-surface
      >
        <Meteors />

        {/* 内容区 */}
        <section className={`${sectionStyle.className} min-h-screen flex flex-col items-center justify-center pb-32`} style={sectionStyle.style}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center hero-optimized">

            {/* 主标题 - 白色描边文字。
                改用纯 CSS 入场：标题必须在静态 HTML 中直接存在，
                不能像原 BoxReveal(ssr:false) 那样等 JS 水合后才出现。 */}
            <div className="hero-reveal">
              <h1
                className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold leading-tight title gpu-accelerated"
                style={{
                  color: 'white',
                  WebkitTextStroke: '1.5px rgba(0,0,0,0.25)',
                  paintOrder: 'stroke fill',
                }}
              >
                {mainTitle}
                <span
                  className="text-primary"
                  style={{ WebkitTextStroke: '0px' }}
                >
                  {mainTitleBlueDecoration}
                </span>
              </h1>
            </div>

            {/* 副标题 */}
            <div className="hero-reveal">
              <h2 className="mt-3 text-lg sm:text-xl lg:text-[1.6rem] font-light text-white/90 tracking-wide title gpu-accelerated">
                {subTitle}
                <span className={`${subTitleBlueDecorationClass} text-gradient-animate font-semibold`}>{subTitleBlueDecoration}</span>
              </h2>
            </div>

            {/* 打字机 —— 背景 AT 是天空插画，白字必须足够实并带深色投影，
                否则亮色云层上几乎不可见 */}
            <div className="mt-3 text-sm sm:text-base text-white/90 gpu-accelerated drop-shadow-[0_1px_4px_rgba(15,40,90,0.65)]">
              <Typewriter texts={TypewriterTexts} delay={0.5} />
            </div>

            {/* 按钮组 */}
            <div className="hero-reveal">
              <div className="flex gap-3 sm:gap-4 justify-center mt-8">
                <button
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-semibold text-sm
                             shadow-lg shadow-primary/30 hover:shadow-primary/50 nav-link transition-all duration-300"
                  onClick={() => router.push('/blogs')}
                >
                  浏览文章
                </button>
                <button
                  className="text-white font-semibold text-sm px-8 py-3 rounded-xl
                             border border-white/30 hover:border-white/60 hover:bg-white/10
                             nav-link transition-all duration-300"
                  onClick={() => router.push('/about')}
                >
                  了解更多
                </button>
              </div>
            </div>

          </div>
        </section>
      </div>
    </>
  );
}
