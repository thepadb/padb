# Resorts are optional; Destinations list Resorts and standalone Parks together

A Park only belongs to a Resort when the Resort groups several Parks or holds Hotels; standalone Parks have none rather than a one-Park Resort, which would invent records and duplicate names. Every Park response includes `resort`, `null` when it has none.

Most consumers (trip planners, wait-time apps) start from one list of places a visitor can go, so `/destinations` returns every Destination, a Resort with its Parks nested or a Park with no Resort, each tagged with `type`, in one paginated list. `/resorts`, `/parks`, `/hotels`, `/districts` and `/rides` stay single-type: `/resorts` never includes standalone Parks. `/destinations` is the only mixed endpoint.

Every Park records its country, and `/destinations` and `/parks` filter by it (e.g. `/destinations?country=GB`), so consumers never guess regions from names. A Resort's country is that of its Parks.

We chose this over one-Park Resorts for everything and over leaving consumers to merge `/resorts` with Parks that have no Resort, which costs two calls and breaks pagination.
