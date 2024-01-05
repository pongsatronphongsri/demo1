var express = require('express')
var ejs = require('ejs')

var app = express();

app.use(express.static('public'));
app.set('view engine','ejs');

app.listen(8080);
/*
app.get('/',function(req,res){

    res.render('pages/index');
});*/

//
const {createPool} = require('mysql');

const pool = createPool({
    host:"localhost",
    user:"root",
    password:"12345678",
    database:"test",
    connectionLimit:10
})
pool.query(` select * from printer `,(err,result,fields)=>{
    if(err){
        return console.log(err);
    }
    return console.log(result);
})



/*app.get('/', function(req, res) {
    pool.query('SELECT * FROM printer', (err, result) => {
        if (err) {
            // หากมีข้อผิดพลาดในการดึงข้อมูล
            res.render('pages/error', { error: 'Error fetching data' });
        } else {
            // หากดึงข้อมูลสำเร็จ ส่งข้อมูลไปยังหน้า index.html
            res.render('pages/index', { printers: result });
        }
    });
});*/
app.get('/', function(req, res) {
    pool.query('SELECT * FROM printer', (err, printersResult) => {
        if (err) {
            // หากมีข้อผิดพลาดในการดึงข้อมูล printer
            res.render('pages/error', { error: 'Error fetching printer data' });
        } else {
            // หากดึงข้อมูล printer สำเร็จ
            pool.query('SELECT * FROM category', (err, categoriesResult) => {
                if (err) {
                    // หากมีข้อผิดพลาดในการดึงข้อมูล category
                    res.render('pages/error', { error: 'Error fetching category data' });
                } else {
                    // หากดึงข้อมูล category สำเร็จ ส่งข้อมูลไปยังหน้า index.html
                    res.render('pages/index', { printers: printersResult, categories: categoriesResult });
                }
            });
        }
    });
});


app.get('/shop', function(req, res) {
    res.render('pages/shop');
});
app.get('/checkout', function(req, res) {
    res.render('pages/checkout');
});
app.get('/contact', function(req, res) {
    res.render('pages/contact');
});


app.get('/cart', function(req, res) {
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

app.get('/detail', function(req, res) {
    const productId = req.query.id; // รับค่า ID ของสินค้าจาก URL

    // Query ข้อมูลสินค้าจากฐานข้อมูล
    pool.query('SELECT * FROM printer WHERE id = ?', [productId], (err, productResult) => {
        if (err || productResult.length === 0) {
            // หากเกิดข้อผิดพลาดหรือไม่พบสินค้า
            res.render('pages/error', { error: 'Product not found' });
        } else {
            // Query ข้อมูล Category จากฐานข้อมูล
            pool.query('SELECT * FROM category', (err, categoryResult) => {
                if (err) {
                    // หากเกิดข้อผิดพลาดในการดึงข้อมูล Category
                    res.render('pages/error', { error: 'Error fetching categories' });
                } else {
                    // หากดึงข้อมูล Category สำเร็จ
                    const product = productResult[0];
                    const categories = categoryResult; // สมมติว่า categoryResult เป็น array ของ categories

                    res.render('pages/detail', { product: product, categories: categories });
                }
            });
        }
    });
});

