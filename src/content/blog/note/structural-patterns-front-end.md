---
title: 设计模式：结构型模式
link: structural-patterns-front-end
catalog: true
date: 2026-05-31 19:41:42
description: 从前端视角拆解结构型模式，围绕接口适配、功能扩展与性能权衡，给出适配器、装饰器、代理、桥接、组合、外观、享元的实战代码与耦合对照。
tags:
  - 设计模式
  - 前端
  - 结构型模式
  - Vue
  - TypeScript
categories:
  - 笔记
cover: /img/cover/note6.webp
---

## 结构型模式到底在解决什么？

结构型模式的核心，只有一个问题：**如何组合类或对象**。它的出发点不是“再发明一个轮子”，而是**在不破坏原有结构的前提下，通过继承或组合去扩展新功能，让原来的结构变得更强大**。

它通常在以下这些场景出现：接口不兼容但又不能全盘重写；系统需要动态扩展功能但不想动核心；以及在“更细粒度、更高效率”之间做权衡时，想要一条更稳的路。

**一句话总结** :把“怎么连接/拼装”这件事，和“怎么使用”分开。

---

## 适配器模式（Adapter Pattern）

### 前端真实场景：后端统一调整了响应体结构

Axios 是前端的“空气”，但空气也会突然被后端改配方。比如原来后端约定的响应体是 `{ code, data, msg }`，现在一换版本，变成了 `{ status, payload, message }`。

### 第一反应：全项目一处处改字段

```ts
const res = await axios.get("/api/user");

if (res.data.status === 0) {
  userStore.set(res.data.payload);
}
```

### 灾难：改不完、改不稳、改了还会漏

1. **调用点满地开花**：你要改的不是一个接口，而是 200 个页面。
2. **历史模块崩盘**：老代码依旧在拿 `code` 和 `data`，很容易出现“业务没报错但数据全空”的隐性灾难。

### 解决思路：给 axios 装一个适配器

```ts
type LegacyResult<T> = { code: number; data: T; msg: string };
type NewResult<T> = { status: number; payload: T; message: string };

function adaptResponse<T>(raw: NewResult<T>): LegacyResult<T> {
  return {
    code: raw.status,
    data: raw.payload,
    msg: raw.message,
  };
}

const http = axios.create();

http.interceptors.response.use((res) => {
  return {
    ...res,
    // 统一回旧协议，业务层无需改动
    data: adaptResponse(res.data),
  };
});

type User = { id: string; name: string };

async function getUser(id: string) {
  const res = await http.get<LegacyResult<User>>(`/api/user/${id}`);
  if (res.data.code !== 0) throw new Error(res.data.msg);
  return res.data.data;
}
```

业务层继续写老协议，变更只集中在适配器里，后端怎么换，你只改一个文件。

---

## 装饰器模式（Decorator Pattern）

### 前端真实场景：统计每个请求的耗时与性能

我们经常要统计接口耗时、加上错误上报，或者做统一的 loading。装饰器的核心就是：**不改原函数，只给它套一个“外壳”**。

### 第一反应：在函数内部直接加逻辑

```ts
async function fetchUser(id: string) {
  const start = performance.now();
  const res = await http.get(`/api/user/${id}`);
  const cost = performance.now() - start;
  reportPerf("fetchUser", cost);
  return res.data;
}
```

### 灾难：横切逻辑污染业务函数

1. **每个函数都要塞一遍**：计时、上报、日志，全散在业务里。
2. **改一个策略要全局改**：性能埋点的规则变了，你要翻遍所有函数。

### 解决思路：装饰器把“横切关注点”抽离

```ts
function Timer(name?: string) {
  // 装饰器工厂：包一层计时逻辑
  return (_target: unknown, key: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (...args: any[]) => Promise<unknown>;
    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      try {
        return await original.apply(this, args);
      } finally {
        // 无论成功失败都上报耗时
        reportPerf(name ?? key, performance.now() - start);
      }
    };
    return descriptor;
  };
}

class UserService {
  @Timer("fetchUser")
  async fetchUser(id: string) {
    const res = await http.get(`/api/user/${id}`);
    return res.data;
  }
}
```

**直接用 TypeScript 装饰器语法**，业务函数不用改，横切逻辑集中在装饰器里。

---

## 代理模式（Proxy Pattern）

### 前端真实场景：响应式状态与自动更新

Vue 3 能做到“改数据 -> UI 自动更新”，核心并不是“自动变魔术”，而是 `Proxy` 拦截 `get/set`，在 `get` 时**收集依赖**，在 `set` 时**触发更新**。这就是“响应式系统”的本体。

### 第一反应：手动维护状态和通知

```ts
const state = { count: 0 };
const listeners: Array<() => void> = [];

function setCount(n: number) {
  state.count = n;
  listeners.forEach((fn) => fn());
}
```

### 灾难：你在手工写一个残次版响应式系统

1. **可维护性极差**：每个字段都要写 setter。
2. **一致性失控**：有人直接改 `state.count`，监听就断了。

