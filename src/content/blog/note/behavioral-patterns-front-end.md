---
title: 设计模式：行为型模式
link: behavioral-patterns-front-end
catalog: true
date: 2026-05-31 19:50:35
description: 从前端协作与状态流转视角拆解行为型模式，涵盖发布订阅、策略、状态、责任链、命令、模板方法、迭代器、备忘录、中介者、访问者、解释器的实战写法与耦合对照。
tags:
  - 设计模式
  - 前端
  - 行为型模式
  - Vue
  - TypeScript
categories:
  - 笔记
cover: /img/cover/note7.webp
---

## 行为型模式到底在解决什么？

行为型模式关注的不是“对象怎么来”，而是“对象怎么协作、怎么流转、怎么把行为拆开”。前端常见的状态切换、事件联动、流程编排，往往都藏着行为型模式的影子。

它的本质是：**把变化的行为从业务代码里抽出来**，让流程不再被一堆 `if / else` 驱动，而是被更清晰、更可替换的规则驱动。

**一句话总结** :把“谁来驱动流程 / 谁来响应变化”这件事，从业务里抽出来。

---

## 发布订阅模式（Publish-Subscribe / Observer Pattern）

### 前端真实场景：跨组件事件通知（Vue2 $bus → Vue3 单向数据流）

从 Vue2 的 `$bus` 到 Vue3 的 `emit`，发布订阅几乎是前端最熟的模式。Vue3 不再推荐 `$bus`，是因为它强化了单向数据流：**数据向下、事件向上**。

### 第一反应：上一个全局事件总线

```ts
// Vue2 时代常见写法
const bus = new Vue();

// A.vue
bus.$emit("user:login", user);

// B.vue
bus.$on("user:login", (u) => {
  userStore.set(u);
});
```

### 灾难：事件飞来飞去，谁也不负责

1. **事件名冲突**：全局事件越来越多，改一个名字会牵一堆文件。
2. **流向不可追踪**：谁 emit，谁监听，谁清理，完全失控。
3. **监听泄漏**：组件卸载后忘记 off，事件继续触发。

### 解决思路：手撕发布订阅 + 限定边界

```ts
type Handler = (payload?: any) => void;

class PubSub {
  // eventName -> handlers
  private events: Record<string, Set<Handler>> = {};

  on(event: string, handler: Handler) {
    // 订阅：返回取消函数
    if (!this.events[event]) this.events[event] = new Set();
    this.events[event].add(handler);
    return () => this.off(event, handler);
  }

  once(event: string, handler: Handler) {
    // 只触发一次
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(event: string, handler: Handler) {
    // 取消订阅
    this.events[event]?.delete(handler);
  }

  emit(event: string, payload?: any) {
    // 发布事件
    this.events[event]?.forEach((handler) => handler(payload));
  }
}

// 只在“认证模块”内部共享，而不是全局总线
const authBus = new PubSub();

export const onLogin = (fn: Handler) => authBus.on("login", fn);
export const emitLogin = (user: { id: string; name: string }) =>
  authBus.emit("login", user);
```

**发布订阅可以用，但必须有边界**。组件内优先 `props + emit`，跨模块再用模块级事件中心或状态库。

---

## 策略模式（Strategy Pattern）

### 前端真实场景：不同会员等级的定价策略

会员、渠道、节日折扣一多，价格计算就会变成一坨 `if/else`。这类“规则变化频繁”的场景，就是策略模式的主场。

### 第一反应：条件分支写到天荒地老

```ts
function calcPrice(plan: string, base: number) {
  if (plan === "free") return base;
  if (plan === "vip") return base * 0.9;
  if (plan === "svip") return base * 0.8;
  return base;
}
```

### 灾难：新增一个策略等于改核心逻辑

1. **分支越来越长**：新增“学生价 / 员工价”就得改核心函数。
2. **测试负担飙升**：每次新增都要回归所有分支。

