// PROTOTYPE (issue #41): a link that shows a Preview Card on hover. Touch devices just follow the link.
import { PreviewCard } from '@base-ui/react/preview-card';
import { Link } from '@tanstack/react-router';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { countryName, findPark, findResort, findRide, parks, ridesIn } from './data';
import { Placeholder } from './placeholder';
import { statusLine } from './status-line';

type Target = { kind: 'park' | 'ride' | 'resort'; id: string };

function Children({ items }: { items: Array<string> }) {
    if (items.length === 0) {
        return null;
    }
    const more = items.length - 3;
    return (
        <ul className="mt-2 space-y-0.5 border-t pt-2 text-sm design-c:border-t-2 design-c:border-dashed">
            {items.slice(0, 3).map(item => (
                <li key={item} className="truncate">
                    {item}
                </li>
            ))}
            {more > 0 && <li className="text-muted-foreground">+{more} more</li>}
        </ul>
    );
}

function Content({ kind, id }: Target) {
    if (kind === 'park') {
        const park = findPark(id);
        if (!park) return null;
        return (
            <>
                <Placeholder
                    name={park.name}
                    className="aspect-[16/9] w-full rounded-md design-b:rounded-none design-c:rounded-xl"
                />
                <p className="mt-2 font-display font-semibold leading-tight">{park.name}</p>
                <Line text={statusLine(park.statusHistory)} />
                <Children items={ridesIn(park.id).map(ride => ride.name)} />
            </>
        );
    }
    if (kind === 'resort') {
        const resort = findResort(id);
        if (!resort) return null;
        const resortParks = resort.parks.map(p => findPark(p)?.name ?? p);
        return (
            <>
                <Placeholder
                    name={resort.name}
                    className="aspect-[16/9] w-full rounded-md design-b:rounded-none design-c:rounded-xl"
                />
                <p className="mt-2 font-display font-semibold leading-tight">{resort.name}</p>
                <Line text={countryName(resort.country)} />
                <Children items={[...resortParks, ...resort.hotels.map(hotel => hotel.name)]} />
            </>
        );
    }
    const ride = findRide(id);
    if (!ride) return null;
    return (
        <>
            <Placeholder
                name={ride.name}
                className="aspect-[16/9] w-full rounded-md design-b:rounded-none design-c:rounded-xl"
            />
            <p className="mt-2 font-display font-semibold leading-tight">{ride.name}</p>
            <Line text={statusLine(ride.statusHistory)} />
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t pt-2 text-sm design-c:border-t-2 design-c:border-dashed">
                <dt className="text-muted-foreground">Park</dt>
                <dd className="truncate">{findPark(ride.park)?.name}</dd>
                <dt className="text-muted-foreground">Manufacturer</dt>
                <dd>{ride.manufacturer}</dd>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{ride.category}</dd>
            </dl>
        </>
    );
}

function Line({ text }: { text: string | null }) {
    return text ? <p className="text-sm text-muted-foreground">{text}</p> : null;
}

export function PreviewLink({
    kind,
    id,
    className,
    children,
}: Target & { className?: string; children: React.ReactNode }) {
    const link =
        kind === 'park' ? (
            <Link to="/parks/$park" params={{ park: id }} />
        ) : kind === 'ride' ? (
            <Link to="/rides/$ride" params={{ ride: id }} />
        ) : (
            <Link to="/resorts/$resort" params={{ resort: id }} />
        );
    return (
        <PreviewCard.Root>
            <PreviewCard.Trigger render={link} className={className} delay={300}>
                {children}
            </PreviewCard.Trigger>
            <PreviewCard.Portal>
                <PreviewCard.Positioner sideOffset={8} className="z-50">
                    <PreviewCard.Popup
                        className={cn(
                            'w-72 origin-(--transform-origin) rounded-lg border bg-popover p-3 text-popover-foreground shadow-xl transition-[scale,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
                            'design-b:rounded-none design-b:shadow-md design-c:rounded-2xl design-c:border-2 design-c:shadow-[5px_5px_0_var(--foreground)]',
                        )}
                    >
                        <Content kind={kind} id={id} />
                    </PreviewCard.Popup>
                </PreviewCard.Positioner>
            </PreviewCard.Portal>
        </PreviewCard.Root>
    );
}

export const parkCount = parks.length;
