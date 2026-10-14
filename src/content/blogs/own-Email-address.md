---
title: "如何打造一个自定义域名邮箱"
date: "2026-10-14"
category: "技术"
author: 歆橙
language: "zh-CN"
tags: ["cloudflare", "email-routing", "域名邮箱", "dns", "教程"]
excerpt: "用自己域名搭建一个免费的域名邮箱"
coverImage: "/Blogabout/own-Email-address/cover.png"
---

# 如何打造一个自定义域名邮箱？

&emsp;&emsp;看着自己的雷霆大域名，心想着要物尽其用啊，于是乎搜了搜域名能有啥用，发现可以用来打整一个自定义域名邮箱，针不戳啊。

&emsp;&emsp;基于 Cloudflare Email Routing 搭建**接收型域名邮箱**，邮箱格式形如 `xxx@你的域名.com`
&emsp;&emsp;收到的邮件自动转发到你现有的 QQ 或者 163 邮箱。（例如本站@xinchengp.cn）qwq

## 原理简介（建议跳过，反正看了也没用（逃））

&emsp;&emsp;Cloudflare Email Routing（邮件路由）本质是一个**邮件转发服务**。

&emsp;&emsp;别人发送邮件到 xxx@xinchengp.cn → 邮件投递到 Cloudflare MX 服务器 → Cloudflare 自动转发到你的目标邮箱（如 QQ 邮箱）

&emsp;&emsp;优点：免费，可创建无限个邮箱别名；注册网站时可以为每个网站单独分配一个邮箱，方便追踪隐私泄露。

&emsp;&emsp;局限：默认**只能收邮件，不能直接用 @自定义域名向外发邮件**；想要实现得注册 Resend 账号，懒得写了（逃）

## 前置准备

1. 一个属于自己的域名，并将域名的 NS 服务器托管到 Cloudflare（即域名接入 CF，赛博活佛（bushi））。
2. 准备一个已有的接收邮箱（QQ 邮箱、163 邮箱均可，用来接收转发过来的邮件）。

> 不用爆金币，不用服务器，只要。。。（押不下去了23333）

## 开启 Cloudflare 邮件路由 & 基础 DNS 配置

&emsp;&emsp;1. 进入 Cloudflare 控制台，选中你的域名，在左侧菜单找到「电子邮件」→「邮件路由」。

&emsp;&emsp;2. 点击「设置」开启邮件路由，Cloudflare 会**自动**添加 MX、SPF、DKIM 三条核心 DNS 记录。

![MX、SPF、DKIM 记录](/Blogabout/own-Email-address/1.png)

    - MX 记录：告诉互联网，发给你域名的邮件应投递到 Cloudflare 邮件服务器（共 3 条 MX 记录，优先级不同，**不要删除**）。
    - SPF（TXT 记录）：用来验证邮件来源，授权 Cloudflare 处理你的邮件。
      示例：`v=spf1 include:_spf.mx.cloudflare.net ~all`
    - DKIM（TXT 记录）：对邮件进行加密签名，提升邮件可信度，降低进入垃圾箱的概率。

&emsp;&emsp;3. 添加目标转发地址：填入你的 QQ 邮箱，然后进入 QQ 邮箱点击验证链接，完成邮箱所有权校验。

![搞完了是这样的](/Blogabout/own-Email-address/2.png)

## 创建邮箱别名（自定义邮箱地址）

&emsp;&emsp;我是直接开启了全收（Catch-all）

1. 点「全收」那一行右边的三个点 → 编辑
2. 操作从「丢弃」改成 发送到电子邮件
3. 目标地址选择你已经验证好的 xxx@qq.com
4. 打开启用开关，保存

![完事是这样的](/Blogabout/own-Email-address/3.png)

&emsp;&emsp;当然，你也可以创建自定义邮箱别名，例如：github@xinchengp.cn、blog@xinchengp.cn。保存。

&emsp;&emsp;整完了记得自己发个邮件测试一下qwq，确保可以正常收到邮件。

![测试邮件](/Blogabout/own-Email-address/4.png)

## DMARC 防伪造配置（重要安全项）

&emsp;&emsp;DMARC 用来防止别人伪造你的域名发送钓鱼垃圾邮件，记录写在 **_dmarc.你的域名** 这条 TXT 记录里。

&emsp;&emsp;一共有三档策略：

1. **p=none（监控模式,博主目前用的这个）**

&emsp;&emsp;仅收集邮件报告发送到你的邮箱，**不会拦截任何邮件**，不会误杀验证码邮件，适合刚搭建的观察期。

`v=DMARC1; p=none; rua=mailto:xxx@qq.com`

2. **p=quarantine（温和防护）**

&emsp;&emsp;验证失败的伪造邮件，投递到对方垃圾箱。

`v=DMARC1; p=quarantine; rua=mailto:xxx@qq.com`


3. **p=reject（最强防护）**

&emsp;&emsp;验证失败的伪造邮件直接拒收。适合长期稳定、确定不会用该域名对外发信时开启。

`v=DMARC1; p=reject; rua=mailto:xxx@qq.com`

![DMARC 记录](/Blogabout/own-Email-address/5.png)

## 最后（捣鼓的发送邮件）

ps：以前发的忘记截图了，重发了一个（

<div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin: 24px 0;">
  <div style="flex: 1 1 0; min-width: 0;">
    <img src="/Blogabout/own-Email-address/6.png" alt="发邮件" />
  </div>
  <div style="flex: 1 1 0; min-width: 0;">
    <img src="/Blogabout/own-Email-address/7.png" alt="收到邮件" />
  </div>
</div>