### 解决思路：策略对象化，Context 执行策略

```ts
type PricingContext = {
  coupon?: number;
};

interface PricingStrategy {
  // 每个策略只实现自己的算法
  algorithm(base: number, ctx: PricingContext): number;
}

class FreeStrategy implements PricingStrategy {
  algorithm(base: number, ctx: PricingContext) {
    // 免费会员不打折，保留优惠券
    return base - (ctx.coupon ?? 0);
  }
}

class VipStrategy implements PricingStrategy {
  algorithm(base: number, ctx: PricingContext) {
    // VIP 9 折
    return base * 0.9 - (ctx.coupon ?? 0);
  }
}

class SvipStrategy implements PricingStrategy {
  algorithm(base: number, ctx: PricingContext) {
    // SVIP 8 折
    return base * 0.8 - (ctx.coupon ?? 0);
  }
}

class PricingContextExecutor {
  // Context 持有策略，可动态替换
  constructor(private strategy: PricingStrategy) {}

  setStrategy(strategy: PricingStrategy) {
    this.strategy = strategy;
  }

  executeStrategy(base: number, ctx: PricingContext) {
    // 对外统一入口
    return this.strategy.algorithm(base, ctx);
  }
}

const context = new PricingContextExecutor(new VipStrategy());
const price = context.executeStrategy(200, { coupon: 20 });
```

策略模式把“变化点”集中到策略里，Context 只负责执行。

---

## 状态模式（State Pattern）

### 前端真实场景：支付按钮的状态流转

一个“立即支付”按钮背后有明确状态：`idle → paying → success / failed`。没有状态机，按钮逻辑很快就变成“全靠人脑记忆”。

### 第一反应：用多个布尔值硬撑

```ts
const state = {
  isPaying: false,
  isSuccess: false,
  isFailed: false,
};
```

### 灾难：非法组合 + 分支爆炸

1. **状态互相打架**：`isPaying` 和 `isSuccess` 可能同时为 true。
2. **按钮文案失控**：有人忘了更新 `disabled`，导致重复下单。

### 解决思路：用状态机约束“能做什么”

```ts
type PayState = "idle" | "paying" | "success" | "failed";
type PayAction = "submit" | "resolve" | "reject" | "reset";

// 状态转移表：只允许合法流转
const transitions: Record<PayState, Partial<Record<PayAction, PayState>>> = {
  idle: { submit: "paying" },
  paying: { resolve: "success", reject: "failed" },
  success: { reset: "idle" },
  failed: { reset: "idle" },
};

// UI 映射表：状态决定渲染
const viewState: Record<PayState, { text: string; disabled: boolean }> = {
  idle: { text: "立即支付", disabled: false },
  paying: { text: "支付中...", disabled: true },
  success: { text: "支付成功", disabled: true },
  failed: { text: "支付失败，重试", disabled: false },
};

let state: PayState = "idle";

function dispatch(action: PayAction) {
  // 通过状态转移表推进
  state = transitions[state][action] ?? state;
  // 状态变化驱动 UI
  render(viewState[state]);
}
```

状态机让“什么时候能做什么”变成规则，而不是临时约定。

---

## 责任链模式（Chain of Responsibility Pattern）

### 前端真实场景：请求链路的多级处理

请求出去之前要鉴权、签名、缓存命中、重试，甚至还要打点上报。每一步都可能“截断流程”。

### 第一反应：把所有判断塞进一个函数

```ts
async function handleRequest(ctx: any) {
  if (!ctx.token) throw new Error("unauthorized");
  if (ctx.isBlocked) throw new Error("blocked");
  if (ctx.useCache) return ctx.cache;
  return fetch(ctx.url);
}
```

### 灾难：一条链条绑死所有规则

1. **强耦合**：规则必须按固定顺序执行。
2. **不可复用**：不同模块想改顺序或省略某一步都要改源码。

### 解决思路：把规则拆成可插拔的链

