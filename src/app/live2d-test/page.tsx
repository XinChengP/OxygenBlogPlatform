"use client";

import { useEffect } from "react";

export default function Live2DTestPage() {
  useEffect(() => {
    // 动态加载Live2D相关脚本
    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    const loadCSS = (href: string) => {
      return new Promise<void>((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        document.head.appendChild(link);
      });
    };

    const initLive2D = async () => {
      try {
        console.log("开始初始化Live2D...");
        
        // 加载CSS
        console.log("加载CSS...");
        await loadCSS("/luotianyi-live2d/live2d/css/live2d.css");
        console.log("CSS加载完成");
        
        // 加载jQuery（live2d.js可能依赖）
        console.log("加载jQuery...");
        await loadScript("https://cdn.bootcss.com/jquery/2.2.4/jquery.min.js");
        console.log("jQuery加载完成");
        
        // 加载必要的脚本
        console.log("加载live2d.js...");
        await loadScript("/luotianyi-live2d/live2d/js/live2d.js");
        console.log("live2d.js加载完成");
        
        console.log("加载message.js...");
        await loadScript("/luotianyi-live2d/live2d/js/message.js");
        console.log("message.js加载完成");
        
        // 等待脚本加载完成
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 检查是否已经初始化过
        if (document.getElementById("landlord")) {
          console.log("Live2D已经初始化过");
          return;
        }

        // 创建Live2D容器 - 按照live2d.html中的示例
        console.log("创建Live2D容器...");
        const live2dContainer = document.createElement("div");
        live2dContainer.id = "landlord";
        // 覆盖CSS中的left: 30px，设置为右侧
        live2dContainer.style.left = 'auto';
        live2dContainer.style.right = '0px';
        
        // 创建消息元素
        const messageDiv = document.createElement("div");
        messageDiv.className = "message";
        messageDiv.style.opacity = "0";
        
        // 创建canvas元素
        const canvas = document.createElement("canvas");
        canvas.id = "live2d";
        canvas.width = 280;
        canvas.height = 250;
        canvas.className = "live2d";
        
        // 创建音乐元素
        const musicDiv = document.createElement("div");
        musicDiv.id = "sing";
        
        // 创建隐藏按钮
        const hideButton = document.createElement("div");
        hideButton.className = "hide-button";
        hideButton.innerText = "隐藏";
        
        // 创建唱歌按钮
        const singButton = document.createElement("div");
        singButton.className = "sing-button";
        singButton.id = "sing-button";
        singButton.innerText = "Sing";
        singButton.onclick = () => {
          // 尝试调用getsong函数
          if (typeof window.getsong === "function") {
            window.getsong();
          }
        };
        
        live2dContainer.appendChild(messageDiv);
        live2dContainer.appendChild(canvas);
        live2dContainer.appendChild(musicDiv);
        live2dContainer.appendChild(hideButton);
        live2dContainer.appendChild(singButton);
        document.body.appendChild(live2dContainer);

        // 设置全局变量 - 按照live2d.html中的示例
        // @ts-ignore
        window.message_Path = '/luotianyi-live2d/live2d/';
        // @ts-ignore
        window.home_Path = window.location.origin + '/';
        
        console.log("设置全局变量完成");
        console.log("检查loadlive2d函数是否存在...");
        console.log("window.loadlive2d:", typeof window.loadlive2d);
        
        // 初始化Live2D - 使用README中的方式
        // @ts-ignore
        if (typeof window.loadlive2d === "function") {
          console.log("调用loadlive2d函数...");
          // @ts-ignore
          window.loadlive2d("live2d", "/luotianyi-live2d/live2d/model/tianyi/model.json");
          console.log("loadlive2d函数调用完成");
        } else {
          console.error("loadlive2d function not found");
        }

      } catch (error) {
        console.error("Failed to initialize Live2D:", error);
      }
    };

    // 延迟初始化，确保页面完全加载
    const timer = setTimeout(initLive2D, 3000);

    return () => {
      clearTimeout(timer);
      // 清理Live2D相关元素
      const container = document.getElementById("landlord");
      if (container) {
        container.remove();
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Live2D 测试页面</h1>
      <p>这个页面用于测试Live2D组件的加载和显示。</p>
      <p>请打开浏览器控制台查看加载日志。</p>
      <p>Live2D模型应该在页面右下角显示。</p>
    </div>
  );
}