/**
 * bills.web.ts
 * Server-side rendered HTML for the participant bill-split web page.
 * Participants open: http://localhost:3000/split/:token
 */

export function renderBillSplitPage(bill: any, queryUpiId?: string, queryOwnerName?: string): string {
  const ownerUpiId = (queryUpiId && queryUpiId.trim()) || bill.owner?.upiId || '';
  const ownerName = (queryOwnerName && queryOwnerName.trim()) || bill.owner?.upiPayeeName || bill.owner?.name || 'Bill Owner';
  const billTitle = bill.title || bill.merchantName || 'Bill';
  const totalRupees = (bill.totalPaise / 100).toFixed(2);

  const itemsJson = JSON.stringify(
    bill.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      totalPricePaise: item.totalPricePaise,
    }))
  );

  const billDataJson = JSON.stringify({
    id: bill.id,
    title: billTitle,
    merchantName: bill.merchantName,
    totalPaise: bill.totalPaise,
    subtotalPaise: bill.subtotalPaise,
    taxPaise: bill.taxPaise,
    discountPaise: bill.discountPaise,
    serviceChargePaise: bill.serviceChargePaise,
    shareToken: bill.shareToken,
    ownerUpiId,
    ownerName,
    ownerUpiVerified: Boolean(ownerUpiId) || bill.owner?.upiVerified || false,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pay Your Share — ${billTitle}</title>
  <meta name="description" content="Select what you had and pay your share of the bill from ${bill.merchantName}." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0a0a;
      --card: #141414;
      --card2: #1c1c1c;
      --border: #2a2a2a;
      --white: #f5f5f5;
      --grey: #888;
      --grey2: #555;
      --accent: #4ade80;
      --warning: #fbbf24;
      --error: #f87171;
      --gpay: #1a73e8;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--white);
      min-height: 100vh;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 480px;
      padding: 0 16px 120px;
    }

    /* Header */
    .header {
      padding: 28px 0 20px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: var(--grey);
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .header-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
    .bill-title { font-size: 24px; font-weight: 700; line-height: 1.2; }
    .merchant-name { font-size: 13px; color: var(--grey); margin-top: 4px; }
    .total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 16px;
      padding: 14px 16px;
      background: var(--card);
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .total-label { font-size: 12px; color: var(--grey); text-transform: uppercase; letter-spacing: 1px; }
    .total-amount { font-size: 22px; font-weight: 700; }

    /* Step indicators */
    .steps {
      display: flex;
      gap: 6px;
      margin-bottom: 20px;
    }
    .step-pill {
      flex: 1;
      height: 3px;
      border-radius: 2px;
      background: var(--border);
      transition: background 0.3s;
    }
    .step-pill.active { background: var(--white); }
    .step-pill.done { background: var(--accent); }

    /* Step label */
    .step-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: var(--grey);
      text-transform: uppercase;
      margin-bottom: 16px;
    }

    /* Name input */
    .name-section { margin-bottom: 24px; }
    .field-label {
      font-size: 11px;
      color: var(--grey);
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: block;
    }
    .input-field {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      color: var(--white);
      outline: none;
      transition: border-color 0.2s;
    }
    .input-field:focus { border-color: var(--white); }
    .input-field::placeholder { color: var(--grey2); }

    /* Items list */
    .items-section { margin-bottom: 24px; }
    .items-hint { font-size: 12px; color: var(--grey); margin-bottom: 12px; }
    .item-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .item-card:active { transform: scale(0.99); }
    .item-card.selected {
      border-color: var(--accent);
      background: rgba(74, 222, 128, 0.05);
    }
    .checkbox {
      width: 22px;
      height: 22px;
      border: 2px solid var(--grey2);
      border-radius: 6px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .item-card.selected .checkbox {
      border-color: var(--accent);
      background: var(--accent);
    }
    .checkmark { display: none; width: 12px; height: 12px; }
    .item-card.selected .checkmark { display: block; }
    .item-info { flex: 1; min-width: 0; }
    .item-name {
      font-size: 14px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-qty { font-size: 11px; color: var(--grey); margin-top: 2px; }
    .item-price { font-size: 15px; font-weight: 600; white-space: nowrap; }

    /* Qty selector */
    .qty-selector {
      display: none;
      align-items: center;
      gap: 12px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--border);
    }
    .item-card.selected.multi .qty-selector { display: flex; }
    .qty-btn {
      width: 32px;
      height: 32px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--card2);
      color: var(--white);
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qty-btn:active { background: var(--border); }
    .qty-display { font-size: 16px; font-weight: 600; min-width: 24px; text-align: center; }
    .qty-label { font-size: 12px; color: var(--grey); flex: 1; }
    .qty-amount { font-size: 13px; font-weight: 600; color: var(--accent); }

    /* Summary footer */
    .summary-footer {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      max-width: 480px;
      background: var(--bg);
      border-top: 1px solid var(--border);
      padding: 16px 16px 24px;
      z-index: 5;
    }
    /* Hidden steps must not leave a fixed bar on top of the name field. */
    [hidden] { display: none !important; }
    .name-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 16px 16px;
      margin-bottom: 16px;
    }
    .name-help {
      font-size: 13px;
      color: var(--grey);
      margin: 0 0 16px;
      line-height: 1.45;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .summary-label { font-size: 12px; color: var(--grey); }
    .summary-amount { font-size: 20px; font-weight: 700; }

    /* Buttons */
    .btn {
      width: 100%;
      padding: 16px;
      border-radius: var(--radius);
      border: none;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      box-sizing: border-box;
    }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn:not(:disabled):active { transform: scale(0.98); }
    .btn-primary {
      background: var(--white);
      color: var(--bg);
    }
    .btn-gpay {
      background: var(--gpay);
      color: white;
    }
    .btn-secondary {
      background: transparent;
      color: var(--white);
      border: 1px solid var(--border);
      margin-top: 8px;
    }
    .btn-upi-manual {
      background: transparent;
      color: var(--accent);
      border: 1px solid var(--accent);
      margin-top: 8px;
    }

    /* Payment result */
    .payment-section { display: none; }
    .payment-section.active { display: block; }
    .pay-breakdown {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      margin-bottom: 16px;
    }
    .pay-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }
    .pay-row-label { font-size: 13px; color: var(--grey); }
    .pay-row-val { font-size: 13px; font-weight: 500; }
    .pay-row.total { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 12px; }
    .pay-row.total .pay-row-label { font-size: 14px; color: var(--white); font-weight: 600; }
    .pay-row.total .pay-row-val { font-size: 20px; font-weight: 700; color: var(--accent); }

    .owner-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px 16px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .owner-icon { font-size: 24px; }
    .owner-name { font-size: 13px; font-weight: 600; }
    .owner-upi { font-size: 11px; color: var(--grey); margin-top: 2px; }
    .verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: var(--accent);
      font-weight: 600;
    }

    /* Success */
    .success-section { display: none; text-align: center; padding: 40px 0; }
    .success-section.active { display: block; }
    .success-icon { font-size: 64px; margin-bottom: 16px; }
    .success-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .success-subtitle { font-size: 14px; color: var(--grey); }

    /* No UPI warning */
    .no-upi-warning {
      background: rgba(251, 191, 36, 0.08);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: var(--radius);
      padding: 14px 16px;
      font-size: 13px;
      color: var(--warning);
      margin-bottom: 16px;
    }

    /* Toast */
    .toast {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(-80px);
      background: var(--card2);
      color: var(--white);
      padding: 12px 20px;
      border-radius: var(--radius);
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--border);
      z-index: 1000;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .toast.show { transform: translateX(-50%) translateY(0); }

    /* Animations */
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .fade-in { animation: fadeIn 0.3s ease both; }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="header-badge">
      <div class="dot"></div>
      SplitIt
    </div>
    <h1 class="bill-title">${escapeHtml(billTitle)}</h1>
    <div class="merchant-name">${escapeHtml(bill.merchantName)}</div>
    <div class="total-row">
      <span class="total-label">Total Bill</span>
      <span class="total-amount">₹${(bill.totalPaise / 100).toFixed(0)}</span>
    </div>
  </div>

  <!-- Step indicators -->
  <div class="steps">
    <div class="step-pill active" id="step1-pill"></div>
    <div class="step-pill" id="step2-pill"></div>
    <div class="step-pill" id="step3-pill"></div>
  </div>

  <!-- STEP 1: Name -->
  <div id="step1" class="fade-in">
    <div class="step-label">Step 1 — Who are you?</div>
    <div class="name-card">
      <label class="field-label" for="nameInput">Your name</label>
      <p class="name-help">So the table knows which share is yours. This is not the UPI name.</p>
      <input
        type="text"
        id="nameInput"
        class="input-field"
        name="guestName"
        placeholder="Type your name"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="words"
        spellcheck="false"
        enterkeyhint="next"
      />
      <button class="btn btn-primary" onclick="goStep2()" id="step1Btn" style="margin-top:16px">
        Next — Select what you ate
      </button>
    </div>
  </div>

  <!-- STEP 2: Select Items -->
  <div id="step2" hidden class="fade-in">
    <div class="step-label">Step 2 — What did you have?</div>
    <div class="items-section">
      <div class="items-hint">Tap items you had. Long press multi-qty items to split quantity.</div>
      <div id="itemsList"></div>
    </div>
  </div>

  <!-- STEP 3: Pay -->
  <div id="step3" class="payment-section" hidden>
    <div class="step-label">Step 3 — Pay your share</div>

    <div class="pay-breakdown" id="payBreakdown"></div>

    <div id="ownerInfo" class="owner-card" style="display:none">
      <span class="owner-icon">👤</span>
      <div>
        <div class="owner-name" id="ownerNameDisplay"></div>
        <div class="owner-upi" id="ownerUpiDisplay"></div>
      </div>
    </div>

    <div id="noUpiWarning" class="no-upi-warning" style="display:none">
      ⚠️ The bill owner hasn't set up a UPI ID yet. Ask them to add one in the SplitIt app.
    </div>

    <!-- QR Code for desktop / quick scan -->
    <div id="qrCodeContainer" style="text-align:center; display:none; margin: 16px 0;"></div>

    <a class="btn btn-gpay" id="payGpayBtn" href="#" onclick="return payViaGPay(event)">
      Pay with Google Pay
    </a>
    <p id="gpayHint" style="font-size:12px;color:var(--grey);text-align:center;margin-top:10px;display:none;">
      If Google Pay says the bank limit is exceeded, the money was not sent. Scan the QR from inside Google Pay, or pay this UPI ID the amount shown.
    </p>
    <button class="btn btn-upi-manual" id="payUpiBtn" onclick="payViaUpi()" style="display:none">
      Pay via Any UPI App (PhonePe / Paytm)
    </button>
    <button class="btn btn-secondary" id="copyUpiBtn" onclick="copyOwnerUpi()" style="display:none; margin-top: 8px;">
      📋 Copy UPI ID
    </button>
    <button class="btn btn-secondary" onclick="goStep2()" style="margin-top: 8px;">
      ← Change Selection
    </button>
  </div>

  <!-- SUCCESS -->
  <div id="successSection" class="success-section" hidden>
    <div class="success-icon">✅</div>
    <div class="success-title">Done!</div>
    <div class="success-subtitle">Payment initiated in your UPI app.<br>Show confirmation to the bill owner.</div>
    <br/>
    <button class="btn btn-secondary" onclick="goStep1()" style="margin-top:16px">
      Split Another Bill
    </button>
  </div>
