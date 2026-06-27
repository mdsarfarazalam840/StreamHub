export async function handler(event) {
  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      body: "Missing url",
    };
  }

  const targetUrl = decodeURIComponent(url);
  const isM3U8 = /\.m3u8/i.test(targetUrl);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Origin server returned ${response.status}`,
      };
    }

    if (isM3U8) {
      const playlist = await response.text();

      const rewritten = rewritePlaylist(playlist, targetUrl);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
        },
        body: rewritten,
      };
    }

    const buffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "video/MP2T",
        "Access-Control-Allow-Origin": "*",
      },
      body: Buffer.from(buffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: String(err),
    };
  }
}

function rewritePlaylist(body, targetUrl) {
  const endpoint = "/.netlify/functions/iptv-proxy?url=";

  const proxy = (u) =>
    endpoint + encodeURIComponent(new URL(u, targetUrl).href);

  return body
    .replace(/URI="([^"]*)"/g, (_, u) => `URI="${proxy(u)}"`)
    .replace(/^(?!#)(.+)$/gm, (line) => {
      const u = line.trim();
      return u ? proxy(u) : line;
    });
}