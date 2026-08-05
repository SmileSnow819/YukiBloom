# 足迹功能 PRD

## 1. 背景

博客目前已经有文章、分类、时间线等内容展示能力，但还缺少一个可以记录“我去过哪里、什么时候去、怎么去”的生活向页面。

足迹功能希望用地图和路线动画记录个人移动轨迹，例如：

- `2026-03-12` 到 `2026-03-16` 去了天津。
- `2026-03-16` 到 `2026-06-16` 一直在北京编辑/实习。
- 首次进入页面时播放一段路线动画：洛阳 -> 北京 -> 天津 -> 北京 -> 武汉 -> 长沙 -> 北京 -> 洛阳 -> 上海 -> 杭州 -> 南京 -> 洛阳。

这个功能更偏“旅行记录 + 人生地图 + 动态时间线”，不是传统的旅游攻略页。

## 2. 功能目标

1. 在博客中新增一个独立的“足迹”页面。
2. 页面上方展示地图，地图中标记去过的城市/地点。
3. 支持按时间记录某段时间在某个地点。
4. 支持路线记录，标记不同城市之间的移动方式，例如火车、高铁、飞机、步行等。
5. 首次进入足迹页面时，自动播放一次路线生长动画。
6. 页面提供“再次播放”按钮，用户可以重复观看路线动画。
7. 数据由配置文件维护，后续你只需要改配置，不需要改组件代码。

## 3. 页面入口

### 主菜单入口

在顶部主菜单新增：

- 名称：足迹
- 建议图标：`ri:map-pin-line` 或 `ri:road-map-line`
- 路由：`/footprints`

移动端侧边菜单也需要同步展示该入口。

### 页面标题

- 中文：足迹
- 英文可选：Footprints
- 日文可选：足跡

## 4. 页面结构

### 4.1 首屏地图区

页面顶部是一张地图，作为整个页面的核心视觉区域。

地图需要展示：

- 城市点位。
- 当前播放路线。
- 路线移动方向。
- 已访问地点高亮。
- 当前动画播放到的城市。

地图不需要复杂 GIS 能力，优先满足博客展示效果。

### 4.2 路线播放控制区

地图上或地图下方提供控制按钮：

- 播放 / 再次播放。
- 暂停，可选。
- 重置，可选。
- 显示当前播放到哪一段路线，例如：北京 -> 天津。

首次加载页面时自动播放一次完整路线动画。

### 4.3 足迹记录列表

地图下方展示按时间倒序排列的足迹记录：

- 时间范围。
- 地点名称。
- 事件类型：旅行、实习、居住、路过、学习等。
- 描述文案。
- 可选照片。
- 可选关联文章。

示例：

```plain
2026.03.12 - 2026.03.16
天津
短暂停留 / 旅行

2026.03.16 - 2026.06.16
北京
编辑 / 实习
```

### 4.4 路线故事区

路线动画播放完后，可以在地图下方显示路线摘要：

```plain
洛阳 -> 北京 -> 天津 -> 北京 -> 武汉 -> 长沙 -> 北京 -> 洛阳 -> 上海 -> 杭州 -> 南京 -> 洛阳
```

每一段路线可以展示：

- 出发地。
- 目的地。
- 出行方式。
- 日期。
- 备注。

## 5. 数据配置设计

建议新增配置文件：

```plain
config/footprints.yaml
```

### 5.1 地点配置

地点负责定义城市坐标、显示名称和样式。

