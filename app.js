const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

// Replace the following with your actual values
const clientId = '1000.KXTGP1GAGIDX12Q294C6OIMVR60VMX';
const clientSecret = 'bb44b083c2b29eb4eefd1a605266a866fcd5f491fb';
const refreshToken = '1000.94fccafc2fd7f57ea21eee0f8cdd7955.fd557182781a6dc4059361c7bd66e041';
const redirectUri = 'https://www.google.com/';
const organizationId = '60005679410';
const apiUrl = `https://books.zoho.in/api/v3/salesorders?organization_id=${organizationId}`;

let accessToken = '';

// Function to refresh the access token
async function refreshAccessToken() {
  try {
    const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
      params: {
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'refresh_token'
      }
    });

    accessToken = response.data.access_token;
    console.log('Access token refreshed successfully');
  } catch (error) {
    console.error('Error refreshing access token:', error);
  }
}

// Refresh the access token initially
refreshAccessToken();

// Set up a timer to refresh the access token every 3600 seconds (1 hour)
setInterval(refreshAccessToken, 3600000);

app.get('/', async (req, res) => {
  const orderNumber = req.query.orderNumber;
  const page = parseInt(req.query.page) || 1;
  const perPage = 10; // Number of items per page

  let requestUrl = apiUrl;
  if (orderNumber) {
    requestUrl = `${apiUrl}&search_text=${orderNumber}`;
  }

  try {
    const response = await axios.get(requestUrl, {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken
      }
    });

    let salesOrders = [];
    let totalItems = 0;
    if (orderNumber) {
      salesOrders = response.data.salesorders || [];
      totalItems = salesOrders.length;
    } else {
      totalItems = response.data.salesorders.length;
      salesOrders = response.data.salesorders.slice((page - 1) * perPage, page * perPage);
    }

    let tableRows = '';
    if (salesOrders.length === 0) {
      tableRows = `
        <tr>
          <td colspan="11" style="text-align: center; color: red; font-weight: bold;">No sales orders found for the given order number.</td>
        </tr>
      `;
    } else {
      salesOrders.forEach(order => {
        const formattedTotal = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR'
        }).format(order.total);

        tableRows += `
          <tr class="clickable-row" data-href="/details/${order.salesorder_id}">
            <td>${order.date}</td>
            <td>${order.salesorder_number}</td>
            <td>${order.customer_name}</td>
            <td>${order.reference_number}</td>
            <td>${formattedTotal}</td>
            <td>${order.status}</td>
            <td>${order.invoiced_status}</td>
            <td>${order.payment_status}</td>
            <td>${order.expected_shipment_date}</td>
            <td>${order.order_status}</td>
            <td>${order.delivery_method}</td>
          </tr>
        `;
      });
    }

    const totalPages = Math.ceil(totalItems / perPage);
    const startItem = (page - 1) * perPage + 1;
    const endItem = Math.min(page * perPage, totalItems);

    const html = `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Orders</title>
    <style>
        :root {
            --primary-color: #3498db;
            --secondary-color: #2ecc71;
            --background-color: #ecf0f1;
            --text-color: #34495e;
            --card-background: #ffffff;
        }

        body, html {
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: 'Roboto', Arial, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 20px;
            box-sizing: border-box;
        }

        h1 {
            color: var(--primary-color);
            text-align: center;
            margin: 0 0 20px 0;
        }

        .search-container {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
        }

        input[type="text"] {
            padding: 10px;
            width: 300px;
            font-size: 16px;
            border: 2px solid var(--primary-color);
            border-radius: 5px 0 0 5px;
        }

        button {
            padding: 10px 20px;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
            font-size: 16px;
            font-weight: bold;
        }

        .search-container button {
            border-radius: 0 5px 5px 0;
        }

        button:hover {
            background-color: #2980b9;
        }

        .table-container {
            flex: 1;
            overflow: auto;
            background-color: var(--card-background);
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            min-width: 1200px;
        }

        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }

        th {
            background-color: var(--primary-color);
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        tbody tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        .clickable-row {
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .clickable-row:hover {
            background-color: #e9ecef;
        }

        .item-count {
            text-align: center;
            margin: 10px 0;
            font-size: 14px;
        }

        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 10px;
        }

        .pagination button {
            margin: 0 5px;
        }

        .pagination button.disabled {
            background-color: #bdc3c7;
            cursor: not-allowed;
        }

        .error-message {
            color: #e74c3c;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
            padding: 8px;
            background-color: #fadbd8;
            border-radius: 5px;
            font-size: 14px;
        }

        th:nth-child(1), td:nth-child(1) { width: 100px; }
        th:nth-child(2), td:nth-child(2) { width: 150px; }
        th:nth-child(3), td:nth-child(3) { width: 200px; }
        th:nth-child(4), td:nth-child(4) { width: 200px; }
        th:nth-child(5), td:nth-child(5) { width: 100px; }
        th:nth-child(6), td:nth-child(6) { width: 80px; }
        th:nth-child(7), td:nth-child(7) { width: 80px; }
        th:nth-child(8), td:nth-child(8) { width: 80px; }
        th:nth-child(9), td:nth-child(9) { width: 150px; }
        th:nth-child(10), td:nth-child(10) { width: 100px; }
        th:nth-child(11), td:nth-child(11) { width: 120px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Sales Orders</h1>
        <div class="search-container">
            <form action="/" method="GET">
                <input type="text" id="orderNumber" name="orderNumber" placeholder="Search by order number" value="${orderNumber || ''}">
                <button type="submit">Search</button>
            </form>
        </div>
        ${salesOrders.length === 0 && orderNumber ? '<div class="error-message">No sales orders found for the given order number.</div>' : ''}
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Sales Order#</th>
                        <th>Customer Name</th>
                        <th>Reference#</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Invoiced</th>
                        <th>Payment</th>
                        <th>Expected Shipment Date</th>
                        <th>Order Status</th>
                        <th>Delivery Method</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <div class="item-count">
            Showing ${startItem} - ${endItem} of ${totalItems} items
        </div>
        <div class="pagination">
            <form action="/" method="GET">
                <input type="hidden" name="page" value="${page - 1}">
                <button type="submit" ${page === 1 ? 'class="disabled"' : ''}>Previous</button>
            </form>
            <form action="/" method="GET">
                <input type="hidden" name="page" value="${page + 1}">
                <button type="submit" ${page === totalPages ? 'class="disabled"' : ''}>Next</button>
            </form>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const rows = document.querySelectorAll('.clickable-row');
            rows.forEach(row => {
                row.addEventListener('click', () => {
                    window.location.href = row.dataset.href;
                });
            });
        });
    </script>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

app.get('/details/:id', async (req, res) => {
  const orderId = req.params.id;
  const detailsUrl = `https://books.zoho.in/api/v3/salesorders/${orderId}?organization_id=${organizationId}`;

  try {
    const response = await axios.get(detailsUrl, {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken
      }
    });

    const order = response.data.salesorder;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sales Order Details</title>
    <style>
        :root {
            --primary-color: #3498db;
            --secondary-color: #2ecc71;
            --background-color: #ecf0f1;
            --text-color: #34495e;
            --card-background: #ffffff;
        }
        
        body {
            font-family: 'Roboto', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-color);
            background-color: var(--background-color);
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: var(--card-background);
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        h1, h2 {
            color: var(--primary-color);
            text-align: center;
            margin-bottom: 20px;
        }
        
        .back-button {
            display: inline-block;
            padding: 10px 20px;
            background-color: var(--primary-color);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        
        .order-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .company-info, .customer-info, .order-info {
            background-color: var(--background-color);
            padding: 20px;
            border-radius: 10px;
        }
        
        h3 {
            color: var(--secondary-color);
            margin-top: 0;
        }
        
          table {
            width: 100%;
            table-layout: fixed;
            border-collapse: separate;
            border-spacing: 0;
        }

        
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--background-color);
        }
        
        th {
            background-color: var(--primary-color);
            color: white;
        }
        
        .order-totals, .additional-info {
            background-color: var(--background-color);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .order-totals p, .additional-info p {
            margin: 10px 0;
        }
        
        @media (max-width: 768px) {
            .order-details {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <a href="/" class="back-button">Back</a>
    <div class="container">
        <h1>Sales Order Details</h1>
        <h2>Sales Order# ${order.salesorder_number}</h2>
        <div class="order-details">
            <div class="company-info">
                <h3>VC TECHNOSOLUTIONS PRIVATE LIMITED</h3>
                <p>Office No-607, 608 Mayuresh Cosmos,</p>
                <p>Plot No 37, Sector - 11, CBD Belapur</p>
                <p>Navi Mumbai Maharashtra 400614</p>
                <p>India</p>
                <p>GSTIN 27AAHCV4369B1Z8</p>
            </div>
            <div class="customer-info">
                <h3>${order.customer_name}</h3>
                <p>${order.billing_address.address}</p>
                <p>${order.billing_address.city} ${order.billing_address.state} ${order.billing_address.zip}</p>
                <p>${order.billing_address.country}</p>
                <p>GSTIN ${order.customer_gst_no || 'N/A'}</p>
            </div>
            <div class="order-info">
                <p><strong>Order Date:</strong> ${order.date}</p>
                <p><strong>Ref#:</strong> ${order.reference_number || 'N/A'}</p>
                <p><strong>Delivery Method:</strong> ${order.delivery_method || 'N/A'}</p>
                <p><strong>Place Of Supply:</strong> ${order.place_of_supply || 'N/A'}</p>
            </div>
        </div>
        
        <h3>Line Items</h3>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${order.line_items.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.name}</td>
                        <td>${item.hsn_or_sac || 'N/A'}</td>
                        <td>${item.quantity} ${item.unit || 'Nos.'}</td>
                        <td>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.rate)}</td>
                        <td>${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.item_total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="order-totals">
            <h3>Order Totals</h3>
            <p><strong>Sub Total:</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.sub_total)}</p>
            <p><strong>IGST18 (18%):</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.tax_total)}</p>
            <p><strong>Total:</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total)}</p>
        </div>
        
        <div class="additional-info">
            <h3>Additional Information</h3>
            <p><strong>SO Requested Date:</strong> ${order.custom_fields.find(f => f.label === 'SO Requested Date')?.value || 'N/A'}</p>
            <p><strong>SO Date:</strong> ${order.date}</p>
            <p><strong>SO Requested By:</strong> ${order.custom_fields.find(f => f.label === 'SO Requested By')?.value || 'N/A'}</p>
            <p><strong>SO Type:</strong> ${order.custom_fields.find(f => f.label === 'SO Type')?.value || 'N/A'}</p>
            <p><strong>Material Return Date:</strong> ${order.custom_fields.find(f => f.label === 'Material Return Date')?.value || 'N/A'}</p>
            <p><strong>Old SO No:</strong> ${order.custom_fields.find(f => f.label === 'Old SO No')?.value || 'N/A'}</p>
        </div>
    </div>
</body>
</html>
  `;

  res.send(html);
   } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
   
});
 


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});