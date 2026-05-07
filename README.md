# ⚡ CloudPulse — Multi-Cloud DevOps Monitoring & Load Balancing Dashboard

> A real-time, Grafana-style monitoring dashboard that tracks, visualizes, and load-balances traffic across **AWS EC2** and **Oracle Cloud** instances — with automated failover, live health checks, CI/CD pipeline, and a beautiful dark-themed UI.

---

## 📌 WHEN TO DO WHAT — Decision Guide

| Situation | What to do |
|---|---|
| **Normal daily start** | Start cloud servers → start frontend |
| **You changed code** | git push → pipeline auto-restarts cloud servers → start frontend |
| **Cloud servers stopped** (no code change) | SSH restart OR trigger pipeline manually |
| **Server rebooted by itself** | Nothing — `restart=always` brings containers back automatically |
| **Frontend stopped** | Just run `npm start` again |

---

## 🚀 SCENARIO 1 — Normal Daily Start (No code changes)

> Use this when you just want to open the dashboard to monitor your servers.

Open **PowerShell** inside the project root folder `Major_2\` and run these commands **one by one**:

### ▶ Start AWS EC2 backend
```powershell
ssh -i "major2-key_aws.pem" -o StrictHostKeyChecking=no ubuntu@52.206.184.80 "sudo docker start sweet_newton"
```
Expected output: `sweet_newton`

### ▶ Start Oracle Cloud backend
```powershell
ssh -i "ssh-key-2026-02-01_2.key" -o StrictHostKeyChecking=no ubuntu@152.67.188.94 "sudo docker start naughty_goodall"
```
Expected output: `naughty_goodall`

### ▶ Verify both are healthy
```powershell
Invoke-WebRequest "http://52.206.184.80:8000/health/" -UseBasicParsing | Select-Object -ExpandProperty Content
Invoke-WebRequest "http://152.67.188.94:8000/health/" -UseBasicParsing | Select-Object -ExpandProperty Content
```
Expected output for both: `{"status": "UP"}`

### ▶ Start the dashboard
```powershell
cd frontend
npm start
```
Dashboard opens at → **http://localhost:3000**

---

## 🔁 SCENARIO 2 — You Changed Code (Push + Auto-Deploy)

> Use this when you edited any file and want to deploy changes to cloud servers.

```powershell
# Run from inside Major_2\ folder
$git = "C:\Program Files\Git\bin\git.exe"
& $git add .
& $git commit -m "describe what you changed"
& $git push origin main
```

**That's it.** The CI/CD pipeline will automatically:
1. ✅ Test and build the React frontend
2. ✅ SSH into AWS → restart Docker container → health check
3. ✅ SSH into Oracle → restart Docker container → health check
4. ✅ Send Discord notification (if webhook configured)

Monitor the pipeline live → https://github.com/kanavpal/cloudpulse-multicloud/actions

Then start the frontend locally:
```powershell
cd frontend
npm start
```

---

## 🔘 SCENARIO 3 — Restart Cloud Servers Without Changing Code

> Use this when containers stopped but you have no code to push.

**Option A — Trigger pipeline manually from GitHub (recommended):**
1. Go to → https://github.com/kanavpal/cloudpulse-multicloud/actions
2. Click **"🚀 CloudPulse CI/CD Pipeline"** in the left sidebar
3. Click the **"Run workflow"** button (top right)
4. Click green **"Run workflow"** → pipeline restarts both servers

**Option B — SSH restart manually:**
```powershell
# Restart AWS
ssh -i "major2-key_aws.pem" -o StrictHostKeyChecking=no ubuntu@52.206.184.80 "sudo docker restart sweet_newton"

# Restart Oracle
ssh -i "ssh-key-2026-02-01_2.key" -o StrictHostKeyChecking=no ubuntu@152.67.188.94 "sudo docker restart naughty_goodall"
```

---

## 🛑 HOW TO STOP EVERYTHING

```powershell
# Stop frontend: press Ctrl+C in its terminal window

# Stop AWS container
ssh -i "major2-key_aws.pem" -o StrictHostKeyChecking=no ubuntu@52.206.184.80 "sudo docker stop sweet_newton"

# Stop Oracle container
ssh -i "ssh-key-2026-02-01_2.key" -o StrictHostKeyChecking=no ubuntu@152.67.188.94 "sudo docker stop naughty_goodall"
```

---


> ✅ GitHub Actions will: test → build frontend → restart AWS container → restart Oracle container

Check pipeline status: https://github.com/kanavpal/cloudpulse-multicloud/actions

---

## 📋 PROJECT AT A GLANCE

### What the Dashboard Shows
| Panel | Description |
|---|---|
| **AWS EC2 / Oracle Cloud** | Live UP/DOWN status |
| **Load Balancer** | How many backends are active (2/2) |
| **Total Requests** | Cumulative requests with % split |
| **Live Response Time** | Rolling latency chart (last 30 polls, ~90s window) |
| **Traffic Split** | Doughnut chart — AWS vs Oracle % |
| **Latency Gauges** | Color-coded bars: 🟢<200ms / 🟡<500ms / 🔴>500ms |
| **AWS Metrics / Oracle Metrics** | Requests, avg latency, uptime, first seen, **SLA %** |
| **System Overview** | Cloud providers, poll interval, LB algorithm |
| **Request Log** | Last 25 routed requests with timestamps |
| **Toast Alerts** | Pop-up when a server goes DOWN or comes back UP |

### Architecture
```
React Dashboard (localhost:3000)
        │
   Round-Robin LB + Failover (client-side)
        │
   ┌────┴────┐
   ▼         ▼
