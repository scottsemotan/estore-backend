const express = require('express');
const app = express();
const promise = require('bluebird');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');

app.use(cors());

// for bcrypt hashing
const saltRounds = 10;

const portNumber = process.env.PORT || 4000;

// pg-promise initialization options:
const initOptions = {
    // Use a custom promise library, instead of the default ES6 Promise:
    promiseLib : promise,
};


// Database connection parameters:
const config = {
    host: 'localhost',
    port: 5432,
    database: 'estore',
    user: 'scottsemotan',
    password: ''
};

// Load and initialize pg-promise:
const pgp = require('pg-promise')(initOptions);

// Create the database instance:
const db = pgp(config);

// Session manager
app.use(session({
    secret: process.env.SECRET_KEY || 'cantbemorelost',
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 360000
    }
}));


app.use(express.urlencoded({
    extended: false
}));
app.use(express.json());

// Don't need landing page to be referenced as this is strictly backend
// app.use(express.static(__dirname + '/public'));

// ---------------- Beginning of Routes ---------------- //

// ---------- Inventory ----------
// get all items from items from inventory table....consider getting a certain amount for landing page
// ****NOT USING THE authenticatedMiddleware FUNCTIONALITY UNTIL OTHER ITEMS FROM SITE ARE WORKING****
app.get('/inventory', (req, res) => {
    db.query('SELECT * FROM inventory')
        .then((results) => {
            console.log(results);
            res.json(results);
        })
})

// get a single item from inventory table
// ****NOT USING THE authenticatedMiddleware FUNCTIONALITY UNTIL OTHER ITEMS FROM SITE ARE WORKING****
app.get('/inventory/:id', (req, res) => {
    db.query(`SELECT * FROM inventory WHERE ${req.params.id} = id AND is_deleted = false`)
        .then((results) => {
            console.log(results);
            res.json(results);
        })
})

// add item to inventory table
app.post('/inventory', (req, res) => {
    db.query(`INSERT INTO inventory (product_name, description, product_photo, price, quantity)
            VALUES('${req.body.product_name}', '${req.body.description}', '${req.body.product_photo}', '${req.body.price}', '${req.body.quantity}')`)
})

// delete an item from inventory using the 'is_deleted' column to represent this functionality. This is so we don't remove an item that may be referenced in order history, but it can be "hidden"
app.put('/inventory/:id', (req, res) => {
    db.query(`UPDATE inventory
              SET is_deleted = true
              WHERE ${req.params.id} = id`)
})


// ---------- Order History ----------
// get all items from the orderhistory table
app.get('/order-history', (req, res) => {
    db.query(`SELECT * FROM orderhistory`)
        .then((results) => {
            console.log(results.json());
            res.send(results.json());
        })
})

// get a specific item from orderhistory table
app.get('/order-history/:id', (req, res) => {
    db.query(`SELECT * FROM orderhistory
              WHERE ${req.params.id} = id`)
})


// ---------------- Routes for Authentication ---------------- //

// check if user is already authenticated and has a session
app.get('/api/checkuser', authenticatedMiddleware, (req, res) => {
    res.send("yah, you good to go");
})


// register a user
app.post('/register', (req, res) => {
    if (!req.body.email) {
        res.status(404).send("Email is required");
    }
    if (!req.body.password) {
        res.status(404).send("Password is required");
    } else {
        let email = req.body.email;
        let password = req.body.password;
        let address = req.body.street_address;
        let address2 = req.body.apt_unit_number;
        let city = req.body.city;
        let state = req.body.state;
        let zip = req.body.zip;
        let admin = false;

        bcrypt.hash(password, saltRounds, function (err, hash) {
            // Store hash in your password DB.
            passHash = hash;
            //for postman testing....can delete
            // res.json({
            //     status: "User successfuly registered",
            //     "hash": passHash
            // })

            db.query(`INSERT INTO users ("password", "email", "street_address", "apt_unit_number", "city", "state", "zip", "is_admin") VALUES('${passHash}', '${email}', '${address}', '${address2}', '${city}', '${state}', '${zip}', '${admin}')`)
            console.log("You've been registered...");
            //send redirect to main index page
            res.send('Ok');

        });
    }
})


// login for user
app.post('/login', (req, res) => {
    //console.log(req);
    if (!req.body.email) {
        res.status(404).send("Email is required");
    }
    if (!req.body.password) {
        res.status(404).send("Password is required");
    }

    db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`)
        .then((results) => {
            // json for postman test
            //res.json(results);
            //console.log(results);

            bcrypt.compare(req.body.password, results[0].password, function (err, result) {
                //console.log(req.body.password, results.account_password);
                //res.send("Yay..logged in");
                //console.log(results);
                //console.log(`the results...${results[0].account_password}`);
                if (result === true) {
                    // assign results from db.query above to a session
                    
                    req.session.user = results;

                    console.log(req.session.user);
                    res.send({
                        "message" : "Ok",
                        "session" : req.session.user,
                        "isAuthenticated" : true
                    });
                } else {
                    res.send("Invalid Credentials");
                }
            })
        })
        .catch((err) => {
            console.log(`Error while logging in...${err}`);
        })
})


// ---------------- Functions ---------------- //

// Middleware to check if user has session
function authenticatedMiddleware(req, res, next) {
    // if user is authenticated let request pass
    if (req.session.user) {
        next();
    } else { // user is not authenticated send them to login
        console.log('Middleware check...user not authenticated');
        
    }
}



// ---------------- End of Routes ---------------- //

app.listen(portNumber, function () {
    console.log(`My API is listening on port ${portNumber}.... `);
});