var express = require('express')
var ejs = require('ejs')
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const QRCode = require('qrcode')
const generatePayload = require('promptpay-qr')
const _ = require('lodash')
const cors = require('cors')
const path = require('path');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');
const { format } = require('date-fns');
const { th } = require('date-fns/locale');
const excel = require('exceljs');


const fs = require('fs');

var app = express();

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Adjust cookie options as needed
}));

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(8080);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
/*
app.get('/',function(req,res){

    res.render('pages/index');
});*/

//

const { createPool } = require('mysql');

const pool = createPool({
    host: "localhost",
    user: "root",
    password: "12345678",
    database: "shopdb",
    connectionLimit: 10
})
pool.query(` select * from printer `, (err, result, fields) => {
    if (err) {
        return console.log(err);
    }
    return console.log(result);
})

//connect database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'shopdb',
    connectionLimit: 10
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});


// ใส่ข้อมูลการเชื่อมต่อ SMTP ของคุณที่นี่
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tawansapanyu54@gmail.com',
        pass: 'xyli yrwe zgiz jodo'
    }
});
// Registration endpoint

app.get('/register', (req, res) => {
    connection.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            console.error('Error fetching category:', err);
            res.status(500).send(`Error fetching category: ${err.message}`);
            return;
        }

        res.render('pages/register', { categories: categoriesResult });
    });
});

//login 
app.get('/login', (req, res) => {
    connection.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            console.error('Error fetching category:', err);
            res.status(500).send(`Error fetching category: ${err.message}`);
            return;
        }

        res.render('pages/login', { categories: categoriesResult });
    });
    //res.render('pages/login'); // Render the login.ejs file
});

