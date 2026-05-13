---
title: 字节跳动_中国交易与广告(上海)面经
date: 2026-05-12 19:00:00
link: zi-jie-tiao-dong-zhong-guo-jiao-yi-yu-guang-gao-shang-hai-mian-jing
cover: /img/cover/bytedance.webp
description: 字节跳动_中国交易与广告（上海）前端面经，围绕 DataAgent 项目、MCP/Agent/Skill/RAG、JS 基础、React 数据更新与性能优化、并发调度手撕题展开。
tags:
  - 字节跳动
  - 面经
  - DataAgent
  - MCP
  - Agent
  - RAG
categories:
  - 面经
---

## 字节跳动\_中国交易与广告(上海)

### 面试时间

`2026_0512-19:00`

### 面试内容

1. 自我介绍
2. DataAgent 的项目是怎么样的？能介绍一下吗？
3. 大概说一下这个项目的前端内容有哪些呢？
4. 这个项目中你主要负责什么？
5. AI 返回的 ECharts 图表有考虑过万一 AI 报错了怎么办呢？
6. 第二个项目中，你有遇到什么难题，挑几个说一下吧。
7. 看你之前写了一个 MCP 服务器，能详细解释一下这个吗？
8. Agent 相关的了解吗？可以讲一下吗？
9. 你对 Skill 的理解是什么？
10. 能讲一下你怎么理解 RAG 吗？
11. 你提到最新的框架都有 llms.txt，面试官和我讲了一下 IDE 里面 RAG 和搜索的两种方式。
12. JS 基本数据类型
13. 开发中引用类型和基本数据类型有什么要注意的点吗？
14. Vue 和 React 都了解吗？
15. 可变数据和不可变数据有了解吗？
16. React 中更改数据需要返回的 set 方法去更改，那引用类型有什么需要注意的吗？
17. 代码性能问题分析：

```javascript
function parseLines(files) {
  return String(files).split("\n");
}

function renderLinesSlow(files, container) {
  const text = parseLines(files); // 几十万行的文本
  for (const line of text) {
    const dom = document.createElement("p");
    dom.textContent = line;
    container.append(dom);
  }
}
```

- 问题：频繁 `append` + 一次性渲染过多节点，主线程阻塞、页面卡顿。
- 优化：虚拟滚动、分片渲染（`requestIdleCallback` / `setTimeout`）、`DocumentFragment` 批量插入。

18. 手撕代码：异步并发调度器（实现一个 `Scheduler` 类，控制异步任务并发数量）

```javascript
class Scheduler {
  constructor(limit) {
    this.limit = limit; // 最大并发数
    this.running = 0; // 当前运行中的任务数
    this.queue = []; // 等待队列
  }

  // 添加任务：接收一个返回 Promise 的函数
  add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._run();
    });
  }

  _run() {
    while (this.running < this.limit && this.queue.length) {
      const { task, resolve, reject } = this.queue.shift();
      this.running++;
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.running--;
          this._run();
        });
    }
  }
}

// 使用示例
const scheduler = new Scheduler(2);

const timeout = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

scheduler.add(() => timeout(1000, "A")).then(console.log);
scheduler.add(() => timeout(500, "B")).then(console.log);
scheduler.add(() => timeout(300, "C")).then(console.log);
scheduler.add(() => timeout(400, "D")).then(console.log);

// 输出顺序：B, C, A, D （并发数为2，按完成时间输出）
```

## 面试复盘总结

### 1) AI 图表报错题：前端需要给出“安全 + 稳定 + 体验”三层答案

#### 面试官在考什么

不是只问“报错了怎么重试”，而是考你是否理解：**AI 生成内容默认不可信**，前端必须做执行隔离和防御式渲染。

#### 完整回答模板

1. 安全隔离（第一优先级）
   - 不直接在主文档执行 AI 生成代码。
   - 通过 `iframe sandbox` 隔离执行环境，最小权限原则。
   - 配合 CSP、白名单资源域名，避免任意脚本执行和数据外泄。

