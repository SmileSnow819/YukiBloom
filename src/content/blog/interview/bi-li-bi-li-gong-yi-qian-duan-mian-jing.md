---
title: 哔哩哔哩公益前端面经
date: 2026-07-31 14:00:00
link: bi-li-bi-li-gong-yi-qian-duan-mian-jing
cover: /img/cover/interview.jpg
description: 哔哩哔哩公益前端面经，重点复盘浏览器同源策略、跨域与 CORS 白名单、Cookie 场景、JS 原型链、闭包、防抖节流、虚拟 DOM、Vue 3 响应式原理以及 Nuxt 4 生命周期。
tags:
  - 哔哩哔哩
  - 面经
  - JavaScript
  - Vue
  - Nuxt
categories:
  - 面经
---

## 哔哩哔哩公益前端一面

### 面试时间

`2026_0731-14:00`

### 面试内容

1. 自我介绍
2. 什么是浏览器同源策略？
3. 跨域访问接口常用解决方式，CORS 白名单浏览器层面表现
4. Cookie 作用，一般什么场景用？
5. 网站埋点实现方案
6. JS 原型链是什么？`__proto__` 和 `prototype` 指向什么？
7. 闭包的理解
8. 防抖和节流使用场景，二者有什么区别？
9. 虚拟 DOM 作用
10. Vue 3 响应式原理，初始化的时候 Proxy 收集什么内容？
11. SSR 水合不匹配产生原因
12. `onMounted` 之类的钩子在服务端还是客户端执行？能说一下 Nuxt 4 的生命周期吗？
13. AI Native 的理解
14. AST 静态分析是做什么的？
15. 对比无 AST 编码的提升效果
16. 日常的 AI 编码工具
17. harness 怎么理解？
18. 了解是如何和大模型进行交互的吗？
19. MCP 协议原理，大模型如何和 MCP 工具交互？
20. rules、skill 和 AGENTS.md 分别放什么，分别有什么区别？
21. 为什么要写这个 MCP？
22. 算法题：手撕 `listToTree`
23. 反问：B 端和 C 端都有，技术栈 Vue 2、Vue 3、少量 React

---

## 面试复盘总结

### 1) 什么是浏览器同源策略？（Q2）

同源策略是浏览器的一种安全机制，用来限制一个源的脚本读取另一个源的资源。

所谓“同源”，要求三部分完全一致：

1. **协议**：`http` 和 `https` 不同源。
2. **域名**：`a.example.com` 和 `b.example.com` 不同源。
3. **端口**：`example.com:3000` 和 `example.com:8080` 不同源。

比如：

```text
https://www.example.com:443/page
```

它的源是：

```text
协议：https
域名：www.example.com
端口：443
```

只要协议、域名、端口有任何一个不同，就是跨域。

同源策略限制的是 **浏览器脚本读取跨源响应的能力**，不是简单地阻止请求发出。很多跨域请求实际上已经到达服务端了，只是浏览器发现响应头不满足 CORS 要求，于是拦截 JS 读取响应。

面试里可以这样说：

> 同源策略是浏览器为了防止恶意网站读取用户在其他网站上的敏感数据而设计的安全策略。它要求协议、域名、端口三者一致才算同源。跨域请求不一定发不出去，更多时候是浏览器不允许前端 JS 读取跨源响应。

### 2) 跨域访问接口常用解决方式，CORS 白名单浏览器层面表现（Q3）

前端访问接口时，最常见的跨域方案是 **CORS**。

CORS 的核心是：服务端通过响应头告诉浏览器“哪些源可以访问我”。

常见响应头：

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

#### 简单请求和预检请求

跨域请求分为简单请求和非简单请求。

简单请求例如普通 `GET`、`POST`，并且请求头和 `Content-Type` 满足限制，浏览器会直接发出请求。

非简单请求会先发一个 `OPTIONS` 预检请求，问服务端：