app.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword, phone, AddressLine1, District, SubDistrict, Province, PostalCode } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).send("Passwords don't match");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = `INSERT INTO users (username, email, password, phone, isAdmin, AddressLine1, District, SubDistrict, Province, PostalCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        connection.query(insertQuery, [username, email, hashedPassword, phone, false, AddressLine1, District, SubDistrict, Province, PostalCode], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                return res.status(500).send(`Error registering user: ${err.message}`);
            }
            res.redirect('/login');

        });
    } catch (error) {
        res.status(500).send('Error registering user');

    }
});

//login



app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const selectQuery = `SELECT * FROM users WHERE email = ?`;

    connection.query(selectQuery, [email], async (err, results) => {
        if (err || results.length === 0) {
            res.status(401).send('<script>alert("Invalid email or password");</script>');

            return;
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            res.status(401).send('<script>alert("Invalid email or password"); window.location.href = "/login";</script>');

            return;
        }

        // Check if the user is an admin
        if (user.isAdmin) {
            // Store user information in the session after successful login
            const isOwner = user.isOwner === 1;
           
            req.session.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: true,
                isOwner: isOwner // Set the isAdmin flag for admin users
                // Add other relevant user data to the session if needed
            };

            // Redirect to the admin page
            res.redirect('/admin');
        } else {
            // For non-admin users, store user information in the session and redirect to the home page
          
            req.session.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: false,
                isOwner: false // Ensure isAdmin is false for non-admin users
                // Add other relevant user data to the session if needed
            };

            res.redirect('/');
        }
    });
});


app.get('/admin', verifyAdmin, async (req, res) => {
    try {
        console.log('Admin page route accessed');

        const username = req.session.user.username;

        // Fetch categories from the database
        connection.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                console.error('Error fetching category:', err);
                res.status(500).send(`Error fetching category: ${err.message}`);
                return;
            }

            // Fetch product-brand relationships from the database
            connection.query('SELECT * FROM product_brand_relationship', (err, relationshipsResult) => {
                if (err) {
                    console.error('Error fetching product-brand relationships:', err);
                    res.status(500).send(`Error fetching product-brand relationships: ${err.message}`);
                    return;
                }

                // Fetch all admins from the database
                connection.query('SELECT * FROM users WHERE isAdmin = 1', (err, adminsResult) => {
                    if (err) {
                        console.error('Error fetching admins:', err);
                        res.status(500).send(`Error fetching admins: ${err.message}`);
                        return;
                    }

                    res.render('pages/admin', {
                        username,
                        categories: categoriesResult,
                        relationships: relationshipsResult,
                        admins: adminsResult,
                        sessionData: req.session
                    });
                });
            });
        });
    } catch (error) {
        console.error('Error accessing admin page:', error);
        res.status(500).send('Internal Server Error');
    }
});

function verifyAdmin(req, res, next) {
    if (req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.status(403).send('Forbidden: Access denied');
    }
}

app.get('/admin/categories', verifyAdmin, (req, res) => {
    const perPage = 15; // Number of categories per page
    const page = req.query.page || 1; // Current page, default to 1

    // Calculate the offset based on the current page
    const offset = (page - 1) * perPage;

    // Retrieve categories from the database with limit and offset
    connection.query('SELECT * FROM category LIMIT ? OFFSET ?', [perPage, offset], (err, categories) => {
        if (err) {
            console.error('Error retrieving categories:', err);
            res.status(500).send('Error retrieving categories');
            return;
        }

        // Render the categories page and pass the categories data to the template
        res.render('pages/categories', { categories, currentPage: parseInt(page), hasNextPage: categories.length === perPage });
    });
});



app.get('/admin/edit/category/:id', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;

    // Fetch the category data from the database
    connection.query('SELECT * FROM category WHERE id = ?', [categoryId], (err, categoryResult) => {
        if (err) {
            console.error('Error fetching category:', err);
            res.status(500).send(`Error fetching category: ${err.message}`);
            return;
        }

        if (categoryResult.length === 0) {
            res.status(404).send('Category not found');
            return;
        }

        res.render('pages/edit_category', { category: categoryResult[0] });
    });
});

//
app.post('/admin/edit/category/:id', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;
    const { name } = req.body;

    if (!name) {
        res.status(400).send('Category name is required');
        return;
    }

    // Update the category in the database
    connection.query('UPDATE category SET name = ? WHERE id = ?', [name, categoryId], (err, result) => {
        if (err) {
            console.error('Error updating category:', err);
            res.status(500).send(`Error updating category: ${err.message}`);
            return;
        }
        console.log('Category updated successfully');
        res.redirect('/admin/categories');
        
    });
});



app.get('/admin/add', verifyAdmin, (req, res) => {
    res.render('pages/add_category', { errorMessage: null });
});

app.post('/admin/add', verifyAdmin, (req, res) => {
    const { name } = req.body;

    if (!name) {
        res.render('add_category', { errorMessage: 'Category name is required' });
        return;
    }

    // Add the category to the database
    connection.query('INSERT INTO category (name) VALUES (?)', [name], (err, result) => {
        if (err) {
            console.error('Error adding category:', err);
            res.status(500).send('Error adding category');
            return;
        }
        console.log('Category added successfully');
        res.redirect('/admin/categories'); // Redirect to the admin page after adding the category
        
    });
});


//delete category
app.get('/admin/delete/category/:id', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;

    // Show a confirmation alert before deleting the category
    res.send(`
        <script>
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลในหมวดหมู่นี้?")) {
                window.location.href = "/admin/delete/category/${categoryId}/confirmed";
            } else {
                window.location.href = "/admin/categories";
            }
        </script>
    `);
});

app.get('/admin/delete/category/:id/confirmed', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;

    // Delete the category from the database
    connection.query('DELETE FROM category WHERE id = ?', [categoryId], (err, result) => {
        if (err) {
            console.error('Error deleting category:', err);
            res.status(500).send(`Error deleting category: ${err.message}`);
            return;
        }
        console.log('Category deleted successfully');
        res.redirect('/admin/categories');
    });
});

//product
app.get('/admin/product', verifyAdmin, (req, res) => {
    const perPage = 10;
    const page = req.query.page || 1; // Get the page number from the query parameters, default to 1

    // Calculate the offset based on the page number
    const offset = (page - 1) * perPage;

    // Retrieve product information from the database with pagination
    connection.query('SELECT * FROM product_brand_relationship LIMIT ? OFFSET ?', [perPage, offset], (err, relationships) => {
        if (err) {
            console.error('Error retrieving product information:', err);
            res.status(500).send('Error retrieving product information');
            return;
        }

        // Render the product.ejs page and pass the relationships data to the template
        res.render('pages/product', { relationships, currentPage: parseInt(page), hasNextPage: relationships.length === perPage }); // Check the length of relationships
    });
});


//editproduct
app.get('/admin/edit', verifyAdmin, async (req, res) => {
    const detailId = req.query.detail_id;

    try {
        // Fetch data for editing (e.g., product_brand_relationship) from the database based on the detail_id
        connection.query('SELECT * FROM product_brand_relationship WHERE detail_id = ?', [detailId], (err, relationshipsResult) => {
            if (err) {
                console.error('Error fetching product-brand relationship:', err);
                res.status(500).send(`Error fetching product-brand relationship: ${err.message}`);
                return;
            }

            // Render the edit page with the fetched data
            res.render('pages/edit', { relationships: relationshipsResult });
        });
    } catch (error) {
        console.error('Error accessing edit page:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/admin/edit', verifyAdmin, (req, res) => {
    const { product_id, brand_name, detail_id, details, picture, price, text,currentPicture } = req.body;
    // Check if product_id is not null
    if (!product_id) {
        console.error('Error: product_id cannot be null');
        res.status(400).send('Error: product_id cannot be null');
        return;
    }

    // Update or insert the record
    connection.query(
        'INSERT INTO product_brand_relationship (product_id, brand_name, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE brand_name = VALUES(brand_name), detail_id = VALUES(detail_id), details = VALUES(details), picture = VALUES(picture), price = VALUES(price), text = VALUES(text)',
        // [product_id, brand_name, detail_id, details, '/img/' + picture, price, text],
        [product_id, brand_name, detail_id, details, '/img/' + (picture || currentPicture), price, text, currentPicture],
        (err, result) => {
            if (err) {
                console.error('Error updating or inserting product-brand relationship:', err);
                res.status(500).send('Error updating or inserting product-brand relationship');
                return;
            }
            console.log('Product-brand relationship updated or inserted successfully');
            res.redirect('/admin/product');
        }
    );
});






//addproduct
app.get('/admin/addproduct', (req, res) => {
    connection.query('SELECT product_id, model FROM products', (err, products) => {
        if (err) {
            console.error('Error fetching products:', err);
            res.status(500).send('Error fetching products');
            return;
        }
        res.render('pages/addproduct', { products });
    });
});

app.post('/admin/addproduct', verifyAdmin, (req, res) => {
    console.log(req.body); // Check the data sent in the form
    const { product_id, brand_name, details, picture, price, text } = req.body;

    // Query to get all existing detail_ids
    connection.query('SELECT detail_id FROM product_brand_relationship', (err, results) => {
        if (err) {
            console.error('Error getting existing detail_ids:', err);
            res.status(500).send('Error getting existing detail_ids');
            return;
        }

        // Extract detail_ids from results
        const existingDetailIds = results.map(result => result.detail_id);

        // Find a new unique detail_id
        let newDetailId = 1;
        while (existingDetailIds.includes(newDetailId)) {
            newDetailId++;
        }

        // Insert a new product-brand relationship into the database with the new detail_id
        connection.query(
            'INSERT INTO product_brand_relationship (product_id, brand_name, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [product_id, brand_name, newDetailId, details, '/img/' + picture, price, text],
            (err, result) => {
                if (err) {
                    console.error('Error adding product-brand relationship:', err);
                    res.status(500).send('Error adding product-brand relationship');
                    return;
                }
                console.log('Product-brand relationship added successfully');
                res.redirect('/admin/product');
            }
        );
    });
});




//delete product
app.post('/admin/deleteproduct', verifyAdmin, (req, res) => {
    const { table, id } = req.body;

    // Delete the related records from the product_cart table
    connection.query(
        'DELETE FROM product_cart WHERE detail_id IN (SELECT detail_id FROM product_brand_relationship WHERE detail_id = ?)',
        [id],
        (err, result) => {
            if (err) {
                console.error('Error deleting related records from product_cart:', err);
                res.status(500).send('Error deleting related records from product_cart');
                return;
            }

            // Now delete the record from the product_brand_relationship table
            connection.query(
                'DELETE FROM product_brand_relationship WHERE detail_id = ?',
                [id],
                (err, result) => {
                    if (err) {
                        console.error('Error deleting product:', err);
                        res.status(500).send('Error deleting product');
                        return;
                    }
                    console.log('Product deleted successfully');
                    res.redirect('/admin/product');
                }
            );
        }
    );
});







//order product
app.get('/admin/orders', function (req, res) {
    pool.query('SELECT * FROM orders', (err, ordersResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Render the admin/orders.ejs template and pass the orders data
        res.render('pages/orders', { orders: ordersResult });
    });
});


app.get('/admin/order-details/:orderId', function (req, res) {
    const orderId = req.params.orderId;

    // Fetch order details and payment for the specified order_id
    pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId], (err, orderResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Fetch order details for the specified order_id
        pool.query('SELECT * FROM order_details WHERE order_id_fk = ?', [orderId], (err, detailsResult) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            // Fetch user details for the user_id associated with the order
            pool.query('SELECT * FROM users WHERE id = ?', [orderResult[0].user_id], (err, userResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                // Render the admin/order-details.ejs template and pass the order details, user details, and payment details
                res.render('pages/order-details', {
                    orderId: orderId,
                    orderDetails: detailsResult,
                    userDetails: userResult[0],
                    orderPayment: orderResult[0].payment,
                    orderPaymentStatus: orderResult[0].payment_status,
                    deliveryStatus: orderResult[0].delivery_status
                });
            });
        });
    });
});

app.post('/admin/update-payment-status/:orderId', function (req, res) {
    const orderId = req.params.orderId;
    const paymentStatus = req.body.paymentStatus;

    // Update the payment status in the database
    pool.query('UPDATE orders SET payment_status = ? WHERE order_id = ?', [paymentStatus, orderId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Redirect back to the order details page
        res.redirect('/admin/order-details/' + orderId);
    });
});

app.post('/admin/update-delivery-status/:orderId', function(req, res) {
    const orderId = req.params.orderId;
    const deliveryStatus = req.body.deliveryStatus;

    // Update delivery status in the database
    pool.query('UPDATE orders SET delivery_status = ? WHERE order_id = ?', [deliveryStatus, orderId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Redirect back to the order details page
        res.redirect('/admin/order-details/' + orderId);
    });
});



// New route to display customer's address based on user_id


app.get('/admin/orders/address/:userId', function (req, res) {
    const userId = req.params.userId;

    // Fetch customer's address based on user_id
    pool.query('SELECT * FROM customers WHERE user_id = ? ORDER BY order_date DESC LIMIT 1', [userId], (err, customerResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const customer = customerResult[0]; // Assuming there's only one customer for each user_id

        // Check if payment has been made
        const paymentMade = customer.payment_status === 'Paid';

        res.render('pages/customer-address', { customer, paymentMade });
    });
});








// Update payment status route
app.post('/admin/orders/pay/:userId', function (req, res) {
    const userId = req.params.userId;

    // Update payment status in the database
    pool.query('UPDATE customers SET payment_status = ? WHERE user_id = ?', ['Paid', userId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.redirect(`/admin/orders/address/${userId}`);
    });
});






//delivery
app.post('/admin/orders/update-delivery-status/:orderId', function (req, res) {
    const orderId = req.params.orderId;
    const newStatus = req.body.newStatus;

    pool.query('UPDATE orders SET delivery_status = ? WHERE order_id = ?', [newStatus, orderId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.redirect('/admin/orders');
    });
});


app.get('/my-orders', function (req, res) {
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;

    pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY order_id DESC', [userId], (err, orders) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        let ordersWithDetails = [];
        let count = 0;
        orders.forEach(order => {
            pool.query('SELECT * FROM order_details WHERE order_id_fk = ?', [order.order_id], (err, details) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                ordersWithDetails.push({
                    order_id: order.order_id,
                    order_date: order.order_date,
                    delivery_status: order.delivery_status,
                    payment_status: order.payment_status, // Include payment_status in the response
                    details: details
                });

                count++;
                if (count === orders.length) {
                    pool.query('SELECT * FROM category', (err, categoriesResult) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }

                        const categories = categoriesResult || [];

                        res.render('pages/my-orders', { username: username, orders: ordersWithDetails, categories: categories });
                    });
                }
            });
        });
    });
});

app.get('/checkout_payment', (req, res) => {
    const orderId = req.query.orderId;

    // Fetch order details for the specified order_id
    pool.query('SELECT * FROM orders WHERE order_id = ?', [orderId], (err, orderResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const order = orderResult[0];

        // Fetch order details for the specified order_id
        pool.query('SELECT * FROM order_details WHERE order_id_fk = ?', [orderId], (err, detailsResult) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            const orderDetails = detailsResult;

            // Define the username variable based on the session
            const username = req.session.user ? req.session.user.username : null;

            // Fetch categories from the database
            pool.query('SELECT * FROM category', (err, categoriesResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                const categories = categoriesResult || [];

                // Render the checkout_payment.ejs template and pass the order_id, orderDetails, username, and categories
                res.render('pages/checkout_payment', { orderId: orderId, orderDetails: orderDetails, username: username, categories: categories });
            });
        });
    });
});


const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload2 = multer({ storage: storage2 });

app.post('/upload_payment', upload2.single('paymentSlip'), (req, res) => {
    const orderId = req.body.orderId;
    console.log('Received order ID:', orderId); // Log the order ID
    const paymentSlip = req.file;

    if (!paymentSlip) {
        return res.render('pages/error', { error: 'No payment slip uploaded' });
    }

    // Save the file path and update the payment status
    const filePath = '/uploads/' + paymentSlip.filename; // Assuming the file path is relative to the server root
    pool.query('UPDATE orders SET payment = ?, payment_status = ? WHERE order_id = ?', 
        [filePath, 'กำลังตรวจสอบการชำระเงิน', orderId],
        (err, result) => {
            if (err) {
                return res.render('pages/error', { error: 'Error updating payment status' });
            }
            res.redirect('/my-orders'); // Redirect to checkout or another appropriate page
        }
    );
});

// Assuming you have connected to MySQL and created a pool named 'pool'

// Render the showadmin.ejs file with the list of admins
/*
app.get('/showadmin', function(req, res) {
    // Fetch admin data from the database
    pool.query('SELECT username, email FROM users WHERE isAdmin = 1', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Map the results to an array of objects
        const admins = results.map(result => {
            return { username: result.username, email: result.email };
        });

        // Render the showadmin.ejs file and pass the admins data to it
        res.render('pages/showadmin', { admins: admins });
    });
});
*/
app.get('/showadmin', function(req, res) {
    // Fetch admin data from the database, including the ID
    pool.query('SELECT id, username, email FROM users WHERE isAdmin = 1', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Map the results to an array of objects
        const admins = results.map(result => {
            return { id: result.id, username: result.username, email: result.email };
        });

        // Render the showadmin.ejs file and pass the admins data to it
        res.render('pages/showadmin', { admins: admins });
    });
});

// Express route for displaying the add admin form

app.get('/admin/add-admin', verifyAdmin, (req, res) => {
    res.render('pages/add-admin'); // Render the add-admin form
});
/*
// Express route for adding a new admin
app.post('/admin/add-admin', verifyAdmin, async (req, res) => {
    const { username, email, password, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Add logic to add admin to the database
        // This is a basic example, you should add proper validation and error handling
        pool.query('INSERT INTO users (username, email, password, phone, isAdmin) VALUES (?, ?, ?, ?, ?)', [username, email, hashedPassword, phone, 1], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            res.redirect('/admin'); // Redirect to admin page
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
*/
// Express route for adding a new admin
function checkOwner(req, res, next) {
    console.log('isOwner value:', req.session.user.isOwner); // Log the isOwner value
    // Check if the current user is the owner
    if (req.session.user && req.session.user.isOwner === true) {
        next(); // Allow access to add-admin page
    } else {
        res.status(403).send('<script>alert("คุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้."); window.location.href = "/admin";</script>') // Send forbidden access status
    }
}


app.post('/admin/add-admin', checkOwner, async (req, res) => {
    const { username, email, password, phone } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Add logic to add admin to the database
        // This is a basic example, you should add proper validation and error handling
        pool.query('INSERT INTO users (username, email, password, phone, isAdmin) VALUES (?, ?, ?, ?, ?)', [username, email, hashedPassword, phone, 1], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            res.redirect('/admin'); // Redirect to admin page
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/admin/delete-admin', checkOwner, async (req, res) => {
    const { adminId } = req.body;
    const userId = req.session.user.id; // Access user id from session

    try {
        // Check if the admin to be deleted is not the owner
        if (adminId === userId || adminId === '4') {
            return res.status(403).send('<script>alert("ไม่สามารถลบข้อมูลได้."); window.location.href = "/admin";</script>');
        }

        // Add logic to delete admin from the database
        pool.query('DELETE FROM users WHERE id = ? AND isAdmin = 1', [adminId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            // Log the delete result
            console.log('Delete result:', result);

            res.redirect('/admin'); // Redirect to admin page after deletion
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});






//report excel
/*
app.get('/admin/orders/export', async function (req, res) {
    // Fetch orders data from database
    pool.query('SELECT orders.order_id, users.username, orders.order_date, orders.delivery_status, orders.payment_status, order_details.details, order_details.quantity, order_details.price FROM orders JOIN order_details ON orders.order_id = order_details.order_id_fk JOIN users ON orders.user_id = users.id', (err, ordersResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Get the current month and year
        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });
        const currentYear = currentDate.getFullYear();

        // Create a new Excel workbook
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet('Orders');

        // Add a title row at the top of the sheet with the current month and year
        worksheet.addRow([`รายงานเเสดงยอดสั่งซื้อของ ${currentMonth} ${currentYear}`]);

        // Define the columns in the Excel sheet
        worksheet.columns = [
            { header: 'วันที่สั่งซื้อ', key: 'order_date', width: 20 },
            { header: 'รหัสสั่งซื้อ', key: 'order_id', width: 15 },
            { header: 'ชื่อผู้ใช้', key: 'username', width: 20 },
            { header: 'สถานะการขนส่ง', key: 'delivery_status', width: 20 },
            { header: 'สถานะการชำระเงิน', key: 'payment_status', width: 20 },
            { header: 'รายละเอียดสินค้า', key: 'details', width: 30 },
            { header: 'จำนวน', key: 'quantity', width: 15 },
            { header: 'ราคา/ชิ้น', key: 'price', width: 15 },
            { header: 'ราคารวม', key: 'total_price', width: 15 }
        ];

        // Add rows to the Excel sheet
        ordersResult.forEach(order => {
            worksheet.addRow({
                order_date: order.order_date.toISOString().split('T')[0],
                order_id: order.order_id,
                username: order.username,
                delivery_status: order.delivery_status,
                payment_status: order.payment_status,
                details: order.details,
                quantity: order.quantity,
                price: order.price,
                total_price: order.quantity * order.price  // Calculate total price
            });
        });

        // Set response headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

        // Write the Excel file to the response stream
        workbook.xlsx.write(res)
            .then(() => {
                res.end();
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            });
    });
});
*/
app.get('/admin/orders/export-form', (req, res) => {
    res.render('pages/report');
});

app.post('/admin/orders/export', async function (req, res) {
    // Extract the start and end dates from the query parameters
    const { startDate, endDate } = req.body;

    // Fetch orders data from database within the specified date range
    let query = 'SELECT orders.order_id, users.username, orders.order_date, orders.delivery_status, orders.payment_status, order_details.details, order_details.quantity, order_details.price FROM orders JOIN order_details ON orders.order_id = order_details.order_id_fk JOIN users ON orders.user_id = users.id';
    let params = [];

    if (startDate && endDate) {
        query += ' WHERE orders.order_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    pool.query(query, params, (err, ordersResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Get the current month and year
        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });
        const currentYear = currentDate.getFullYear();

        // Create a new Excel workbook
        let workbook = new excel.Workbook();
        let worksheet = workbook.addWorksheet('Orders');

        // Add a title row at the top of the sheet with the current month and year
        worksheet.addRow([`รายงานเเสดงยอดสั่งซื้อของ ${currentMonth} ${currentYear}`]);

        // Define the columns in the Excel sheet
        worksheet.columns = [
            { header: 'วันที่สั่งซื้อ', key: 'order_date', width: 20 },
            { header: 'รหัสสั่งซื้อ', key: 'order_id', width: 15 },
            { header: 'ชื่อผู้ใช้', key: 'username', width: 20 },
            { header: 'สถานะการขนส่ง', key: 'delivery_status', width: 20 },
            { header: 'สถานะการชำระเงิน', key: 'payment_status', width: 20 },
            { header: 'รายละเอียดสินค้า', key: 'details', width: 30 },
            { header: 'จำนวน', key: 'quantity', width: 15 },
            { header: 'ราคา/ชิ้น', key: 'price', width: 15 },
            { header: 'ราคารวม', key: 'total_price', width: 15 }
        ];

        // Add rows to the Excel sheet
        ordersResult.forEach(order => {
            worksheet.addRow({
                order_date: order.order_date.toISOString().split('T')[0],
                order_id: order.order_id,
                username: order.username,
                delivery_status: order.delivery_status,
                payment_status: order.payment_status,
                details: order.details,
                quantity: order.quantity,
                price: order.price,
                total_price: order.quantity * order.price  // Calculate total price
            });
        });

        // Set response headers for Excel file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');

        // Write the Excel file to the response stream
        workbook.xlsx.write(res)
            .then(() => {
                res.end();
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            });
        
        
    });
});


// add/model
/*
app.get('/admin/model', (req, res) => {

    res.render('pages/add-model');

});



app.post('/admin/model', (req, res) => {
    const { product_id, model, category_id } = req.body;
    const sql = 'INSERT INTO products (product_id, model, category_id) VALUES (?, ?, ?)';
    connection.query(sql, [product_id, model, category_id], (err, result) => {
        if (err) {
            console.error('Error adding product: ' + err.stack);
            res.send('Error adding product');
            return;
        }
        console.log('Product added successfully');
        res.redirect('/admin/addproduct');
    });
});
*/
app.get('/admin/model', (req, res) => {
    const sql = 'SELECT * FROM category';
    connection.query(sql, (err, categories) => {
        if (err) {
            console.error('Error fetching categories: ' + err.stack);
            res.send('Error fetching categories');
            return;
        }
        res.render('pages/add-model', { categories });
    });
});
app.post('/admin/model', (req, res) => {
    const { model, category_id } = req.body;
    
    // Generate a new product_id
    const sqlGetMaxProductId = 'SELECT MAX(product_id) AS maxProductId FROM products';
    connection.query(sqlGetMaxProductId, (err, result) => {
        if (err) {
            console.error('Error getting max product ID: ' + err.stack);
            res.send('Error getting max product ID');
            return;
        }

        let newProductId = result[0].maxProductId + 1; // Increment the max product ID

        const sql = 'INSERT INTO products (product_id, model, category_id) VALUES (?, ?, ?)';
        connection.query(sql, [newProductId, model, category_id], (err, result) => {
            if (err) {
                console.error('Error adding product: ' + err.stack);
                res.send('Error adding product');
                return;
            }
            console.log('Product added successfully');
            res.redirect('/admin/addproduct');
        });
    });
});


//addbrand
app.get('/admin/brand', (req, res) => {
    res.render('pages/add-brand');
});
app.post('/admin/brand', (req, res) => {
    const { brand_id, brand_name } = req.body;
    const sql = 'INSERT INTO brands (brand_id, brand_name) VALUES (?, ?)';
    connection.query(sql, [brand_id, brand_name], (err, result) => {
        if (err) {
            console.error('Error adding brand: ' + err.stack);
            res.send('Error adding brand');
            return;
        }
        console.log('Brand added successfully');
        res.redirect('/admin/addproduct');
    });
});

//add-product_detail
app.get('/admin/detail', (req, res) => {
    pool.query('SELECT product_id, model FROM products', (err, productsResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const productModels = productsResult.reduce((acc, product) => {
            acc[product.product_id] = product.model;
            return acc;
        }, {});

        res.render('pages/add-detail', { productModels });
    });
});



app.post('/admin/detail', (req, res) => {
    const { product_id, detail } = req.body;
    const sql = 'INSERT INTO product_details (product_id, detail) VALUES (?, ?)';
    pool.query(sql, [product_id, detail], (err, result) => {
        if (err) {
            console.error('Error adding product detail: ' + err.stack);
            res.send('Error adding product detail');
            return;
        }
        console.log('Product detail added successfully');
        res.redirect('/admin/addproduct');
    });
});



//




app.get('/admin/customers', (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;
    const lastOrderDate = req.session.lastOrderDate || '1970-01-01 00:00:00'; // Default to a date in the past

    const sql = `
        SELECT
            c.CustomerID,
            c.FirstName,
            c.LastName,
            c.Email,
            c.PhoneNumber,
            c.AddressLine1,
            c.District,
            c.SubDistrict,
            c.Province,
            c.PostalCode,
            c.payment,
            c.order_id,
            c.payment_status,
            c.user_id,
            o.order_id,
            o.detail_id,
            o.quantity,
            o.price,
            o.picture,
            o.details,
            o.order_date
        FROM
            customers c
        LEFT JOIN
            orders o ON c.user_id = o.user_id
        WHERE
            o.order_date > ?
        ORDER BY
            o.order_date DESC;
    `;
    connection.query(sql, [lastOrderDate], (err, results) => {
        if (err) {
            console.error('Error fetching customers:', err);
            res.status(500).json({ error: 'Error fetching customers' });
            return;
        }

        let groupedCustomers = {};
        results.forEach(customer => {
            if (!groupedCustomers[customer.CustomerID]) {
                groupedCustomers[customer.CustomerID] = [];
            }
            groupedCustomers[customer.CustomerID].push(customer);
        });

        res.render('pages/customers', { customers: groupedCustomers });

        // Update last order date in session
        const latestOrderDate = results.reduce((maxDate, customer) => {
            const orderDate = new Date(customer.order_date);
            return orderDate > maxDate ? orderDate : maxDate;
        }, new Date('1970-01-01'));
        req.session.lastOrderDate = latestOrderDate.toISOString().slice(0, 19).replace('T', ' ');
    });
});





// Set storage engine





//logout
app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Error logging out');
            return;
        }
        // Redirect the user to the login page or any other appropriate page after logout
        res.redirect('/');
    });
});




// Protected route example
app.get('/profile', verifyToken, (req, res) => {
    jwt.verify(req.token, 'secret_key', (err, decoded) => {
        if (err) {
            res.status(401).send('Unauthorized');
        } else {
            res.render('pages/profile', { username: decoded.username });
        }
    });
});

// Middleware to verify token from Authorization header
function verifyToken(req, res, next) {
    const token = req.headers['authorization'];

    if (typeof token !== 'undefined') {
        req.token = token;
        next();
    } else {
        res.status(403).send('Forbidden');
    }
}




/*
app.get('/', function (req, res) {
    pool.query('SELECT * FROM printer', (err, printersResult) => {
        if (err) {
            // Handle the error appropriately
            return res.render('pages/error', { error: 'Error fetching printer data' });
        }

        pool.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                // Handle the error appropriately
                return res.render('pages/error', { error: 'Error fetching category data' });
            }

            // Retrieve the username from the session
            const username = req.session.user ? req.session.user.username : null;
            const sessionData = req.session;

            // Check if a category ID was provided in the query string
            const categoryId = req.query.category;
            const searchQuery = req.query.query;
            // If a category ID was provided, fetch products for that category
            if (categoryId) {
                let sqlQuery = `
                    SELECT products.product_id, products.model, brands.brand_id, brands.brand_name, product_brand_relationship.details, product_details.detail as product_detail
                    FROM products
                    LEFT JOIN product_brand_relationship ON products.product_id = product_brand_relationship.product_id
                    LEFT JOIN brands ON product_brand_relationship.brand_id = brands.brand_id
                    LEFT JOIN product_details ON products.product_id = product_details.product_id
                    WHERE products.category_id = ?
                    GROUP BY products.product_id
                `;

                pool.query(sqlQuery, [categoryId], (err, productsResult) => {
                    if (err) {
                        // Handle the error appropriately
                       
                    }

                    // Pass cartItems, categoriesResult, productsResult, and username to the shopview template

                    res.render('pages/shop', {
                        cartItems: [], // Provide an empty array if no items in the cart
                        categories: categoriesResult,
                        products: productsResult,
                        selectedCategory: categoryId,
                        username,
                        sessionData,
                        searchQuery: searchQuery
                    });
                });
            } else {
                // Pass cartItems, printersResult, categoriesResult, and username to the index template
                res.render('pages/index', {
                    cartItems: [], // Provide an empty array if no items in the cart
                    printers: printersResult,
                    categories: categoriesResult,
                    username,
                    sessionData
                });
            }
        });
    });
});

*/
app.get('/', function (req, res) {
    pool.query('SELECT * FROM printer', (err, printersResult) => {
        if (err) {
            // Handle the error appropriately
            return res.render('pages/error', { error: 'Error fetching printer data' });
        }

        pool.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                // Handle the error appropriately
                return res.render('pages/error', { error: 'Error fetching category data' });
            }

            // Retrieve the username from the session
            const username = req.session.user ? req.session.user.username : null;
            const sessionData = req.session;

            // Check if a category ID was provided in the query string
            const categoryId = req.query.category;
            const searchQuery = req.query.query;
            // If a category ID was provided, fetch products for that category
            if (categoryId) {
                let sqlQuery = `
                    SELECT products.product_id, products.model
                    FROM products
                    WHERE products.category_id = ?
                    GROUP BY products.product_id
                `;

                pool.query(sqlQuery, [categoryId], (err, productsResult) => {
                    if (err) {
                        // Handle the error appropriately
                        return res.render('pages/error', { error: 'Error fetching products for the selected category' });
                    }

                    // Pass cartItems, categoriesResult, productsResult, printersResult, and username to the shopview template
                    res.render('pages/shop', {
                        cartItems: [], // Provide an empty array if no items in the cart
                        categories: categoriesResult,
                        products: productsResult,
                        printers: printersResult,
                        selectedCategory: categoryId,
                        username,
                        sessionData,
                        searchQuery: searchQuery
                    });
                });
            } else {
                // If no category ID provided, fetch all products
                pool.query('SELECT * FROM products', (err, productsResult) => {
                    if (err) {
                        // Handle the error appropriately
                        return res.render('pages/error', { error: 'Error fetching products' });
                    }

                    // Pass cartItems, categoriesResult, productsResult, printersResult, and username to the shopview template
                    res.render('pages/index', {
                        cartItems: [], // Provide an empty array if no items in the cart
                        categories: categoriesResult,
                        products: productsResult,
                        printers: printersResult,
                        selectedCategory: null,
                        username,
                        sessionData,
                        searchQuery: searchQuery
                    });
                });
            }
        });
    });
});



///

app.get('/shop', function (req, res) {
    pool.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            // Handle the error appropriately
            return res.render('pages/error', { error: 'Error fetching category data' });
        }

        // Retrieve the username from the session
        const username = req.session.user ? req.session.user.username : null;
        const sessionData = req.session;

        // Check if a category ID was provided in the query string
        const categoryId = req.query.category;
        const searchQuery = req.query.query;

        let sqlQuery = `
            SELECT products.product_id, products.model, product_brand_relationship.details
            FROM products
            LEFT JOIN product_brand_relationship ON products.product_id = product_brand_relationship.product_id
        `;
        
        if (categoryId) {
            sqlQuery += ` WHERE products.category_id = ${categoryId}`;
        }

        // If a search query is provided, filter products by the search query
        if (searchQuery) {
            if (categoryId) {
                sqlQuery += ` AND products.model LIKE '%${searchQuery}%'`;
            } else {
                sqlQuery += ` WHERE products.model LIKE '%${searchQuery}%'`;
            }
        }

        // Group the results by product_id and model
        sqlQuery += ` GROUP BY products.product_id, products.model`;

        pool.query(sqlQuery, (err, productsResult) => {
            if (err) {
                // Handle the error appropriately
                return res.render('pages/error', { error: 'Error fetching products for the selected category' });
            }

            // Pass cartItems, categoriesResult, productsResult, and username to the shopview template
            res.render('pages/shop', {
                cartItems: [], // Provide an empty array if no items in the cart
                categories: categoriesResult,
                products: productsResult,
                selectedCategory: categoryId,
                username,
                sessionData,
                searchQuery: searchQuery
            });
        });
    });
});




//shop



// Assuming your app is an Express app

app.get('/brand-detail/:productId', function (req, res) {
    const productId = decodeURIComponent(req.params.productId);

    // Fetch categories from the database (replace this with your actual logic)
    pool.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            // Handle the error appropriately
            return res.render('pages/error', { error: 'Error fetching category data' });
        }

        const categories = categoriesResult || [];

        // Perform a database query to get all brands and their details associated with productId
        const sqlQuery = `
        SELECT 
        products.product_id,
        products.model,
        product_brand_relationship.detail_id,
        product_brand_relationship.details AS brand_details,
        product_brand_relationship.picture AS brand_picture,
        product_brand_relationship.price AS brand_price,
        product_brand_relationship.brand_name
    FROM
        products
            JOIN
        product_brand_relationship ON products.product_id = product_brand_relationship.product_id
    WHERE
        products.product_id = ?;
        `;

        pool.query(sqlQuery, [productId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            // Check if any results were returned
            if (results.length === 0) {
                return res.status(404).send('Product or brand not found');
            }

            const productDetails = {
                product_id: results[0].product_id,
                model: results[0].model,
                brands: results.map(result => ({
                    detail_id: result.detail_id,
                    brand_name: result.brand_name,
                    brand_details: result.brand_details,
                    brand_picture: result.brand_picture,
                    brand_price: result.brand_price
                }))
            };

            // Assume you have the username available in the session (replace this with your actual logic)
            const username = req.session.user ? req.session.user.username : null;

            // Render the brand detail page with the retrieved details, username, and categories
            res.render('pages/brand_detail', { productDetails, username, categories });
        });
    });
});


app.get('/product-detail/:detailId', function (req, res) {
    const detailId = decodeURIComponent(req.params.detailId);
    //const detailId = req.params.detailId;

    // ... (your database query logic)
    const sqlQuery = `
    SELECT 
        product_brand_relationship.product_id,
        product_brand_relationship.brand_name,
        product_brand_relationship.detail_id,
        product_brand_relationship.details AS brand_details,
        product_brand_relationship.picture AS brand_picture,
        product_brand_relationship.price AS brand_price,
        product_brand_relationship.text AS brand_text
    FROM
        product_brand_relationship
    WHERE
        product_brand_relationship.detail_id = ?;
