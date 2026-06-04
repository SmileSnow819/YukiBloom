---
title: 携程集团面经
date: 2026-06-04 14:00:00
link: xie-cheng-ji-tuan-mian-jing-2
cover: /img/cover/interview.jpg
description: 携程前端面经。重点复盘：React Hooks 与 forwardRef 场景、CJS 与 ESM 的变量导出机制（值拷贝与动态引用）、Flex 布局核心（flex:1 vs auto）、CSS Animation 完全指南。
tags:
  - 携程集团
  - 面经
  - React
  - CSS
categories:
  - 面经
---

## 携程集团

### 面试时间

`2026_0604-14:00`

### 面试内容

1. 介绍你的项目，包括使用方和使用场景是什么？
2. 是否仍在快手实习？
3. 询问跨域 iframe 实时预览功能。
4. 解释一下 React Hooks
5. 是否了解 React 都 forwardRef？
6. 事件循环
7. 事件循环输出题
8. 解释 HTTP 缓存机制
9. 协商缓存 ETag 和 Last-Modified 的区别。
10. 请说明 CommonJS 和 ES6 Module 在变量作用域上的主要区别。
11. 请解释 Flex 布局的基本概念
12. 说明 flex: 1 是哪些属性的简写？
13. flex: auto 是哪些属性的简写？
14. 是否了解 openSpec
15. 页面性能优化
16. 怎么实现图片懒加载
17. css 动画
18. animation 的具体使用
19. AI 相关内容的讨论
20. 业务方面（旅游门票）

---

## 面试复盘总结（核心问题精讲）

### 1) React Hooks 与 `forwardRef`（Q4, Q5）

#### 解释 React Hooks

Hooks 出现的核心目的是解决**函数组件没有状态（State）和生命周期**的问题。
它让函数组件能够“钩入” React 的状态管理和副作用处理机制（如 `useState`、`useEffect`），同时解决了类组件（Class Component）中 `this` 指向混乱、生命周期逻辑割裂（同一个业务逻辑被拆分到 `DidMount` 和 `DidUpdate` 中）以及逻辑复用困难（只能靠高阶组件 HOC 或 Render Props 导致嵌套地狱）的问题。

#### 为什么需要 `forwardRef`？

- **痛点**：在 React 中，`ref` 不能作为普通的 `props` 往下传。如果你给一个自定义函数组件传 `ref`，React 会直接报错，因为函数组件没有实例。
- **作用与代码演示**：`forwardRef` 用来包裹函数组件，把父组件传进来的 `ref` 拦截下来，传给内部节点。最佳实践是配合 `useImperativeHandle`，只暴露特定方法给父组件，而不是暴露整个 DOM（避免破坏封装）。

```jsx
import { forwardRef, useImperativeHandle, useRef } from "react";

// 子组件：被 forwardRef 包裹，拦截 ref 并自定义暴露的方法
const MyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);

  // 只暴露 focus 和 clear 方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current.focus();
    },
    clear: () => {
      inputRef.current.value = "";
    },
  }));

  return <input ref={inputRef} placeholder="请输入..." />;
});

// 父组件：可以直接调用子组件暴露的方法
function Parent() {
  const myRef = useRef(null);

  return (
    <div>
      <MyInput ref={myRef} />
      <button onClick={() => myRef.current.focus()}>聚焦</button>
      <button onClick={() => myRef.current.clear()}>清空</button>
    </div>
  );
}
```

### 2) CommonJS 与 ES6 Module 的变量导出差异（Q10）

这是一道极为经典的模块化底层题：“假如模块里导出了一个数字 5，过一会儿模块内改成了 6，外部拿到的分别是多少？”

#### CommonJS (CJS) —— 值的浅拷贝

`module.exports` 导出的是一个对象的**浅拷贝**（类似按值传递）。

```javascript
// a.js (CommonJS)
let num = 5;
setTimeout(() => {
  num = 6;
}, 1000); // 1秒后内部改为 6
module.exports = { num };

// b.js
const a = require("./a.js");
console.log(a.num); // 输出 5

setTimeout(() => {
  console.log(a.num); // 2秒后再打印，依然是 5。因为 require 时复制了那一瞬间的值
}, 2000);
```

#### ES6 Module (ESM) —— 动态只读引用（Live Bindings）

