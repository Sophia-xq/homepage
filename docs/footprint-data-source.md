# 足迹地图数据源配置

网页使用 ECharts 渲染地图，数据入口在 `footprints.config.js`。

## 数据字段

每一行地点需要这些字段：

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| city | 城市 | 深圳 |
| province | 省份 | 广东 |
| lng | 经度 | 114.0579 |
| lat | 纬度 | 22.5431 |
| date | 日期 | 2023-09 |
| type | 类型 | base / study / travel |
| note | 备注 | 长期生活的城市 |

## 方案一：Google Sheets

1. 在 Google Sheets 建一张表，表头使用 `city, province, lng, lat, date, type, note`。
2. 选择 File → Share → Publish to web。
3. 发布为 CSV，复制 `output=csv` 的链接。
4. 修改 `footprints.config.js`：

```js
window.FOOTPRINT_CONFIG = {
  sourceUrl: "https://docs.google.com/spreadsheets/d/e/<PUBLISHED_ID>/pub?output=csv",
  refreshIntervalMs: 60000
};
```

之后只要在表格里新增一行，网页刷新或等待轮询后就会更新。

## 方案二：Notion

Notion token 不能写在前端页面里，否则任何访问者都能看到。建议部署一个 serverless API，再让网页请求这个 API。

1. 在 Notion 建一个 database / data source。
2. 字段命名为 `city, province, lng, lat, date, type, note`。
3. 创建 Notion integration，并把 database 分享给 integration。
4. 在 Vercel / Netlify 设置环境变量：
   - `NOTION_TOKEN`
   - `NOTION_FOOTPRINTS_DATA_SOURCE_ID`
5. 参考 `api/notion-footprints.example.mjs` 创建接口。
6. 修改 `footprints.config.js`：

```js
window.FOOTPRINT_CONFIG = {
  sourceUrl: "/api/notion-footprints",
  refreshIntervalMs: 60000
};
```

Notion 官方 API 需要 `Authorization` 和 `Notion-Version` 请求头，因此不要直接在浏览器里请求 Notion API。