`;

    pool.query(sqlQuery, [detailId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        // Check if any results were returned
        if (results.length === 0) {
            return res.status(404).send('Product not found');
        }

        const productDetails = {
            product_id: results[0].product_id,
            brands: results.map(result => ({
                brand_name: result.brand_name,
                brand_details: result.brand_details,
                brand_picture: result.brand_picture,
                brand_price: result.brand_price,
                brand_text: result.brand_text
            }))
        };

        // Fetch categories from the database (replace this with your actual logic)
        pool.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            const categories = categoriesResult || [];

            // Assume you have the username available in the session (replace this with your actual logic)
            const username = req.session.user ? req.session.user.username : null;

            // Render the product detail page with the retrieved details, username, and categories
            res.render('pages/product_detail', { detailId, productDetails, username, categories });
        });
    });
});



app.get('/cart_product', (req, res) => {
    // Assuming you have a user ID associated with the session (replace with your actual user authentication logic)
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;

    if (!userId) {
        // If user is not logged in, redirect to the login page
        return res.redirect('/login');
    }

    // Your logic to fetch cart items based on the user ID
    pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, cartItems) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        // Your logic to fetch categories from the database
        pool.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            const categories = categoriesResult || [];



            // Render the cart_product page with the cart items, username, categories, and itemCount
            res.render('pages/cart_product', { cartItems, username, categories });
        });

    });
});




app.post('/add_to_cart', (req, res) => {
    // Assuming you have a user ID associated with the session (replace with your actual user authentication logic)
    const username = req.session.user ? req.session.user.username : null;
    if (!req.session.user) {
        // If not logged in, redirect to the login page
        return res.redirect('/login'); // Adjust the login route as needed
    }
    const userId = req.session.user.id;
    const { detailId, quantity } = req.body;

    // Your logic to fetch product details based on the detailId from the database
    const getProductDetailsQuery = `
        SELECT details, price, picture
        FROM product_brand_relationship
        WHERE detail_id = ?;
    `;

    pool.query(getProductDetailsQuery, [detailId], (error, result) => {
        if (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }

        if (result.length === 0) {
            console.log(`Product not found for detailId: ${detailId}`);
            return res.status(404).send('Product not found');
        }

        const { details, price, picture } = result[0]; // Ensure result[0] is defined before destructure

        pool.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Internal Server Error');
            }

            const categories = categoriesResult || [];

            const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // Current date and time

            // Your logic to insert the product into the cart table in the database
            const insertCartItemQuery = `
                INSERT INTO product_cart (user_id, detail_id, quantity, price, picture, details, order_date)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;

            pool.query(insertCartItemQuery, [userId, detailId, quantity, price, picture, details, orderDate], (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }

                // Fetch cart items (replace this with your actual logic)
                pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, cartItems) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).send('Internal Server Error');
                    }

                    // Render the cart page with the updated cart items
                    res.render('pages/cart_product', { cartItems, username, categories });
                });
            });
        });
    });
});









