// PROTOTYPE (issue #41): shadcn-style Field and Input on Base UI.
import { Field as BaseField } from '@base-ui/react/field';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export const inputClasses =
    'h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-invalid:border-destructive data-invalid:ring-destructive/20 design-b:rounded-none design-b:border-0 design-b:border-b design-b:bg-transparent design-b:px-0 design-b:focus-visible:ring-0 design-c:h-11 design-c:rounded-xl design-c:border-2 design-c:px-4 design-c:text-base';

export function Field({ className, ...props }: React.ComponentProps<typeof BaseField.Root>) {
    return <BaseField.Root className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof BaseField.Label>) {
    return (
        <BaseField.Label
            className={cn(
                'text-sm font-medium data-invalid:text-destructive design-b:font-mono design-b:text-[0.7rem] design-b:uppercase design-b:tracking-widest design-b:text-muted-foreground design-c:font-display design-c:text-base',
                className,
            )}
            {...props}
        />
    );
}

export function Input({ className, ...props }: React.ComponentProps<typeof BaseField.Control>) {
    return <BaseField.Control className={cn(inputClasses, className)} {...props} />;
}

export function FieldDescription({ className, ...props }: React.ComponentProps<typeof BaseField.Description>) {
    return <BaseField.Description className={cn('text-xs text-muted-foreground', className)} {...props} />;
}

export function FieldError({ className, ...props }: React.ComponentProps<typeof BaseField.Error>) {
    return (
        <BaseField.Error
            className={cn('text-xs font-medium text-destructive design-c:text-sm', className)}
            {...props}
        />
    );
}
