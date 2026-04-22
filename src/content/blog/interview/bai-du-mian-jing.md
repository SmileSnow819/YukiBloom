---
title: 百度面经
link: bai-du-mian-jing
date: 2026-02-28 19:00:00
cover: /img/cover/interview.jpg
description: 百度前端一面面经，考察代码输出题、BFC、事件循环、浏览器 URL 过程、回流重绘、闭包、pnpm 幻影依赖，手撕反转链表。
tags:
  - 百度
categories:
  - 面经
cover: /img/cover/interview.jpg
---

## 百度

### 面试时间

`2026_0228-19:00`

### 面试内容

1. 自我介绍
2. 代码输出题（CSS 垂直高度、this 指向、Promise + setTimeout、作用域链）
3. 是否了解 BFC
4. 讲事件循环
5. 浏览器输入 URL 发生了什么
6. 回流与重绘
7. 闭包
8. 项目难题与解决
9. 为什么项目使用 SSR
10. 平时怎么用 AI
11. 如何理解 rules
12. 手写类似百度搜索页（带分页，共享屏幕）
13. 为什么用 pnpm（提到幻影依赖）
14. 幻影依赖产生原理
15. 手撕：反转链表
16. 反问：学习建议

### 面试代码题

#### 🅐 CSS 垂直高度计算

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <style>
      p {
        font-size: 16px;
        line-height: 1;
        margin-top: 10px;
        margin-bottom: 15px;
      }
    </style>
  </head>
  <body>
    <p>aaa</p>
    <p></p>
    <p></p>
    <p></p>
    <p>bbb</p>
  </body>
</html>
```

> aaa 到 bbb 的垂直距离：相邻块级元素 margin 会发生折叠，取较大值。aaa 的 `margin-bottom: 15px`，中间空 `<p>` 自身高度为 0（line-height:1，无内容），其 margin-top 和 margin-bottom 也参与折叠。最终 aaa 与 bbb 之间所有 margin 合并，取最大值 `15px`。

#### 🅑 对象方法 + this 指向

```javascript
const obj = {
  fn1() {
    const fn = () => {
      console.log(this);
    };
    fn();
    fn.apply(window);
  },

  fn2() {
    function fn() {
      console.log(this);
    }
    fn();
    fn.apply(window);
  },
};

obj.fn1();
obj.fn2();
```

> - `obj.fn1()`：箭头函数没有自己的 this，捕获外层 fn1 的 this，即 `obj`；`fn.apply(window)` 无法改变箭头函数的 this，仍输出 `obj`。
> - `obj.fn2()`：普通函数直接调用，非严格模式下 this 为 `window`；`fn.apply(window)` 显式绑定，输出 `window`。

#### 🅒 Promise + setTimeout 执行顺序

```javascript
new Promise((res, rej) => {
  console.log(1);
  setTimeout(() => {
    console.log(2);
    res("success");
    console.log(3);
  }, 0);
}).then((res) => console.log(res));

console.log(4);
```

> 输出顺序：`1 → 4 → 2 → 3 → success`
> Promise executor 同步执行输出 1，setTimeout 进入宏任务队列，同步代码输出 4，宏任务执行输出 2，res 触发微任务，输出 3，微任务执行输出 success。

#### 🅓 作用域链

```javascript
const a = 10;

function fn() {
  const a = 20;
  test();
}

function test() {
  console.log(a);
}

fn();
```

> 输出：`10`。JS 采用词法作用域，`test` 函数在全局作用域定义，其作用域链在定义时确定，`console.log(a)` 查找的是全局的 `a = 10`，与调用位置无关。
