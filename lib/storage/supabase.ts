import { DocumentModel, BlockModel } from '@/types/document';
import { createClient } from '@/lib/supabase/client';

/**
 * Cloud persistence for documents, backed by the `documents` table:
 *   id uuid pk · user_id uuid (default auth.uid()) · title text
 *   content jsonb (full DocumentModel) · page_count int (generated)
 *   created_at / updated_at timestamptz
 *
 * RLS restricts rows to their owner (admins can additionally read all rows),
 * so no user_id filtering is needed client-side.
 */

/** Lightweight row for the home-page grid — avoids downloading full documents. */
export type DocumentSummary = {
  id: string;
  title: string;
  updatedAt: string;
  pageCount: number;
  firstPageBlocks: BlockModel[];
};

type SummaryRow = {
  id: string;
  title: string;
  updated_at: string;
  page_count: number;
  first_page_blocks: BlockModel[] | null;
};

export async function listDocumentSummaries(): Promise<DocumentSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, updated_at, page_count, first_page_blocks:content->pages->0->blocks')
    .order('updated_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as SummaryRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
    pageCount: row.page_count,
    firstPageBlocks: row.first_page_blocks ?? [],
  }));
}

export async function loadDocumentById(id: string): Promise<DocumentModel | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('documents')
    .select('content')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.content as DocumentModel) : null;
}

/** Upsert a document. user_id defaults to auth.uid() server-side. */
export async function saveDocument(doc: DocumentModel): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('documents').upsert({
    id: doc.id,
    title: doc.title,
    content: doc,
    updated_at: doc.updatedAt,
  });
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

// ── Image uploads ────────────────────────────────────────────────────────────

const IMAGE_BUCKET = 'doc-images';

/**
 * Upload an image to storage and return its public URL, so document JSON
 * stores a short URL instead of a multi-MB base64 data URL. Files live under
 * a per-user folder; writes are restricted to the owner by storage RLS.
 */
export async function uploadImage(file: File): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error('Not signed in');

  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || 'image/png' });
  if (error) throw error;

  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── One-time migration of pre-cloud localStorage documents ──────────────────

const MIGRATED_FLAG = 'mvp-docs-migrated-to-cloud';

/**
 * Uploads any documents left over from the localStorage era to the cloud,
 * once per browser. Local copies are kept as a fallback until the flag is set.
 */
export async function migrateLocalDocsToCloud(): Promise<number> {
  if (typeof localStorage === 'undefined') return 0;
  if (localStorage.getItem(MIGRATED_FLAG)) return 0;

  const { loadAllDocuments, migrateLegacyDocument } = await import('./localStorage');
  migrateLegacyDocument();
  const localDocs = loadAllDocuments();

  let migrated = 0;
  for (const doc of localDocs) {
    await saveDocument(doc);
    migrated++;
  }
  localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
  return migrated;
}
