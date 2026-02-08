-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CREATE TABLE vehicles (
--     id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     make       TEXT NOT NULL,
--     model      TEXT NOT NULL,
--     year       INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2025),
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- CREATE TABLE maintenance_records (
--     id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
--     date        DATE NOT NULL,
--     description TEXT NOT NULL,
--     mileage     INTEGER NOT NULL CHECK (mileage >= 0),
--     cost        TEXT,
--     notes       TEXT,
--     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- CREATE TABLE vehicle_images (
--     id SERIAL PRIMARY KEY,
--     vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
--     filename TEXT NOT NULL
-- );