2. 运行时可观测（第二优先级）
   - 在 iframe 内注入错误监听：`window.onerror`、`unhandledrejection`。
   - 通过 `postMessage` 上报错误类型、堆栈、数据片段、traceId。
   - 父页面统一状态机：`生成中 -> 成功 -> 失败 -> 重试中 -> 兜底`。

3. 输入约束（第三优先级）
   - 不让 AI 输出可执行 HTML/JS。
   - 让 AI 输出 **ECharts option JSON**。
   - 前端做 Schema 校验 + 字段白名单（禁危险 formatter / function 注入）。
   - 校验通过后再安全实例化图表。

4. UX 降级
   - 重试期间展示骨架屏和进度状态。
   - 最终失败提供“重试 / 查看错误摘要 / 切换表格视图”。
   - 保证页面不白屏、不阻塞核心流程。

#### 一句话总结

AI 能提升上限，但前端必须负责下限：**不崩、不炸、不泄露、可恢复**。

### 2) SSR 水合不匹配：从“渲染时机”理解本质

#### 本质

- SSR 先在服务端生成 HTML。
- 客户端再执行一次首渲染并绑定事件（Hydration）。
- 两边首帧结构或文本不一致就会 Hydration Mismatch。

#### 高频触发点

- 首屏依赖浏览器对象：`window`、`document`、`localStorage`。
- 首屏包含不稳定值：`Math.random()`、`Date.now()`、时区差异格式化。
- 条件渲染分支在服务端与客户端条件不一致。

#### 标准解法

- 浏览器依赖逻辑放 `onMounted` / `useEffect`。
- 首屏只渲染稳定占位，挂载后替换真实数据。
- 纯客户端模块用 `ClientOnly` 或动态导入关闭 SSR。
- 统一时区和格式化策略，避免日期字符串差异。

### 3) RAG、IDE 搜索、llms.txt：怎么讲得像工程实践

#### 传统向量 RAG 的局限

- 语义相似度适合自然语言，不等于代码调用关系。
- 代码问题本质是“符号引用 + 依赖图”问题，误召回和漏召回更明显。

#### IDE 实际增强路径

1. 结构化检索（AST / Symbol / LSP）
   - 先用“定义/引用/调用链”精确找上下文。
   - 再把命中片段喂给模型生成答案。

2. 向量检索补充
   - 适合注释、文档、历史方案、跨仓库经验。

3. 长上下文模型
   - 可一次喂入更大上下文（仓库文档、接口协议、`llms.txt`）。
   - 优势是信息完整，风险是成本和噪声增加，需要分层裁剪。

#### 面试表达建议

“我不会把 RAG 只理解为向量库，而是 **结构化检索优先，向量检索补充，长上下文兜底** 的混合策略。”

### 4) Vue vs React + 可变/不可变：把底层机制讲透

#### Vue 为什么可变也能更新

- Vue3 基于 Proxy 拦截 `get/set`。
- 直接改 `state.a = 2` 时可追踪依赖并触发更新。

#### React 为什么强调不可变

- React 依赖引用变化判断状态是否变化（浅比较语义）。
- 如果直接改原对象再 `setState(原对象)`，引用不变，可能 bailout 不重渲染。

#### 标准写法

```javascript
// 不推荐
obj.a = 2;
setObj(obj);

// 推荐
setObj({ ...obj, a: 2 });
```

#### 可变 vs 不可变的工程取舍

- 不可变数据：可预测、易回溯、利于 memo 优化。
- 代价：拷贝成本与心智负担上升。
- 实战：关键状态保持不可变，重计算区域配合结构共享/局部优化。

### 5) JS 基础题串讲：数据类型 -> 内存 -> 拷贝 -> GC

#### 第一步：破题——数据类型的分类

（面试官：JS 有哪些数据类型？）

答题话术：

