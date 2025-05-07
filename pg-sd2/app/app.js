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
  cookie: { 
    secure: false,
    maxAge: 10 * 60 * 1000 
}
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
    const decade = parseInt(req.query.decade);

    let allYears = [];
    for (let year = 2025; year >= 1950; year--) {
        allYears.push(year);
    }

if (decade && !isNaN(decade)) {
    allYears = allYears.filter(year => year >= decade && year < decade + 10);
}

    res.render("years", {allYears, selectedDecade : decade});
});
// Get all categories for dropdown
/*async function getCategories() {
    const [categories] = await db.query('SELECT * FROM categories');
    return categories;
}*/
async function getCategories() {
    const [rows] = await db.query("SELECT Categories_id, Categories_name FROM CATEGORIES");
    return rows;
  }
  

// Show the new post form
app.get("/post", async (req, res) => {
    if (!req.session.loggedIn) {
        req.session.returnTo = '/post';
        return res.redirect('/login');
    }

    try {
        const categories = await getCategories();
        res.render('post', {
            post: null,
            user: {
                Users_id: req.session.uid,
                Username: req.session.username,
                Display_name: req.session.display_name
            },
            categories,
            formData: {
                Post_title: '',
                Full_text: '',
                Category_id: '',
                DATE_OF_MEMORY: ''
            }
        });
    } catch (err) {
        console.error("Error fetching categories:", err);
        res.status(500).send("Error loading post form");
    }
});

// Handle post creation
app.post("/post", async (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login');
    }
    
    const { Post_title, Full_text, Categories_id, DATE_OF_MEMORY } = req.body;
    const Users_id = req.session.uid;

    try {
       // const categories = await getCategories();
       const categories = await getCategories();
       console.log("CATEGORIES fetched:", categories); 
       
        if (!Post_title?.trim() || !Full_text?.trim() || !Categories_id) {
            return res.status(400).render('post', {
                error: "All fields are required",
                categories,
                formData: req.body,
                user: {
                    Users_id: req.session.uid,
                    Username: req.session.username,
                    Display_name: req.session.display_name
                }
            });
        }
        
        

        // Verify category exists
        const [categoryRows] = await db.query('SELECT * FROM CATEGORIES WHERE Categories_id = ?', [Categories_id]);
const category = categoryRows[0];

if (!category) {
    return res.status(400).render('post', {
        error: "Invalid category",
        categories,
        formData: req.body,
        user: {
            Users_id: req.session.uid,
            Username: req.session.username,
            Display_name: req.session.display_name
        }
    });
}


        const [result] = await db.query(`
            INSERT INTO POSTS 
            (Users_id, Post_title, Full_text, DATE_posted, Categories_id, DATE_OF_MEMORY)
            VALUES (?, ?, ?, NOW(), ?, ?)
        `, [Users_id, Post_title.trim(), Full_text.trim(), Categories_id, DATE_OF_MEMORY || null]);
        
        req.session.flash = { type: 'success', message: 'Post created successfully!' };
        res.redirect(`/post/${result.insertId}`);

    } catch (err) {
        console.error("Post creation error:", err);
        const categories = await getCategories();
        res.status(500).render('post', {
            error: "Failed to create post",
            categories,
            formData: req.body,
            user: {
                Users_id: req.session.uid,
                Username: req.session.username,
                Display_name: req.session.display_name
            }
        });
    }
});

// View single post
app.get("/post/:id", async (req, res) => {
    try {
        const [post] = await db.query(`
            SELECT 
                POSTS.*,
                categories.Categories_name as Category_name,
                DATE_FORMAT(posts.DATE_posted, '%W, %M %e %Y') AS formatted_posted_date,
                DATE_FORMAT(posts.DATE_OF_MEMORY, '%W, %M %e %Y') AS formatted_memory_date,
                users.Username, 
                users.Display_name
            FROM posts
            JOIN users ON posts.Users_id = users.Users_id
            LEFT JOIN categories ON posts.Category_id = categories.Categories_id
            WHERE posts.Post_id = ?
        `, [req.params.id]);

        if (!post) {
            return res.status(404).render('404', { message: "Post not found" });
        }

        // Get recent posts for memory wall
        const [recentPosts] = await db.query(`
            SELECT 
                posts.*,
                categories.Categories_name as Category_name,
                users.Display_name,
                DATE_FORMAT(posts.DATE_posted, '%W, %M %e %Y') AS formatted_posted_date
            FROM POSTS
            JOIN users ON posts.Users_id = users.Users_id
            LEFT JOIN categories ON posts.Categories_id = categories.Categories_id
            ORDER BY posts.DATE_posted DESC
            LIMIT 10
        `);

        res.render("post", { 
            post,
            recentPosts,
            user: req.session.user,
            flash: req.session.flash
        });
        delete req.session.flash;

    } catch (err) {
        console.error(`Error fetching post ${req.params.id}:`, err);
        res.status(500).render('error', {
            message: "Failed to load post",
            error: process.env.NODE_ENV === 'development' ? err : {}
        });
    }
});

// Create a route for profile page
app.get("/profile/:usersid", function(req, res) {
    const usersid = req.params.usersid;
console.log(usersid)
    const sql = `
        SELECT users.Username, users.Display_name, users.Email, users.bio, users.Users_id 
        FROM USERS AS users
        WHERE users.Users_id = ?`;

    db.query(sql, [usersid]).then( ( results) => {
        console.log('results', results)
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

// Check submitted email and password pair
app.post('/authenticate', async function (req, res) {
    params = req.body;
    console.log("Attempting login with:", params);

    var user = new User(params.email);
    try {
        let uId = await user.getIdFromEmail(params.password);
        console.log("User ID found:", uId);

        if (uId) {
            match = await user.authenticate(params.password);
            console.log("Password match result:", match); 

            if (match) {
                req.session.uid = uId;
                req.session.loggedIn = true;
                console.log("Session created for:", req.session.uid);

                //next 5 lines are for storing username and display name in the session
                const sql = "SELECT display_name, username FROM Users WHERE users_id = ?";
                const userInfo = await db.query(sql, [uId]);

                if (userInfo.length > 0) {
                    console.log("User Info:", userInfo);  // Add this line to debug the query results

                    req.session.display_name = userInfo[0].display_name;
                    req.session.username = userInfo[0].username;
                    console.log("Session display_name and username:", req.session.display_name, req.session.username);

                }

                res.redirect('/profile/' + uId);
            }
            else {
                // TODO improve the user journey here
                console.log("Invalid password entered.");
                res.send('invalid password');
            }
        }
        else {
            console.log("No user found for email:", params.email);
            res.send('invalid email');
        }
    } catch (err) {
        console.error(`Error while comparing `, err.message);
        res.send("Server error during login.");
    }
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
});app.get('/post', function(req, res) {
    res.render('post'); // Make sure post.pug exists in the 'views' folder
    });
