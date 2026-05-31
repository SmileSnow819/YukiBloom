---
title: 设计模式前端笔记：创建型模式全解
link: creational-patterns-front-end
catalog: true
date: 2026-05-31 20:00:00
description: 从前端视角重新梳理创建型模式，补全工厂、单例、依赖注入、原型、建造者和对象池的实战代码、耦合对照与 Vue provide/inject 示例。
tags:
  - 设计模式
  - 前端
  - 创建型模式
  - Vue
  - TypeScript
categories:
  - 笔记
cover: /img/cover/note.webp
---

## 创建型模式到底在解决什么？

创建型模式的核心，不是“发明几个高大上的名词”，而是把对象创建这件事从业务代码里收回来，交给一个更稳定、更统一的地方处理。

如果你到处都是 `new Xxx()`，对象的创建方式、参数变化、依赖顺序一改，整个项目都会跟着震动。创建型模式本质上就是在降低这种“创建方式变化”带来的耦合。

**一句话总结** :把“怎么创建对象”这件事，和“怎么使用对象”分开。

---

## 工厂模式（Factory Pattern）

### 前端真实场景：根据数据动态渲染不同卡片

在富文本编辑器、低代码平台、CMS 页面里，经常会遇到这种场景：后端返回一个 type，你要根据 type 渲染不同组件。

比如后端接口真实返回的一份页面区块数据可能是这样的：

```json
{
  "id": "block_9527",
  "type": "video",
  "properties": {
    "src": "https://example.com/movie.mp4",
    "autoplay": true,
    "controls": false
  },
  "layout": {
    "width": "100%",
    "marginTop": "20px"
  }
}
```

面对这种数据，我们很多人的第一反应就是在业务层直接写一长串的 `if / else` 或者 `switch`，即：把“判断类型、收集参数、实例化核心类”这三件事揉在一起。

一段不假思索的、高度耦合的渲染逻辑大概率会长这样：

```ts
// 假设这些是我们底层依赖的第三方或自己写的复杂组件类
import { VideoPlayer, ImageViewer, TextRender } from "@/libs/ui-core";

function renderBlock(blockData: any) {
  // 🚨 耦合发生地：需要关心要 new 谁，还要关心每个类初始化需要怎么塞参数
  if (blockData.type === "video") {
    const player = new VideoPlayer({
      url: blockData.properties.src,
      auto: blockData.properties.autoplay,
      showControls: blockData.properties.controls,
    });
    player.setStyle(blockData.layout);
    return player.mount();
  } else if (blockData.type === "image") {
    const viewer = new ImageViewer(blockData.properties.src);
    viewer.setStyle(blockData.layout);
    return viewer.mount();
  } else if (blockData.type === "text") {
    const textNode = new TextRender(blockData.properties.content);
    textNode.setStyle(blockData.layout);
    return textNode.mount();
  }

  throw new Error("未知的区块类型");
}
```

这里的问题很快就暴露出来了：`renderBlock` 这个普通的业务视图函数，背负了太多。它既负责“判断结构”，又负责“去调底层的各种类”，还负责“拼装特定的参数和样式”。一旦新增一个 `quote` 引用类型，或者大版本更新 `VideoPlayer` 的构造函数的入参变了，这个函数就得跟着大改。

### 如果没有工厂，灾难还会蔓延

如果上面这段逻辑只在一个地方写还能忍，但往往这些底层实体类需要在多个位置被实例化。比如 Toolbar、快捷键、右键菜单里都可能需要凭空生成一个视频块。

没有工厂时，业务组件会自己决定“创建谁、怎么创建、参数怎么传”，于是每个文件里都开始写同样的实现：

```ts
// Toolbar.vue
const block = blockType === "video"
    ? new VideoPlayer({ /* 传一堆参 */ })
    : blockType === "image"
      ? new ImageViewer(/* 传参数 */)
      : new TextRender(/* 传参数 */);

// Shortcut.vue
const block = blockType === "video" ? new VideoPlayer({ /* ... */ }) : /* ... */

// RightMenu.vue
const block = blockType === "video" ? new VideoPlayer({ /* ... */ }) : /* ... */
```

这会带来两个绝望的问题：

