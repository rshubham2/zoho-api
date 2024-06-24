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

                function formatValue(value) {
                return (value && value !== 'not_invoiced') ? value : '—';
                }

                function formatOrderStatus(value) {
                return (value && value !== 'pending_approval') ? value : 'pending approval';
                }

                tableRows += `
                    <tr class="clickable-row" data-href="/details/${order.salesorder_id || '—' }">
                        <td data-column="date">${order.date || '—' }</td>
                        <td data-column="salesorder_number">${order.salesorder_number || '—' }</td>
                        <td data-column="customer_name">${order.customer_name || '—' }</td>
                        <td data-column="reference_number">${order.reference_number || '—' }</td>
                        <td data-column="total">${formattedTotal || '—' }</td>
                        <td data-column="status">${order.status || '—' }</td>
                        <td data-column="invoiced_status">${formatValue(order.invoiced_status || '—')}</td>
                        <td data-column="payment_status">${order.payment_status || '—' }</td>
                        <td data-column="expected_shipment_date">${order.expected_shipment_date || '—' }</td>
                        <td data-column="order_status">${formatOrderStatus(order.order_status || '—')}</td>
                        <td data-column="delivery_method">${order.delivery_method || '—' }</td>
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
        
        th[style*="display: none"] {
            width: 0;
            padding: 0;
            border: 0;
        }

        .container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            padding: 20px;
            box-sizing: border-box;
        }

        h1 {
            color: var(--primary-color);
            text-align: center;
            margin: 0 0 20px 0;
            font-size: 2rem;
        }

        .search-container {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
        }

        .search-container form {
            display: flex;
            width: 100%;
            max-width: 600px;
        }

        input[type="text"] {
            flex-grow: 1;
            padding: 10px;
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
            min-width: 1000px;
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

        .loader-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(236, 240, 241, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .loader {
            width: 50px;
            height: 50px;
            border: 5px solid var(--primary-color);
            border-top: 5px solid var(--secondary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            h1 {
                font-size: 1.5rem;
            }

            input[type="text"], button {
                font-size: 14px;
            }

            .table-container {
                margin-bottom: 10px;
            }

            table {
                min-width: 100%;
            }

            th, td {
                padding: 8px;
                font-size: 12px;
            }

            .item-count, .pagination {
                font-size: 12px;
            }
        }

        @media (max-width: 480px) {
            .search-container form {
                flex-direction: column;
            }

            input[type="text"], .search-container button {
                width: 100%;
                border-radius: 5px;
            }

            .search-container button {
                margin-top: 10px;
            }

            .pagination {
                flex-wrap: wrap;
            }

            .pagination button {
                margin: 5px;
            }
        }
        
        .custom-columns-btn {
            margin-bottom: 10px;
            background-color: var(--secondary-color);
        }

        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
        }

        .modal-content {
            background-color: #fefefe;
            margin: 15% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 500px;
            border-radius: 5px;
        }

        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }

        .close:hover,
        .close:focus {
            color: #000;
            text-decoration: none;
            cursor: pointer;
        }

        .column-list {
            list-style-type: none;
            padding: 0;
        }

        .column-list li {
            margin-bottom: 10px;
        }

        .modal-buttons {
            text-align: right;
            margin-top: 20px;
        }

        .modal-buttons button {
            margin-left: 10px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .info-row {
                flex-direction: column;
                align-items: flex-start;
            }

            .info-row > * {
                margin-bottom: 10px;
            }
        }
        
        .download-section {
            margin-top: 20px;
            padding: 20px;
            background-color: var(--card-background);
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .download-options {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .download-options input {
            width: 80px;
            padding: 5px;
        }

        .download-options button {
            padding: 8px 15px;
            background-color: var(--secondary-color);
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .download-options button:hover {
        background-color: #27ae60;
        }
    </style>
</head>
<body>
    <div class="loader-container" id="loader" style="display: none;">
        <div class="loader"></div>
    </div>
    <div class="container">
        <h1>Sales Orders</h1>
        <div class="search-container">
            <form action="/" method="GET">
                <input type="text" id="orderNumber" name="orderNumber" placeholder="Search" value="${orderNumber || ''}">
                <button type="submit">Search</button>
            </form>
        </div>
        ${salesOrders.length === 0 && orderNumber ? '<div class="error-message">No sales orders found for the given order number.</div>' : ''}
        <button id="customColumnsBtn" class="custom-columns-btn">Customize Columns</button>
        <div class="download-section">
            <h3>Download Data</h3>
            <div class="download-options">
                <label for="downloadCount">Number of records:</label>
                <input type="number" id="downloadCount" min="1" max="1000" value="100">
                <button onclick="downloadData('excel')">Download Excel</button>
                <button onclick="downloadData('csv')">Download CSV</button>
            </div>
        </div>
        <div class="table-container">
            <table id="salesOrderTable">
                <thead>
                    <tr>
                        <th data-column="date">Date</th>
                        <th data-column="salesorder_number">Sales Order#</th>
                        <th data-column="customer_name">Customer Name</th>
                        <th data-column="reference_number">Reference#</th>
                        <th data-column="total">Amount</th>
                        <th data-column="status">Status</th>
                        <th data-column="invoiced_status">Invoiced</th>
                        <th data-column="payment_status">Payment</th>
                        <th data-column="expected_shipment_date">Expected Shipment Date</th>
                        <th data-column="order_status">Order Status</th>
                        <th data-column="delivery_method">Delivery Method</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <div class="info-row">
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
    </div>

    <div id="customColumnsModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Customize Columns</h2>
            <ul class="column-list" id="columnList"></ul>
            <div class="modal-buttons">
                <button id="saveColumns">Save</button>
                <button id="cancelColumns">Cancel</button>
            </div>
        </div>
    </div>
<script>
        function saveColumnPreferences() {
        const preferences = {};
        columns.forEach(column => {
            preferences[column.name] = isColumnVisible(column.name);
        });
        localStorage.setItem('columnPreferences', JSON.stringify(preferences));
    }

    function loadColumnPreferences() {
        const savedPreferences = localStorage.getItem('columnPreferences');
        if (savedPreferences) {
            const preferences = JSON.parse(savedPreferences);
            columns.forEach(column => {
                const isVisible = preferences[column.name];
                const cells = table.querySelectorAll(\`th[data-column="\${column.name}"], td[data-column="\${column.name}"]\`);
                cells.forEach(cell => {
                    cell.style.display = isVisible ? '' : 'none';
                });
            });
        }
    }

    function showLoader() {
        document.getElementById('loader').style.display = 'flex';
    }
    
    function changePage(newPage) {
    showLoader();
    window.location.href = \`/?page=\${newPage}\`;
}

    function hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', () => {
        const rows = document.querySelectorAll('.clickable-row');
        rows.forEach(row => {
            row.addEventListener('click', () => {
                showLoader();
                window.location.href = row.dataset.href;
            });
        });

        const searchForm = document.querySelector('.search-container form');
        if (searchForm) {
            searchForm.addEventListener('submit', () => {
                showLoader();
            });
        }

        const paginationForms = document.querySelectorAll('.pagination form');
        paginationForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (form.querySelector('button').classList.contains('disabled')) {
                    e.preventDefault();
                } else {
                    showLoader();
                }
            });
        });

        // Custom columns functionality
        const customColumnsBtn = document.getElementById('customColumnsBtn');
        const customColumnsModal = document.getElementById('customColumnsModal');
        const closeBtn = document.getElementsByClassName('close')[0];
        const saveColumnsBtn = document.getElementById('saveColumns');
        const cancelColumnsBtn = document.getElementById('cancelColumns');
        const columnList = document.getElementById('columnList');
        const table = document.getElementById('salesOrderTable');

        const columns = [
            { name: 'date', label: 'Date', locked: true },
            { name: 'salesorder_number', label: 'Sales Order#', locked: true },
            { name: 'customer_name', label: 'Customer Name', locked: true },
            { name: 'reference_number', label: 'Reference#' },
            { name: 'total', label: 'Amount', locked: true },
            { name: 'status', label: 'Status' },
            { name: 'invoiced_status', label: 'Invoiced' },
            { name: 'payment_status', label: 'Payment' },
            { name: 'expected_shipment_date', label: 'Expected Shipment Date' },
            { name: 'order_status', label: 'Order Status', locked: true },
            { name: 'delivery_method', label: 'Delivery Method' }
        ];

        function populateColumnList() {
            columnList.innerHTML = '';
            columns.forEach(column => {
                const li = document.createElement('li');
                li.innerHTML = \`
                    <label>
                        <input type="checkbox" name="column" value="\${column.name}" 
                            \${isColumnVisible(column.name) ? 'checked' : ''} 
                            \${column.locked ? 'disabled' : ''}>
                        \${column.label}
                    </label>
                \`;
                columnList.appendChild(li);
            });
        }

        function isColumnVisible(columnName) {
            const th = table.querySelector(\`th[data-column="\${columnName}"]\`);
            return th.style.display !== 'none';
        }

        function toggleColumns() {
            const checkboxes = columnList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                const columnName = checkbox.value;
                const cells = table.querySelectorAll(\`th[data-column="\${columnName}"], td[data-column="\${columnName}"]\`);
                cells.forEach(cell => {
                    cell.style.display = checkbox.checked ? '' : 'none';
                });
            });
        }

        customColumnsBtn.onclick = function() {
            populateColumnList();
            customColumnsModal.style.display = "block";
        }

        closeBtn.onclick = function() {
            customColumnsModal.style.display = "none";
        }

        saveColumnsBtn.onclick = function() {
            toggleColumns();
            saveColumnPreferences();
            customColumnsModal.style.display = "none";
        }

        cancelColumnsBtn.onclick = function() {
            customColumnsModal.style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target == customColumnsModal) {
                customColumnsModal.style.display = "none";
            }
        }
    });
    function downloadData(format) {
    const count = document.getElementById('downloadCount').value;
    showLoader();
    window.location.href = \`/download?format=\${format}&count=\${count}\`;
    setTimeout(hideLoader, 1500); // Hide loader after 1.5 seconds
    }
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
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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
        
        .table-responsive {
            overflow-x: auto;
        }
        
        table {
            width: 100%;
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
            .container {
                padding: 15px;
            }
            
            h1, h2 {
                font-size: 1.5em;
            }
            
            .order-details {
                grid-template-columns: 1fr;
            }
            
            th, td {
                padding: 8px;
            }
        }

        .loader-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(236, 240, 241, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .loader {
            width: 50px;
            height: 50px;
            border: 5px solid var(--primary-color);
            border-top: 5px solid var(--secondary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loader-container" id="loader" style="display: none;">
        <div class="loader"></div>
    </div>

    <div class="container">
        <a href="/" class="back-button">Back</a>
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
        <div class="table-responsive">
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
        </div>
        
        <div class="order-totals">
            <h3>Order Totals</h3>
            <p><strong>Sub Total:</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.sub_total)}</p>
            <p><strong>IGST18 (18%):</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.tax_total)}</p>
            <p><strong>Total:</strong> ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(order.total)}</p>
        </div>
    </div>

    <script>
        function showLoader() {
            document.getElementById('loader').style.display = 'flex';
        }

        function hideLoader() {
            document.getElementById('loader').style.display = 'none';
        }

        

        document.addEventListener('DOMContentLoaded', () => {
            const backButton = document.querySelector('.back-button');
            loadColumnPreferences();
            if (backButton) {
                backButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    showLoader();
                    window.location.href = backButton.href;
                });
            }
                 loadColumnPreferences();
                const customColumnsBtn = document.getElementById('customColumnsBtn');
            const customColumnsModal = document.getElementById('customColumnsModal');
            const closeBtn = document.getElementsByClassName('close')[0];
            const saveColumnsBtn = document.getElementById('saveColumns');
            const cancelColumnsBtn = document.getElementById('cancelColumns');
            const columnList = document.getElementById('columnList');
            const table = document.getElementById('salesOrderTable');
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

const xlsx = require('xlsx');
const csv = require('fast-csv');
const PDFDocument = require('pdfkit');

app.get('/download', async (req, res) => {
  const format = req.query.format;
  const count = parseInt(req.query.count) || 100; // Default to 100 if not specified

  try {
    const response = await axios.get(`${apiUrl}&per_page=${count}`, {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken
      }
    });

    const salesOrders = response.data.salesorders;

    switch (format) {
      case 'excel':
        downloadExcel(res, salesOrders);
        break;
      case 'csv':
        downloadCSV(res, salesOrders);
        break;
      case 'pdf':
        downloadPDF(res, salesOrders);
        break;
      default:
        res.status(400).send('Invalid format specified');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

function downloadExcel(res, data) {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales Orders');
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=sales_orders.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

function downloadCSV(res, data) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=sales_orders.csv');

  csv.write(data, { headers: true })
    .pipe(res);
}

function downloadPDF(res, data) {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=sales_orders.pdf');

  doc.pipe(res);

  doc.fontSize(16).text('Sales Orders', { align: 'center' });
  doc.moveDown();

  const tableTop = 150;
  const itemsPerPage = 20;
  let itemCount = 0;

  data.forEach((order, index) => {
    if (itemCount >= itemsPerPage) {
      doc.addPage();
      itemCount = 0;
    }

    doc.fontSize(10).text(`${order.salesorder_number} - ${order.customer_name}`, 50, tableTop + (itemCount * 20));
    doc.text(order.total, 400, tableTop + (itemCount * 20));

    itemCount++;
  });

  doc.end();
}
 


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  
}); 