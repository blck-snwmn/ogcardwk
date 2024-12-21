import { Resvg, initWasm } from "@resvg/resvg-wasm";
import type React from "react";
import satori from "satori";
//@ts-ignore
import resvgWasm from "../node_modules/@resvg/resvg-wasm/index_bg.wasm";
await initWasm(resvgWasm);

import ogp, { type SuccessResult } from "open-graph-scraper-lite";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== "GET") {
			return new Response("Method Not Allowed", { status: 405 });
		}

		const url = new URL(request.url);
		if (url.pathname !== "/cards") {
			return new Response("Not Found", { status: 404 });
		}
		const purl = url.searchParams.get("url");
		if (!purl) {
			return new Response("Bad Request", { status: 400 });
		}
		const resp = await fetch(purl, {
			headers: {
				"User-Agent": "bot",
			},
		});
		if (!resp.ok) {
			return new Response("Failed to fetch URL", { status: 500 });
		}
		const body = await resp.text();
		const options = { html: body };
		const meta = await ogp(options);
		if (meta.error) {
			return new Response("Failed to parse OGP", { status: 500 });
		}

		const fontData = await getGoogleFont();

		const svg = await satori(<OGPCard og={meta.result} />, {
			width: 600,
			height: 500,
			fonts: [
				{
					name: "Roboto",
					data: fontData,
					weight: 400,
					style: "normal",
				},
			],
			loadAdditionalAsset: async (code: string, segment: string) => {
				if (code === "emoji") {
					return `data:image/svg+xml;base64,${btoa(await loadEmoji(getIconCode(segment)))}`;
				}

				return code;
			},
		});

		const resvg = new Resvg(svg, {
			fitTo: {
				mode: "original",
			},
		});

		const pngData = resvg.render();
		const pngBuffer = pngData.asPng();
		return new Response(pngBuffer, {
			headers: {
				"Content-Type": "image/png",
			},
		});
	},
} satisfies ExportedHandler<Env>;

async function getGoogleFont() {
	const familyResp = await fetch(
		"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700",
	);
	if (!familyResp.ok) {
		throw new Error("Failed to load font data");
	}
	const css = await familyResp.text();
	const resource = css.match(
		/src: url\((.+)\) format\('(opentype|truetype)'\)/,
	);
	if (!resource) {
		throw new Error("Failed to parse font data");
	}

	const fontDataResp = await fetch(resource[1]);
	return await fontDataResp.arrayBuffer();
}

interface ComponentProps {
	og: SuccessResult["result"];
}
const OGPCard: React.FC<ComponentProps> = ({ og }) => {
	const { ogTitle: title, ogDescription: description, ogImage: imageURLs } = og;
	const imageURL = imageURLs?.[0].url;
	console.log("title", title);
	console.log("description", description);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "600px",
				height: "500px",
				backgroundColor: "#ADD8E6",
				border: "5px solid #00bfff",
				borderRadius: "15px",
				overflow: "hidden",
			}}
		>
			{/* Top Section: Image */}
			<div
				style={{
					width: "100%",
					height: "315px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					overflow: "hidden",
				}}
			>
				{imageURL ? (
					<img
						src={imageURL}
						alt={title}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "cover",
						}}
					/>
				) : (
					<div
						style={{
							width: "100%",
							height: "100%",
							backgroundColor: "#ddd",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "20px",
							color: "#666",
						}}
					>
						No Image
					</div>
				)}
			</div>

			{/* Bottom Section: Title and Description */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "flex-start", // Align to the top
					padding: "10px",
					overflow: "hidden",
				}}
			>
				<p
					style={{
						fontSize: "28px",
						fontWeight: "bold",
						margin: 0,
						height: "80px",
						overflow: "hidden",
						display: "-webkit-box",
						WebkitBoxOrient: "vertical",
						WebkitLineClamp: 2,
						textOverflow: "ellipsis",
					}}
				>
					{title || "Default Title"}
				</p>
				<p
					style={{
						fontSize: "24px",
						color: "#555",
						margin: 0,
						height: "80px",
						overflow: "hidden",
						display: "-webkit-box",
						WebkitBoxOrient: "vertical",
						WebkitLineClamp: 2,
						textOverflow: "ellipsis",
					}}
				>
					{description ||
						"Default description text that can wrap around to multiple lines if necessary."}
				</p>
			</div>
		</div>
	);
};

const U200D = String.fromCharCode(8205);
const UFE0Fg = /\uFE0F/g;

export function getIconCode(char: string) {
	// remove VS if char contains ZWJ
	const unicodeSurrogates = !char.includes(U200D)
		? char.replace(UFE0Fg, "")
		: char;

	const r = [];
	for (let i = 0; i < unicodeSurrogates.length; i++) {
		const codePoint = unicodeSurrogates.codePointAt(i);
		if (codePoint == null) {
			continue;
		}
		r.push(codePoint.toString(16));
		i += codePoint > 0xffff ? 2 : 1; // If it's a surrogate pair, advance two characters.
	}
	return r.join("-");
}

export async function loadEmoji(code: string) {
	return fetch(
		`https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/${code.toUpperCase()}.svg`,
	).then(async (r) => r.text());
}
