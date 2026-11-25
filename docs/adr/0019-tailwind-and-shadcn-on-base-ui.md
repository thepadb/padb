# The website is styled with Tailwind and shadcn/ui on Base UI

The website uses Tailwind CSS v4, through its Vite plugin, for all styling. Its components follow shadcn/ui: their source is copied into `apps/website/src/components/ui` and owned by us, built on Base UI's unstyled, accessible primitives. Design F's tokens (#43) are CSS custom properties in `src/styles.css`, exposed to Tailwind as theme colours, so a component says `bg-card` or `text-primary` and never a raw colour. IBM Plex Sans is self-hosted through Fontsource, so no third party sees which pages people read.

We considered:

* **Plain CSS Modules.** No dependency, but every component reinvents spacing, states and dark mode, and the accessible behaviour of comboboxes, popovers and dialogs would be ours to write and keep correct.
* **A full component library** (e.g. MUI, Mantine). Fast to start, but its look fights design F, theming it is a project of its own, and upgrades are on its schedule. Owning copied components keeps the look ours.
* **shadcn/ui on Radix**, its original base. Radix has no Combobox, which #43 needs for the country picker, and it is maintained less actively than Base UI, which also has a Preview Card for record previews.

The cost is that Tailwind's class lists make markup long, and copied components do not upgrade themselves: fixes from shadcn/ui or Base UI's examples are pulled in by hand.
