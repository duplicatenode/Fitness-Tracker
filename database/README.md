# FitTrack Database Design

This directory contains the database schema, seed data, and connection tests for the FitTrack platform.

## Architecture

FitTrack uses a hybrid DBMS architecture combining Relational (MySQL) and NoSQL (Memurai) storage to handle different data access patterns efficiently.

### MySQL (Relational Data)
**Purpose:** Stores structured, highly-relational data where consistency (ACID) and complex joins are required.
- **Entities:** Users, User Profiles (1:1 with Users), Workout Plans, Exercises, Workout Sessions, Workout Sets, Fitness Goals.
- **Benefits:** We can enforce referential integrity (e.g., you cannot delete an exercise if it's currently part of a workout plan without explicit handling). We can easily run aggregate queries (e.g., total volume lifted per session).
- **Files:** `schema.sql`, `seed.sql`, `queries.sql`

### Memurai (NoSQL / Redis Protocol)
**Purpose:** Stores high-volume, append-only, or flexible-schema activity data where low latency and horizontal scaling are more critical than complex joins.
- **Entities:** 
  - **Sensor Readings (Streams):** `fittrack:sensors:{userId}` - Append-only time-series data representing wearable outputs.
  - **Daily Summaries (Hashes):** `fittrack:activity:daily:{userId}:{YYYY-MM-DD}` - Fast, frequently updated aggregations.
  - **Workout Journals (Strings with JSON):** `fittrack:journal:{userId}:{journalId}` - Unstructured, flexible journal entries.
  - **Photo Metadata (Strings with JSON):** `fittrack:photos:{userId}:{photoId}`
- **Benefits:** Incredibly fast writes for the wearable simulator. Streams allow efficient chronological retrieval and bounded history queries.

## Setup Instructions

Make sure your `.env` file in the project root has the correct credentials.

To run the SQL setup (creates schema and seeds demo data):
```bash
node database/setup_mysql.js
```

To run the Memurai setup (tests connection and writes sample data):
```bash
node database/memurai_setup.js
```