AWS EC2   Oracle Cloud
:8000      :8000
(Docker)   (Docker)
```

---

## 📁 Key Files Reference

```
Major_2/
├── frontend/
│   ├── src/App.js          ← All dashboard logic (polling, charts, SLA, toasts)
│   ├── src/App.css         ← All styling (Grafana dark theme)
│   └── package.json        ← npm dependencies
│
├── backend/
│   ├── store/views.py      ← /whoami/ endpoint (returns cloud name)
│   ├── api/views.py        ← /health/ endpoint (returns status UP)
│   ├── core/settings.py    ← Django settings (CORS, ALLOWED_HOSTS)
│   ├── Dockerfile          ← Docker image definition
│   └── docker-compose.yml  ← Docker Compose (restart:always, healthcheck)
│
├── .github/workflows/
│   ├── deploy.yml          ← CI/CD: push to main → deploy to both clouds
│   └── ci.yml              ← PR checks: test + build only
│
├── fix_cors.sh             ← Inject CORS into running container
├── major2-key_aws.pem      ← AWS SSH key (DO NOT COMMIT)
└── ssh-key-2026-02-01_2.key← Oracle SSH key (DO NOT COMMIT)
```

---

## 🔧 Configuration (Edit in App.js)

| Constant | Default | What it does |
|---|---|---|
| `BACKENDS[0]` | `52.206.184.80:8000` | AWS EC2 endpoint URLs |
| `BACKENDS[1]` | `152.67.188.94:8000` | Oracle Cloud endpoint URLs |
| `POLL_INTERVAL` | `3000` (3s) | How often dashboard polls servers |
| `MAX_LOG_ENTRIES` | `25` | Max rows in request log |

---

## 🔐 GitHub Secrets (for CI/CD)

Set at: https://github.com/kanavpal/cloudpulse-multicloud/settings/secrets/actions

| Secret | Value |
|---|---|
| `AWS_HOST` | `52.206.184.80` |
| `AWS_USER` | `ubuntu` |
| `AWS_SSH_KEY` | Contents of `major2-key_aws.pem` |
| `ORACLE_HOST` | `152.67.188.94` |
| `ORACLE_USER` | `ubuntu` |
| `ORACLE_SSH_KEY` | Contents of `ssh-key-2026-02-01_2.key` |
| `DISCORD_WEBHOOK_URL` | *(optional)* Your Discord webhook for deploy alerts |

---

## 🐳 Docker Commands (SSH into server first)

```bash
# Check what's running
sudo docker ps

# View logs
sudo docker logs sweet_newton --tail 50      # AWS
sudo docker logs naughty_goodall --tail 50   # Oracle

# Restart a container
sudo docker restart sweet_newton
sudo docker restart naughty_goodall

# Check restart policy
sudo docker inspect sweet_newton --format '{{.HostConfig.RestartPolicy.Name}}'

# Using Docker Compose (from /home/ubuntu/backend/)
sudo docker compose up -d    # start
sudo docker compose down     # stop
sudo docker compose ps       # status
```

---

## 🔗 Useful Links

| Resource | URL |
|---|---|
| **Dashboard** | http://localhost:3000 |
| **AWS Health** | http://52.206.184.80:8000/health/ |
| **AWS WhoAmI** | http://52.206.184.80:8000/whoami/ |
| **Oracle Health** | http://152.67.188.94:8000/health/ |
| **Oracle WhoAmI** | http://152.67.188.94:8000/whoami/ |
| **GitHub Repo** | https://github.com/kanavpal/cloudpulse-multicloud |
| **CI/CD Pipeline** | https://github.com/kanavpal/cloudpulse-multicloud/actions |

---

## 🚨 Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard shows servers "Offline" | SSH in and run `sudo docker start sweet_newton` / `naughty_goodall` |
| CORS errors in browser console | SSH in and run `./fix_cors.sh` |
| Port 3000 already in use | Run `npx kill-port 3000` then `npm start` |
| CI/CD pipeline failing | Check https://github.com/kanavpal/cloudpulse-multicloud/actions for logs |
| SSH permission denied | Make sure key files exist in the project root and have right permissions |
| Container keeps crashing | Run `sudo docker logs <container_name>` to see the error |

---

*⚡ CloudPulse — Built with Django, React, Docker, GitHub Actions & Multi-Cloud Infrastructure*
