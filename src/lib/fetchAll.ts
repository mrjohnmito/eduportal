/**
 * Pagination helpers for reading large tables.
 *
 * The backend Data API caps a single response at 1,000 rows, so any query that
 * can return more must be paged. `fetchAllRows` transparently walks the pages
 * until the table is exhausted (or `maxRows` is reached).
 */

export const RECORD_FETCH_LIMIT = 200_000_000;
export const PAGE_SIZE = 1000;

type QueryBuilder<T> = {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>;
};

/**
 * @param buildQuery must return a FRESH query builder on every call
 * (Supabase builders are single-use).
 */
export async function fetchAllRows<T = any>(
  buildQuery: () => QueryBuilder<T>,
  options: { pageSize?: number; maxRows?: number } = {}
): Promise<{ data: T[]; error: any }> {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const maxRows = options.maxRows ?? RECORD_FETCH_LIMIT;

  const all: T[] = [];
  let offset = 0;

  while (offset < maxRows) {
    const size = Math.min(pageSize, maxRows - offset);
    const { data, error } = await buildQuery().range(offset, offset + size - 1);

    if (error) return { data: all, error };

    const rows = data || [];
    all.push(...rows);

    if (rows.length < size) break;
    offset += rows.length;
  }

  return { data: all, error: null };
}
