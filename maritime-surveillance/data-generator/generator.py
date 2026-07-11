import json
import math
import random
import socket
import time

UDP_IP = "127.0.0.1"
UDP_PORT = 8080

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

NUM_VESSELS = 200
UPDATE_INTERVAL = 0.1

INDIAN_BOUNDS = {
    "lat_min": 5.0,
    "lat_max": 24.5,
    "lon_min": 67.0,
    "lon_max": 97.5,
}


class Vessel:
    def __init__(self, mmsi):
        self.mmsi = mmsi

        self.lat = random.uniform(
            INDIAN_BOUNDS["lat_min"],
            INDIAN_BOUNDS["lat_max"],
        )

        self.lon = random.uniform(
            INDIAN_BOUNDS["lon_min"],
            INDIAN_BOUNDS["lon_max"],
        )

        self.speed = random.uniform(5, 25)
        self.course = random.uniform(0, 360)
        self.heading = self.course

    def move(self):
        distance = self.speed * 0.00003

        self.lat += distance * math.cos(math.radians(self.course))
        self.lon += distance * math.sin(math.radians(self.course))

        if (
            self.lat < INDIAN_BOUNDS["lat_min"]
            or self.lat > INDIAN_BOUNDS["lat_max"]
            or self.lon < INDIAN_BOUNDS["lon_min"]
            or self.lon > INDIAN_BOUNDS["lon_max"]
        ):
            self.course = random.uniform(0, 360)

        self.heading = self.course


fleet = [
    Vessel(419000000 + i)
    for i in range(NUM_VESSELS)
]

print(f"Streaming {NUM_VESSELS} vessels...")


while True:

    for vessel in fleet:

        vessel.move()

        # Force some vessels into protected zones
        if random.random() < 0.15:

            zone = random.choice([
                (19.0760, 72.8777),  # Mumbai
                (13.0827, 80.2707),  # Chennai
                (9.9312, 76.2673),   # Kochi
                (15.2993, 74.1240),  # Goa
                (22.5726, 88.3639),  # Kolkata
                (8.4811, 76.9500),   # Vizhinjam
            ])

            vessel.lat = zone[0]
            vessel.lon = zone[1]

        packet = {
            "mmsi": vessel.mmsi,
            "lat": vessel.lat,
            "lon": vessel.lon,
            "speed": vessel.speed,
            "course": vessel.course,
            "heading": vessel.heading,
        }

        sock.sendto(
            json.dumps(packet).encode(),
            (UDP_IP, UDP_PORT),
        )

    time.sleep(UPDATE_INTERVAL)