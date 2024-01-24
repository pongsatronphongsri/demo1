var express = require('express')
var ejs = require('ejs')
const bodyParser = require('body-parser');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
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
app.get('/admin', verifyAdmin, async (req, res) => {
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

//shop

// Assuming you are using Express.js and have a connection pool (pool) established
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


// Assuming your app is an Express app
app.get('/brand-detail/:productId', function(req, res) {
    const productId = req.params.productId;

    // Perform a database query to get brand and product details based on productId
    const sqlQuery = `
        SELECT products.product_id, products.model, product_brand_relationship.details AS brand_details, brands.brand_name
        FROM products
        JOIN product_brand_relationship ON products.product_id = product_brand_relationship.product_id
        JOIN brands ON product_brand_relationship.brand_id = brands.brand_id
        WHERE products.product_id = ?;
    `;

    pool.query(sqlQuery, [productId], (err, results) => {
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
            model: results[0].model,
            brand_details: results[0].brand_details,
            brand_name: results[0].brand_name
        };

        // Render the brand detail page with the retrieved details
        res.render('pages/brand-detail', { productDetails });
    });
});

*/

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









app.get('/checkout', function (req, res) {
    res.render('pages/checkout');
});
app.get('/contact', function (req, res) {
    res.render('pages/contact');
});


app.get('/cart', function (req, res) {
    res.render('pages/cart');
});
/*
app.get('/detail', function(req, res) {
    res.render('pages/detail');
});*/
/*
app.get('/detail', function(req, res) {
    const productId = req.query.id; // รับค่า ID ของสินค้าจาก URL
    pool.query('SELECT * FROM printer WHERE id = ?', [productId], (err, result) => {
        if (err || result.length === 0) {
            // หากเกิดข้อผิดพลาดหรือไม่พบสินค้า
            res.render('pages/error', { error: 'Product not found' });
        } else {
            // หากดึงข้อมูลสินค้าสำเร็จ
            const product = result[0];
            res.render('pages/detail', { product: product });
        }
    });
});*/

// app.get('/detail', function (req, res) {
//     const productId = req.query.id; // รับค่า ID ของสินค้าจาก URL

//     // Query ข้อมูลสินค้าจากฐานข้อมูล
//     pool.query('SELECT * FROM printer WHERE id = ?', [productId], (err, productResult) => {
//         if (err || productResult.length === 0) {
//             // หากเกิดข้อผิดพลาดหรือไม่พบสินค้า
//             res.render('pages/error', { error: 'Product not found' });
//         } else {
//             // Query ข้อมูล Category จากฐานข้อมูล
//             pool.query('SELECT * FROM category', (err, categoryResult) => {
//                 if (err) {
//                     // หากเกิดข้อผิดพลาดในการดึงข้อมูล Category
//                     res.render('pages/error', { error: 'Error fetching categories' });
//                 } else {
//                     // หากดึงข้อมูล Category สำเร็จ
//                     const product = productResult[0];
//                     const categories = categoryResult; // สมมติว่า categoryResult เป็น array ของ categories

//                     res.render('pages/detail', { product: product, categories: categories });
//                 }
//             });
//         }
//     });
// });
// app.get('/detail', function (req, res) {
//     const productId = req.query.id;

//     // Query product details
//     pool.query('SELECT * FROM printer WHERE id = ?', [productId], (err, productResult) => {
//         if (err || productResult.length === 0) {
//             return res.render('pages/error', { error: 'Product not found' });
//         }

//         // Query categories
//         pool.query('SELECT * FROM category', (err, categoryResult) => {
//             if (err) {
//                 return res.render('pages/error', { error: 'Error fetching categories' });
//             }

//             // Render the detail page with product details, categories, and req object
//             const product = productResult[0];
//             const categories = categoryResult;

//             res.render('pages/detail', { product: product, categories: categories, req: req });
//         });
//     });
// });
// Your route handler for the detail page
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
