1. **创建逻辑散落到处都是**。以后 `VideoPlayer` 构造函数多一个必填参数，你要全局搜索这十几个文件，挨个 `new VideoPlayer(...)` 去改，直接崩溃。
2. **业务组件被创建细节绑死**。组件本来只该关心“我要一个卡片”，结果被迫知道了“底层的某个卡片到底是怎么造出来的和需要什么格式的参数”。

### 更前端一点的写法：工厂模式解耦

工厂模式的核心，就是建一个专门用来“制造对象”的工厂。业务层只管提交“加工单”，工厂负责查参数、分配给具体类。

```ts
import { VideoPlayer, ImageViewer, TextRender } from "@/libs/ui-core";

// 🌟 创建一个专门的制造工厂
export class BlockFactory {
  static create(blockData: any) {
    let instance;
    switch (blockData.type) {
      case "video":
        instance = new VideoPlayer({
          url: blockData.properties.src,
          auto: blockData.properties.autoplay,
          showControls: blockData.properties.controls,
        });
        break;
      case "image":
        instance = new ImageViewer(blockData.properties.src);
        break;
      case "text":
        instance = new TextRender(blockData.properties.content);
        break;
      default:
        throw new Error(`不支持的类型: ${blockData.type}`);
    }

    // 统一处理公共逻辑，比如样式挂载
    if (blockData.layout && instance.setStyle) {
      instance.setStyle(blockData.layout);
    }

    return instance;
  }
}
```

调用方的世界彻底清爽了：

```ts
// renderBlock.ts 或者是 Vue组件内部
import { BlockFactory } from "./BlockFactory";

function renderBlock(blockData: any) {
  // 业务层再也不用关心到底 new 了什么、传了什么细节散参
  const block = BlockFactory.create(blockData);
  return block.mount();
}
```

这样后续如果新增 `QuoteCard`，你**只需改且只改 `BlockFactory` 一个文件**即可，其它业务层逻辑纹丝不动。

---

## 单例模式（Singleton Pattern）

### 前端真实场景：全局唯一的 WebSocket 消息通知

假设我们在做一个有很多页面的管理系统，几乎每个页面（顶部的未读消息红点、侧边栏的审批通知、甚至弹窗里）都需要实时接收后端的 WebSocket 消息。

### 第一反应：哪里需要，就在哪里连

最直白的写法就是，我们在 `Header.vue` 和 `Sidebar.vue` 里各自去建立连接：

```ts
// Header.vue
const ws = new WebSocket("wss://api.example.com/notifications");
ws.onmessage = (msg) => {
  console.log("更新顶部红点", msg);
};

// Sidebar.vue
const ws = new WebSocket("wss://api.example.com/notifications");
ws.onmessage = (msg) => {
  console.log("更新侧边栏待办", msg);
};
```

### 灾难：服务器爆炸与状态非同步

如果真的这么写，会带来非常恐怖的灾难：

1. **资源极度浪费**：用户打开一个页面，前端悄悄建立了 5 个 WebSocket 连接，后端连接数直接原地爆炸。
2. **数据不同步**：不同组件各自维系一个连接，由于网络延迟，顶部已经显示有新消息，侧边栏还是旧的。

### 解决思路：单例模式

单例的核心就是**“计划生育”，保证一个类在整个运行周期里，绝对只有唯一的一个实例**。如果是第一次要，我就建给你；如果已经建过了，我就把之前那个给你。

**经典的类实现方法（通过类的静态属性拦截）：**

```ts
export class WsManager {
  // 1. 静态属性存放唯一实例
  private static instance: WsManager | null = null;
  public ws: WebSocket;

  // 2. 构造函数私有化，防死外部 new WsManager()
  private constructor() {
    this.ws = new WebSocket("wss://api.example.com/notifications");
  }

  // 3. 唯一的获取入口
  public static getInstance() {
    if (!WsManager.instance) {
      WsManager.instance = new WsManager();
    }
    return WsManager.instance;
  }
}

// 后续在任何地方获取，拿到的都是同一个连接内存地址
const ws1 = WsManager.getInstance();
const ws2 = WsManager.getInstance();
console.log(ws1 === ws2); // true
```

