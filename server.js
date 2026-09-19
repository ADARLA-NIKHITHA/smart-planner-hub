require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./models/user'); // lowercase 'user.js'
const session = require('express-session');
const flash = require('connect-flash');

const app = express();
const PORT = 3000;

// Connect to MongoDB
console.log("Starting server...");
mongoose.connect('mongodb://127.0.0.1:27017/smartPlannerHub', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB connected');

    // Start server only after DB connection
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session and flash middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set to true if using https
}));
app.use(flash());

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', { messages: req.flash() });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        req.flash('error', 'Please login first');
        return res.redirect('/');
    }
    res.render('dashboard', { 
        username: req.session.user.username,
        messages: req.flash() 
    });
});

app.post('/signup', async (req, res) => {
    const { username, email, password, 'confirm-password': confirmPassword } = req.body;
    console.log('Signup request:', req.body);

    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/');
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'User already exists. Please login.');
            return res.redirect('/');
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        req.session.user = {
            id: newUser._id,
            username: newUser.username,
            email: newUser.email
        };

        req.flash('success', 'Signup successful! Welcome to your dashboard.');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Signup error:', error);
        req.flash('error', 'An error occurred during signup');
        res.redirect('/');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login request:', req.body);

    try {
        const user = await User.findOne({ email });

        if (!user || user.password !== password) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/');
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        req.flash('success', 'Login successful!');
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred during login');
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        res.redirect('/');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});cd 