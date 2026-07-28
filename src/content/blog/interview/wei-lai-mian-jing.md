---
title: 蔚来面经
date: 2026-07-22 11:00:00
link: wei-lai-mian-jing
cover: /img/cover/interview.jpg
description: 蔚来前端一面面经，主要考察项目部署与协作、事件循环、动态路由、权限菜单与路由守卫、低代码拖拽平台、Vue 通信和状态管理，以及 SSR 选型原因。
tags:
  - 蔚来
  - 面经
  - Vue
  - 路由权限
  - 事件循环
categories:
  - 面经
---

## 蔚来一面

### 面试时间

`2026_0722-11:00`

### 面试内容

1. 自我介绍
2. 小说平台以及博客都可以直接打开吗？
3. 能实习多久？
4. 项目是怎么用 GitHub 管理的？平时怎么团队协作提交代码？
5. 有统计过用户访问量吗？
6. 怎么部署的项目？
7. 介绍一下事件循环
8. 动态路由有做过或了解过吗？
9. 普通用户和管理员用户进入的菜单显示不一样，有什么好的解决方案吗？（路由守卫）
10. 实习经历介绍
11. 拖拽低代码平台有用什么库去做吗？
12. Vue 3 中遍历数组的一些方法
13. AI 编程工具的使用
14. Vue 父子间通信的方法
15. 状态管理用哪些？有了解过吗？
16. 微任务介绍一下
17. 反问业务部门：BI 部门，数据提效

### 追加追问

1. 平时怎么学前端的？
2. 数据库方面了解吗？
3. 会写 SQL 吗？
4. 前端这一块比较难的项目是哪个？能介绍一下吗？
5. 为什么要做服务器渲染？

---

## 面试复盘总结

### 1) 动态路由有做过或了解过吗？（Q8）

动态路由可以从两个层面回答：**路由参数动态** 和 **路由表动态生成**。

#### 路由参数动态

这是最常见的动态路由，比如详情页、文章页、用户页。

```typescript
const routes = [
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@/pages/PostDetail.vue'),
  },
];
```

访问 `/post/123` 时，可以通过 `route.params.id` 拿到动态参数。这个场景适合文章详情、商品详情、用户主页等“页面结构一样，但数据不同”的页面。

#### 路由表动态生成

后台管理系统里更常见的是：不同角色登录后，后端返回不同权限，前端根据权限动态生成可访问路由和菜单。

典型流程：

```text
用户登录 -> 获取 token -> 请求用户信息和权限码 -> 根据权限过滤 asyncRoutes -> addRoute 动态注册 -> 渲染菜单
```

示例：

```typescript
const asyncRoutes = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    meta: { title: '看板', permissions: ['dashboard:view'] },
    component: () => import('@/pages/Dashboard.vue'),
  },
  {
    path: '/admin',
    name: 'Admin',
    meta: { title: '管理员', permissions: ['admin:view'] },
    component: () => import('@/pages/Admin.vue'),
  },
];

function filterRoutesByPermissions(routes, permissions) {
  return routes.filter((route) => {
    const requiredPermissions = route.meta?.permissions ?? [];
    return requiredPermissions.length === 0 || requiredPermissions.some((permission) => permissions.includes(permission));
  });
}
```

面试里可以这样说：

> 我理解动态路由有两类：一类是参数动态，比如 `/post/:id`；另一类是权限系统里的路由表动态生成。后台系统里通常会把路由拆成 constantRoutes 和 asyncRoutes，登录后根据用户角色或权限码过滤 asyncRoutes，再通过 `router.addRoute` 注入路由，同时用同一份过滤后的路由表生成侧边菜单，保证“能看到的菜单”和“能访问的页面”是一致的。

### 2) 普通用户和管理员菜单不一样怎么解决？（Q9）

这题本质是 **前端权限控制**。核心目标不是只把菜单隐藏掉，而是要同时控制：

1. **菜单是否显示**
2. **路由是否可访问**
3. **按钮/操作是否可点击**
4. **接口是否真正有权限**

