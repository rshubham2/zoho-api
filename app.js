const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

try {
  require.resolve('ejs');
  console.log('EJS is installed');
} catch(e) {
  console.error('EJS is not installed:', e);
}

app.set('view engine', 'ejs');

// MongoDB connection
mongoose.connect('mongodb+srv://admin:admin123@cluster0.idwldf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User model
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  department: String
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb+srv://admin:admin123@cluster0.idwldf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' }),
}));
app.use(passport.initialize());
app.use(passport.session());
const cors = require('cors');
app.use(cors());



// Passport configuration
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username: username });
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    const isMatch = await bcryptjs.compare(password, user.password);
    if (isMatch) return done(null, user);
    return done(null, false, { message: 'Incorrect password.' });
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}


// Routes
// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'An error occurred during login.' });
    }
    if (!user) {
      return res.status(401).json({ message: info.message || 'Login failed.' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'An error occurred during login.' });
      }
      return res.redirect('/');
    });
  })(req, res, next);
});
// Register route
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  try {
    console.log('Received registration request:', req.body);
    const { username, password, department } = req.body;
    if (!username || !password || !department) {
      return res.status(400).json({ success: false, message: 'Username, password, and department are required.' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, department });
    await newUser.save();
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'An error occurred during registration.' });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

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



app.get('/', ensureAuthenticated, async (req, res) => {
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
     salesOrders = response.data.salesorders.slice((page - 1) * perPage, page * perPage);

    res.render('sales-orders', {
    username: req.user ? req.user.username : 'Guest',
    orderNumber: orderNumber,
    salesOrders: salesOrders,
    totalItems: totalItems,
    totalPages: totalPages,
    startItem: startItem,
    endItem: endItem,
    page: page,
    prevPage: page > 1? page - 1 : null,
    nextPage: page < totalPages? page + 1 : null,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
    });

app.get('/details/:id',ensureAuthenticated, async (req, res) => {
  const orderId = req.params.id;
  const detailsUrl = `https://books.zoho.in/api/v3/salesorders/${orderId}?organization_id=${organizationId}`;

  try {
    const response = await axios.get(detailsUrl, {
      headers: {
        'Authorization': 'Zoho-oauthtoken ' + accessToken
      }
    });

    const order = response.data.salesorder;

    res.render('order-details', { user: req.user, order: order });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while fetching order details');
  }
   
});

const xlsx = require('xlsx');
const csv = require('fast-csv');
const PDFDocument = require('pdfkit');

app.get('/download', async (req, res) => {
    try {
        const format = req.query.format;
        const count = parseInt(req.query.count);

        // Validate input
        if (!['excel', 'csv', 'pdf'].includes(format) || isNaN(count) || count < 1 || count > 1000) {
            return res.status(400).send('Invalid format or count');
        }

        // Generate the file based on format and count
        let file;
        switch (format) {
            case 'excel':
                file = await generateExcelFile(count);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=sales_orders.xlsx');
                break;
            case 'csv':
                file = await generateCsvFile(count);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=sales_orders.csv');
                break;
            case 'pdf':
                file = await generatePdfFile(count);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=sales_orders.pdf');
                break;
        }

        res.send(file);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).send('An error occurred while generating the file');
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

async function generateExcelFile(count) {
    const salesOrders = await fetchSalesOrders(count);
    const worksheet = XLSX.utils.json_to_sheet(salesOrders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Orders");
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function generateCsvFile(count) {
    const salesOrders = await fetchSalesOrders(count);
    const csvWriter = createCsvWriter({
        path: 'sales_orders.csv',
        header: [
            {id: 'id', title: 'ID'},
            {id: 'date', title: 'Date'},
            {id: 'customer', title: 'Customer'},
            {id: 'total', title: 'Total'}
        ]
    });
    await csvWriter.writeRecords(salesOrders);
    return require('fs').readFileSync('sales_orders.csv');
}

async function generatePdfFile(count) {
    const salesOrders = await fetchSalesOrders(count);
    const doc = new PDFDocument();
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(16).text('Sales Orders Report', {align: 'center'});
    doc.moveDown();
    salesOrders.forEach(order => {
        doc.fontSize(12).text(`ID: ${order.id}, Date: ${order.date}, Customer: ${order.customer}, Total: $${order.total.toFixed(2)}`);
        doc.moveDown();
    });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
    });
}

module.exports = app;