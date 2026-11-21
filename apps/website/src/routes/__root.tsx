import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'Parks & Attractions Database' },
        ],
    }),
    component: RootDocument,
});

function RootDocument() {
    return (
        <html lang="en-GB">
            <head>
                <HeadContent />
            </head>
            <body>
                <Outlet />
                <Scripts />
            </body>
        </html>
    );
}
