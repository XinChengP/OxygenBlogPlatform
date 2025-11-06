"use client";

import { useEffect } from "react";

export default function Live2DTestPage() {
  useEffect(() => {
    // 重定向到静态HTML文件
    window.location.href = "/live2d-test-nextjs.html";
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>重定向中...</h1>
      <p>正在重定向到Live2D测试页面...</p>
    </div>
  );
}