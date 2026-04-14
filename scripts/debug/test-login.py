#!/usr/bin/env python3
import requests

# Test login API
url = "http://localhost:8080/api/auth/login"
data = {
    "phone": "13800030001",
    "password": "123456"
}

print(f"Testing login: {url}")
print(f"Data: {data}")
print("-" * 50)

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
