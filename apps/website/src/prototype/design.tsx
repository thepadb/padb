// PROTOTYPE (issue #41): which design and theme are showing, from ?design= and ?theme=, kept across links.
import { useNavigate, useSearch } from '@tanstack/react-router';
import type * as React from 'react';
import { useEffect } from 'react';

export const DESIGNS = [
    { key: 'A', name: 'Wayfinding' },
    { key: 'B', name: 'Register' },
    { key: 'C', name: 'Midway' },
    { key: 'D', name: 'Register II' },
    { key: 'E', name: 'Chronicle' },
    { key: 'F', name: 'Workbench' },
] as const;
export type Design = (typeof DESIGNS)[number]['key'];
export type Theme = 'light' | 'dark';
export type DesignSearch = { design?: Design; theme?: Theme };

export function validateDesignSearch(search: Record<string, unknown>): DesignSearch {
    const design = DESIGNS.find(d => d.key === search.design)?.key;
    return { ...(design && { design }), ...(search.theme === 'dark' && { theme: 'dark' as const }) };
}

export function useDesign(): { design: Design; theme: Theme } {
    const search = useSearch({ strict: false }) as DesignSearch;
    return { design: search.design ?? 'A', theme: search.theme ?? 'light' };
}

/** Renders the current design's version of a page. */
export function ByDesign(props: Record<Design, () => React.ReactNode>) {
    const { design } = useDesign();
    return <>{props[design]()}</>;
}

const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement
    && (target.isContentEditable
        || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        || target.role === 'combobox');

/** ←/→ cycle designs, `d` toggles dark mode; a pill shows both. Dev only. */
export function DesignSwitcher() {
    const { design, theme } = useDesign();
    const navigate = useNavigate();
    const index = DESIGNS.findIndex(d => d.key === design);

    const go = (step: number) => {
        const next = DESIGNS[(index + step + DESIGNS.length) % DESIGNS.length].key;
        navigate({ to: '.', search: (prev: DesignSearch) => ({ ...prev, design: next }), replace: true });
    };
    const toggleTheme = () =>
        navigate({
            to: '.',
            search: (prev: DesignSearch) => ({ ...prev, theme: theme === 'dark' ? undefined : ('dark' as const) }),
            replace: true,
        });

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
                return;
            }
            if (event.key === 'ArrowLeft') go(-1);
            else if (event.key === 'ArrowRight') go(1);
            else if (event.key === 'd') toggleTheme();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!import.meta.env.DEV) {
        return null;
    }
    const button = 'rounded-full px-3 py-1 hover:bg-white/15';
    return (
        <div className="fixed bottom-20 left-1/2 lg:bottom-4 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-neutral-950 px-1.5 py-1 font-mono text-xs text-white shadow-2xl ring-1 ring-white/20 [font-family:ui-monospace,monospace]">
            <button type="button" className={button} onClick={() => go(-1)} aria-label="Previous design">
                ←
            </button>
            <span className="px-2">
                <b>{design}</b> {DESIGNS[index].name} · {theme}
            </span>
            <button type="button" className={button} onClick={() => go(1)} aria-label="Next design">
                →
            </button>
            <button type="button" className={button} onClick={toggleTheme} aria-label="Toggle dark mode">
                d
            </button>
        </div>
    );
}
