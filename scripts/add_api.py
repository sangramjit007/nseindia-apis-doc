#!/usr/bin/env python3
"""
NSE API Documentation Helper
Interactive CLI to add new NSE APIs asking the 3 core questions:
1. API Name
2. NSE Website Path
3. Time to Publish New Data (Single or Multiple times)
"""

import os
import sys
import json
import re

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "apis.json")

def slugify(text):
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[-\s]+", "-", text).strip("-")

def main():
    print("=" * 65)
    print("      NSE API Documentation - Add New Endpoint Wizard")
    print("=" * 65)
    print("Enter the details for the new NSE endpoint:\n")

    # Question 1: API Name
    while True:
        api_name = input("1. API Name (e.g. 'Bulk & Block Deals', 'Corporate Announcements'): ").strip()
        if api_name:
            break
        print("   [!] API Name cannot be empty. Please enter a valid name.")

    # Question 2: NSE Website Path
    while True:
        path = input("\n2. NSE Website Path (e.g. '/api/snapshot-capital-market-largedeal'): ").strip()
        if path:
            if not path.startswith("/"):
                path = "/" + path
            break
        print("   [!] Path cannot be empty.")

    # Auto-detect Base URL based on path
    if "nsearchives" in path or "archives" in path or path.startswith("/products/content") or path.endswith((".csv", ".zip", ".DAT", ".dat")):
        base_url = "https://nsearchives.nseindia.com"
    else:
        base_url = "https://www.nseindia.com"

    # Question 3: Time to Publish New Data
    print("\n3. Time to Publish New Data:")
    print("   [1] Single time in a day (e.g. EOD Bhavcopy at 5:30 PM, or Pre-Open at 9:08 AM)")
    print("   [2] Multiple times in a day (e.g. Morning 9:05 AM & Afternoon 2:25 PM)")
    
    choice = input("   Choose option [1 or 2, default: 1]: ").strip() or "1"
    publish_times = []

    if choice == "2":
        frequency_type = "Multiple times daily"
        print("\n   Enter publication windows (leave Window Name blank to finish):")
        idx = 1
        while True:
            w_name = input(f"   Window #{idx} Name (e.g. 'Morning Block Window', or press Enter to finish): ").strip()
            if not w_name:
                if len(publish_times) > 0:
                    break
                print("   [!] Please add at least one time window.")
                continue
            w_time = input(f"   Window #{idx} Timing (e.g. '09:05 AM – 09:15 AM'): ").strip()
            w_desc = input(f"   Window #{idx} Description/Trigger (optional): ").strip()
            publish_times.append({
                "window": w_name,
                "time": w_time,
                "description": w_desc or "Intraday scheduled data update"
            })
            idx += 1
    else:
        frequency_type = "Once daily"
        time_str = input("   Enter Time (e.g. '05:30 PM – 06:45 PM' or '06:00 PM'): ").strip()
        desc_str = input("   Enter Note/Trigger (e.g. 'Published after market close'): ").strip()
        publish_times.append({
            "window": "Primary Schedule",
            "time": time_str or "After Market Hours",
            "description": desc_str or "Daily scheduled publication"
        })

    # Optional quick metadata
    print("\n--- Optional Details (Press Enter to use smart defaults) ---")
    category = input("Category [Market Activity / Corporate Intelligence / Daily Tape & Bhavcopy / Forensics]: ").strip()
    if not category:
        category = "Market Activity"

    description = input("Brief Description (optional): ").strip()
    if not description:
        description = f"Provides live or historical data for {api_name} from NSE."

    # Sample response prompt
    sample_res_input = input("Paste sample JSON response (or press Enter for empty placeholder): ").strip()
    sample_response = {}
    if sample_res_input:
        try:
            sample_response = json.loads(sample_res_input)
        except Exception:
            print("   [!] JSON could not be parsed. Setting sample response as string.")
            sample_response = {"raw": sample_res_input}
    else:
        sample_response = {"status": "success", "note": "Sample response placeholder"}

    # Extract query params from path if present
    parameters = []
    if "?" in path:
        query_string = path.split("?")[1]
        for pair in query_string.split("&"):
            if "=" in pair:
                k, v = pair.split("=", 1)
                parameters.append({
                    "name": k,
                    "type": "string",
                    "required": True,
                    "default": v.strip("{}"),
                    "description": f"Parameter {k}"
                })

    new_api = {
        "id": slugify(api_name),
        "name": api_name,
        "path": path,
        "baseUrl": base_url,
        "method": "GET",
        "category": category,
        "frequencyType": frequency_type,
        "publishTimes": publish_times,
        "description": description,
        "parameters": parameters,
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://www.nseindia.com/"
        },
        "sampleResponse": sample_response
    }

    # Load existing and append
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {"version": "1.0.0", "apis": []}

    # Avoid duplicate IDs
    existing_ids = [a["id"] for a in data.get("apis", [])]
    if new_api["id"] in existing_ids:
        new_api["id"] = f"{new_api['id']}-{len(existing_ids)+1}"

    data["apis"].append(new_api)

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print("\n" + "=" * 65)
    print(f"✅ Successfully added '{api_name}' to data/apis.json!")
    print(f"   ID:       {new_api['id']}")
    print(f"   Endpoint: {base_url}{path}")
    print(f"   Schedule: {frequency_type} ({len(publish_times)} windows)")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    main()
