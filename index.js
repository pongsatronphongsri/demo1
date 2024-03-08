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
    database: "test",
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
    database: 'test',
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
    const { username, email, password, confirmPassword, phone } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).send("Passwords don't match");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = `INSERT INTO users (username, email, password, phone, isAdmin) VALUES (?, ?, ?, ?, ?)`;

        connection.query(insertQuery, [username, email, hashedPassword, phone, false], (err, result) => {
            if (err) {
                console.error('Error registering user:', err);
                return res.status(500).send(`Error registering user: ${err.message}`);
            }
            res.status(201).send('User registered successfully!');
        });
    } catch (error) {
        res.status(500).send('Error registering user');
    }
});

//login

// app.post('/login', (req, res) => {
//     const { email, password } = req.body;
//     const selectQuery = `SELECT * FROM users WHERE email = ?`;

//     connection.query(selectQuery, [email], async (err, results) => {
//         if (err || results.length === 0) {
//             res.status(401).send('Invalid email or password');
//             return;
//         }

//         const user = results[0];
//         const passwordMatch = await bcrypt.compare(password, user.password);

//         if (!passwordMatch) {
//             res.status(401).send('Invalid email or password');
//             return;
//         }

//         // Store user information in the session after successful login
//         req.session.user = {
//             id: user.id,
//             email: user.email,
//             username: user.username // If available in your database
//             // Add other relevant user data to the session if needed
//         };

//         res.redirect('/');
//     });
// });

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const selectQuery = `SELECT * FROM users WHERE email = ?`;

    connection.query(selectQuery, [email], async (err, results) => {
        if (err || results.length === 0) {
            res.status(401).send('Invalid email or password');
            return;
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            res.status(401).send('Invalid email or password');
            return;
        }

        // Check if the user is an admin
        if (user.isAdmin) {
            // Store user information in the session after successful login
            req.session.user = {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: true // Set the isAdmin flag for admin users
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
                isAdmin: false // Ensure isAdmin is false for non-admin users
                // Add other relevant user data to the session if needed
            };

            res.redirect('/');
        }
    });
});
// app.get('/admin', verifyAdmin, (req, res) => {
//     console.log('Admin page route accessed');

//     const username = req.session.user.username;
//     res.render('pages/admin', { username });
// });
// function verifyAdmin(req, res, next) {
//     if (req.session.user && req.session.user.isAdmin) {
//         next();
//     } else {
//         res.status(403).send('Forbidden: Access denied');
//     }
// }
/*app.get('/admin', verifyAdmin, async (req, res) => {
    try {
        console.log('Admin page route accessed');

        const username = req.session.user.username;

        // Assume you fetch categories from the database (replace this with your actual logic)
        connection.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                console.error('Error fetching category:', err);
                res.status(500).send(`Error fetching category: ${err.message}`);
                return;
            }

            res.render('pages/admin', { username, categories: categoriesResult, sessionData: req.session });
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
*/
/////
/*
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

                res.render('pages/admin', {
                    username,
                    categories: categoriesResult,
                    relationships: relationshipsResult,
                    sessionData: req.session
                });
            });
        });
    } catch (error) {
        console.error('Error accessing admin page:', error);
        res.status(500).send('Internal Server Error');
    }
});
*/
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
        res.redirect('/admin');
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
        res.redirect('/admin'); // Redirect to the admin page after adding the category
    });
});


//delete category
app.get('/admin/delete/category/:id', verifyAdmin, (req, res) => {
    const categoryId = req.params.id;

    // Delete the category from the database
    connection.query('DELETE FROM category WHERE id = ?', [categoryId], (err, result) => {
        if (err) {
            console.error('Error deleting category:', err);
            res.status(500).send(`Error deleting category: ${err.message}`);
            return;
        }
        console.log('Category deleted successfully');
        res.redirect('/admin');
    });
});

/////product
/*
app.get('/admin/edit', verifyAdmin, async (req, res) => {
 
    try {
       
        // Fetch data for editing (e.g., product_brand_relationship) from the database
        // For example:
        connection.query('SELECT * FROM product_brand_relationship', (err, relationshipsResult) => {
            if (err) {
                console.error('Error fetching product-brand relationships:', err);
                res.status(500).send(`Error fetching product-brand relationships: ${err.message}`);
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
*/



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