```yaml
locations:
  - id: luoyang
    name: 洛阳
    lat: 34.6197
    lng: 112.4540
    type: hometown
    color: "#ff6b9a"

  - id: beijing
    name: 北京
    lat: 39.9042
    lng: 116.4074
    type: city
    color: "#4f8cff"

  - id: tianjin
    name: 天津
    lat: 39.3434
    lng: 117.3616
    type: travel
    color: "#ffb300"
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 地点唯一标识，路线和足迹记录会引用它 |
| `name` | 是 | 页面显示名称 |
| `lat` | 是 | 纬度 |
| `lng` | 是 | 经度 |
| `type` | 否 | 地点类型，例如 hometown、city、travel、internship |
| `color` | 否 | 点位颜色，不填使用默认主题色 |
| `icon` | 否 | 自定义点位图标 |

### 5.2 足迹记录配置

足迹记录负责描述“某段时间在哪里”。

```yaml
stays:
  - startDate: "2026.03.12"
    endDate: "2026.03.16"
    locationId: tianjin
    title: 天津短暂停留
    type: travel
    description: 去天津待了几天，记录一段春天里的小旅行。

  - startDate: "2026.03.16"
    endDate: "2026.06.16"
    locationId: beijing
    title: 北京编辑与实习
    type: internship
    description: 这段时间主要在北京编辑、实习和学习。
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `startDate` | 是 | 开始日期 |
| `endDate` | 否 | 结束日期，不填可表示至今 |
| `locationId` | 是 | 对应 `locations` 中的地点 |
| `title` | 是 | 记录标题 |
| `type` | 否 | travel、internship、home、study、pass 等 |
| `description` | 否 | 描述文案 |
| `images` | 否 | 图片列表 |
| `post` | 否 | 关联文章链接 |

### 5.3 路线配置

路线负责描述城市之间的移动轨迹和交通方式。

```yaml
routes:
  - from: luoyang
    to: beijing
    date: "2026.03.10"
    transport: train
    label: 火车

  - from: beijing
    to: tianjin
    date: "2026.03.12"
    transport: highspeed
    label: 高铁

  - from: tianjin
    to: beijing
    date: "2026.03.16"
    transport: highspeed
    label: 高铁

  - from: beijing
    to: wuhan
    date: "2026.04.01"
    transport: train
    label: 火车
```

完整示例路线：

