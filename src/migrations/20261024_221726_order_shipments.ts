import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "orders_shipments_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order_item_i_d" varchar NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "orders_shipments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"carrier" varchar NOT NULL,
  	"tracking_number" varchar,
  	"tracking_u_r_l" varchar,
  	"shipped_at" timestamp(3) with time zone NOT NULL,
  	"delivered_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "orders_workflow_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"action" varchar NOT NULL,
  	"actor_id" integer NOT NULL,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"request_i_d" varchar NOT NULL,
  	"request_hash" varchar NOT NULL
  );
  
  ALTER TABLE "orders_shipments_items" ADD CONSTRAINT "orders_shipments_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_shipments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_shipments" ADD CONSTRAINT "orders_shipments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_workflow_events" ADD CONSTRAINT "orders_workflow_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_workflow_events" ADD CONSTRAINT "orders_workflow_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_shipments_items_order_idx" ON "orders_shipments_items" USING btree ("_order");
  CREATE INDEX "orders_shipments_items_parent_id_idx" ON "orders_shipments_items" USING btree ("_parent_id");
  CREATE INDEX "orders_shipments_order_idx" ON "orders_shipments" USING btree ("_order");
  CREATE INDEX "orders_shipments_parent_id_idx" ON "orders_shipments" USING btree ("_parent_id");
  CREATE INDEX "orders_workflow_events_order_idx" ON "orders_workflow_events" USING btree ("_order");
  CREATE INDEX "orders_workflow_events_parent_id_idx" ON "orders_workflow_events" USING btree ("_parent_id");
  CREATE INDEX "orders_workflow_events_actor_idx" ON "orders_workflow_events" USING btree ("actor_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "orders_shipments_items" CASCADE;
  DROP TABLE "orders_shipments" CASCADE;
  DROP TABLE "orders_workflow_events" CASCADE;`)
}
