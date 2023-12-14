var express = require('express')
var ejs = require('ejs')

var app = express();

app.use(express.static('public'));
app.set('view engine','ejs');

app.listen(8080);

app.get('/',function(req,res){

    res.render('pages/index');
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
app.get('/detail', function(req, res) {
    res.render('pages/detail');
});

