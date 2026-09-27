import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" ADD COLUMN "subtotal" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "discount_total" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "shipping_total" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "tax_total" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "product_refund_total" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "shipping_refund_total" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "tax_refund_total" numeric DEFAULT 0;

  UPDATE "orders"
  SET
    "subtotal" = COALESCE("amount", 0),
    "product_refund_total" = CASE
      WHEN "status" = 'refunded' THEN COALESCE("amount", 0)
      ELSE 0
    END;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders" DROP COLUMN "subtotal";
  ALTER TABLE "orders" DROP COLUMN "discount_total";
  ALTER TABLE "orders" DROP COLUMN "shipping_total";
  ALTER TABLE "orders" DROP COLUMN "tax_total";
  ALTER TABLE "orders" DROP COLUMN "product_refund_total";
  ALTER TABLE "orders" DROP COLUMN "shipping_refund_total";
  ALTER TABLE "orders" DROP COLUMN "tax_refund_total";`)
}
