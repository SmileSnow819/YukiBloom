---
title: 中科紫东太初面经
date: 2026-07-16 14:15:00
link: zhong-ke-zi-dong-tai-chu-mian-jing
cover: /img/cover/interview.jpg
description: 中科紫东太初前端面经，包含 7 月 16 日一面、7 月 17 日二面和 7 月 21 日 HR 面，重点考察 React 打字机效果、箭头函数返回值、MCP Server、SDD/TDD、弱网优化、SSE/WebSocket 区别以及手撕第二大数字。
tags:
  - 中科紫东太初
  - 面经
  - React
  - MCP
  - SSE
categories:
  - 面经
---

## 中科紫东太初

### 一面时间

`2026_0716-14:15`

### 一面内容

1. 自我介绍
2. Vue 和 React 哪个更熟悉一点？
3. 手撕 React 打字机效果：先写 `setTimeout` 版本，再写 `setInterval` 版本。
4. 箭头函数返回值区别：

   ```javascript
   const a1 = () => 1;
   const a2 = () => {
     1;
   };
   const a3 = () => {
     return 1;
   };
   ```

5. 实习经历中学到了哪些东西？

### 一面代码题：React 打字机效果

```jsx
import { useEffect, useState } from "react";

function App() {
  const [result, setResult] = useState("");

  const stringChar = "Hello, World!";

  useEffect(() => {
    let index = 0;

    const timer = setInterval(() => {
      setResult((prev) => prev + stringChar[index]);
      index++;

      if (index >= stringChar.length) {
        clearInterval(timer);
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div>
      <h1>{result}</h1>
    </div>
  );
}

export default App;
```

---

## 中科紫东太初二面

### 二面时间

`2026_0717-10:30`

### 二面内容

1. 自我介绍
2. 低代码平台是从零开始的，还是在半成品基础上继续开发的？
3. SDD + TDD 框架详情
4. MCP Server 是怎么写的？
5. 怎么优化弱网条件下的用户体验？
6. SSE 和 WebSocket 的区别
7. SSE 流式输出怎么终止？
8. 手撕：找出数组中第二大的数字

### 二面代码题：找出数组中第二大的数字

```javascript
function findSecondMaxNum(arr) {
  const uniqueArr = [...new Set(arr)];

  if (uniqueArr.length < 2) {
    return undefined;
  }

  let max = -Infinity;
  let secondMax = -Infinity;

  for (const current of uniqueArr) {
    if (current > max) {
      secondMax = max;
      max = current;
    } else if (current > secondMax && current < max) {
      secondMax = current;
    }
  }

  return secondMax === -Infinity ? undefined : secondMax;
}

console.log(findSecondMaxNum([1, 4, 5, 6, 7, 1, 2, 3, 4, 5])); // 6
```

---

## 中科紫东太初 HR 面

### HR 面时间

`2026_0721-10:00`

### HR 面内容

1. 介绍薪资
2. 说明公司情况

---
