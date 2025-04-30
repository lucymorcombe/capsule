// Import express.js
const express = require("express");

// Create express app
var app = express();

// Add static files location
app.use(express.static("static"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use the pug templating engine
app.set('view engine', 'pug');
app.set('views', './app/views');

// Get the functions in the db.js file to use
const db = require('./services/db');

const { User } = require("./models/user");

// Set the sessions
var session = require('express-session');
app.use(session({
  secret: 'secretkeysdfjsflyoifasd',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

//Make sessions available inside pugs
app.use(function(req, res, next){
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.uid = req.session.uid;
    res.locals.username = req.session.username;
    res.locals.display_name = req.session.display_name;
    next();
});

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

app.get("/post/:postid", function(req, res) {
    const postid = req.params.postid;
    var sql = "SELECT posts.*, \
       DATE_FORMAT(posts.DATE_posted, '%d/%m/%Y') AS formatted_posted_date, \
       DATE_FORMAT(posts.DATE_OF_MEMORY, '%d/%m/%Y') AS formatted_memory_date, \
       posts.Post_id, \
       posts.Users_id, \
       users.Username, \
       users.Display_name, \
       users.Users_id \
       FROM POSTS \
       JOIN users ON posts.Users_id = users.Users_id \
       WHERE posts.Post_id = ?";
    db.query(sql, [postid]).then(results => {
        const post = results[0];
        const user = req.session.user;
        res.render('post', {post:post, user: user});
    })
});

// Viewing a single post by id
app.get("/post/:postid", function(req, res) {
    const postid = req.params.postid;
    var sql = "SELECT posts.*, DATE_FORMAT(posts.DATE_posted, '%d/%m/%Y') AS formatted_posted_date, DATE_FORMAT(posts.DATE_OF_MEMORY, '%d/%m/%Y') AS formatted_memory_date, users.Username, users.Display_name FROM POSTS JOIN users ON posts.Users_id = users.Users_id WHERE posts.Post_id = ?";
    db.query(sql, [postid]).then(results => {
        const post = results[0];
        res.render('post', { post: post, user: req.session.user });
    });
});

// Showing the new post form
app.get("/post", (req, res) => {
    res.render('post', { post: null, user: req.session.user });
});



//single post page
app.get("/single-post/:id", async function (req, res) {
    var postid = req.params.id;
    var myPost = new Post(postid);
    await myPost.getPostName();
    await myPost.getPostContent();
    await myPost.getPostDate();
    console.log(myPost);
    res.send(myPost)
})

app.post("/post", (req, res) => {
    const { Users_id, Post_title, Full_text } = req.body;

    const sql = `
        INSERT INTO posts (Users_id, Post_title, Full_text, DATE_posted)
        VALUES (?, ?, ?, NOW())
    `;

    db.query(sql, [Users_id, Post_title, Full_text])
        .then(result => {
            const newPostId = result.insertId;
            res.redirect(`/single-post/${newPostId}`); 
        })
        //.catch(err => {
          //  console.error(err);
           // res.status(500).send("Could not save post.");
        //});
});


// Create a route for profile page
app.get("/profile/:usersid", function(req, res) {
    const usersid = req.params.usersid;
console.log(usersid)
    const sql = `
        SELECT users.Username, users.Display_name, users.Email, users.bio, users.Users_id 
        FROM USERS AS users
        WHERE users.Users_id = ${usersid}`;

    db.query(sql).then( ( results) => {
        console.log('reslts', results)
        // if (err) {
        //     return res.status(500).send("Database error");
        // }

        if (results.length == 0) {
            return res.render("profile", { profile: null, message: "User not found." });
        }

        const profile = {
            Display_name: 'Username',
            Username: results[0].Username,
            Email: results[0].Email,
            bio: results[0].bio,
            Users_id: results[0].Users_id
        };

        res.render("profile",  {profile:profile} );
    })
});

// Register
app.get('/register', function (req, res) {
    res.render('register');
});

// Login
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/authenticate', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE Email = ? AND Password = ?";
    db.query(sql, [email, password])
        .then(results => {
            if (results.length > 0) {
                // User found, set session data
                req.session.user = {
                    Users_id: results[0].Users_id,
                    Username: results[0].Username,
                    Display_name: results[0].Display_name
                };
                res.redirect('/');  // Redirect to homepage or any other page
            } else {
                res.send("Invalid email or password.");
            }
        })
       // .catch(err => {
            //console.error(err);
            //res.status(500).send("Server error during login.");
        //});
});



// Logout
app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/login');
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


app.post('/set-password', async function (req, res) {
    var params = req.body;
    var user = new User(params.email);
    try {
        let uId = await user.getIdFromEmail(params.password);
        console.log(uId);
        if (uId) {
            // If user already exists, redirect to their profile page
            await user.setUserPassword(params.password);
            console.log(req.session.id);
            res.redirect('/profile/' + uId);
        }
        else {
            // If no existing user is found, add a new one
            console.log("Trying to add user with:", params);
            let newId = await user.addUser(params.username, params.display_name, params.password);
            res.redirect('/profile/' + newId);
        }
    } catch (err) {
        console.error(`Error while adding password `, err.message);
    }
});

// Che


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