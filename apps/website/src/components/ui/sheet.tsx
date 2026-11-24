// PROTOTYPE (issue #41): shadcn-style Sheet on Base UI Dialog.
import { Dialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export function Sheet({
    trigger,
    title,
    children,
    className,
}: {
    trigger: React.ReactElement;
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Dialog.Root>
            <Dialog.Trigger render={trigger} />
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
                <Dialog.Popup
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-sm flex-col gap-4 overflow-y-auto border-r bg-background p-5 shadow-xl transition-transform duration-200 data-ending-style:-translate-x-full data-starting-style:-translate-x-full design-c:rounded-r-3xl design-c:border-r-2',
                        className,
                    )}
                >
                    <div className="flex items-center justify-between">
                        <Dialog.Title className="font-display text-lg font-semibold">{title}</Dialog.Title>
                        <Dialog.Close aria-label="Close" className="rounded-md p-1 hover:bg-muted">
                            <XIcon className="size-5" />
                        </Dialog.Close>
                    </div>
                    {children}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
