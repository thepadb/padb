// "Load more" paging over the API's forward cursors, shared by the browse tree and the Parks list
import { type RefObject, useEffect, useState } from 'react';

/** One page of records and the cursor for the next; `next` is null on the last page. */
export type Page<T> = { items: Array<T>; next: string | null };

/** True once React has taken over the server's markup, so buttons do something when pressed. */
export function useHydrated() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return hydrated;
}

/**
 * Records from a first page the server rendered, with `load` to append the next. `fetchPage` gives null when a page
 * cannot be fetched, which leaves `failed` set until a try succeeds. When the last page arrives, focus moves to the
 * first link it brought in `list`, since the button that had it goes.
 */
export function usePages<T extends { id: string }>({
    firstPage,
    fetchPage,
    list,
    announce,
}: {
    firstPage: Page<T> | null;
    fetchPage: (after: string | undefined) => Promise<Page<T> | null>;
    list: RefObject<HTMLElement | null>;
    announce: (count: number) => string;
}) {
    const [items, setItems] = useState(firstPage?.items ?? []);
    // The page `load` asks for: a cursor, undefined for the first page, or null once all are in
    const [cursor, setCursor] = useState<string | null | undefined>(firstPage ? firstPage.next : undefined);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(firstPage === null);
    const [announcement, setAnnouncement] = useState('');

    async function load() {
        if (cursor === null || loading) return;
        setLoading(true);
        const page = await fetchPage(cursor).catch(() => null);
        setLoading(false);
        setFailed(page === null);
        if (!page) return;
        const shown = items.length;
        setItems(previous => [...previous, ...page.items.filter(item => !previous.some(p => p.id === item.id))]);
        setCursor(page.next);
        setAnnouncement(announce(page.items.length));
        if (!page.next) {
            requestAnimationFrame(() => list.current?.querySelectorAll('a')[shown]?.focus());
        }
    }

    return { items, hasMore: cursor !== null, loading, failed, announcement, load };
}
