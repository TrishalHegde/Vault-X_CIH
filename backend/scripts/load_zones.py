import json
import psycopg2
import os

def init_db():
    conn = psycopg2.connect("host=localhost user=postgres password=hackathon dbname=postgres")
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Ensure PostGIS is enabled
    cursor.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    
    # Create marine_zones table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS marine_zones (
            id SERIAL PRIMARY KEY,
            zone_id VARCHAR(50) UNIQUE,
            name VARCHAR(255),
            type VARCHAR(100),
            region VARCHAR(100),
            rules JSONB,
            geom GEOMETRY(Polygon, 4326)
        );
    """)
    return conn, cursor

def load_geojson(filepath, conn, cursor):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    print(f"Loading {len(features)} zones into PostgreSQL...")
    
    for f in features:
        props = f['properties']
        geom = json.dumps(f['geometry'])
        rules = json.dumps(props.get('rules', {}))
        
        cursor.execute("""
            INSERT INTO marine_zones (zone_id, name, type, region, rules, geom)
            VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            ON CONFLICT (zone_id) DO UPDATE SET
                name = EXCLUDED.name,
                rules = EXCLUDED.rules,
                geom = EXCLUDED.geom;
        """, (
            props.get('zone_id'),
            props.get('name'),
            props.get('type'),
            props.get('region'),
            rules,
            geom
        ))
    
    print("Zones loaded successfully!")

if __name__ == '__main__':
    # Use absolute path to the user's provided file
    geojson_path = r"c:\New folder\indian_subcontinent_marine_zones (3).json"
    
    if not os.path.exists(geojson_path):
        print(f"File not found: {geojson_path}")
        exit(1)
        
    conn, cursor = init_db()
    load_geojson(geojson_path, conn, cursor)
    cursor.close()
    conn.close()
