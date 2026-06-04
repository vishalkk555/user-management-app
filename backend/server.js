
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const rateLimit = require('express-rate-limit');


const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();


connectDB();


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,                  
  message: { success: false, message: 'Too many requests. Try again later.' }
});


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));


app.use(express.json());

app.use('/api', limiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);


app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});


app.use((err, req, res, next) => {
  console.error(err.stack); 
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong. Please try again.'
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});