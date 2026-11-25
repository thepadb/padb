/** Up to two initials from a name's capitalised words, e.g. `AT` for Alton Towers; its first letter if none are capitalised. */
export function initials(name: string): string {
    return (
        name
            .split(/[\s-]+/)
            .filter(word => /^\p{Lu}/u.test(word))
            .slice(0, 2)
            .map(word => [...word][0])
            .join('') || ([...name.trim()][0] ?? '').toUpperCase()
    );
}

/** A hue (0 to 359) from a name, the same every time, so each placeholder keeps its own tint. */
export function placeholderHue(name: string): number {
    return [...name].reduce((sum, char) => (sum * 31 + (char.codePointAt(0) ?? 0)) % 360, 7);
}