### 解决思路：手写一个最小可用的响应式

```ts
type EffectFn = () => void;

// target -> key -> effects
const bucket = new WeakMap<object, Map<PropertyKey, Set<EffectFn>>>();
// 当前正在执行的副作用
let activeEffect: EffectFn | null = null;

function effect(fn: EffectFn) {
  // 注册副作用：执行时会触发依赖收集
  const runner = () => {
    activeEffect = runner;
    fn();
    activeEffect = null;
  };
  runner();
}

function track(target: object, key: PropertyKey) {
  // 依赖收集：记录“谁在用这个 key”
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    depsMap = new Map();
    bucket.set(target, depsMap);
  }
  let deps = depsMap.get(key);
  if (!deps) {
    deps = new Set();
    depsMap.set(key, deps);
  }
  deps.add(activeEffect);
}

function trigger(target: object, key: PropertyKey) {
  // 触发更新：把依赖这个 key 的副作用全部重新执行
  bucket.get(target)?.get(key)?.forEach((fn) => fn());
}

function reactive<T extends object>(obj: T): T {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver);
      // get 时收集依赖
      track(target, key);
      return res;
    },
    set(target, key, value, receiver) {
      const old = Reflect.get(target, key, receiver);
      const result = Reflect.set(target, key, value, receiver);
      // set 时触发更新
      if (old !== value) trigger(target, key);
      return result;
    },
  });
}

const state = reactive({ count: 0 });

effect(() => {
  const el = document.querySelector("#count");
  if (el) el.textContent = String(state.count);
});

state.count += 1;
```

业务不碰核心对象，只操作代理。**依赖在 get 时收集、更新在 set 时触发**，这就是 Vue3 响应式的关键脉络。

---

## 桥接模式（Bridge Pattern）

### 前端真实场景：同一套 UI 对接多种数据源

同一个图表组件既要展示“实时接口数据”，又要展示“本地 mock 数据”。如果把数据逻辑写死在组件里，UI 会被绑架。

### 第一反应：组件里写一堆 if/else

```ts
function renderChart(sourceType: "api" | "mock") {
  if (sourceType === "api") {
    // 拉接口 -> 转换 -> 渲染
  } else {
    // 读取本地数据 -> 渲染
  }
}
```

### 灾难：数据源越多，组件越像屎山

1. **UI 组件承包所有业务**：数据源、转换规则、渲染细节全混一起。
2. **组合爆炸**：数据源 _ 主题 _ 平台，组合数无限膨胀。

### 解决思路：桥接“UI 与数据源/渲染器”

```ts
type DataSource = () => Promise<number[]>;
type Renderer = (el: HTMLElement, series: number[]) => void;

const createApiSource = (): DataSource => async () => {
  const res = await http.get("/api/sales");
  return res.data;
};

const createMockSource = (): DataSource => async () => [120, 90, 150];

const renderBar: Renderer = (el, series) => {
  el.innerHTML = series.map((n) => `<div class="bar" style="height:${n}px"></div>`).join("");
};

const renderLine: Renderer = (el, series) => {
  el.innerHTML = `<svg>${series.map((n, i) => `<circle cx="${i * 40}" cy="${200 - n}" r="4"/>`).join("")}</svg>`;
};

async function mountChart(el: HTMLElement, source: DataSource, renderer: Renderer) {
  // 桥接：数据源与渲染器独立，组合时再拼接
  const series = await source();
  renderer(el, series);
}

// React/Vue 都可以这样用：数据源与渲染器自由组合
const el = document.querySelector("#chart") as HTMLElement;
mountChart(el, createApiSource(), renderBar);
```

UI 组件只关心“怎么画”，数据源只关心“从哪来”，**组合靠桥接拼装**，不会互相牵连。

---

## 组合模式（Composite Pattern）

### 前端真实场景：文件夹与文件的统一管理

文件系统里既有“文件夹”，也有“文件”。对 UI 来说都要渲染、都要统计大小、都要支持展开，但内部结构完全不同。

### 第一反应：写一堆判断

```ts
function renderNode(node: any) {
  if (node.children) {
    node.children.forEach(renderNode);
  } else {
    renderFile(node);
  }
}
```

### 灾难：你在手写“叶子/容器”分支地狱

1. **每次调用都要判断类型**：递归逻辑越来越复杂。
2. **扩展节点类型困难**：新增“分组”/“分割线”时全得改。

### 解决思路：统一成一种“节点”接口

