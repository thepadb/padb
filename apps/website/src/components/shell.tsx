import { Link } from '@tanstack/react-router';
import type * as React from 'react';
import { sourceCodeLink } from '@/lib/source-code';

const sourceCode = sourceCodeLink(import.meta.env.VITE_COMMIT_SHA);

/** The frame of every page: header, the sheet the page fills, and the footer. */
export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <a
                href="#content"
                className="sr-only rounded-md bg-card px-3 py-2 font-medium text-primary focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
            >
                Skip to content
            </a>
            <Header />
            {/* The browse tree joins this row beside the sheet (#47) */}
            <div className="flex-1 p-2 sm:p-4">
                <main id="content" tabIndex={-1} className="rounded-lg border bg-card px-4 py-5 sm:px-8 sm:py-7">
                    {children}
                </main>
            </div>
            <Footer />
        </div>
    );
}

function Header() {
    return (
        <header className="border-b bg-card">
            <div className="flex h-12 items-center justify-between gap-6 px-4">
                <Link to="/" className="rounded-sm font-semibold">
                    PADB
                </Link>
                <nav aria-label="Main" className="flex gap-1 text-sm">
                    <Link
                        to="/parks"
                        className="rounded-md px-2.5 py-1 hover:bg-muted [&.active]:bg-secondary [&.active]:text-secondary-foreground"
                    >
                        Parks
                    </Link>
                </nav>
            </div>
        </header>
    );
}

function Footer() {
    return (
        <footer className="border-t bg-card">
            <div className="flex flex-wrap justify-between gap-4 px-4 py-3 text-xs text-muted-foreground">
                <span>Data ODbL 1.0, code AGPL-3.0.</span>
                {/* See ADR 0011 */}
                <a href={sourceCode.href} className="underline underline-offset-2 hover:text-foreground">
                    {sourceCode.label}
                </a>
            </div>
        </footer>
    );
}
