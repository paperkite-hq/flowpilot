# Webhook Handler

Process incoming webhook events with validation, routing, and notification.

<<< ../examples/webhook-handler.ts

## What it does

1. **Validate** — verifies the webhook payload has required fields
2. **Route** — determines how to handle the event based on its type
3. **Process** — executes the appropriate handler for the event type
4. **Notify** — sends a notification about the processed event

## Patterns demonstrated

- Input validation with typed workflow inputs
- Conditional logic in steps (event routing)
- AI-powered processing (optional)
- Error handling with meaningful error messages
