/**
 * Shopee Order History Extractor
 * 
 * Safe, client-side extraction script to export your completed order history
 * directly from your authenticated Shopee session.
 * 
 * Supported Domains:
 * - shopee.com.my (Malaysia)
 * - shopee.sg (Singapore)
 * - shopee.ph (Philippines)
 * - shopee.co.id (Indonesia)
 * - shopee.co.th (Thailand)
 * - shopee.vn (Vietnam)
 * - shopee.tw (Taiwan)
 * - shopee.com.br (Brazil)
 * 
 * How to use:
 * 1. Log in to your Shopee account in Chrome, Edge, Brave, or Firefox.
 * 2. Press F12 (or right-click -> Inspect) and switch to the "Console" tab.
 * 3. Paste this entire script into the console and press Enter.
 * 4. The script will iterate through your orders and download 'shopee_orders.json'.
 */
(async function extractShopeeOrders() {
  if (!location.hostname.includes('shopee.')) {
    alert('🛍️ Please run this script while on a Shopee website tab (e.g., shopee.com.my, shopee.sg, shopee.ph)!');
    return;
  }

  // Visual status banner
  const banner = document.createElement('div');
  banner.style.cssText = [
    'position: fixed',
    'top: 24px',
    'right: 24px',
    'z-index: 9999999',
    'background: #ee4d2d',
    'color: #ffffff',
    'padding: 16px 24px',
    'border-radius: 14px',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 14px',
    'font-weight: 600',
    'box-shadow: 0 10px 30px rgba(0,0,0,0.35)',
    'transition: all 0.3s ease',
    'display: flex',
    'align-items: center',
    'gap: 12px'
  ].join(';');

  banner.innerHTML = '<span>⏳</span><span>Connecting to Shopee order history... (0)</span>';
  document.body.appendChild(banner);

  // Helper: Format timestamp in user's local timezone (avoiding UTC day shift)
  function formatLocalDate(tsMs) {
    if (!tsMs || isNaN(tsMs)) return null;
    const d = new Date(tsMs);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Helper: Derive accurate purchase date from Shopee Order Serial Number (YYMMDD...)
  function parseOrderSNDate(sn) {
    if (!sn || typeof sn !== 'string') return null;
    const match = sn.trim().match(/^(\d{2})(\d{2})(\d{2})/);
    if (!match) return null;
    const yy = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    const dd = parseInt(match[3], 10);
    if (yy >= 15 && yy <= 35 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const year = yy >= 50 ? 1900 + yy : 2000 + yy;
      return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return null;
  }

  let offset = 0;
  const limit = 20;
  const rawOrders = [];
  let useCheckoutApi = true;

  try {
    while (true) {
      let list = [];
      let nextOffset = null;

      // Method 1: Try get_all_order_and_checkout_list first (native create_time & order_sn)
      if (useCheckoutApi) {
        try {
          const res = await fetch(`/api/v4/order/get_all_order_and_checkout_list?limit=${limit}&offset=${offset}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.data) {
              list = json.data.order_data?.details_list || json.data.details_list || [];
              nextOffset = json.data.next_offset;
            }
          } else {
            useCheckoutApi = false;
          }
        } catch (e) {
          useCheckoutApi = false;
        }
      }

      // Method 2: Fallback to get_order_list?list_type=3 if primary endpoint failed
      if (!useCheckoutApi || (list.length === 0 && offset === 0)) {
        useCheckoutApi = false;
        const res = await fetch(`/api/v4/order/get_order_list?limit=${limit}&list_type=3&offset=${offset}`);
        if (!res.ok) {
          throw new Error(`Shopee API responded with status ${res.status}`);
        }
        const json = await res.json();
        list = json?.data?.details_list || [];
        nextOffset = json?.data?.next_offset;
      }

      if (!list || list.length === 0) break;

      for (const o of list) {
        rawOrders.push(o);
      }

      banner.innerHTML = `<span>⏳</span><span>Fetching Shopee orders... (${rawOrders.length} found)</span>`;

      if (!nextOffset || nextOffset <= offset) break;
      offset = nextOffset;

      // Polite throttle between pagination requests
      await new Promise(resolve => setTimeout(resolve, 220));
    }

    // Process & Parse all orders with multi-tier date extraction
    const orders = [];
    for (let i = 0; i < rawOrders.length; i++) {
      const o = rawOrders[i];
      const paid = (o.info_card?.final_total || o.final_total || 0) / 100000;
      let origTotal = 0;
      let qtyTotal = 0;
      const itemsArr = [];
      let shopName = 'Shopee Seller';

      const cards = o.info_card?.order_list_cards || o.order_list_cards || [];
      let cardOrderSn = null;

      for (const c of cards) {
        shopName = c.shop_info?.shop_name || c.shop_info?.username || shopName;
        if (c.order_sn) cardOrderSn = c.order_sn;

        const cardItems = [];
        if (c.product_info?.item_groups && Array.isArray(c.product_info.item_groups)) {
          for (const g of c.product_info.item_groups) {
            if (Array.isArray(g.items)) cardItems.push(...g.items);
          }
        }
        if (cardItems.length === 0 && Array.isArray(c.product_info?.items)) {
          cardItems.push(...c.product_info.items);
        }
        if (cardItems.length === 0 && Array.isArray(c.items)) {
          cardItems.push(...c.items);
        }
        if (cardItems.length === 0 && Array.isArray(c.item_list)) {
          cardItems.push(...c.item_list);
        }

        for (const it of cardItems) {
          const q = it.amount || it.quantity || 1;
          const p = (it.order_price || it.price || 0) / 100000;
          const orig = (it.price_before_discount && it.price_before_discount > 0)
            ? (it.price_before_discount / 100000)
            : p;
          origTotal += orig * q;
          qtyTotal += q;
          const name = it.name || it.item_name || it.product_name || '';
          const variation = it.model_name ? ` [${it.model_name}]` : '';
          if (name) {
            itemsArr.push(`${name}${variation} (x${q})`);
          }
        }
      }

      // Tier 1: Direct timestamp (create_time, ctime, pay_time)
      const ctime = o.create_time ||
                    o.ctime ||
                    o.info_card?.create_time ||
                    o.info_card?.ctime ||
                    o.pay_time ||
                    o.info_card?.pay_time ||
                    null;

      let orderDate = null;
      if (ctime) {
        const ms = ctime < 10000000000 ? ctime * 1000 : ctime;
        orderDate = formatLocalDate(ms);
      }

      // Tier 2: Shopee Order Serial Number parsing (YYMMDD...)
      const orderSn = o.order_sn || o.info_card?.order_sn || cardOrderSn;
      if (!orderDate && orderSn) {
        orderDate = parseOrderSNDate(orderSn);
      }

      // Tier 3: Shipping tracking event timestamp
      if (!orderDate && o.shipping?.tracking_info?.ctime) {
        const ms = o.shipping.tracking_info.ctime < 10000000000
          ? o.shipping.tracking_info.ctime * 1000
          : o.shipping.tracking_info.ctime;
        orderDate = formatLocalDate(ms);
      }

      orders.push({
        orderId: String(o.info_card?.order_id || o.order_id || orderSn || ''),
        orderSn: orderSn || undefined,
        date: orderDate,
        shop: shopName,
        items: itemsArr.join('; ') || 'Shopee Order',
        qty: qtyTotal || 1,
        paid: Number(paid.toFixed(2)),
        saved: Number(Math.max(0, origTotal - paid).toFixed(2))
      });
    }

    // Pass 2: Bundle resolution & reverse-chronological interpolation
    for (let i = 0; i < orders.length; i++) {
      if (!orders[i].date) {
        // Check if part of consecutive checkout bundle (cart checkout)
        try {
          const curId = BigInt(orders[i].orderId || '0');
          if (curId > 0n) {
            for (let j = Math.max(0, i - 5); j <= Math.min(orders.length - 1, i + 5); j++) {
              if (i !== j && orders[j].date) {
                const otherId = BigInt(orders[j].orderId || '0');
                const diff = curId > otherId ? curId - otherId : otherId - curId;
                if (diff <= 10n) {
                  orders[i].date = orders[j].date;
                  break;
                }
              }
            }
          }
        } catch (e) {}

        // Fallback to neighboring orders in reverse-chronological list (never default to today)
        if (!orders[i].date) {
          for (let k = i - 1; k >= 0; k--) {
            if (orders[k].date) {
              orders[i].date = orders[k].date;
              break;
            }
          }
        }
        if (!orders[i].date) {
          for (let k = i + 1; k < orders.length; k++) {
            if (orders[k].date) {
              orders[i].date = orders[k].date;
              break;
            }
          }
        }
        if (!orders[i].date) {
          orders[i].date = formatLocalDate(Date.now());
        }
      }
      delete orders[i].orderSn;
    }

    const dataStr = JSON.stringify(orders, null, 2);

    // Attempt copying to clipboard
    try {
      await navigator.clipboard.writeText(dataStr);
    } catch (e) {
      console.warn('Clipboard write prevented by browser permission.');
    }

    // Trigger file download
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'shopee_orders.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Update banner on success
    banner.style.background = '#10b981';
    banner.innerHTML = `<span>✅</span><span>Exported ${orders.length} orders! Downloaded shopee_orders.json & copied to clipboard.</span>`;
    setTimeout(() => banner.remove(), 7000);

    console.log(`%c[ShopeeWrapped] Successfully exported ${orders.length} orders!`, 'color: #10b981; font-weight: bold; font-size: 14px;');
  } catch (err) {
    console.error('[ShopeeWrapped] Error extracting orders:', err);
    banner.style.background = '#ef4444';
    banner.innerHTML = `<span>❌</span><span>Error: ${err.message}. Check console for details.</span>`;
    setTimeout(() => banner.remove(), 7000);
  }
})();