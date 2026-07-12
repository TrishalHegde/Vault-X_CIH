"""
Enhanced Indian Maritime Surveillance Data Generator
=====================================================
Simulates realistic AIS telemetry for Indian Ocean shipping lanes.

- 400 vessels with real Indian maritime names and MMSI ranges
- Routes between major Indian ports (Mumbai, Chennai, Kochi, Kolkata, etc.)
- Vessel types mapped to MMSI ranges (cargo, tanker, fishing, patrol, etc.)
- 15% chance of zone-trigger events for alert generation
- Restricted zones: Gulf of Mannar, Sundarbans, Lakshadweep, Andaman
- Sends UDP JSON packets at ~2000 msg/sec to the Rust engine

Usage:
    python generator.py
"""

import json
import math
import random
import socket
import time
from dataclasses import dataclass, field
from typing import List, Tuple

# ------------------------------------------------------------------
# UDP Config
# ------------------------------------------------------------------
UDP_IP = "127.0.0.1"
UDP_PORT = 8080
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

NUM_VESSELS = 400
UPDATE_INTERVAL = 0.05   # 50ms → ~8000 msgs/sec across all vessels

# ------------------------------------------------------------------
# Indian Ocean bounds
# ------------------------------------------------------------------
INDIAN_BOUNDS = {
    "lat_min": 5.0,
    "lat_max": 24.5,
    "lon_min": 67.0,
    "lon_max": 97.5,
}

# ------------------------------------------------------------------
# Major Indian Ports — strictly offshore anchorage positions
# Only positions in open water — no river ports
# ------------------------------------------------------------------
# Arabian Sea side (lon < 77)
ARABIAN_PORTS = [
    ("Mumbai Anchorage",    18.85, 72.65),
    ("JNPT Anchorage",      18.80, 72.82),
    ("Mormugao Fairway",    15.30, 73.65),
    ("Mangalore Outer",     12.75, 74.70),
    ("Kochi Fairway",        9.80, 76.00),
    ("Kandla Approach",     22.60, 69.60),
    ("Bombay High OA",      19.36, 71.20),
    ("Karachi Fairway",     24.60, 66.80),
    ("Male Anchorage",       4.15, 73.45),
    ("Lakshadweep OA",      11.00, 71.80),
]

# Bay of Bengal side (lon > 80)
BAY_PORTS = [
    ("Chennai Outer",       13.05, 80.42),
    ("Ennore Outer",        13.28, 80.48),
    ("Visakhapatnam OA",    17.60, 83.42),
    ("Paradip Outer",       20.22, 86.78),
    ("Sagar Roads",         21.58, 88.05),
    ("Tuticorin Fairway",    8.65, 78.22),
    ("Colombo Fairway",      6.80, 79.82),
    ("Chittagong OA",       21.80, 91.60),
    ("Andaman OA",          11.68, 92.75),
    ("Gahirmatha OA",       20.65, 87.00),
]

# All ports combined
INDIAN_PORTS = ARABIAN_PORTS + BAY_PORTS

# Offshore junction — south of India's tip, used to route ships
# from Arabian Sea to Bay of Bengal without crossing land
CAPE_JUNCTION    = (6.80, 78.20)   # South of Kanyakumari, open ocean
SRI_LANKA_SOUTH  = (5.90, 80.50)   # South of Sri Lanka

