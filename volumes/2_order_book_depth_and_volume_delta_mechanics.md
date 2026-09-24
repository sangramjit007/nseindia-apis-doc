# Order Book Depth, Level 2 Dynamics, and Real-Time Volume Delta Mechanics

When analyzing a stock's live quote on NSE (such as `STLTECH`), it is critical to distinguish between **pending intentions** and **executed market transactions**.

---

## 1. How NSE Updates Order Book & Trade Data During Market Hours

* **Trading Session:** 9:15 AM to 3:30 PM.
* **Update Frequency:** The webpage does not use a continuous tick WebSocket; instead, the frontend polls an internal endpoint every few seconds:
  ```text
  https://www.nseindia.com/api/quote-equity?symbol=STLTECH
  ```
* **Payload Components:**
  * **`marketDeptOrderBook`**: Top 5 Bids (Buyers) and Asks (Sellers), plus `totalBuyQuantity` and `totalSellQuantity`.
  * **`priceInfo`**: Last Traded Price (`lastPrice`), Open, High, Low, Close.
  * **`preOpenMarket` / `tradeInfo`**: Cumulative `totalTradedVolume` and `totalTradedValue`.

---

## 2. Order Book (Market Depth) vs. Trade History (The Tape)

```
+-------------------------------------------------------------------------+
|                               WHAT YOU SEE                              |
+-------------------------------------------------------------------------+
| 1. ORDER BOOK (Depth / Level 2)   | 2. TRADE HISTORY (The Tape)         |
|    "Pending Orders / Intent"      |    "Executed Trades / Reality"      |
|                                   |                                     |
|    Bid Qty  |  Bid  | Ask  | Ask  |    Time      | Price   | Shares     |
|    ---------+-------+------+------|    ----------+---------+--------    |
|    15,000   | 818.5 | 818.8| 200  |    11:32:01  | 818.80  | 50,000 🐋  |
|    2,400    | 818.0 | 819.0| 1,500|    11:32:02  | 818.80  | 25,000 🐋  |
+-------------------------------------------------------------------------+
```

### A. The Danger of Relying Solely on the Order Book: "Spoofing"
* In the Order Book, buyers place limit orders (e.g., *"Buy 1,00,000 shares at ₹818.50"*).
* **The Catch:** Any limit order can be canceled in milliseconds before execution.
* Whales frequently place large phantom bids to lure retail traders into bidding the price higher, only to cancel the bids and dump shares into retail demand.
* **Core Rule:** A large bid or ask in the depth is only **an intention**, not a completed trade.

---

## 3. The Indelible Whale Footprint: Executed Volume Deltas ($\Delta V$)

What institutions **cannot cancel or fake** is volume that has already matched and executed.

Using NSE's free quote endpoint, single-tick institutional absorption can be detected via **Snapshot Volume Deltas**:

$$\Delta \text{Volume} = \text{Volume}_{\text{now}} - \text{Volume}_{t-3\text{s}}$$

* **Normal Market Churn:** $\Delta \text{Volume} \approx 50 \text{ to } 300 \text{ shares}$.
* **Whale Execution Alert:** Suddenly $\Delta \text{Volume} \ge \mathbf{50,000 \text{ shares}}$ in a 3-second snapshot:

$$\text{Trade Value} = 50,000 \times ₹818.80 = \mathbf{₹4.09 \text{ Crore}}$$

This proves with 100% certainty that a multi-crore aggressive market order swept through available liquidity.

---

## 4. Where the Order Book Shines: Order Book Imbalance (OBI)

Even though limit orders can fluctuate, the aggregate ratio of **Total Buy Quantity vs. Total Sell Quantity** serves as a strong directional pressure gauge:

$$\text{OBI Ratio} = \frac{\text{Total Buy Quantity}}{\text{Total Sell Quantity}}$$

* **Equilibrium:** Ratio between $0.8$ and $1.2$.
* **Liquidity Squeeze Trigger:** When Total Buy Quantity surges to **$1,500,000$** while Total Sell Quantity drops to **$150,000$** ($\text{Ratio} \ge 10.0$):
  * Available selling inventory is completely exhausted.
  * Price is forced to jump upward rapidly to find higher offers.

---

## 5. Free Real-Time Anomaly Detection Engine

A lightweight Python loop querying `/api/quote-equity?symbol=SYMBOL` every 3 seconds monitors two real-time triggers:

1. **Volume Spike Trigger:**
   $$\Delta \text{Volume} \ge 25,000 \text{ shares in } 3 \text{ seconds} \implies \text{Whale Alert}$$
2. **Order Book Pressure Trigger:**
   $$\frac{\text{Total Buy Quantity}}{\text{Total Sell Quantity}} \ge 3.0 \implies \text{Supply Exhaustion Alert}$$

---
*Created in `d:/1_LLM_WIKI/build-something/volumes/`*