```ts
type Context = {
  req: Request;
  token?: string;
  response?: Response;
};

type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void>;

const compose = (middlewares: Middleware[]) => {
  return (ctx: Context) => {
    let index = -1;
    const dispatch = (i: number): Promise<void> => {
      // next 只能被调用一次
      if (i <= index) return Promise.reject(new Error("next called twice"));
      index = i;
      const fn = middlewares[i];
      if (!fn) return Promise.resolve();
      // 把控制权交给下一个 handler
      return fn(ctx, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
};

const withAuth: Middleware = async (ctx, next) => {
  // 鉴权拦截
  if (!ctx.token) throw new Error("unauthorized");
  // 统一塞 token
  ctx.req.headers.set("Authorization", `Bearer ${ctx.token}`);
  await next();
};

const withCache: Middleware = async (ctx, next) => {
  // 命中缓存则直接返回
  const cached = await readCache(ctx.req);
  if (cached) {
    ctx.response = cached;
    return;
  }
  await next();
  // 回写缓存
  if (ctx.response) await writeCache(ctx.req, ctx.response);
};

const withRetry: Middleware = async (ctx, next) => {
  // 重试三次
  for (let i = 0; i < 3; i += 1) {
    try {
      await next();
      return;
    } catch (err) {
      // 最后一次才抛出
      if (i === 2) throw err;
    }
  }
};

const fetcher: Middleware = async (ctx) => {
  // 真正发请求
  ctx.response = await fetch(ctx.req);
};

const chain = compose([withAuth, withCache, withRetry, fetcher]);
await chain({ req: new Request("/api/order"), token: "t1" });
```

每个规则独立、顺序可换，这就是责任链的价值。

---

## 命令模式（Command Pattern）

### 前端真实场景：画布编辑器的撤销/重做

拖拽、对齐、改名、删除……这些操作都需要“可撤销”。如果直接改数据，历史就很难还原。

### 第一反应：直接改模型

```ts
layers[index].name = "Banner";
```

### 灾难：历史被打碎，撤销无从下手

1. **操作不可逆**：改了就改了，回不去。
2. **重做体系缺失**：撤销后再操作，历史乱成一团。

### 解决思路：把操作封装为命令

```ts
interface Command {
  // 执行与撤销
  execute(): void;
  undo(): void;
}

class CommandManager {
  // 维护撤销/重做栈
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  execute(cmd: Command) {
    // 执行后写入撤销栈
    cmd.execute();
    this.undoStack.push(cmd);
    // 新操作会清空重做栈
    this.redoStack = [];
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (!cmd) return;
    cmd.undo();
    this.redoStack.push(cmd);
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (!cmd) return;
    cmd.execute();
    this.undoStack.push(cmd);
  }
}

class MoveLayerCommand implements Command {
  constructor(
    private layer: any,
    private from: { x: number; y: number },
    private to: { x: number; y: number },
  ) {}
  execute() {
    // 执行移动
    this.layer.x = this.to.x;
    this.layer.y = this.to.y;
  }
  undo() {
    // 撤销移动
    this.layer.x = this.from.x;
    this.layer.y = this.from.y;
  }
}

const manager = new CommandManager();
manager.execute(new MoveLayerCommand(layer, { x: 0, y: 0 }, { x: 120, y: 40 }));
manager.undo();
```

命令模式让“操作”变成对象，撤销/重做变成基础能力。

---

## 模板方法模式（Template Method Pattern）

### 前端真实场景：列表页加载流程高度一致

列表页几乎都在做同一件事：loading → 拉数据 → 归一化 → 渲染 → 错误处理 → 打点。

### 第一反应：每个页面都写一套流程

```ts
setLoading(true);
try {
  const raw = await fetchList();
  const data = normalize(raw);
  setList(data);
  report("list_loaded");
} catch (err) {
  toast("加载失败");
} finally {
  setLoading(false);
}
```

### 灾难：重复 + 不一致