# ------------------------------------------------------------------
# Land detection — India's real coastline as latitude strips
# Format: (lat_center, land_lon_min, land_lon_max)
# At each latitude band, anything between these longitudes is land.
# Interpolation handles intermediate latitudes.
# ------------------------------------------------------------------
# India's land strips (western coast lon → eastern coast lon)
INDIA_LAND_STRIPS = [
    (8.0,   77.2, 78.2),   # Kanyakumari tip (narrow land)
    (8.5,   77.3, 78.5),
    (9.0,   76.4, 79.0),   # Kerala → Tamil Nadu
    (9.5,   76.3, 79.5),   # Includes Palk Strait land
    (10.0,  76.1, 79.9),
    (10.5,  76.0, 80.0),
    (11.0,  75.7, 80.0),
    (11.5,  75.4, 80.0),
    (12.0,  74.8, 80.1),   # Mangalore → Chennai lat
    (12.5,  74.7, 80.2),
    (13.0,  74.5, 80.2),
    (13.5,  74.4, 80.3),
    (14.0,  74.4, 80.3),
    (14.5,  74.2, 80.3),
    (15.0,  73.9, 80.4),
    (15.5,  73.8, 80.4),
    (16.0,  73.6, 80.5),
    (16.5,  73.5, 80.6),
    (17.0,  73.3, 82.0),   # AP starts pushing east
    (17.5,  73.2, 82.5),
    (18.0,  73.0, 83.5),
    (18.5,  72.9, 84.0),
    (19.0,  72.8, 85.0),
    (19.5,  72.8, 85.5),
    (20.0,  72.7, 86.5),   # Odisha coast
    (20.5,  72.8, 87.0),
    (21.0,  72.9, 87.5),
    (21.5,  73.0, 88.0),
    (22.0,  72.5, 88.5),   # Gujarat and Bengal
    (22.5,  70.5, 88.8),
    (23.0,  70.0, 89.5),
    (23.5,  69.5, 90.5),
    (24.0,  68.5, 91.5),
]

# Sri Lanka land strip
SRI_LANKA_LAND = [(lat, 80.0, 81.9) for lat in [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0]]

# Bangladesh / Myanmar land strips
BANGLADESH_LAND = [(lat, 89.5, 93.0) for lat in [21.0, 21.5, 22.0, 22.5, 23.0, 23.5, 24.0]]
MYANMAR_LAND    = [(lat, 92.5, 98.0) for lat in [14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0]]

ALL_LAND_STRIPS = INDIA_LAND_STRIPS + SRI_LANKA_LAND + BANGLADESH_LAND + MYANMAR_LAND

def _is_on_land(lat: float, lon: float) -> bool:
    """Accurate land check using latitude-strip based Indian coastline model."""
    if lat < 4.0 or lat > 24.5 or lon < 65.0 or lon > 100.0:
        return False
    
    # Find nearest strip(s) and interpolate
    best_dist = 9999.0
    land_lon_min = None
    land_lon_max = None
    
    for (strip_lat, lon_min, lon_max) in ALL_LAND_STRIPS:
        d = abs(lat - strip_lat)
        if d < best_dist:
            best_dist = d
            land_lon_min = lon_min
            land_lon_max = lon_max
    
    if best_dist > 0.6:
        return False  # No strip close enough
    
    return land_lon_min is not None and land_lon_min < lon < land_lon_max

def _is_arabian_sea(lat: float, lon: float) -> bool:
    """Returns True if point is on the Arabian Sea side (west of India)."""
    return lon < 77.0

def _is_bay_of_bengal(lat: float, lon: float) -> bool:
    """Returns True if point is on the Bay of Bengal side (east of India)."""
    return lon > 80.0

# ------------------------------------------------------------------
# Restricted / Sensitive Zones (used by zone-trigger for alerts)
# ------------------------------------------------------------------
RESTRICTED_ZONES = [
    ("Bombay High Offshore Oil Field", 19.3600, 71.3000),
    ("Gulf of Kutch Marine National Park", 22.5000, 69.4400),
    ("Lakshadweep Sensitive Coral Buffer", 10.8000, 72.3000),
    ("Sriharikota Launch Trajectory Exclusion Zone", 13.9000, 81.3000),
    ("Gahirmatha Marine Sanctuary", 20.6700, 86.9100),
    ("Sundarbans Coastal Buffer", 21.6200, 88.4000),
    ("Mahatma Gandhi Marine National Park (Wandoor)", 11.5800, 92.5800),
    ("Palk Strait IMBL Buffer (Grey Zone)", 9.7800, 79.3200),
    ("Strait of Malacca Transit Corridor", 3.6000, 99.6000),
]

