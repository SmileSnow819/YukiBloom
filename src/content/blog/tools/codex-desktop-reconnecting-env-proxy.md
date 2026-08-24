---
title: Codex 每次启动都卡在 Reconnecting｜正在重新连接 5/5？
link: codex-desktop-reconnecting-env-proxy-fix
catalog: true
date: 2026-08-24 12:00:00
description: 转载整理：Codex Desktop 每次启动都 Reconnecting 5 次但最后又能正常使用时，可以通过配置 ~/.codex/.env 让 HTTP、HTTPS 与 WebSocket 相关请求正确走本机代理。
tags:
  - Codex
  - WebSocket
  - 代理
  - env
categories:
  - 转载
cover: /img/cover/tools.webp
---

> 转载整理说明：本文整理自知乎文章 [Codex 每次启动都卡在 Reconnecting｜正在重新连接 5/5？](https://zhuanlan.zhihu.com/p/2042568458395726918)，仅保留 `.env` 代理配置这一种方法，方便快速排查 Codex Desktop 一直 `Reconnecting` 的问题。

## Codex 快速修复提示词

可以直接把下面这段发给 Codex：

```text
帮我修复 Codex Desktop 一直 Reconnecting 的问题。

请定位我本机正在使用的代理端口和代理协议，然后创建或更新 ~/.codex/.env，写入以下代理配置。不要写死 7890，请替换成实际端口；如果文件已经存在，保留其他配置。

HTTP_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
HTTPS_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
ALL_PROXY="socks5h://127.0.0.1:<SOCKS5 或 mixed 端口>"
NO_PROXY="localhost,127.0.0.1,::1"
```

## 问题现象

最近使用 Codex Desktop 时，可能会遇到一个很烦的问题：每次启动或者第一次提问时，都会先出现多次重连。

典型表现是：

```text
Reconnecting... 1/5
Reconnecting... 2/5
Reconnecting... 3/5
Reconnecting... 4/5
Reconnecting... 5/5
```

最迷惑的是，它最后并不是完全不能用。通常是先卡住一会儿，等几轮重连结束后，又突然能正常回答。

这种情况很容易误判成：

1. 模型响应慢。
2. 账号异常。
3. OpenAI 服务不稳定。
4. Codex Desktop 自己坏了。
5. 代理软件没打开。

但很多时候，更可能是 **代理环境没有被 Codex Desktop 正确读取**，导致部分连接没有走到本机代理。

## 为什么配置 .env 有用？

在代理环境中，一个常见问题是：浏览器或普通 HTTPS 请求可以正常访问，但终端应用、桌面应用或 WebSocket 相关连接不一定自动继承系统代理。

于是就会出现这种现象：

1. Codex Desktop 启动后尝试建立连接。
2. 某些连接没有正确走代理。
3. 前面几次表现为 `Reconnecting`。
4. 后面又通过其他方式恢复，所以看起来像“先失败几次，再突然成功”。

配置 `~/.codex/.env` 的目的，就是在 Codex 启动时明确告诉它本机代理地址。

也就是说，不再依赖系统代理是否被正确继承，而是直接写明：

```text
HTTP 请求走哪里
HTTPS 请求走哪里
SOCKS5 请求走哪里
哪些本地地址不要走代理
```

## 配置文件位置

macOS / Linux：

```text
~/.codex/.env
```

Windows：

```text
C:\Users\你的用户名\.codex\.env
```

Windows 用户要注意，文件名必须是：

```text
.env
```

不要变成：

```text
.env.txt
```

如果系统隐藏了文件后缀，看起来可能像 `.env`，实际却是 `.env.txt`，这种情况不会生效。

## 配置内容

在 `~/.codex/.env` 中写入：

```bash
HTTP_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
HTTPS_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
ALL_PROXY="socks5h://127.0.0.1:<SOCKS5 或 mixed 端口>"
NO_PROXY="localhost,127.0.0.1,::1"
```

这里不要直接照抄端口，一定要换成自己代理软件里的实际端口。

如果用的是 Clash，常见 HTTP / Mixed 端口可能是：

```bash
HTTP_PROXY="http://127.0.0.1:7890"
HTTPS_PROXY="http://127.0.0.1:7890"
ALL_PROXY="socks5h://127.0.0.1:7890"
NO_PROXY="localhost,127.0.0.1,::1"
```

如果用的是 v2rayN，常见 HTTP 端口可能是：

```bash
HTTP_PROXY="http://127.0.0.1:10809"
HTTPS_PROXY="http://127.0.0.1:10809"
ALL_PROXY="socks5h://127.0.0.1:10808"
NO_PROXY="localhost,127.0.0.1,::1"
```

具体端口以自己代理软件界面显示为准。

## 如何定位本机代理端口？

可以优先打开代理软件设置页查看：

1. HTTP 代理端口
2. Mixed 端口
3. SOCKS5 端口

如果是 Clash 类客户端，通常会显示：

```text
HTTP Port
SOCKS Port
Mixed Port
```

如果有 Mixed Port，可以优先把 `HTTP_PROXY` 和 `HTTPS_PROXY` 都指向 Mixed Port。

`ALL_PROXY` 可以指向 SOCKS5 端口；如果只有 Mixed Port，也可以先指向 Mixed Port。

## 如果 .env 已经存在怎么办？

不要直接覆盖整个文件。

应该保留原来的其他配置，只新增或更新这几行：

```bash
HTTP_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
HTTPS_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
ALL_PROXY="socks5h://127.0.0.1:<SOCKS5 或 mixed 端口>"
NO_PROXY="localhost,127.0.0.1,::1"
```

如果已有旧的代理配置，就把旧端口改成当前代理软件正在使用的端口。

## 配置完成后

保存 `~/.codex/.env` 后，重启 Codex Desktop。

如果问题确实是代理环境变量没有被正确读取，那么重启后，启动阶段的 `Reconnecting... 1/5` 到 `5/5` 通常会明显减少，或者直接消失。

## 总结

如果 Codex Desktop 每次启动都先出现：

```text
Reconnecting... 1/5
Reconnecting... 2/5
Reconnecting... 3/5
Reconnecting... 4/5
Reconnecting... 5/5
```

但最后又能正常回答，那么可以优先怀疑代理环境没有被 Codex 正确读取。

这时最直接的修复方式就是创建或更新：

```text
~/.codex/.env
```

并写入：

```bash
HTTP_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
HTTPS_PROXY="http://127.0.0.1:<HTTP 或 mixed 端口>"
ALL_PROXY="socks5h://127.0.0.1:<SOCKS5 或 mixed 端口>"
NO_PROXY="localhost,127.0.0.1,::1"
```

关键点只有一个：**不要写死端口，要写自己本机代理软件真实正在监听的端口。**
