// PROTOTYPE (issue #41): a tinted block with initials in the slot a photo will take.
import { cn } from '@/lib/utils';

const hue = (name: string) => [...name].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 360, 7);

export const initials = (name: string) =>
    name
        .split(/[\s-]+/)
        .filter(word => /^\p{Lu}/u.test(word))
        .slice(0, 2)
        .map(word => word[0])
        .join('') || name[0].toUpperCase();

/** Give it the aspect ratio the photo will have, so nothing shifts when photos arrive. */
export function Placeholder({ name, className }: { name: string; className?: string }) {
    const h = hue(name);
    return (
        <div
            // Decorative until there is a photo, so links keep a clean name
            aria-hidden="true"
            className={cn(
                '@container flex shrink-0 items-center justify-center overflow-hidden font-display font-bold select-none',
                className,
            )}
            style={{
                background: `oklch(var(--ph-light) var(--ph-chroma) ${h})`,
                color: `oklch(var(--ph-ink) calc(var(--ph-chroma) * 0.8) ${h} / 0.55)`,
            }}
        >
            <span className="text-[clamp(0.75rem,28cqw,7rem)] leading-none tracking-tight">{initials(name)}</span>
        </div>
    );
}
