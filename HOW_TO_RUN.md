# How to Run Vault-X Grid & Gate Architecture

This guide will walk you through starting up all the decoupled components of the high-throughput maritime surveillance backend and connecting it to the frontend.

## Prerequisites
You will need **6 separate terminal windows** open (PowerShell, Command Prompt, or VS Code integrated terminals).
Ensure you have [Docker](https://www.docker.com/), [Rust (`cargo`)](https://rustup.rs/), [Node.js](https://nodejs.org/), and [Python](https://www.python.org/) installed on your Windows machine.

---

## 1. Start the Database (Terminal 1)
Spin up the PostgreSQL database with the PostGIS spatial extensions using Docker:
```bash
docker run --name vault_x_db -e POSTGRES_PASSWORD=hackathon -p 5432:5432 -d postgis/postgis
```
*(Wait a few seconds for the database to fully initialize).* 

---

## 2. Load the Marine Zones (Terminal 2)
Load the marine zones into the PostGIS database.
```bash
cd backend/scripts
pip install psycopg2-binary
python load_zones.py
```
> **Expected Output:** `Zones loaded successfully!`

---

## 3. Start the Rust Processing Engine (Terminal 3)
Start the high-speed Rust engine to ingest UDP packets and process spatial rules.
```bash
cd backend/engine
cargo run
```
> **Expected Output:** `Engine listening for vessel telemetry on UDP port 8080...`
*(Leave this terminal running!)*

---

## 4. Start the FastAPI Sidecar (Terminal 4)
Start the lightweight API that fetches alerts from Postgres for the frontend.
```bash
cd backend/api
pip install -r requirements.txt
uvicorn api:app --port 3000
```
> **Expected Output:** `Uvicorn running on http://127.0.0.1:3000`
*(Leave this terminal running!)*

---

## 5. Start the React Frontend (Terminal 5)
Start the frontend UI to visualize the active threats.
```bash
npm install
npm run dev
```
> **Expected:** Open http://localhost:5173 in your browser. 
*(Leave this terminal running!)*

---

## 6. Blast the Synthetic Data (Terminal 6)
Turn on the firehose to blast simulated AIS telemetry to the Rust engine.
```bash
cd data_generation
python generator.py
```
> **Expected Output:** `Blasting synthetic Indian subcontinent vessel data to 127.0.0.1:8080...`

---

## ✅ Verification
Check the frontend at `http://localhost:5173`. You should see red vessel markers appearing on the map in the Gulf of Mannar and logging into the right-side "Active Threats" panel!
