CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "testimonials_name_unique" UNIQUE("name"),
	CONSTRAINT "testimonials_rating_check" CHECK ("testimonials"."rating" between 1 and 5)
);