```text
我这个 origin 能不能访问？
我这个 method 能不能用？
我这些 headers 能不能带？
```

服务端允许后，浏览器才会继续发送真正的业务请求。

#### CORS 白名单在浏览器层面的表现

如果当前页面 origin 在服务端白名单里：

1. 浏览器发起请求。
2. 服务端返回 `Access-Control-Allow-Origin`。
3. 浏览器校验通过。
4. JS 可以正常拿到响应数据。

如果当前页面 origin 不在白名单里：

1. 请求可能已经发到服务端。
2. 服务端没有返回匹配的 CORS 响应头。
3. 浏览器拦截响应。
4. 控制台报 CORS 错误。
5. JS 拿不到响应内容。

需要注意：CORS 是浏览器安全策略，不是服务端鉴权。服务端接口仍然必须做权限校验。

#### 其他跨域方案

1. **开发代理**：Vite / Webpack devServer proxy，把浏览器请求转成同源请求。
2. **Nginx 反向代理**：线上通过同域路径转发到后端服务。
3. **JSONP**：历史方案，只支持 GET，本质利用 `<script>` 不受同源限制。
4. **postMessage**：用于跨域 iframe / 窗口通信，不适合普通接口请求。

### 3) Cookie 作用，一般什么场景用？（Q4）

Cookie 是浏览器存储在客户端的一小段数据，会在符合条件的请求中自动携带到服务端。

常见用途：

1. **登录态 / 会话标识**：服务端通过 Cookie 里的 session id 识别用户。
2. **鉴权 Token 存储**：部分系统会把 token 放在 Cookie 中。
3. **个性化偏好**：语言、主题、实验分组等。
4. **埋点追踪**：用户标识、访问来源、广告归因等。

Cookie 常见属性：

```http
Set-Cookie: sid=abc; Path=/; HttpOnly; Secure; SameSite=Lax
```

重点属性：

- `HttpOnly`：禁止 JS 读取，降低 XSS 窃取 Cookie 的风险。
- `Secure`：只在 HTTPS 下发送。
- `SameSite`：限制跨站请求携带 Cookie，缓解 CSRF。
- `Domain` / `Path`：控制 Cookie 生效范围。
- `Expires` / `Max-Age`：控制过期时间。

面试表达：

> Cookie 最大的特点是请求会自动携带，所以非常适合做登录态和会话识别。但也因为自动携带，容易涉及 CSRF 风险，所以关键 Cookie 要配合 `SameSite`、`HttpOnly`、`Secure`，服务端也要做 CSRF Token 或其他鉴权校验。

### 4) JS 原型链是什么？`__proto__` 和 `prototype` 指向什么？（Q6）

JS 的继承主要通过原型链实现。

每个对象内部都有一个隐藏引用，指向它的原型对象。访问对象属性时，如果对象本身没有这个属性，就会沿着原型继续向上查找，直到找到属性或到达 `null`。

这条查找链路就是原型链。

```javascript
function Person(name) {
  this.name = name;
}

Person.prototype.sayHi = function () {
  return `Hi, ${this.name}`;
};

const yuki = new Person('Yuki');

console.log(yuki.sayHi()); // Hi, Yuki
```

这里发生了几件事：

1. `Person.prototype` 是构造函数的原型对象。
2. `yuki.__proto__` 指向 `Person.prototype`。
3. `Person.prototype.constructor` 指回 `Person`。

关系可以写成：

```javascript
yuki.__proto__ === Person.prototype; // true
Person.prototype.constructor === Person; // true
```

#### `__proto__` 是什么？

`__proto__` 是对象访问其内部原型 `[[Prototype]]` 的历史访问器。

```javascript
const obj = {};

console.log(obj.__proto__ === Object.prototype); // true
```

更标准的写法是：

```javascript
Object.getPrototypeOf(obj);
Object.setPrototypeOf(obj, prototype);
```

#### `prototype` 是什么？

