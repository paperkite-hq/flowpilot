import { defineConfig } from "vitepress";

export default defineConfig({
	title: "FlowPilot",
	description: "Bun-native AI workflow engine for TypeScript",
	base: "/flowpilot/",
	themeConfig: {
		nav: [
			{ text: "Guide", link: "/guide/getting-started" },
			{ text: "API", link: "/api/flowpilot" },
			{ text: "Examples", link: "/examples/overview" },
			{
				text: "GitHub",
				link: "https://github.com/paperkite-hq/flowpilot",
			},
		],
		sidebar: {
			"/guide/": [
				{
					text: "Introduction",
					items: [
						{ text: "What is FlowPilot?", link: "/guide/what-is-flowpilot" },
						{ text: "Getting Started", link: "/guide/getting-started" },
					],
				},
				{
					text: "Core Concepts",
					items: [
						{ text: "Workflows", link: "/guide/workflows" },
						{ text: "Steps", link: "/guide/steps" },
						{ text: "AI Integration", link: "/guide/ai-integration" },
						{ text: "Retry & Timeout", link: "/guide/retry-timeout" },
						{ text: "Persistence", link: "/guide/persistence" },
					],
				},
				{
					text: "Advanced",
					items: [
						{ text: "CLI", link: "/guide/cli" },
						{ text: "Docker", link: "/guide/docker" },
					],
				},
			],
			"/api/": [
				{
					text: "API Reference",
					items: [
						{ text: "FlowPilot", link: "/api/flowpilot" },
						{ text: "Types", link: "/api/types" },
					],
				},
			],
			"/examples/": [
				{
					text: "Examples",
					items: [
						{ text: "Overview", link: "/examples/overview" },
						{ text: "Hello World", link: "/examples/hello-world" },
						{ text: "AI Summarizer", link: "/examples/ai-summarizer" },
						{ text: "Data Pipeline", link: "/examples/data-pipeline" },
						{ text: "Webhook Handler", link: "/examples/webhook-handler" },
					],
				},
			],
		},
		footer: {
			message: "Released under the AGPL-3.0 License.",
			copyright: "Copyright 2026 FlowPilot Contributors",
		},
		search: {
			provider: "local",
		},
	},
});
