import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { sourceCodeLink } from '../lib/source-code';

const sourceCode = sourceCodeLink(import.meta.env.VITE_COMMIT_SHA);

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'Parks & Attractions Database' },
        ],
    }),
    component: RootDocument,
    notFoundComponent: NotFound,
});

function RootDocument() {
    return (
        <html lang="en-GB">
            <head>
                <HeadContent />
            </head>
            <body>
                <Outlet />
                <footer>
                    <a href={sourceCode.href}>{sourceCode.label}</a>
                </footer>
                <Scripts />
            </body>
        </html>
    );
}

function NotFound() {
    return (
        <main>
            <h1>Not found</h1>
            <p>There is nothing at this address. The link may be wrong.</p>
        </main>
    );
}
