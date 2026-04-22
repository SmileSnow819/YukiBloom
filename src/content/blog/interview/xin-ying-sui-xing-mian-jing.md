---
title: 心影随形面经
link: xin-ying-sui-xing-mian-jing
date: 2025-12-10 17:00:00
cover: /img/cover/interview.jpg
description: 心影随形前端一二面面经，一面考察事件循环和 Promise，二面考察官网设计、博客技术选型等问题。
tags:
  - 心影随形
categories:
  - 面经
---

## 心影随形

### 一面（12.09 15:00）

1. 项目介绍（重点在 Nuxt + SEO 方面）
2. 事件循环的过程
3. 用 Promise 实现 sleep 函数
4. 反问

### 二面（12.10 17:00）

1. 官网设计你会怎么考虑？（移动端适配、下载按钮、业务埋点如点击次数/完播率、性能监控如 PerformanceObserver API）
2. 官网博客系统如何进行技术选型
3. 想找一份怎么样的实习
4. 能实习多久
5. 反问

### 代码示例

```javascript
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```
