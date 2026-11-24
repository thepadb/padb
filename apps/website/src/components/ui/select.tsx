// PROTOTYPE (issue #41): shadcn-style Select on Base UI.
import { Select as BaseSelect } from '@base-ui/react/select';
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClasses } from './field';

export const popupClasses =
    'origin-(--transform-origin) rounded-sm border bg-popover text-popover-foreground shadow-lg outline-none transition-[scale,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 design-b:rounded-[3px] design-c:rounded-xl design-c:border-2 design-c:shadow-[0_5px_0_var(--foreground)]';
export const itemClasses =
    'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-muted design-b:data-highlighted:bg-secondary design-c:rounded-lg design-c:data-highlighted:bg-secondary design-c:data-highlighted:text-secondary-foreground';

export function Select({
    items,
    placeholder,
    name,
    id,
    defaultValue,
}: {
    items: Array<{ value: string; label: string }>;
    placeholder: string;
    name?: string;
    id?: string;
    defaultValue?: string | null;
}) {
    return (
        <BaseSelect.Root items={items} name={name} defaultValue={defaultValue}>
            <BaseSelect.Trigger
                id={id}
                className={cn(inputClasses, 'flex items-center justify-between gap-2 text-left')}
            >
                <BaseSelect.Value className="data-placeholder:text-muted-foreground" placeholder={placeholder} />
                <BaseSelect.Icon>
                    <ChevronsUpDownIcon className="size-4 opacity-60" />
                </BaseSelect.Icon>
            </BaseSelect.Trigger>
            <BaseSelect.Portal>
                <BaseSelect.Positioner className="z-50 outline-none" sideOffset={4} alignItemWithTrigger={false}>
                    <BaseSelect.Popup className={cn(popupClasses, 'min-w-(--anchor-width)')}>
                        <BaseSelect.List className="max-h-(--available-height) overflow-y-auto p-1">
                            {items.map(item => (
                                <BaseSelect.Item key={item.value} value={item.value} className={itemClasses}>
                                    <BaseSelect.ItemIndicator className="col-start-1">
                                        <CheckIcon className="size-4" />
                                    </BaseSelect.ItemIndicator>
                                    <BaseSelect.ItemText className="col-start-2">{item.label}</BaseSelect.ItemText>
                                </BaseSelect.Item>
                            ))}
                        </BaseSelect.List>
                    </BaseSelect.Popup>
                </BaseSelect.Positioner>
            </BaseSelect.Portal>
        </BaseSelect.Root>
    );
}