</div>

<div class="summary-footer" id="step2Footer" hidden>
  <div class="summary-row">
    <span class="summary-label">You pay</span>
    <span class="summary-amount" id="myTotal">₹0</span>
  </div>
  <button class="btn btn-primary" onclick="goStep3()" id="step2Btn" disabled>
    Calculate My Share →
  </button>
</div>

<div id="toast" class="toast"></div>

<script>
  const BILL = ${safeJsonForScript(billDataJson)};
  const ITEMS = ${safeJsonForScript(itemsJson)};
  const selections = {}; // itemId -> { selected, qty }

  // Read URL search parameters for UPI ID and Owner Name if present
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const upiFromUrl = urlParams.get('upi');
    const nameFromUrl = urlParams.get('name');
    if (upiFromUrl && upiFromUrl.trim()) {
      BILL.ownerUpiId = decodeURIComponent(upiFromUrl.trim());
      BILL.ownerUpiVerified = true;
    }
    if (nameFromUrl && nameFromUrl.trim() && (!BILL.ownerName || BILL.ownerName === 'Bill Owner')) {
      BILL.ownerName = decodeURIComponent(nameFromUrl.trim());
    }
  } catch (e) {
    console.error('URL parse error:', e);
  }

  // ─── Utils ──────────────────────────────────────
  function fmtRupees(paise) {
    const r = Math.round(paise) / 100;
    const digits = Number.isInteger(r) ? 0 : 2;
    return '₹' + r.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: 2 });
  }
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    showToast('Copied to clipboard!');
  }
  function copyOwnerUpi() {
    if (BILL.ownerUpiId) {
      copyToClipboard(BILL.ownerUpiId);
      showToast('Copied UPI ID: ' + BILL.ownerUpiId);
    }
  }

  // ─── Step Navigation ───────────────────────────
  function showStep(id) {
    ['step1', 'step2', 'step3', 'successSection'].forEach(function (stepId) {
      const el = document.getElementById(stepId);
      if (!el) return;
      el.hidden = stepId !== id;
      el.classList.toggle('active', stepId === id);
    });
    const footer = document.getElementById('step2Footer');
    if (footer) footer.hidden = id !== 'step2';
  }

  function goStep1() {
    showStep('step1');
    const input = document.getElementById('nameInput');
    if (input) input.focus();
    updatePills(0);
  }

  function goStep2() {
    const name = document.getElementById('nameInput').value.trim();
    if (!name) {
      showToast('Type your name, then continue');
      document.getElementById('nameInput').focus();
      return;
    }
    showStep('step2');
    updatePills(1);
    renderItems();
  }

  function goStep3() {
    const myTotal = calcMyTotal();
    if (myTotal === 0) {
      showToast('Select at least one item first');
      return;
    }
    showStep('step3');
    updatePills(2);
    renderPayStep(myTotal);
  }

  function updatePills(active) {
    ['step1-pill', 'step2-pill', 'step3-pill'].forEach((id, i) => {
      const el = document.getElementById(id);
      el.className = 'step-pill' + (i < active ? ' done' : '') + (i === active ? ' active' : '');
    });
  }

  // ─── Items Rendering ───────────────────────────
  function renderItems() {
    const container = document.getElementById('itemsList');
    container.innerHTML = '';
    ITEMS.forEach(item => {
      if (!selections[item.id]) {
        selections[item.id] = { selected: false, qty: 1 };
      }
      const sel = selections[item.id];
      const isMulti = item.quantity > 1;
      const card = document.createElement('div');
      card.className = 'item-card' + (sel.selected ? ' selected' : '') + (isMulti ? ' multi' : '');
      card.id = 'card-' + item.id;

      const myAmt = sel.selected ? getItemAmount(item, sel.qty) : 0;

      card.innerHTML = \`
        <div class="checkbox">
          <svg class="checkmark" viewBox="0 0 12 12" fill="none">
            <polyline points="1.5,6 5,9.5 10.5,2.5" stroke="#0a0a0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="item-info">
          <div class="item-name">\${escapeHtml(item.name)}</div>
          <div class="item-qty">Qty: \${item.quantity}\${isMulti ? ' (tap to split)' : ''}</div>
          \${isMulti ? \`<div class="qty-selector">
            <button class="qty-btn" onclick="adjustQty(event, '\${item.id}', -1)">−</button>
            <span class="qty-display" id="qty-\${item.id}">\${sel.qty}</span>
            <span class="qty-label">of \${item.quantity}</span>
            <span class="qty-amount" id="qamt-\${item.id}">\${fmtRupees(myAmt)}</span>
            <button class="qty-btn" onclick="adjustQty(event, '\${item.id}', 1)">+</button>
          </div>\` : ''}
        </div>
        <div class="item-price">\${fmtRupees(item.totalPricePaise)}</div>
      \`;

      card.addEventListener('click', () => toggleItem(item.id));
      container.appendChild(card);
    });
    updateMyTotal();
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function toggleItem(itemId) {
    selections[itemId].selected = !selections[itemId].selected;
    const card = document.getElementById('card-' + itemId);
    card.classList.toggle('selected', selections[itemId].selected);
    updateMyTotal();
  }

  function adjustQty(e, itemId, delta) {
    e.stopPropagation();
    const item = ITEMS.find(i => i.id === itemId);
    const sel = selections[itemId];
    const newQty = Math.max(1, Math.min(item.quantity, sel.qty + delta));
    sel.qty = newQty;
    document.getElementById('qty-' + itemId).textContent = newQty;
    const myAmt = getItemAmount(item, newQty);
    document.getElementById('qamt-' + itemId).textContent = fmtRupees(myAmt);
    updateMyTotal();
  }

  function getItemAmount(item, qty) {
    if (item.quantity <= 1) return item.totalPricePaise;
    return item.unitPricePaise * qty;
  }

  function shareOf(paise, subtotal) {
    if (!BILL.subtotalPaise || !subtotal) return 0;
    return Math.round((paise || 0) * subtotal / BILL.subtotalPaise);
  }

  function calcMyTotal() {
    const subtotal = calcMySubtotal();
    const tax = shareOf(BILL.taxPaise, subtotal);
    const discount = shareOf(BILL.discountPaise, subtotal);
    const service = shareOf(BILL.serviceChargePaise, subtotal);
    return Math.max(0, subtotal + tax + service - discount);
  }

  function calcMySubtotal() {
    let s = 0;
    ITEMS.forEach(item => {
      const sel = selections[item.id];
      if (!sel || !sel.selected) return;
      s += getItemAmount(item, sel.qty);
    });
    return s;
  }

  function updateMyTotal() {
    const myTotal = calcMyTotal();
    document.getElementById('myTotal').textContent = fmtRupees(myTotal);
    document.getElementById('step2Btn').disabled = myTotal === 0;
  }

  // ─── Pay Step ─────────────────────────────────
  function renderPayStep(myTotal) {
    const name = document.getElementById('nameInput').value.trim();
    const mySub = calcMySubtotal();
    const myTax = shareOf(BILL.taxPaise, mySub);
    const myDiscount = shareOf(BILL.discountPaise, mySub);
    const myService = shareOf(BILL.serviceChargePaise, mySub);

    // Build breakdown
    const breakdown = document.getElementById('payBreakdown');
    let html = '';
    ITEMS.forEach(item => {
      const sel = selections[item.id];
      if (!sel || !sel.selected) return;
      const amt = getItemAmount(item, sel.qty);
      const label = item.quantity > 1 && sel.qty < item.quantity
        ? \`\${item.name} ×\${sel.qty}\`
        : item.name;
      html += \`<div class="pay-row"><span class="pay-row-label">\${escapeHtml(label)}</span><span class="pay-row-val">\${fmtRupees(amt)}</span></div>\`;
    });
    if (myTax > 0) html += \`<div class="pay-row"><span class="pay-row-label">GST (proportional)</span><span class="pay-row-val">\${fmtRupees(myTax)}</span></div>\`;
    if (myService > 0) html += \`<div class="pay-row"><span class="pay-row-label">Service charge</span><span class="pay-row-val">\${fmtRupees(myService)}</span></div>\`;
    if (myDiscount > 0) html += \`<div class="pay-row"><span class="pay-row-label">Discount</span><span class="pay-row-val" style="color:var(--accent)">−\${fmtRupees(myDiscount)}</span></div>\`;
    html += \`<div class="pay-row total"><span class="pay-row-label">\${escapeHtml(name)} pays</span><span class="pay-row-val">\${fmtRupees(myTotal)}</span></div>\`;
    breakdown.innerHTML = html;

    // Owner info and Payment options
    const ownerInfo = document.getElementById('ownerInfo');
    const noUpiWarn = document.getElementById('noUpiWarning');
    const gpayBtn = document.getElementById('payGpayBtn');
    const upiBtn = document.getElementById('payUpiBtn');
    const copyUpiBtn = document.getElementById('copyUpiBtn');
    const qrContainer = document.getElementById('qrCodeContainer');

    if (BILL.ownerUpiId) {
      ownerInfo.style.display = 'flex';
      document.getElementById('ownerNameDisplay').textContent = BILL.ownerName;
      document.getElementById('ownerUpiDisplay').innerHTML =
        BILL.ownerUpiId +
        (BILL.ownerUpiVerified ? ' <span class="verified-badge">✓ Verified</span>' : '');
      noUpiWarn.style.display = 'none';
      gpayBtn.style.pointerEvents = '';
      gpayBtn.style.opacity = '';
      gpayBtn.href = gpayHref();
      const hint = document.getElementById('gpayHint');
      if (hint) hint.style.display = '';
      upiBtn.style.display = '';
      if (copyUpiBtn) copyUpiBtn.style.display = '';

      if (qrContainer) {
        const upiUrl = buildUpiUrl();
        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(upiUrl);
        qrContainer.innerHTML = \`
          <div style="background:#ffffff; padding:12px; border-radius:12px; display:inline-block; box-shadow:0 4px 16px rgba(0,0,0,0.5);">
            <img src="\${qrUrl}" width="160" height="160" alt="UPI QR Code" style="display:block; border-radius:4px;"/>
          </div>
          <div style="font-size:12px; color:var(--grey); margin-top:8px;">Scan with Google Pay, PhonePe, or Paytm</div>
        \`;
        qrContainer.style.display = 'block';
      }
    } else {
      ownerInfo.style.display = 'none';
      noUpiWarn.style.display = '';
      gpayBtn.style.pointerEvents = 'none';
      gpayBtn.style.opacity = '0.4';
      gpayBtn.href = '#';
      const hint = document.getElementById('gpayHint');
      if (hint) hint.style.display = 'none';
      upiBtn.style.display = 'none';
      if (copyUpiBtn) copyUpiBtn.style.display = 'none';
      if (qrContainer) qrContainer.style.display = 'none';
    }
  }

  // ─── UPI Payment ──────────────────────────────
  function upiQuery() {
    const myTotal = calcMyTotal();
    const amountRs = (myTotal / 100).toFixed(2);
    // Keep @ in the UPI ID. Encoding it makes Google Pay show the right
    // amount and then refuse the payment as a bank limit.
    const pa = String(BILL.ownerUpiId || '').trim();
    return 'pa=' + pa + '&am=' + amountRs + '&cu=INR&tn=SplitIt';
  }

  function gpayHref() {
    const q = upiQuery();
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // Chooser, not a forced Google Pay handoff. A forced handoff to a
      // personal @okaxis ID is what the bank rejects as a limit error.
      return 'intent://pay?' + q + '#Intent;scheme=upi;end';
    }
    return 'upi://pay?' + q;
  }

  function buildUpiUrl() {
    return 'upi://pay?' + upiQuery();
  }

  function payViaGPay(e) {
    if (e) e.preventDefault();
    const myTotal = calcMyTotal();
    if (myTotal === 0 || !BILL.ownerUpiId) {
      showToast('Select items first');
      return false;
    }
    window.location.href = gpayHref();
    return false;
  }

  function payViaUpi() {
    const myTotal = calcMyTotal();
    if (myTotal === 0 || !BILL.ownerUpiId) return;
    window.location.href = buildUpiUrl();
  }

  function showSuccess() {
    showStep('successSection');
    updatePills(3);
  }

  // ─── Init ─────────────────────────────────────
  document.getElementById('nameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') goStep2();
  });
</script>
</body>
</html>`;
}

function safeJsonForScript(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