# ------------------------------------------------------------------
# Vessel Name Pool (drawn from realistic Indian maritime names)
# ------------------------------------------------------------------
VESSEL_NAMES = [
    # Indian Navy / Coastguard style
    "INS VIKRANT", "INS KOLKATA", "INS DELHI", "INS MUMBAI", "INS SHIVALIK",
    "ICG SAMRAT", "ICG VIJAYA", "ICG SAMARTH", "ICG VISHWAST",
    # Indian merchant vessels
    "MV PRABHAT", "MV GANGOTRI", "MV YAMUNA", "MV SARASWATI", "MV KAVERI",
    "MT BHARAT VIJAY", "MT OCEAN TRIUMPH", "MT INDIAN GLORY", "MT DESH RATNA",
    "MV JNPT EXPRESS", "MV MUMBAI STAR", "MV CHENNAI QUEEN",
    "MV KOCHI PEARL", "MV VISAKHA SPIRIT", "MV KOLKATA PRIDE",
    "MV ANDAMAN PRINCESS", "MV LAKSHADWEEP DREAM", "MV GANGA DEVI",
    "MV BRAHMAPUTRA", "MV GODAVARI", "MV NARMADA", "MV MAHANADI",
    "FV MEENAKSHI", "FV LAKSHMI", "FV SARASWATI", "FV DURGA", "FV PARVATI",
    "FV KRISHNA DEVI", "FV KANYAKUMARI", "FV RANI LAKSHMI",
    "RV SINDHU SANKALP", "RV SINDHU SADHANA", "RV SAGAR NIDHI",
    "TV TARANGINI", "TV VARUNA",
    # International vessels in Indian waters
    "MV OCEAN PIONEER", "MT GULF TRADER", "MV ASIA CARRIER",
    "MT PERSIAN GULF", "MV CEYLON SPIRIT", "MV BAY OF BENGAL",
    "MT ARABIAN SEA", "MV MALABAR COAST", "MV COROMANDEL COAST",
    "MV SPICE ROUTE", "MT DARK TRADER 01", "MT SHADOW VESSEL 02",
    "MV ZEUS CARRIER", "MV ATLAS FREIGHT", "MV POSEIDON BULK",
    "MT ARES TANKER", "MV HERMES CARGO", "MV APOLLO EXPRESS",
    "MT TITAN CRUDE", "MV ORION BULK", "MV GEMINI CARGO",
    "MV LIBRA FREIGHT", "MT SCORPIO TANKER", "MV AQUARIUS BULK",
    "MT CAPRICORN OIL", "MV SAGITTARIUS", "MV TAURUS CARRIER",
    "MT BLACK SEA 01", "MV PACIFIC STAR", "MV ATLANTIC QUEEN",
]

# ------------------------------------------------------------------
# Vessel Type Mapping
# ------------------------------------------------------------------
VESSEL_TYPES = [
    "cargo", "tanker", "fishing", "passenger",
    "patrol", "military", "research", "tug"
]

TYPE_WEIGHTS = [35, 20, 20, 8, 5, 3, 5, 4]   # % distribution

