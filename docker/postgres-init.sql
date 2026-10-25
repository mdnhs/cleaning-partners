-- Runs once, when the dev Postgres volume is first created.
-- cp_dev comes from POSTGRES_DB; these are the test and E2E databases.
CREATE DATABASE cp_test;
CREATE DATABASE cp_e2e;
