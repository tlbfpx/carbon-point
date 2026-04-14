#!/usr/bin/env python3
import requests
import sys

# First login to get token
login_url = "http://localhost:8080/api/auth/login"
data = {"phone": "13800030001", "password": "123456"}

print("Logging in...")
response = requests.post(login_url, json=data)
print(f"Login status: {response.status_code}")
print(f"Login response: {response.text}")

if response.status_code != 200:
    print("Login failed")
    sys.exit(1)

result = response.json()
access_token = result["data"]["accessToken"]
print(f"\nGot token: {access_token[:60]}...")

# Now request the dashboard stats
url = "http://localhost:8080/api/reports/report/dashboard/stats"
headers = {"Authorization": f"Bearer {access_token}"}

print(f"\nRequesting {url}...")
response = requests.get(url, headers=headers)
print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
if response.status_code == 200:
    print(f"Response: {response.text}")
else:
    print(f"Response error: {response.text}")
