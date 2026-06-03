---
title: "如何用腾讯应用宝安装第三方app"
date: "2026-06-03"
category: "技术"
tags: ["腾讯应用宝", "安装", "第三方app", "技术", "app"]
author: "歆橙"
language: "zh-CN"
excerpt: "万恶の资本家，要么就是不上架，要么就是有风险，****诗人吗"
coverImage: "/Blogabout/qq-appstore-install/cover.webp"
---

# 如何用腾讯应用宝安装第三方app

## 背景

因为我穷的一批，~~买不起~~刚在Steam上上架的DL
所以在今天，就打算把我手机上的~~DL学习版~~放到电脑上
（用学习版是因为被广告折磨到爆炸）
然后就扔到应用宝上给我安装
好家伙，手机上给我报有病毒
但起码还能安装
密码的应用宝直接给我打回去了是吧

![忽略一下后面安装好了的DL（逃）](/Blogabout/qq-appstore-install/1.png)

## 解决方案

在网上搜了一圈，没找到有啥好的解决方案
于是自己翻了翻应用宝的说明文档
还真给预留出了解决方案

1. 打开应用宝

如图，之后会出现“开发者模式”

<div class="image-grid image-grid-2-cols"><img src="/Blogabout/qq-appstore-install/2.png" alt="如图" /><img src="/Blogabout/qq-appstore-install/3.png" alt="如图" /></div>

打开后可能让重启应用宝（？），我也忘了，最好重启一下

2. 打开应用宝安装目录

没啥好说的，直接上图

![](/Blogabout/qq-appstore-install/4.png)

找到含有“adb.exe”的文件夹
一般都是在“安装目录\Androws\Application\5.10.6200.6001”里（最后面的数字应该是应用宝的版本号，按你自己的实际情况来）

![如图](/Blogabout/qq-appstore-install/5.png)

3. 打开命令提示符

在这个文件夹里打开cmd
或者也可以Win+R，输入cmd，然后再cd到这个文件夹里，都可以

![如图](/Blogabout/qq-appstore-install/6.png)

4. 输入命令

依次输入以下命令

```cmd
adb.exe connect 127.0.0.1:5555  # 注释：连接到引擎环境
```
```cmd
adb -s 127.0.0.1:5555 install W:\base.apk  # 注释：安装apk
```
```cmd
Androws.exe --launch-pkg-name com.cmplay.dancingline # 注释：启动包名对应的app
```
![](/Blogabout/qq-appstore-install/7.png)
![输入第三个命令后稍等一会，就会启动了](/Blogabout/qq-appstore-install/8.png)

稍等一会后...

![启动！](/Blogabout/qq-appstore-install/9.png)

5. 其他

启动之后桌面应该会自动创建对应的快捷方式
也可以通过应用宝来启动

<div class="image-grid image-grid-2-cols"><img src="/Blogabout/qq-appstore-install/10.png" alt="如图" /><img src="/Blogabout/qq-appstore-install/11.png" alt="如图" /></div>

实在没有的话emmmm
自己看应用宝说明文档去吧（逃）

## 参考资料

https://wikinew.open.qq.com/index.html#/iwiki/4009021799
