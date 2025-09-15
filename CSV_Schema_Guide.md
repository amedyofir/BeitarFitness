# CSV Schema Guide for Beitar Fitness Platform

## Overview

The Matchday Wizard now supports **two types of CSV data**:

1. **Player GPS Data** - Individual player performance metrics
2. **Team Statistics Data** - Team-level match performance data

The system automatically detects which type of data you're uploading based on the column headers.

---

## 🏃‍♂️ Player GPS Data Schema

**Detection**: Automatically detected when CSV contains columns like `Player`, `player_name`, `Minutes`, `minutes_played`

### Required Database Schema
Use the existing schema: `supabase_match_gps_schema.sql`

### Expected CSV Columns
- `Player` or `player_name` - Player name
- `Position` or `position` - Playing position 
- `Minutes` or `minutes_played` - Minutes played
- `Distance` or `total_distance` - Total distance covered
- `HSR Distance` or `hsr_distance` - High-speed running distance
- `Sprint Distance` or `sprint_distance` - Sprint distance
- `Accelerations` or `accelerations` - Number of accelerations
- `Decelerations` or `decelerations` - Number of decelerations
- `Max Speed` or `max_speed` - Maximum speed achieved
- `Avg Speed` or `avg_speed` - Average speed
- `Sprints` or `sprints` - Number of sprints
- `Top Speed %` or `top_speed_percentage` - Top speed percentage
- `Metabolic Power` or `metabolic_power` - Metabolic power
- `HMLD` or `hmld` - High Metabolic Load Distance
- `DSL` or `dynamic_stress_load` - Dynamic Stress Load
- `Total Loading` or `total_loading` - Total loading
- `Fatigue Index` or `fatigue_index` - Fatigue index

---

## 🏆 Team Statistics Data Schema

**Detection**: Automatically detected when CSV contains columns like `teamFullName`, `Team`, `teamId`

### Required Database Schema
**NEW**: Use `supabase_team_match_schema.sql` (created for your team data)

### Expected CSV Columns (from your sample file)

#### Team Information
- `Rank` - Team ranking
- `teamId` - Unique team identifier
- `teamImageId` - Team image/logo ID
- `teamFullName` - Full team name (e.g., "Beitar Jerusalem")
- `Team` - Short team name
- `teamAbbrevName` - Team abbreviation (e.g., "BJM")
- `teamShortName` - Short display name
- `newestTeamColor` - Team color code
- `optaTeamId` - Opta statistics team ID

#### League Information
- `leagueId` - League identifier
- `leagueName` - League name (e.g., "Ligat Ha'al (Israel)")

#### Match Performance Metrics
- `GM` - Goals scored
- `xA` - Expected assists
- `ExpG/Shot` - Expected goals per shot
- `ExpG` - Expected goals
- `ground_duels` - Ground duels
- `dribblesuccessful` - Successful dribbles

#### Positional Play Metrics
- `Starta3endbox /` - Sequences starting in attacking third ending in box
- `Starta2endbox/` - Sequences starting in middle third ending in box
- `passcompletedtobox` - Passes completed to box
- `endboxusingconrer` - Box entries using corners
- `starta2enda3` - Sequences from middle to attacking third
- `Starta1endbox/` - Sequences from defensive third to box
- `Starta2enda3/` - Alternative middle to attacking third metric
- `Starta1enda3/` - Defensive third to attacking third sequences
- `Starta1enda2/` - Defensive to middle third sequences
- `SeqStartAtt3rd` - Sequences starting in attacking third
- `SeqStartMid3rd` - Sequences starting in middle third
- `SeqStartA1` - Sequences starting in defensive third

#### Possession & Passing
- `Aerial%` - Aerial duel success percentage
- `ground%` - Ground duel success percentage  
- `CrossOpen` - Crosses from open play
- `passfromassisttogolden` - Passes from assist to golden chance
- `passAssistZone` - Assists from specific zones

#### Shooting Metrics
- `SOG_from_penalty_area` - Shots on goal from penalty area
- `SOG_from_box` - Shots on goal from box
- `shotfromgolden` - Shots from golden chances
- `shotfrombox` - Total shots from box
- `SOG` - Shots on goal
- `ShtIncBl` - Shots including blocked
- `xG` - Expected goals (actual calculated value)

#### Ball Control
- `Touches` - Total touches
- `TouchOpBox` - Touches in opponent box
- `%DropFwdUPr` - Forward pass completion percentage
- `poswonopponenthalf` - Possessions won in opponent half

#### Tactical Metrics
- `AvgSeqTime` - Average sequence time
- `ppda40` - Passes per Defensive Action (in final 40m)

---

## 🚀 How It Works

### Automatic Detection
1. Upload your CSV file in the Matchday Wizard
2. System analyzes column headers
3. Automatically detects data type (Player GPS vs Team Statistics)
4. Shows detection result with data type indicator
5. Processes and saves to appropriate database tables

### Data Storage
- **Player GPS Data** → `match_gps_data` + `match_metadata` tables
- **Team Statistics** → `team_match_statistics` + `team_match_metadata` tables

### Visual Indicators
- 🔵 **Blue indicator**: Player GPS data detected
- 🟢 **Green indicator**: Team statistics data detected
- ⚠️ **Yellow warning**: Existing data will be overwritten

---

## 📊 Database Tables Created

### For Team Statistics Data

#### `team_match_statistics`
Stores all team performance metrics for each matchweek

#### `team_match_metadata` 
Stores match-level information (date, competition, etc.)

#### Views Created
- `beitar_team_performance` - Beitar Jerusalem specific performance
- `league_team_standings` - League standings view

---

## 🎯 Your Sample File Analysis

Your file `/Users/ofiramedy/Documents/BeitarFitness/public/Matchreport26 (4).csv` contains:

✅ **Team Statistics Data** (13 teams from Ligat Ha'al)  
✅ **Compatible with new schema**  
✅ **Ready to upload through Matchday Wizard**

The file includes comprehensive team metrics for Israeli Premier League teams including Beitar Jerusalem, with detailed tactical, shooting, and possession statistics.

---

## 💡 Usage Tips

1. **Date & Matchweek**: Always specify the match date and matchweek number
2. **Opponent Field**: Only required for Player GPS data (not team statistics)
3. **Overwrite Warning**: System warns if data already exists for that matchweek
4. **Data Type Display**: Clear indicators show what type of data was detected
5. **Error Handling**: Detailed error messages if upload fails

The enhanced Matchday Wizard now seamlessly handles both individual player performance tracking and team-level tactical analysis!