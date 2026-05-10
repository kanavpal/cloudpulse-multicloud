<div align="center">

# ☁️ CloudStay

### Multi-Cloud Hotel Booking Platform with Automated Failover

[![CI/CD Pipeline](https://github.com/kanavpal/cloudpulse-multicloud/actions/workflows/deploy.yml/badge.svg)](https://github.com/kanavpal/cloudpulse-multicloud/actions/workflows/deploy.yml)
[![PR Checks](https://github.com/kanavpal/cloudpulse-multicloud/actions/workflows/ci.yml/badge.svg)](https://github.com/kanavpal/cloudpulse-multicloud/actions/workflows/ci.yml)
![Django](https://img.shields.io/badge/Django-6.x-092E20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazon-aws&logoColor=white)
![Oracle](https://img.shields.io/badge/Oracle-Cloud-F80000?logo=oracle&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)

**CloudStay** is a production-grade hotel booking system deployed across **AWS EC2** and **Oracle Cloud** simultaneously. When one cloud goes down, the frontend automatically fails over to the other — bookings are never lost.

[🌐 Live Demo](#-live-endpoints) · [📐 Architecture](#-system-architecture) · [🚀 Quick Start](#-quick-start) · [🔧 CI/CD](#-cicd-pipeline)

</div>

---

## ✨ Features

| Category | Features |
|---|---|
| **🏨 Booking Platform** | Room browsing, date selection, guest management, booking history, cancellation |
| **🔐 Authentication** | JWT-based login/register, role-based access (guest vs admin), secure sessions |
| **☁️ Multi-Cloud** | Runs on AWS + Oracle simultaneously with a shared PostgreSQL database on Oracle |
| **⚡ Auto Failover** | Frontend health-checks both clouds every 4s; routes to the healthy one automatically |
| **📊 Live Monitoring** | Real-time dashboard — uptime, latency, traffic split, SLA%, request log |
| **🛡️ Admin Panel** | Booking management, revenue stats, AWS outage simulation, embedded monitoring |
| **🚀 CI/CD** | Push to `main` → tests → builds → deploys to both clouds via GitHub Actions |
| **🔔 Notifications** | Discord webhook alerts on deploy success/failure |

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                                                                     │
│   React Frontend (CloudStay)                                        │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │  apiService.js — Failover Service                        │       │
│   │  • Polls /health/ on both clouds every 4s               │       │
│   │  • Routes requests to healthy cloud (AWS primary)        │       │
│   │  • Auto-recovers to AWS after 30s if it comes back       │       │
│   └────────────────────┬───────────────────┬─────────────────┘       │
└────────────────────────│───────────────────│─────────────────────────┘
                         │                   │
          ┌──────────────▼──┐         ┌──────▼──────────────┐
          │   AWS EC2        │         │   Oracle Cloud       │
          │  (us-east-1)     │         │  (ap-mumbai-1)       │
          │                 │         │                      │
          │  Django API      │         │  Django API          │
          │  Port 8000       │         │  Port 8000           │
          │  Docker          │         │  Docker              │
          │  (cloudpulse-api)│         │  (cloudpulse-api)    │
          │                 │         │                      │
          │  52.206.184.80  │         │  152.67.188.94       │
          └──────────────┬──┘         └──────────┬───────────┘
                         │                       │
                         └──────────┬────────────┘
                                    │  Both connect to
                                    ▼
                         ┌─────────────────────┐
                         │   PostgreSQL DB      │
                         │   (Oracle Cloud)     │
                         │   Port 5432          │
                         │   Shared by both     │
                         │   API instances      │
                         └─────────────────────┘
```

### Failover Logic

```
Browser request → apiService.js
    │
    ├─ Is AWS healthy?  YES → send to AWS  ✅
    │
    └─ AWS down?
         │
         └─ Is Oracle healthy?  YES → failover to Oracle  ✅
              │
              └─ Both down? → Show error to user  ❌

Every 30s: re-check AWS → restore if back online
```

---

## 🗂️ Project Structure

```
cloudstay/
│
├── 📁 frontend/                    # React 18 SPA
│   ├── src/
│   │   ├── api/
│   │   │   └── apiService.js       # ⚡ Failover service — the heart of multi-cloud
│   │   ├── auth/
│   │   │   └── authContext.js      # JWT authentication context
│   │   ├── components/
│   │   │   ├── Navbar.js           # Navigation with auth state
│   │   │   └── Navbar.css
│   │   └── pages/
│   │       ├── LandingPage.js      # Hero + cloud status indicator
│   │       ├── RoomsPage.js        # Room listing with search + filters
│   │       ├── BookingPage.js      # Room booking form + confirmation
│   │       ├── MyBookingsPage.js   # User booking history
│   │       ├── LoginPage.js        # JWT login
│   │       ├── RegisterPage.js     # User registration
│   │       ├── AdminDashboard.js   # Admin panel + outage simulator
│   │       ├── AdminLoginPage.js   # Admin-only login
│   │       └── MonitoringDashboard.js  # 📊 Live Grafana-style monitoring
│   └── package.json
│
├── 📁 backend/                     # Django 6 REST API
│   ├── core/
│   │   └── settings.py             # Django settings (CORS, JWT, DB config)
│   ├── users/                      # Custom user model + registration/login
│   ├── bookings/                   # Room & booking models, views, serializers
│   ├── traffic/                    # Traffic logging middleware
│   ├── api/
│   │   └── views.py                # /health/ + /whoami/ endpoints
│   ├── Dockerfile                  # Multi-stage Docker build
│   ├── docker-compose.yml          # AWS deployment config
│   └── docker-compose.oracle.yml   # Oracle deployment config (includes DB)
│
├── 📁 .github/workflows/
│   ├── deploy.yml                  # 🚀 Push-to-deploy: test → build → AWS + Oracle
│   └── ci.yml                      # ✅ PR checks: lint + Django tests
│
├── fix_cors.sh                     # Emergency CORS fix script
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker & Docker Compose
- SSH access to AWS EC2 and Oracle Cloud instances

### 1. Clone the Repository

```bash
git clone https://github.com/kanavpal/cloudpulse-multicloud.git
cd cloudpulse-multicloud
```

### 2. Start the Frontend Locally

```bash
cd frontend
npm install
npm start
```

Frontend opens at → **http://localhost:3000**

### 3. Start Cloud Backends (from project root)

**Start AWS EC2 backend:**
```powershell
ssh -i "major2-key_aws.pem" -o StrictHostKeyChecking=no ubuntu@52.206.184.80 `
  "cd /home/ubuntu/repo/backend && docker-compose up -d"
```

**Start Oracle Cloud backend + database:**
```powershell
ssh -i "ssh-key-2026-02-01_2.key" -o StrictHostKeyChecking=no ubuntu@152.67.188.94 `
  "cd /home/ubuntu/repo/backend && docker-compose -f docker-compose.oracle.yml up -d"
```

### 4. Verify Health

```powershell
# Should return {"status": "UP"} for both
Invoke-WebRequest "http://52.206.184.80:8000/health/" -UseBasicParsing | Select-Object -ExpandProperty Content
Invoke-WebRequest "http://152.67.188.94:8000/health/" -UseBasicParsing | Select-Object -ExpandProperty Content
```

---

## 🔧 Local Development (Backend)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export DB_HOST=localhost
export DB_NAME=cloudstay
export DB_USER=cloudstay_user
export DB_PASSWORD=yourpassword
export CLOUD_NAME=LOCAL

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend API runs at → **http://localhost:8000**

---

## 🐳 Docker Deployment

### AWS Configuration (`docker-compose.yml`)

```yaml
# Connects to Oracle-hosted PostgreSQL for shared data
environment:
  - DB_HOST=152.67.188.94     # Oracle PostgreSQL
  - CLOUD_NAME=AWS
```

### Oracle Configuration (`docker-compose.oracle.yml`)

```yaml
# Spins up PostgreSQL alongside the API
services:
  db:        # PostgreSQL 16 — the shared database
  api:       # Django API connecting to local DB
    environment:
      - DB_HOST=cloudstay-db
      - CLOUD_NAME=Oracle
```

### Build and Run

```bash
# On AWS server
cd /home/ubuntu/repo/backend
docker build -t multicloud-django .
docker-compose up -d

# On Oracle server
docker build -t multicloud-django .
docker-compose -f docker-compose.oracle.yml up -d
```

---

## 🔄 CI/CD Pipeline

Every `git push` to `main` triggers the full pipeline automatically.

```
git push origin main
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions Pipeline                    │
│                                                         │
│  Job 1 (parallel)          Job 2 (parallel)             │
│  🧪 Frontend Tests         🐍 Backend Django Tests      │
│  - npm install             - pip install                │
│  - npm test                - manage.py migrate          │
│  - npm run build           - manage.py test             │
│  - Upload build artifact   - PostgreSQL service         │
│         │                        │                      │
│         └──────────┬─────────────┘                      │
│                    ▼ (only if both pass)                 │
│  Job 3 (parallel)          Job 4 (parallel)             │
│  🟠 Deploy → AWS EC2       🔴 Deploy → Oracle Cloud     │
│  - git fetch + reset       - git fetch + reset          │
│  - docker build            - docker build               │
│  - docker-compose up -d    - docker-compose up -d       │
│  - Health check /health/   - Health check /health/      │
│         │                        │                      │
│         └──────────┬─────────────┘                      │
│                    ▼                                     │
│         🔔 Deployment Summary + Discord alert           │
└─────────────────────────────────────────────────────────┘
```

Monitor live: **https://github.com/kanavpal/cloudpulse-multicloud/actions**

---

## 🔐 GitHub Secrets

Configure at: `Settings → Secrets and variables → Actions`

| Secret | Description |
|---|---|
| `AWS_HOST` | AWS EC2 public IP (`52.206.184.80`) |
| `AWS_USER` | SSH username (`ubuntu`) |
| `AWS_SSH_KEY` | Contents of your `.pem` key file |
| `ORACLE_HOST` | Oracle Cloud public IP (`152.67.188.94`) |
| `ORACLE_USER` | SSH username (`ubuntu`) |
| `ORACLE_SSH_KEY` | Contents of your Oracle private key |
| `DISCORD_WEBHOOK_URL` | *(Optional)* Discord channel webhook URL |

---

## 🌐 Live Endpoints

| Service | URL |
|---|---|
| **AWS Health** | http://52.206.184.80:8000/health/ |
| **AWS Identity** | http://52.206.184.80:8000/whoami/ |
| **Oracle Health** | http://152.67.188.94:8000/health/ |
| **Oracle Identity** | http://152.67.188.94:8000/whoami/ |
| **GitHub Actions** | https://github.com/kanavpal/cloudpulse-multicloud/actions |
| **Repository** | https://github.com/kanavpal/cloudpulse-multicloud |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Chart.js, Vanilla CSS |
| **Backend** | Django 6, Django REST Framework, SimpleJWT |
| **Database** | PostgreSQL 16 (hosted on Oracle Cloud, shared by both APIs) |
| **Containerization** | Docker, Docker Compose |
| **Cloud — Primary** | AWS EC2 (t2.micro, us-east-1) |
| **Cloud — Secondary** | Oracle Cloud Always-Free (VM.Standard.A1, ap-mumbai-1) |
| **CI/CD** | GitHub Actions (parallel deploy to both clouds) |
| **Authentication** | JWT (access + refresh tokens, 1h / 7d expiry) |
| **Failover** | Client-side health polling every 4s with 30s auto-recovery |

---

## 📡 API Reference

### Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/` | Returns `{"status": "UP"}` |
| `GET` | `/whoami/` | Returns `{"cloud": "AWS", "hostname": "...", "region": "..."}` |
| `POST` | `/api/auth/register/` | Create new user account |
| `POST` | `/api/auth/login/` | Login and receive JWT tokens |
| `POST` | `/api/auth/refresh/` | Refresh access token |

### Authenticated Endpoints (JWT required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rooms/` | List all available rooms |
| `GET` | `/api/rooms/{id}/` | Get room details |
| `GET` | `/api/bookings/` | List user's bookings |
| `POST` | `/api/bookings/` | Create new booking |
| `PATCH` | `/api/bookings/{id}/cancel/` | Cancel a booking |

### Admin Endpoints (Admin JWT required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/bookings/` | All bookings with client info |
| `GET` | `/api/admin/bookings/stats/` | Revenue, totals, cloud breakdown |

---

## 🔎 How Failover Works

The `apiService.js` module is the core of the multi-cloud resilience:

```javascript
// Simplified failover logic
const BACKENDS = [
  { name: "AWS",    base: "http://52.206.184.80:8000"  },
  { name: "Oracle", base: "http://152.67.188.94:8000"  },
];

// Health check every 4 seconds
// activeBackend = whichever is healthy (AWS preferred)
// All API calls go through apiFetch() which uses activeBackend
```

**Failover timeline:**
1. AWS goes offline
2. Next health check (within 4s) detects failure
3. All subsequent requests route to Oracle
4. Every 30s: AWS is re-probed
5. When AWS recovers → traffic switches back

**Zero data loss:** Both clouds read/write from the same PostgreSQL database on Oracle, so no booking data is ever lost during a failover.

---

## 🖥️ Screenshots

> The platform features a dark-themed premium UI across all pages.

| Page | Description |
|---|---|
| **Landing Page** | Hero section with live cloud status indicator |
| **Rooms Browser** | Filter by type, search, price display |
| **Booking Form** | Date picker, guest count, live price calculation |
| **Booking Confirmed** | Confirmation card with booking details |
| **My Bookings** | Full booking history with status badges |
| **Admin Dashboard** | Stats, booking table, monitoring, kill switch |
| **Monitoring Dashboard** | Live Grafana-style metrics with charts |

---

## 🚨 Troubleshooting

| Problem | Fix |
|---|---|
| Frontend shows both clouds offline | SSH into servers and run `docker-compose up -d` |
| AWS API can't reach Oracle DB | Re-apply iptables: `sudo iptables -I INPUT -p tcp --dport 5432 -j ACCEPT && sudo netfilter-persistent save` |
| CORS errors in browser | Run `./fix_cors.sh` from project root |
| Port 3000 in use | `npx kill-port 3000` then `npm start` |
| CI/CD pipeline fails | Check [Actions tab](https://github.com/kanavpal/cloudpulse-multicloud/actions) for logs |
| SSH permission denied | Ensure key files exist in project root with correct permissions |
| Container keeps restarting | `docker logs cloudpulse-api --tail 50` to see the error |
| DB connection refused | Oracle PostgreSQL container may be stopped — `docker-compose -f docker-compose.oracle.yml up -d` |

---

## 🔄 Day-to-Day Operations

### Push Code → Auto-Deploy
```bash
git add .
git commit -m "feat: your changes"
git push origin main
# Pipeline runs automatically — both clouds updated in ~3 minutes
```

### Manual Server Restart (no code changes)
Go to → https://github.com/kanavpal/cloudpulse-multicloud/actions  
Click **"🚀 CloudStay CI/CD Pipeline"** → **"Run workflow"** → **"Run workflow"**

### Stop Everything
```powershell
# Stop frontend: Ctrl+C in its terminal

# Stop AWS
ssh -i "major2-key_aws.pem" -o StrictHostKeyChecking=no ubuntu@52.206.184.80 "docker-compose down"

# Stop Oracle
ssh -i "ssh-key-2026-02-01_2.key" -o StrictHostKeyChecking=no ubuntu@152.67.188.94 "docker-compose -f docker-compose.oracle.yml down"
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request — CI checks will run automatically

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ using Django · React · Docker · AWS · Oracle Cloud · GitHub Actions**

*CloudStay — Where every stay is always available.*

</div>
