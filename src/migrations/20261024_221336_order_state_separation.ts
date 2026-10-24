import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_order_status" AS ENUM('open', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_orders_payment_status" AS ENUM('not_recorded', 'pending', 'paid', 'partially_refunded', 'refunded', 'failed', 'cancelled');
  CREATE TYPE "public"."enum_orders_fulfillment_status" AS ENUM('unfulfilled', 'preparing', 'partially_fulfilled', 'shipped', 'delivered', 'fulfilled');
  CREATE TYPE "public"."enum_orders_return_status" AS ENUM('none', 'requested', 'partially_returned', 'returned');
  DROP INDEX "orders_status_idx";
  ALTER TABLE "orders" ADD COLUMN "order_status" "enum_orders_order_status" DEFAULT 'open' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "payment_status" "enum_orders_payment_status" DEFAULT 'not_recorded' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "fulfillment_status" "enum_orders_fulfillment_status" DEFAULT 'unfulfilled' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "return_status" "enum_orders_return_status" DEFAULT 'none' NOT NULL;
  ALTER TABLE "orders" ADD COLUMN "workflow_version" numeric DEFAULT 0 NOT NULL;
  CREATE INDEX "orders_order_status_idx" ON "orders" USING btree ("order_status");
  CREATE INDEX "orders_payment_status_idx" ON "orders" USING btree ("payment_status");
  CREATE INDEX "orders_fulfillment_status_idx" ON "orders" USING btree ("fulfillment_status");
  CREATE INDEX "orders_return_status_idx" ON "orders" USING btree ("return_status");`)
  // Preserve known history without fabricating shipment/delivery or payment evidence.
  await db.execute(sql`
    UPDATE "orders" SET
      "order_status" = (CASE "status" WHEN 'cancelled' THEN 'cancelled' WHEN 'completed' THEN 'completed' ELSE 'open' END)::enum_orders_order_status,
      "fulfillment_status" = (CASE WHEN "status" = 'completed' THEN 'fulfilled' ELSE 'unfulfilled' END)::enum_orders_fulfillment_status;
    UPDATE "orders" o SET "payment_status" = (CASE
      WHEN EXISTS (SELECT 1 FROM transactions t WHERE t.order_id = o.id AND t.status = 'succeeded') THEN
        CASE WHEN o.amount > 0 AND COALESCE(o.product_refund_total,0) + COALESCE(o.shipping_refund_total,0) + COALESCE(o.tax_refund_total,0) >= o.amount THEN 'refunded'
             WHEN COALESCE(o.product_refund_total,0) + COALESCE(o.shipping_refund_total,0) + COALESCE(o.tax_refund_total,0) > 0 THEN 'partially_refunded' ELSE 'paid' END
      WHEN EXISTS (SELECT 1 FROM transactions t WHERE t.order_id = o.id AND t.status = 'refunded') THEN 'refunded'
      WHEN EXISTS (SELECT 1 FROM transactions t WHERE t.order_id = o.id AND t.status IN ('pending','processing')) THEN 'pending'
      WHEN EXISTS (SELECT 1 FROM transactions t WHERE t.order_id = o.id AND t.status = 'failed') THEN 'failed'
      WHEN EXISTS (SELECT 1 FROM transactions t WHERE t.order_id = o.id AND t.status IN ('cancelled','expired')) THEN 'cancelled'
      ELSE 'not_recorded' END)::enum_orders_payment_status;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_order_status_idx";
  DROP INDEX "orders_payment_status_idx";
  DROP INDEX "orders_fulfillment_status_idx";
  DROP INDEX "orders_return_status_idx";
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  ALTER TABLE "orders" DROP COLUMN "order_status";
  ALTER TABLE "orders" DROP COLUMN "payment_status";
  ALTER TABLE "orders" DROP COLUMN "fulfillment_status";
  ALTER TABLE "orders" DROP COLUMN "return_status";
  ALTER TABLE "orders" DROP COLUMN "workflow_version";
  DROP TYPE "public"."enum_orders_order_status";
  DROP TYPE "public"."enum_orders_payment_status";
  DROP TYPE "public"."enum_orders_fulfillment_status";
  DROP TYPE "public"."enum_orders_return_status";`)
}
