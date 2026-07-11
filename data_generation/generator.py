import socket
import json
import time
import random
import os
import csv

UDP_IP = "127.0.0.1"
UDP_PORT = 8080

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
print(f"Blasting synthetic Indian subcontinent vessel data to {UDP_IP}:{UDP_PORT}...")

# Try to load real data patterns if CSV exists
csv_path = "../processed_AIS_dataset.csv"
historical_speeds = []
if os.path.exists(csv_path):
    try:
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if 'speed' in row:
                    try:
                        historical_speeds.append(float(row['speed']))
                    except:
                        pass
        print(f"Loaded {len(historical_speeds)} speed profiles from {csv_path}")
    except Exception as e:
        print("Error reading CSV:", e)

def get_speed():
    if historical_speeds:
        return random.choice(historical_speeds)
    return random.uniform(5.0, 22.0)

while True:
    is_violator = random.random() > 0.95 # 95% of traffic is normal
    
    if is_violator:
        # Directly enters the protected H3 cell inside the Gulf of Mannar Marine National Park
        lat, lon = 9.0, 78.5  # Coordinate inside the polygon [78.15, 8.75] to [79.25, 9.25]
        speed = random.uniform(6.0, 15.0) # Break the 5.0 knot rule
    else:
        # Open ocean - Indian Subcontinent (Arabian Sea & Bay of Bengal)
        # Arabian Sea: Lat 10-25, Lon 60-75
        # Bay of Bengal: Lat 10-22, Lon 80-95
        if random.random() > 0.5:
            lat = random.uniform(10.0, 25.0)
            lon = random.uniform(60.0, 75.0)
        else:
            lat = random.uniform(10.0, 22.0)
            lon = random.uniform(80.0, 95.0)
        speed = get_speed()
        
    payload = json.dumps({
        "mmsi": str(random.randint(419000000, 419999999)), # Indian MMSI range
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "speed": round(speed, 1)
    })
    
    sock.sendto(payload.encode('utf-8'), (UDP_IP, UDP_PORT))
    # Blast rate limit - roughly simulating 50k msgs/sec if we spin up multiple or batch, 
    # but here we use a small sleep to avoid completely freezing Python instantly. 
    # In a real stress test, we remove the sleep.
    time.sleep(0.0001) 
