"use client"

import { useEffect, useState } from "react"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"

/**
 * Typewriter 组件 - 打字机效果
 * 性能优化：使用 will-change 和 GPU 加速
 */
export interface ITypewriterProps {
  delay: number
  texts: string[]
  baseText?: string
}

function Typewriter({ delay, texts, baseText = "" }: ITypewriterProps) {
  const [animationComplete, setAnimationComplete] = useState(false)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayText = useTransform(rounded, (latest) =>
    baseText.slice(0, latest)
  )

  useEffect(() => {
    // 使用 requestAnimationFrame 优化动画触发时机
    const startAnimation = () => {
      const controls = animate(count, baseText.length, {
        type: "tween",
        delay,
        duration: 2, // 从1改为2，让基础文本动画变慢
        ease: "easeInOut",
        onComplete: () => setAnimationComplete(true),
      })
      return controls
    }
    
    let controls: ReturnType<typeof animate> | null = null
    
    // 延迟启动动画，避免阻塞首屏渲染
    const timer = setTimeout(() => {
      controls = startAnimation()
    }, 100)
    
    return () => {
      clearTimeout(timer)
      if (controls && controls.stop) {
        controls.stop()
      }
    }
  }, [count, baseText.length, delay])

  return (
    <span style={{ willChange: "contents" }}>
      {/* 应用GPU加速 */}
      <motion.span style={{ willChange: "contents" }}>{displayText}</motion.span>
      {animationComplete && (
        <RepeatedTextAnimation texts={texts} delay={delay + 1} />
      )}
      <BlinkingCursor />
    </span>
  )
}

export default Typewriter;

export interface IRepeatedTextAnimationProps {
  delay: number
  texts: string[]
}

const defaultTexts = [
  "quiz page with questions and answers",
  "blog Article Details Page Layout",
  "ecommerce dashboard with a sidebar",
  "ui like platform.openai.com....",
  "buttttton",
  "aop that tracks non-standard split sleep cycles",
  "transparent card to showcase achievements of a user",
]

/**
 * 重复文本动画组件 - 性能优化版本
 */
function RepeatedTextAnimation({
  delay,
  texts = defaultTexts,
}: IRepeatedTextAnimationProps) {
  const textIndex = useMotionValue(0)

  const baseText = useTransform(textIndex, (latest) => texts[latest] || "")
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayText = useTransform(rounded, (latest) =>
    baseText.get().slice(0, latest)
  )
  const updatedThisRound = useMotionValue(true)

  useEffect(() => {
    // 使用 requestAnimationFrame 优化动画
    let animation: ReturnType<typeof animate> | null = null
    
    const startAnimation = () => {
      animation = animate(count, 60, {
        type: "tween",
        delay,
        duration: 2, // 从1改为2，让重复文本动画变慢
        ease: "easeIn",
        repeat: Infinity,
        repeatType: "reverse",
        repeatDelay: 1,
        onUpdate(latest) {
          if (updatedThisRound.get() && latest > 0) {
            updatedThisRound.set(false)
          } else if (!updatedThisRound.get() && latest === 0) {
            textIndex.set((textIndex.get() + 1) % texts.length)
            updatedThisRound.set(true)
          }
        },
      })
    }
    
    // 延迟启动，避免阻塞首屏
    const timer = setTimeout(startAnimation, 100)
    
    return () => {
      clearTimeout(timer)
      if (animation && animation.stop) {
        animation.stop()
      }
    }
  }, [count, delay, textIndex, texts, updatedThisRound])

  // 应用GPU加速
  return <motion.span className="inline" style={{ willChange: "contents" }}>{displayText}</motion.span>
}

/**
 * 闪烁光标组件 - 使用CSS动画替代JS动画以提升性能
 */
function BlinkingCursor() {
  return (
    <span
      className="inline-block h-8 w-[1px] translate-y-1 bg-neutral-900 dark:bg-neutral-100"
      style={{
        animation: "blink 1s linear infinite",
        willChange: "opacity",
      }}
    />
  )
}
