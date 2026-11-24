import { createRootRoute, HeadContent, Outlet, retainSearchParams, Scripts } from '@tanstack/react-router';
import { sourceCodeLink } from '../lib/source-code';
import { DesignSwitcher, useDesign, validateDesignSearch } from '../prototype/design';
import { designs } from '../prototype/designs';
import appCss from '../styles.css?url';

const sourceCode = sourceCodeLink(import.meta.env.VITE_COMMIT_SHA);

export const Route = createRootRoute({
    // PROTOTYPE (issue #41): ?design= and ?theme= follow every link
    validateSearch: validateDesignSearch,
    search: { middlewares: [retainSearchParams(['design', 'theme'])] },
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            {
                name: 'viewport',
                content: 'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
            },
            { title: 'Parks & Attractions Database' },
        ],
        links: [{ rel: 'stylesheet', href: appCss }],
    }),
    component: RootDocument,
    notFoundComponent: NotFound,
});

function RootDocument() {
    const { design, theme } = useDesign();
    const { Header, Footer } = designs[design];
    return (
        <html lang="en-GB" data-design={design} className={theme === 'dark' ? 'dark' : undefined}>
            <head>
                <HeadContent />
            </head>
            <body className="flex flex-col">
                <Header />
                <div className="flex-1">
                    <Outlet />
                </div>
                <Footer>
                    <a href={sourceCode.href}>{sourceCode.label}</a>
                </Footer>
                <DesignSwitcher />
                <Scripts />
            </body>
        </html>
    );
}

function NotFound() {
    return (
        <main className="mx-auto max-w-3xl px-6 py-16">
            <h1 className="font-display text-3xl font-bold">Not found</h1>
            <p>There is nothing at this address. The link may be wrong.</p>
        </main>
    );
}