`prototype` 是函数对象上的属性，主要用于构造函数创建实例时，作为实例的原型。

不是所有对象都有 `prototype` 属性，普通对象没有；函数才有。

```javascript
function Foo() {}

const foo = new Foo();

console.log(Foo.prototype); // 构造函数的原型对象
console.log(foo.__proto__ === Foo.prototype); // true
```

面试表达：

> `prototype` 是函数作为构造函数时给实例准备的原型对象；`__proto__` 是实例对象指向自己原型的引用。实例的 `__proto__` 通常等于构造函数的 `prototype`。属性访问时会沿着 `__proto__` 这条链一路向上查找，这就是原型链。

### 5) 闭包的理解（Q7）

闭包是指：函数能够访问其词法作用域中的变量，即使外层函数已经执行结束。

```javascript
function createCounter() {
  let count = 0;

  return function increment() {
    count++;
    return count;
  };
}

const counter = createCounter();

console.log(counter()); // 1
console.log(counter()); // 2
```

`createCounter` 执行结束后，`count` 没有被销毁，因为返回的 `increment` 函数仍然引用着它。

常见使用场景：

1. **数据私有化**：外部不能直接修改内部变量。
2. **函数柯里化**：提前固定一部分参数。
3. **防抖节流**：保存定时器 id 或上次执行时间。
4. **模块封装**：隐藏内部实现，只暴露 API。
5. **React Hooks 闭包快照**：函数组件每次 render 都形成自己的闭包。

风险：

闭包会延长变量生命周期。如果闭包长期持有大对象、DOM 节点或无用数据，可能导致内存占用无法释放。

### 6) 防抖和节流使用场景，什么区别？（Q8）

防抖和节流都是控制高频事件触发频率的手段，但目标不同。

#### 防抖 debounce

防抖是：事件持续触发时不执行，等最后一次触发结束后，延迟一段时间再执行。

适合场景：

1. 搜索框输入联想
2. 表单输入校验
3. 窗口 resize 后重新计算布局
4. 按钮防重复提交

