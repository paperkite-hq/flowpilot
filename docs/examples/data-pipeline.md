# Data Pipeline

A classic ETL (Extract → Transform → Load) pipeline with validation and error handling.

<<< ../../examples/data-pipeline.ts

## What it does

1. **Extract** — fetches raw data from an API
2. **Validate** — checks data integrity, throws on invalid records
3. **Transform** — normalizes and enriches each record
4. **Load** — writes the transformed data to an output destination

## Patterns demonstrated

- Sequential step composition where each step uses the previous step's output
- Data validation with early failure
- Dynamic step naming for batch processing
- Retry on the extract step to handle flaky APIs
