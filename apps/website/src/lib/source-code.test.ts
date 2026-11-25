import { describe, expect, it } from 'vitest';
import { sourceCodeLink } from './source-code';

describe('sourceCodeLink', () => {
    it('links to the commit it was built from', () => {
        expect(sourceCodeLink(' 0123456789ABCDEF0123456789abcdef01234567\n')).toEqual({
            href: 'https://github.com/thepadb/padb/commit/0123456789abcdef0123456789abcdef01234567',
            label: 'Source (0123456)',
        });
    });

    it.each([undefined, '', 'not-a-sha'])('links to the repository when the commit is %j', commit => {
        expect(sourceCodeLink(commit)).toEqual({ href: 'https://github.com/thepadb/padb', label: 'Source' });
    });
});