1. **逻辑重复**：每个页面一套“loading + error”。
2. **细节不一致**：有的页面没打点，有的页面没兜底。

### 解决思路：固定骨架，差异留给子类

```ts
abstract class BaseListLoader<T> {
  async load() {
    // 模板方法：固定流程骨架
    this.before();
    try {
      const raw = await this.fetch();
      const data = this.normalize(raw);
      this.after(data);
      return data;
    } catch (err) {
      // 统一错误处理入口
      this.onError(err);
      throw err;
    } finally {
      // 统一收尾入口
      this.finally();
    }
  }
  protected before() {}
  protected after(_data: T[]) {}
  protected onError(_err: unknown) {}
  protected finally() {}
  protected abstract fetch(): Promise<any>;
  protected abstract normalize(raw: any): T[];
}

class UserListLoader extends BaseListLoader<User> {
  protected before() {
    // 钩子：loading
    setLoading(true);
  }
  protected fetch() {
    // 钩子：拉数据
    return http.get("/api/users");
  }
  protected normalize(raw: any) {
    // 钩子：格式归一化
    return raw.data;
  }
  protected after() {
    // 钩子：打点
    report("user_list_loaded");
  }
  protected onError() {
    // 钩子：错误提示
    toast("加载失败");
  }
  protected finally() {
    // 钩子：收尾
    setLoading(false);
  }
}
```

骨架流程稳定，差异逻辑只需要覆盖少量钩子。

---

## 迭代器模式（Iterator Pattern）

### 前端真实场景：统一遍历路由树与权限树

路由树、菜单树、权限树本质都是树。遍历逻辑散落在业务里，会导致“每个模块写一套递归”。

### 第一反应：每次都手写递归

```ts
function walk(node: any) {
  node.children?.forEach(walk);
  doSomething(node);
}
```

### 灾难：遍历规则不统一

1. **先序/后序各写一套**：不同模块遍历顺序不一致。
2. **难以复用**：过滤、聚合、统计都要重复造轮子。

### 解决思路：把遍历变成可迭代协议

```ts
type RouteNode = {
  path: string;
  meta?: { hidden?: boolean };
  children?: RouteNode[];
};

function* traverse(nodes: RouteNode[]): Generator<RouteNode> {
  // 先序遍历
  for (const node of nodes) {
    yield node;
    if (node.children) yield* traverse(node.children);
  }
}

class RouteTree implements Iterable<RouteNode> {
  constructor(private roots: RouteNode[]) {}
  [Symbol.iterator]() {
    // 让树可迭代
    return traverse(this.roots);
  }
}

const tree = new RouteTree(routes);

const visiblePaths = [];
for (const node of tree) {
  // 业务侧只关心“拿到节点”
  if (!node.meta?.hidden) visiblePaths.push(node.path);
}
```

迭代器让遍历方式可复用，业务只管消费节点。

---

## 备忘录模式（Memento Pattern）

### 前端真实场景：复杂表单的“撤销修改/恢复草稿”

表单字段多、逻辑多时，经常要“回到上一步”或者“恢复到上次保存”。如果直接拿着业务对象硬改，就很难回退。

### 第一反应：每次改动都深拷贝一份

```ts
history.push(JSON.parse(JSON.stringify(formState)));
```

### 灾难：内存暴涨 + 回退难以控制

1. **全量拷贝成本高**：字段一多，拷贝与存储都顶不住。
2. **回退粒度混乱**：什么时候保存、保存几份，全靠人记。

### 解决思路：把“状态快照”抽成备忘录

