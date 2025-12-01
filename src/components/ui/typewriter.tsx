"use client"

import { useEffect, useState } from "react"
import { animate, motion, useMotionValue, useTransform } from "motion/react"

export interface ITypewriterProps {
  delay: number
  texts: string[]
  baseText?: string
  specialStyleIndex?: number
  specialStyleClass?: string
}

function Typewriter({ delay, texts, baseText = "", specialStyleIndex = 0, specialStyleClass = "" }: ITypewriterProps) {
  const [animationComplete, setAnimationComplete] = useState(false)
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const displayText = useTransform(rounded, (latest) =>
    baseText.slice(0, latest)
  )

  useEffect(() => {
    const controls = animate(count, baseText.length, {
      type: "tween",
      delay,
      duration: 2, // 从1改为2，让基础文本动画变慢
      ease: "easeInOut",
      onComplete: () => setAnimationComplete(true),
    })
    return () => {
      controls.stop && controls.stop()
    }
  }, [count, baseText.length, delay])

  return (
    <span>
      <motion.span>{displayText}</motion.span>
      {animationComplete && (
        <RepeatedTextAnimation 
          texts={texts} 
          delay={delay + 1} 
          specialStyleIndex={specialStyleIndex}
          specialStyleClass={specialStyleClass}
        />
      )}
      <BlinkingCursor />
    </span>
  )
}

export default Typewriter;

export interface IRepeatedTextAnimationProps {
  delay: number
  texts: string[]
  specialStyleIndex?: number
  specialStyleClass?: string
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
function RepeatedTextAnimation({
  delay,
  texts = defaultTexts,
  specialStyleIndex = 0,
  specialStyleClass = "",
}: IRepeatedTextAnimationProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    const currentText = texts[currentTextIndex] || ""
    const controls = animate(count, currentText.length, {
      type: "tween",
      delay,
      duration: 2,
      ease: "easeIn",
      repeat: Infinity,
      repeatType: "reverse",
      repeatDelay: 1,
      onUpdate(latest) {
        const roundedValue = Math.round(latest)
        setDisplayText(currentText.slice(0, roundedValue))
      },
      onComplete() {
        setCurrentTextIndex((prev) => (prev + 1) % texts.length)
        count.set(0)
      },
    })
    return () => {
      controls.stop && controls.stop()
    }
  }, [count, delay, currentTextIndex, texts])

  const isSpecialText = currentTextIndex === specialStyleIndex && specialStyleClass
  
  return (
    <motion.span
      className={isSpecialText ? specialStyleClass : "inline"}
      dangerouslySetInnerHTML={{ __html: displayText }}
    />
  )
}

const cursorVariants = {
  blinking: {
    opacity: [0, 0, 1, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatDelay: 0,
      ease: "linear",
      times: [0, 0.5, 0.5, 1],
    },
  },
}

function BlinkingCursor() {
  return (
    <motion.div
      variants={{
        blinking: {
          opacity: [0, 0, 1, 1],
          transition: {
            duration: 1,
            repeat: Infinity,
            repeatDelay: 0,
            ease: "linear" as const,
            times: [0, 0.5, 0.5, 1],
          },
        },
      }}
      animate="blinking"
      className="inline-block h-8 w-[1px] translate-y-1 bg-neutral-900"
    />
  )
}