# ------------------------------------------------------------------
# Vessel dataclass
# ------------------------------------------------------------------
@dataclass
class Vessel:
    mmsi: int
    name: str
    vessel_type: str

    lat: float = 0.0
    lon: float = 0.0
    speed: float = 0.0
    course: float = 0.0
    heading: float = 0.0

    # Route following
    origin_port: Tuple = None
    dest_port: Tuple = None
    waypoints: List[Tuple] = field(default_factory=list)
    wp_idx: int = 0
    
    # Bad actor state
    behavior: str = "normal"
    target_zone: Tuple = None
    linger_timer: int = 0

    def __post_init__(self):
        # Assign a starting position near a random port (small spread to stay in water)
        for _ in range(20):  # retry up to 20 times to avoid land
            port = random.choice(INDIAN_PORTS)
            spread = random.uniform(0.05, 0.5)
            self.lat = port[1] + random.uniform(-spread, spread)
            self.lon = port[2] + random.uniform(-spread, spread)
            self._clamp()
            if not _is_on_land(self.lat, self.lon):
                break

        # Assign speed based on type
        if self.vessel_type == "fishing":
            self.speed = random.uniform(3, 10)
        elif self.vessel_type in ("patrol", "military"):
            self.speed = random.uniform(15, 30)
        elif self.vessel_type == "tug":
            self.speed = random.uniform(4, 8)
        else:
            self.speed = random.uniform(8, 22)

        self.course = random.uniform(0, 360)
        self.heading = self.course

        # Build a random port-to-port route
        self._new_route()

    def _clamp(self):
        self.lat = max(INDIAN_BOUNDS["lat_min"], min(INDIAN_BOUNDS["lat_max"], self.lat))
        self.lon = max(INDIAN_BOUNDS["lon_min"], min(INDIAN_BOUNDS["lon_max"], self.lon))

    def _new_route(self):
        """Pick a random origin/destination and build waypoints.
        
        Key routing rule: ships crossing between Arabian Sea and Bay of
        Bengal MUST pass through CAPE_JUNCTION (south of Kanyakumari)
        to avoid sailing through the Indian subcontinent land mass.
        """
        # Modified for demo: 50% of fishing vessels act as bad actors and spawn directly in zones
        if self.vessel_type == "fishing" and random.random() < 0.50:
            self.behavior = random.choice(["trawling", "ais_dark", "rendezvous"])
            zone = random.choice(RESTRICTED_ZONES)
            self.target_zone = zone
            zone_lat, zone_lon = zone[1], zone[2]
            
            # TELEPORT directly into the restricted zone for immediate demo detection
            self.lat = zone_lat + random.uniform(-0.02, 0.02)
            self.lon = zone_lon + random.uniform(-0.02, 0.02)
            
            self.waypoints = [(zone_lat, zone_lon)]
            self.wp_idx = 0
            self.linger_timer = 100000  # Linger immediately and for a long time
            return
            
        self.behavior = "normal"
        self.target_zone = None
        
        # Pick origin side first — bias toward same-side routes (70%)
        # to keep most vessels within one ocean basin
        if random.random() < 0.7:
            # Same-side route
            same_pool = ARABIAN_PORTS if _is_arabian_sea(self.lat, self.lon) else BAY_PORTS
            if len(same_pool) >= 2:
                ports = random.sample(same_pool, 2)
            else:
                ports = random.sample(INDIAN_PORTS, 2)
            self.waypoints = [(ports[0][1], ports[0][2]), (ports[1][1], ports[1][2])]
        else:
            # Cross-coast route — MUST go around India's southern tip
            ports = random.sample(INDIAN_PORTS, 2)
            origin = ports[0]
            dest   = ports[1]
            orig_arabian = _is_arabian_sea(origin[2], origin[2])  # lon check
            dest_arabian = _is_arabian_sea(dest[2], dest[2])
            
            if orig_arabian != dest_arabian:
                # Crossing sides: insert Cape Comorin junction
                self.waypoints = [
                    (origin[1], origin[2]),
                    CAPE_JUNCTION,
                    SRI_LANKA_SOUTH,
                    (dest[1], dest[2]),
                ]
            else:
                self.waypoints = [
                    (origin[1], origin[2]),
                    (dest[1], dest[2]),
                ]
        
        self.origin_port = ports[0]
        self.dest_port   = ports[1]
        self.wp_idx = 0

    def _bearing_to(self, target_lat, target_lon):
        """Great-circle bearing from current position to target."""
        lat1 = math.radians(self.lat)
        lat2 = math.radians(target_lat)
        dlon = math.radians(target_lon - self.lon)
        x = math.sin(dlon) * math.cos(lat2)
        y = (math.cos(lat1) * math.sin(lat2)
             - math.sin(lat1) * math.cos(lat2) * math.cos(dlon))
        bearing = math.degrees(math.atan2(x, y)) % 360
        return bearing

    def _dist_to(self, target_lat, target_lon):
        """Approximate distance in degrees."""
        return math.sqrt(
            (self.lat - target_lat) ** 2 + (self.lon - target_lon) ** 2
        )

    def move(self):
        """Move toward next waypoint; pick new route when destination reached."""
        if self.wp_idx < len(self.waypoints):
            target_lat, target_lon = self.waypoints[self.wp_idx]
            dist = self._dist_to(target_lat, target_lon)

            if dist < 0.15:
                if self.behavior != "normal":
                    if self.linger_timer == 0:
                        self.linger_timer = random.randint(1000, 3000) # linger for 1000-3000 ticks

                    if self.linger_timer > 0:
                        self.linger_timer -= 1
                        # Linger around the zone based on behavior
                        if self.behavior == "trawling":
                            self.speed = random.uniform(1.5, 4.5)
                            self.course += random.gauss(5, 5) # Turn in circles
                        elif self.behavior == "ais_dark":
                            self.speed = random.uniform(0.0, 0.2) # Stop completely
                        elif self.behavior == "rendezvous":
                            self.speed = random.uniform(0.0, 0.5) # Wait slowly
                            
                        self.heading = self.course % 360
                        
                        step = self.speed * 0.00004 * UPDATE_INTERVAL * 20
                        self.lat += step * math.cos(math.radians(self.course))
                        self.lon += step * math.sin(math.radians(self.course))
                        self._clamp()
                        return
                    else:
                        # Done lingering, resume normal route
                        self._new_route()
                        return

                self.wp_idx += 1
                if self.wp_idx >= len(self.waypoints):
                    # Reached destination — pick new route
                    self._new_route()
                return

            # Steer toward waypoint with slight random drift
            desired = self._bearing_to(target_lat, target_lon)
            self.course = desired + random.gauss(0, 3)  # ±3° noise
            self.heading = self.course % 360

        # Advance position
        step = self.speed * 0.00004 * UPDATE_INTERVAL * 20  # scaled to update rate
        new_lat = self.lat + step * math.cos(math.radians(self.course))
        new_lon = self.lon + step * math.sin(math.radians(self.course))

        # Land avoidance: if new position is on land, reverse course
        if _is_on_land(new_lat, new_lon):
            self.course = (self.course + 180 + random.gauss(0, 30)) % 360
            self.heading = self.course
            new_lat = self.lat + step * math.cos(math.radians(self.course))
            new_lon = self.lon + step * math.sin(math.radians(self.course))
            # If still on land, just stay put
            if _is_on_land(new_lat, new_lon):
                return

        self.lat = new_lat
        self.lon = new_lon

        # Slight speed variation
        self.speed += random.gauss(0, 0.15)
        if self.vessel_type == "fishing":
            self.speed = max(1.0, min(12.0, self.speed))
        elif self.vessel_type in ("patrol", "military"):
            self.speed = max(10.0, min(32.0, self.speed))
        else:
            self.speed = max(3.0, min(24.0, self.speed))

        self._clamp()


