const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the public folder

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '00000', // Replace with your MySQL password
    database: 'library_db'
});

// Connect to MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL Database:', err);
        return;
    }
    console.log('Connected to MySQL Database.');
});

// Admin credentials (hard-coded for simplicity)
const ADMIN_USERNAME = 'admin'; // Change this to your desired admin username
const ADMIN_PASSWORD = 'adminpass'; // Change this to your desired admin password

// Routes

// Home route (Login page)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});

// Registration route
app.post('/register', (req, res) => {
    const { username, password, role } = req.body; // role should be either 'admin' or 'user'
    const query = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;

    db.query(query, [username, password, role], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/'); // Redirect to login page after registration
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Check for hard-coded admin credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.redirect('/admin'); // Redirect to admin page if admin credentials are correct
    } else {
        const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

        db.query(query, [username, password], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                res.status(500).send('Internal Server Error');
                return;
            }

            if (result.length > 0) {
                const user = result[0];
                if (user.role === 'admin') {
                    res.redirect('/admin');
                } else {
                    res.redirect('/user');
                }
            } else {
                res.send('Invalid login credentials');
            }
        });
    }
});

// Admin Page route
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/views/admin.html');
});

// User Page route
app.get('/user', (req, res) => {
    res.sendFile(__dirname + '/views/user.html');
});

// Add a new user (Admin functionality)
app.post('/add-user', (req, res) => {
    const { username, password, role } = req.body; // Expecting role to be either 'admin' or 'user'
    const query = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;

    db.query(query, [username, password, role], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/admin'); // Redirect back to admin page after adding user
    });
});

// Update user details (Admin functionality)
app.post('/update-user', (req, res) => {
    const { userId, username, password, role } = req.body;
    const query = `UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?`;

    db.query(query, [username, password, role, userId], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/admin'); // Redirect back to admin page after updating user
    });
});

// Add a new book (Admin functionality)
app.post('/add-book', (req, res) => {
    const { title, author, publishedYear } = req.body;
    const query = `INSERT INTO books (title, author, publishedYear) VALUES (?, ?, ?)`;

    db.query(query, [title, author, publishedYear], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/admin'); // Redirect back to admin page after adding book
    });
});

// Update book details (Admin functionality)
app.post('/update-book', (req, res) => {
    const { bookId, title, author, publishedYear } = req.body;
    const query = `UPDATE books SET title = ?, author = ?, publishedYear = ? WHERE id = ?`;

    db.query(query, [title, author, publishedYear, bookId], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/admin'); // Redirect back to admin page after updating book
    });
});

// Issue a book to a user
app.post('/issue-book', (req, res) => {
    const { userId, bookId } = req.body;
    const query = `INSERT INTO transactions (userId, bookId, issueDate) VALUES (?, ?, NOW())`;

    db.query(query, [userId, bookId], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.send('Book issued successfully'); // You can redirect to a confirmation page
    });
});

// Return a book
app.post('/return-book', (req, res) => {
    const { transactionId } = req.body;

    // Check if there are fines (pseudo-query)
    const checkFineQuery = `SELECT fine_amount FROM transactions WHERE id = ?`;

    db.query(checkFineQuery, [transactionId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }

        const fineAmount = results[0]?.fine_amount || 0;

        if (fineAmount > 0) {
            // Redirect to fine payment page
            res.render('pay-fine', { fineAmount, transactionId });
        } else {
            // No fines, proceed to delete transaction
            const deleteQuery = `DELETE FROM transactions WHERE id = ?`;
            db.query(deleteQuery, [transactionId], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Internal Server Error');
                }
                res.send('Book returned successfully'); 
            });
        }
    });
});

// Search for books
app.get('/search-books', (req, res) => {
    const { searchTerm } = req.query;
    const query = `SELECT * FROM books WHERE title LIKE ? OR author LIKE ?`;

    db.query(query, [`%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.render('search-results', { books: results }); // Render search results page
    });
});

// Add membership (Admin functionality)
app.post('/add-membership', (req, res) => {
    const { duration } = req.body;
    const query = `INSERT INTO memberships (duration) VALUES (?)`;

    db.query(query, [duration], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/admin'); // Redirect back to admin page after adding membership
    });
});

// Update membership (Admin functionality)
app.post('/update-membership', (req, res) => {
    const { membershipId, duration } = req.body;
    const query = `UPDATE memberships SET duration = ? WHERE id = ?`;

    db.query(query, [duration, membershipId], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send('Internal Server Error');
            return;
        }
        res.redirect('/admin'); // Redirect back to admin page after updating membership
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
