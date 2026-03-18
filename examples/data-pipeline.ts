/**
 * Data Pipeline — Extract → Transform → Load
 *
 * Demonstrates sequential step composition with validation and retry.
 */
import { FlowPilot } from "../src/index.ts";

interface Record {
	id: number;
	name: string;
	email: string;
	createdAt: string;
}

const fp = new FlowPilot({ dbPath: ":memory:" });

fp.workflow<void, Record[]>("data-pipeline", async ({ step, log }) => {
	// Step 1: Extract — fetch raw data
	const rawData = await step(
		"extract",
		async () => {
			log.info("Extracting data from source...");
			// Simulate API response
			return [
				{
					id: 1,
					name: "Alice",
					email: "alice@example.com",
					createdAt: "2024-01-15",
				},
				{
					id: 2,
					name: "Bob",
					email: "bob@test.org",
					createdAt: "2024-02-20",
				},
				{
					id: 3,
					name: "",
					email: "invalid",
					createdAt: "2024-03-10",
				},
			];
		},
		{ retry: { maxAttempts: 3 } },
	);

	// Step 2: Validate — check data integrity
	const validRecords = await step("validate", async () => {
		log.info(`Validating ${rawData.length} records...`);
		const valid = rawData.filter((r) => {
			if (!r.name || !r.email.includes("@")) {
				log.warn(`Skipping invalid record: id=${r.id}`);
				return false;
			}
			return true;
		});
		log.info(`${valid.length}/${rawData.length} records passed validation`);
		return valid;
	});

	// Step 3: Transform — normalize data
	const transformed = await step("transform", async () => {
		log.info("Transforming records...");
		return validRecords.map((r) => ({
			...r,
			name: r.name.trim().toLowerCase(),
			email: r.email.trim().toLowerCase(),
			createdAt: new Date(r.createdAt).toISOString(),
		}));
	});

	// Step 4: Load — write to destination
	await step("load", async () => {
		log.info(`Loading ${transformed.length} records...`);
		// In a real pipeline: write to database, S3, API, etc.
		for (const record of transformed) {
			log.debug(`Loaded: ${record.name} (${record.email})`);
		}
		log.info("Load complete");
	});

	return transformed;
});

// Run the pipeline
const result = await fp.run("data-pipeline");
console.log(`\nPipeline ${result.status}`);
console.log(`Processed ${(result.output as Record[]).length} records`);
console.log(`Duration: ${result.durationMs}ms`);
console.log(`Steps: ${result.steps.map((s) => `${s.stepId}(${s.durationMs}ms)`).join(" → ")}`);

fp.close();
