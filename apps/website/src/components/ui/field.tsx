// PROTOTYPE (issue #41): shadcn-style Field and Input on Base UI.
import { Field as BaseField } from '@base-ui/react/field';
import type * as React from 'react';
import { cn } from '@/lib/utils';

export const inputClasses = [
    'h-10 w-full min-w-0 bg-transparent text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground data-invalid:border-destructive',
    // A: a single ruled line, like a form on a sign
    'border-0 border-b-2 border-input px-0 focus-visible:border-foreground',
    // B: a boxed field on a record sheet
    'design-b:rounded-[3px] design-b:border design-b:bg-card design-b:px-3 design-b:text-sm design-b:focus-visible:border-primary design-b:focus-visible:ring-3 design-b:focus-visible:ring-primary/20',
    // C: a chunky ticket-booth field
    'design-c:h-12 design-c:rounded-xl design-c:border-2 design-c:bg-card design-c:px-4 design-c:focus-visible:ring-4 design-c:focus-visible:ring-secondary',
    // E: a plain box with a heavy baseline
    'design-e:rounded-none design-e:border design-e:border-b-2 design-e:bg-card design-e:px-3 design-e:focus-visible:border-primary',
    // F: a dense tool field
    'design-f:h-9 design-f:rounded-md design-f:border design-f:bg-card design-f:px-2.5 design-f:text-sm design-f:focus-visible:border-primary design-f:focus-visible:ring-2 design-f:focus-visible:ring-primary/25',
].join(' ');

export function Field({ className, ...props }: React.ComponentProps<typeof BaseField.Root>) {
    return <BaseField.Root className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof BaseField.Label>) {
    return (
        <BaseField.Label
            className={cn(
                'text-sm font-semibold data-invalid:text-destructive design-b:font-medium design-c:text-base design-c:font-bold design-f:text-xs design-f:font-medium design-f:text-muted-foreground',
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
