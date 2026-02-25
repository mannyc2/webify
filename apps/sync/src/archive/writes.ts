// Pure write-mapping + materialization for archive-batch handler

import { eq, sql } from "drizzle-orm";
import type { Database } from "@webify/db";
import { waybackSnapshots, waybackProductData, archiveImportJobs } from "@webify/db";
import type { WriteOp } from "@webify/db/batch";

// ---------------------------------------------------------------------------
// Layer 1: Pure data mapping (no db, no Drizzle)
// ---------------------------------------------------------------------------

export interface ArchiveFetchResult {
  snapId: number;
  status: "fetched" | "failed" | "skipped";
  fetchedAt: string;
  error?: string;
  data?: {
    storeDomain: string;
    handle: string;
    capturedAt: string;
    title: string | null;
    vendor: string | null;
    productType: string | null;
    extractionStrategy: string;
    variantsJson: string;
    imagesJson: string;
    videosJson: string;
    rawPrice: string | null;
  };
}

export interface ArchiveWriteOps {
  snapshotUpdates: {
    id: number;
    fetchStatus: "fetched" | "failed" | "skipped";
    fetchedAt: string;
    fetchError: string | null;
  }[];
  productDataInserts: {
    snapshotId: number;
    storeDomain: string;
    handle: string;
    capturedAt: string;
    title: string | null;
    vendor: string | null;
    productType: string | null;
    extractionStrategy: string;
    variantsJson: string;
    imagesJson: string;
    videosJson: string;
    rawPrice: string | null;
  }[];
  jobCounterIncrement: { jobId: string; fetched: number; failed: number } | null;
}

export function archiveFetchResultsToWriteOps(
  results: ArchiveFetchResult[],
  jobId: string,
): ArchiveWriteOps {
  const snapshotUpdates: ArchiveWriteOps["snapshotUpdates"] = [];
  const productDataInserts: ArchiveWriteOps["productDataInserts"] = [];
  let fetched = 0;
  let failed = 0;

  for (const r of results) {
    snapshotUpdates.push({
      id: r.snapId,
      fetchStatus: r.status,
      fetchedAt: r.fetchedAt,
      fetchError: r.error ?? null,
    });

    if (r.status === "fetched" && r.data) {
      productDataInserts.push({
        snapshotId: r.snapId,
        ...r.data,
      });
      fetched++;
    } else if (r.status === "failed") {
      failed++;
    } else {
      // skipped counts as fetched for progress tracking
      fetched++;
    }
  }

  return {
    snapshotUpdates,
    productDataInserts,
    jobCounterIncrement:
      fetched > 0 || failed > 0
        ? { jobId, fetched, failed }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Layer 2: Materialize (thin, needs db)
// ---------------------------------------------------------------------------

export function materializeArchiveWrites(db: Database, ops: ArchiveWriteOps): WriteOp[] {
  const writes: WriteOp[] = [];

  for (const su of ops.snapshotUpdates) {
    writes.push(
      db
        .update(waybackSnapshots)
        .set({
          fetchStatus: su.fetchStatus,
          fetchedAt: su.fetchedAt,
          fetchError: su.fetchError,
        })
        .where(eq(waybackSnapshots.id, su.id)),
    );
  }

  for (const pd of ops.productDataInserts) {
    writes.push(db.insert(waybackProductData).values(pd));
  }

  if (ops.jobCounterIncrement) {
    const { jobId, fetched, failed } = ops.jobCounterIncrement;
    writes.push(
      db
        .update(archiveImportJobs)
        .set({
          fetchedSnapshots: sql`${archiveImportJobs.fetchedSnapshots} + ${fetched}`,
          failedSnapshots: sql`${archiveImportJobs.failedSnapshots} + ${failed}`,
        })
        .where(eq(archiveImportJobs.id, jobId)),
    );
  }

  return writes;
}