**更现代的前端做法（ES Module 就是天然的单例）：**
如今在前端，打包工具自带模块缓存，我们根本不需要写那么绕的类代码。

```ts
// wsManager.ts
// 文件只会被解析执行一次，天然保证单例
export const globalWs = new WebSocket("wss://api.example.com/notifications");
```

到处 `import { globalWs } from './wsManager'` 即可。

---

## 依赖注入（Dependency Injection, DI）

### 前端真实场景：深层级组件的上下文传递

假设你的整个系统支持“暗黑/明亮”主题切换，并且内部有一套极端复杂的多级表单。
结构是这样的：`App -> Layout -> Page -> Table -> Form -> Button`。
最底层的 `Button` 按钮需要知道当前的 `theme` 来决定自己的背景色。

### 第一反应：Props 一路向下钻（Props Drilling）

最朴素的想法：既然数据在最顶层的 `App.vue`，我就一层层用 Props 传下去。

```vue
<!-- App.vue -->
<Layout :theme="currentTheme" />

<!-- Layout.vue -->
<Page :theme="props.theme" />

<!-- Page.vue -->
<Table :theme="props.theme" />

<!-- ... 一直传到 Button.vue -->
```

### 灾难：无辜的中间层被绑架

这种写法叫 props drilling（属性钻取）。

1. **中间组件被污染**：`Page` 和 `Table` 从头到尾都没用到 `theme`，但它们被迫在代码里声明并传递这个变量。代码又臭又长。
2. **高度耦合，难以复用**：如果你想把 `Table` 组件移植到另一个没有 `theme` 设定的项目里，它竟然会报错说少传了参数。

### 解决思路：依赖注入（DI）

依赖注入的精髓是：**最底层不用去问上层要，也不用自己想办法新建；顶层直接把东西“注入”到一个公共的空气通道里，底层直接“伸手拿”。**

在 Vue 3 里，这就是最经典的 `provide / inject`：

**顶层提供依赖（Provide）：**

```vue
<!-- App.vue (提供方) -->
<script setup>
import { provide, ref } from "vue";

const currentTheme = ref("dark");
// 把依赖注入到这棵组件树的虚拟空间中
provide("app-theme", currentTheme);
</script>
```

**底层无脑获取（Inject）：**

```vue
<!-- Button.vue (任意深的子组件) -->
<script setup>
import { inject } from "vue";

// 绕过所有中间层，直接伸手拿
const theme = inject("app-theme", "light" /* 默认值 */);
</script>

<template>
  <button :class="`btn-${theme}`">提交</button>
</template>
```

中间的 `Layout`, `Page`, `Table` 再也不需要碰 `theme` 这个雷区了，这也就是所谓**“控制反转（IoC）”**在组件层的最佳体现。

### 进阶前端场景：逻辑类的连环依赖（A 依赖 B，B 依赖 C）

在前端的复杂单页应用中，我们的网络请求模块（Service / API 抽象层）往往存在这种连环依赖：我们要写一个 `UserService` 请求用户数据；发请求前拿 Token 需要经过 `AuthService` 鉴权；而 `AuthService` 又必须依赖 `StorageService` 去读取底层的 `localStorage`。

**如果按照传统直觉去写（强耦合的层层 import 和 new）：**

```ts
// StorageService.ts
export class StorageService {
  /* 读写底层缓存 */
}

// AuthService.ts
import { StorageService } from "./StorageService";

export class AuthService {
  storage: StorageService;
  constructor() {
    // 🚨 灾难1：强行在此处实例化了底层的具体实现
    this.storage = new StorageService();
  }
}

// UserService.ts
import { AuthService } from "./AuthService";

export class UserService {
  auth: AuthService;
  constructor() {
    // 🚨 灾难2：继续俄罗斯套娃
    this.auth = new AuthService();
  }
}
```

_(注：上面这种写法，导致 `UserService`、`AuthService` 和 `StorageService` 三者这辈子彻底焊死了。这会带来无尽的折磨，比如你要给 `UserService` 写隔离单元测试时，它会一路顺藤摸瓜去读真实的缓存 API，直接引发环境报错；一旦 `StorageService` 构造函数需要加一个配置参数，你要去所有 `new StorageService` 的上游文件里挨个改代码！)_

