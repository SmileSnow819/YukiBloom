---
title: 百度直播前端面经
date: 2026-06-15 17:00:00
link: bai-du-zhi-bo-qian-duan-mian-jing
cover: /img/cover/interview.jpg
description: 百度直播前端一面面经，八股密度较高，考察浏览器缓存、事件循环、同源策略、HTTP 发展历史、this 指向、闭包、Promise、Vue 3、SSE、React Hooks、Fiber 和双缓存树，并手撕可重试函数与无重复字符的最长子串。
tags:
  - 百度
  - 面经
  - React
  - Vue
  - 浏览器
categories:
  - 面经
---

## 百度直播前端一面

### 面试时间

`2026_0615-17:00`

### 面试内容

八股盛宴。

1. 自我介绍
2. Vue 熟悉还是 React 熟悉？
3. 浏览器缓存
4. 事件循环
5. 同源策略
6. HTTP 发展历史
7. `this` 指向
8. `call`、`bind`、`apply` 的区别
9. 闭包的定义和使用场景
10. Promise 方法
11. Vue 组合式 API 和选项式 API 的区别
12. Vue 3 生命周期
13. 流式输出实现 SSE
14. `useState` 是同步还是异步？
15. Hooks 为什么必须在顶部声明，不能写在循环或条件判断里？
16. 了解 Fiber 架构吗？
17. 双缓存树了解吗？
18. 手撕：可重试 `n` 次的函数
19. 手撕：[无重复字符的最长子串](https://leetcode.cn/problems/longest-substring-without-repeating-characters/)
20. 平时怎么学习前端？

---

## 面试代码题

### 1) 可重试 n 次的函数

```javascript
function retry(task, times) {
  return new Promise((resolve, reject) => {
    function run(count) {
      task()
        .then(resolve)
        .catch((err) => {
          if (count >= times) {
            reject(err);
          } else {
            run(count + 1);
          }
        });
    }

    run(1);
  });
}
```

更完整一点可以把“重试次数”和“总执行次数”说清楚。上面的实现里，`times` 表示最多执行 `times` 次，包括第一次执行。

如果要支持延迟重试，可以加一个 `delay`：

```javascript
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retry(task, times, delay = 0) {
  return new Promise((resolve, reject) => {
    function run(count) {
      task()
        .then(resolve)
        .catch(async (err) => {
          if (count >= times) {
            reject(err);
            return;
          }

          if (delay > 0) {
            await sleep(delay);
          }

          run(count + 1);
        });
    }

    run(1);
  });
}
```

### 2) 无重复字符的最长子串

```javascript
/**
 * @param {string} s
 * @return {number}
 */
var lengthOfLongestSubstring = function (s) {
  const set = new Set();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    while (set.has(s[right])) {
      set.delete(s[left]);
      left++;
    }

    set.add(s[right]);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
};
```

这题核心是滑动窗口：

1. 右指针不断向右扫描。
2. 如果窗口内出现重复字符，就移动左指针，并从 `Set` 中删除左侧字符。
3. 每次窗口合法时，更新最大长度。

---

## 面试复盘总结

### 1) 浏览器缓存怎么回答？（Q3）

浏览器缓存可以按 **强缓存 -> 协商缓存** 的顺序讲。

强缓存不需要向服务器发请求，命中后直接从本地缓存读取资源：

- `Cache-Control: max-age=31536000`
- `Expires`

现代项目里优先看 `Cache-Control`，它的优先级高于 `Expires`。

协商缓存会向服务器发请求确认资源是否变化：

- `Last-Modified` / `If-Modified-Since`
- `ETag` / `If-None-Match`

如果资源没变，服务端返回 `304 Not Modified`，浏览器继续使用本地缓存；如果资源变了，返回新的资源内容。

面试表达可以这样说：

> 静态资源通常会用 hash 文件名配合强缓存，`Cache-Control` 设置很长时间；HTML 入口文件一般不做长强缓存，避免用户拿到旧资源引用。接口数据则根据业务实时性选择 no-cache、短缓存或协商缓存。

### 2) 事件循环和微任务（Q4）

事件循环的基本顺序：

```text
执行一个宏任务 -> 清空所有微任务 -> 浏览器渲染 -> 下一个宏任务
```

宏任务包括：

- 主脚本
- `setTimeout`
- `setInterval`
- DOM 事件
- 网络回调

微任务包括：

- `Promise.then`
- `queueMicrotask`
- `MutationObserver`

容易出题的点是：一个宏任务执行完后，会把当前队列里的微任务全部清空，微任务里继续产生的微任务也会在本轮继续执行。

### 3) 同源策略与跨域（Q5）

同源要求三个部分完全一致：

1. 协议
2. 域名
3. 端口

只要有一个不同，就是不同源。

同源策略限制的是浏览器脚本读取跨源响应的能力，不是限制请求发出去。比如简单请求很多时候已经到达服务端了，只是浏览器不允许 JS 读取响应。

常见跨域解决方案：

- CORS：服务端设置 `Access-Control-Allow-Origin`
- 反向代理：开发环境 Vite proxy 或线上 Nginx 转发
- JSONP：历史方案，只支持 GET
- `postMessage`：跨窗口 / iframe 通信

### 4) HTTP 发展历史（Q6）

可以按版本演进讲：

| 版本     | 关键变化                                  | 主要问题             |
| -------- | ----------------------------------------- | -------------------- |
| HTTP/1.0 | 每次请求默认新建 TCP 连接                 | 连接复用差           |
| HTTP/1.1 | 长连接、管线化、缓存控制更完善            | 队头阻塞             |
| HTTP/2   | 二进制分帧、多路复用、Header 压缩         | TCP 层队头阻塞仍存在 |
| HTTP/3   | 基于 QUIC/UDP，连接迁移，降低队头阻塞影响 | 部署和兼容成本更高   |

面试里不要只背版本，要强调核心矛盾：不断减少连接成本、减少阻塞、提高并发传输效率。

### 5) `this`、`call`、`apply`、`bind`（Q7-Q8）

`this` 的指向取决于函数调用方式：

- 普通函数调用：非严格模式指向 `window`，严格模式是 `undefined`
- 对象方法调用：指向调用它的对象
- 构造函数调用：指向新创建的实例
- `call` / `apply` / `bind`：显式绑定
- 箭头函数：没有自己的 `this`，从外层词法作用域继承

三者区别：

- `call(thisArg, a, b)`：立即执行，参数逐个传
- `apply(thisArg, [a, b])`：立即执行，参数用数组传
- `bind(thisArg, a, b)`：不立即执行，返回一个绑定后的新函数

### 6) 闭包的定义和场景（Q9）

闭包是指函数能够访问其词法作用域中的变量，即使外层函数已经执行结束。

典型场景：

1. 数据私有化
2. 函数柯里化
3. 防抖节流
4. React Hooks 中保留渲染时的变量快照

风险是闭包会让变量无法被垃圾回收，如果长期持有大对象，可能造成内存占用。

### 7) Promise 常见方法（Q10）

常见静态方法：

- `Promise.resolve`
- `Promise.reject`
- `Promise.all`
- `Promise.race`
- `Promise.allSettled`
- `Promise.any`

区别重点：

- `all`：全部成功才成功，一个失败就失败。
- `allSettled`：等全部结束，不管成功失败。
- `race`：谁先 settled 就用谁的结果。
- `any`：谁先 fulfilled 就成功，全部 rejected 才失败。

### 8) Vue 组合式 API 和选项式 API（Q11-Q12）

选项式 API 按配置项组织代码：

```text
data / methods / computed / watch / mounted
```

组合式 API 按业务逻辑组织代码：

```text
useUser()
useSearch()
usePagination()
```

组合式 API 更适合大型组件和逻辑复用，因为同一段业务逻辑可以放在一起，而不是分散在多个选项里。

Vue 3 生命周期常见对应关系：

- `beforeCreate` / `created`：`setup`
- `beforeMount`：`onBeforeMount`
- `mounted`：`onMounted`
- `beforeUpdate`：`onBeforeUpdate`
- `updated`：`onUpdated`
- `beforeUnmount`：`onBeforeUnmount`
- `unmounted`：`onUnmounted`

### 9) SSE 流式输出怎么实现？（Q13）

SSE 基于 HTTP 长连接，服务端设置：

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

服务端按下面格式不断写入数据：

```text
data: hello

data: world

data: [DONE]
```

客户端可以用 `EventSource` 接收：

```javascript
const source = new EventSource("/api/stream");

source.onmessage = (event) => {
  if (event.data === "[DONE]") {
    source.close();
    return;
  }

  console.log(event.data);
};
```

如果是 AI 对话流式输出，也可以用 `fetch` + `ReadableStream` 手动读取 chunk，这样更方便带自定义 header 和请求体。

### 10) `useState` 是同步还是异步？（Q14）

更准确的说法是：`setState` 不是简单的同步或异步，而是一次 **调度更新**。

在 React 中，调用 `setState` 后不会立刻修改当前渲染闭包里的 state 值，而是把更新放入队列，等待 React 调度下一次 render。

```jsx
const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  console.log(count); // 这里仍然是本次 render 的旧值
}
```

如果依赖上一次状态，推荐函数式更新：

```jsx
setCount((prev) => prev + 1);
```

### 11) Hooks 为什么不能写在循环或条件里？（Q15）

React 依赖 Hooks 的调用顺序来关联每个 Hook 对应的状态。

比如第一次渲染：

```text
useState A -> useEffect B -> useState C
```

第二次渲染必须仍然是这个顺序。如果把 Hook 写在条件里，某次条件不满足时，顺序会变成：

```text
useState A -> useState C
```

React 就无法知道哪个 Hook 对应哪个状态，导致状态错位。

所以 Hooks 必须写在函数组件顶层，不能放在循环、条件判断或嵌套函数里。

### 12) Fiber 架构和双缓存树（Q16-Q17）

Fiber 可以理解为 React 的新协调架构。它把一次大的渲染任务拆成很多小单元，每个 Fiber 节点对应一个组件或 DOM 节点。这样 React 可以在渲染过程中暂停、恢复、丢弃任务，为并发渲染和优先级调度提供基础。

双缓存树指 React 同时维护两棵 Fiber 树：

- `current`：当前屏幕上已经渲染出来的树
- `workInProgress`：正在内存中构建的新树

更新时，React 在 `workInProgress` 树上计算变化。等整棵树完成后，再一次性 commit 到页面，并把 `workInProgress` 切换成新的 `current`。

这样做的好处：

1. 渲染阶段可以中断，不会直接影响当前页面。
2. 提交阶段一次性更新，减少中间状态暴露。
3. 为并发渲染、优先级调度和可中断渲染打基础。