只做菜单隐藏是不够的，因为用户可以手动输入 URL。如果没有路由守卫和后端鉴权，隐藏菜单只是视觉层限制。

#### 推荐方案：权限路由 + 路由守卫

前端维护一份带权限元信息的路由表：

```typescript
const routes = [
  {
    path: '/report',
    name: 'Report',
    meta: {
      title: '数据报表',
      permissions: ['report:view'],
    },
    component: () => import('@/pages/Report.vue'),
  },
];
```

登录后获取用户权限：

```typescript
const userPermissions = ['report:view', 'dashboard:view'];
```

菜单渲染时过滤：

```typescript
const visibleMenus = routes.filter((route) => {
  const requiredPermissions = route.meta?.permissions ?? [];
  return requiredPermissions.length === 0 || requiredPermissions.some((permission) => userPermissions.includes(permission));
});
```

路由守卫里兜底拦截：

```typescript
router.beforeEach((to) => {
  const requiredPermissions = to.meta?.permissions ?? [];

  if (requiredPermissions.length === 0) {
    return true;
  }

  const hasPermission = requiredPermissions.some((permission) => userPermissions.includes(permission));

  if (!hasPermission) {
    return '/403';
  }

  return true;
});
```

这样即使普通用户手动输入 `/admin`，也会被拦截到 403 页面。

#### 角色和权限码怎么选？

简单系统可以用角色控制：

```text
admin 可以访问管理员页面
user 只能访问普通页面
```

但复杂系统更推荐权限码：

```text
report:view
report:create
report:export
user:manage
```

原因是角色粒度太粗，后期业务变复杂时容易出现“某个用户不是管理员，但需要导出报表权限”的情况。权限码更细，角色可以只是权限码的集合。

#### 面试回答话术

> 我会把菜单和路由都建立在同一份权限路由表上，而不是菜单单独写一份。登录后后端返回用户角色或权限码，前端根据权限过滤动态路由，并用过滤后的路由生成菜单。同时在 `beforeEach` 路由守卫里做兜底校验，防止用户手动输入 URL 访问无权限页面。按钮级权限则通过权限指令或组件封装控制。最后接口层必须由后端做真正鉴权，前端权限只能提升体验，不能作为安全边界。

### 3) 事件循环和微任务怎么串起来？（Q7, Q16）

可以按这个顺序讲：

1. JS 是单线程执行的，同一时间只能执行一个调用栈。
2. 同步代码先进调用栈执行。
3. 异步任务完成后，会把回调放进任务队列。
4. 每一轮宏任务执行完后，会清空当前所有微任务。
5. 微任务清空后，浏览器才有机会进行渲染，然后进入下一轮宏任务。

常见宏任务：

- `script`
- `setTimeout`
- `setInterval`
- DOM 事件
- 网络回调

常见微任务：

- `Promise.then`
- `queueMicrotask`
- `MutationObserver`

一句话总结：

> 事件循环的关键顺序是：执行一个宏任务，清空所有微任务，必要时浏览器渲染，再进入下一个宏任务。

### 4) 为什么要做服务器渲染？（追问 Q5）

服务器渲染主要解决三个问题：

1. **首屏体验**：服务端直接返回带内容的 HTML，减少白屏时间。
2. **SEO**：搜索引擎更容易抓取完整内容。
3. **分享预览**：社交平台和爬虫能拿到更稳定的标题、描述和封面。

但 SSR 也不是银弹。它会带来服务端成本、缓存策略、数据注水、hydration mismatch 等复杂度。

面试里可以这样说：

> 我做服务器渲染主要是因为内容型页面更关注首屏和 SEO。像博客、小说平台这类内容站，如果完全 CSR，用户和爬虫都要等 JS 加载后才能看到内容；SSR/SSG 可以直接输出 HTML，首屏更快，也更利于搜索和分享。但对后台管理系统这种强交互、登录后访问的页面，CSR 通常就够了，不一定要上 SSR。
