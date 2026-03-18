import type { AIClient, AIGenerateOptions, AIProviderConfig } from "./types.ts";

/**
 * Create an AI client for use in workflow steps.
 * Supports Anthropic Claude and OpenAI-compatible APIs.
 */
export function createAIClient(config?: AIProviderConfig): AIClient {
	if (!config) {
		return createNoopClient();
	}

	const provider = config.provider;
	if (provider === "anthropic") {
		return createAnthropicClient(config);
	}
	if (provider === "openai") {
		return createOpenAIClient(config);
	}

	throw new Error(`Unsupported AI provider: ${provider}`);
}

function createNoopClient(): AIClient {
	return {
		async generate() {
			throw new Error("No AI provider configured. Pass an `ai` config to FlowPilot().");
		},
	};
}

function createAnthropicClient(config: AIProviderConfig): AIClient {
	const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
	const baseUrl = config.baseUrl ?? "https://api.anthropic.com";
	const defaultModel = config.model ?? "claude-sonnet-4-20250514";

	if (!apiKey) {
		throw new Error("Anthropic API key required. Set ANTHROPIC_API_KEY or pass apiKey in config.");
	}

	return {
		async generate(prompt: string, options?: AIGenerateOptions): Promise<string> {
			const model = options?.model ?? defaultModel;
			const maxTokens = options?.maxTokens ?? 1024;

			const body: Record<string, unknown> = {
				model,
				max_tokens: maxTokens,
				messages: [{ role: "user", content: prompt }],
			};
			if (options?.system) {
				body.system = options.system;
			}
			if (options?.temperature != null) {
				body.temperature = options.temperature;
			}

			const response = await fetch(`${baseUrl}/v1/messages`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
					"anthropic-version": "2023-06-01",
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`Anthropic API error (${response.status}): ${text}`);
			}

			const data = (await response.json()) as {
				content: Array<{ type: string; text?: string }>;
			};
			const textBlock = data.content.find((b) => b.type === "text");
			return textBlock?.text ?? "";
		},
	};
}

function createOpenAIClient(config: AIProviderConfig): AIClient {
	const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
	const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
	const defaultModel = config.model ?? "gpt-4o";

	if (!apiKey) {
		throw new Error("OpenAI API key required. Set OPENAI_API_KEY or pass apiKey in config.");
	}

	return {
		async generate(prompt: string, options?: AIGenerateOptions): Promise<string> {
			const model = options?.model ?? defaultModel;
			const maxTokens = options?.maxTokens ?? 1024;

			const messages: Array<{ role: string; content: string }> = [];
			if (options?.system) {
				messages.push({ role: "system", content: options.system });
			}
			messages.push({ role: "user", content: prompt });

			const body: Record<string, unknown> = {
				model,
				max_tokens: maxTokens,
				messages,
			};
			if (options?.temperature != null) {
				body.temperature = options.temperature;
			}

			const response = await fetch(`${baseUrl}/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(body),
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(`OpenAI API error (${response.status}): ${text}`);
			}

			const data = (await response.json()) as {
				choices: Array<{ message: { content: string } }>;
			};
			return data.choices[0]?.message?.content ?? "";
		},
	};
}
