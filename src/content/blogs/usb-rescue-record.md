---
title: "“我不要，就这样~等到了惊蛰后盼霜降”"
date: "2026-10-25"
updatedAt: "2026-10-25"
author: 歆橙
category: "技术"
tags: ["崩溃", "数据恢复", "U盘", "DMDE", "RAW"]
excerpt: "U盘抢（划去）救援记录"
coverImage: "/Blogabout/usb-rescue-record/cover.jpg"
---

<!-- ========================= 聊天记录样式（写文章时无需改动） ========================= -->
<style>
  /* 聊天窗口外框 */
  .qc-window {
    max-width: 720px;
    margin: 24px auto;
    background: #ffffff;
    border: 1px solid #e3e6ea;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    color: #1f2329;
  }

  /* 顶部标题栏 */
  .qc-titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: #f7f8fa;
    border-bottom: 1px solid #e9ebef;
  }

  .qc-title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }

  .qc-sub {
    font-size: 12px;
    color: #8a9099;
  }

  /* 消息滚动区 */
  .qc-body {
    padding: 16px 16px 24px;
    background: #f2f3f5;
  }

  /* 居中的时间分隔 */
  .qc-time {
    margin: 10px 0 14px;
    text-align: center;
    font-size: 12px;
    color: #9aa0a6;
    line-height: 1.4;
  }

  /* 居中的系统提示（入群、撤回等） */
  .qc-system {
    display: flex;
    justify-content: center;
    margin: 8px 0 16px;
  }

  .qc-system span {
    padding: 3px 9px;
    border-radius: 4px;
    background: #e6e8eb;
    color: #8a9099;
    font-size: 12px;
    line-height: 1.5;
  }

  /* 大表情：不套气泡，直接放大 emoji 或 GIF */
  .qc-sticker {
    padding: 2px 0;
    font-size: 52px;
    line-height: 1;
  }

  /* 覆盖文章图片组件附加的圆角、阴影与边距 */
  .qc-window .qc-sticker img {
    width: auto;
    height: auto;
    max-width: 140px;
    max-height: 140px;
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    display: block;
  }

  /*
    软件对比表格：内容居中、按列竖排。
    选择器限定在 .min-w-full 上，只作用于 Markdown 渲染出的表格
    （BlogMarkdownBase 的 table 组件固定加了这个类），
    避免 style 标签里的全局 table th / td 规则污染页面上的其他表格。
    注意：CSS 注释里不要再出现尖括号包起来的标签名，服务端与客户端
    对这段文本的转义方式不一致，会触发 hydration 不匹配。
  */
  table.min-w-full th,
  table.min-w-full td {
    text-align: center !important;
    white-space: normal !important;
    vertical-align: middle;
    padding: 12px 10px !important;
  }

  table.min-w-full img {
    width: auto !important;
    height: auto !important;
    max-width: 100% !important;
    max-height: none !important;
    margin: 6px auto !important;
    border-radius: 8px !important;
    box-shadow: none !important;
  }

  /* QQ 功能提示条（宠物能量值等） */
  .qc-notice {
    margin: 14px 0;
    text-align: center;
    font-size: 12px;
    color: #8a9099;
    line-height: 1.5;
  }

  .qc-notice span {
    color: #0099ff;
  }

  /* 一条消息：头像 + 气泡 */
  .qc-msg {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 16px 0;
  }

  /* 圆形头像：裁剪成圆形的图片 */
  .qc-avatar {
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    background: #e6e8eb;
    user-select: none;
  }

  /* 提高优先级，覆盖文章图片组件自动附加的 my-4 / h-auto 等类 */
  .qc-window .qc-avatar img {
    width: 100%;
    height: 100%;
    margin: 0;
    border-radius: 50%;
    box-shadow: none;
    display: block;
    object-fit: cover;
  }

  /* 隐藏文章图片组件根据 alt 自动生成的图注 */
  .qc-window .qc-avatar em {
    display: none;
  }

  .qc-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 76%;
  }

  /* 气泡本体，::before 画出小三角 */
  .qc-bubble {
    position: relative;
    max-width: 100%;
    padding: 9px 12px;
    background: #ffffff;
    border: 1px solid #e6e8eb;
    border-radius: 10px;
    font-size: 14px;
    line-height: 1.65;
    word-break: break-word;
  }

  .qc-bubble::before {
    content: "";
    position: absolute;
    top: 14px;
    left: -6px;
    width: 0;
    height: 0;
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-right: 6px solid #ffffff;
  }

  /* 自己发送的消息靠右，气泡为蓝色 */
  .qc-msg-self {
    justify-content: flex-end;
  }

  .qc-msg-self .qc-main {
    align-items: flex-end;
  }

  .qc-msg-self .qc-bubble {
    background: #cfe8ff;
    border-color: #b9dcff;
  }

  .qc-msg-self .qc-bubble::before {
    left: auto;
    right: -6px;
    border-right: 0;
    border-left: 6px solid #cfe8ff;
  }

  /* 深色主题适配 */
  .dark .qc-window {
    background: #23272d;
    border-color: #343941;
    color: #e6e8eb;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }

  .dark .qc-titlebar {
    background: #2a2e35;
    border-bottom-color: #383d45;
  }

  .dark .qc-sub,
  .dark .qc-time {
    color: #9aa0a6;
  }

  .dark .qc-body {
    background: #1c2026;
  }

  .dark .qc-system span {
    background: #2a2e35;
    color: #9aa0a6;
  }

  .dark .qc-notice {
    color: #9aa0a6;
  }

  .dark .qc-bubble {
    background: #2a2e35;
    border-color: #3a3f47;
  }

  .dark .qc-bubble::before {
    border-right-color: #2a2e35;
  }

  .dark .qc-msg-self .qc-bubble {
    background: #1e4d78;
    border-color: #2a5f92;
    color: #ffffff;
  }

  .dark .qc-msg-self .qc-bubble::before {
    border-left-color: #1e4d78;
  }
</style>

# 萨 拉 热 窝 事 件

&emsp;&emsp;事情是这样的：

<!-- ========================= 聊天记录开始 ========================= -->
<!--
  使用方法：
  1. 改文案：直接改 qc-bubble 里的文字。
  2. 加消息：复制一整段 <div class="qc-msg">...</div>；
     自己发的加 qc-msg-self（头像放在文字后面），对方发的头像放在文字前面。
  3. 改昵称/状态：改 qc-title 与 qc-sub。
  4. 加时间线：复制一行 <div class="qc-time">...</div>。
  注意：这段 HTML 中间不要留空行，否则会被 Markdown 当成代码块。
-->
<div class="qc-window">
  <div class="qc-titlebar">
    <span class="qc-title">鸽子</span>
    <span class="qc-sub">请勿打扰</span>
  </div>
  <div class="qc-body">
    <div class="qc-time">2026/10/23 18:13</div>
    <div class="qc-msg qc-msg-self">
      <div class="qc-main">
        <div class="qc-bubble">有种不好的预感</div>
      </div>
      <div class="qc-avatar">
        <img src="/Blogabout/blogs-crash-diary/touxiang1.jpg" alt="我" loading="lazy" decoding="async">
      </div>
    </div>
    <div class="qc-time">2026/10/23 18:16</div>
    <div class="qc-msg qc-msg-self">
      <div class="qc-main">
        <div class="qc-bubble">丸辣</div>
      </div>
      <div class="qc-avatar">
        <img src="/Blogabout/blogs-crash-diary/touxiang1.jpg" alt="我" loading="lazy" decoding="async">
      </div>
    </div>
    <div class="qc-msg qc-msg-self">
      <div class="qc-main">
        <div class="qc-sticker"><img src="/Blogabout/usb-rescue-record/1.gif" alt="" loading="lazy" decoding="async"></div>
      </div>
      <div class="qc-avatar">
        <img src="/Blogabout/blogs-crash-diary/touxiang1.jpg" alt="我" loading="lazy" decoding="async">
      </div>
    </div>
    <div class="qc-msg qc-msg-self">
      <div class="qc-main">
        <div class="qc-bubble">忘带电脑充电线了</div>
      </div>
      <div class="qc-avatar">
        <img src="/Blogabout/blogs-crash-diary/touxiang1.jpg" alt="我" loading="lazy" decoding="async">
      </div>
    </div>
    <div class="qc-msg qc-msg-self">
      <div class="qc-main">
        <div class="qc-bubble">带了块大地板砖回家</div>
      </div>
      <div class="qc-avatar">
        <img src="/Blogabout/blogs-crash-diary/touxiang1.jpg" alt="我" loading="lazy" decoding="async">
      </div>
    </div>
    <div class="qc-notice">今天聊天超过 10 条，可获得新宠物能量值 <span>立即领取</span></div>
    <div class="qc-msg">
      <div class="qc-avatar">
        <img src="/Blogabout/blogs-crash-diary/gezianhao.jpg" alt="鸽子" loading="lazy" decoding="async">
      </div>
      <div class="qc-main">
        <div class="qc-sticker"><img src="/Blogabout/usb-rescue-record/2.gif" alt="" loading="lazy" decoding="async"></div>
      </div>
    </div>
  </div>
</div>
<!-- ========================= 聊天记录结束 ========================= -->

&emsp;&emsp;既然充电器没带，那么电脑里的东西要转移到家里的台式机上。

&emsp;&emsp;最方便的就是U盘转移了。起初无逝发生，非常良好，花了半个多小时就把本项目拷到U盘上了（不用GitHub拉取的原因是GitHub上文件不全，有好多被gitignore了），兴许是拷完了有点急，直接拔出来了没有安全弹出，结果插到台式机上显示：

![U盘变成RAW格式，无法访问](/Blogabout/usb-rescue-record/1.png)

&emsp;&emsp;用chkdsk检查了一下U盘

```cmd
C:\Users\admin>chkdsk D: /f
文件系统的类型是 RAW。
CHKDSK 无法供 RAW 驱动器使用。
```

# 无论遇到什么困难。。。

&emsp;&emsp;孩子们没招了，恢复呗，找了六个软件：

## 有点用处，但是不多

| DiskGenius | DMDE |
| :---: | :---: |
| ![DiskGenius 扫描出十万多个文件](/Blogabout/usb-rescue-record/1-1.png) | ![DMDE 列出能恢复的项目文件](/Blogabout/usb-rescue-record/3-1.png) |
| ![DiskGenius 恢复要买专业版](/Blogabout/usb-rescue-record/1-2.png) | 也有限制，特麻烦 |

## 寄，嘛都没扫出来啊

| testdisk | R-Linux | Windows File Recovery | Power Data Recovery |
| :---: | :---: | :---: | :---: |
| ![testdisk 没扫出文件](/Blogabout/usb-rescue-record/2-1.png) | ![R-Linux 不支持这个分区](/Blogabout/usb-rescue-record/4-1.png) | ![Windows File Recovery 扫不出结果](/Blogabout/usb-rescue-record/5-1.png) | ![Power Data Recovery 没扫出文件](/Blogabout/usb-rescue-record/6-1.png) |

&emsp;&emsp;这些是动用了各种方式淘到的恢复软件（AI搜索，搜索引擎，py交易），要么就是能扫出来但是不免费，要么就是免费但是扫不出来，逆天了

# 我不要，就这样——

&emsp;&emsp;其实里面最重要的文件已经恢复（课上的成品），但是我还想更进一步——把所有的文件全部~~抢~~救回来（没错就是本博客项目的拷贝）

&emsp;&emsp;身为资深白嫖党，能不花钱就不花钱（我嘞个整个pro版本要200多米，太贵了（其实一块钱我也不想花））

&emsp;&emsp;我瞄准了DMDE，虽然免费版有导出限制，但不像坑人的DiskGenius有64kb的限制，它的限制是单文件夹/4000文件，理论上有足够的时间就能白嫖的方式导出所有文件。

&emsp;&emsp;手动是不可能手动的，让AI大人给我写一个脚本，模拟手动导出。

&emsp;&emsp;先把我的损坏的U盘用DMDE导出镜像，幸亏家里台式机磁盘空间大，一锅装的下。。。（

![DMDE 导出整个磁盘的镜像](/Blogabout/usb-rescue-record/Mirror.png)

&emsp;&emsp;然后，用AI大人对着这个镜像哐哐训练，熟悉DMDE软件的操作和弹窗，最后也是有点效果（？），挺不稳定的，老是出错

&emsp;&emsp;最后肯定可以修复出数据的（理论上），至于效率。。。慢到发指，我这等了一个小时就还没搞完一个文件夹，果断放弃

# 我想静静了。。。

&emsp;&emsp;真要等脚本给我导出来，黄花菜都凉了a，只能另辟蹊径了

&emsp;&emsp;本来我想让AI大人继续帮我优化脚本的，但是吧逆天AI大人对着我的损坏镜像一同捣鼓，结果就这么给我把文件从镜像里直接抠出来了？！

&emsp;&emsp;我这之前捣鼓一天两夜那算啥啊

![对着它发呆](/Blogabout/usb-rescue-record/hyw.png)

![AI 把文件全部找了回来](/Blogabout/usb-rescue-record/ok.png)

&emsp;&emsp;道心破碎，卒

# 霜降战神计划破产（雾）

&emsp;&emsp;盼来了霜降，同时U盘也是在这一天炸的23333，本来打算好好整整我这小博客的（哦悲）

&emsp;&emsp;一天两夜的成果：[GitHub：XinChengP/Free-Dmde](https://github.com/XinChengP/Free-Dmde)

&emsp;&emsp;收录了吭哧吭哧一天两夜干出来的脚本和AI大人用于恢复的脚本

&emsp;&emsp;血的教训啊孩子们，以后用U盘啥的一定要安全弹出再拔下来。得亏我这平时不用U盘，里面没有非常重要的文件，恢复的需求没那么大，我才有心情搞这个玩意o(╥﹏╥)o

