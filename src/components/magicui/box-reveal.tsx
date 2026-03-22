"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * BoxReveal 组件 - 盒子揭示动画
 * 性能优化：使用 will-change 和 GPU 加速
 */
interface BoxRevealProps {
  children: React.ReactElement;
  width?: "fit-content" | "100%";
  boxColor?: string;
  duration?: number;
}

const BoxReveal = ({
  children,
  width = "fit-content",
  boxColor = "#5046e6",
  duration,
}: BoxRevealProps) => {
  const mainControls = useAnimation();
  const slideControls = useAnimation();

  const ref = useRef(null);
  // 使用 once: true 确保动画只触发一次，减少性能开销
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      // 使用 requestAnimationFrame 优化动画触发时机
      requestAnimationFrame(() => {
        slideControls.start("visible");
        mainControls.start("visible");
      });
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <div 
      ref={ref} 
      style={{ 
        position: "relative", 
        width, 
        overflow: "hidden",
        // 应用 contain 优化布局计算
        contain: "layout style paint"
      }}
    >
      {/* 主要内容 - 应用GPU加速 */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ 
          duration: duration ? duration : 0.5, 
          delay: 0.25,
          // 使用 ease-out 减少动画计算量
          ease: "easeOut"
        }}
        style={{
          willChange: "transform, opacity",
          transform: "translateZ(0)",
        }}
      >
        {children}
      </motion.div>

      {/* 揭示遮罩 - 应用GPU加速 */}
      <motion.div
        variants={{
          hidden: { left: 0 },
          visible: { left: "100%" },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ 
          duration: duration ? duration : 0.5, 
          ease: "easeIn"
        }}
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor,
          willChange: "left",
          transform: "translateZ(0)",
        }}
      />
    </div>
  );
};

export default BoxReveal;
