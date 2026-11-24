// PROTOTYPE (issue #41): hard-coded, deliberately awkward fake data. Every place and name here is invented.
import type { Status } from '@padb/api-client';

export type StatusEntry = { status: Status; began: string | null };
export type NameEntry = { name: string; first_used: string | null };

export type Park = {
    id: string;
    name: string;
    country: string;
    operator: string;
    resort?: string;
    website?: string;
    areas: Array<string>;
    statusHistory: Array<StatusEntry>;
    nameHistory: Array<NameEntry>;
};

export type Ride = {
    id: string;
    name: string;
    park: string;
    area?: string;
    manufacturer: string;
    category: 'Coaster' | 'Flat' | 'Dark' | 'Water' | 'Transport';
    model?: string;
    heightM?: number;
    speedKmh?: number;
    statusHistory: Array<StatusEntry>;
    nameHistory: Array<NameEntry>;
};

export type Hotel = { name: string; opened: string | null };

export type Resort = {
    id: string;
    name: string;
    country: string;
    operator: string;
    parks: Array<string>;
    hotels: Array<Hotel>;
    nameHistory: Array<NameEntry>;
};

const op = (began: string | null): StatusEntry => ({ status: 'operating', began });

export const parks: Array<Park> = [
    {
        // Long name, 15+ Areas, a refurbishment that is not a closed or SBNO gap
        id: 'koeniglicher-freizeitpark',
        name: 'Königlicher Freizeit- und Erlebnispark Großherzogtum Niederrhein-Westfalen am Silbersee',
        country: 'DE',
        operator: 'Silbersee Freizeit GmbH & Co. KG',
        resort: 'sonnental',
        website: 'https://example.com/silbersee',
        areas: [
            'Eingangsplatz',
            'Märchenwald',
            'Piratenbucht',
            'Ritterburg',
            'Wildwest-Stadt',
            'Drachental',
            'Zauberreich',
            'Hafenviertel',
            'Dschungelpfad',
            'Polarstation',
            'Mondbasis',
            'Kinderland',
            'Wasserwelt',
            'Alpendorf',
            'Zirkusplatz',
            'Seepromenade',
            'Schattenreich',
        ],
        statusHistory: [
            { status: 'under_construction', began: '1978' },
            op('1980-05-01'),
            { status: 'refurbishing', began: '2019-11' },
            op('2020-04'),
        ],
        nameHistory: [
            { name: 'Freizeitpark Silbersee', first_used: '1980' },
            { name: 'Erlebnispark Silbersee', first_used: '1994-03' },
        ],
    },
    {
        // Reopened after a closure
        id: 'brightwater-pier',
        name: 'Brightwater Pier',
        country: 'GB',
        operator: 'Brightwater Borough Council',
        areas: ['Pier Head', 'Arcade Hall', 'Seaward End'],
        statusHistory: [op('1971'), { status: 'closed', began: '1999-10' }, op('2005')],
        nameHistory: [{ name: 'Brightwater Pleasure Pier', first_used: '1971' }],
    },
    {
        // Refurbishing, month precision
        id: 'hollowmere',
        name: 'Hollowmere Adventure Park',
        country: 'GB',
        operator: 'Hollowmere Leisure Ltd',
        website: 'https://example.com/hollowmere',
        areas: ['Village Green', 'The Old Mine', 'Smugglers Cove', 'Woodland Trail'],
        statusHistory: [op('1979'), { status: 'refurbishing', began: '2025-04' }],
        nameHistory: [{ name: 'Hollowmere Farm Park', first_used: '1979' }],
    },
    {
        // Never operated; empty Name History; no Areas
        id: 'starfall-bay',
        name: 'Starfall Bay',
        country: 'US',
        operator: 'Starfall Parks Inc.',
        areas: [],
        statusHistory: [
            { status: 'announced', began: '2022-06' },
            { status: 'under_construction', began: '2024' },
        ],
        nameHistory: [],
    },
    {
        // Final Status
        id: 'old-kettering-gardens',
        name: 'Old Kettering Gardens',
        country: 'GB',
        operator: 'Kettering Amusements Ltd',
        areas: ['Rose Walk', 'The Fairground'],
        statusHistory: [op('1971'), { status: 'closed', began: '2008-10-31' }, { status: 'demolished', began: '2009' }],
        nameHistory: [{ name: 'Kettering Pleasure Gardens', first_used: '1971' }],
    },
    {
        // Year-only, empty Name History
        id: 'parc-des-lumieres',
        name: 'Parc des Lumières',
        country: 'FR',
        operator: 'Lumières Loisirs SA',
        areas: ['Place Royale', 'Le Village', 'La Forêt Enchantée'],
        statusHistory: [op('1992')],
        nameHistory: [],
    },
    {
        id: 'avonturenland-zeewolde',
        name: 'Avonturenland Zeewolde',
        country: 'NL',
        operator: 'Zeewolde Recreatie BV',
        areas: ['Dorpsplein', 'Piratenhaven'],
        statusHistory: [op('1985'), { status: 'sbno', began: '2023-09' }],
        nameHistory: [{ name: 'Speelpark Zeewolde', first_used: '1985' }],
    },
    {
        id: 'sakura-hills',
        name: 'Sakura Hills Yūenchi',
        country: 'JP',
        operator: 'Sakura Hills Co., Ltd.',
        resort: 'sakura',
        areas: ['Hanami Gate', 'Kids Town', 'Sky Garden'],
        statusHistory: [op('1965-07-01')],
        nameHistory: [{ name: 'Sakura Hills Pleasure Ground', first_used: '1965-07-01' }],
    },
    {
        id: 'lakeside-kingdom',
        name: 'Lakeside Kingdom',
        country: 'GB',
        operator: 'Lakeside Leisure Ltd',
        resort: 'lakeside',
        website: 'https://example.com/lakeside',
        areas: ['Kingdom Gate', 'Dragon Isle', 'Frontier Falls', 'Robot Works', 'Little Kingdom'],
        statusHistory: [op('1996-03')],
        nameHistory: [{ name: 'Lakeside Fun Kingdom', first_used: '1996-03' }],
    },
    {
        id: 'lakeside-water-world',
        name: 'Lakeside Water World',
        country: 'GB',
        operator: 'Lakeside Leisure Ltd',
        resort: 'lakeside',
        areas: ['Lagoon', 'Rapids'],
        statusHistory: [op('2003')],
        nameHistory: [],
    },
    {
        // No Status History: no status line
        id: 'ironwood-fun-fair',
        name: 'Ironwood Fun Fair',
        country: 'US',
        operator: 'Ironwood Fairs LLC',
        areas: [],
        statusHistory: [],
        nameHistory: [],
    },
    {
        // Operating with no date
        id: 'cascada-magica',
        name: 'Cascada Mágica',
        country: 'ES',
        operator: 'Cascada Ocio SL',
        areas: ['Plaza Mayor', 'El Río'],
        statusHistory: [op(null)],
        nameHistory: [],
    },
    {
        id: 'nordlys-tivoli',
        name: 'Nordlys Tivoli',
        country: 'DK',
        operator: 'Nordlys A/S',
        areas: ['Haven', 'Pladsen'],
        statusHistory: [op('1958')],
        nameHistory: [],
    },
    {
        id: 'glenmorrow',
        name: 'Glenmorrow Family Park',
        country: 'GB',
        operator: 'Glenmorrow Estates',
        areas: [],
        statusHistory: [{ status: 'announced', began: '2025' }],
        nameHistory: [],
    },
    {
        id: 'thunder-ridge',
        name: 'Thunder Ridge',
        country: 'US',
        operator: 'Ridge Parks Inc.',
        areas: ['Main Street', 'Canyon'],
        statusHistory: [op('1988'), { status: 'closed', began: '2015' }],
        nameHistory: [{ name: 'Thunder Ridge Family Fun Centre', first_used: '1988' }],
    },
    {
        // A second Park so the Sakura Resort groups several
        id: 'sakura-splash',
        name: 'Sakura Splash',
        country: 'JP',
        operator: 'Sakura Hills Co., Ltd.',
        resort: 'sakura',
        areas: [],
        statusHistory: [{ status: 'under_construction', began: '2023' }, op('2025-07-19')],
        nameHistory: [],
    },
];

