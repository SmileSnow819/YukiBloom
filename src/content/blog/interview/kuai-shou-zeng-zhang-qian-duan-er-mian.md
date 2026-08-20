---
title: 快手增长前端二面面经
date: 2026-08-07 19:00:00
link: kuai-shou-zeng-zhang-qian-duan-er-mian
cover: /img/cover/interview.jpg
description: 快手增长前端二面面经，重点围绕 SDD/TDD 全链路 AI 研发、组件库 Skill、Codebase Index、Data Agent、沙箱隔离、ECharts 渲染以及 zip 本地预览场景题展开。
tags:
  - 快手
  - 面经
  - AI
  - Agent
  - Skill
  - Codebase Index
categories:
  - 面经
---

## 快手增长前端二面

### 面试时间

`2026_0807-19:00`

### 面试内容

1. 自我介绍
2. 为什么不在快手继续实习？
3. 快手电商罚单业务中，罚单为什么要做拖拉拽的形式？
4. SDD + TDD 全链路 AI 研发探索，远端执行的架构简单说一下
5. 手机端人工接管 AI 编码任务是怎么实现的？
6. 使用的 Agent 是什么？
7. 在 SDD 和 TDD 这套范式中你自己做了哪些工作？
8. 为什么要编写 Skill 让 AI 理解内部组件库？AI 本身不能解析代码理解组件吗？
9. 编写 Skill 和不编写 Skill，实际的差异体现在哪里？
10. 除了写 Skill，在这套范式中还做了其他什么事情？
11. 你自己有用 AI 做过哪些东西？
12. 平时高频使用哪些 AI Agent 相关工具？
13. 跑 AI 长任务有什么心得？遇到过哪些复杂场景？
14. Data Agent 项目中 Codebase Index 的具体技术方案是什么？
15. Codebase Index 的技术调研、技术选型过程是怎样的？
16. 不使用 RAG 的情况下，如何提升检索效果？
17. Codebase Index 的数据结构是什么样？
18. 如何通过 `ts-morph` 提取行号信息？
19. 代码发生修改后，如何保证 index 索引是最新的？如何处理实时修改场景？
20. Data Agent 这个开源项目具体是做什么的？
21. 你是以什么身份参与这个 Data Agent 开源项目？
22. 讲一下 Data Agent 项目整体架构
23. Data Agent 前端重构中，有哪些需要自己做设计的场景？设计上复杂的点是什么？
24. ECharts 图表渲染一闪一闪是什么原因？为什么用约定标识符的方式绕开该问题？
25. 简历中双触发机制与沙箱隔离是做什么的？
26. 场景题：用户上传包含 HTML、JS、CSS 的 zip 压缩包，需要做页面实现上传与本地预览，该如何实现？
27. 算法题：写函数，输入 RGB 格式字符串，输出十六进制颜色字符串
28. 反问：你们组大概做哪些业务？

---

## 面试复盘总结

### 1) 二面的核心画像

二面明显更关注 **AI 工程链路的可落地性**。一面更多在追问项目背景和技术选择，二面则进一步追问：

1. SDD/TDD 全链路具体怎么跑起来。
2. Skill 对 AI 生成质量到底有什么实际影响。
3. Codebase Index 的底层数据结构和增量更新机制。
4. Data Agent 架构中前端做了哪些定制化工作。
5. 沙箱隔离、zip 预览、ECharts 闪烁这类真实前端问题怎么解决。

### 2) SDD + TDD 全链路可以怎么讲

SDD 可以理解为 Spec Driven Development，TDD 则负责把需求转成可验证的测试或检查项。

一条比较完整的链路可以这样表达：

```text
需求输入 -> Spec 拆解 -> 技术方案 -> 任务计划 -> AI 编码 -> 测试生成 -> 自动检查 -> 人工 Review -> 合并
```

回答时要强调自己负责的部分，不要泛泛说“我们做了一套流程”。

可以这样说：

> 我主要参与的是上下文工程和验证闭环：一方面把业务需求、组件库规则、模块 README、代码索引整理成 Agent 可消费的上下文；另一方面在 AI 生成代码后，通过 lint、type check、测试用例和 Browser Agent 自测来做质量兜底。AI 负责提速，但关键业务逻辑、权限边界和异常分支仍然需要人工 review。

### 3) 为什么要写组件库 Skill

面试官问“AI 本身不能解析代码理解组件吗”，重点是在考察你是否理解 **源码理解** 和 **使用规范** 的区别。

可以这样拆：

