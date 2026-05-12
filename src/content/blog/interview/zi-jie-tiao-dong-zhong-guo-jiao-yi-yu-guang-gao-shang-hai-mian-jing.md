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
8. 你写 MCP 和我直接执行函数比有哪些优势呢？
9. 平时怎么使用 AI
10. Agent 相关的了解吗？可以讲一下吗？
11. 你对 Skill 的理解是什么？
12. 能讲一下你怎么理解 RAG 吗？
13. 你提到最新的框架都有 llms.txt，面试官和我讲了一下 IDE 里面 RAG 和搜索的两种方式。
14. JS 基本数据类型
15. 开发中引用类型和基本数据类型有什么要注意的点吗？
16. Vue 和 React 都了解吗？
17. 可变数据和不可变数据有了解吗？
18. React 中更改数据需要返回的 set 方法去更改，那引用类型有什么需要注意的吗？
19. 代码性能问题分析：

```javascript
function parseLines(files) {
  // 假设 files 是一个超大字符串
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

20. 手撕代码：异步并发调度器（实现一个 `Scheduler` 类，控制异步任务并发数量）

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
