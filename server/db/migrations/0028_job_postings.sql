CREATE TABLE "job_postings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"closed_at" timestamp with time zone,
	"draft" jsonb NOT NULL,
	"published" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_postings_slug_unique" UNIQUE("slug"),
	CONSTRAINT "job_postings_slug_format" CHECK ("job_postings"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;