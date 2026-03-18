/**
 * Webhook Handler — validate, route, and process incoming events
 *
 * Demonstrates input validation, conditional routing, and error handling.
 */
import { FlowPilot } from "../src/index.ts";

interface WebhookEvent {
	type: string;
	payload: Record<string, unknown>;
	timestamp?: string;
}

interface ProcessedEvent {
	type: string;
	action: string;
	result: string;
}

const fp = new FlowPilot({ dbPath: ":memory:", logLevel: "info" });

fp.workflow<WebhookEvent, ProcessedEvent>("webhook-handler", async ({ step, input, log }) => {
	// Step 1: Validate the incoming event
	const validated = await step("validate", async () => {
		if (!input.type) {
			throw new Error("Missing event type");
		}
		if (!input.payload || typeof input.payload !== "object") {
			throw new Error("Missing or invalid payload");
		}
		log.info(`Received ${input.type} event`);
		return {
			type: input.type,
			payload: input.payload,
			timestamp: input.timestamp ?? new Date().toISOString(),
		};
	});

	// Step 2: Route to the correct handler
	const action = await step("route", async () => {
		switch (validated.type) {
			case "user.created":
				return "send-welcome";
			case "user.deleted":
				return "cleanup-data";
			case "payment.completed":
				return "fulfill-order";
			case "payment.failed":
				return "notify-team";
			default:
				return "log-unknown";
		}
	});

	// Step 3: Process the event
	const result = await step(
		"process",
		async () => {
			log.info(`Processing: ${action}`);

			switch (action) {
				case "send-welcome":
					return `Welcome email queued for ${validated.payload.email ?? "user"}`;
				case "cleanup-data":
					return `Data cleanup initiated for user ${validated.payload.userId ?? "unknown"}`;
				case "fulfill-order":
					return `Order ${validated.payload.orderId ?? "unknown"} fulfillment started`;
				case "notify-team":
					return `Team notified about failed payment ${validated.payload.paymentId ?? "unknown"}`;
				default:
					return `Unknown event logged: ${validated.type}`;
			}
		},
		{ timeout: 10000 },
	);

	// Step 4: Record the result
	await step("record", async () => {
		log.info(`Completed: ${result}`);
	});

	return { type: validated.type, action, result };
});

// Simulate processing several webhook events
const events: WebhookEvent[] = [
	{ type: "user.created", payload: { email: "alice@example.com", name: "Alice" } },
	{ type: "payment.completed", payload: { orderId: "ORD-123", amount: 49.99 } },
	{ type: "payment.failed", payload: { paymentId: "PAY-456", reason: "insufficient funds" } },
];

for (const event of events) {
	const result = await fp.run("webhook-handler", event);
	const output = result.output as ProcessedEvent;
	console.log(`[${output.type}] → ${output.action}: ${output.result}`);
}

fp.close();