// Assuming you have your express app defined as 'app'
//update

app.post('/update_cart_quantity', (req, res) => {
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;
    pool.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const categories = categoriesResult || [];
        if (!userId) {
            // If not logged in, redirect to the login page
            return res.redirect('/login'); // Adjust the login route as needed
        }

        const cartId = req.body.cartId;
        const newQuantity = parseInt(req.body.quantity, 10);

        // Your logic to update the cart quantity in the database
        const updateCartQuantityQuery = `
        UPDATE product_cart
        SET quantity = ?
        WHERE user_id = ? AND cart_id = ?;
    `;

        pool.query(updateCartQuantityQuery, [newQuantity, userId, cartId], (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            // Fetch updated cart items (replace this with your actual logic)
            pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, cartItems) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }

                // Render the cart page with the updated cart items
                res.render('pages/cart_product', { cartItems, username, categories });
            });
        });
    });
});

////





// Assuming you have an instance of Express called 'app' and a database pool called 'pool'

app.post('/remove_from_cart', (req, res) => {
    const { cartId } = req.body;

    // Validate cartId
    if (!cartId || isNaN(cartId)) {
        return res.status(400).send('Invalid cartId');
    }

    // Retrieve userId from the session
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;
    pool.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const categories = categoriesResult || [];

        // Your logic to remove the item from the product_cart table in the database
        const removeCartItemQuery = `
        DELETE FROM product_cart
        WHERE cart_id = ? AND user_id = ?;
    `;

        pool.query(removeCartItemQuery, [cartId, userId], (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            // Fetch the updated cart items after removal (replace this with your actual logic)
            pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, updatedCartItems) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }

                // Render the cart_product page with the updated cart items
                res.render('pages/cart_product', { cartItems: updatedCartItems, username, categories });
            });
        });
    });
});







