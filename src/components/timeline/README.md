# Timeline 组件使用说明

## 简介

Timeline 是一个用于展示时间线（如实习经历）的可配置组件。它通过读取 YAML 配置文件来渲染时间线内容。

## 特性

- ✅ 完全可配置（通过 YAML 文件）
- ✅ 支持无限添加条目
- ✅ 竖向时间线，从现在到过去排序
- ✅ 支持"至今"状态
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

### 2. 配置时间线数据

编辑 `config/timeline.yaml` 文件：

```yaml
timeline:
  - startDate: "2026.03"
    endDate: ""
    isPresent: true
    company: "快手"
    position: "前端开发实习生"
    description: "负责前端开发工作"
    
  - startDate: "2025.12"
    endDate: "2026.03"
    isPresent: false
    company: "北京蓝色光标数字传媒有限科技公司"
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
| `position` | string | ✅ | 职位名称 |
| `description` | string | ❌ | 工作描述 |

## 添加新条目

在 `config/timeline.yaml` 的 `timeline` 数组最前面添加新条目：

```yaml
timeline:
  # 新条目添加在这里（最新的）
  - startDate: "2026.06"
    endDate: ""
    isPresent: true
    company: "新公司"
    position: "高级前端开发工程师"
    description: ""
  
  # 旧条目在下面
  - startDate: "2026.03"
    endDate: "2026.06"
    isPresent: false
    company: "快手"
    position: "前端开发实习生"
    description: ""
```

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
├── TimelineWrapper.astro  # Astro 包装组件（读取 YAML 配置）
├── timeline.css           # 样式文件
├── index.ts              # 导出文件
└── README.md             # 本文档

config/
└── timeline.yaml          # 时间线数据配置
```

## 示例效果

时间线会以竖向排列，每个条目包含：
- 时间段标签（紫色渐变背景）
- 公司名称（大标题）
- 职位名称（副标题）
- 可选的工作描述

每个条目都有悬浮动画效果，鼠标悬浮时会轻微上移并显示阴影。
