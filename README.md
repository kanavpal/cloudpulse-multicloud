# ⚡ CloudPulse — Multi-Cloud DevOps Monitoring & Load Balancing Dashboard

> A real-time, Grafana-style monitoring dashboard that tracks, visualizes, and load-balances traffic across **AWS EC2** and **Oracle Cloud** instances — with automated failover, live health checks, and a beautiful dark-themed UI.

---

## 📌 Table of Contents

- [⚡ Quick Start — Run the Project](#-quick-start--run-the-project)
- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup (Django API)](#2-backend-setup-django-api)
  - [3. Frontend Setup (React Dashboard)](#3-frontend-setup-react-dashboard)
  - [4. Deploy Backend with Docker](#4-deploy-backend-with-docker)
  - [5. Deploy to Cloud Instances](#5-deploy-to-cloud-instances)
- [Cloud Deployment](#-cloud-deployment)
  - [AWS EC2 Deployment](#aws-ec2-deployment)
  - [Oracle Cloud Deployment](#oracle-cloud-deployment)
  - [Fix CORS on Running Container](#fix-cors-on-running-container)
- [API Endpoints](#-api-endpoints)
- [Dashboard Features Explained](#-dashboard-features-explained)
- [Environment Variables & Configuration](#-environment-variables--configuration)
- [Troubleshooting](#-troubleshooting)

---

## ⚡ Quick Start — Run the Project

> **Already set up the project?** Just follow these steps to start everything up. Copy and paste the commands below.

### 🖥 Option A: Run Everything Locally (Development Mode)

You need **two terminal windows** — one for the backend, one for the frontend.

**Terminal 1 — Start the Backend:**

```bash
cd Major_2/backend
```
```bash
.\venv\Scripts\Activate.ps1
```
```bash
python manage.py runserver 0.0.0.0:8000
```

> ✅ Backend is now running at → **http://localhost:8000**

**Terminal 2 — Start the Frontend:**

```bash
cd Major_2/frontend
```
```bash
npm start
```

> ✅ Dashboard is now running at → **http://localhost:3000** (opens automatically in your browser)

---

### 🐳 Option B: Run Backend with Docker Locally

If you prefer to run the backend inside Docker:

```bash
cd Major_2/backend
```
```bash
docker build -t cloudpulse-backend .
```
```bash
docker run -d -p 8000:8000 --name cloudpulse-api cloudpulse-backend
```

Then start the frontend:

```bash
cd Major_2/frontend
```
```bash
npm start
```

> ✅ Backend running in Docker at **http://localhost:8000** | Dashboard at **http://localhost:3000**

---

### ☁️ Option C: Start Cloud Instances + Run Frontend Locally

If the backend is already deployed on AWS & Oracle Cloud, you only need to start the **cloud containers** and run the **frontend locally**.

**Step 1 — Start the AWS EC2 container:**

```bash
ssh -i major2-key_aws.pem ubuntu@52.206.184.80
```
```bash
sudo docker start cloudpulse-api
```
```bash
exit
```

**Step 2 — Start the Oracle Cloud container:**

```bash
ssh -i ssh-key-2026-02-01_2.key ubuntu@152.67.188.94
```
```bash
sudo docker start cloudpulse-api
```
```bash
exit
```

**Step 3 — Verify both servers are up (from your local machine):**

```bash
curl http://52.206.184.80:8000/health/
```

Expected output: `{"status": "UP"}`

```bash
curl http://152.67.188.94:8000/health/
```

Expected output: `{"status": "UP"}`

**Step 4 — Start the frontend dashboard:**

```bash
cd Major_2/frontend
```
```bash
npm start
```

> ✅ Dashboard opens at **http://localhost:3000** and starts polling both cloud servers in real-time.

---

### 🛑 How to Stop Everything

**Stop the frontend:** Press `Ctrl + C` in the terminal where `npm start` is running.

**Stop the local backend:** Press `Ctrl + C` in the terminal where `python manage.py runserver` is running.

**Stop a local Docker container:**
```bash
docker stop cloudpulse-api
```

**Stop cloud containers (SSH into each instance first):**
```bash
ssh -i major2-key_aws.pem ubuntu@52.206.184.80
```
```bash
sudo docker stop cloudpulse-api
```
```bash
exit
```

---

## 🔍 Project Overview

**CloudPulse** is a Multi-Cloud DevOps monitoring and load-balancing system built as part of a Major Project. It demonstrates real-world cloud infrastructure management by deploying identical Django backend services across two cloud providers — **AWS EC2** and **Oracle Cloud** — and monitoring them through a single, unified React dashboard.

The system implements a **client-side round-robin load balancer** that automatically distributes requests between the two cloud instances and performs **automatic failover** if one server goes down. The dashboard provides real-time visibility into server health, response times, uptime, traffic distribution, and a detailed request log.

### What This Project Demonstrates

| Concept | Implementation |
|---|---|
| **Multi-Cloud Deployment** | Same Django app deployed on AWS EC2 & Oracle Cloud |
| **Containerization** | Backend Dockerized with Python 3.12 base image |
| **Load Balancing** | Client-side Round Robin algorithm with failover |
| **Health Monitoring** | Real-time `/health/` endpoint polling every 3 seconds |
| **Server Identification** | `/whoami/` endpoint returns which cloud is serving |
| **Traffic Analytics** | Live request counting, percentage splits, bar charts |
| **Automated Failover** | If one cloud goes down, traffic routes to the other |
| **CORS Handling** | Cross-Origin requests enabled for multi-server frontend |

---

## 🏗 Architecture

```
                        ┌──────────────────────────────────┐
                        │      React Frontend (Client)     │
                        │      CloudPulse Dashboard        │
                        │         localhost:3000            │
                        └───────────┬──────────────────────┘
                                    │
                      ┌─────────────┼─────────────┐
                      │   Client-Side Round Robin  │
                      │   Load Balancer + Failover │
                      └─────┬───────────────┬──────┘
                            │               │
                  ┌─────────▼──────┐  ┌─────▼──────────┐
                  │    AWS EC2     │  │  Oracle Cloud   │
                  │  52.206.184.80 │  │ 152.67.188.94   │
                  │    :8000       │  │    :8000        │
                  │  ┌──────────┐  │  │  ┌──────────┐   │
                  │  │  Docker  │  │  │  │  Docker  │   │
                  │  │ ┌──────┐ │  │  │  │ ┌──────┐ │   │
                  │  │ │Django│ │  │  │  │ │Django│ │   │
                  │  │ │ API  │ │  │  │  │ │ API  │ │   │
                  │  │ └──────┘ │  │  │  │ └──────┘ │   │
                  │  └──────────┘  │  │  └──────────┘   │
                  └────────────────┘  └─────────────────┘
```

**How it works:**

1. The React frontend polls both cloud backends every **3 seconds**
2. Health checks hit `/health/` on each server to determine UP/DOWN status
3. The **round-robin algorithm** alternates `/whoami/` requests between available servers
4. If the chosen server fails, **automatic failover** redirects to the other server
5. All metrics (response times, uptime, request counts) are computed client-side in real-time
6. The dashboard visualizes everything in a Grafana-inspired dark theme

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.12 | Runtime |
| Django | 6.0.3 | Web framework / REST API |
| SQLite | Default | Database (lightweight, demo) |
| Docker | Latest | Containerization |
| `django-cors-headers` | Latest | CORS middleware for cross-origin requests |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| Chart.js | 4.5.1 | Bar chart for traffic distribution |
| react-chartjs-2 | 5.3.1 | React wrapper for Chart.js |
| Inter + JetBrains Mono | Google Fonts | Typography |
| Vanilla CSS | — | Grafana-style dark theme styling |

### Infrastructure
| Service | Purpose |
|---|---|
| AWS EC2 | Cloud Instance #1 (us-east-1) |
| Oracle Cloud | Cloud Instance #2 |
| Docker | Container runtime on both instances |
| SSH Keys | `.pem` / `.key` for secure access |

---

## ✨ Features

- 🟢 **Real-Time Health Monitoring** — Live UP/DOWN status for each cloud server
- ⚖️ **Round Robin Load Balancing** — Even traffic distribution across providers
- 🔄 **Automatic Failover** — Seamless redirection when a server goes down
- 📊 **Traffic Distribution Chart** — Bar chart showing request counts per cloud
- 📋 **Request Log Table** — Timestamped log of every routed request
- ⏱ **Response Time Tracking** — Average latency measurements per server
- 🕐 **Uptime Tracking** — How long each server has been reachable
- 🏷 **Cloud Provider Tags** — Color-coded AWS (orange) and Oracle (red) tags
- ⚡ **Failover Indicators** — Lightning bolt icon on failover-routed requests
- 🌙 **Grafana-Style Dark Theme** — Professional monitoring dashboard UI
- 📱 **Responsive Layout** — Sidebar + panel grid layout

---

## 📁 Project Structure

```
Major_2/
│
├── backend/                        # Django Backend API
│   ├── api/                        # Health check app
│   │   ├── views.py                # GET /health/ → {"status": "UP"}
│   │   ├── urls.py                 # URL routing for /health/
│   │   ├── models.py               # (empty — no DB models needed)
│   │   └── admin.py
│   ├── store/                      # Server identification app
│   │   ├── views.py                # GET /health/ and GET /whoami/ → {"cloud": "AWS/Oracle"}
│   │   └── urls.py                 # URL routing for /whoami/
│   ├── core/                       # Django project settings
│   │   ├── settings.py             # Main configuration
│   │   ├── urls.py                 # Root URL config
│   │   ├── wsgi.py                 # WSGI entry point
│   │   └── asgi.py                 # ASGI entry point
│   ├── Dockerfile                  # Docker image definition
│   ├── .dockerignore               # Files excluded from Docker build
│   ├── requirements.txt            # Python dependencies
│   ├── manage.py                   # Django CLI
│   └── db.sqlite3                  # SQLite database
│
├── frontend/                       # React Frontend Dashboard
│   ├── public/
│   │   ├── index.html              # HTML entry with Google Fonts
│   │   ├── manifest.json           # PWA manifest
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.js                  # Main dashboard component (all logic)
│   │   ├── App.css                 # Grafana-style dark theme CSS
│   │   ├── index.js                # React entry point
│   │   └── index.css               # Global styles
│   ├── package.json                # NPM dependencies & scripts
│   └── .gitignore
│
├── fix_cors.sh                     # Script to inject CORS config into running container
├── major2-key_aws.pem              # AWS EC2 SSH private key (DO NOT COMMIT)
├── ssh-key-2026-02-01_2.key        # Oracle Cloud SSH private key (DO NOT COMMIT)
└── README.md                       # ← You are here
```

---

## 📋 Prerequisites

Make sure you have the following installed on your machine before starting:

| Tool | Minimum Version | Check Command |
|---|---|---|
| **Node.js** | v18+ | `node --version` |
| **npm** | v9+ | `npm --version` |
| **Python** | 3.12+ | `python --version` |
| **pip** | Latest | `pip --version` |
| **Docker** | Latest | `docker --version` |
| **Git** | Latest | `git --version` |

---

## 🚀 Getting Started

### 1. Clone the Repository

Open your terminal and run:

```bash
git clone <your-repo-url>
cd Major_2
```

---

### 2. Backend Setup (Django API)

#### Step 1: Navigate to the backend folder

```bash
cd backend
```

#### Step 2: Create a Python virtual environment

```bash
python -m venv venv
```

#### Step 3: Activate the virtual environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Linux / macOS:**
```bash
source venv/bin/activate
```

#### Step 4: Install Python dependencies

```bash
pip install -r requirements.txt
```

#### Step 5: Install CORS headers package (required for cross-origin requests)

```bash
pip install django-cors-headers
```

#### Step 6: Run database migrations

```bash
python manage.py migrate
```

#### Step 7: Start the Django development server

```bash
python manage.py runserver 0.0.0.0:8000
```

> ✅ The backend API is now running at **http://localhost:8000**
>
> Test it by opening these URLs in your browser:
> - Health Check: `http://localhost:8000/health/`
> - Server ID: `http://localhost:8000/whoami/`

---

### 3. Frontend Setup (React Dashboard)

Open a **new terminal window** (keep the backend running).

#### Step 1: Navigate to the frontend folder

```bash
cd frontend
```

#### Step 2: Install Node.js dependencies

```bash
npm install
```

#### Step 3: Start the React development server

```bash
npm start
```

> ✅ The dashboard is now running at **http://localhost:3000**
>
> It will automatically open in your browser. The dashboard will start polling the cloud backends and display real-time health status.

---

### 4. Deploy Backend with Docker

If you want to run the backend inside a Docker container (same as the cloud deployment):

#### Step 1: Navigate to the backend folder

```bash
cd backend
```

#### Step 2: Build the Docker image

```bash
docker build -t cloudpulse-backend .
```

#### Step 3: Run the Docker container

```bash
docker run -d -p 8000:8000 --name cloudpulse-api cloudpulse-backend
```

#### Step 4: Verify the container is running

```bash
docker ps
```

#### Step 5: Test the API from the container

```bash
curl http://localhost:8000/health/
```

Expected output:
```json
{"status": "UP"}
```

#### Stop the container when done:

```bash
docker stop cloudpulse-api
docker rm cloudpulse-api
```

---

### 5. Deploy to Cloud Instances

#### AWS EC2 Deployment

##### Step 1: SSH into the AWS EC2 instance

```bash
ssh -i major2-key_aws.pem ubuntu@52.206.184.80
```

> ⚠️ If you get a permission error on the key file, fix it first:
> ```bash
> chmod 400 major2-key_aws.pem
> ```

##### Step 2: Install Docker on the EC2 instance (if not already installed)

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

##### Step 3: Copy the project files to the instance (run from your local machine)

```bash
scp -i major2-key_aws.pem -r ./backend ubuntu@52.206.184.80:~/cloudpulse/
```

##### Step 4: Build and run the Docker container on AWS

```bash
cd ~/cloudpulse/backend
sudo docker build -t cloudpulse-backend .
sudo docker run -d -p 8000:8000 --name cloudpulse-api cloudpulse-backend
```

##### Step 5: Verify it's running

```bash
curl http://localhost:8000/health/
curl http://localhost:8000/whoami/
```

---

#### Oracle Cloud Deployment

##### Step 1: SSH into the Oracle Cloud instance

```bash
ssh -i ssh-key-2026-02-01_2.key ubuntu@152.67.188.94
```

> ⚠️ If you get a permission error on the key file, fix it first:
> ```bash
> chmod 400 ssh-key-2026-02-01_2.key
> ```

##### Step 2: Install Docker on the Oracle instance (if not already installed)

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
```

##### Step 3: Copy the project files to the instance (run from your local machine)

```bash
scp -i ssh-key-2026-02-01_2.key -r ./backend ubuntu@152.67.188.94:~/cloudpulse/
```

##### Step 4: Build and run the Docker container on Oracle

```bash
cd ~/cloudpulse/backend
sudo docker build -t cloudpulse-backend .
sudo docker run -d -p 8000:8000 --name cloudpulse-api cloudpulse-backend
```

##### Step 5: Verify it's running

```bash
curl http://localhost:8000/health/
curl http://localhost:8000/whoami/
```

---

#### Fix CORS on Running Container

If the deployed containers don't have CORS headers enabled, run the included fix script:

```bash
chmod +x fix_cors.sh
./fix_cors.sh
```

> This script injects `django-cors-headers` into the running container's Django settings and restarts it.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Example Response |
|---|---|---|---|
| `GET` | `/health/` | Health check — returns server status | `{"status": "UP"}` |
| `GET` | `/whoami/` | Server identity — returns cloud provider name | `{"cloud": "AWS"}` or `{"cloud": "ORACLE"}` |
| `GET` | `/admin/` | Django admin panel | Admin login page |

### Server IPs

| Cloud Provider | IP Address | Full Health URL | Full WhoAmI URL |
|---|---|---|---|
| **AWS EC2** | `52.206.184.80` | `http://52.206.184.80:8000/health/` | `http://52.206.184.80:8000/whoami/` |
| **Oracle Cloud** | `152.67.188.94` | `http://152.67.188.94:8000/health/` | `http://152.67.188.94:8000/whoami/` |

---

## 🖥 Dashboard Features Explained

### Stat Panels (Top Row)
| Panel | Description |
|---|---|
| **AWS EC2** | Shows UP/DOWN status and uptime of the AWS instance |
| **Oracle Cloud** | Shows UP/DOWN status and uptime of the Oracle instance |
| **Load Balancer** | Shows how many backends are active (X/2) |
| **Total Requests** | Total routed requests with AWS vs Oracle percentage split |

### Traffic Distribution (Chart)
- Bar chart comparing request counts between AWS and Oracle
- Color-coded: **Orange** = AWS, **Red** = Oracle
- Updates in real-time as new requests are routed

### Last Routed Request (Detail Panel)
- Shows which cloud provider handled the last request
- Displays hostname, region, timestamp, LB IP, and active backend count
- Includes server health details (platform, memory usage)

### Metrics Panels (Per-Cloud)
- **Total Requests** — How many requests each cloud has served
- **Avg Response Time** — Average latency in milliseconds
- **Uptime** — How long the server has been reachable since dashboard load
- **First Seen** — Timestamp of when the server first responded

### Request Log (Table)
- Chronological log of every routed request
- Shows timestamp, cloud provider (color-tagged), hostname, region, and status
- ⚡ icon indicates a **failover** event (primary server was down)
- Keeps the last **25 entries**

---

## ⚙ Environment Variables & Configuration

### Backend Configuration (`backend/core/settings.py`)

| Setting | Value | Description |
|---|---|---|
| `DEBUG` | `True` | Enable debug mode (set to `False` in production) |
| `ALLOWED_HOSTS` | `[]` | Add your server IPs for production |
| `CORS_ALLOW_ALL_ORIGINS` | `True` | Allow all origins (injected via fix_cors.sh) |

### Frontend Configuration (`frontend/src/App.js`)

| Constant | Value | Description |
|---|---|---|
| `BACKENDS` | Array of 2 servers | AWS and Oracle endpoint URLs |
| `LB_IP` | `52.206.184.80` | Load balancer display IP |
| `POLL_INTERVAL` | `3000` (3 seconds) | How often the dashboard polls backends |
| `MAX_LOG_ENTRIES` | `25` | Maximum entries in the request log table |

> 💡 **To change the cloud server IPs**, edit the `BACKENDS` array at the top of `frontend/src/App.js`.

---

## 🔧 Troubleshooting

### Common Issues

| Problem | Solution |
|---|---|
| **Frontend can't reach backend** | Check if the backend is running and CORS is enabled. Run `fix_cors.sh` on the cloud instances. |
| **Both servers show "Offline"** | Verify the cloud instances are running: `ssh` into each and run `sudo docker ps` to check containers. |
| **Permission denied on SSH key** | Run `chmod 400 <key-file>` to fix file permissions. |
| **Docker build fails** | Make sure Docker is installed and running: `sudo systemctl start docker`. |
| **Port 8000 not accessible** | Check the cloud provider's security group / firewall rules — port `8000` must be open for inbound TCP traffic. |
| **Port 3000 already in use** | Kill the existing process: `npx kill-port 3000` or change the port with `PORT=3001 npm start`. |
| **CORS errors in browser console** | SSH into the cloud instance and run `fix_cors.sh` to inject CORS headers into the Django container. |

### Useful Docker Commands

```bash
# List running containers
sudo docker ps

# View container logs
sudo docker logs cloudpulse-api

# Restart a container
sudo docker restart cloudpulse-api

# Stop and remove a container
sudo docker stop cloudpulse-api && sudo docker rm cloudpulse-api

# Rebuild and run (after code changes)
sudo docker build -t cloudpulse-backend . && sudo docker run -d -p 8000:8000 --name cloudpulse-api cloudpulse-backend
```

### Useful Django Commands

```bash
# Run migrations
python manage.py migrate

# Create admin superuser
python manage.py createsuperuser

# Start dev server
python manage.py runserver 0.0.0.0:8000

# Check for issues
python manage.py check
```

---

## 👥 Contributors

| Name | Role |
|---|---|
| — | Developer & Cloud Architect |

---

## 📄 License

This project is part of a **Major Project (Academic)** and is intended for educational and demonstration purposes.

---

<p align="center">
  <b>⚡ CloudPulse — Built with Django, React, Docker & Multi-Cloud Infrastructure</b>
</p>
