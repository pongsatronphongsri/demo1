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