`export` 导出的是一个**动态映射的内存地址引用**。外部拿到的值会随内部变化而动态变化，且该引用在外部是**只读**的。

```javascript
// a.mjs (ES6 Module)
export let num = 5;
setTimeout(() => {
  num = 6;
}, 1000); // 1秒后内部改为 6

// b.mjs
import { num } from "./a.mjs";
console.log(num); // 输出 5

setTimeout(() => {
  console.log(num); // 2秒后再打印，输出 6！动态绑定了 a.mjs 内存

  // num = 7; // 如果强行在外部修改，会抛错 TypeError: Assignment to constant variable
}, 2000);
```

### 3) Flex 布局：`flex: 1` vs `flex: auto`（Q11, Q12, Q13）

#### Flex 基本概念

Flexbox（弹性盒子）是一维布局模型，专门用于处理空间分布和对齐。它由**主轴（Main Axis）**和**交叉轴（Cross Axis）**构成，能自适应父容器的尺寸变化，解决传统浮动（float）布局中垂直居中困难、等高列难实现等问题。

#### `flex` 简写属性的秘密

`flex` 其实是三个属性的简写组合：

1. `flex-grow`: 放大比例（默认 0，不放大）。
2. `flex-shrink`: 缩小比例（默认 1，空间不足时会缩小）。
3. `flex-basis`: 分配多余空间之前，元素的基础大小（默认 auto，依据内容大小）。

#### 拆解代码演示：`flex: 1` vs `flex: auto`

假设我们有两个容器，分别放了不同长度的内容：

```html
<div class="parent">
  <div class="box a">短</div>
  <div class="box b">我是一段非常非常长的文本内容</div>
</div>

<style>
  .parent {
    display: flex;
    width: 600px;
    border: 1px solid #ccc;
  }
  .box {
    border: 1px solid red;
  }

  /* 场景1：绝对平分（无视内容） */
  .a,
  .b {
    flex: 1;
  }
  /* 结果：A 和 B 各占 300px，一模一样宽。
   原理：等同于 flex-basis: 0%，大家起点都是 0，直接把 600px 一分为二。*/

  /* 场景2：相对平分（尊重内容大小） */
  .a,
  .b {
    flex: auto;
  }
  /* 结果：B 会比 A 宽得多。
   原理：等同于 flex-basis: auto。系统先算出 A 和 B 文本原本的宽度，
   然后从 600px 中减去这两个原始宽度，剩下的空白区域再平分给 A 和 B。*/
</style>
```

### 4) CSS 动画与 `animation` 属性详解（Q17, Q18）

在 CSS 中实现动画通常分两步：**定义关键帧** 和 **调用动画属性**。

#### 第一步：定义 `@keyframes`

指定动画在不同百分比时间节点（0% 到 100%，或 from 到 to）的 CSS 状态。

#### 第二步：使用 `animation` 简写属性

`animation` 也是一个超级简写属性，面试时能把下面 8 个子属性说清楚，绝对加分：

```css
/* 顺序通常为：name | duration | timing-function | delay | iteration-count | direction | fill-mode | play-state */
animation: slideIn 2s ease-in-out 0.5s infinite alternate forwards running;
```

**拆解详解：**

1. **`animation-name`**：绑定的关键帧名称（如 `slideIn`）。
2. **`animation-duration`**：持续时间（如 `2s`）。
3. **`animation-timing-function`**：缓动曲线，决定速度节奏。常用 `linear` (匀速), `ease-in` (渐显加速), `cubic-bezier` (自定义贝塞尔曲线)。
4. **`animation-delay`**：动画延迟多久开始（如 `0.5s`）。
5. **`animation-iteration-count`**：播放次数，常用 `infinite`（无限循环）或具体数字。
6. **`animation-direction`**：播放方向。
   - `normal`（正向）
   - `reverse`（反向播放）
   - `alternate`（交替播放，比如去程正放，回程倒放，常用于呼吸灯/摇摆效果）。
7. **`animation-fill-mode`**（**非常重要，面试常考**）：动画结束（或等待期）的状态。
   - `forwards`：动画结束后，元素**停留在最后一帧**的状态。
   - `backwards`：动画延迟等待时，元素提前应用第一帧的状态。
   - `both`：同时应用上述两者。
8. **`animation-play-state`**：动画的运行状态。可以通过 JS 控制它为 `paused` 或 `running` 来实现悬停暂停动画的效果。
