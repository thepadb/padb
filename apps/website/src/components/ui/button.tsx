// PROTOTYPE (issue #41): shadcn-style Button on Base UI.
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
    [
        'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-[background-color,color,translate,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        'rounded-sm',
        'design-b:rounded-[3px] design-b:font-medium',
        'design-c:rounded-full design-c:border-2 design-c:border-foreground design-c:font-display design-c:font-normal design-c:shadow-[0_4px_0_var(--foreground)] design-c:active:translate-y-1 design-c:active:shadow-none',
        'design-e:rounded-none design-e:[font-stretch:112%]',
        'design-f:h-8 design-f:rounded-md design-f:px-3 design-f:font-medium',
    ],
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground hover:bg-primary/85',
                outline: 'border border-input bg-transparent hover:bg-muted design-c:bg-card',
                ghost: 'hover:bg-muted design-c:border-transparent design-c:shadow-none',
                link: 'underline underline-offset-4 hover:decoration-2 design-c:border-transparent design-c:shadow-none',
            },
            size: {
                default: 'h-10 px-4 text-sm',
                sm: 'h-8 px-3 text-xs',
                lg: 'h-12 px-6 text-base',
            },
        },
        defaultVariants: { variant: 'default', size: 'default' },
    },
);

export function Button({
    className,
    variant,
    size,
    ...props
}: React.ComponentProps<typeof BaseButton> & VariantProps<typeof buttonVariants>) {
    return <BaseButton className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