```yaml
routeSequence:
  - luoyang
  - beijing
  - tianjin
  - beijing
  - wuhan
  - changsha
  - beijing
  - luoyang
  - shanghai
  - hangzhou
  - nanjing
  - luoyang
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `from` | 是 | 出发地点 id |
| `to` | 是 | 到达地点 id |
| `date` | 否 | 出行日期 |
| `transport` | 否 | 交通方式 |
| `label` | 否 | 页面展示文案 |
| `description` | 否 | 备注 |

交通方式建议：

| 值 | 展示文案 | 图标建议 |
| --- | --- | --- |
| `train` | 火车 | `ri:train-line` |
| `highspeed` | 高铁 | `ri:train-wifi-line` |
| `flight` | 飞机 | `ri:plane-line` |
| `car` | 汽车 | `ri:car-line` |
| `walk` | 步行 | `ri:walk-line` |
| `ship` | 船 | `ri:ship-line` |

## 6. 动画设计

### 6.1 首次加载动画

用户第一次进入足迹页面时：

1. 地图先淡入。
2. 城市点位逐个出现。
3. 路线从第一个城市开始逐段生长。
4. 当前路线段高亮显示。
5. 当前城市点位轻微放大或发光。
6. 动画结束后保留完整路线。

### 6.2 再次播放

页面提供“再次播放”按钮。

点击后：

1. 清空当前路线高亮状态。
2. 从起点重新播放路线生长动画。
3. 播放期间按钮状态变为“播放中”。
4. 播放结束后恢复为“再次播放”。

### 6.3 动画节奏

建议默认：

- 城市点位出现：每个点 120ms。
- 每段路线生长：600ms - 900ms。
- 不同路线段之间停顿：120ms。
- 整体动画时长控制在 6s - 12s，避免太慢。

如果路线很长，可以按路线数量动态压缩单段时长。

## 7. 视觉风格

整体需要贴合当前博客的粉色、蓝色、柔和、二次元风格。

设计倾向：

- 地图不要太商务，不要做成冰冷的数据大屏。
- 城市点位使用柔和圆点、光晕或小图标。
- 路线使用粉色到蓝色渐变线。
- 当前播放段可以有流光效果。
- 地图容器可以有轻微玻璃拟态，但不要堆太重的卡片。
- 移动端需要保证地图不挤压正文内容。

## 8. 技术实现建议

### 8.1 可借鉴的开源方案

足迹功能不要完全从零手写，建议基于成熟开源方案组合实现。当前可以参考以下几类：

| 方案 | 适合场景 | 优点 | 风险 / 成本 |
| --- | --- | --- | --- |
| `Leaflet` | 真实地图、城市点位、轻量交互 | 开源、轻量、移动端友好，marker / polyline 能力成熟 | 需要接入地图瓦片；路线“生长动画”需要自己控制或配合插件 |
| `Leaflet + leaflet-ant-path` | 想要现成的流动路线效果 | `leaflet-ant-path` 已经提供类似蚂蚁线的 animated polyline | 插件较老，TypeScript 类型和 React 适配需要验证 |
| `MapLibre GL JS` | 更现代的矢量地图、WebGL 动画、路线图层控制 | 开源、TypeScript、WebGL 渲染，性能和样式控制更强 | 对个人博客偏重，地图样式和瓦片源配置成本更高 |
| `Apache ECharts map + lines/effectScatter` | 偏数据可视化风、路线飞线、低交互地图 | 适合做“城市点 + 路线飞线 + 涟漪点”这种展示页 | 需要维护中国地图 GeoJSON；真实地图能力不如 Leaflet/MapLibre |
| `D3 Geo / react-simple-maps` | 插画风中国地图、完全自定义视觉 | SVG 可控性强，和博客柔和风格更容易统一 | 需要准备 GeoJSON/TopoJSON；缩放、拖拽等地图交互要自己补 |

参考资料：

- [Leaflet](https://leafletjs.com/)：开源、移动端友好的交互式地图库。
- [MapLibre GL JS](https://www.maplibre.org/maplibre-gl-js/docs/)：基于 WebGL 的开源 TypeScript 矢量地图方案。
- [Apache ECharts 动画文档](https://echarts.apache.org/handbook/en/how-to/animation/transition/)：支持数据变化过渡动画，适合做展示型路线图。
- [D3 Geo](https://d3js.org/d3-geo)：基于 GeoJSON 和投影绘制地图。
- [react-simple-maps](https://www.react-simple-maps.io/)：基于 SVG、React、d3-geo 的地图组件方案。
- [leaflet-ant-path](https://github.com/rubenspgcavalcante/leaflet-ant-path)：Leaflet 的 animated polyline 插件。

### 8.2 推荐第一版技术路线

第一版建议不要直接上很重的 GIS 能力，优先做出好看的“博客足迹展示”：

```plain
React 组件
  + D3 Geo / react-simple-maps 思路
  + SVG 中国地图 GeoJSON
  + motion 做路线生长动画
  + Iconify 做交通方式图标
```

推荐原因：

1. 当前博客已经使用 Astro + React，React 组件接入成本低。
2. 项目已经有 `motion` 依赖，可以直接做路径绘制、点位出现、当前城市高亮动画。
3. SVG 地图更容易做成粉蓝、柔和、二次元风格，不会被真实地图瓦片的商业风格限制。
4. 不依赖地图瓦片服务，静态部署更稳定。
5. 足迹数据量很小，不需要 MapLibre 级别的 WebGL 能力。

第一版实现重点：

- 使用中国地图 GeoJSON / TopoJSON 绘制底图。
- 根据城市经纬度投影到 SVG 坐标。
- 城市点位用 SVG circle / icon 渲染。
- 路线用 SVG path/polyline 渲染。
- 路线生长动画使用 `stroke-dasharray + stroke-dashoffset` 或 `motion.path`。
- 交通方式用 Iconify 图标贴在线段中点附近。

### 8.3 第二版可升级方向

如果后续想更接近真实地图，可以再切到：

```plain
Leaflet
  + OpenStreetMap / 高德 / MapTiler 瓦片
  + marker + polyline
  + leaflet-ant-path 或自定义 dash 动画
