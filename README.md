# 🛍️ ShopeeWrapped & Spend Analyzer

A privacy-focused, client-side web application to extract, calculate, and visualize your lifetime purchase history and spending on Shopee.

---

## ⚡ Quick Start

1. **Launch the Analyzer:**
   * Double-click `launch.bat` (or open `index.html` in any web browser).
2. **Try the Demo Data:**
   * Click the **"✨ Load Demo"** button in the top right to test drive all charts, KPIs, and the Wrapped Card immediately.
   * Or drag-and-drop the included `sample_orders.json` file into the upload area.

---

## 🚀 How to Extract Your Real Shopee Orders

Shopee does not have a public API for buyers, so you can safely export your orders directly from your active browser session:

### Method A: Drag-and-Drop Bookmarklet (Easiest)
1. Open `index.html` in your browser.
2. Under **Step 1**, drag the orange button **`🛍️ Export Shopee Spend`** up to your browser's Bookmarks bar.
3. Go to [Shopee](https://shopee.com.my) (or your regional Shopee site) and log in.
4. Click the bookmark you just saved.
5. A floating orange banner will appear in the top-right corner while it pages through your completed orders.
6. Once finished, it will automatically download `shopee_orders.json` and copy the data to your clipboard.
7. Return to `index.html` and drop `shopee_orders.json` (or paste from clipboard).

### Method B: F12 Developer Console
1. Log in to your Shopee account in any desktop browser (Chrome, Edge, Brave, Firefox).
2. Press `F12` (or right-click anywhere and choose **Inspect**) and go to the **Console** tab.
3. Open `extractor.js` in this folder, copy the entire code, paste it into the Console, and press `Enter`.
4. The script will fetch your orders, download `shopee_orders.json`, and copy the JSON to your clipboard.
5. Drop or paste the file into `index.html`.

---

## 🌟 Key Features

* **🔒 100% Client-Side & Private:** All data processing occurs strictly in your browser's local memory. No accounts, backend servers, or external tracking.
* **🌍 Multi-Region Currency Support:**
  * 🇲🇾 Malaysia (`RM / MYR`)
  * 🇸🇬 Singapore (`S$ / SGD`)
  * 🇵🇭 Philippines (`₱ / PHP`)
  * 🇮🇩 Indonesia (`Rp / IDR`)
  * 🇹🇭 Thailand (`฿ / THB`)
  * 🇻🇳 Vietnam (`₫ / VND`)
  * 🇹🇼 Taiwan (`NT$ / TWD`)
  * 🇧🇷 Brazil (`R$ / BRL`)
  * 🌐 Global (`$ / USD`)
* **📊 Visual Analytics (Chart.js):**
  * Monthly spending trend bar chart with automated double-digit peak detection (9.9, 11.11, 12.12).
  * Top 5 favorite shops ranked by total spend.
  * Day-of-the-week checkout habit analysis.
* **👑 Dynamic Shopee Personas:**
  * ⚡ *Double-Digit Sale Sniper*
  * 🎟️ *Voucher Grandmaster*
  * 👑 *Shopee Platinum VIP*
  * 🛍️ *Everyday Smart Shopper*
* **🖼️ Shareable Wrapped Card:**
  * **Save as PNG Image:** High-resolution image export powered by `html2canvas`.
  * **Copy Text Summary:** Formatted text ready for WhatsApp, Telegram, or social media.
* **🔎 Searchable Order History & CSV Export:**
  * Search by product name, shop name, or order ID.
  * Sort by newest, oldest, highest spend, or lowest spend.
  * 1-click **Export to CSV**.

---

## 📁 Project Structure

```
shopee-wrapped/
├── index.html            # Main web application & analytics dashboard
├── extractor.js          # Standalone Shopee order extraction script
├── sample_orders.json    # Sample realistic dataset for testing
├── launch.bat            # 1-click launcher for Windows
└── README.md             # Documentation and usage guide
```

---

## 🔒 Security & Privacy Notice

* The extraction script only accesses the read-only endpoint `/api/v4/order/get_order_list?list_type=3` on your own authenticated session.
* It does not read passwords, credit cards, or personal addresses.
* It sends zero data over the internet—all processing is contained in your browser.
