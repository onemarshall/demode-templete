// TODO: When a Tailwind v4 design token system is in place, replace hardcoded
// colour/spacing values with tokens via `tw-to-css` (twj()) so the OG image
// stays in sync with the site's design system automatically.
import type { RequestHandler } from "./$types";
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";

let wasmInitialized = false;

async function ensureWasm(origin: string) {
  if (wasmInitialized) return;
  const res = await fetch(`${origin}/resvg.wasm`);
  const buffer = await res.arrayBuffer();
  await initWasm(buffer);
  wasmInitialized = true;
}

async function fetchImageDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  }
}

export const GET: RequestHandler = async ({ url }) => {
  const title =
    url.searchParams.get("title") || "Oxford Centre for Animal Ethics";
  const description = url.searchParams.get("description") || "";
  const siteName =
    url.searchParams.get("siteName") || "Oxford Centre for Animal Ethics";
  const imageParam = url.searchParams.get("image") || "";

  const [fontData, imageDataUrl] = await Promise.all([
    fetch(`${url.origin}/fonts/OpenSans-Regular.ttf`).then((r) =>
      r.arrayBuffer(),
    ),
    imageParam ? fetchImageDataUrl(imageParam) : Promise.resolve(null),
  ]);

  await ensureWasm(url.origin);

  const hasImage = Boolean(imageDataUrl);
  const textPanelWidth = hasImage ? 680 : 1200;

  const textPanel = {
    type: "div",
    props: {
      style: {
        width: textPanelWidth,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 64px 64px",
        boxSizing: "border-box",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: 16,
              fontWeight: 600,
              color: "#e4d6b6",
              letterSpacing: 3,
              textTransform: "uppercase",
            },
            children: siteName,
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 20,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: hasImage ? 52 : 64,
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.1,
                    letterSpacing: -1,
                  },
                  children: title,
                },
              },
              ...(description
                ? [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 22,
                          color: "#999999",
                          lineHeight: 1.5,
                          fontWeight: 400,
                        },
                        children: description,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      ],
    },
  };

  const imagePanel = imageDataUrl
    ? {
        type: "div",
        props: {
          style: {
            width: 520,
            height: 630,
            backgroundImage: `url(${imageDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          },
        },
      }
    : null;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: 1200,
          height: 630,
          background: "#111111",
          display: "flex",
          flexDirection: "row",
          fontFamily: "Open Sans",
          position: "relative",
        },
        children: [
          textPanel,
          ...(imagePanel ? [imagePanel] : []),
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 4,
                background: "#e4d6b6",
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Open Sans",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();

  return new Response(png as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
    },
  });
};
