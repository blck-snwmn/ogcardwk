import { Resvg, initWasm } from "@resvg/resvg-wasm";
import React from "react";
//@ts-ignore
import resvgWasm from "../node_modules/@resvg/resvg-wasm/index_bg.wasm";
import satori from "satori";
await initWasm(resvgWasm);

import ogp from "open-graph-scraper-lite";


export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== 'GET') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		const url = new URL(request.url);
		if (url.pathname !== '/cards') {
			return new Response('Not Found', { status: 404 });
		}
		const purl = url.searchParams.get('url');
		if (!purl) {
			return new Response('Bad Request', { status: 400 });
		}
		const resp = await fetch(purl, {
			headers: {
				"User-Agent": "bot",
			},
		});
		if (!resp.ok) {
			return new Response('Failed to fetch URL', { status: 500 });
		}
		const body = await resp.text();
		const options = { html: body };
		const meta = await ogp(options);

		const fontData = await getGoogleFont();

		const svg = await satori(
			<OGPCard
				title={meta.result.ogTitle}
				description={meta.result.ogDescription}
				image_url={meta.result.ogImage?.[0].url}
			/>,
			{
				width: 1200,
				height: 630,
				fonts: [
					{
						name: "Roboto",
						data: fontData,
						weight: 400,
						style: "normal",
					},
				],
			},
		);


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
	title?: string
	description?: string
	image_url?: string
}
const OGPCard: React.FC<ComponentProps> = ({ title, description, image_url }) => {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				width: "1200px",
				height: "630px",
				backgroundColor: "#ADD8E6",
				overflow: "hidden",
			}}
		>
			{/* Left Section: Title and Description */}
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					padding: "40px",
					overflow: "hidden",
				}}
			>
				<h1
					style={{
						fontSize: "36px",
						fontWeight: "bold",
						marginBottom: "16px",
						overflow: "hidden",
						display: "-webkit-box",
						WebkitLineClamp: 2, // 最大2行まで
						WebkitBoxOrient: "vertical",
						whiteSpace: "normal", // 折り返しを許可
					}}
				>
					{title || "Default Title"}
				</h1>
				<p
					style={{
						fontSize: "24px",
						color: "#555",
						overflow: "hidden",
						display: "-webkit-box",
						WebkitLineClamp: 3, // 最大3行まで
						WebkitBoxOrient: "vertical",
						whiteSpace: "normal", // 折り返しを許可
					}}
				>
					{description || "Default description text that can wrap around to multiple lines if necessary."}
				</p>
			</div>

			{/* Right Section: Image */}
			<div
				style={{
					width: "600px",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{image_url ? (
					<img
						src={image_url}
						alt={title}
						style={{
							width: "100%",
							height: "100%",
							objectFit: "contain", // 見切れ防止
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
		</div>
	);
};

const Component: React.FC<ComponentProps> = ({ title, description, image_url }) => {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				// width: "1200px",
				// height: "630px",
				alignItems: "center",
				background: "#ADD8E6",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: "300px",
					height: "300px",
				}}
			>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
				}}
			>
				{image_url && <img src={image_url} alt={title} style={{
					width: "300px",
					height: "300px",
				}} />}
			</div>
		</div>
	);
};
