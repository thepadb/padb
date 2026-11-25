import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';
import { Shell } from '@/components/shell';
import { pageHeading, textLink } from '@/components/text';
import appCss from '@/styles.css?url';

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'Parks & Attractions Database' },
        ],
        links: [{ rel: 'stylesheet', href: appCss }],
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
                <Shell>
                    <Outlet />
                </Shell>
                <Scripts />
            </body>
        </html>
    );
}

function NotFound() {
    return (
        <>
            <h1 className={pageHeading}>Not found</h1>
            <p className="mt-2 text-muted-foreground">There is nothing at this address. The link may be wrong.</p>
            <p className="mt-6">
                <Link to="/" className={textLink}>
                    Go to the home page
                </Link>
            </p>
        </>
    );
}