//test




app.get('/confirm_checkout', function (req, res) {
    // Retrieve the username from the session
    const username = req.session.user ? req.session.user.username : null;

    // Retrieve cart items from the session
    const cartItems = req.session.cartItems || [];

    // Retrieve categories from the database
    pool.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            // Handle the error appropriately
            return res.render('pages/error', { error: 'Error fetching category data' });
        }
        const categories = categoriesResult || [];

        // Fetch cart items from the database
        pool.query('SELECT * FROM product_cart', (err, cartItemsResult) => {
            if (err) {
                // Handle the error appropriately
                return res.render('pages/error', { error: 'Error fetching cart items' });
            }

            // Fetch user data from the database
            pool.query('SELECT * FROM users WHERE username = ?', [username], (err, userResult) => {
                if (err) {
                    // Handle the error appropriately
                    return res.render('pages/error', { error: 'Error fetching user data' });
                }

                // Generate a new order_id
                pool.query('SELECT MAX(order_id) AS max_order_id FROM orders', (err, result) => {
                    if (err) {
                        return res.render('pages/error', { error: 'Error generating order ID' });
                    }

                    const orderId = result[0].max_order_id + 1;
                    console.log('Received order ID:', orderId);

                    // Render the confirm_checkout.ejs template and pass the username, cartItems, categories, and user variables
                    res.render('pages/confirm_checkout', { username: username, cartItems: cartItemsResult, categories: categories, user: userResult[0], orderId: orderId });
                });
            });
        });
    });
});












