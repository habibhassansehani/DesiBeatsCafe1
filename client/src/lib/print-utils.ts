import type { Order, Settings } from "@shared/schema";

export function formatPrice(price: number, currency: string = "Rs."): string {
  return `${currency} ${price.toLocaleString()}`;
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function printReceipt(order: Order, settings: Settings | null, copies: number = 1): void {
  const currency = settings?.currency || "Rs.";
  
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt #${order.orderNumber}</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 12px; 
          padding: 10px; 
          max-width: 300px; 
          margin: 0 auto; 
          color: #000;
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header { text-align: center; margin-bottom: 15px; }
        .header h2 { margin: 0 0 5px 0; font-size: 16px; }
        .header p { margin: 3px 0; font-size: 11px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .row span { display: inline-block; }
        .item-note { font-size: 10px; color: #555; margin-left: 15px; font-style: italic; }
        .total-row { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 15px; font-size: 11px; }
        .copy-label { text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 10px; }
        .page-break { page-break-after: always; margin-bottom: 20px; }
        @media print { 
          body { padding: 0; margin: 0; }
          @page { margin: 5mm; size: 80mm auto; }
        }
      </style>
    </head>
    <body>
      ${Array.from({ length: copies }).map((_, copyIndex) => `
        <div class="${copyIndex < copies - 1 ? 'page-break' : ''}">
          <div class="copy-label">Copy ${copyIndex + 1} of ${copies}</div>
          <div class="header">
            <h2>${settings?.cafeName || "Desi Beats Café"}</h2>
            ${settings?.cafeAddress ? `<p>${settings.cafeAddress}</p>` : ""}
            ${settings?.cafePhone ? `<p>Tel: ${settings.cafePhone}</p>` : ""}
          </div>
          <div class="divider"></div>
          <div class="row"><span>Order #:</span><span>${order.orderNumber}</span></div>
          <div class="row"><span>Date:</span><span>${formatDateTime(order.createdAt)}</span></div>
          ${order.tableName ? `<div class="row"><span>Table:</span><span>${order.tableName}</span></div>` : ""}
          <div class="row"><span>Type:</span><span style="text-transform: capitalize;">${order.type}</span></div>
          ${order.cashierName ? `<div class="row"><span>Cashier:</span><span>${order.cashierName}</span></div>` : ""}
          <div class="divider"></div>
          <div style="font-weight: bold; margin: 8px 0;">Items:</div>
          ${order.items
            .map(
              (item) => `
            <div class="row">
              <span>${item.quantity}x ${item.productName}${item.variant ? ` (${item.variant})` : ""}</span>
              <span>${formatPrice(item.price * item.quantity, currency)}</span>
            </div>
            ${item.notes ? `<div class="item-note">Note: ${item.notes}</div>` : ""}
          `
            )
            .join("")}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>${formatPrice(order.subtotal, currency)}</span></div>
          <div class="row"><span>Tax (${settings?.taxPercentage || 16}%):</span><span>${formatPrice(order.taxAmount, currency)}</span></div>
          <div class="divider"></div>
          <div class="row total-row"><span>TOTAL:</span><span>${formatPrice(order.total, currency)}</span></div>
          ${
            order.payments.length > 0
              ? `
            <div class="divider"></div>
            <div style="font-weight: bold; margin: 8px 0;">Payment:</div>
            ${order.payments
              .map(
                (p) => `
              <div class="row">
                <span style="text-transform: uppercase;">${p.method.replace("_", " ")}</span>
                <span>${formatPrice(p.amount, currency)}${p.tip > 0 ? ` (+${formatPrice(p.tip, currency)} tip)` : ""}</span>
              </div>
            `
              )
              .join("")}
          `
              : ""
          }
          <div class="divider"></div>
          <div class="footer">
            <p>${settings?.receiptFooter || "Thank you for visiting Desi Beats Café!"}</p>
          </div>
        </div>
      `).join("")}
    </body>
    </html>
  `;

  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "none";
  document.body.appendChild(printFrame);

  const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!printDocument) {
    document.body.removeChild(printFrame);
    console.error("Could not open print dialog");
    return;
  }

  printDocument.open();
  printDocument.write(receiptHtml);
  printDocument.close();

  const triggerPrint = () => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (e) {
      console.error("Print error:", e);
    }
    setTimeout(() => {
      if (document.body.contains(printFrame)) {
        document.body.removeChild(printFrame);
      }
    }, 1000);
  };

  if (printFrame.contentWindow) {
    printFrame.contentWindow.onload = triggerPrint;
    setTimeout(triggerPrint, 500);
  } else {
    triggerPrint();
  }
}