1. AI 直接读源码能知道组件怎么实现。
2. 但组件库 Skill 告诉 AI 组件在业务里应该怎么用。
3. Skill 可以沉淀团队约定、禁用写法、组合模式和常见错误。
4. Skill 更轻、更稳定，避免每次都把大量源码塞进上下文。

一句话回答：

> 源码解决“组件怎么实现”，Skill 解决“业务里应该怎么正确使用”。AI 可以读源码，但不一定能稳定推断团队约定，所以需要 Skill 把高频、稳定、强约束的信息沉淀下来。

### 4) Codebase Index 技术方案

Codebase Index 的目标不是简单做全文搜索，而是把代码结构化，让 Agent 能按语义快速定位相关上下文。

可以从这几层讲：

1. **解析层**：用 `ts-morph` 解析 TS/TSX，提取组件、函数、类型、导出符号、注释、起止行号。
2. **索引层**：建立文件路径、模块名、符号名、注释、依赖关系之间的结构化索引。
3. **检索层**：用户自然语言查询时，先匹配模块和符号，再返回最相关代码片段。
4. **更新层**：文件修改后按文件粒度增量重建索引；实时编辑可以通过文件监听或任务开始前刷新。
5. **消费层**：把检索结果交给 Agent，减少全仓库盲读。

不使用 RAG 时，可以通过这些方式提升检索效果：

- 模块 README 做语义摘要。
- AST 提取组件/函数元信息。
- import/export 关系构建依赖图。
- 给模块打人工标签。
- 对查询做关键词扩展，比如业务词映射到代码模块名。

### 5) ECharts 图表闪烁问题

ECharts 闪烁常见原因是 React 状态变化导致图表实例被重复销毁/初始化，或者 option 每次重新生成导致全量重绘。

可以从这几个方向排查：

1. 容器组件是否频繁重新挂载。
2. `echarts.init` 是否被重复调用。
3. `setOption` 是否每次都传入全量 option。
4. key 是否变化导致 React 直接重建 DOM。
5. 数据流式更新时是否缺少稳定标识，导致图表误判为全量变化。

“约定标识符”的绕开方式，本质是给图表数据或渲染块一个稳定身份，让更新逻辑知道哪些内容可以复用，哪些内容需要重绘。

### 6) 场景题：上传 HTML / JS / CSS zip 并本地预览

这个题的重点是 **预览能力 + 安全隔离**。

可以按流程回答：

1. 前端上传 zip，用 `JSZip` 解压，解析入口文件，例如 `index.html`。
2. 把 HTML、CSS、JS 文件转成 Blob URL 或虚拟文件映射。
3. 使用 iframe 做沙箱预览，避免用户代码污染主页面。
4. iframe 加 `sandbox` 属性，例如：

```html
<iframe sandbox="allow-scripts" />
```

5. 如果需要资源路径解析，要把相对路径重写到 Blob URL。
6. 主页面和 iframe 之间用 `postMessage` 通信，比如刷新、错误上报、尺寸同步。
7. 对用户代码执行要限制能力，不能给 `allow-same-origin`，也不能允许它直接访问主页面 DOM。

面试表达：

> 我会把用户上传内容当成不可信代码处理，预览必须放在 iframe 沙箱里。主页面负责解压和资源映射，iframe 负责渲染，二者通过 postMessage 做最小通信。

### 7) 算法题：RGB 字符串转十六进制颜色

```javascript
function rgbToHex(input) {
  const match = input.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!match) {
    throw new Error('Invalid RGB format');
  }

  return match
    .slice(1)
    .map((value) => {
      const num = Number(value);
      if (num < 0 || num > 255) {
        throw new Error('RGB value out of range');
      }

      return num.toString(16).padStart(2, '0');
    })
    .join('')
    .replace(/^/, '#');
}

console.log(rgbToHex('rgb(255, 0, 128)')); // #ff0080
```

### 8) 二面复盘重点

这轮最好提前准备几类材料：

| 方向 | 需要讲清楚的点 |
| --- | --- |
| SDD/TDD | 链路步骤、自己负责内容、人工兜底点 |
| Skill | 为什么需要、和源码理解的区别、实际收益 |
| Codebase Index | 数据结构、行号提取、增量更新、检索效果 |
| Data Agent | 项目定位、整体架构、前端重构设计点 |
| 沙箱隔离 | iframe sandbox、postMessage、资源路径重写 |

总结一句：二面更看重你是否能把 AI 工具链讲成一套 **可验证、可维护、可人工接管的工程系统**，而不是只讲“我用了哪些 Agent”。