//new checkout
app.post('/checkout', function (req, res) {
    // Assuming you have a user ID associated with the session (replace with your actual user authentication logic)
    const userId = req.session.user ? req.session.user.id : null;
    const username = req.session.user ? req.session.user.username : null;

    // Fetch your categories from the database or any other source
    pool.query('SELECT * FROM category', (err, categoriesResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const categories = categoriesResult || [];

        // Fetch cart items (replace this with your actual logic)
        pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, cartItems) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            // Insert cart items into the orders table
            const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            pool.query('INSERT INTO orders (user_id, order_date) VALUES (?, ?)', [userId, orderDate], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }

                const orderId = result.insertId;

                let count = 0;
                cartItems.forEach(item => {
                    // Check if the item is already in the order_details table
                    pool.query('SELECT * FROM order_details WHERE order_id_fk = ? AND details = ?', [orderId, item.details], (err, existingItems) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }

                        if (existingItems.length === 0) {
                            pool.query('INSERT INTO order_details (order_id_fk, details, quantity, price, picture) VALUES (?, ?, ?, ?, ?)',
                                [orderId, item.details, item.quantity, item.price, item.picture],
                                (err, result) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send('Internal Server Error');
                                    }
                                    console.log('Order detail saved:', result);

                                    count++;
                                    if (count === cartItems.length) {
                                        // Clear the cart after saving the orders
                                        pool.query('DELETE FROM product_cart WHERE user_id = ?', [userId], (err, result) => {
                                            if (err) {
                                                console.error(err);
                                                return res.status(500).send('Internal Server Error');
                                            }
                                            console.log('Cart cleared:', result);

                                            // Send the response after completing all operations
                                            // res.render('pages/checkout', { username, categories, cartItems });
                                            res.redirect('/my-orders');

                                        });
                                    }
                                });
                        } else {
                            count++;
                            if (count === cartItems.length) {
                                // Clear the cart after saving the orders
                                pool.query('DELETE FROM product_cart WHERE user_id = ?', [userId], (err, result) => {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send('Internal Server Error');
                                    }
                                    console.log('Cart cleared:', result);

                                    // Send the response after completing all operations
                                    res.render('pages/my-orders', { username, categories, cartItems });
                                });
                            }
                        }
                    });
                });
            });
        });
    });
});




