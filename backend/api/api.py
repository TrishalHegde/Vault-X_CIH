from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon convenience
    allow_methods=["*"],
)

def get_db():
    return psycopg2.connect("host=localhost user=postgres password=hackathon dbname=postgres")

@app.get("/alerts")
def get_recent_alerts():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT mmsi, latitude, longitude, speed, alert_time FROM active_alerts ORDER BY alert_time DESC LIMIT 50;")
        alerts = [{"mmsi": r[0], "lat": r[1], "lon": r[2], "speed": r[3], "time": str(r[4])} for r in cursor.fetchall()]
        cursor.close()
        conn.close()
        return alerts
    except Exception as e:
        return {"error": str(e)}