```javascript
function debounce(fn, delay) {
  let timer = null;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

#### 节流 throttle

节流是：事件持续触发时，保证一段时间内最多执行一次。

适合场景：

1. 滚动监听
2. 鼠标拖拽
3. 页面滚动加载更多
4. 高频埋点上报

```javascript
function throttle(fn, interval) {
  let lastTime = 0;

  return function (...args) {
    const now = Date.now();

    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

一句话区别：

> 防抖关注“最后一次”，适合等用户停下来再执行；节流关注“固定频率”，适合高频事件中按节奏持续执行。

### 7) 虚拟 DOM 作用（Q9）

虚拟 DOM 是用 JS 对象描述真实 DOM 结构。

它的核心作用不是“绝对比原生 DOM 快”，而是提供一层可控的抽象，让框架能够声明式更新 UI。

主要价值：

1. **声明式编程**：开发者只关心状态到 UI 的映射，不手动操作 DOM。
2. **跨平台能力**：同一套组件模型可以渲染到 DOM、Native、小程序等不同平台。
3. **批量更新**：框架可以收集多次状态变化后统一更新。
4. **Diff 最小化提交**：通过对比新旧虚拟 DOM，减少不必要的真实 DOM 操作。
5. **组件抽象**：虚拟 DOM 承载组件树、props、children 等信息，方便组合和复用。

面试表达：

> 虚拟 DOM 的意义不只是性能，而是让 UI 更新从命令式 DOM 操作变成声明式状态驱动。框架可以在虚拟 DOM 层做 diff、批处理和跨平台渲染，最终把必要变化提交到真实 DOM。

### 8) Vue 3 响应式原理，初始化的时候 Proxy 收集什么内容？（Q10）

Vue 3 响应式核心是 `Proxy` + 依赖收集。

当一个对象被 `reactive` 包裹后，Vue 会返回一个 Proxy 代理对象：

```javascript
const state = reactive({
  count: 0,
});
```

读取属性时触发 `get`：

```text
state.count -> proxy get -> track(target, key)
```

修改属性时触发 `set`：

```text
state.count = 1 -> proxy set -> trigger(target, key)
```

#### 初始化时 Proxy 会收集什么？

严格来说，Proxy 包裹对象的那一刻，并不会把所有字段的依赖一次性收集完。

Vue 的依赖收集是 **运行时按需收集**：

1. 组件渲染或 `effect` 执行时，会访问响应式数据。
2. 访问某个属性时触发 Proxy 的 `get`。
3. Vue 知道当前正在运行的副作用函数 `activeEffect`。
4. Vue 把 `target -> key -> activeEffect` 记录到依赖桶里。

依赖结构可以理解成：

```text
WeakMap targetMap
  target object -> Map depsMap
    key -> Set effects
```

比如模板里用了：

```vue
<template>
  <div>{{ state.count }}</div>
</template>
```

首次渲染时读取 `state.count`，Vue 会收集：

```text
target = 原始对象
key = count
effect = 当前组件渲染副作用
```

之后 `state.count` 改变，Vue 就能找到依赖 `count` 的组件渲染 effect，触发更新。

#### 面试易错点

不要说“初始化时 Proxy 会遍历收集所有属性依赖”。更准确的是：

> 初始化 reactive 时会创建 Proxy 代理，但依赖是在属性被读取时通过 get 拦截按需收集的。也就是说，谁在渲染或 effect 中读取了某个 key，谁就会被记录为这个 key 的依赖。

### 9) `onMounted` 在服务端还是客户端执行？Nuxt 4 生命周期怎么理解？（Q12）

`onMounted` 只在客户端执行，不会在服务端执行。

原因是服务端渲染阶段没有真实 DOM。`onMounted` 的语义是“组件挂载到 DOM 后执行”，所以它只能发生在浏览器端。

同理，这些生命周期只在客户端执行：

```text
onMounted
onUpdated
onUnmounted
```

服务端渲染时会执行：

1. `setup`
2. 可在服务端运行的数据获取逻辑，比如 Nuxt 的 `useAsyncData` / `useFetch`
3. 服务端插件、服务端中间件等服务端上下文逻辑

#### Nuxt 4 生命周期可以这样理解

Nuxt 的一次页面访问大致分为两段：服务端阶段和客户端阶段。

#### 服务端阶段

用户首次访问页面：

```text
请求进入 Nitro 服务端
  -> 执行 server middleware / route middleware
  -> 创建 Vue 应用
  -> 执行页面 setup
  -> 执行 useAsyncData / useFetch 等数据获取
  -> 渲染 HTML
  -> 把 payload 注入页面
  -> 返回 HTML 给浏览器
```

这个阶段没有 DOM，所以不能访问 `window`、`document`，也不会执行 `onMounted`。

#### 客户端水合阶段

浏览器拿到 HTML 后：

```text
加载 JS bundle
  -> 创建客户端 Vue 应用
  -> 复用服务端返回的 HTML
  -> 根据 payload 恢复数据
  -> hydrate 绑定事件
  -> 执行 onMounted
```

水合完成后，页面才真正具备完整交互能力。

#### 客户端路由切换阶段

用户在站内跳转时：

```text
执行 route middleware
  -> 获取新页面数据
  -> 组件更新 / 卸载旧页面
  -> 挂载新页面组件
```

此时通常不会再走完整服务端 HTML 渲染，而是客户端路由接管。

面试回答：

> `onMounted` 只在客户端执行，因为服务端没有真实 DOM。Nuxt 首屏访问时会先在服务端执行页面 setup 和数据获取，生成 HTML 和 payload 返回给浏览器；浏览器加载 JS 后进行 hydration，复用服务端 HTML 并绑定事件，之后才执行 `onMounted`。所以涉及 DOM、window、document 的逻辑要放在客户端生命周期或 `.client` 插件里。
