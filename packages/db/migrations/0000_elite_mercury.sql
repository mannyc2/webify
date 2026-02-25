CREATE TABLE `change_events` (
	`id` text PRIMARY KEY NOT NULL,
	`store_domain` text NOT NULL,
	`occurred_at` text NOT NULL,
	`change_type` text NOT NULL,
	`magnitude` text DEFAULT 'medium' NOT NULL,
	`product_title` text NOT NULL,
	`variant_title` text,
	`old_value` text,
	`new_value` text,
	`price_change` text,
	`is_read` integer DEFAULT false NOT NULL,
	`product_shopify_id` integer,
	`user_id` text,
	FOREIGN KEY (`store_domain`) REFERENCES `stores`(`domain`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_events_store` ON `change_events` (`store_domain`);--> statement-breakpoint
CREATE INDEX `idx_events_occurred` ON `change_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_events_type` ON `change_events` (`change_type`);--> statement-breakpoint
CREATE INDEX `idx_events_unread` ON `change_events` (`is_read`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_events_product` ON `change_events` (`product_shopify_id`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`url` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`is_removed` integer DEFAULT false NOT NULL,
	`removed_at` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_images_product` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_images_product_active` ON `product_images` (`product_id`,`is_removed`);--> statement-breakpoint
CREATE INDEX `idx_images_first_seen` ON `product_images` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `idx_images_url` ON `product_images` (`url`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY NOT NULL,
	`store_domain` text NOT NULL,
	`handle` text NOT NULL,
	`title` text NOT NULL,
	`vendor` text,
	`product_type` text,
	`first_seen_at` text NOT NULL,
	`is_removed` integer DEFAULT false NOT NULL,
	`shopify_created_at` text,
	`shopify_published_at` text,
	`shopify_updated_at` text,
	`cached_price` text DEFAULT '0' NOT NULL,
	`cached_is_available` integer DEFAULT false NOT NULL,
	`title_search_key` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`store_domain`) REFERENCES `stores`(`domain`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_products_store` ON `products` (`store_domain`);--> statement-breakpoint
CREATE INDEX `idx_products_store_removed` ON `products` (`store_domain`,`is_removed`);--> statement-breakpoint
CREATE INDEX `idx_products_store_available` ON `products` (`store_domain`,`cached_is_available`);--> statement-breakpoint
CREATE INDEX `idx_products_store_price` ON `products` (`store_domain`,`cached_price`);--> statement-breakpoint
CREATE INDEX `idx_products_store_search` ON `products` (`store_domain`,`title_search_key`);--> statement-breakpoint
CREATE INDEX `idx_products_store_published` ON `products` (`store_domain`,`shopify_published_at`);--> statement-breakpoint
CREATE TABLE `stores` (
	`domain` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`added_at` text NOT NULL,
	`last_fetched_at` text,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`sync_frequency_seconds` integer DEFAULT 900 NOT NULL,
	`cached_product_count` integer DEFAULT 0 NOT NULL,
	`cached_preview_image_urls` text DEFAULT '[]' NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `idx_stores_sync_status` ON `stores` (`sync_status`);--> statement-breakpoint
CREATE TABLE `variant_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variant_id` integer NOT NULL,
	`captured_at` text NOT NULL,
	`price` text NOT NULL,
	`compare_at_price` text,
	`available` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_snapshots_variant` ON `variant_snapshots` (`variant_id`);--> statement-breakpoint
CREATE INDEX `idx_snapshots_captured` ON `variant_snapshots` (`captured_at`);--> statement-breakpoint
CREATE TABLE `variants` (
	`id` integer PRIMARY KEY NOT NULL,
	`product_id` integer NOT NULL,
	`title` text NOT NULL,
	`sku` text,
	`price` text DEFAULT '0' NOT NULL,
	`compare_at_price` text,
	`available` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_variants_product` ON `variants` (`product_id`);