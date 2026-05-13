export default async function handler(request, response) {
  const notionToken = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_FOOTPRINTS_DATA_SOURCE_ID;

  if (!notionToken || !dataSourceId) {
    response.status(500).json({ error: "Missing NOTION_TOKEN or NOTION_FOOTPRINTS_DATA_SOURCE_ID" });
    return;
  }

  const notionResponse = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2026-03-11"
    },
    body: JSON.stringify({
      sorts: [{ property: "date", direction: "ascending" }]
    })
  });

  if (!notionResponse.ok) {
    response.status(notionResponse.status).json({ error: await notionResponse.text() });
    return;
  }

  const payload = await notionResponse.json();
  const items = payload.results.map((page) => {
    const properties = page.properties;

    return {
      city: properties.city?.title?.[0]?.plain_text ?? "",
      province: properties.province?.rich_text?.[0]?.plain_text ?? "",
      lng: properties.lng?.number,
      lat: properties.lat?.number,
      date: properties.date?.date?.start ?? "",
      type: properties.type?.select?.name ?? "visit",
      note: properties.note?.rich_text?.[0]?.plain_text ?? ""
    };
  });

  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  response.status(200).json(items);
}

