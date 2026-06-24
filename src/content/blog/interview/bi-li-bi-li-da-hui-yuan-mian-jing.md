---
title: 哔哩哔哩大会员面经
date: 2026-06-22 15:00:00
link: bi-li-bi-li-da-hui-yuan-mian-jing
cover: /img/cover/interview.jpg
description: 哔哩哔哩大会员前端一面面经，重点复盘 Schema 驱动表单联动、React 低代码表单局部更新、跨域 iframe 与多 Tab 通信、首屏性能优化以及倒计时 Hook。
tags:
  - 哔哩哔哩
  - 面经
  - 低代码
  - React
  - 性能优化
categories:
  - 面经
---

## 哔哩哔哩大会员前端一面

### 面试时间

`2026_0622-15:00`

### 面试内容

1. 自我介绍
2. 介绍实习相关项目
3. Schema 驱动表单的联动逻辑实现
4. Schema 底层是自己封装的，还是用了开源的？
5. 面对复杂场景的联动（如省份和市级联动，或自定义表单项联动），是如何解决的？
6. 当用户修改表单中的一个字段时，它的更新范围是什么？全量还是局部？
7. 在 React 中，一个字段对应一个 State 的更新，必然会造成组件或函数的 Re-render。在这种低代码架构中，是如何避免其他无关字段/组件跟着一起触发更新的？
8. 项目中跨域 iframe 的实时预览，跨域通信是用什么实现的？
9. 除了 `postMessage`，还了解哪些可以进行跨域通信的手段？
10. 如果浏览器同时开了 Tab A 和 Tab B（同源或跨窗口），想要在两个 Tab 页面之间进行通信，可以用哪些手段？
11. 详细聊聊在蓝色光标做的 MCP Server
12. 做 AI 相关工作主要用的语言是什么？用过 AI 框架吗？
13. 为什么在公司用 React，而个人/开源项目技术选型选择了 Vue 3（Nuxt 4）？
14. 前端做首屏加载速度优化有哪些常用策略？
15. 前端性能指标有了解过吗？
16. 手撕：倒计时 Hooks

---

## 面试复盘总结

### 1) Schema 驱动表单联动怎么设计？（Q3-Q5）

面试复盘话术：

> 快手内部根据业务场景会有不同的封装，但底层思想和主流的 Formily 或 react-hook-form 是一致的。由于我们要处理高频联动和极复杂的罚单 Schema 校验，所以核心引入了分布式/响应式的状态管理机制，来承载大表单的性能。

复杂联动最忌讳的是把逻辑硬编码在 React 组件里。比如省市联动、金额大写、动态显示隐藏，本质上都应该是 Schema 或表单引擎层描述规则，再由运行时引擎解释执行。

#### 表达式驱动

在 JSON Schema 里嵌入表达式，通过 `dependencies` 声明依赖字段，通过 `x-reactions` 描述联动结果。

```jsonc
{
  "type": "object",
  "properties": {
    "violationType": {
      "type": "string",
      "title": "违规类型",
    },
    "fineAmount": {
      "type": "number",
      "title": "罚款金额",
      "x-reactions": {
        "dependencies": ["violationType"],
        "fulfill": {
          "state": {
            "visible": "$deps[0] === 'SERIOUS_VIOLATION'",
          },
        },
      },
    },
  },
}
```

底层会有一个 Expression Compiler，可能基于安全版表达式求值器、轻量 AST 解析器，或沙箱化的函数执行。当依赖项 `violationType` 改变时，动态计算 `fineAmount` 的状态。

#### Effects 机制

另一种方式是采用类 RxJS / MobX 的流式监听，把复杂副作用放在表单引擎的 effects 区域。

```javascript
createForm({
  effects() {
    onFieldValueChange("province", (field) => {
      const cityValue = fetchCityByProvince(field.value);

      setFieldState("city", (state) => {
        state.dataSource = cityValue;
      });
    });
  },
});
```

这类方案适合处理异步数据源、跨字段重置、远程校验、自定义表单项联动。核心是让组件只负责渲染，让规则、依赖和副作用沉到表单运行时。

### 2) React 低代码表单怎么做到局部更新？（Q6-Q7）

传统 React 开发中，如果把整个大表单 `FormData` 放在顶层 `useState`，任何字段变化都会导致父组件重新执行，再让所有子字段进入一次渲染流程。低代码大表单不能这么做。

更合理的思路是 **状态去中心化 + 局部发布订阅**。