```ts
type Draft = {
  title: string;
  content: string;
  tags: string[];
};

class DraftMemento {
  // 快照对象（只读）
  constructor(public readonly state: Draft) {}
}

class DraftOriginator {
  constructor(private state: Draft) {}

  setState(next: Draft) {
    // 修改业务状态
    this.state = next;
  }

  createMemento() {
    // 生成快照
    return new DraftMemento({ ...this.state, tags: [...this.state.tags] });
  }

  restore(memento: DraftMemento) {
    // 恢复快照
    this.state = { ...memento.state, tags: [...memento.state.tags] };
  }

  getState() {
    // 对外读取当前状态
    return this.state;
  }
}

const originator = new DraftOriginator({ title: "", content: "", tags: [] });
// caretaker：维护快照历史
const history: DraftMemento[] = [];

history.push(originator.createMemento());
originator.setState({ title: "草稿 A", content: "内容", tags: ["vue"] });

const last = history.pop();
if (last) originator.restore(last);
```

备忘录把“保存/恢复”变成显式动作，撤销逻辑就有了抓手。

---

## 中介者模式（Mediator Pattern）

### 前端真实场景：筛选面板的联动逻辑

品牌、价格区间、库存状态、促销标签之间经常互相影响。组件之间互相调用，会变成“你改我、我改他”的耦合地狱。

### 第一反应：组件彼此直接引用

```ts
brandSelect.onChange(() => priceSlider.setRange([0, 500]));
priceSlider.onChange(() => tagPanel.disable("promo"));
```

### 灾难：联动规则散落，改一处崩一片

1. **双向依赖**：A 调 B，B 又调 A。
2. **逻辑难维护**：联动规则散落在各个组件里。

### 解决思路：用中介者统一协调

```ts
type MediatorEvent =
  | { type: "brand:change"; value: string }
  | { type: "price:change"; value: [number, number] }
  | { type: "reset" };

class FilterMediator {
  // 中介者统一协调组件
  private components = new Set<{ reset: () => void }>();

  register(component: { reset: () => void }) {
    this.components.add(component);
  }

  notify(sender: unknown, event: MediatorEvent) {
    // 根据事件协调组件行为
    if (event.type === "reset") {
      this.components.forEach((c) => c.reset());
      return;
    }
    if (event.type === "brand:change") {
      // 规则集中在中介者
      if (event.value === "官方自营") priceSlider.setRange([0, 300]);
    }
  }
}

const mediator = new FilterMediator();

const brandSelect = {
  reset: () => setBrand(""),
  // 变化只通知中介者
  change: (value: string) => mediator.notify(brandSelect, { type: "brand:change", value }),
};

const priceSlider = {
  reset: () => setPrice([0, 999]),
  // 暴露被中介者调用的 API
  setRange: (range: [number, number]) => setPrice(range),
};

mediator.register(brandSelect);
mediator.register(priceSlider);
```

中介者把“组件之间的对话”集中到一个地方，耦合大幅降低。

---

## 访问者模式（Visitor Pattern）

### 前端真实场景：组件树的“统计/导出/渲染”多种操作

设计器里的节点既要渲染，也要导出 JSON，还要统计图片数量。如果把逻辑都塞进节点类，节点会爆炸。

### 第一反应：在每个节点里塞一堆方法

```ts
class Node {
  render() {}
  exportJson() {}
  countImages() {}
}
```

### 灾难：节点越来越臃肿

1. **新增行为必须改所有节点**。
2. **逻辑难复用**：统计/导出/渲染互相污染。

### 解决思路：访问者把“行为”独立出来

```ts
interface Element {
  // 接受访问者
  accept(visitor: Visitor): void;
}

class TextElement implements Element {
  constructor(public text: string) {}
  accept(visitor: Visitor) {
    // 双分派：把自己交给访问者
    visitor.visitText(this);
  }
}

class ImageElement implements Element {
  constructor(public src: string) {}
  accept(visitor: Visitor) {
    visitor.visitImage(this);
  }
}

interface Visitor {
  // 不同节点的访问入口
  visitText(el: TextElement): void;
  visitImage(el: ImageElement): void;
}

class ExportVisitor implements Visitor {
  // 导出结果
  public output: any[] = [];
  visitText(el: TextElement) {
    // 文本节点导出
    this.output.push({ type: "text", value: el.text });
  }
  visitImage(el: ImageElement) {
    // 图片节点导出
    this.output.push({ type: "image", src: el.src });
  }
}

const elements: Element[] = [new TextElement("Hello"), new ImageElement("/logo.png")];
const visitor = new ExportVisitor();
// 遍历节点，交给访问者处理
elements.forEach((el) => el.accept(visitor));
```

