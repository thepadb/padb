# Parks & Attractions Database (PADB)

An open, community-edited encyclopaedia of parks and everything in them: lasting facts and history, not live data.

## Places

**Resort**:
An optional grouping of Parks and Hotels at one site (e.g. Disneyland Paris). Only exists when it groups several Parks or holds Hotels.
_Avoid_: Destination (which also covers standalone Parks).

**Destination**:
A top-level place a visitor travels to: a Resort, or a Park with no Resort. Not stored; a view over Resorts and Parks.
_Avoid_: Resort (when standalone Parks are included), Location.

**Park**:
A single fixed site with attractions: theme park, amusement park, water park, zoo with rides, pier. May stand alone or belong to one Resort.
_Avoid_: ThemePark, Theme park (as a type name; it is one kind of Park).

**Area**:
A named part of one Park (e.g. Fantasyland): just a name, kept in that Park's settings by Moderators and Admins, that its Attractions, Restaurants and Shops may be tagged with. Not a place in its own right and never navigated through.
_Avoid_: Land, Zone, Section.

**Hotel**:
A place to stay that belongs to a Resort. Having a Hotel is what makes a Resort necessary.

**Attraction**:
Umbrella term for things people experience in a Park: Rides, Shows, Meet & Greets, Walk-throughs. Each kind is its own type; Restaurants, Shops and Hotels are not Attractions.
_Avoid_: Entity, Ride (when meaning all Attractions).

**Ride**:
An Attraction people board or are carried by: coasters, flat rides, dark rides, water rides, transport.
_Avoid_: Attraction (when meaning only rides).

**Category**:
The broad kind of Ride: coaster, flat, dark, water, transport. Decides which subtype table, if any, holds its extra fields.
_Avoid_: Ride type, Kind.

**District**:
An ungated shopping and dining area belonging to a Resort (e.g. a resort's dining and shopping street). Holds Restaurants and Shops; not a Park.
_Avoid_: Village, Promenade, Park (for these places).


## Companies

**Manufacturer**:
A company that builds rides (e.g. Vekoma, B&M).
_Avoid_: Builder, Supplier.

**Ride Model**:
A Manufacturer's off-the-shelf product that many Rides share (e.g. Vekoma SLC 689m).
_Avoid_: Ride type.

**Operator**:
A company that owns or runs Parks and Resorts (e.g. Merlin Entertainments). Ownership changes over time.
_Avoid_: Owner, Chain.

## History

**Status**:
Where something is in its life: announced, under construction, operating, refurbishing, SBNO, closed, demolished, relocated. Recorded, not derived from dates.

**Refurbishing**:
A Status: closed for planned work and expected to reopen, after which it returns to operating. Covers retracks and other major work.
_Avoid_: Refurbished (as a Status), Under maintenance, Closed (for a planned reopening).

**Status History**:
Every Status something has had, in order, each with the Partial Date it began; the last is its current Status. Ordered by sequence, not by date, since Partial Dates cannot always be compared. A Status can recur (e.g. operating, refurbishing, operating).
_Avoid_: Timeline, Lifecycle.

**SBNO**:
Standing But Not Operating: still physically present but not running, with no confirmed closure.
_Avoid_: Defunct, Mothballed.

**Partial Date**:
A date known only to year, month or day precision (e.g. opened 1980; closed 2007-10-02).
_Avoid_: Approximate date.

**Seasonal**:
An Attraction that only runs during part of the year (e.g. a Halloween scare maze). Still its own kind (a seasonal Walk-through is a Walk-through) and listed with it; when it ran, and for what season, come from the Occurrences it is linked to.

**Event**:
A recurring happening at one Park (e.g. Fright Nights). Its name covers every Occurrence; renames go in Name History.
_Avoid_: Season (that is the kind of time of year, e.g. Halloween).

**Occurrence**:
One dated running of an Event (e.g. 26 September to 2 November 2025), with the Seasonal Attractions that ran.
_Avoid_: Edition, Instance, Year.

**Name History**:
The former names of anything in PADB, in order, each with the Partial Date it was first used.
_Avoid_: Aliases, AKA.

**Retheme**:
A change of name, theming or hardware to an attraction that stays on the same site with the same layout, including a retrack (e.g. Nemesis becoming Nemesis Reborn). The same record continues, gaining Name History. A new layout or Category is a new record.
_Avoid_: Rebrand, Overlay, Retrack (as a separate kind of change).

**Relocation**:
A ride being dismantled and rebuilt elsewhere. The new location is a new record, linked to the old one, which closes.
_Avoid_: Move, Transfer.

## Names

**Original Name**:
A thing's name in the language its Park uses (e.g. a Phantasialand ride's German name).
_Avoid_: Native name, Default name.

**Translation**:
A thing's name in another language, shown when that language is requested; falls back to the Original Name.
_Avoid_: Localisation, Alias.

## Editing

**Revision**:
One save of one record, including its Areas, kept forever so it can be Rejected at any time. Creating a record is its first Revision. Holds what the Contributor entered, as entered, and the values it was based on.
_Avoid_: Change, Version, Changeset.

**Pending**:
A Revision awaiting review. It changes nothing anyone else sees until Accepted, and nothing at all if Rejected.
_Avoid_: Draft, Queued.

**Superseded**:
A field in an Accepted Revision that was not applied because a later Revision had already changed it. The Revision still counts as Accepted for its Contributor.
_Avoid_: Overridden, Stale.

**Reject**:
To cancel a Revision's effect. A Pending one is never applied; an Accepted one has its fields set back to their values before it, except fields a later Revision has since changed. Other Revisions stand. Counts against its Contributor.
_Avoid_: Revert, Restore, Rollback, Undo.

**Lock**:
A protection on a field so only Trusted Contributors, Moderators and Admins can change it; anyone else's save that changes it is refused.
_Avoid_: Freeze, Protect.

**Contributor**:
Any signed-in account. Can create records and edit them, except Locked fields; edits go live, except that a new Contributor's Revisions are Pending until enough are Accepted or a Moderator promotes them; a Moderator can return them to review.
_Avoid_: User (when meaning an editor), Editor.

**Trusted Contributor**:
A Contributor who may Lock fields and Reject Revisions. Granted only by a Moderator or Admin, never automatically.
_Avoid_: Power user.

**Moderator**:
Reviews edits, Merges duplicates and bans accounts.
_Avoid_: Mod (in docs and code).

**Admin**:
Can do everything a Moderator can, plus manage roles.

**Merge**:
A Moderator or Admin folding a duplicate record into another of the same kind. The duplicate's ID keeps working forever, pointing at the survivor. The normal way to remove a duplicate.
_Avoid_: Delete, Combine.

**Delete**:
An Admin permanently removing a record that should never have existed (spam, legal takedown, personal data). Its ID reports the record as gone, not unknown, and the content of its Revisions is erased. Rare and logged.
_Avoid_: Merge (for duplicates), Remove.

## Integration

**External ID**:
The identifier another service uses for the same thing, stored so consumers can cross-reference.
_Avoid_: Foreign ID, Mapping.