#### 策略一：FormStore + 字段级订阅

顶层组件只保留一个 `FormStore` 引用，它是普通 JS 实例，不是 React State。每个 `FormField` 挂载时订阅自己的字段路径。

```text
数据改变 -> FormStore.setValue(path, value) -> 通知订阅该 path 的 FormField -> 仅对应字段局部渲染
```

当用户修改“违规描述”时，Store 内部只更新纯 JS 数据，并精准通知订阅 `violationDescription` 的字段组件。没有订阅该路径的字段，比如罚款金额、审批人，不会被迫进入 React Render 周期。

#### 策略二：非受控组件 + Ref

以 react-hook-form 为代表的方案会尽量让输入框成为非受控组件。用户打字时，浏览器原生维护 DOM 输入状态，React 不为每次字符输入都 `setState`。

只有在提交、校验、`watch` 某个字段，或某个字段明确参与实时联动时，才精准读取和更新局部状态。这能把普通输入的 React 渲染次数从 O(n) 降到接近 0。

#### 策略三：Proxy 响应式拦截

以 Formily 类方案为代表，底层数据通常是可观察对象。组件首次渲染读取字段时完成依赖收集，字段变更触发 setter 后，只通知依赖了该字段的组件。

面试表达可以这样说：

> 我们没有把庞大的罚单 FormData 挂载在顶层 React State 中，而是设计或选用了独立的 FormStore。每个由 Schema 渲染出来的 FormField，在挂载时都会订阅 Store 中属于自己的 Field Path。当用户输入时，只修改 Store 内部的纯 JS 对象，并精准通知对应 Field 组件进行局部更新。对于省市联动等复杂联动，则通过 `x-reactions` 建立字段依赖图，在 Store 层完成计算和派发，避免无关字段渲染。

### 3) 跨域 iframe 除了 `postMessage` 还能怎么做？（Q8-Q9）

跨域 iframe 实时预览的首选方案通常是 `window.postMessage`。它是浏览器官方提供的跨窗口通信 API，支持结构化克隆，适合父页面和 iframe 在不同源之间传递预览数据、配置变化和操作事件。

除了 `postMessage`，还可以补充这些方案，但要讲清楚适用边界。

#### `document.domain`

只适合主域相同、子域不同的历史场景，比如 `a.bilibili.com` 和 `b.bilibili.com` 都设置：

```javascript
document.domain = "bilibili.com";
```

设置后，两个页面可以被视为同源，直接访问对方窗口对象。但该能力在现代浏览器中已经逐步不推荐使用，更多是作为历史方案理解。

#### `window.name + iframe`

`window.name` 在窗口生命周期内跨页面跳转仍会保留。域 A 可以创建 iframe 指向域 B，域 B 把数据写到 `window.name`，随后域 A 把 iframe 跳回同源空白页，再读取 `iframe.contentWindow.name`。

这种方案属于历史 Hack，不适合新业务优先选择，但能体现对浏览器隔离模型的理解。

#### `location.hash + iframe`

域 A 通过修改 iframe 的 URL hash 传递数据：

```text
https://domain-b.example/page#data
```

域 B 监听 `hashchange` 获取数据。反向通信则通常需要再通过一个同源中转 iframe 完成。

#### WebSocket / SSE 服务端中转

如果两个页面无法直接互通，可以让它们分别连接同一个后端通道。页面 A 把消息发给服务端，服务端再广播给页面 B。适合需要实时同步、多人协作或跨设备通信的场景。

### 4) 多 Tab 页面通信怎么回答？（Q10）

回答前要先区分：两个 Tab 是否同源。

如果是同源多 Tab，优先考虑以下方案。

#### BroadcastChannel

`BroadcastChannel` 是最直接的多 Tab 广播 API。同源页面创建同名频道后，就可以互相收发消息。

```javascript
const channel = new BroadcastChannel("bilibili_vip_channel");

channel.postMessage({ action: "RELOAD_CART" });

channel.onmessage = (event) => {
  console.log("收到其他页面通知：", event.data);
};
```

#### `localStorage` 的 `storage` 事件

同源任意 Tab 修改 `localStorage` 后，其他同源 Tab 会触发 `storage` 事件。

```javascript
localStorage.setItem(
  "msg_bridge",
  JSON.stringify({ text: "hi", time: Date.now() }),
);

window.addEventListener("storage", (event) => {
  if (event.key === "msg_bridge") {
    console.log("其他 Tab 修改了数据：", event.newValue);
  }
});
```