//editproduct
/*
app.post('/admin/edit', verifyAdmin, (req, res) => {
    const { product_id, brand_id, detail_id, details, picture, price, text } = req.body;
    // Check if product_id is not null
    if (!product_id) {
        console.error('Error: product_id cannot be null');
        res.status(400).send('Error: product_id cannot be null');
        return;
    }

    // Check if the record exists
    connection.query(
        'SELECT * FROM product_brand_relationship WHERE product_id = ? AND brand_id = ?',
        [product_id, brand_id],
        (err, result) => {
            if (err) {
                console.error('Error checking if record exists:', err);
                res.status(500).send('Error checking if record exists');
                return;
            }

            if (result.length === 0) {
                // Record does not exist, insert a new one
                connection.query(
                    'INSERT INTO product_brand_relationship (product_id, brand_id, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [product_id, brand_id, detail_id, details, '/img/' + picture, price, text],
                    (err, result) => {
                        if (err) {
                            console.error('Error adding product-brand relationship:', err);
                            res.status(500).send('Error adding product-brand relationship');
                            return;
                        }
                        console.log('Product-brand relationship added successfully');
                        res.redirect('/admin');
                    }
                );
            } else {
                // Record exists, update it
                connection.query(
                    'UPDATE product_brand_relationship SET detail_id = ?, details = ?, picture = ?, price = ?, text = ? WHERE product_id = ? AND brand_id = ?',
                    [detail_id, details, '/img/' + picture, price, text, product_id, brand_id],
                    (err, result) => {
                        if (err) {
                            console.error('Error updating product-brand relationship:', err);
                            res.status(500).send('Error updating product-brand relationship');
                            return;
                        }
                        console.log('Product-brand relationship updated successfully');
                        res.redirect('/admin');
                    }
                );
            }
        }

    );

});
*/
app.post('/admin/edit', verifyAdmin, (req, res) => {
    const { product_id, brand_id, detail_id, details, picture, price, text } = req.body;
    // Check if product_id is not null
    if (!product_id) {
        console.error('Error: product_id cannot be null');
        res.status(400).send('Error: product_id cannot be null');
        return;
    }

    // Update or insert the record
    connection.query(
        'INSERT INTO product_brand_relationship (product_id, brand_id, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE detail_id = ?, details = ?, picture = ?, price = ?, text = ?',
        [product_id, brand_id, detail_id, details, '/img/' + picture, price, text, detail_id, details, '/img/' + picture, price, text],
        (err, result) => {
            if (err) {
                console.error('Error updating or inserting product-brand relationship:', err);
                res.status(500).send('Error updating or inserting product-brand relationship');
                return;
            }
            console.log('Product-brand relationship updated or inserted successfully');
            res.redirect('/admin');
        }
    );
});


/*
//add product
app.get('/admin/addproduct', verifyAdmin, (req, res) => {
    // You can customize this route based on your needs
    res.render('pages/addproduct'); // Assuming you have a view named 'add' for the form
});

// Handle form submission for adding a new product-brand relationship
app.post('/admin/addproduct', verifyAdmin, (req, res) => {
    const { product_id, brand_id, detail_id, details, price, text, picture } = req.body;
    if (!product_id) {
        console.error('Error: product_id cannot be null or empty');
        res.status(400).send('Error: product_id cannot be null or empty');
        return;
    }
    // Validate form data (e.g., check if required fields are present)

    // Insert the new product-brand relationship into the database
    connection.query(
        'INSERT INTO product_brand_relationship (product_id, brand_id, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [product_id, brand_id, detail_id, details, picture, price, text],
        (err, result) => {
            if (err) {
                console.error('Error adding product-brand relationship:', err);
                res.status(500).send('Error adding product-brand relationship');
                return;
            }
            console.log('Product-brand relationship added successfully');
            res.redirect('/admin');
        }
    );
});
*/
/*
app.get('/admin/addproduct', verifyAdmin, (req, res) => {
    // Fetch brands data from the database
    connection.query('SELECT * FROM brands', (err, brands) => {
        if (err) {
            console.error('Error fetching brands:', err);
            res.status(500).send('Error fetching brands');
            return;
        }

        // Fetch product_ids data from the database
        connection.query('SELECT product_id FROM products', (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                res.status(500).send('Error fetching products');
                return;
            }
        
            // Render the addproduct page with the fetched brands and products data
            res.render('pages/addproduct', { brands: brands, products: products });
        });
    });
});
*/
/*
// Handle form submission for adding a new product-brand relationship
// Handle form submission for adding a new product-brand relationship
app.post('/admin/addproduct', verifyAdmin, (req, res) => {
    const { model, category_id, brand_id } = req.body;

    // Validate form data
    if (!model.trim() || !category_id.trim() || !brand_id.trim()) {
        console.error('Error: Model, category_id, and brand_id cannot be null or empty');
        res.status(400).send('Error: Model, category_id, and brand_id cannot be null or empty');
        return;
    }

    // Insert the new product into the database
    connection.query(
        'INSERT INTO products (model, category_id, brand_id) VALUES (?, ?, ?)',
        [model, category_id, brand_id],
        (err, result) => {
            if (err) {
                console.error('Error adding product:', err);
                res.status(500).send('Error adding product');
                return;
            }
            console.log('Product added successfully');
            res.redirect('/admin');
        }
    );
});
*/