# ------------------------------------------------------------------
# Build fleet
# ------------------------------------------------------------------
def build_fleet():
    fleet = []
    name_pool = VESSEL_NAMES.copy()
    random.shuffle(name_pool)

    for i in range(NUM_VESSELS):
        mmsi = 419000000 + i   # Indian MMSI range starts at 419xxxxxx
        name = name_pool[i % len(name_pool)] + (f" {i//len(name_pool)+1}" if i >= len(name_pool) else "")
        vtype = random.choices(VESSEL_TYPES, weights=TYPE_WEIGHTS, k=1)[0]
        fleet.append(Vessel(mmsi=mmsi, name=name, vessel_type=vtype))

    return fleet


# ------------------------------------------------------------------
# Main loop
# ------------------------------------------------------------------
def main():
    fleet = build_fleet()
    print(f"🚢 Indian Maritime Surveillance Generator")
    print(f"   Streaming {NUM_VESSELS} vessels on Indian Ocean shipping lanes")
    print(f"   Target: UDP {UDP_IP}:{UDP_PORT}")
    print(f"   Update interval: {UPDATE_INTERVAL}s")
    print()

    tick = 0
    while True:
        for vessel in fleet:
            vessel.move()

            packet = {
                "mmsi":    vessel.mmsi,
                "lat":     round(vessel.lat, 6),
                "lon":     round(vessel.lon, 6),
                "speed":   round(vessel.speed, 2),
                "course":  round(vessel.course % 360, 1),
                "heading": round(vessel.heading % 360, 1),
            }

            try:
                sock.sendto(
                    json.dumps(packet).encode(),
                    (UDP_IP, UDP_PORT),
                )
            except Exception as e:
                print(f"Send error: {e}")

        tick += 1
        if tick % 20 == 0:
            print(f"  ✅ Tick {tick} | {NUM_VESSELS} vessels | "
                  f"~{int(NUM_VESSELS / UPDATE_INTERVAL / 20)} avg msg/s")

        time.sleep(UPDATE_INTERVAL)


if __name__ == "__main__":
    main()