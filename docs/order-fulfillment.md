# Order states and fulfillment

Each order has four independent states:

| State | Meaning | Who changes it |
| --- | --- | --- |
| Order | Open, completed, cancelled | Administrator workflow actions |
| Payment | Not recorded, pending, paid, partially refunded, refunded, failed, cancelled | Recorded payment transactions and refund totals |
| Fulfillment | Unfulfilled, preparing, partially fulfilled, shipped, delivered, legacy fulfilled | Administrator shipment actions |
| Returns | None, requested, partially returned, returned | Reserved for the returns workflow |

Fulfillment actions do not charge or refund money. Stock is deducted during payment settlement. Creating shipments and marking delivery do not deduct it again. Cancelling a paid, unshipped order restores its sold quantities once and leaves payment status unchanged. Once any quantity has shipped, cancellation is blocked; physical returns need their own quantity and restocking workflow.

## Shipment workflow

Open an order in Payload and use **Fulfillment & tracking**:

1. Start preparing a paid order.
2. Create a shipment, choose quantities from the remaining items, and enter its carrier. Tracking number and HTTPS tracking link are optional.
3. Dispatch the shipment. Orders with quantities still outstanding become partially fulfilled.
4. Edit tracking when details change and mark each shipment delivered when confirmed.
5. Complete the order after all shipments are delivered.

Customer account and guest order pages display the separate states, shipment quantities, tracking links, and delivery dates. Existing order ownership and guest access-token checks still apply. Only administrators can mutate fulfillment or retry its emails. Activity records identify the staff member and time for each action.

Shipping labels, carrier API synchronization, shipping-rate calculations, issuing refunds, and accepting returns are separate future workflows. Delivery updates in this version are recorded by staff.

## Concurrency and retries

`POST /api/orders/:id/workflow` takes an action, the last loaded `version`, and a UUID `requestID`. Shipment actions also take item row IDs and quantities or an existing shipment ID. The server validates quantities, payment eligibility, transitions, and tracking links.

The version claim, shipment changes, activity event, and email-outbox entry commit in one database transaction. A stale version returns HTTP 409. Replaying the same request ID and payload returns the current order without creating another shipment. Reusing that ID for another payload returns HTTP 409. Purchased item IDs and quantities cannot be edited after creation.

The legacy `status` field remains as a compatibility projection for the ecommerce plugin. Reports and custom views use the separate state fields.

## Customer notifications

Shipment, tracking-update, and delivery emails use the configured SMTP or Resend adapter. Staff can turn off the notification when dispatching a shipment or editing tracking. Email delivery happens after the order transaction commits.

The internal `shipment-notifications` collection records pending, sending, sent, failed, or skipped deliveries. The order panel lists delivery status and offers retries for pending or failed entries. Concurrent retries claim one send attempt. A sent notification is not sent again.

If the application stops after SMTP accepts a message but before its sent marker is saved, the entry remains `sending`. Check the provider's delivery logs before reconciling that entry. Exactly-once delivery cannot be guaranteed across a database and SMTP; ambiguous entries are not automatically resent.

## Existing orders and release checks

Run the committed migrations before deploying application code that reads the new columns. Historical completed orders become `fulfilled`, with no invented shipment or delivery date. Historical orders without payment evidence remain `not_recorded` and cannot be dispatched. Refund status alone does not imply a physical return.

`pnpm test:migrations` requires a **fresh, empty, disposable local database** through `TEST_DATABASE_URL`, ending in `_test`. It builds the old schema, inserts synthetic historical cases, applies the new migrations, verifies states and preserved totals/items, and rehearses rollback/reapply. It refuses an existing orders table. CI runs it before integration and browser checks.

The integration suite covers partial dispatch, tracking, delivery, completion, cancellation/restocking, payment independence, invalid quantities, access control, stale writes, request replay, and email failures/retries. Browser checks exercise staff controls and customer tracking in the production build.

Rolling these migrations back removes shipment and notification history. Use a database backup when preserving that history is required.
