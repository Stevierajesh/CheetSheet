import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type DocRow = {
  id: string;
  user_id: string;
  title: string;
  page_count: number;
  created_at: string;
  updated_at: string;
};

type AuditRow = {
  id: number;
  user_id: string | null;
  document_id: string | null;
  action: 'created' | 'edited' | 'deleted';
  doc_title: string | null;
  created_at: string;
};

type DayCount = { day: string; count: number };

type UsageStats = {
  total_users: number;
  total_documents: number;
  total_pages: number;
  active_users_7d: number;
  docs_created_14d: DayCount[];
  edit_events_14d: DayCount[];
  content_bytes_by_user: Record<string, number>;
  storage_bytes_by_user: Record<string, number>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Last 14 days as YYYY-MM-DD, oldest first, with zero-filled counts. */
function fillDays(counts: DayCount[]): DayCount[] {
  const byDay = new Map(counts.map((c) => [c.day, c.count]));
  const days: DayCount[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return days;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

/** Single-series 14-day mini bar chart (server-rendered SVG, native tooltips). */
function ActivityBars({ title, days }: { title: string; days: DayCount[] }) {
  const width = 252;
  const height = 72;
  const barGap = 2;
  const barWidth = (width - barGap * (days.length - 1)) / days.length;
  const max = Math.max(1, ...days.map((d) => d.count));
  const peak = days.reduce((a, b) => (b.count > a.count ? b : a), days[0]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex-1 min-w-[220px]">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        {peak.count > 0 && (
          <p className="text-xs text-gray-400 tabular-nums">peak {peak.count}</p>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[72px]"
        role="img"
        aria-label={`${title}, last 14 days`}
      >
        <line x1="0" y1={height - 0.5} x2={width} y2={height - 0.5} stroke="#e5e7eb" />
        {days.map((d, i) => {
          const h = d.count === 0 ? 0 : Math.max(3, (d.count / max) * (height - 10));
          return (
            <rect
              key={d.day}
              x={i * (barWidth + barGap)}
              y={height - 1 - h}
              width={barWidth}
              height={h}
              rx={2}
              fill="#2563eb"
            >
              <title>{`${d.day}: ${d.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{days[0].day.slice(5)}</span>
        <span className="text-[10px] text-gray-400">{days[days.length - 1].day.slice(5)}</span>
      </div>
      <details className="mt-1">
        <summary className="text-[10px] text-gray-400 cursor-pointer">data table</summary>
        <table className="text-[10px] text-gray-500 mt-1 w-full">
          <tbody>
            {days.filter((d) => d.count > 0).map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td className="text-right tabular-nums">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

const ACTION_LABEL = { created: 'created', edited: 'edited', deleted: 'deleted' } as const;
const ACTION_COLOR = {
  created: 'text-green-600',
  edited: 'text-blue-600',
  deleted: 'text-red-500',
} as const;

export default async function AdminPage() {
  // proxy.ts already gates /admin, but verify again server-side
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const role = (data?.claims?.app_metadata as { role?: string } | undefined)?.role;
  if (role !== 'admin') redirect('/');

  const admin = createAdminClient();
  const [usersRes, docsRes, statsRes, auditRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from('documents')
      .select('id, user_id, title, page_count, created_at, updated_at')
      .order('updated_at', { ascending: false }),
    admin.rpc('admin_usage_stats'),
    admin
      .from('audit_events')
      .select('id, user_id, document_id, action, doc_title, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const firstError = usersRes.error ?? docsRes.error ?? statsRes.error ?? auditRes.error;
  if (firstError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-red-500">
        Failed to load admin data: {firstError.message}
      </div>
    );
  }

  const docs = (docsRes.data ?? []) as DocRow[];
  const stats = statsRes.data as UsageStats;
  const audit = (auditRes.data ?? []) as AuditRow[];

  const docsByUser = new Map<string, DocRow[]>();
  for (const doc of docs) {
    const list = docsByUser.get(doc.user_id) ?? [];
    list.push(doc);
    docsByUser.set(doc.user_id, list);
  }

  const users = (usersRes.data?.users ?? []).slice().sort((a, b) => {
    const aLatest = docsByUser.get(a.id)?.[0]?.updated_at ?? a.created_at;
    const bLatest = docsByUser.get(b.id)?.[0]?.updated_at ?? b.created_at;
    return bLatest < aLatest ? -1 : 1;
  });
  const emailById = new Map(users.map((u) => [u.id, u.email ?? u.id]));

  const totalStorage = Object.values(stats.storage_bytes_by_user).reduce((a, b) => a + b, 0);
  const totalContent = Object.values(stats.content_bytes_by_user).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600">
              CheetSheet
            </Link>
            <span className="text-xs font-medium text-white bg-gray-800 rounded px-2 py-0.5">
              Admin
            </span>
          </div>
          <p className="text-sm text-gray-400">read-only observability</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Usage metrics */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Usage</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <StatTile label="accounts" value={String(stats.total_users)} />
            <StatTile
              label="documents / pages"
              value={`${stats.total_documents} / ${stats.total_pages}`}
            />
            <StatTile label="active users, last 7 days" value={String(stats.active_users_7d)} />
            <StatTile
              label="stored (documents + images)"
              value={formatBytes(totalContent + totalStorage)}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <ActivityBars title="Documents created, last 14 days" days={fillDays(stats.docs_created_14d)} />
            <ActivityBars title="Edit sessions, last 14 days" days={fillDays(stats.edit_events_14d)} />
          </div>
        </section>

        {/* Audit trail */}
        <section>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Recent activity</h2>
          {audit.length === 0 ? (
            <p className="text-xs text-gray-300 border border-dashed border-gray-200 rounded-lg px-4 py-3">
              No activity yet
            </p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {audit.map((event) => (
                <div key={event.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                  <span className={`text-xs font-medium w-14 shrink-0 ${ACTION_COLOR[event.action]}`}>
                    {ACTION_LABEL[event.action]}
                  </span>
                  <span className="text-gray-800 truncate">
                    {event.doc_title || 'Untitled Document'}
                  </span>
                  <span className="text-xs text-gray-400 truncate">
                    {event.user_id ? emailById.get(event.user_id) ?? event.user_id : 'unknown'}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {formatDate(event.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Accounts */}
        <section className="space-y-8">
          <h2 className="text-sm font-semibold text-gray-800 -mb-4">Accounts</h2>
          {users.map((user) => {
            const userDocs = docsByUser.get(user.id) ?? [];
            const contentBytes = stats.content_bytes_by_user[user.id] ?? 0;
            const storageBytes = stats.storage_bytes_by_user[user.id] ?? 0;
            return (
              <section key={user.id}>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {user.email ?? user.id}
                    {(user.app_metadata as { role?: string })?.role === 'admin' && (
                      <span className="ml-2 text-xs font-normal text-amber-600">superuser</span>
                    )}
                  </h3>
                  <span className="text-xs text-gray-400">
                    joined {new Date(user.created_at).toLocaleDateString()}
                    {user.last_sign_in_at &&
                      ` · last sign-in ${new Date(user.last_sign_in_at).toLocaleDateString()}`}
                    {` · ${userDocs.length} document${userDocs.length === 1 ? '' : 's'}`}
                    {` · ${formatBytes(contentBytes + storageBytes)}`}
                  </span>
                </div>

                {userDocs.length === 0 ? (
                  <p className="text-xs text-gray-300 border border-dashed border-gray-200 rounded-lg px-4 py-3">
                    No documents
                  </p>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {userDocs.map((doc) => (
                      <div key={doc.id} className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">
                            {doc.title || 'Untitled Document'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {doc.page_count} page{doc.page_count === 1 ? '' : 's'} · created{' '}
                            {formatDate(doc.created_at)}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          edited {formatDate(doc.updated_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </section>
      </main>
    </div>
  );
}
