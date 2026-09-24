# Institutional Order Flow Playbook: Real-Time Block Deals & Whale Accumulation

In trading, **late information is zero information**. Knowing at 6:30 PM that an institution bought a stock when the stock is already up 15% is useless for trading—it is only good for post-mortems.

To catch the move **before or as it happens**, here is the exact institutional reality of how this works and how you can get the signal in real time for free.

---

## 1. The Secret: Morning Block Deals Happen BEFORE the Market Opens!

Official Block Deals do **not** happen whenever they want during the day. SEBI strictly restricts them to two specific 15-minute windows:

### A. The Morning Block Window: 8:45 AM – 9:00 AM (Your #1 Weapon)
* While retail traders are still sleeping or waiting for 9:15 AM, institutions execute their multi-crore block deals between **8:45 AM and 9:00 AM**.
* **The market is NOT open yet! Normal cash trading starts at 9:15 AM.**
* NSE pushes the executed deals to the system between **9:05 AM and 9:08 AM**.
* **Your Edge:** If you poll the API at **9:06 AM**, you find out that a mutual fund or FII just bought 20 lakh shares of a stock at 8:50 AM. You have a **7 to 9 minute window** to position yourself before the 9:15 AM market opening bell when retail notices and rushes in!

### B. The Afternoon Block Window: 2:05 PM – 2:20 PM
* The second window runs from **2:05 PM to 2:20 PM**.
* NSE updates these deals around **2:25 PM**.
* The market closes at 3:30 PM. That gives you over **60 minutes** of live market trading to trade the reaction.

---

## 2. What About Sudden 10% Spikes at 11:30 AM or 1:00 PM?

If a stock suddenly shoots up violently at 11:30 AM, **that is NOT an official block deal window**. 

That is **Open-Market Whale Accumulation**:
* A big fund manager tells their broker: *"Buy 10,00,000 shares of STLTECH right now in the open market."*
* The broker uses an algorithmic execution engine (TWAP / Iceberg orders) to pump huge buying volume directly into the live order book.
* **No exchange report is filed for this until the evening (as a Bulk Deal).**

So how do pro traders and proprietary desks catch this the exact second it starts?

---

## 3. How to Catch Open-Market Whale Buying in True Real-Time (₹0 Cost)

Instead of waiting for a filing, you detect **Volume Anomalies** on the live tick feed:

### A. The Single-Tick Size Detector
In normal times, a mid-cap stock might trade in lots of 20, 50, or 200 shares per tick.
* When a whale strikes, you suddenly see a single tick of **50,000 shares** or **1,00,000 shares** at the ask price.
* If you listen to the live WebSocket feed (via a free broker API like Dhan or Angel One), you can set a rule:

$$\text{If Single\_Trade\_Quantity} \ge 50,000 \implies \text{SOUND THE ALARM!}$$

* This alerts you within **20 milliseconds** of the trade executing on the exchange floor.

### B. Relative Volume (RVOL) Spike Detector
You monitor the volume traded every 1 minute:
* If a stock's average 1-minute volume is 5,000 shares, and suddenly in a single 1-minute candle the volume hits **150,000 shares (30x normal)** and price breaks the high:
* **The whale has entered.** You get alerted at 11:31 AM on candle #1, while the stock has only moved 1.5%, giving you the entire rest of the rally to ride.

---

## 4. System Architecture to Build

### 1. At 9:06 AM (Morning Pre-Open Hunter):
* Query `https://www.nseindia.com/api/snapshot-capital-market-largedeal`.
* If any stock had a massive morning block deal between 8:45 AM and 9:00 AM, send an alert immediately so you are ready at 9:15 AM.

### 2. From 9:15 AM to 3:30 PM (Live Whale Spike Hunter):
* Connect to a free tick WebSocket (e.g., Dhan HQ or Angel One SmartAPI).
* Set an alert when:

$$\text{Trade Value} \ge \text{₹50 Lakhs} \quad \text{OR} \quad \text{1-min Volume} \ge 10\times \text{Average}$$

---
*Created in `d:/1_LLM_WIKI/build-something/volumes/`*
