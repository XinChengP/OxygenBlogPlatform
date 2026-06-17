"use client";

import { cn } from "@/utils";
import React, { useEffect, useState } from "react";

interface MeteorsProps {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
  className?: string;
}

const Meteors = ({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>(
    [],
  );

  useEffect(() => {
    const styles = [...new Array(number)].map(() => ({
      "--angle": -angle + "deg",
      top: "-5%",
      left: `calc(0% + ${Math.floor(Math.random() * window.innerWidth)}px)`,
      animationDelay: Math.random() * (maxDelay - minDelay) + minDelay + "s",
      animationDuration:
        Math.floor(Math.random() * (maxDuration - minDuration) + minDuration) +
        "s",
    }));
    setMeteorStyles(styles);
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle]);

  return (
    <>
      {[...meteorStyles].map((style, idx) => (
        // 流星头部 - 使用天依蓝主题色，与网站整体色调保持一致
          <span
            key={idx}
            style={{ ...style }}
            className={cn(
              "pointer-events-none absolute size-0.5 rotate-[var(--angle)] animate-meteor rounded-full bg-primary/60 shadow-[0_0_0_1px_rgba(102,204,255,0.15)] meteor-optimized",
              className,
            )}
          >
            {/* 流星尾部 - 使用主题色渐变拖尾，增强视觉连贯性 */}
            <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2 bg-gradient-to-r from-primary/50 to-transparent gpu-accelerated" />
        </span>
      ))}
    </>
  );
};

export default Meteors;
