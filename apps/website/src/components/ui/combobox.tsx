// PROTOTYPE (issue #41): shadcn-style Combobox on Base UI.
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClasses } from './field';
import { itemClasses, popupClasses } from './select';

type Item = { value: string; label: string };

export function Combobox({
    items,
    placeholder,
    id,
    name,
    empty,
}: {
    items: Array<Item>;
    placeholder: string;
    id?: string;
    name?: string;
    empty: string;
}) {
    return (
        <BaseCombobox.Root items={items} name={name}>
            <BaseCombobox.InputGroup className="relative">
                <BaseCombobox.Input id={id} placeholder={placeholder} className={cn(inputClasses, 'pr-16')} />
                <div className="absolute inset-y-0 right-1 flex items-center text-muted-foreground">
                    <BaseCombobox.Clear aria-label="Clear" className="flex size-7 items-center justify-center">
                        <XIcon className="size-4" />
                    </BaseCombobox.Clear>
                    <BaseCombobox.Trigger
                        aria-label="Show countries"
                        className="flex size-7 items-center justify-center"
                    >
                        <ChevronDownIcon className="size-4" />
                    </BaseCombobox.Trigger>
                </div>
            </BaseCombobox.InputGroup>
            <BaseCombobox.Portal>
                <BaseCombobox.Positioner className="z-50 outline-none" sideOffset={4}>
                    <BaseCombobox.Popup className={cn(popupClasses, 'w-(--anchor-width) max-w-(--available-width)')}>
                        <BaseCombobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
                            {empty}
                        </BaseCombobox.Empty>
                        <BaseCombobox.List className="max-h-[min(20rem,var(--available-height))] overflow-y-auto p-1 data-empty:p-0">
                            {(item: Item) => (
                                <BaseCombobox.Item key={item.value} value={item} className={itemClasses}>
                                    <BaseCombobox.ItemIndicator className="col-start-1">
                                        <CheckIcon className="size-4" />
                                    </BaseCombobox.ItemIndicator>
                                    <span className="col-start-2">{item.label}</span>
                                </BaseCombobox.Item>
                            )}
                        </BaseCombobox.List>
                    </BaseCombobox.Popup>
                </BaseCombobox.Positioner>
            </BaseCombobox.Portal>
        </BaseCombobox.Root>
    );
}
