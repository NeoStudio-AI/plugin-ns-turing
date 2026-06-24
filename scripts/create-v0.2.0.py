#!/usr/bin/env python3
"""Create v0.2.0 GitHub Release."""
import subprocess
import json
import os

# Get token
cred = subprocess.run(
    ["git", "credential", "fill"],
    input=b"protocol=https\nhost=github.com\n",
    capture_output=True
).stdout.decode("utf-8", errors="replace")

token = None
for line in cred.splitlines():
    if line.startswith("password="):
        token = line[9:]
        break

if not token:
    print("ERROR: No token found")
    exit(1)

print(f"Token: {token[:10]}...")

# Read release notes
with open("release/v0.2.0/RELEASE_NOTES.md", "r", encoding="utf-8") as f:
    body = f.read()

print(f"Body length: {len(body)} chars")

# Step 1: Create release
payload = {
    "tag_name": "v0.2.0",
    "name": "v0.2.0 - React 18 + Spectrum Web Components Refactor",
    "body": body,
    "draft": False,
    "prerelease": False,
}

payload_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
print(f"Payload size: {len(payload_bytes)} bytes")

result = subprocess.run(
    [
        "curl.exe", "-s", "-X", "POST",
        "-H", f"Authorization: Bearer {token}",
        "-H", "Accept: application/vnd.github+json",
        "-H", "X-GitHub-Api-Version: 2022-11-28",
        "-H", "Content-Type: application/json; charset=utf-8",
        "--data-binary", "@-",
        "https://api.github.com/repos/NeoStudio-AI/plugin-ns-turing/releases",
    ],
    input=payload_bytes,
    capture_output=True,
)

stdout = result.stdout.decode("utf-8", errors="replace")
print(f"curl exit: {result.returncode}")
print(f"Response: {stdout[:500]}")

try:
    data = json.loads(stdout)
except json.JSONDecodeError:
    print("JSON decode failed")
    exit(1)

if "id" not in data:
    print(f"Failed: {data}")
    exit(1)

print(f"\n=== Release Created ===")
print(f"ID: {data['id']}")
print(f"URL: {data['html_url']}")
print(f"Upload URL: {data['upload_url']}")

# Save info
with open("release/v0.2.0/release-info.json", "w") as f:
    json.dump({
        "id": data["id"],
        "upload_url": data["upload_url"],
        "html_url": data["html_url"],
    }, f, indent=2)

# Step 2: Upload .ccx
print("\n=== Uploading .ccx ===")
with open("release/v0.2.0/NS-Turing-v0.2.0.ccx", "rb") as f:
    ccx_bytes = f.read()

upload_url = data["upload_url"].replace("{?name,label}", "?name=NS-Turing-v0.2.0.ccx")
print(f"Upload URL: {upload_url[:100]}...")

result = subprocess.run(
    [
        "curl.exe", "-s", "-X", "POST",
        "-H", f"Authorization: Bearer {token}",
        "-H", "Accept: application/vnd.github+json",
        "-H", "X-GitHub-Api-Version: 2022-11-28",
        "-H", "Content-Type: application/octet-stream",
        "--data-binary", "@-",
        upload_url,
    ],
    input=ccx_bytes,
    capture_output=True,
)

upload_stdout = result.stdout.decode("utf-8", errors="replace")
print(f"Upload exit: {result.returncode}")
print(f"Upload response: {upload_stdout[:300]}")

try:
    upload_data = json.loads(upload_stdout)
    if "id" in upload_data:
        print(f"\n=== Asset Uploaded ===")
        print(f"Name: {upload_data['name']}")
        print(f"Size: {upload_data['size']} bytes")
        print(f"Download: {upload_data['browser_download_url']}")
except json.JSONDecodeError:
    print("Upload response not JSON")

# Step 3: Mark as latest
print("\n=== Marking as latest ===")
patch_bytes = json.dumps({"latest": True}).encode("utf-8")
result = subprocess.run(
    [
        "curl.exe", "-s", "-X", "PATCH",
        "-H", f"Authorization: Bearer {token}",
        "-H", "Accept: application/vnd.github+json",
        "-H", "X-GitHub-Api-Version: 2022-11-28",
        "-H", "Content-Type: application/json",
        "--data-binary", "@-",
        f"https://api.github.com/repos/NeoStudio-AI/plugin-ns-turing/releases/{data['id']}",
    ],
    input=patch_bytes,
    capture_output=True,
)
patch_stdout = result.stdout.decode("utf-8", errors="replace")
print(f"Patch exit: {result.returncode}")
if "latest" in patch_stdout:
    print("Marked as latest: True")

print(f"\n=== DONE ===")
print(f"View: {data['html_url']}")
