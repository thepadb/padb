// PROTOTYPE (issue #41): shadcn-style Button on Base UI.
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[color,background-color,box-shadow,translate] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 rounded-md design-c:rounded-full design-c:border-2 design-c:border-foreground design-c:font-semibold design-b:font-mono design-b:text-xs design-b:uppercase design-b:tracking-wider',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground hover:bg-primary/90 design-c:shadow-[3px_3px_0_var(--foreground)] design-c:hover:-translate-y-px',
                outline:
                    'border border-input bg-background hover:bg-muted design-c:shadow-[3px_3px_0_var(--foreground)]',
                ghost: 'hover:bg-muted design-c:border-transparent',
                link: 'text-primary underline-offset-4 hover:underline design-c:border-transparent',
            },
            size: {
                default: 'h-9 px-4',
                sm: 'h-8 px-3 text-xs',
                lg: 'h-11 px-6 text-base',
                icon: 'size-9',
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
