"use client"
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { mainTitle, mainTitleBlueDecoration, subTitle, subTitleBlueDecoration, subTitleBlueDecorationClass, TypewriterTexts} from '@/setting/HomeSetting'
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

const BoxReveal = dynamic(() => import('@/components/magicui/box-reveal'), { ssr: false });
import Meteors from '@/components/magicui/meteors';
import Typewriter from '@/components/ui/typewriter';

export default function Home() {
  const router = useRouter();
  const { containerStyle, sectionStyle } = useBackgroundStyle('home');

  return (
    <div className={`${containerStyle.className} hero-optimized`} style={containerStyle.style}>
      <Meteors />

      {/* 内容区 */}
      <section className={`${sectionStyle.className} min-h-screen flex flex-col items-center justify-center pb-32`} style={sectionStyle.style}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center hero-optimized">

          {/* 主标题 - 白色描边文字 */}
          <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
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
          </BoxReveal>

          {/* 副标题 */}
          <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
            <h2 className="mt-3 text-lg sm:text-xl lg:text-[1.6rem] font-light text-white/90 tracking-wide title gpu-accelerated">
              {subTitle}
              <span className={`${subTitleBlueDecorationClass} text-gradient-animate font-semibold`}>{subTitleBlueDecoration}</span>
            </h2>
          </BoxReveal>

          {/* 打字机 */}
          <div className="mt-3 text-sm sm:text-base text-white/60 gpu-accelerated">
            <Typewriter texts={TypewriterTexts} delay={0.5} />
          </div>

          {/* 按钮组 */}
          <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
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
          </BoxReveal>

        </div>
      </section>
    </div>
  );
}
