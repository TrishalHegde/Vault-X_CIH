# Database Setup

To run the database for the Grid & Gate Architecture, you must have Docker installed.

## 1. Start the PostgreSQL Container
Run this in a PowerShell or Command Prompt terminal:
```bash
docker run --name maritime_db -e POSTGRES_PASSWORD=hackathon -p 5432:5432 -d postgis/postgis
```

## 2. Initialize the Database Table
Connect to the database and create the alerts table. You can use this one-liner via Docker to execute the SQL:

```bash
docker exec -i maritime_db psql -U postgres -d postgres -c "CREATE TABLE active_alerts ( id SERIAL PRIMARY KEY, mmsi VARCHAR(20), latitude FLOAT, longitude FLOAT, speed FLOAT, alert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP );"
```