访问者让“行为”可插拔，节点本体保持干净。

---

## 解释器模式（Interpreter Pattern）

### 前端真实场景：可配置的筛选表达式

筛选表达式从“勾选条件”升级到“输入语法”，比如 `tag:react AND (type:post OR type:note)`。

### 第一反应：在一个函数里手写解析

```ts
if (query.includes("AND") && query.includes("OR")) {
  // 很快变成一坨 if/else
}
```

### 灾难：规则复杂，维护成本指数级

1. **扩展困难**：新增 NOT、括号就要重写。
2. **难以测试**：解析逻辑与业务逻辑纠缠。

### 解决思路：把表达式建成语法树

```ts
type Context = { tag: string; type: string };

interface Expression {
  // 解释表达式
  interpret(ctx: Context): boolean;
}

class TagExpression implements Expression {
  constructor(private value: string) {}
  interpret(ctx: Context) {
    // 终结符表达式：判断 tag
    return ctx.tag === this.value;
  }
}

class TypeExpression implements Expression {
  constructor(private value: string) {}
  interpret(ctx: Context) {
    // 终结符表达式：判断 type
    return ctx.type === this.value;
  }
}

class AndExpression implements Expression {
  constructor(private left: Expression, private right: Expression) {}
  interpret(ctx: Context) {
    // 组合表达式
    return this.left.interpret(ctx) && this.right.interpret(ctx);
  }
}

class OrExpression implements Expression {
  constructor(private left: Expression, private right: Expression) {}
  interpret(ctx: Context) {
    return this.left.interpret(ctx) || this.right.interpret(ctx);
  }
}

function evaluate(ctx: Context, expression: Expression) {
  // 统一入口
  return expression.interpret(ctx);
}

const expr = new AndExpression(
  new TagExpression("react"),
  new OrExpression(new TypeExpression("post"), new TypeExpression("note")),
);

evaluate({ tag: "react", type: "note" }, expr);
```

解释器把“语法”变成对象，规则扩展也就有路可走。

---

## 总结：行为型模式到底在帮你什么？

行为型模式解决的是“协作与流程问题”。它让系统更像一个可编排的流程，而不是一堆互相牵扯的 if/else。

| 模式         | 重点         | 解决什么耦合                   |
| ------------ | ------------ | ------------------------------ |
| 发布订阅模式 | 事件解耦     | 组件之间的直接依赖             |
| 策略模式     | 规则替换     | 条件分支与核心流程的绑定       |
| 状态模式     | 状态驱动     | 多状态布尔组合的混乱           |
| 责任链模式   | 流程分段     | 规则组合与顺序调整的困难       |
| 命令模式     | 操作对象化   | 不可撤销的操作与历史记录缺失   |
| 模板方法模式 | 固定流程骨架 | 重复流程带来的维护成本         |
| 迭代器模式   | 统一遍历协议 | 复杂结构遍历逻辑散落各处       |
| 备忘录模式   | 状态快照     | 撤销/恢复与业务状态的强耦合    |
| 中介者模式   | 协调通信     | 组件互相直接引用               |
| 访问者模式   | 行为外置     | 行为扩展导致的节点类膨胀       |
| 解释器模式   | 规则语法化   | 解析规则与业务逻辑的强耦合     |

### 最后用一句前端味更重的话收尾

当你的业务开始“指挥谁先干、谁后干、谁失败要重试”，行为型模式就在提醒你：**把流程调度交出去，业务就会更轻**。
