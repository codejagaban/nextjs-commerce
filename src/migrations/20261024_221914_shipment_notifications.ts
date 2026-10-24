import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_shipment_notifications_kind" AS ENUM('shipped', 'tracking', 'delivered');
  CREATE TYPE "public"."enum_shipment_notifications_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'skipped');
  CREATE TABLE "shipment_notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" integer NOT NULL,
  	"shipment_i_d" varchar NOT NULL,
  	"event_key" varchar NOT NULL,
  	"kind" "enum_shipment_notifications_kind" NOT NULL,
  	"status" "enum_shipment_notifications_status" DEFAULT 'pending' NOT NULL,
  	"sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "shipment_notifications_id" integer;
  ALTER TABLE "shipment_notifications" ADD CONSTRAINT "shipment_notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "shipment_notifications_order_idx" ON "shipment_notifications" USING btree ("order_id");
  CREATE UNIQUE INDEX "shipment_notifications_event_key_idx" ON "shipment_notifications" USING btree ("event_key");
  CREATE INDEX "shipment_notifications_updated_at_idx" ON "shipment_notifications" USING btree ("updated_at");
  CREATE INDEX "shipment_notifications_created_at_idx" ON "shipment_notifications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_shipment_notifications_fk" FOREIGN KEY ("shipment_notifications_id") REFERENCES "public"."shipment_notifications"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_shipment_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("shipment_notifications_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "shipment_notifications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "shipment_notifications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_shipment_notifications_fk";
  
  DROP INDEX "payload_locked_documents_rels_shipment_notifications_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "shipment_notifications_id";
  DROP TYPE "public"."enum_shipment_notifications_kind";
  DROP TYPE "public"."enum_shipment_notifications_status";`)
}
