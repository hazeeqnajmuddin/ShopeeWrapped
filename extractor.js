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

  banner.innerHTML = '<span>⏳</span><span>Fetching Shopee orders... (0)</span>';
  document.body.appendChild(banner);

  let offset = 0;
  const limit = 20;
  const orders = [];

  try {
    while (true) {
      // list_type=3 fetches completed orders
      const res = await fetch(`/api/v4/order/get_order_list?limit=${limit}&list_type=3&offset=${offset}`);
      if (!res.ok) {
        throw new Error(`Shopee API responded with status ${res.status}`);
      }

      const json = await res.json();
      const list = json?.data?.details_list;
      if (!list || list.length === 0) break;

      for (const o of list) {
        // Shopee stores amounts multiplied by 100,000 (micro-units)
        const paid = (o.info_card?.final_total || 0) / 100000;
        let origTotal = 0;
        let qtyTotal = 0;
        const itemsArr = [];
        let shopName = 'Shopee Seller';
        let timestamp = null;

        const cards = o.info_card?.order_list_cards || [];
        for (const c of cards) {
          shopName = c.shop_info?.shop_name || c.shop_info?.username || shopName;
          
          // Collect items from product_info.item_groups (Shopee standard schema)
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

        let timestamp = null;
        const ctime = o.info_card?.ctime ||
                      o.create_time ||
                      o.ctime ||
                      o.info_card?.create_time ||
                      o.pay_time ||
                      o.info_card?.pay_time ||
                      o.shipping?.tracking_info?.ctime ||
                      null;
        if (ctime) timestamp = ctime * 1000;

        // Fallback date: Never use 'today' (which falsely places old orders at the top of recent purchases).
        // Default to the previous order's date since orders are fetched newest-to-oldest.
        let orderDate = '';
        if (timestamp) {
          orderDate = new Date(timestamp).toISOString().split('T')[0];
        } else if (orders.length > 0) {
          orderDate = orders[orders.length - 1].date;
        } else {
          orderDate = new Date().toISOString().split('T')[0];
        }

        orders.push({
          orderId: String(o.info_card?.order_id || ''),
          date: orderDate,
          shop: shopName,
          items: itemsArr.join('; ') || 'Shopee Order',
          qty: qtyTotal || 1,
          paid: Number(paid.toFixed(2)),
          saved: Number(Math.max(0, origTotal - paid).toFixed(2))
        });
      }

      banner.innerHTML = `<span>⏳</span><span>Fetching Shopee orders... (${orders.length} found)</span>`;

      const next = json.data?.next_offset;
      if (!next || next <= offset) break;
      offset = next;

      // Polite throttle between pagination requests
      await new Promise(resolve => setTimeout(resolve, 250));
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