app.post('/generateQR', (req, res) => {
    const amount = parseFloat(req.body.amount || 0);
    const mobileNumber = '0967781769'; // Replace with the customer's phone number

    // Use your PromptPay QR code generation logic here
    const promptPayQRCode = generatePayload(mobileNumber, { amount });
    const option = {
        color: {
            dark: '#000',
            light: '#fff'
        }
    }

    QRCode.toDataURL(promptPayQRCode, option, (err, url) => {
        if (err) {
            console.log('generate fail')
            return res.status(400).json({
                RespCode: 400,
                RespMessage: 'bad : ' + err
            })
        }
        else {
            return res.status(200).json({
                RespCode: 200,
                RespMessage: 'good',
                Result: url
            })
        }

    })
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/') // Use the correct path relative to the root of your project
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// เพิ่มข้อมูลลูกค้าลงในฐานข้อมูล


app.post('/saveCustomer', upload.single('payment'), (req, res) => {
    const { firstName, lastName, email, phoneNumber, address, district, subDistrict, province, postalCode } = req.body;
    const paymentFilePath = req.file ? '/img/' + req.file.filename : '';  // ไฟล์การชำระเงิน (ถ้ามี)
    const user_id = req.session.user.id;

    if (!user_id) {
        console.error('User ID not found in session');
        res.status(400).json({ error: 'User ID not found in session' });
        return;
    }

    const getUserSql = `SELECT * FROM users WHERE id = ?`;
    connection.query(getUserSql, [user_id], (err, userResult) => {
        if (err) {
            console.error('Error fetching user data:', err);
            res.status(500).json({ error: 'Error fetching user data' });
            return;
        }

        const user = userResult[0];
        if (!user) {
            console.error('User not found');
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const sql = `INSERT INTO customers (FirstName, LastName, Email, PhoneNumber, AddressLine1, District, SubDistrict, Province, PostalCode, payment, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [user.username, user.email, user.phone, address, district, subDistrict, province, postalCode, paymentFilePath, user_id];

        connection.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error saving customer:', err);
                res.status(500).json({ error: 'Error saving customer' });
                return;
            }
            console.log('Customer saved:', result);
            res.json({ success: true });
        });
    });
});







app.post('/contact', function (req, res) {
    const { name, email, subject, message } = req.body;

    const mailOptions = {
        from: email, // Use the email entered by the user
        to: 'tawansapanyu54@gmail.com',
        subject: subject,
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.send('Error');
        } else {
            console.log('Email sent: ' + info.response);
            res.render('pages/contact'); // Render the contact page again
        }
    });
});


app.get('/contact', function (req, res) {
    res.render('pages/contact', {
        name: '',
        email: '',
        subject: '',
        message: ''
    });
});



app.get('/cart', function (req, res) {
    res.render('pages/cart');
});


// Your route handler for the detail page
app.get('/detail', function (req, res) {
    const productId = req.query.id;

    // Query product details
    pool.query('SELECT * FROM printer WHERE id = ?', [productId], (err, productResult) => {
        if (err || productResult.length === 0) {
            return res.render('pages/error', { error: 'Product not found' });
        }

        // Query categories
        pool.query('SELECT * FROM category', (err, categoryResult) => {
            if (err) {
                return res.render('pages/error', { error: 'Error fetching categories' });
            }

            // Render the detail page with product details, categories, and session
            const product = productResult[0];
            const categories = categoryResult;
            const sessionData = req.session;

            // Pass username to the rendering context
            const username = sessionData.user ? sessionData.user.username : null;

            res.render('pages/detail', { product, categories, sessionData, username });
        });
    });
});





app.post('/add-to-cart', (req, res) => {
    const { productId, quantity } = req.body;

    // Check if the user is logged in
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.id; // Assuming user ID is stored in req.session.user.id

    // Insert the item into the cart table with user_id
    const addToCartQuery = 'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)';
    connection.query(addToCartQuery, [userId, productId, quantity], (err, result) => {
        if (err) {
            console.error('Error adding item to cart:', err);
            return res.status(500).send('Error adding item to cart');
        }

        // Retrieve the cart items from the database with product details
        const getCartItemsQuery = `
            SELECT printer.id as productId,
                   printer.name as productName,
                   printer.price,
                   printer.picture as image, 
                   cart.quantity
            FROM cart
            JOIN printer ON cart.product_id = printer.id
            WHERE cart.user_id = ?`;

        connection.query(getCartItemsQuery, [userId], (err, cartItems) => {
            if (err) {
                console.error('Error retrieving cart items:', err);
                return res.status(500).send('Error retrieving cart items');
            }

            // Retrieve the username from the session
            const username = req.session.user.username || null;

            // Fetch categories from the database
            const getCategoriesQuery = 'SELECT * FROM category';
            connection.query(getCategoriesQuery, (err, categories) => {
                if (err) {
                    console.error('Error fetching categories:', err);
                    return res.status(500).send('Error fetching categories');
                }

                // Render the cart template with the cartItems, username, and categories data
                res.render('pages/cart', { cartItems, username, categories });
            });
        });
    });
});

// Handle POST request to remove an item from the cart
app.post('/remove-from-cart', (req, res) => {
    const { productId } = req.body;

    // Check if the user is logged in
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.id;

    // Delete the item from the cart table
    const removeFromCartQuery = 'DELETE FROM cart WHERE user_id = ? AND product_id = ?';
    connection.query(removeFromCartQuery, [userId, productId], (err, result) => {
        if (err) {
            console.error('Error removing item from cart:', err);
            return res.status(500).send('Error removing item from cart');
        }

        // Retrieve the updated cart items from the database
        const getCartItemsQuery = `
            SELECT printer.id as productId,
                   printer.name as productName,
                   printer.price,
                   printer.picture as image, 
                   cart.quantity
            FROM cart
            JOIN printer ON cart.product_id = printer.id
            WHERE cart.user_id = ?`;

        connection.query(getCartItemsQuery, [userId], (err, cartItems) => {
            if (err) {
                console.error('Error retrieving cart items:', err);
                return res.status(500).send('Error retrieving cart items');
            }

            // Retrieve the username from the session
            const username = req.session.user.username || null;

            // Fetch categories from the database
            const getCategoriesQuery = 'SELECT * FROM category';
            connection.query(getCategoriesQuery, (err, categories) => {
                if (err) {
                    console.error('Error fetching categories:', err);
                    return res.status(500).send('Error fetching categories');
                }

                // Render the cart template with the updated cartItems, username, and categories data
                res.render('pages/cart', { cartItems, username, categories });
            });
        });
    });
});

// Handle POST request to update the cart
app.post('/cart', (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    const userId = req.session.user.id;

    // Assuming the form sends an array of objects with productId and updated quantity
    const updatedCartItems = req.body.updatedCartItems;

    // Update the cart items in the database
    const updateCartQuery = 'UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?';

    // Use Promise.all to execute all update queries asynchronously
    Promise.all(updatedCartItems.map(item => {
        const { productId, quantity } = item;
        return new Promise((resolve, reject) => {
            connection.query(updateCartQuery, [quantity, userId, productId], (err, result) => {
                if (err) {
                    console.error(`Error updating item ${productId} in cart:`, err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }))
        .then(() => {
            // After updating the cart, fetch the updated cart items from the database
            const getCartItemsQuery = `
            SELECT printer.id as productId,
                   printer.name as productName,
                   printer.price,
                   printer.picture as image, 
                   cart.quantity
            FROM cart
            JOIN printer ON cart.product_id = printer.id
            WHERE cart.user_id = ?`;

            connection.query(getCartItemsQuery, [userId], (err, cartItems) => {
                if (err) {
                    console.error('Error retrieving updated cart items:', err);
                    return res.status(500).send('Error retrieving updated cart items');
                }

                // Retrieve the username from the session
                const username = req.session.user.username || null;

                // Fetch categories from the database
                const getCategoriesQuery = 'SELECT * FROM category';
                connection.query(getCategoriesQuery, (err, categories) => {
                    if (err) {
                        console.error('Error fetching categories:', err);
                        return res.status(500).send('Error fetching categories');
                    }

                    // Render the cart template with the updated cartItems, username, and categories data
                    res.render('pages/cart', { cartItems, username, categories });
                });
            });
        })
        .catch(error => {
            // Handle errors
            res.status(500).send('Error updating cart');
        });
});

















