-- Lists filtered by country page in ID order, so the index carries both. See ADR 0014
DROP INDEX park_country_idx;
CREATE INDEX park_country_id_idx ON park (country, id);
