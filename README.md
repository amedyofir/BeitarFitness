# Fitness Tracker

A modern web application for tracking and analyzing fitness data with file upload capabilities and weekly performance analysis.

## Features

- **File Upload**: Upload CSV files with fitness data (parsing starts from row 11)
- **Weekly Analysis**: View player performance data organized by week
- **Interactive Dashboard**: Two-tab interface for uploads and analysis
- **Supabase Integration**: Automatically stores data in Supabase database
- **Responsive Design**: Modern UI with Tailwind CSS

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Supabase Database Setup

Create a table named `weekly_load` in your Supabase database with this schema:

```sql
CREATE TABLE weekly_load (
    id SERIAL PRIMARY KEY,
    player_name TEXT,
    period_name TEXT,
    period_number INTEGER,
    date DATE,
    day_name TEXT,
    activity_name TEXT,
    total_duration INTERVAL,
    total_distance NUMERIC,
    maximum_velocity NUMERIC,
    acceleration_b3_efforts_gen2 INTEGER,
    deceleration_b3_efforts_gen2 INTEGER,
    rhie_total_bouts INTEGER,
    meterage_per_minute NUMERIC,
    high_speed_running_total_distance_b6 NUMERIC,
    velocity_b4_plus_total_efforts_gen2 INTEGER,
    very_high_speed_running_total_distance_b7 NUMERIC,
    running_imbalance NUMERIC,
    hmld_gen2 NUMERIC,
    hmld_per_min_gen2 NUMERIC
);
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Upload Data

1. Click on the "Upload Data" tab
2. Either drag and drop a CSV file or click "Choose File"
3. The system will parse data starting from row 11 (row 10 contains headers)
4. Data is automatically saved to the Supabase database

### Weekly Analysis

1. Click on the "Weekly Analysis" tab
2. View player performance organized by week
3. See total distance and intensity scores for each player
4. Intensity is color-coded: Red (≥0.8), Yellow (≥0.6), Green (≥0.4), Gray (<0.4)

## Data Processing

The application processes fitness data using the following calculations:

- **Total Distance**: Sum of all distances for the week
- **Virtual Intensity**: Calculated using acceleration, deceleration, and high-speed running metrics
- **Weekly Grouping**: Data is automatically grouped by calendar week

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **File Processing**: PapaParse for CSV parsing
- **Icons**: Lucide React

## File Format

The CSV file should have the following structure:
- Row 10: Headers
- Row 11+: Data rows with columns matching the database schema
- The system will automatically map CSV columns to database fields

## Support

For issues or questions, please check the file format and ensure your Supabase credentials are correctly configured. 