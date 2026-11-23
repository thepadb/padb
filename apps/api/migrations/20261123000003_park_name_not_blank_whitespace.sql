-- Any whitespace counts as blank, not only the spaces btrim strips, matching the API's check
ALTER TABLE park DROP CONSTRAINT park_name_not_blank;
ALTER TABLE park ADD CONSTRAINT park_name_not_blank CHECK (name ~ '\S');