### 终极解决思路：IoC 容器统一做这层“中间商”

我们在 Angular、InversifyJS（或后端的 NestJS）中见到的 DI，正是通过**IoC 容器**来彻底接管这一切。
它的精髓是：**你不准在 A 里面再去 `import B` 然后 `new B()` 了。需要依赖的类都在头上打个标签（`@Injectable`），大家只需要通过构造函数大喊“我要什么包”，剩下的一切统统交给“容器管家”去自动管理。**

```ts
import { Injectable, Container } from "di-library";

@Injectable()
class StorageService {}

@Injectable()
class AuthService {
  // 告诉管家：我需要一个 StorageService 实例，不用我自己 new，请派发给我
  constructor(private storage: StorageService) {}
}

@Injectable()
class UserService {
  // 告诉管家：我需要一个 AuthService 实例
  constructor(private auth: AuthService) {}
}

// 🌟 见证奇迹的时刻
const container = new Container();

// 业务端只管“伸手要”，拿到的就是配置好一切的完整对象：
const userService = container.get(UserService);
```

在这个过程中，**容器（Container）在底层偷偷帮你完成了一张依赖拓扑图**：
它看到你想要 `UserService`，但发现缺 `AuthService`，再去查发现还缺 `StorageService`。于是管家默默地帮你执行： `new StorageService()` -> 把缓存实例塞给 `new AuthService(...)` -> 最后把 auth 实例塞给 `new UserService(...)`。

**这就是 DI 最爽的地方：你只需要拿，不需要管。** 至于 C 怎么实例化的、B 的参数怎么来的？全部由统一的容器从上帝视角帮你构建好，我们再也不用手动去层层依赖、层层瞎改代码了。

### 附录：这个“管家”底层凭什么这么神奇？（极简版容器实现）

其实 IoC 容器没有魔法，它的核心本质就是一个**注册表（Map）**再加上**递归实例化**。借此机会，我们可以用十几行代码自己手写一个极简版的 Container，一看就懂：

```ts
class Container {
  // 核心：一个存放所有信息的大字典
  private registry = new Map();

  // 1. 登记办事处：把类和它需要的依赖存进来
  register(name: string, ClassRef: any, dependencies: string[] = []) {
    this.registry.set(name, { ClassRef, dependencies });
  }

  // 2. 核心大招：顺藤摸瓜，递归提车
  get(name: string) {
    const target = this.registry.get(name);
    if (!target) throw new Error(`${name} 还未注册`);

    // 递归去拿所有的依赖（如果依赖还有依赖，就继续向下挖）
    const resolvedDeps = target.dependencies.map((depName) =>
      this.get(depName),
    );

    // 把查到的所有依赖实例，当成参数原封不动地丢进构造函数！
    return new target.ClassRef(...resolvedDeps);
  }
}

// ============ 测试一下 ============
const container = new Container();

// 提前告诉管家：他们分别是谁，依赖什么？
container.register("Storage", StorageService);
container.register("Auth", AuthService, ["Storage"]); // Auth需要Storage
container.register("User", UserService, ["Auth"]); // User需要Auth

// 业务端发话了：管家，把你弄好的 User 给我！
const user = container.get("User");
// 管家收到：发车！内部自动执行了 get('Auth') -> get('Storage') 帮你 new 到底！
```

_(注：真实的 InversifyJS 或 Angular 容器比这更强大，它们能缓存实例（即单例模式），而且借助 TypeScript 的 `@Injectable()` 装饰器和 `reflect-metadata`，它内部能自动读取到你的构造函数里写了什么类型，你甚至连 `['Storage']` 这种依赖名字都不需要手写了！)_

---

## 原型模式（Prototype Pattern）

### 前端真实场景：满地都是的臃肿图表配置

我们在做后台大屏时，往往需要用到 ECharts。一个 ECharts 的 `option` 配置对象通常长达上百行，包括标题、图例、网格、提示框、X 轴、Y 轴等等。
现在一屏里要画 5 个图表（4 个折线图，1 个柱状图），长得几乎一模一样，只有数据不同。

### 第一反应：疯狂复制粘贴字典对象