```ts
type FileNode = {
  type: "file";
  name: string;
  size(): number;
  print(indent?: string): string[];
};

type FolderNode = {
  type: "folder";
  name: string;
  children: Node[];
  add(node: Node): void;
  size(): number;
  print(indent?: string): string[];
};

type Node = FileNode | FolderNode;

const createFile = (name: string, bytes: number): FileNode => ({
  type: "file",
  name,
  size: () => bytes,
  print: (indent = "") => [`${indent}- ${name} (${bytes}b)`],
});

const createFolder = (name: string, children: Node[] = []): FolderNode => ({
  type: "folder",
  name,
  children,
  add(node: Node) {
    children.push(node);
  },
  // 汇总子节点大小
  size: () => children.reduce((total, child) => total + child.size(), 0),
  print: (indent = "") => {
    // 递归打印树结构
    const lines = [`${indent}+ ${name}/`];
    children.forEach((child) => lines.push(...child.print(`${indent}  `)));
    return lines;
  },
});

const root = createFolder("src", [
  createFile("main.ts", 1200),
  createFolder("components", [createFile("Button.tsx", 800)]),
]);

root.add(createFolder("assets", [createFile("logo.png", 2048)]));
console.log(root.size());
console.log(root.print().join("\n"));
```

**文件与文件夹都实现同一套节点接口**，上层只管调用 `size()` / `print()`，不用知道它是单体还是组合。

---

## 外观模式（Facade Pattern）

### 前端真实场景：上传流程 = 压缩 + 鉴权 + 上传 + 通知

一个“上传头像”背后可能串了 4 个模块。如果每个页面都手动拼这些流程，维护将变成灾难。

### 第一反应：每个页面手写一套流程

```ts
await compress(file);
const token = await fetchUploadToken();
const url = await uploadFile(file, token);
await notifyProfile(url);
```

### 灾难：流程散落，错误处理碎一地

1. **每个页面都得 copy 一遍**：改个接口名要全局替换。
2. **错误处理完全不一致**：有的吞错，有的弹窗，有的啥也不做。

### 解决思路：外观模式统一入口

```ts
type UploadOptions = {
  onProgress?: (percent: number) => void;
  onError?: (err: unknown) => void;
};

async function uploadAvatar(file: File, options: UploadOptions = {}) {
  try {
    // 对外只暴露一个入口，内部步骤统一编排
    const compressed = await compress(file);
    const token = await fetchUploadToken();
    const url = await uploadFile(compressed, token, options.onProgress);
    await notifyProfile(url);
    return url;
  } catch (err) {
    options.onError?.(err);
    throw err;
  }
}

// UI 侧只关心一个入口
await uploadAvatar(file, {
  onProgress: (p) => setProgress(Math.round(p * 100)),
  onError: () => toast("上传失败"),
});
```

对外只有一个入口，复杂流程被“挡在门后”，这就是外观模式的价值。

---

## 享元模式（Flyweight Pattern）

### 前端真实场景：地图上成千上万的标记点

地图上有 1 万个点，它们的样式都一样，只有坐标不同。你如果每个点都 `new` 一份图标对象，内存直接顶满。

### 第一反应：每个点都独立创建图标

```ts
const markers = points.map((p) => new Marker(p, new Icon("shop")));
```

### 灾难：内存暴涨 + 初始化卡顿

1. **对象重复创建**：1 万个 icon 明明长一样，却重复造了 1 万次。
2. **渲染启动时卡顿**：初始化全在主线程上堆着。

### 解决思路：共享“内在状态”，外部传“外在状态”

```ts
class IconFactory {
  private cache = new Map<string, Icon>();

  get(type: string) {
    // 相同类型复用同一个 Icon
    if (!this.cache.has(type)) {
      this.cache.set(type, new Icon(type));
    }
    return this.cache.get(type)!;
  }
}

const iconFactory = new IconFactory();

const markers = points.map((p) => ({
  position: p, // 外在状态
  icon: iconFactory.get("shop"), // 内在状态共享
}));

function renderMarker(marker: { position: { x: number; y: number }; icon: Icon }) {
  drawIcon(marker.icon, marker.position);
}
```

只要图标类型不变，Icon 永远复用，内存压力瞬间降一个数量级。

---

## 总结：结构型模式到底在帮你什么？

结构型模式关心的不是“对象怎么来”，而是**对象怎么被拼接与复用**。它让结构能长大，但不会把原有系统撕碎。

| 模式       | 重点           | 解决什么耦合                         |
| ---------- | -------------- | ------------------------------------ |
| 适配器模式 | 兼容新旧接口   | 接口变化导致的全量改动               |
| 装饰器模式 | 横切能力叠加   | 业务逻辑与统计/监控/日志的混杂       |
| 代理模式   | 间接访问控制   | 直接操作对象导致的状态失控与无拦截点 |
| 桥接模式   | 抽象与实现分离 | UI 与数据源/主题的组合爆炸           |
| 组合模式   | 树形一致访问   | 叶子与容器的分支判断地狱             |
| 外观模式   | 统一入口       | 多模块流程散落、错误处理不一致       |
| 享元模式   | 共享内在状态   | 重复对象带来的内存与性能浪费         |

### 最后用一句前端味更重的话收尾

当你发现一个组件需要知道“内部结构到底拼了多少层、谁要先执行、谁要复用”，它已经开始失控了。

结构型模式要做的，就是把“拼结构的脏活”收回去，让业务层只管用、别管怎么连。
