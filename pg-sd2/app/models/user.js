// Get the functions in the db.js file to use
const db = require('../services/db');

// provides us with tools to encrypt and compare passwords.
const bcrypt = require("bcryptjs");


class User {

    // Id of the user
    id;

    // Email of the user
    email;

    constructor(email) {
        this.email = email;
    }
    
    // Get an existing user id from an email address, or return false if not found
    async getIdFromEmail()  {
        var sql = "SELECT id FROM Users WHERE Users.email = ?";
        const result = await db.query(sql, [this.email]);
        // TODO LOTS OF ERROR CHECKS HERE..
        if (JSON.stringify(result) != '[]') {
            this.id = result[0].id;
            return this.id;
        }
        else {
            return false;
        }
    }

    // Add a password to an existing user
    async setUserPassword(password) {
        const pw = await bcrypt.hash(password, 10);
        var sql = "UPDATE Users SET password = ? WHERE Users.id = ?"
        const result = await db.query(sql, [pw, this.id]);
        return true;
    }
    
    // Add a new record to the users table    
    async addUser(password) {
        const pw = await bcrypt.hash(password, 10);
        var sql = "INSERT INTO Users (email, password) VALUES (? , ?)";
        const result = await db.query(sql, [this.email, pw]);
        console.log(result.insertId);
        this.id = result.insertId;
        return true;
    }

    // Test a submitted password against a stored password
    async authenticate(submitted) {
        //ensure we have a valid id
        if (!this.id) {
            this.id = await this.getIdFromEmail();
            if (!this.id) {
                return false; // User not found
            }
        }

        console.log("Authenticating user ID:", this.id);


        // Get the stored, hashed password for the user
        var sql = "SELECT password FROM Users WHERE id = ?";
        const result = await db.query(sql, [this.id]);

        if (result.length === 0) {
            return false; // No password found
        }

        console.log("Stored hashed password:", result[0].password);


        const match = await bcrypt.compare(submitted, result[0].password);

        console.log("Password match result:", match);

        return match
    }


}

module.exports  = {
    User
}