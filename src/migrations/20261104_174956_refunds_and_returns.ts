import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_order_refunds_status" AS ENUM('submitting', 'pending', 'requires_action', 'succeeded', 'failed', 'canceled', 'needs_review');
  CREATE TABLE "order_refunds" (
    "id" serial PRIMARY KEY NOT NULL,
    "order_id" integer NOT NULL,
    "transaction_id" integer NOT NULL,
    "request_i_d" varchar NOT NULL,
    "request_hash" varchar NOT NULL,
    "actor_id" integer NOT NULL,
    "reason" varchar NOT NULL,
    "payment_intent_i_d" varchar NOT NULL,
    "provider_refund_i_d" varchar,
    "currency" varchar NOT NULL,
    "product_amount" numeric NOT NULL,
    "shipping_amount" numeric NOT NULL,
    "tax_amount" numeric NOT NULL,
    "amount" numeric NOT NULL,
    "status" "enum_order_refunds_status" DEFAULT 'submitting' NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "orders_returns_items" (
    "_order" integer NOT NULL,
    "_parent_id" varchar NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "order_item_i_d" varchar NOT NULL,
    "quantity" numeric NOT NULL,
    "received" numeric DEFAULT 0 NOT NULL,
    "restocked" numeric DEFAULT 0 NOT NULL
  );

  CREATE TABLE "orders_returns" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "reason" varchar NOT NULL,
    "requested_at" timestamp(3) with time zone NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "order_refunds_id" integer;
  ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_returns_items" ADD CONSTRAINT "orders_returns_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_returns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_returns" ADD CONSTRAINT "orders_returns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "order_refunds_order_idx" ON "order_refunds" USING btree ("order_id");
  CREATE INDEX "order_refunds_transaction_idx" ON "order_refunds" USING btree ("transaction_id");
  CREATE UNIQUE INDEX "order_refunds_request_i_d_idx" ON "order_refunds" USING btree ("request_i_d");
  CREATE INDEX "order_refunds_actor_idx" ON "order_refunds" USING btree ("actor_id");
  CREATE UNIQUE INDEX "order_refunds_provider_refund_i_d_idx" ON "order_refunds" USING btree ("provider_refund_i_d");
  CREATE INDEX "order_refunds_updated_at_idx" ON "order_refunds" USING btree ("updated_at");
  CREATE INDEX "order_refunds_created_at_idx" ON "order_refunds" USING btree ("created_at");
  CREATE INDEX "orders_returns_items_order_idx" ON "orders_returns_items" USING btree ("_order");
  CREATE INDEX "orders_returns_items_parent_id_idx" ON "orders_returns_items" USING btree ("_parent_id");
  CREATE INDEX "orders_returns_order_idx" ON "orders_returns" USING btree ("_order");
  CREATE INDEX "orders_returns_parent_id_idx" ON "orders_returns" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_order_refunds_fk" FOREIGN KEY ("order_refunds_id") REFERENCES "public"."order_refunds"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_order_refunds_id_idx" ON "payload_locked_documents_rels" USING btree ("order_refunds_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "order_refunds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_returns_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_returns" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_order_refunds_fk";
  DROP TABLE "order_refunds" CASCADE;
  DROP TABLE "orders_returns_items" CASCADE;
  DROP TABLE "orders_returns" CASCADE;

  DROP INDEX "payload_locked_documents_rels_order_refunds_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "order_refunds_id";
  DROP TYPE "public"."enum_order_refunds_status";`)
}