export const rides: Array<Ride> = [
    {
        id: 'nachtfalke',
        name: 'Nachtfalke',
        park: 'koeniglicher-freizeitpark',
        area: 'Schattenreich',
        manufacturer: 'Vekoma',
        category: 'Coaster',
        model: 'SLC 689m',
        heightM: 33.3,
        speedKmh: 80,
        statusHistory: [op('1997'), { status: 'refurbishing', began: '2023-11' }, op('2024-03-16')],
        nameHistory: [{ name: 'Dunkler Falke', first_used: '1997' }],
    },
    ...[
        ['Drachenflug', 'Drachental', 'Gerstlauer', 'Coaster'],
        ['Piratenschiff Santa Maria', 'Piratenbucht', 'HUSS', 'Flat'],
        ['Geisterbahn zur Mitternacht', 'Schattenreich', 'Mack Rides', 'Dark'],
        ['Wildwasserfahrt', 'Wasserwelt', 'Intamin', 'Water'],
        ['Seebahn', 'Seepromenade', 'Severn Lamb', 'Transport'],
        ['Polarblitz', 'Polarstation', 'Zierer', 'Coaster'],
    ].map(
        ([name, area, manufacturer, category], i): Ride => ({
            id: name.toLowerCase().replace(/[^a-z]+/g, '-'),
            name,
            park: 'koeniglicher-freizeitpark',
            area,
            manufacturer,
            category: category as Ride['category'],
            statusHistory: [op(String(1980 + i * 6))],
            nameHistory: [],
        }),
    ),
    {
        id: 'the-abyss',
        name: 'The Abyss',
        park: 'lakeside-kingdom',
        area: 'Dragon Isle',
        manufacturer: 'Bolliger & Mabillard',
        category: 'Coaster',
        heightM: 45,
        speedKmh: 98,
        statusHistory: [op('1998-04'), { status: 'refurbishing', began: '2018' }, op('2019-05-25')],
        nameHistory: [{ name: 'Vortex', first_used: '1998-04' }],
    },
    {
        id: 'robo-spin',
        name: 'Robo Spin',
        park: 'lakeside-kingdom',
        area: 'Robot Works',
        manufacturer: 'Zamperla',
        category: 'Flat',
        statusHistory: [op('2011')],
        nameHistory: [],
    },
    {
        id: 'helter-skelter',
        name: 'Helter Skelter',
        park: 'brightwater-pier',
        area: 'Seaward End',
        manufacturer: 'Unknown',
        category: 'Flat',
        statusHistory: [op('1971'), { status: 'closed', began: '1999-10' }, op('2006')],
        nameHistory: [],
    },
    {
        id: 'sky-garden-wheel',
        name: 'Sky Garden Wheel',
        park: 'sakura-hills',
        area: 'Sky Garden',
        manufacturer: 'Unknown',
        category: 'Flat',
        statusHistory: [op('1972'), { status: 'sbno', began: '2022-06' }],
        nameHistory: [{ name: 'Hanami Wheel', first_used: '1972' }],
    },
];

