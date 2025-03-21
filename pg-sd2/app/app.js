// Import express.js
const express = require("express");

// Create express app
var app = express();

// Add static files location
app.use(express.static("static"));

// Use the pug templating engine
app.set('view engine', 'pug');
app.set('views', './app/views');

// Get the functions in the db.js file to use
const db = require('./services/db');

// Create a route for root - /
app.get("/", function(req, res) {
    res.render("index");
});

// Create a route for year page 
app.get("/years", function(req, res) {
    var allYears = [];
    for (let year = 2025; year >= 1950; year--) {
        allYears.push(year);
    }
    res.render("years", {allYears});
});

app.get("/post", function(req, res) {
    res.render("post");
});

// Create a route for profile page
app.get("/profile", function(req, res) {
    res.render("profile");
});

// Create a route for specific year page 
app.get("/:year", function(req, res) {
    const year = req.params.year;
    var sql = "SELECT posts.*, \
       DATE_FORMAT(posts.DATE_posted, '%d/%m/%Y') AS formatted_posted_date, \
       DATE_FORMAT(posts.DATE_OF_MEMORY, '%d/%m/%Y') AS formatted_memory_date, \
       posts.post_id, \
       users.username, \
       users.display_name, \
       users.users_id \
       FROM POSTS \
       JOIN users ON posts.users_id = users.users_id \
       WHERE YEAR(posts.DATE_OF_MEMORY) = ?";
        
       db.query(sql, [year]).then((results) => {
        console.log("Raw Query Results:", results);

        if (!Array.isArray(results)) {
        results = results ? [results] : [];
        }

        console.log("Final Data Sent to Pug:", results);
        res.render('specific-year', {data:results, year:year});
        
    });
});




// Create a route for testing the db
app.get("/db_test", function(req, res) {
    // Assumes a table called test_table exists in your database
    sql = 'select * from test_table';
    db.query(sql).then(results => {
        console.log(results);
        res.send(results)
    });
});

// Create a route for /goodbye
// Responds to a 'GET' request
app.get("/goodbye", function(req, res) {
    res.send("Goodbye world!");
});

// Create a dynamic route for /hello/<name>, where name is any value provided by user
// At the end of the URL
// Responds to a 'GET' request
app.get("/hello/:name", function(req, res) {
    // req.params contains any parameters in the request
    // We can examine it in the console for debugging purposes
    console.log(req.params);
    //  Retrieve the 'name' parameter and use it in a dynamically generated page
    res.send("Hello " + req.params.name);
});

// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});