```

如果未来想做更强的视觉效果，比如 3D 城市、光线飞行、实时镜头跟随，可以考虑：

```plain
MapLibre GL JS
  + line layer
  + symbol layer
  + GeoJSON source 动态更新
```

### 8.4 地图库选择

优先方案：

- 第一版：使用 SVG 中国地图 + `motion`，参考 `D3 Geo / react-simple-maps` 的实现思路。
- 第二版：如果需要真实地图，再使用 `Leaflet`。
- 复杂版：如果需要 WebGL 矢量地图和更强图层能力，再使用 `MapLibre GL JS`。

倾向建议：

- 如果想贴合博客风格、减少外部依赖：选 SVG 地图。
- 如果想要真实地图底图：选 `Leaflet`。
- 如果想要更强的动态路线、矢量地图和样式控制：选 `MapLibre GL JS`。

当前博客是静态站点，足迹功能不需要服务端能力。

### 8.5 数据读取

通过 `config/footprints.yaml` 维护数据。

构建时读取 YAML：

```plain
config/footprints.yaml
  -> src/lib/config
  -> 足迹页面组件
```

这样后续添加城市、停留记录、路线，只需要改配置文件。

### 8.6 页面文件

建议新增：

```plain
src/pages/footprints.astro
src/pages/[lang]/footprints.astro
src/components/footprints/FootprintsMap.tsx
src/components/footprints/FootprintsTimeline.tsx
src/components/footprints/RoutePlayer.tsx
src/components/footprints/footprints.css
config/footprints.yaml
```

如果后续不急着做多语言，也可以第一版只做：

```plain
src/pages/footprints.astro
src/components/footprints/*
config/footprints.yaml
```

## 9. 响应式要求

### 桌面端

- 地图高度建议 `520px - 640px`。
- 地图下方左右分栏：
  - 左侧：足迹时间线。
  - 右侧：路线详情。

### 移动端

- 地图高度建议 `360px - 440px`。
- 下方内容改为单列。
- 路线文案允许横向滚动或自动换行。
- 播放按钮固定在地图右下角或地图下方。

## 10. 边界情况

1. 没有路线数据：只展示城市点位和足迹记录。
2. 没有停留记录：只展示路线动画。
3. 某条路线引用了不存在的城市：构建时报错或在开发环境给出清晰提示。
4. 城市没有自定义颜色：使用默认主题色。
5. 用户关闭动效或系统开启减少动画：不自动播放路线，只展示最终状态。
6. 地图资源加载失败：降级展示静态路线列表。

## 11. 第一版验收标准

第一版实现完成后，需要满足：

1. 主菜单和移动端菜单都能看到“足迹”入口。
2. 打开 `/footprints` 能看到地图。
3. 地图上能看到洛阳、北京、天津、武汉、长沙、上海、杭州、南京等点位。
4. 首次打开页面会自动播放一次路线生长动画。
5. 点击“再次播放”可以重新播放动画。
6. 下方能看到天津、北京等停留记录。
7. 出行方式可以显示为火车、高铁等图标或文字。
8. 移动端布局不重叠、不溢出。
9. `pnpm check` 无错误。
10. `pnpm lint:fix` 无报错。

## 12. 待确认问题

1. 地图底图要用真实地图，还是做一张更偏插画风的中国轮廓地图？
2. 足迹页面是否需要公开精确日期，还是只展示到月份？
3. 路线动画是否只播放一条主线，还是未来需要支持多条路线分组？
4. 地点是否需要支持图片弹窗？
5. “一直在编辑”这类记录的类型文案，是否统一叫“编辑”，还是归为“实习 / 学习 / 居住”？
6. 页面是否需要支持按年份筛选，例如 2025、2026？
7. 是否要把足迹入口也加入首页精选区，还是只放主菜单？
