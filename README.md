# ⚡ CloudPulse — Multi-Cloud DevOps Monitoring & Load Balancing Dashboard

> A real-time, Grafana-style monitoring dashboard that tracks, visualizes, and load-balances traffic across **AWS EC2** and **Oracle Cloud** instances — with automated failover, live health checks, CI/CD pipeline, and a beautiful dark-themed UI.

---

## 🚀 HOW TO START THE PROJECT (Quick Reference)

### Step 1 — Start the Cloud Backends

Open **PowerShell** in the project root folder (`Major_2/`) and run:

```powershell
# Start AWS EC2 container
ssh -i "major2-key_aws.pem" -o StrictHostKeyChecking=no ubuntu@52.206.184.80 "sudo docker start sweet_newton"

# Start Oracle Cloud container
ssh -i "ssh-key-2026-02-01_2.key" -o StrictHostKeyChecking=no ubuntu@152.67.188.94 "sudo docker start naughty_goodall"
```

> ✅ Both containers now have **restart=always** — they auto-start if the server reboots. You only need this once per manual stop.

### Step 2 — Verify Cloud Backends Are Up

```powershell
# Test AWS
Invoke-WebRequest "http://52.206.184.80:8000/health/" -UseBasicParsing | Select-Object -ExpandProperty Content

# Test Oracle
Invoke-WebRequest "http://152.67.188.94:8000/health/" -UseBasicParsing | Select-Object -ExpandProperty Content
```

Expected output for both: `{"status": "UP"}`

### Step 3 — Start the Frontend Dashboard

```powershell
cd frontend
npm start
```

> ✅ Dashboard opens automatically at **http://localhost:3000**

---

## 🛑 HOW TO STOP EVERYTHING

```powershell
# Stop frontend: press Ctrl+C in the terminal

# Stop AWS container
ssh -i "major2-key_aws.pem" ubuntu@52.206.184.80 "sudo docker stop sweet_newton"

# Stop Oracle container
ssh -i "ssh-key-2026-02-01_2.key" ubuntu@152.67.188.94 "sudo docker stop naughty_goodall"
```

---

## 🔁 CI/CD — Auto Deploy on Code Push

Every time you push code to GitHub, the pipeline auto-deploys to both servers:

```powershell
# Make your changes, then:
$git = "C:\Program Files\Git\bin\git.exe"
& $git add .
& $git commit -m "your message here"
& $git push origin main
```

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
