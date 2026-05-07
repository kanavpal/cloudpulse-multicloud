#!/bin/bash
# Fix CORS on running Django container

CONTAINER="sweet_newton"
SETTINGS="/app/core/settings.py"

# Add corsheaders to INSTALLED_APPS
sudo docker exec $CONTAINER python3 -c "
import re
with open('$SETTINGS', 'r') as f:
    content = f.read()

# Add corsheaders to INSTALLED_APPS
content = content.replace(
    \"INSTALLED_APPS = [\n    'api',\",
    \"INSTALLED_APPS = [\n    'corsheaders',\n    'api',\"
)

# Add CorsMiddleware to MIDDLEWARE
content = content.replace(
    \"'django.middleware.security.SecurityMiddleware',\",
    \"'django.middleware.security.SecurityMiddleware',\n    'corsheaders.middleware.CorsMiddleware',\"
)

# Add CORS_ALLOW_ALL_ORIGINS at the end
if 'CORS_ALLOW_ALL_ORIGINS' not in content:
    content += '\nCORS_ALLOW_ALL_ORIGINS = True\n'

with open('$SETTINGS', 'w') as f:
    f.write(content)

print('Settings updated successfully')
"

# Verify
echo "=== Checking INSTALLED_APPS ==="
sudo docker exec $CONTAINER grep -A5 "INSTALLED_APPS" $SETTINGS | head -8
echo "=== Checking MIDDLEWARE ==="
sudo docker exec $CONTAINER grep -A3 "MIDDLEWARE" $SETTINGS | head -5
echo "=== Checking CORS ==="
sudo docker exec $CONTAINER grep "CORS" $SETTINGS

# Restart the Django server inside the container
echo "=== Restarting container ==="
sudo docker restart $CONTAINER
sleep 3

# Test
echo "=== Testing health ==="
curl -s http://localhost:8000/health/
echo ""
echo "=== Testing whoami ==="
curl -s http://localhost:8000/whoami/
echo ""
echo "=== Testing CORS header ==="
curl -sI -H "Origin: http://localhost:3000" http://localhost:8000/health/ | grep -i "access-control"
echo "=== DONE ==="
