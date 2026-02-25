CREATE TABLE `archive_import_jobs` (
	`id` text PRIMARY KEY,
	`store_domain` text NOT NULL,
	`status` text DEFAULT 'discovering' NOT NULL,
	`total_snapshots` integer DEFAULT 0 NOT NULL,
	`fetched_snapshots` integer DEFAULT 0 NOT NULL,
	`failed_snapshots` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	CONSTRAINT `fk_archive_import_jobs_store_domain_stores_domain_fk` FOREIGN KEY (`store_domain`) REFERENCES `stores`(`domain`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `product_videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`product_id` integer NOT NULL,
	`src` text NOT NULL,
	`format` text DEFAULT 'unknown' NOT NULL,
	`height` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`alt` text,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`is_removed` integer DEFAULT false NOT NULL,
	`removed_at` text,
	`source` text DEFAULT 'live_scrape' NOT NULL,
	`wayback_timestamp` text,
	CONSTRAINT `fk_product_videos_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `scrape_state` (
	`product_id` integer PRIMARY KEY,
	`last_scraped_at` text,
	`scrape_strategy` text,
	`scrape_status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`video_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `fk_scrape_state_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `wayback_product_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`snapshot_id` integer NOT NULL,
	`store_domain` text NOT NULL,
	`handle` text NOT NULL,
	`title` text,
	`vendor` text,
	`product_type` text,
	`extraction_strategy` text,
	`variants_json` text,
	`images_json` text,
	`videos_json` text,
	`raw_price` text,
	`captured_at` text NOT NULL,
	CONSTRAINT `fk_wayback_product_data_snapshot_id_wayback_snapshots_id_fk` FOREIGN KEY (`snapshot_id`) REFERENCES `wayback_snapshots`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_wayback_product_data_store_domain_stores_domain_fk` FOREIGN KEY (`store_domain`) REFERENCES `stores`(`domain`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `wayback_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`store_domain` text NOT NULL,
	`url` text NOT NULL,
	`handle` text NOT NULL,
	`timestamp` text NOT NULL,
	`digest` text NOT NULL,
	`status_code` integer NOT NULL,
	`mime_type` text NOT NULL,
	`length` integer DEFAULT 0 NOT NULL,
	`fetch_status` text DEFAULT 'pending' NOT NULL,
	`fetched_at` text,
	`fetch_error` text,
	CONSTRAINT `fk_wayback_snapshots_store_domain_stores_domain_fk` FOREIGN KEY (`store_domain`) REFERENCES `stores`(`domain`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `idx_aij_store` ON `archive_import_jobs` (`store_domain`);--> statement-breakpoint
CREATE INDEX `idx_aij_status` ON `archive_import_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_videos_product` ON `product_videos` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_videos_product_active` ON `product_videos` (`product_id`,`is_removed`);--> statement-breakpoint
CREATE INDEX `idx_videos_src` ON `product_videos` (`src`);--> statement-breakpoint
CREATE INDEX `idx_videos_first_seen` ON `product_videos` (`first_seen_at`);--> statement-breakpoint
CREATE INDEX `idx_wpd_snapshot` ON `wayback_product_data` (`snapshot_id`);--> statement-breakpoint
CREATE INDEX `idx_wpd_store` ON `wayback_product_data` (`store_domain`);--> statement-breakpoint
CREATE INDEX `idx_wpd_handle` ON `wayback_product_data` (`handle`);--> statement-breakpoint
CREATE INDEX `idx_wpd_captured` ON `wayback_product_data` (`captured_at`);--> statement-breakpoint
CREATE INDEX `idx_wayback_store` ON `wayback_snapshots` (`store_domain`);--> statement-breakpoint
CREATE INDEX `idx_wayback_handle` ON `wayback_snapshots` (`handle`);--> statement-breakpoint
CREATE INDEX `idx_wayback_digest` ON `wayback_snapshots` (`digest`);--> statement-breakpoint
CREATE INDEX `idx_wayback_fetch_status` ON `wayback_snapshots` (`fetch_status`);--> statement-breakpoint
CREATE INDEX `idx_wayback_store_handle` ON `wayback_snapshots` (`store_domain`,`handle`);