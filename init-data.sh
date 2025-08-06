#!/bin/bash
# PostgreSQL initialization script for N8n
# This script runs when the PostgreSQL container starts for the first time

set -e

# Create the database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Ensure the database exists
    SELECT 'Database already exists' WHERE EXISTS (
        SELECT FROM pg_database WHERE datname = '$POSTGRES_DB'
    );
    
    -- Grant necessary permissions
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
    
    -- Create extensions that N8n might need
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

echo "PostgreSQL initialization completed for N8n"