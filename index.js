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

app.get('/', function(req, res) {
    pool.query('SELECT * FROM printer', (err, result) => {
        if (err) {
            // หากมีข้อผิดพลาดในการดึงข้อมูล
            res.render('pages/error', { error: 'Error fetching data' });
        } else {
            // หากดึงข้อมูลสำเร็จ ส่งข้อมูลไปยังหน้า index.html
            res.render('pages/index', { printers: result });
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
});

