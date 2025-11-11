"use client"
  import { BoxReveal } from "@/components/magicui/box-reveal";
  import { Meteors } from "@/components/magicui/meteors";
  import { Typewriter } from "../components/ui/typewriter"
  import { useRouter } from 'next/navigation';
  import { mainTitle, mainTitleBlueDecoration, subTitle, subTitleBlueDecoration, subTitleBlueDecorationClass, TypewriterTexts} from '@/setting/HomeSetting'
  import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

export default function Home() {
  const router = useRouter();
  const { containerStyle, sectionStyle } = useBackgroundStyle('home');

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <Meteors />
      {/* 欢迎部分 */}
      <section className={`${sectionStyle.className} min-h-screen flex items-center justify-center pb-32`} style={sectionStyle.style}>
       <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10">

          <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
            <p className="text-5xl sm:text-6xl lg:text-[5.5rem] font-semibold leading-tight">
            {mainTitle}<span className="text-primary">{mainTitleBlueDecoration}</span>
            </p>
          </BoxReveal>
 
          <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
            <h2 className="mt-1 sm:mt-[.5rem] text-xl sm:text-2xl lg:text-[2rem]">
              {subTitle}
            <span className={subTitleBlueDecorationClass}>{subTitleBlueDecoration}</span>
            </h2>
         </BoxReveal>

         <div className="mt-1 sm:mt-2 text-lg sm:text-xl lg:text-[1.3rem]">
            <Typewriter texts={TypewriterTexts} delay={0.5} ></Typewriter>
         </div>
         
         <BoxReveal boxColor={"var(--primary)"} duration={0.5}>
         <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-6 lg:mt-8 w-full sm:w-auto py-4 sm:py-6 px-4 sm:px-6">
              {/* 主要按钮 - 浏览文章 */}
              <button 
              className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg "
              onClick={() => router.push('/blogs')}
              >
              浏览文章
              </button>
              {/* 次要按钮 - 了解更多 */}
              <button 
              className="bg-transparent hover:bg-primary/10 text-primary border-2 border-primary hover:border-primary/80 px-8 py-3 rounded-lg font-medium transition-all duration-300 transform hover:-translate-y-0.5"
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
