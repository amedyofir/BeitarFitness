# Apply Aggregated Data Schema Updates to Supabase

## Instructions for Applying Schema Updates

### Option 1: Using Supabase Dashboard (Recommended)

1. **Login to Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Login to your account
   - Select your BeitarFitness project

2. **Access SQL Editor**
   - Navigate to the "SQL Editor" tab in the left sidebar
   - Click "New Query"

3. **Execute the Schema Update**
   - Copy the contents of `supabase_aggregated_data_update.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

### Option 2: Using Supabase CLI (If installed)

```bash
# Navigate to your project directory
cd /Users/ofiramedy/Documents/BeitarFitness

# Apply the schema update
supabase db push --include-data supabase_aggregated_data_update.sql
```

### Option 3: Using psql (If you have direct database access)

```bash
# Connect to your Supabase database and run:
psql "your-supabase-connection-string" -f supabase_aggregated_data_update.sql
```

## What This Schema Update Includes

### 1. Views for Aggregated Data
- **`team_season_aggregated`**: Easy access to uploaded aggregated season statistics
- **`aggregated_data_status`**: Check if aggregated data exists for any season

### 2. Utility Functions
- **`check_aggregated_data_exists(season)`**: Returns boolean if aggregated data exists
- **`get_aggregated_teams_count(season)`**: Returns count of teams in aggregated data

### 3. Performance Optimizations
- Specialized index for aggregated data queries
- Comments documenting the matchweek 999 convention

### 4. Sample Data Structure
- Placeholder metadata entry to ensure structure compatibility

## Verification Steps

After applying the schema, verify it works:

1. **Check Views Exist**:
   ```sql
   SELECT * FROM team_season_aggregated LIMIT 1;
   SELECT * FROM aggregated_data_status;
   ```

2. **Test Functions**:
   ```sql
   SELECT check_aggregated_data_exists('2024/25');
   SELECT get_aggregated_teams_count('2024/25');
   ```

3. **Check Metadata**:
   ```sql
   SELECT * FROM team_match_metadata WHERE matchweek = 999;
   ```

## Notes

- The existing schema already supports aggregated data functionality
- This update adds convenience views and functions for better data management
- Matchweek 999 is the reserved identifier for aggregated season statistics
- All existing data and functionality remains unchanged