app.get('/admin/addproduct', (req, res) => {
    connection.query('SELECT brand_id, brand_name FROM brands', (err, brands) => {
        if (err) {
            console.error('Error fetching brands:', err);
            res.status(500).send('Error fetching brands');
            return;
        }
        connection.query('SELECT product_id, model FROM products', (err, products) => {
            if (err) {
                console.error('Error fetching products:', err);
                res.status(500).send('Error fetching products');
                return;
            }
            res.render('pages/addproduct', { brands, products });
        });
    });
});




//editproduct
/*
app.post('/admin/addproduct', verifyAdmin, (req, res) => {
    console.log(req.body); // Check the data sent in the form
    const { brand_id, detail_id, details, picture, price, text } = req.body;

    
    

    // Insert a new product-brand relationship into the database
    connection.query(
        'INSERT INTO product_brand_relationship (product_id, brand_id, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [product_id, brand_id, detail_id, details, '/img/' + picture, price, text],
        (err, result) => {
            if (err) {
                console.error('Error adding product-brand relationship:', err);
                res.status(500).send('Error adding product-brand relationship');
                return;
            }
            console.log('Product-brand relationship added successfully');
            res.redirect('/admin');
        }
    );
});
*/


app.post('/admin/addproduct', verifyAdmin, (req, res) => {
    console.log(req.body); // Check the data sent in the form
    const { product_id, brand_id, detail_id, details, picture, price, text } = req.body;

    // Insert a new product-brand relationship into the database
    connection.query(
        'INSERT INTO product_brand_relationship (product_id, brand_id, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [product_id, brand_id, detail_id, details, '/img/' + picture, price, text],
        (err, result) => {
            if (err) {
                console.error('Error adding product-brand relationship:', err);
                res.status(500).send('Error adding product-brand relationship');
                return;
            }
            console.log('Product-brand relationship added successfully');
            res.redirect('/admin');
        }
    );
});






//delete product
// Server-side route to handle product deletion
// index.js
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
                    res.redirect('/admin');
                }
            );
        }
    );
});



//order product



/*
app.get('/admin/orders', function (req, res) {
    // Fetch all orders from the database
    pool.query('SELECT * FROM orders ORDER BY order_date DESC', (err, ordersResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const orders = ordersResult || [];

        // Group orders by order date and time
        const groupedOrders = orders.reduce((acc, order) => {
            const key = order.order_date.toISOString().slice(0, 19).replace('T', ' ');
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(order);
            return acc;
        }, {});

        res.render('pages/orders', { groupedOrders });
    });
});
*/
app.get('/admin/orders', function (req, res) {
    // Fetch all orders from the database
    pool.query('SELECT * FROM orders ORDER BY order_date DESC', (err, ordersResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const orders = ordersResult || [];

        // Group orders by order date and time
        const groupedOrders = orders.reduce((acc, order) => {
            const key = order.order_date.toISOString().slice(0, 19).replace('T', ' ');
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(order);
            return acc;
        }, {});

        res.render('pages/orders', { groupedOrders });
    });
});

