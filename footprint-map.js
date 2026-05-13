const fallbackFootprints = [
  {
    city: "深圳",
    province: "广东",
    lng: 114.0579,
    lat: 22.5431,
    date: "2005-02",
    type: "base",
    note: "成长与长期生活的城市"
  },
  {
    city: "哈尔滨",
    province: "黑龙江",
    lng: 126.6424,
    lat: 45.7567,
    date: "2023-09",
    type: "study",
    note: "哈尔滨工业大学（深圳）学习轨迹中的北方坐标"
  }
];

const footprintMapGeoJson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Eurasia" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-10, 36],
            [-6, 52],
            [10, 61],
            [36, 64],
            [62, 56],
            [88, 58],
            [116, 55],
            [142, 48],
            [134, 35],
            [122, 23],
            [102, 15],
            [80, 9],
            [62, 18],
            [42, 28],
            [20, 34],
            [-10, 36]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Africa" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-17, 32],
            [7, 37],
            [28, 31],
            [42, 11],
            [35, -18],
            [20, -34],
            [2, -35],
            [-12, -10],
            [-17, 32]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "North America" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-168, 55],
            [-136, 70],
            [-94, 62],
            [-60, 48],
            [-76, 24],
            [-106, 16],
            [-132, 30],
            [-168, 55]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "South America" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-82, 12],
            [-55, 6],
            [-38, -15],
            [-52, -55],
            [-72, -45],
            [-80, -15],
            [-82, 12]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: { name: "Australia" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [112, -11],
            [154, -18],
            [146, -39],
            [118, -35],
            [112, -11]
          ]
        ]
      }
    }
  ]
};

const mapElement = document.getElementById("footprintMap");
const statusElement = document.getElementById("footprintStatus");
let footprintChart;

function readField(row, keys, fallback = "") {
  const normalized = Object.entries(row).reduce((result, [key, value]) => {
    result[key.trim().toLowerCase()] = value;
    return result;
  }, {});

  for (const key of keys) {
    const directValue = row[key];
    if (directValue !== undefined && directValue !== "") return directValue;

    const normalizedValue = normalized[key.trim().toLowerCase()];
    if (normalizedValue !== undefined && normalizedValue !== "") return normalizedValue;
  }

  return fallback;
}

