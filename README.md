# NSE India Official API Explorer & Documentation

A mobile-first, static API documentation and interactive JSON explorer styled strictly to match the official **NSE India (National Stock Exchange)** brand identity.

Designed primarily for mobile phone browsers with responsive desktop support, ready to deploy to **GitHub Pages**.

---

## 🎯 Active Endpoints Configured

### 1. Category: `MARKET DATA > (Equity) Pre-Open Market`

| Index / Universe | Official Endpoint Path | Fetch & Publication Timing |
| :--- | :--- | :--- |
| **Nifty 50** | `/api/NextApi/apiClient/cmPreOpenApi?functionName=getPreOpenData&category=NIFTY%2050&symbol=` | **`>09:08 AM (Pre-Market)`** |
| **Nifty Bank** | `/api/NextApi/apiClient/cmPreOpenApi?functionName=getPreOpenData&category=NIFTY%20BANK&symbol=` | **`>09:08 AM (Pre-Market)`** |
| **All Stocks** | `/api/NextApi/apiClient/cmPreOpenApi?functionName=getPreOpenData&category=ALL&symbol=` | **`>09:08 AM (Pre-Market)`** |

---

### 2. Category: `MARKET DATA > Large Deals`

| Endpoint | Official Path | Fetch & Publication Windows | Features |
| :--- | :--- | :--- | :--- |
| **ALL Large Deals** | `/api/snapshot-capital-market-largedeal` | 1. **`Between 9:12 AM and 9:15 AM`** (Morning Block Window)<br>2. **`After 2:20 PM`** (Afternoon Block Window)<br>3. **`After Market Hours`** (Bulk Deals & Short Selling) | **Multi-Dataset Separation Tabs**:<br>• **Bulk Deals** (`BULK_DEALS_DATA`)<br>• **Block Deals** (`BLOCK_DEALS_DATA`)<br>• **Short Selling** (`SHORT_DEALS_DATA`)<br>• **Raw Combined Payload** |

*All endpoints are populated with authentic live exchange data directly in [`data/apis.json`](data/apis.json).*

---

## 📱 Mobile-First Design & NSE Official Theme

1. **Brand Identity**:
   - **NSE Navy Blue** (`#002855`) header with official Maroon (`#A6192E`) and Orange (`#E87722`) tricolor accents.
   - Clean financial white cards (`#FFFFFF`) on soft light surface (`#F4F6F9`).
2. **Touch Ergonomics**:
   - Category filter pills (`ALL`, `Pre-Open Market`, `Large Deals`) for 1-tap segment switching.
   - Dedicated dataset sub-tabs for multi-data APIs (instantly view Bulk, Block, or Short Selling without JSON clutter).
   - 44px touch targets for 1-tap **Copy URL** and **Open in NSE** buttons.
   - Mobile-optimized JSON tree viewer with comfortable caret spacing and zero horizontal document overflow.
3. **Robust Search Engine**:
   - Punctuation-agnostic (`pre open` matches `Pre-Open`).
   - Query by keywords like `bulk deals`, `block deals`, `short selling`, `9:12am`, `2:20pm`, `pre open`.
   - 1-tap `✕` clear search button.

---

## 🚀 Running Locally

```bash
python -m http.server 8000
```
Open **[http://localhost:8000](http://localhost:8000)** on your phone or PC browser.

---

## 🌐 Deploying to GitHub Pages

1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Add Large Deals with multi-dataset separation tabs"
   git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
   git branch -M main
   git push -u origin main
   ```
2. In GitHub, go to **Settings** $\rightarrow$ **Pages** $\rightarrow$ Branch: **`main`** / Folder: **`/ (root)`** $\rightarrow$ **Save**.
3. Live in 60 seconds at `https://<YOUR_USERNAME>.github.io/<YOUR_REPO_NAME>/`.
