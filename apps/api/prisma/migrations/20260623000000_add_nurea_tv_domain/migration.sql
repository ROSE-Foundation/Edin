-- Add 'Nurea_TV' value to the ContributorDomain enum (displayed as "Nurea TV").
-- Kept in its own migration so the new value is committed before any statement uses it.
ALTER TYPE "core"."ContributorDomain" ADD VALUE IF NOT EXISTS 'Nurea_TV';
