// Country codes a Park may record, the same list the API checks against. See ADR 0009

// One run of two-letter codes, not an array: minified, an array becomes a dotted string in which
// `SG.` and the codes after it look like a SendGrid API token to the image's secret scan
const CODES =
    'ADAEAFAGAIALAMAOAQARASATAUAWAXAZ'
    + 'BABBBDBEBFBGBHBIBJBLBMBNBOBQBRBSBTBVBWBYBZ'
    + 'CACCCDCFCGCHCICKCLCMCNCOCRCUCVCWCXCYCZ'
    + 'DEDJDKDMDODZ'
    + 'ECEEEGEHERESET'
    + 'FIFJFKFMFOFR'
    + 'GAGBGDGEGFGGGHGIGLGMGNGPGQGRGSGTGUGWGY'
    + 'HKHMHNHRHTHU'
    + 'IDIEILIMINIOIQIRISIT'
    + 'JEJMJOJP'
    + 'KEKGKHKIKMKNKPKRKWKYKZ'
    + 'LALBLCLILKLRLSLTLULVLY'
    + 'MAMCMDMEMFMGMHMKMLMMMNMOMPMQMRMSMTMUMVMWMXMYMZ'
    + 'NANCNENFNGNINLNONPNRNUNZ'
    + 'OM'
    + 'PAPEPFPGPHPKPLPMPNPRPSPTPWPY'
    + 'QA'
    + 'RERORSRURW'
    + 'SASBSCSDSESGSHSISJSKSLSMSNSOSRSSSTSVSXSYSZ'
    + 'TCTDTFTGTHTJTKTLTMTNTOTRTTTVTWTZ'
    + 'UAUGUMUSUYUZ'
    + 'VAVCVEVGVIVNVU'
    + 'WFWS'
    + 'YEYT'
    + 'ZAZMZW';

/** Officially assigned ISO 3166-1 alpha-2 codes, matching `ALPHA_2` in `apps/api/src/country.rs`. */
const ALPHA_2 = new Set(CODES.match(/../g));

/** True for a code the API accepts as a Park's country. */
export function isCountry(code: string): boolean {
    return ALPHA_2.has(code);
}

const names = new Intl.DisplayNames(['en-GB'], { type: 'region' });

/** Every country, with its English name, in order of name. */
export const countries: ReadonlyArray<{ code: string; name: string }> = [...ALPHA_2]
    .map(code => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

/** A country's flag emoji: its code as a pair of regional indicator symbols. */
export function flag(code: string): string {
    return String.fromCodePoint(...[...code].map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65));
}
