import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';
import { BrowseTree, getTreeParks } from '@/components/browse-tree';
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
    // The tree's open levels arrive with the page, fetched once; the tree keeps what it loads after that itself
    loader: async () => ({ treeParks: await getTreeParks({ data: undefined }) }),
    staleTime: Number.POSITIVE_INFINITY,
    component: RootDocument,
    notFoundComponent: NotFound,
});

function RootDocument() {
    const { treeParks } = Route.useLoaderData();
    return (
        <html lang="en-GB">
            <head>
                <HeadContent />
            </head>
            <body>
                <Shell tree={<BrowseTree firstPage={treeParks} />}>
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
