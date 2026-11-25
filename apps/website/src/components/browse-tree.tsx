// The browse tree beside the sheet. For now it has one level, Parks; Country, Destination and Ride
// levels join with their own specs. See docs/agents/design.md and ADR 0009
import type { Park } from '@padb/api-client';
import { Link, useMatch } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { LoaderIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { parkParam } from '@/lib/park';

type TreePark = Pick<Park, 'id' | 'name'>;

/** A page of the tree's Parks: only what the tree shows, and the cursor for the next page. */
export type TreePage = { parks: Array<TreePark>; next: string | null };

/** A page of the tree's Parks, oldest first; null when the API cannot give one, so the tree never takes a page down. */
export const getTreeParks = createServerFn({ method: 'GET' })
    .validator((after: string | undefined) => after)
    .handler(async ({ data: after }): Promise<TreePage | null> => {
        try {
            const { data } = await api.GET('/v1/parks', { params: { query: { after } } });
            return data ? { parks: data.parks.map(({ id, name }) => ({ id, name })), next: data.next } : null;
        } catch {
            return null;
        }
    });

const treeRow =
    'flex min-w-0 items-center rounded-md px-2 py-1 text-sm hover:bg-muted aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground';

/** The Park on the sheet, from its page's loader, so the tree needs no fetch of its own to show it. */
function useViewedPark(): TreePark | undefined {
    const match = useMatch({ from: '/parks/$park', shouldThrow: false });
    return match?.loaderData ? { id: match.loaderData.id, name: match.loaderData.name } : undefined;
}

/** True once React has taken over the server's markup, so buttons do something when pressed. */
function useHydrated() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    return hydrated;
}

/** The tree, starting from the first page of Parks, which the server renders with the page. */
export function BrowseTree({ firstPage }: { firstPage: TreePage | null }) {
    const [parks, setParks] = useState(firstPage?.parks ?? []);
    // The page the button asks for: a cursor, undefined for the first page, or null once all are in
    const [cursor, setCursor] = useState<string | null | undefined>(firstPage ? firstPage.next : undefined);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(firstPage === null);
    const [announcement, setAnnouncement] = useState('');
    const list = useRef<HTMLUListElement>(null);
    const hydrated = useHydrated();
    const viewed = useViewedPark();
    // Parks come oldest first, so one not loaded yet belongs after the gap "Load more" fills
    const pinned = viewed && !parks.some(park => park.id === viewed.id) ? viewed : undefined;

    async function load() {
        if (cursor === null || loading) return;
        setLoading(true);
        const page = await getTreeParks({ data: cursor }).catch(() => null);
        setLoading(false);
        setFailed(page === null);
        if (!page) return;
        const shown = parks.length;
        setParks(previous => [...previous, ...page.parks.filter(park => !previous.some(p => p.id === park.id))]);
        setCursor(page.next);
        setAnnouncement(`${page.parks.length} more Parks loaded.`);
        // The button goes with the last page, so focus moves to the first Park it brought
        if (!page.next) {
            requestAnimationFrame(() => list.current?.querySelectorAll('a')[shown]?.focus());
        }
    }

    const row = (park: TreePark) => (
        <li key={park.id}>
            <Link
                to="/parks/$park"
                params={{ park: parkParam(park) }}
                // Matched by ID, so a link without the slug still highlights its Park
                aria-current={park.id === viewed?.id ? 'page' : undefined}
                // Ours, not TanStack's: no `active` class, and its own `aria-current` only on an exact match
                activeProps={{}}
                activeOptions={{ exact: true }}
                className={treeRow}
            >
                <span className="truncate">{park.name}</span>
            </Link>
        </li>
    );

    return (
        <nav aria-label="Browse" className="p-3 text-sm">
            <ul aria-label="Parks" ref={list} className="space-y-px">
                {parks.map(row)}
                {pinned && (
                    <>
                        <li aria-hidden="true" className="px-2 text-muted-foreground">
                            ⋯
                        </li>
                        {row(pinned)}
                    </>
                )}
            </ul>
            {parks.length === 0 && cursor === null && <p className="px-2 py-1 text-muted-foreground">No Parks yet.</p>}
            <p role="status" className={failed ? 'px-2 py-1 text-destructive' : 'sr-only'}>
                {failed ? 'Parks could not be loaded.' : announcement}
            </p>
            {/* Only once hydrated: pressed before then, it would do nothing */}
            {hydrated && cursor !== null && (
                <button
                    type="button"
                    onClick={load}
                    // Not `disabled`, which would drop focus while the page loads
                    aria-disabled={loading}
                    className="mt-1 flex items-center gap-2 rounded-md px-2 py-1 text-primary hover:bg-muted aria-disabled:text-muted-foreground"
                >
                    {loading && <LoaderIcon aria-hidden="true" className="size-3.5 animate-spin" />}
                    {failed ? 'Try again' : 'Load more'}
                </button>
            )}
        </nav>
    );
}