function normalizeFootprint(row) {
  const lng = Number(
    readField(row, ["lng", "longitude", "经度", "经度lng", "经度 longitude", "lon", "long"])
  );
  const lat = Number(readField(row, ["lat", "latitude", "纬度", "纬度lat", "纬度 latitude"]));

  return {
    city: readField(row, ["city", "城市", "地点", "城市/地点", "name", "location"], "未命名地点"),
    province: readField(row, ["province", "省份", "省", "地区", "region"]),
    lng,
    lat,
    date: readField(row, ["date", "日期", "时间", "visited_at", "visit_date"]),
    type: readField(row, ["type", "类型", "分类", "category"], "visit"),
    note: readField(row, ["note", "备注", "描述", "description", "memo"])
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(value.trim());
      if (row.some((item) => item !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some((item) => item !== "")) rows.push(row);

  const headers = rows.shift().map((item) => item.trim());

  return rows.map((line) => {
    return headers.reduce((entry, header, index) => {
      entry[header] = line[index] ?? "";
      return entry;
    }, {});
  });
}

async function loadFootprints() {
  const config = window.FOOTPRINT_CONFIG ?? {};

  if (!config.sourceUrl) {
    return fallbackFootprints;
  }

  const response = await fetch(config.sourceUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`数据源请求失败：${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/csv") || config.sourceUrl.includes("output=csv")) {
    return parseCsv(await response.text()).map(normalizeFootprint);
  }

  const data = await response.json();
  const rows = Array.isArray(data) ? data : data.items ?? data.results ?? [];
  return rows.map(normalizeFootprint);
}

function renderFootprints(rawFootprints) {
  if (!mapElement || !window.echarts) return;

  const footprints = rawFootprints
    .map(normalizeFootprint)
    .filter((item) => Number.isFinite(item.lng) && Number.isFinite(item.lat));

  if (!footprintChart) {
    window.echarts.registerMap("worldFootprint", footprintMapGeoJson);
    footprintChart = window.echarts.init(mapElement);
    window.addEventListener("resize", () => footprintChart.resize());
  }

  const sorted = [...footprints].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const routeData = sorted.map((item) => [item.lng, item.lat]);
  const mapView = getMapView(sorted);

  footprintChart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      borderWidth: 0,
      padding: 12,
      formatter: (params) => {
        const data = params.data;
        if (!data?.city) return "";
        const location = data.province ? `${data.province} · ${data.city}` : data.city;
        return `<strong>${location}</strong><br/>${data.date || "未填写日期"}<br/>${data.note || "暂无备注"}`;
      }
    },
    geo: {
      map: "worldFootprint",
      roam: true,
      zoom: mapView.zoom,
      center: mapView.center,
      label: { show: false },
      itemStyle: {
        areaColor: "rgba(13, 143, 131, 0.13)",
        borderColor: "rgba(13, 143, 131, 0.82)",
        borderWidth: 1.4
      },
      emphasis: {
        itemStyle: { areaColor: "rgba(230, 107, 85, 0.16)" },
        label: { show: false }
      }
    },
    series: [
      {
        name: "足迹路线",
        type: "lines",
        coordinateSystem: "geo",
        polyline: true,
        data: routeData.length > 1 ? [{ coords: routeData }] : [],
        lineStyle: {
          color: "#e66b55",
          width: 2,
          opacity: 0.78,
          curveness: 0.2
        },
        effect: {
          show: true,
          period: 5,
          trailLength: 0.18,
          symbolSize: 6,
          color: "#e66b55"
        },
        silent: true,
        zlevel: 2
      },
      {
        name: "足迹地点",
        type: "effectScatter",
        coordinateSystem: "geo",
        data: sorted.map((item) => ({
          ...item,
          name: item.city,
          value: [item.lng, item.lat, 1]
        })),
        symbolSize: (value, params) => (params.data.type === "base" ? 18 : 14),
        rippleEffect: { brushType: "stroke", scale: 3.8 },
        itemStyle: {
          color: (params) => (params.data.type === "base" ? "#e66b55" : "#0d8f83"),
          shadowBlur: 12,
          shadowColor: "rgba(0, 0, 0, 0.22)"
        },
        label: {
          show: true,
          formatter: "{b}",
          position: "right",
          color: "inherit",
          fontWeight: 800
        },
        zlevel: 3
      }
    ]
  });

  if (statusElement) {
    statusElement.textContent = `${footprints.length} 个地点 · ${new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    })} 更新`;
  }
}

function getMapView(footprints) {
  if (footprints.length === 0) {
    return { center: [60, 25], zoom: 0.95 };
  }

  const lngs = footprints.map((item) => item.lng);
  const lats = footprints.map((item) => item.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngRange = Math.max(maxLng - minLng, 1);
  const latRange = Math.max(maxLat - minLat, 1);

  let zoom = 2.2;
  if (lngRange > 120 || latRange > 60) zoom = 0.9;
  else if (lngRange > 70 || latRange > 36) zoom = 1.05;
  else if (lngRange > 35 || latRange > 20) zoom = 1.35;

  return {
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
    zoom
  };
}

async function syncFootprints() {
  if (!mapElement) return;

  if (!window.echarts) {
    mapElement.innerHTML = "<p>ECharts 未加载，请检查网络或改为本地引入 echarts.min.js。</p>";
    return;
  }

  try {
    if (statusElement && window.FOOTPRINT_CONFIG?.sourceUrl) {
      statusElement.textContent = "正在同步 Google Sheets";
    }

    const footprints = await loadFootprints();
    renderFootprints(footprints);
  } catch (error) {
    renderFootprints(fallbackFootprints);
    if (statusElement) statusElement.textContent = "数据源读取失败，已显示本地示例";
    console.warn(error);
  }
}

syncFootprints();

if (window.FOOTPRINT_CONFIG?.refreshIntervalMs > 0) {
  window.setInterval(syncFootprints, window.FOOTPRINT_CONFIG.refreshIntervalMs);
}