// New route to display customer's address based on user_id
/*
app.get('/admin/orders/address/:userId', function (req, res) {
    const userId = req.params.userId;

    // Fetch customer's address based on user_id
    pool.query('SELECT * FROM customers WHERE user_id = ? ORDER BY order_date DESC LIMIT 1', [userId], (err, customerResult) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        const customer = customerResult[0]; // Assuming there's only one customer for each user_id

        res.render('pages/customer-address', { customer });
    });
});
*/

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
    if (!req.session.user) {
        return res.send('<script>alert("Please log in to view your orders."); window.location.href="/login";</script>');
    }

    const userId = req.session.user.id;
    const username = req.session.user.username; // Assuming username is stored in the session

    fetchLatestOrders(userId, (err, orders, categories, groupedOrders) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.render('pages/my-orders', { orders, username, categories, groupedOrders });
    });
});


function fetchLatestOrders(userId, callback) {
    pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC LIMIT 5', [userId], (err, ordersResult) => {
        if (err) {
            return callback(err, null);
        }

        pool.query('SELECT * FROM category', (err, categoriesResult) => {
            if (err) {
                return callback(err, null);
            }

            const orders = ordersResult || [];
            const categories = categoriesResult || [];
            const groupedOrders = groupOrdersByDate(orders); // Assuming you have a function to group orders by date

            callback(null, orders, categories, groupedOrders);
        });
    });
}

function groupOrdersByDate(orders) {
    return orders.reduce((acc, order) => {
        const key = order.order_date.toISOString().slice(0, 19).replace('T', ' ');
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(order);
        return acc;
    }, {});
}


// Express route for displaying the add admin form
app.get('/admin/add-admin', verifyAdmin, (req, res) => {
    res.render('pages/add-admin'); // Render the add-admin form
});

// Express route for adding a new admin
app.post('/admin/add-admin', verifyAdmin, (req, res) => {
    const { username, email, password, phone } = req.body;

    // Add logic to add admin to the database
    // This is a basic example, you should add proper validation and error handling
    pool.query('INSERT INTO users (username, email, password, phone, isAdmin) VALUES (?, ?, ?, ?, ?)', [username, email, password, phone, 1], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Internal Server Error');
        }

        res.redirect('/admin'); // Redirect to admin page
    });
});





//




/*
app.get('/admin/customers', (req, res) => {
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
            pc.cart_id,
            pc.detail_id,
            pc.quantity,
            pc.price,
            pc.picture,
            pc.details
        FROM
            customers c
        LEFT JOIN
            product_cart pc ON c.user_id = pc.user_id;
    `;
    connection.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching customers:', err);
            res.status(500).json({ error: 'Error fetching customers' });
            return;
        }
        res.render('pages/customers', { customers: results });
    });
});

*/
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
/*
const storage2 = multer.diskStorage({
    destination: 'public/img/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const uploadfile = multer({
    storage: storage2,
    limits: { fileSize: 1000000 }, // 1MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('picture');

// Check file type
function checkFileType(file, cb) {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images only!');
    }
}

// Edit product page

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
            res.render('pages/edit', { relationships: relationshipsResult, imagePath: 'public/img/' });
        });
    } catch (error) {
        console.error('Error accessing edit page:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Update product
app.post('/admin/edit', verifyAdmin, (req, res) => {
    uploadfile(req, res, (err) => {
        if (err) {
            console.error('Error uploading file:', err);
            res.status(500).send('Error uploading file');
            return;
        }

        const { product_id, brand_id, detail_id, details, price, text } = req.body;
        const picture = req.file ? req.file.filename : null;

        // Check if the record exists
        connection.query(
            'SELECT * FROM product_brand_relationship WHERE product_id = ? AND brand_id = ?',
            [product_id, brand_id],
            (err, result) => {
                if (err) {
                    console.error('Error checking if record exists:', err);
                    res.status(500).send('Error checking if record exists');
                    return;
                }

                if (result.length === 0) {
                    // Record does not exist, insert a new one
                    connection.query(
                        'INSERT INTO product_brand_relationship (product_id, brand_id, detail_id, details, picture, price, text) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [product_id, brand_id, detail_id, details, picture, price, text],
                        (err, result) => {
                            if (err) {
                                console.error('Error adding product-brand relationship:', err);
                                res.status(500).send('Error adding product-brand relationship');
                                return;
                            }
                            console.log('Product-brand relationship added successfully');
                            res.redirect('/admin');
                        }
                    );
                } else {
                    // Record exists, update it
                    connection.query(
                        'UPDATE product_brand_relationship SET detail_id = ?, details = ?, picture = ?, price = ?, text = ? WHERE product_id = ? AND brand_id = ?',
                        [detail_id, details, picture, price, text, product_id, brand_id],
                        (err, result) => {
                            if (err) {
                                console.error('Error updating product-brand relationship:', err);
                                res.status(500).send('Error updating product-brand relationship');
                                return;
                            }
                            console.log('Product-brand relationship updated successfully');
                            res.redirect('/admin');
                        }
                    );
                }
            }
        );
    });
});

*/




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
            // Pass cartItems, printersResult, categoriesResult, and username to the index template
            res.render('pages/index', {
                cartItems: [], // Provide an empty array if no items in the cart
                printers: printersResult,
                categories: categoriesResult,
                username,
                sessionData
            });
        });
    });
});
*/

