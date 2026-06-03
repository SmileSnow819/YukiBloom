---
title: 知乎一面面经
date: 2026-06-03 17:00:00
link: zhi-hu-mian-jing
cover: /img/cover/interview.jpg
description: 知乎前端一面面经。重点复盘：低代码表单联动、Intersection Observer 提前加载（正负 margin 的误区）、弱网快速滑动图片优化、箭头函数底层特性以及前端安全与 React 转义机制。
tags:
  - 知乎
  - 面经
  - 低代码
  - 性能优化
  - React
categories:
  - 面经
---

## 知乎一面

### 面试时间

`2026_0603-17:00`

### 面试题目

1. 为什么打算离开快手？
2. 能实习多久？
3. 你在项目中主要负责什么？
4. SSR 与 CSR 的区别及应用场景
5. SSE 流式返回机制
6. 图表生成失败怎么考虑？
7. 低代码动态表单怎么联动？
8. 怎么做的提前加载内容？
9. 弱网情况下用户快速滑动图片列表怎么能够好的让用户访问？
10. MCP Server 怎么理解？
11. 解释事件循环
12. 事件循环输出题
13. var/let/const 区别
14. 箭头函数特性（this 指向、不能作为构造函数，没有 prototype）
15. H5 页面顶部固定搜索框 + 下方自适应列表的布局方案
16. 虚拟 DOM 作用及 key 的作用（为什么不能用 index）
17. 全局状态管理使用场景
18. 跨域问题
19. 前端安全问题（恶意脚本注入、转译库）
20. React 原生支持转义吗？
21. AI 上下文治理（污染、回退、Sub Agent 隔离、压缩、skill）
22. 反问
23. 对我的建议
24. 是否转正及工作内容范围（C 端/M 端、全栈）

---

## 面试复盘（核心问题精讲）

### 1) 低代码动态表单怎么联动？（Q7）

低代码表单的核心是 **“数据驱动视图”**，联动的本质是 **依赖收集与副作用（Side Effects）派发**。

比如：选择了“省份 A”，需要发请求拉取并回填“城市列表 B”。

**完整解法（分层架构设计）：**

#### 第一层：联动规则的 Schema 定义

配置表单时，我们不能直接写 `watch` 或 `useEffect`，只能在 JSON Schema 中通过特定的关键字（如 `dependencies` / `x-reactions`）来描述“谁依赖了谁”、“满足条件后干什么”。

_场景：选择“部门(dept)”后，自动拉取该部门的“员工列表(users)”并回填下拉框。_

```json
{
  "dept": { "type": "string", "title": "部门" },
  "users": {
    "type": "string",
    "title": "员工",
    "x-reactions": {
      "dependencies": ["dept"],
      // fulfill 定义条件满足后执行的动作
      "fulfill": {
        // 1. 同步联动：改变自身 UI 状态（比如显示出来）
        "state": { "visible": "{{ !!$deps[0] }}" },
        // 2. 异步联动：触发一个预定义的请求动作，并把数据回填到 dataSource
        "run": "fetchUsersByDept($deps[0])"
      }
    }
  }
}
```

#### 第二层：状态管理树（Form Store）

低代码引擎在运行时，必须有一个统一的 Store（通常基于 `Proxy`、`MobX` 等响应式库）。这个 Store 里不仅存用户填的 `values`，还要存每个组件内部的元数据：

- `Values`: `{ dept: '前端组', users: '' }`
- `Field State`: `visible`, `disabled`, `loading`（组件自带状态）
- `Component Props`: `dataSource`（下拉框的备选项数据）

#### 第三层：副作用派发与异步回填执行流（核心）

当用户在界面上切换了“部门”时，整个执行流如下：

1. **值变化拦截**：用户切到“前端组”，触发 `Store.setValues('dept', '前端组')`。
2. **触发依赖链**：引擎内部的依赖收集器（Dependency Graph）发现 `users` 字段订阅了 `dept`，于是拿到 `users` 对应的 `x-reactions` 规则。
3. **沙箱求值**：取出 `"{{ !!$deps[0] }}"`，在安全的 `new Function` 沙箱中执行，得到 `visible: true`。同时发现有 `run: "fetchUsersByDept"` 这个异步动作。
4. **异步请求与回填**：
   - 引擎立刻把 `users` 字段的状态设为 `loading: true`（此时界面上下拉框会转圈）。
   - 引擎调用注册在全局的 `fetchUsersByDept('前端组')` 接口拉数据。
   - 接口返回 `[{ label: '张三', value: '1' }]`。
   - 引擎派发更新：`Store.setFieldState('users', { loading: false, dataSource: 拿到数据 })`。
5. **视图更新**：底层组件（如下拉框）因为绑定了 Store 的 `dataSource`，自动重新渲染，数据回填完成。

#### 第四层：防死循环（DAG 拓扑排序）

如果业务配置非常复杂：A 变化 -> 拉取 B -> B 回填后触发 C -> C 又修改了 A。这会导致死循环和不断发请求。

**防御机制：**
引擎在解析 JSON 初始化表单时，会先构建一张**有向无环图（DAG）**。如果发现依赖成环（A->B->C->A），初始化阶段直接抛错，拒绝渲染，从而从根源切断死循环问题。

### 2) 提前加载内容与 Intersection Observer 的 margin（Q8）

**【纠点预警】**：面试中如果提到“设置成负的来提前加载”，这里其实是个常见误区！
**提前加载需要把 `rootMargin` 设置为“正值”（Positive）。**

