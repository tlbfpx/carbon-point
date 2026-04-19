#!/usr/bin/env python3
import argon2
import sys

password = "123456"
ph = argon2.PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
hash = ph.hash(password)
print(f"password: {password}")
print(f"hash: {hash}")
