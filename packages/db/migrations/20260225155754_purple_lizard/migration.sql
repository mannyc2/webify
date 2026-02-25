CREATE TABLE `queue_jobs` (
	`id` text PRIMARY KEY,
	`parent_id` text,
	`queue` text NOT NULL,
	`job_type` text NOT NULL,
	`store_domain` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`duration_ms` integer,
	`attempt` integer DEFAULT 1 NOT NULL,
	`items_enqueued` integer,
	`result_summary` text,
	`error` text
);
--> statement-breakpoint
CREATE INDEX `idx_qj_status` ON `queue_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_qj_created` ON `queue_jobs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_qj_parent` ON `queue_jobs` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_qj_store_type` ON `queue_jobs` (`store_domain`,`job_type`);