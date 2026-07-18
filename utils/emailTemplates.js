const buildItemsTable = (items) => {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <img src="${item.image}" alt="${item.name}" width="50" height="50" style="border-radius: 6px; vertical-align: middle; margin-right: 10px;" />
        ${item.name}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Product</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const buildPriceBreakdown = (order) => {
  const rows = [
    { label: 'Subtotal', value: order.subtotal },
    { label: 'Shipping Fee', value: order.shippingFee },
    { label: 'Tax (14%)', value: order.tax }
  ];

  if (order.discount > 0) {
    rows.push({ label: `Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, value: -order.discount });
  }

  const priceRows = rows.map(r => `
    <tr>
      <td style="padding: 6px 12px; color: #555;">${r.label}</td>
      <td style="padding: 6px 12px; text-align: right; color: #555;">${r.value < 0 ? '-' : ''}$${Math.abs(r.value).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <table width="100%" style="border-collapse: collapse; margin: 10px 0;">
      ${priceRows}
      <tr style="border-top: 2px solid #333;">
        <td style="padding: 12px; font-weight: bold; font-size: 16px;">Total</td>
        <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px;">$${order.totalPrice.toFixed(2)}</td>
      </tr>
    </table>
  `;
};

const wrapInLayout = (content) => `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8" /></head>
  <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7; padding: 30px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background-color: #1a1a2e; padding: 24px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Ecommerce Store</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Ecommerce Store. All rights reserved.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

exports.orderConfirmationEmail = (order) => {
  const content = `
    <h2 style="color: #1a1a2e; margin-top: 0;">Order Confirmed! 🎉</h2>
    <p style="color: #555; line-height: 1.6;">
      Thank you for your order. Here's a summary of what you ordered:
    </p>
    <p style="color: #555;"><strong>Order ID:</strong> ${order._id}</p>
    <p style="color: #555;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>

    <h3 style="color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 8px;">Items Ordered</h3>
    ${buildItemsTable(order.items)}

    <h3 style="color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 8px;">Price Breakdown</h3>
    ${buildPriceBreakdown(order)}

    <h3 style="color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 8px;">Shipping Address</h3>
    <p style="color: #555; line-height: 1.6;">
      ${order.shippingAddress.fullName}<br/>
      ${order.shippingAddress.address}<br/>
      ${order.shippingAddress.city}, ${order.shippingAddress.country} ${order.shippingAddress.postalCode}<br/>
      Phone: ${order.shippingAddress.phone}
    </p>

    <p style="color: #555; line-height: 1.6;">
      We will notify you once your order ships. If you have any questions, feel free to contact our support team.
    </p>
  `;

  return {
    subject: 'Order Confirmation — Your Order Has Been Placed!',
    html: wrapInLayout(content)
  };
};

exports.orderStatusUpdateEmail = (order, newStatus) => {
  const statusMessages = {
    confirmed: {
      emoji: '✅',
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and is being prepared.'
    },
    processing: {
      emoji: '⚙️',
      title: 'Order Processing',
      message: 'Your order is currently being processed and will be shipped soon.'
    },
    shipped: {
      emoji: '🚚',
      title: 'Order Shipped',
      message: 'Great news! Your order has been shipped and is on its way to you.'
    },
    delivered: {
      emoji: '📦',
      title: 'Order Delivered',
      message: 'Your order has been delivered. We hope you enjoy your purchase!'
    },
    cancelled: {
      emoji: '❌',
      title: 'Order Cancelled',
      message: 'Your order has been cancelled. If you were charged, a refund will be processed shortly.'
    },
    returned: {
      emoji: '🔄',
      title: 'Order Returned',
      message: 'Your return has been processed. A refund will be issued to your original payment method.'
    }
  };

  const info = statusMessages[newStatus] || {
    emoji: 'ℹ️',
    title: `Order Status: ${newStatus}`,
    message: `Your order status has been updated to: ${newStatus}.`
  };

  const content = `
    <h2 style="color: #1a1a2e; margin-top: 0;">${info.emoji} ${info.title}</h2>
    <p style="color: #555; line-height: 1.6;">${info.message}</p>

    <table width="100%" style="border-collapse: collapse; margin: 20px 0; background-color: #f8f9fa; border-radius: 6px;">
      <tr>
        <td style="padding: 16px;"><strong>Order ID:</strong></td>
        <td style="padding: 16px;">${order._id}</td>
      </tr>
      <tr>
        <td style="padding: 16px; border-top: 1px solid #eee;"><strong>New Status:</strong></td>
        <td style="padding: 16px; border-top: 1px solid #eee;">
          <span style="background-color: #1a1a2e; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 13px; text-transform: uppercase;">${newStatus}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px; border-top: 1px solid #eee;"><strong>Total:</strong></td>
        <td style="padding: 16px; border-top: 1px solid #eee;">$${order.totalPrice.toFixed(2)}</td>
      </tr>
    </table>

    <h3 style="color: #1a1a2e; border-bottom: 1px solid #eee; padding-bottom: 8px;">Items</h3>
    ${buildItemsTable(order.items)}

    <p style="color: #555; line-height: 1.6;">
      If you have any questions regarding this update, please contact our support team.
    </p>
  `;

  return {
    subject: `Order ${info.title} — #${order._id}`,
    html: wrapInLayout(content)
  };
};
