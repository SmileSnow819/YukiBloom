---
title: 迅雷科技面经
link: xun-lei-ke-ji-mian-jing
date: 2025-12-09 19:30:00
cover: /img/cover/interview.jpg
description: 迅雷科技前端一面面经，主要考察原生 JS 操作 DOM，包括 CSS 选择器获取元素、获取页面所有图片等内容。
tags:
  - 迅雷科技
categories:
  - 面经
---

## 迅雷科技

### 面试时间

`2025_12.09-19:30`

### 面试内容

1. 自我介绍
2. 用 JS 写 CSS 选择器获取元素：获取 div 下面第二个 p 元素的第一个 a 标签的 `innerHTML`
3. 获取页面所有图片
4. 岗位技术栈较杂，不涉及 Vue/React，主要考察原生 JS 操作 DOM

### 代码示例

```javascript
const html = document.querySelector('div > p:nth-of-type(2) > a')?.innerHTML;
const images = Array.from(document.querySelectorAll('img'));
```
