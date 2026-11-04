# Refunds and returns

The order editor's **Refunds & returns** panel has two independent workflows.
Refunds move money to the original payment method. Receiving returns records
physical goods and optionally restores stock. Neither action cancels the order
or changes shipment history.

## Refund a payment

1. Save any other order edits, then choose **Issue refund**.
2. Enter product, shipping, and tax amounts in the order's currency. The defaults
   refund the remaining balance. Product amounts are capped after discounts.
3. Give a reason and review the total.
4. Choose **Confirm refund** to request the refund from Stripe.

Only a single, recorded, succeeded Stripe transaction matching the order's
charged amount and currency is supported. Demo orders without payment evidence,
unpaid orders, and unsupported/multiple payment records cannot be refunded here.
The server enforces whole minor units and caps each component and the total.
Current supported currencies (USD, GBP, EUR) all have two decimal places.

The original transaction stays succeeded: it records the original charge.
Only provider-confirmed successful refunds contribute to the order's refund
totals and its paid/partially-refunded/refunded status. Pending refunds remain
visible and reserve the workflow until resolved. A late provider failure removes
that operation's financial contribution, without changing goods or stock.

## Recovery and webhook setup

Enable **refund.created**, **refund.updated**, and **refund.failed** on the existing
Stripe webhook endpoint, in addition to payment_intent.succeeded. Existing
signature verification protects these events. The handler retrieves current
Stripe state rather than trusting an out-of-order event snapshot.

Every request is stored before contacting Stripe. The stable request UUID becomes
the Stripe idempotency key. Reusing an ID with different input is rejected. The
order version serializes reservations with other order actions, and reconciliation
locks the order before changing financial totals. A refund is counted once even
when browser retries and webhooks arrive together.

If the connection fails, refresh and choose **Reconcile refund** on the existing
entry. Reconciliation first looks for an already-created provider refund and
checks its PaymentIntent, amount, currency, and request metadata. It may safely
retry the same request within 23 hours. It never resubmits an uncertain older
request after Stripe's minimum idempotency-retention window could have elapsed.
Such entries become **Needs review** and continue to block another refund.

Refunds issued outside this admin are not automatically assigned to product,
shipping, or tax components. If Stripe contains an unallocated external refund,
new requests are blocked rather than risking duplicate reimbursement. Check the
Stripe record and have an operator reconcile its financial allocation before
continuing; this release does not provide an external-refund import screen or
an administrative override for an uncertain old operation. Do not clear a
reservation or invent a fresh request ID merely to bypass that warning.

## Request and receive returned goods

1. Choose **Create return**, select shipped quantities, and give a reason.
2. When goods physically arrive, choose **Receive return**.
3. Enter the quantities received in this delivery. They can be smaller than the
   requested quantities.
4. Explicitly select **Restock** for sellable goods. It is unchecked by default.
5. Confirm receipt. Repeat for any remaining goods.

Only shipped quantities not already assigned to a return are available. Legacy
fulfilled orders may use their purchased quantities without inventing delivery
dates. Cancelled orders cannot start a return. Receipt quantities cannot exceed
what remains outstanding, and no receipt issues money automatically.

Inventory increments, cumulative received/restocked quantities, and staff activity
commit in one transaction. Replayed requests do not restock twice. Missing products
or variants and undefined inventory prevent restocking; receive without restocking
if those goods must remain outside sellable inventory. Staff activity preserves
each receipt's item quantities, restock decisions, actor, and time. Receiving all
purchased quantities marks the order returned; receiving fewer marks it partially
returned. Shipment state and payment state remain independent.

## Access and customer visibility

Only administrators can issue refunds, receive goods, or reconcile provider
operations. Direct API/GraphQL edits cannot manufacture order states, refund
totals, or return receipts. Purchased items, charge totals, and currency are
immutable. Orders with refund records cannot be deleted through the order API.
Provider-operation records are internal and not writable through public APIs.

Customer/guest order pages retain their existing ownership/token checks and show
confirmed refund totals, return quantities, and received progress. Staff-only
workflow events are not exposed to customers.

## Deployment and verification

Apply the additive refunds/returns and return-receipt-audit migrations before
deploying the application. Historical orders keep their existing amounts and
states. These migrations preserve the R2 media columns. Rolling them back removes
refund/return/audit data: retain a database backup if that history must survive.

Automated verification uses a disposable loopback test database. Integration
tests use the real Payload operations, transactions, authorization and webhook
signatures, replacing only the external Stripe transport. Browser tests cover
custom validation, refund review, physical return receipt, explicit restocking,
customer visibility, and light/dark/mobile views. They do not issue a refund
against a real Stripe account. Complete a separate Stripe sandbox and deployed
webhook exercise before enabling this workflow for live payments.

Customer self-service return requests, return labels, exchanges, custom refund
and return emails, external-refund imports, and carrier integrations remain
separate features. Stripe's own refund receipts depend on the account's email
configuration.
