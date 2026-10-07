/**
 * True when the query matches any of the supplied values.
 *
 * Tables pass every field a user might reasonably search on, so searching is
 * not limited to IDs and names:
 *
 *   rows.filter(r => matchesQuery(search, r.id, r.customerName, r.phone, r.status))
 *
 * An empty query matches everything.
 */
export function matchesQuery(query: string, ...values: unknown[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return values.some(value => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.some(v => matchesQuery(q, v));
    return String(value).toLowerCase().includes(q);
  });
}
