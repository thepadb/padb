const REPOSITORY = 'https://github.com/thepadb/padb';
const COMMIT_SHA = /^[0-9a-f]{7,40}$/;

export type SourceCodeLink = { href: string; label: string };

/** Link to the commit baked in at build time, or the repository when there is none (dev runs). See ADR 0011 */
export function sourceCodeLink(commit: string | undefined): SourceCodeLink {
    const sha = commit?.trim().toLowerCase();
    if (sha && COMMIT_SHA.test(sha)) {
        return { href: `${REPOSITORY}/commit/${sha}`, label: `Source (${sha.slice(0, 7)})` };
    }
    return { href: REPOSITORY, label: 'Source' };
}
