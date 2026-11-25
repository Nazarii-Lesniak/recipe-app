CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('user', 'moderator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."recipe_difficulty" AS ENUM('easy', 'medium', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."recipe_visibility" AS ENUM('public', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."recipe_status" AS ENUM('draft', 'active');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."moderation_status" AS ENUM('unreviewed', 'approved', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."moderation_action" AS ENUM('approved', 'hidden', 'restored', 'hard_deleted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."app_locale" AS ENUM('uk', 'en');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."app_theme" AS ENUM('warm-kitchen', 'dark-espresso', 'fresh-matcha', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "username" text UNIQUE,
  "display_username" text,
  "display_name" text,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "preferred_locale" "app_locale" DEFAULT 'uk' NOT NULL,
  "preferred_theme" "app_theme" DEFAULT 'warm-kitchen' NOT NULL,
  "preferred_units" "unit_system" DEFAULT 'metric' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_lower_uidx" ON "users" (lower("username")) WHERE "username" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp with time zone,
  "refresh_token_expires_at" timestamp with time zone,
  "scope" text,
  "password" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "accounts" ("user_id");

CREATE TABLE IF NOT EXISTS "verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications" ("identifier");

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "forked_from_id" uuid REFERENCES "recipes"("id") ON DELETE SET NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "cover_image_url" text,
  "cover_image_key" text,
  "base_servings" integer DEFAULT 4 NOT NULL,
  "prep_time_min" integer DEFAULT 15 NOT NULL,
  "cook_time_min" integer DEFAULT 30 NOT NULL,
  "difficulty" "recipe_difficulty" DEFAULT 'medium' NOT NULL,
  "visibility" "recipe_visibility" DEFAULT 'public' NOT NULL,
  "status" "recipe_status" DEFAULT 'active' NOT NULL,
  "moderation_status" "moderation_status" DEFAULT 'unreviewed' NOT NULL,
  "moderation_note" text,
  "source_url" text,
  "locale" "app_locale" DEFAULT 'uk' NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "recipes_author_id_idx" ON "recipes" ("author_id");
CREATE INDEX IF NOT EXISTS "recipes_catalog_idx" ON "recipes" ("visibility", "status", "moderation_status", "deleted_at", "created_at");
CREATE INDEX IF NOT EXISTS "recipes_title_trgm_idx" ON "recipes" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "recipes_description_trgm_idx" ON "recipes" USING gin ("description" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "recipe_ingredients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "sort_order" integer NOT NULL,
  "group_name" text,
  "name" text NOT NULL,
  "amount" numeric(10, 3),
  "unit" text DEFAULT 'g' NOT NULL,
  "note" text,
  "is_scalable" boolean DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients" ("recipe_id");
CREATE INDEX IF NOT EXISTS "recipe_ingredients_name_trgm_idx" ON "recipe_ingredients" USING gin ("name" gin_trgm_ops);

CREATE TABLE IF NOT EXISTS "recipe_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "step_number" integer NOT NULL,
  "instruction" text NOT NULL,
  "timer_seconds" integer,
  "image_url" text,
  "image_key" text
);

CREATE INDEX IF NOT EXISTS "recipe_steps_recipe_id_idx" ON "recipe_steps" ("recipe_id");

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name_uk" text NOT NULL,
  "name_en" text NOT NULL,
  "icon" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_categories" (
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  PRIMARY KEY ("recipe_id", "category_id")
);

CREATE TABLE IF NOT EXISTS "recipe_tags" (
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("recipe_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "saved_recipes" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "recipe_id" uuid NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
  "saved_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "recipe_id")
);

CREATE TABLE IF NOT EXISTS "moderation_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipe_id" uuid REFERENCES "recipes"("id") ON DELETE SET NULL,
  "moderator_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "action" "moderation_action" NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "moderation_logs_recipe_id_idx" ON "moderation_logs" ("recipe_id");
