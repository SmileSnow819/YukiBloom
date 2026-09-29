# Timeline 组件使用说明

## 简介

Timeline 是一个用于展示实习经历的时间线组件。页面通过公开接口读取后端保存的时间线数据。

## 特性

- ✅ 从后端公开 API 读取实习经历
- ✅ 支持无限添加条目
- ✅ 竖向时间线，从现在到过去排序
- ✅ 支持"至今"状态
- ✅ 支持可选公司图标（Iconify）
- ✅ 响应式设计
- ✅ 深色模式支持
- ✅ 悬浮动画效果

## 使用方法

### 1. 在 Astro 页面中使用

```astro
---
import TimelineWrapper from '../components/timeline/TimelineWrapper.astro';
---

<TimelineWrapper />
```

### 2. 管理时间线数据

公开数据由 `GET /api/v1/timeline` 提供，管理端通过 `PUT /api/v1/admin/timeline` 保存。接口结构见 `docs/api-cache/operations/全部_get_-api-v1-timeline.json`。

`config/timeline.yaml` 仅供旧数据导入器使用，不再是页面的运行时数据源。

### 3. 数据字段

```yaml
timeline:
  - startDate: "2026.03"
    endDate: "2026.06"
    isPresent: false
    company: "快手"
    icon: "simple-icons:kuaishou"
    iconColor: "#ffb300"
    position: "前端开发实习生"
    description: "负责前端开发工作"
    
  - startDate: "2025.12"
    endDate: "2026.03"
    isPresent: false
    company: "北京蓝色光标数字传媒有限科技公司"
    icon: "ri:building-4-line"
    position: "前端开发实习生"
    description: "参与多个项目的前端开发"
```

## 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `startDate` | string | ✅ | 开始日期（如 "2025.12"） |
| `endDate` | string | ❌ | 结束日期（如 "2026.03"，当 `isPresent` 为 true 时可为空） |
| `isPresent` | boolean | ✅ | 是否为当前正在进行的经历 |
| `company` | string | ✅ | 公司名称 |
| `icon` | string | ❌ | 公司前显示的 Iconify 图标名称；不填则不渲染图标 |
| `iconColor` | string | ❌ | 公司图标颜色；不填则使用默认主题色 |
| `position` | string | ✅ | 职位名称 |
| `description` | string | ❌ | 工作描述 |

## 样式自定义

如需自定义样式，编辑 `src/components/timeline/timeline.css` 文件。

主要可自定义的样式变量：
- `.timeline-dot` - 时间点样式
- `.timeline-line` - 连接线样式
- `.timeline-content` - 内容卡片样式
- 渐变色：`#667eea` 和 `#764ba2`

## 文件结构

```plain
src/components/timeline/
├── Timeline.tsx           # React 组件（核心渲染逻辑）
├── TimelineWrapper.astro  # Astro 包装组件（读取公开 API）
├── timeline.css           # 样式文件
├── index.ts              # 导出文件
└── README.md             # 本文档

```

## 示例效果

时间线会以竖向排列，每个条目包含：
- 时间段标签（紫色渐变背景）
- 公司图标（可选）和公司名称（大标题）
- 职位名称（副标题）
- 可选的工作描述

每个条目都有悬浮动画效果，鼠标悬浮时会轻微上移并显示阴影。