**原理解析：**
`Intersection Observer` 默认在元素的边界刚好碰到视口（Viewport）时触发。

- **正值（如 `rootMargin: "0px 0px 500px 0px"`）**：相当于把视口的判定范围**向下扩大了 500px**。元素还在屏幕下方 500px 时，观察器就认为它“进入”了，从而触发回调。**这才是做“提前加载”（预加载）的正确姿势。**
- **负值（如 `rootMargin: "-50px 0px"`）**：相当于把视口向内收缩了 50px。元素必须完全进入屏幕并且再往上走 50px 才算“可见”。这通常用于**“精准曝光埋点”**（防止用户飞速滑过也算曝光）。

**补充：其他提前加载手段**

- `<link rel="prefetch">` / `<link rel="preload">`：在浏览器空闲时提前下载下一页资源。
- **Hover 预加载**：当用户鼠标悬停在链接上时（大约有 200-300ms 的犹豫时间），提前发请求拉取数据。

### 3) 弱网 + 快速滑动长列表的图片优化（Q9）

弱网加极速滑动，最大的问题是：**滑过的废弃图片塞满了浏览器的并发请求队列（Chrome 默认最多 6 个并发），导致当前停下来真正该看的图片一直处于 Pending 状态。**

**完整的解决方案（可层层递进向面试官展示）：**

1. **取消废弃请求（最核心）**：配合 `Intersection Observer`，如果元素很快滑出可视区（或扩大后的可视区），立即在 `unobserve` 的同时中断请求。如果用 fetch，可以用 `AbortController`；如果是 img 标签，可以将 `src` 置空（`img.src = ''`）。
2. **防抖/延迟加载判断**：不要一进入可视区就立马加载。定一个 100ms 的延迟，如果 100ms 内元素又滑出去了，就不发请求。（过滤掉飞速滑动途经的图片）。
3. **渐进式占位（骨架/低清）**：请求真正大图前，先显示极小体积的缩略图（LQIP）、或者用 `Blurhash`（用一串几十字节的字符串渲染出色彩模糊的占位），给用户心理预期。
4. **图片格式降级**：通过 CDN 参数，弱网下自动请求压缩率更高的 WebP/AVIF 格式，或者降低 `quality` 参数。

### 4) 箭头函数特性底层剖析（Q14）

回答箭头函数不要只背诵，要告诉面试官“为什么”。

- **没有自身的 `this`（词法作用域绑定）**：
  普通函数的 `this` 是在**调用时**决定的（谁调用就指向谁）。而箭头函数的 `this` 是在**定义时**根据外层上下文（Lexical Context）决定的。因为它自身压根没有 `this`，所以你用 `.bind()`、`.call()`、`.apply()` 强行改也没用。
- **不能作为构造函数（不能 `new`）**：
  因为 JS 规范里，箭头函数并没有内部方法 `[[Construct]]`。当你对它使用 `new` 关键字时，JS 引擎去寻找 `[[Construct]]` 找不到，直接抛出 `TypeError`。
- **没有 `prototype` 属性**：
  既然不能被 `new` 实例化，那它就不需要原型链去给实例继承属性，所以引擎在创建箭头函数时直接省去了 `prototype` 属性（节约内存）。
- **没有 `arguments` 对象**：
  不能用 `arguments` 获取参数，现代 JS 推荐统一使用 `...args`（剩余参数）来替代。

### 5) 前端安全与 React 转义机制（Q19 & Q20）

**React 原生支持转义吗？（Q20）**
**答案是：原生支持，且非常安全。**

- **机制**：在 React 中，当你写 `<div>{userInput}</div>` 时，React 的渲染引擎底层调用的是 `textContent` 而不是 `innerHTML`。所有传入的大括号 `{}` 变量，在渲染到 DOM 之前都会被强制转换为字符串。哪怕你传入的是 `<script>alert(1)</script>`，页面上也只会原样显示这串字符，而不会去执行它。
- **特例**：React 唯一的后门是 `dangerouslySetInnerHTML={{ __html: userInput }}`。这个属性名字故意取得这么长、这么吓人，就是为了提醒开发者“这很危险”。

**前端安全问题（恶意脚本注入、转译库）（Q19）**
这就是经典的 **XSS（跨站脚本攻击）**。
如果在 React 里非要渲染富文本（比如从后端拿到了 Markdown 转换后的 HTML，必须用 `dangerouslySetInnerHTML`），就必须经过转译（Sanitize）。

**防范手段：**

1. **转译库（Sanitizer）**：千万不要自己写正则替换，非常容易被绕过。业界标准是使用 **DOMPurify**。把脏字符串扔进去 `DOMPurify.sanitize(dirtyHtml)`，它会基于一个严苛的白名单，把里面夹带的 `<script>` 标签、`javascript:void(0)` 链接、`onerror` 属性全部剔除，返回干净的 HTML。
2. **CSP（内容安全策略）**：在 HTTP 响应头加上 `Content-Security-Policy: default-src 'self'`，从源头告诉浏览器：只能执行自己域名下的脚本，就算是漏网之鱼被注入了第三方脚本也执行不了。
3. **Cookie 安全**：把鉴权 Token 存到 Cookie 时，必须加上 `HttpOnly` 属性。这样就算 XSS 攻击成功，黑客的 JS 代码也读不到你的 Cookie（无法发回给黑客服务器）。
