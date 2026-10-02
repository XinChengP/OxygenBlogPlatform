---
title: "搓了一个DXF转G代码的小工具"
date: "2026-09-19"
updatedAt: "2026-09-19"
category: "技术"
author: 歆橙
language: "zh-CN"
tags: ["CNC", "G代码", "Python", "CAD", "开源", "机械"]
excerpt: "《论为了偷懒而能想出的10086种方法》"
coverImage: "/Blogabout/gcode-generation-tool/cover.png"
---

# 写在前面

&emsp;&emsp;本项目旨在~~减少~~省去自己手敲G代码的时间

> 本项目铣床加工完美实现

- ps：ai给我生成的封面还真不错啊

# 正文

## 项目介绍

- 项目地址：[G-code-generation-tool](https://github.com/XinChengP/G-code-generation-tool)

- 应用场景：将CAD图纸转换为G代码（只用到G00/01/02/03指令），用于CNC机床的加工

## 使用方式

1. 下载项目代码

2. 将CAD图纸另存为DXF格式（DWF也彳亍，但是可能会出现尺寸方面的问题）

3. 将DXF文件拖到项目目录的“input”文件夹中，双击运行“convert_all.bat”，等待转换完成
   - 另：单个文件也可以直接拖到“convert.bat”文件上
   - 另另：若有现成的G代码文件，也可以拖到“preview.bat”文件上生成两张预览图

4. 转换完成后，G代码文件会生成在“gcode”文件夹中，也会生成对应的两张预览图在"preview"文件夹中

## 注意事项

&emsp;&emsp;最好用单线字体，博主是用的txt.shx和大字体hztxt.shx，然后再用CAD指令TXTEXP将字拆分成线

# 预览

<div class="image-grid image-grid-2-cols"><img src="/Blogabout/gcode-generation-tool/input.png" alt="输入文件" /><img src="/Blogabout/gcode-generation-tool/preview.png" alt="预览图" /></div>

&emsp;&emsp;图一是CAD文件图纸，图二是转换后的预览图

# 实际成果

<div class="image-grid image-grid-4-cols"><img src="/Blogabout/gcode-generation-tool/lao_tuzhi.png" alt="输入文件" /><img src="/Blogabout/gcode-generation-tool/lao_cutting.png" alt="预览图-仅削切轨迹" /><img src="/Blogabout/gcode-generation-tool/lao_full.png" alt="预览图-完整轨迹" /><img src="/Blogabout/gcode-generation-tool/lao.jpg" alt="成果图" /></div>

&emsp;&emsp;图一是CAD文件图纸，图二图三是预览图，图四是成果图awa

> 赛博签名（确信

# 写在最后

&emsp;&emsp;本篇博客只是对该转换工具的简单介绍，具体开发过程会在另一篇博客文章中详细介绍awa

&emsp;&emsp;[另一篇文章の占位](#)
