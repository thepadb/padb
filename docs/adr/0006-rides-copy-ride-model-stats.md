# Rides copy their Ride Model's stats rather than inheriting them

When a Ride is created from a Ride Model, the model's typical stats pre-fill the form, but the Ride then stores its own values independently. Inheriting values from the model would make every stat ambiguous (the ride's value, or the model's?) and complicate the API, and real installations often differ from the catalogue spec.