注意：触发写入的当前页面本身不会收到 `storage` 事件，只有其他页面能收到。

#### SharedWorker

多个同源 Tab 可以连接同一个 `SharedWorker`，把它当成浏览器里的小型消息中心。Tab A 通过 `port` 发消息给 Worker，Worker 再分发给所有连接的 Tab。

#### IndexedDB / Cookie + 轮询

这是兼容性兜底方案。Tab A 写入共享存储并带时间戳，Tab B 用 `setInterval` 定时读取，比对时间戳判断是否有新消息。实时性和性能都不如前面方案，但兼容面更广。

#### 跨域多 Tab：中介 iframe

如果 Tab A 和 Tab B 不同源，可以在两个页面里都嵌入同一个中介域的隐藏 iframe：

```text
Tab A -> postMessage -> iframe A
iframe A -> BroadcastChannel/localStorage -> iframe B
iframe B -> postMessage -> Tab B
```

外层跨域用 `postMessage`，内层中介 iframe 因为同源，可以使用 `BroadcastChannel` 或 `localStorage` 完成桥接。

### 5) 首屏加载速度优化和性能指标（Q14-Q15）

首屏优化可以从资源、渲染、网络和运行时几个方向展开。

1. **减少首屏关键资源体积**：代码分包、路由懒加载、Tree Shaking、移除无用依赖。
2. **提升关键资源加载优先级**：关键 CSS 内联，首屏图片用 `preload`，非关键资源延后加载。
3. **图片优化**：使用 WebP/AVIF、响应式图片、CDN 压缩、懒加载、LQIP 占位。
4. **SSR/SSG/ISR**：对首屏强依赖内容的页面，服务端或构建期直接输出 HTML，降低白屏时间。
5. **缓存策略**：静态资源长缓存 + hash，接口使用 HTTP 缓存或 CDN 边缘缓存。
6. **减少主线程阻塞**：拆分长任务，重计算放到 Worker，动画使用 transform / opacity，避免强制同步布局。
7. **字体优化**：`font-display: swap`，裁剪字体子集，避免字体阻塞文本显示。

常见性能指标：

- **FCP（First Contentful Paint）**：首次内容绘制，衡量页面从空白到出现内容的速度。
- **LCP（Largest Contentful Paint）**：最大内容绘制，衡量首屏主要内容加载完成时间，核心目标通常小于 2.5s。
- **INP（Interaction to Next Paint）**：交互到下一次绘制的延迟，衡量页面响应性。
- **CLS（Cumulative Layout Shift）**：累计布局偏移，衡量页面稳定性，图片和广告位未预留尺寸很容易导致 CLS。
- **TTFB（Time to First Byte）**：首字节时间，反映服务端响应和网络链路速度。
- **TBT（Total Blocking Time）**：总阻塞时间，反映长任务对主线程的占用。

### 6) 手撕倒计时 Hook（Q16）

```tsx
import { useEffect, useRef, useState, useCallback } from "react";

export function useCountdown(initialSeconds: number, immediate = false) {
  const [seconds, setSeconds] = useState(initialSeconds);

  // 1. 关键 Ref 机制：规避闭包陷阱 + 记录定时器 ID
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;

  const timerRef = useRef<number | null>(null);

  // 2. 封装清除定时器的核心逻辑（保证引用不变）
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 3. 核心控制函数：直接通过 timerRef 操控定时器
  const start = useCallback(() => {
    // 如果定时器已经在跑，或者秒数已经归零，则直接拦截
    if (timerRef.current !== null || secondsRef.current <= 0) return;

    // 处理【立即执行】逻辑
    if (immediate) {
      setSeconds((prev) => Math.max(prev - 1, 0));
      if (secondsRef.current <= 1) return; // 如果秒数已经扣完，直接结束不启动定时器
    }

    // 启动定时器并存入 Ref
    timerRef.current = window.setInterval(() => {
      if (secondsRef.current <= 1) {
        setSeconds(0);
        clearTimer(); // 归零时自动清除
      } else {
        setSeconds((prev) => prev - 1);
      }
    }, 1000);
  }, [immediate, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const reset = useCallback(
    (newSeconds?: number) => {
      clearTimer();
      setSeconds(newSeconds ?? initialSeconds);
    },
    [initialSeconds, clearTimer],
  );

  // 4. 防御性效应：组件卸载时必须清除定时器（防内存泄漏）
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { seconds, start, pause, reset };
}
```