export const resorts: Array<Resort> = [
    {
        id: 'lakeside',
        name: 'Lakeside Resort',
        country: 'GB',
        operator: 'Lakeside Leisure Ltd',
        parks: ['lakeside-kingdom', 'lakeside-water-world'],
        hotels: [
            { name: 'Lakeside Lodge', opened: '1998' },
            { name: 'The Boathouse Hotel', opened: '2006-07' },
            { name: 'Kingdom Grand', opened: null },
        ],
        nameHistory: [{ name: 'Lakeside Leisure Park', first_used: '1996' }],
    },
    {
        id: 'sonnental',
        name: 'Sonnental Resort',
        country: 'DE',
        operator: 'Silbersee Freizeit GmbH & Co. KG',
        parks: ['koeniglicher-freizeitpark'],
        hotels: [{ name: 'Hotel Silbersee', opened: '2001' }],
        nameHistory: [],
    },
    {
        id: 'sakura',
        name: 'Sakura Hills Resort',
        country: 'JP',
        operator: 'Sakura Hills Co., Ltd.',
        parks: ['sakura-hills', 'sakura-splash'],
        hotels: [
            { name: 'Hotel Sakura Hills', opened: '1972' },
            { name: 'Sky Garden Inn', opened: '2019-03' },
        ],
        nameHistory: [],
    },
];

export const findPark = (id: string) => parks.find(park => park.id === id);
export const findRide = (id: string) => rides.find(ride => ride.id === id);
export const findResort = (id: string) => resorts.find(resort => resort.id === id);
export const ridesIn = (park: string) => rides.filter(ride => ride.park === park);

const countryNames = new Intl.DisplayNames(['en-GB'], { type: 'region' });
export const countryName = (code: string) => countryNames.of(code) ?? code;

export const allCountries = Object.entries(
    // Every region code; the combobox needs a long list
    Object.fromEntries(
        'AD AE AR AT AU BE BG BR CA CH CL CN CO CZ DE DK EE ES FI FR GB GR HK HR HU IE IL IN IS IT JP KR LT LU LV MX MY NL NO NZ PH PL PT RO RS SA SE SG SI SK TH TR TW UA US VN ZA'
            .split(' ')
            .map(code => [code, countryName(code)]),
    ),
)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en-GB'));
