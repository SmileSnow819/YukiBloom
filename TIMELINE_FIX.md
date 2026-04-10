# Timeline 渲染问题修复说明

## 问题原因

1. **Markdown 文件不支持组件导入**：`about.md` 文件中的 `import TimelineWrapper` 语句被当作普通文本渲染
2. **HomeInfo.astro 缺少导入语句**：使用了 `<TimelineWrapper />` 但没有导入

## 修复方案

### 1. 将 about.md 改为 about.astro

- ✅ 将 `src/pages/about.md` 重命名为 `src/pages/about.astro`
- ✅ 使用 Astro 语法重写页面结构
- ✅ 正确导入和使用 `TimelineWrapper` 组件

### 2. 修复 HomeInfo.astro

在 `src/components/layout/HomeInfo.astro` 的 frontmatter 中添加：

```astro
import TimelineWrapper from '@components/timeline/TimelineWrapper.astro';
```

## 文件变更

### 修改的文件

1. `src/pages/about.md` → `src/pages/about.astro` (重写)
2. `src/pages/[lang]/about.astro` (更新引用)
3. `src/components/layout/HomeInfo.astro` (添加导入)

### 备份文件

原来的 `about.md` 已备份为 `src/pages/about.md.backup`

## Timeline 渲染位置

Timeline 组件现在会在以下位置渲染：

1. **About 页面** (`/about` 或 `/zh/about`)
   - 位置：实习经历标题下方
   
2. **首页侧边栏** (HomeInfo 组件)
   - 位置：头像信息下方，导航按钮上方

## 如何验证

1. 访问 `/about` 页面，应该能看到"实习经历"标题下的时间线
2. 查看首页侧边栏，应该能看到时间线组件
3. Import 语句不应该再显示在页面上

## 配置文件

所有时间线数据通过 `config/timeline.yaml` 配置，修改该文件即可更新所有位置的时间线显示。
