# 足迹地图边界

地图保留 `public/data/china.geojson` 的省界，叠加 `public/data/footprint-cities.geojson` 的市界。市级图层加入不可见的全国省级轮廓，使两层地图使用相同的坐标范围，避免边界与城市点错位。

总览按到访城市取景，显示细市界；单段行程在 zoom >= 3 时显示市界。所有在 routes 起终点出现的城市以浅粉色高亮，点击对应区域与点击城市点一样打开到访轮播。北京、天津、上海使用省级文件中的直辖市完整边界，不细分区县。

## 数据来源和更新

市界来自阿里云 DataV.GeoAtlas：

- 地图选择器：https://datav.aliyun.com/portal/school/atlas/area_selector
- 下载地址：https://geo.datav.aliyun.com/areas_v3/bound/{省级行政区划代码}_full.json

下载日期：2026-10-27。当前覆盖河北、江苏、浙江、安徽、河南、湖北、湖南、陕西，共 110 个市级区域。数据保存在项目中，页面不依赖外部地图接口。边界属于展示数据，不用于实时行政区划查询。

更新命令（项目根目录）：

```sh
node scripts/update-footprint-boundaries.mjs
node --experimental-strip-types tests/footprints/city-regions.test.mjs
```

新增其他省份的足迹时，在脚本的 `provinceCodes` 中加入省级代码并重新生成文件。已有覆盖省份中的新城市会根据 locations 中的城市名称自动高亮。测试检查当前所有足迹地点都存在相应边界。

如果市级文件加载失败，仍保留省级地图和路线播放。