“面试官您好，JS 的数据类型总体分为两大阵营：基本类型（Primitive）和引用类型（Reference）。
基本类型包括 7 种：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`。
引用类型统称为 `Object`，里面包含了普通对象、数组（`Array`）和函数（`Function`）等。”

#### 第二步：化解陷阱——String 装箱机制

（面试官追问：那 `string` 是基本类型吗？为什么它能调方法？）

答题话术：

“`string` 绝对是基本类型。但我们在开发中经常能写出 `'hello'.length` 这样的代码，这其实是 JS 引擎底层做了一个‘自动装箱’（Auto-boxing）的微操。

当我们试图访问基本类型的方法时，引擎会瞬间在内存里 `new String('hello')` 把它包装成一个临时对象，调用完 `.length` 后，这个临时对象就立刻被销毁了。所以我们感受不到它的存在，但这其实是引擎为了方便开发者而设计的语法糖。”

#### 第三步：深挖底层——栈与堆的妥协

（面试官：基本类型和引用类型最本质的区别是什么？）

答题话术：

“它们最本质的区别在于内存分配策略。这其实是引擎为了兼顾运行速度和内存大小做出的妥协。

基本类型的大小是固定的，所以引擎把它们的值直接存在栈内存（Stack）中。栈的特点是按值访问，存取速度极快。

引用类型（比如一个巨大的 JSON 对象）大小不可控，如果全塞进栈里会严重拖慢上下文切换的速度。所以对象的实体被安置在广阔的堆内存（Heap）中。而栈里只存了一个‘指针’（内存地址），这个指针指向堆里的那个房间。

所以，当我们执行 `let a = b` 赋值时，基本类型是实打实地复制了一份值；而引用类型，仅仅是复制了那个指针。两者共享了堆里的同一个房间。”

#### 第四步：闭环机制——引出垃圾回收（GC）

答题话术：

“正因为这种内存分离机制，才有了垃圾回收（GC）的区别对待。

栈内存的清理很简单，函数执行完、上下文一出栈，里面的基本类型和指针就跟着销毁了。

但堆内存里的对象不能随便删，引擎必须用标记清除算法（Mark-and-Sweep）。它会从全局根节点（Root）出发，顺着栈里的‘指针’去找。只要这根线还连着，说明对象‘可达’，就能活下来；如果栈里的指针被销毁了，堆里的那个对象就成了‘孤岛’，在下一次 GC 时就会被当成垃圾清掉。”

#### 第五步：工程落地——开发中的避坑指南

（面试官：那这种区别，在实际开发中有什么需要特别注意的吗？）

答题话术：

“在实际工程开发中，理解了内存机制，主要有三个高频的注意点：

1. 副作用与深浅拷贝的抉择：
因为引用类型赋值只是复制指针，如果不小心修改了入参对象，会造成严重的全局数据污染（副作用）。所以在处理复杂状态时，我们需要有意识地使用浅拷贝（`...` 扩展运算符）或深拷贝（`structuredClone`）来做物理隔离。

2. 框架的状态更新机制（不可变 vs 可变）：
这点在 React 和 Vue 中体现得最明显。
React 崇尚‘不可变数据’（Immutable），它的 `setState` 底层是用 `Object.is()` 对比引用地址的。如果你直接 `obj.a = 2` 然后传进去，栈里的指针没变，React 会以为数据没更新导致页面卡死，必须传入一个全新拷贝的对象。
而 Vue 是基于 Proxy 劫持的‘可变数据’，它能精确监听到对象内部字段的变化，所以允许我们直接修改原对象的属性。

3. 防范内存泄漏：
开发时如果不注意，闭包里引用了庞大的 DOM 节点，或者在全局 `window` 上挂载了对象、忘记清理定时器（`setInterval`），就会导致栈里的‘指针’一直存在，垃圾回收器（GC）就不敢去清空堆里的内存，久而久之页面就会卡顿甚至崩溃。”