```ts
// 图表A
const chartAOption = {
  title: { text: "销量" },
  tooltip: { trigger: "axis" },
  grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  series: [{ type: "line", data: [120, 200, 150] }],
};

// 图表B（直接把上面那一大坨复制过来改改数据）
const chartBOption = {
  title: { text: "访客" },
  tooltip: { trigger: "axis" },
  grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  series: [{ type: "line", data: [800, 900, 700] }],
};
```

### 灾难：一处 UI 改动，处处漏改

1. **代码极度膨胀**：5 个图表，500 行代码，翻都翻不到底。
2. **维护噩梦**：产品经理说“把图表边距 bottom 从 3% 统一改成 5%”。你得在成堆的代码里挨个 Ctrl+F 去找 `grid` 属性。万一漏改了哪怕一个，界面就出现了不对齐。

### 解决思路：原型模式

原型模式的本质：**先捏一个尽量完美的“泥人（模板）”，后面全靠这个泥人“克隆（拷贝）”，只对克隆体做微调。**

通过 `Object.create` 或 `structuredClone`（深拷贝）：

```ts
// 🌟 先定一个“原生泥人”（Base 原型）
const baseChartContext = {
  tooltip: { trigger: "axis" },
  grid: { left: "5%", right: "4%", bottom: "5%", containLabel: true },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
};

// 👇 接下来全靠拷贝微调
const chartAOption = structuredClone(baseChartContext);
chartAOption.title = { text: "销量" };
chartAOption.series = [{ type: "line", data: [120, 200, 150] }];

const chartBOption = structuredClone(baseChartContext);
chartBOption.title = { text: "访客" };
chartBOption.series = [{ type: "line", data: [800, 900, 700] }];
```

边距怎么改？只改 `baseChartContext` 那一个地方，瞬间生效全场。

---

## 建造者模式（Builder Pattern）

### 前端真实场景：复杂的弹窗参数 / 动态查询 API

写中后台列表页的请求时，我们需要处理一系列复杂的查询条件（关键词、页码、条数、状态枚举、时间范围、排序字段）。

### 第一反应：塞出一个无敌长的参数列表

```ts
function fetchTableData(
  keyword: string,
  page: number,
  size: number,
  status?: number,
  startDate?: string,
  endDate?: string,
  sortBy?: string,
) {
  // 一大坨拼 url 的逻辑
}

// 🚨 业务里调用时，场面极其惨烈：
fetchTableData("apple", 1, 20, undefined, undefined, undefined, "price");
```

或者稍微好一点，封装成一个大 Object：

```ts
fetchTableData({
  keyword: "apple",
  page: 1,
  size: 20,
  sortBy: "price",
});
```

但这还是没解决组装条件时，大量的判空逻辑散布在业务组件中的问题。

### 灾难：极差的可读性与扩展逻辑的散落

一旦我们需要根据用户点击不同的选项，渐进式地往里加参数（先设了时间，再设了状态，最后才点击发送），大参数对象会被传来传去，谁都可以在中途直接 `params.status = 1` 把它修改掉。哪天查不出数据了，你完全不知道参数是在哪一行被破坏的。

### 解决思路：建造者模式

建造者模式的思想是：**把一个复杂对象的创建过程“碎片化、流水线化”，通过链式调用，一步一步地把它“建造”出来，最后再出厂（build）。**

```ts
// 🌟 创建一个查询条件的“施工队”
class QueryBuilder {
  private params: Record<string, any> = { page: 1, size: 20 };

  // 各种 set 方法，总是 return this 以实现链式调用
  setKeyword(word: string) {
    if (word) this.params.keyword = word;
    return this;
  }
  setPaging(page: number, size: number) {
    this.params.page = page;
    this.params.size = size;
    return this;
  }
  setDateRange(start?: string, end?: string) {
    if (start && end) {
      this.params.startDate = start;
      this.params.endDate = end;
    }
    return this;
  }

  // 🌟 最后一道工序：出厂
  build() {
    return this.params;
  }
}
```

有了它，业务代码的可读性直线上升：

```ts
const finalParams = new QueryBuilder()
  .setKeyword("apple")
  .setPaging(1, 20)
  .setDateRange("2026-05-01", "2026-05-31")
  .build();

axios.get("/api/goods", { params: finalParams });
```