//test
/*app.get('/', function (req, res) {
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

            // If a category ID was provided, fetch products for that category
            if (categoryId) {
                pool.query('SELECT * FROM products WHERE category_id = ?', [categoryId], (err, productsResult) => {
                    if (err) {
                        // Handle the error appropriately
                        return res.render('pages/error', { error: 'Error fetching products for the selected category' });
                    }

                    // Pass cartItems, printersResult, categoriesResult, productsResult, and username to the index template
                    res.render('pages/index', {
                        cartItems: [], // Provide an empty array if no items in the cart
                        printers: printersResult,
                        categories: categoriesResult,
                        products: productsResult,
                        selectedCategory: categoryId,
                        username,
                        sessionData
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
});*/
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
                `;

                pool.query(sqlQuery, [categoryId], (err, productsResult) => {
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
                        searchQuery :searchQuery
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

///





//shop

/*
app.get('/shop', function (req, res) {
    const sqlQuery = `
        SELECT products.product_id, products.model, brands.brand_id, brands.brand_name, product_brand_relationship.details, product_details.detail as product_detail
        FROM products
        LEFT JOIN product_brand_relationship ON products.product_id = product_brand_relationship.product_id
        LEFT JOIN brands ON product_brand_relationship.brand_id = brands.brand_id
        LEFT JOIN product_details ON products.product_id = product_details.product_id;
    `;

    // Assume you fetch categories from the database (replace this with your actual logic)
    pool.query('SELECT * FROM categories', (err, categoriesResult) => {



        const categories = categoriesResult || [];

        pool.query(sqlQuery, (err, results) => {
            const products = results.reduce((acc, result) => {
                const existingProduct = acc.find(p => p.product_id === result.product_id);
                if (existingProduct) {
                    existingProduct.brands.push({
                        brand_id: result.brand_id,
                        brand_name: result.brand_name,
                        details: result.details
                    });
                } else {
                    acc.push({
                        product_id: result.product_id,
                        model: result.model,
                        product_detail: result.product_detail,
                        brands: [{
                            brand_id: result.brand_id,
                            brand_name: result.brand_name,
                            details: result.details
                        }]
                    });
                }
                return acc;
            }, []);

            // Assume you have the username available in the session (replace this with your actual logic)
            const username = req.session.user ? req.session.user.username : null;

            res.render('pages/shop', { products, username, categories });
        });
    });
});
*/
//test shop
/*
app.get('/shop', function (req, res) {
    let sqlQuery = `
        SELECT products.product_id, products.model, brands.brand_id, brands.brand_name, product_brand_relationship.details, product_details.detail as product_detail
        FROM products
        LEFT JOIN product_brand_relationship ON products.product_id = product_brand_relationship.product_id
        LEFT JOIN brands ON product_brand_relationship.brand_id = brands.brand_id
        LEFT JOIN product_details ON products.product_id = product_details.product_id
    `;

    const selectedCategory = req.query.category;

    if (selectedCategory) {
        sqlQuery += ` WHERE products.category_id = ${selectedCategory}`;
    }

    // Assume you fetch categories from the database (replace this with your actual logic)
    pool.query('SELECT * FROM categories', (err, categoriesResult) => {
        const categories = categoriesResult || [];

        pool.query(sqlQuery, (err, results) => {
            if (err) {
                // Handle the error appropriately
                return res.render('pages/error', { error: 'Error fetching products data' });
            }

            const products = results.reduce((acc, result) => {
                const existingProduct = acc.find(p => p.product_id === result.product_id);
                if (existingProduct) {
                    existingProduct.brands.push({
                        brand_id: result.brand_id,
                        brand_name: result.brand_name,
                        details: result.details
                    });
                } else {
                    acc.push({
                        product_id: result.product_id,
                        model: result.model,
                        product_detail: result.product_detail,
                        brands: [{
                            brand_id: result.brand_id,
                            brand_name: result.brand_name,
                            details: result.details
                        }]
                    });
                }
                return acc;
            }, []);

            // Assume you have the username available in the session (replace this with your actual logic)
            const username = req.session.user ? req.session.user.username : null;

            res.render('pages/shop', { products, username, categories, selectedCategory });
        });
    });
});
*/
/////
app.get('/shop', function (req, res) {
    let sqlQuery = `
        SELECT products.product_id, products.model, brands.brand_id, brands.brand_name, product_brand_relationship.details, product_details.detail as product_detail
        FROM products
        LEFT JOIN product_brand_relationship ON products.product_id = product_brand_relationship.product_id
        LEFT JOIN brands ON product_brand_relationship.brand_id = brands.brand_id
        LEFT JOIN product_details ON products.product_id = product_details.product_id
    `;

    const selectedCategory = req.query.category;
    const searchQuery = req.query.query; // Get the search query from the query string

    if (selectedCategory) {
        sqlQuery += ` WHERE products.category_id = ${selectedCategory}`;
    }

    // If a search query is provided, filter products by the search query
    if (searchQuery) {
        sqlQuery += ` AND (products.model LIKE '%${searchQuery}%' OR product_details.detail LIKE '%${searchQuery}%')`;
    }

    pool.query(sqlQuery, (err, results) => {
      

        // Assume you have the username available in the session (replace this with your actual logic)
        const username = req.session.user ? req.session.user.username : null;

        // Fetch categories from the database
        pool.query('SELECT * FROM categories', (err, categoriesResult) => {
          

            const categories = categoriesResult || [];

            const products = results.reduce((acc, result) => {
                const existingProduct = acc.find(p => p.product_id === result.product_id);
                if (existingProduct) {
                    existingProduct.brands.push({
                        brand_id: result.brand_id,
                        brand_name: result.brand_name,
                        details: result.details
                    });
                } else {
                    acc.push({
                        product_id: result.product_id,
                        model: result.model,
                        product_detail: result.product_detail,
                        brands: [{
                            brand_id: result.brand_id,
                            brand_name: result.brand_name,
                            details: result.details
                        }]
                    });
                }
                return acc;
            }, []);

            res.render('pages/shop', { products, username, selectedCategory, categories, searchQuery });
        });
    });
});



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
        brands.brand_id,
        brands.brand_name
    FROM
        products
            JOIN
        product_brand_relationship ON products.product_id = product_brand_relationship.product_id
            JOIN
        brands ON product_brand_relationship.brand_id = brands.brand_id
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
                    brand_id: result.brand_id,
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

//product-detail
// app.js or your main server file

app.get('/product-detail/:detailId', function (req, res) {
    const detailId = decodeURIComponent(req.params.detailId);
    //const detailId = req.params.detailId;

    // ... (your database query logic)
    const sqlQuery = `
    SELECT 
        product_brand_relationship.product_id,
        product_brand_relationship.brand_id,
        product_brand_relationship.detail_id,
        product_brand_relationship.details AS brand_details,
        product_brand_relationship.picture AS brand_picture,
        product_brand_relationship.price AS brand_price,
        product_brand_relationship.text AS brand_text,
        brands.brand_id AS brand_id,
        brands.brand_name AS brand_name
    FROM
        product_brand_relationship
            JOIN
        brands ON product_brand_relationship.brand_id = brands.brand_id
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
            return res.status(404).send('Product or brand not found');
        }

        const productDetails = {
            product_id: results[0].product_id,
            brands: results.map(result => ({
                brand_id: result.brand_id,
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
/*
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

            // Your logic to insert the product into the cart table in the database
            const insertCartItemQuery = `
            INSERT INTO product_cart (user_id, detail_id, quantity, price, picture,details)
            VALUES (?, ?, ?, ?, ?,?);
        `;



            pool.query(insertCartItemQuery, [userId, detailId, quantity, price, picture, details], (error, result) => {
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
*/

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

/*
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

            // Fetch the last inserted order_id
            pool.query('SELECT LAST_INSERT_ID() as lastId', (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                const orderId = result[0].lastId;

                // Fetch cart items (replace this with your actual logic)
                pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, cartItems) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).send('Internal Server Error');
                    }

                    // Fetch categories from the database
                    pool.query('SELECT * FROM category', (err, categoriesResult) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }

                        const categories = categoriesResult || [];

                        // Render the cart page with the updated cart items
                        res.render('pages/cart_product', { cartItems, username, categories, orderId });
                    });
                });
            });
        });
    });
});
*/


//test
/*
app.post('/add_to_cart', (req, res) => {
    const username = req.session.user ? req.session.user.username : null;
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const userId = req.session.user.id;
    const { detailId, quantity } = req.body;

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

        const { details, price, picture } = result[0];

        const insertOrderQuery = `
            INSERT INTO orders (user_id, total_price, customer_id, payment_status, picture, quantity, details)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        `;
        const customer_id = userId;
        const payment_status = 'pending';
        const total_price = price * quantity;

        pool.query(insertOrderQuery, [userId, total_price, customer_id, payment_status, picture, quantity, details], (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).send('Internal Server Error');
            }

            const orderId = result.insertId;

            const insertCartItemQuery = `
                INSERT INTO product_cart (user_id, detail_id, quantity, price, picture, details, order_id)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;

            pool.query(insertCartItemQuery, [userId, detailId, quantity, price, picture, details, orderId], (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).send('Internal Server Error');
                }

                // Fetch categories (replace this with your actual logic)
                pool.query('SELECT * FROM category', (err, categoriesResult) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Internal Server Error');
                    }

                    const categories = categoriesResult || [];

                    pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, cartItems) => {
                        if (error) {
                            console.error(error);
                            return res.status(500).send('Internal Server Error');
                        }

                        res.render('pages/cart_product', { cartItems, username, categories });
                    });
                });
            });
        });
    });
});
*/




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
/*
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

                // Fetch orderId
                pool.query('SELECT LAST_INSERT_ID() as lastId', (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Internal Server Error');
                    }
                    const orderId = result[0].lastId;

                    // Render the cart page with the updated cart items and orderId
                    res.render('pages/cart_product', { cartItems, username, categories, orderId });
                });
            });
        });
    });
});
*/
/*
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

            // Update the order status (assuming the column name is 'order_status')
            const updateOrderStatusQuery = `
                UPDATE product_cart
                SET order_status = 'updated'
                WHERE user_id = ? AND cart_id = ?;
            `;

            pool.query(updateOrderStatusQuery, [userId, cartId], (error, result) => {
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
});

*/



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

/*
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

            // Fetch orderId
            pool.query('SELECT LAST_INSERT_ID() as lastId', (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                const orderId = result[0].lastId;

                // Fetch the updated cart items after removal (replace this with your actual logic)
                pool.query('SELECT * FROM product_cart WHERE user_id = ?', [userId], (error, updatedCartItems) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).send('Internal Server Error');
                    }

                    // Render the cart_product page with the updated cart items and orderId
                    res.render('pages/cart_product', { cartItems: updatedCartItems, username, categories, orderId });
                });
            });
        });
    });
});*/






//test




/*
app.get('/checkout', function (req, res) {
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
            
            res.render('pages/checkout', { username, categories, cartItems });
        });
    });
});
*/

app.get('/checkout', function (req, res) {
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
            cartItems.forEach(item => {
                pool.query('INSERT INTO orders (user_id, detail_id, quantity, price, picture, details, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.user_id, item.detail_id, item.quantity, item.price, item.picture, item.details, orderDate],
                    (err, result) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }
                        console.log('Order saved:', result);
                    });
            });




            // Clear the cart after saving the orders
            pool.query('DELETE FROM product_cart WHERE user_id = ?', [userId], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                console.log('Cart cleared:', result);
            });

            res.render('pages/checkout', { username, categories, cartItems });
        });
    });
});
/*
app.get('/checkout', function (req, res) {
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
            cartItems.forEach(item => {
                pool.query('INSERT INTO orders (user_id, detail_id, quantity, price, picture, details, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [item.user_id, item.detail_id, item.quantity, item.price, item.picture, item.details, orderDate],
                    (err, result) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).send('Internal Server Error');
                        }
                        console.log('Order saved:', result);
                    });
            });

            // Clear the cart after saving the orders
            pool.query('DELETE FROM product_cart WHERE user_id = ?', [userId], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                console.log('Cart cleared:', result);
            });

            // Fetch the last inserted order_id
            pool.query('SELECT LAST_INSERT_ID() as lastId', (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Internal Server Error');
                }
                const orderId = result[0].lastId;

                res.render('pages/checkout', { username, categories, cartItems, orderId: orderId });
            });
        });
    });
});
*/




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
/*
app.post('/saveCustomer', upload.single('payment'), (req, res) => {
    const { firstName, lastName, email, phoneNumber, address, district, subDistrict, province, postalCode } = req.body;
    const paymentFilePath = req.file ? req.file.path : ''; // ไฟล์การชำระเงิน (ถ้ามี)
   
     

    const sql = `INSERT INTO customers (FirstName, LastName, Email, PhoneNumber, AddressLine1, District, SubDistrict, Province, PostalCode, payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [firstName, lastName, email, phoneNumber, address, district, subDistrict, province, postalCode, paymentFilePath];
    
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
*/

