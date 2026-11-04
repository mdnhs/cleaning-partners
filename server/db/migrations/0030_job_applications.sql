CREATE TYPE "public"."application_status" AS ENUM('new', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected', 'spam');--> statement-breakpoint
CREATE TABLE "job_application_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"type" text NOT NULL,
	"body" text,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid,
	"job_title" text,
	"job_reference" text,
	"first_name" text NOT NULL,
	"surname" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"town" text NOT NULL,
	"eircode" text,
	"answers" jsonb NOT NULL,
	"note" text,
	"heard_about" text,
	"declaration" boolean NOT NULL,
	"privacy_consent" boolean NOT NULL,
	"keep_on_file" boolean DEFAULT false NOT NULL,
	"cv_key" text,
	"cv_driver" text,
	"cv_name" text,
	"cv_mime" text,
	"cv_size" integer,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"assignee_id" uuid,
	"source_page" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_application_events" ADD CONSTRAINT "job_application_events_application_id_job_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_application_events" ADD CONSTRAINT "job_application_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_job_postings_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job_postings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_application_events_application_id_idx" ON "job_application_events" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "job_applications_created_at_idx" ON "job_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "job_applications_status_idx" ON "job_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_applications_job_id_idx" ON "job_applications" USING btree ("job_id");