不光优雅，还在内部消灭了烦穿人的 `if (xxx !== undefined)`。

---

## 对象池模式（Object Pool）

### 前端真实场景：满屏的春节红包雨 / Canvas 子弹效果

在做双十一大促的“金币雨”特效，或者 Canvas 网页游戏里的机枪扫射时，屏幕上短时间内会出现成百上千个不断下落又消失的元素。

### 第一反应：疯狂创建与销毁 DOM / 对象

```ts
// 每 10 毫秒就 new 一枚新金币
setInterval(() => {
  const coin = new CoinNode();
  document.body.appendChild(coin.el);

  // 下落 3 秒后销毁
  setTimeout(() => {
    coin.el.remove();
    coin.destroy();
  }, 3000);
}, 10);
```

### 灾难：GC（垃圾回收）榨干了浏览器性能

在 V8 引擎（浏览器底层）里，创建对象要申请内存，销毁对象需要等待 Garbage Collection 去清理。
如果你每秒创建 100 个金币，同时又有一堆金币销毁，**GC 就会疯狂启动**。GC 启动时会阻塞主线程（Stop-the-world），进而导致你的动画出现肉眼可见的“卡顿、掉帧”。

### 解决思路：对象池模式

对象池不算是经典 GoF 的 23 种设计模式，却是前端渲染（不仅是 DOM，包括 WebGL）优化的神兵利器。
核心思想：**像图书馆借书一样。提前造好一堆对象放在池子里。要用就“借”，用完“隐藏并还”回池子，绝不销毁。**

```ts
class CoinPool {
  private pool: CoinNode[] = [];

  // 1. 初始化时，直接造 50 个隐藏的硬币塞进池子
  constructor(size = 50) {
    for (let i = 0; i < size; i++) {
      const coin = new CoinNode();
      coin.hide();
      this.pool.push(coin);
    }
  }

  // 2. 借出：不 new，直接从池子里捞一个闲置的拿去复用
  acquire(): CoinNode {
    // 找到还在池子里的硬币推出
    const coin = this.pool.pop();
    if (coin) return coin;

    // 实在不够了再补 new
    return new CoinNode();
  }

  // 3. 归还：隐藏，坐标归零，塞回池子接着等下一波
  release(coin: CoinNode) {
    coin.hide();
    coin.resetPosition();
    this.pool.push(coin);
  }
}
```

业务端逻辑：

```ts
const pool = new CoinPool(100); // 先备好 100 发子弹

setInterval(() => {
  const coin = pool.acquire(); // 借用
  coin.startFalling();

  setTimeout(() => {
    pool.release(coin); // 落下去了？回收！下一波接着用它。
  }, 3000);
}, 10);
```

通过这种方式，动画全程没有任何一个对象被销毁，GC 彻底处于休眠状态，帧率稳如老狗。

---

## 总结：创建型模式到底在帮你什么？

把这几种模式放在一起看，它们其实都在做一件事：**削弱“创建细节”对业务代码的污染。**

| 模式       | 重点         | 解决什么耦合                                 |
| ---------- | ------------ | -------------------------------------------- |
| 工厂模式   | 统一创建入口 | 业务代码判断繁琐、不再到处 `new`             |
| 单例模式   | 全局唯一实例 | 避免各种重复创建连累性能与状态不同步         |
| 依赖注入   | 外部提供依赖 | 对具体实现的硬绑定，组件树中间层惨遭连累     |
| 原型模式   | 基于模板复制 | 一大坨 JSON 对象重复写，改一次漏五次         |
| 建造者模式 | 分步骤打磨   | 发请求、构造复杂对象时可恶的大参数列表和判空 |
| 对象池模式 | 借出与回收   | 高频创建销毁导致的 GC 掉帧与页面卡死         |

### 最后用一句前端味更重的话收尾

如果一个组件一旦写进去，就必须知道“底层对象怎么造、深渊依赖怎么来、几百行配置怎么拼、渲染实例怎么销毁”，那这个组件就已经过度耦合了。

创建型模式要做的，就是把这些脏活从你的 Vue/React 业务代码里拿走。
**把“该谁管”划清楚，让组件专心画 UI，让创建的烂摊子交给专门的人去处理。**