app.post('/saveCustomer', upload.single('payment'), (req, res) => {
    const { firstName, lastName, email, phoneNumber, address, district, subDistrict, province, postalCode } = req.body;
    const paymentFilePath = req.file ? '/img/' + req.file.filename : '';  // ไฟล์การชำระเงิน (ถ้ามี)
    const user_id = req.session.user.id;
    // Assuming the user_id is stored in the session

    if (!user_id) {
        console.error('User ID not found in session');
        res.status(400).json({ error: 'User ID not found in session' });
        return;
    }

    const sql = `INSERT INTO customers (FirstName, LastName, Email, PhoneNumber, AddressLine1, District, SubDistrict, Province, PostalCode, payment, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [firstName, lastName, email, phoneNumber, address, district, subDistrict, province, postalCode, paymentFilePath, user_id];

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


app.post('/generateReport', (req, res) => {
    const customerID = req.body.customerID;
    if (!customerID) {
        console.error('Customer ID not found in request body');
        res.status(400).send('Customer ID not found in request body');
        return;
    }

    // Fetch customer data from the database based on the customer ID
    const customerSql = `SELECT * FROM customers WHERE CustomerID = ?`;
    connection.query(customerSql, [customerID], (err, customerResult) => {
        if (err) {
            console.error('Error fetching customer data:', err);
            res.status(500).send('Error fetching customer data');
            return;
        }

        if (customerResult.length === 0) {
            console.error('Customer not found');
            res.status(404).send('Customer not found');
            return;
        }

        const customer = customerResult[0];

        // Fetch product cart data for the customer
        const cartSql = `SELECT * FROM product_cart WHERE user_id = ?`;
        connection.query(cartSql, [customer.user_id], (err, cartResults) => {
            if (err) {
                console.error('Error fetching product cart data:', err);
                res.status(500).send('Error fetching product cart data');
                return;
            }

            // Create a PDF report for the customer
            const doc = new PDFDocument();
            // Set up the PDF content
            doc.fontSize(16).text('Customer Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text(`Customer ID: ${customer.CustomerID}`);
            doc.fontSize(12).text(`Name: ${customer.FirstName} ${customer.LastName}`);
            doc.text(`Email: ${customer.Email}`);
            doc.text(`Phone Number: ${customer.PhoneNumber}`);
            doc.text(`Address: ${customer.AddressLine1}, ${customer.District}, ${customer.SubDistrict}, ${customer.Province} ${customer.PostalCode}`);
            doc.text(`Payment: ${customer.payment.replace(/\\/g, '/')}`);
            doc.text(`Order ID: ${customer.order_id}`);
            doc.text(`Payment Status: ${customer.payment_status}`);
            doc.text(`User ID: ${customer.user_id}`);

            // Add product cart details to the PDF
            doc.moveDown();
            doc.fontSize(16).text('Product Cart Details');
            cartResults.forEach((cartItem, index) => {
                doc.moveDown();
                doc.fontSize(12).text(`Product ${index + 1}`);
                doc.text(`Detail ID: ${cartItem.detail_id}`);
                doc.text(`Quantity: ${cartItem.quantity}`);
                doc.text(`Price: ${cartItem.price}`);
                doc.text(`Details: ${cartItem.details}`);
            });

            // Finalize the PDF and send it as a download
            res.setHeader('Content-Disposition', `attachment; filename=Customer_Report_${customerID}.pdf`);
            doc.pipe(res);
            doc.end();
        });
    });
});















