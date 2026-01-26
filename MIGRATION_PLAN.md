# Party/Client System Migration Plan

## Overview
Add party/client management system to track entries and payments per client while preserving all existing data.

## Database Changes

### 1. New Tables
- **parties** - Store client/party information
- **payments** - Track payments received from parties

### 2. Modified Tables
- **entries** - Add `party_id` column (nullable, with default for existing data)

## Migration Strategy

### Phase 1: Add New Tables
1. Create `parties` table
2. Create `payments` table
3. Create default "Cash/General" party for existing entries

### Phase 2: Link Existing Data
1. Add `party_id` column to `entries` (nullable)
2. Create default party: "Cash/General" or "Walk-in"
3. Link all existing entries to default party
4. Set default party_id for new entries

### Phase 3: Update Application
1. Backend API for parties and payments
2. Frontend UI for party management
3. Update entries form with party selection
4. Payments tracking interface
5. Dashboard party-wise statistics

## Data Preservation
- ✅ All existing entries will be linked to default party
- ✅ No data loss
- ✅ Backward compatible
- ✅ Can run migration multiple times safely

## Rollback Plan
- Keep backup of database before migration
- Migration script is idempotent (safe to run multiple times)


