---
title: "如何把MMD模型3D打印出来？"
date: "2026-09-20"
updatedAt: "2026-11-22"
category: "技术"
author: 歆橙
language: "zh-CN"
tags: ["MMD", "STL", "Blender", "3D打印", "建模"]
excerpt: "佬啊，佬啊，怎么是纸片er。。。布怼，不是纸片了"
coverImage: "/Blogabout/mmd-turnto-stl/cover.gif"
series: "打螺丝（划掉）金工实习"
seriesOrder: 2
---

## 背景

&emsp;&emsp;佬，嘿嘿，我亲爱的佬，嘿嘿嘿（发癫ing）

&emsp;&emsp;okr这个博主魔了，问题不大

## 正文

### 准备工作

准备以下东西：

1. **Blender**：下载就完事了，反正免费了，博主用的最新的5.2版本

2. **Cats Blender Plugin**：用来导入和处理 MMD 模型的插件。原版早就停更了（悲），博主用的是非官方维护版（逃

3. **一个 MMD 模型**：自己跑[模之屋](https://www.aplaybox.com/)里下载去

4. **拓竹软件** ：处理打印的玩意

5. **3D打印机**：白嫖学校的即可（）

### 安装 CATS 插件

1. 自行搜索下载对应 Blender 版本的压缩包（zip 格式，**不用解压**），网上一搜就有（确信

2. 打开 Blender，点左上角「编辑」→「偏好设置」→「插件」

3. 直接拖进去！

![安装CATS插件](/Blogabout/mmd-turnto-stl/1.png)

### 导入MMD模型

&emsp;&emsp;在 CATS 面板里找到「Import Model/导入模型」，选中自己准备好的 `.pmx` 文件就能导入。导入的尺寸后面再调

### 处理模型

&emsp;&emsp;导入进来一坨东西，其实不用全都要。导出 STL 只需要**网格**，所以：

1. 用 CATS 面板里的「Fix Model/修复MMD模型」按钮做一次修复，会有个警告，但是无视风险继续执行！顺便也可以点一下「Remove Rigidbodies and Joints/删除刚体和关节」

2. 把用不到的部件删掉（没有的就直接跳过a）

&emsp;&emsp;还是图片清楚，上图！

![如图](/Blogabout/mmd-turnto-stl/3.png)

3. 选中模型，按下快捷键S，输入倍率调整模型大小（或者手动调也行，取决于你想要的尺寸大小）

![这里看大小](/Blogabout/mmd-turnto-stl/4.png)

### 导出STL

1. 接下来选中要导出的模型

2. 点「文件」→「导出」→「STL」

![此处该有图](/Blogabout/mmd-turnto-stl/8.png)

3. 然后美美导出就完事了

### 切片打印

&emsp;&emsp;因为学校的3D打印机是拓竹的，所以切片软件选用Bambu Studio。博主趁着~~打螺丝~~金工实习能接触到3D打印机那肯定得使劲造啊（bushi

![切片预览](/Blogabout/mmd-turnto-stl/5.png)

&emsp;&emsp;剩下的支撑啥的自己微调吧，我这直接倒立洗头打印了（

![古 法 截 图](/Blogabout/mmd-turnto-stl/6.jpg)

![打印ing](/Blogabout/mmd-turnto-stl/7.mp4)

&emsp;&emsp;美美等着就完了（

## 成果图

<div class="image-grid image-grid-3-cols"><img src="/Blogabout/luoyao-zhoubian/完成.jpg" alt="小洛包" /><img src="/Blogabout/mmd-turnto-stl/9.jpg" alt="迪莫迪莫" /><img src="/Blogabout/mmd-turnto-stl/10.jpg" alt="一束花~" /></div>

&emsp;&emsp;孩子们，机不可失时不再来，3D打印的机会肥肠滴珍贵啊，于是乎额在模型广场找了另外俩模型打印出来了。小洛包那是因为模型广场莫得才被迫自己整的（逃

&emsp;&emsp;打印完了拿铲子铲小洛包的时候，被老师发现了，给我批了一顿（但老师并不知道我夹带了仨私货hhhhh）


