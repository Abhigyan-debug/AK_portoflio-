// ═══════════════════════════════════════════
// server.js — Full-Stack Portfolio Backend
// Stack: Node.js + Express + MongoDB + Resend
// ═══════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many contact requests. Try again in an hour.' });
app.use('/api/', limiter);
app.use('/api/contact', contactLimiter);

// ─── MONGODB CONNECTION ───────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
console.log(`📡 Connecting to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
  console.error("===== FULL MONGOOSE ERROR =====");
  console.error(err);
  process.exit(1);
});


// ─── SCHEMAS & MODELS ─────────────────────

// Contact/Message Schema
const contactSchema = new mongoose.Schema({
  name:      { type: String, required: true, maxlength: 100 },
  email:     { type: String, required: true, maxlength: 200 },
  subject:   { type: String, maxlength: 200, default: 'General Inquiry' },
  message:   { type: String, required: true, maxlength: 5000 },
  // Analytics
  ip:        { type: String },
  userAgent: { type: String },
  referrer:  { type: String },
  // Status
  read:      { type: Boolean, default: false },
  replied:   { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Visitor Analytics Schema
const visitorSchema = new mongoose.Schema({
  ip:        { type: String },
  userAgent: { type: String },
  page:      { type: String, default: '/' },
  referrer:  { type: String },
  country:   { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Admin User Schema
const adminSchema = new mongoose.Schema({
  username:  { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const Contact = mongoose.model('Contact', contactSchema);
const Visitor = mongoose.model('Visitor', visitorSchema);
const Admin   = mongoose.model('Admin', adminSchema);

// ─── EMAIL SERVICE (RESEND) ───────────────
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendNotificationEmail(contact) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#050508;color:#f0f0f8;padding:40px;border-radius:16px;">
      <h2 style="color:#00e5ff;font-size:1.5rem;margin-bottom:24px;">📬 New Portfolio Message</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#9090a8;width:100px;">From:</td><td style="padding:8px 0;font-weight:600;">${contact.name}</td></tr>
        <tr><td style="padding:8px 0;color:#9090a8;">Email:</td><td style="padding:8px 0;"><a href="mailto:${contact.email}" style="color:#00e5ff;">${contact.email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#9090a8;">Subject:</td><td style="padding:8px 0;">${contact.subject}</td></tr>
        <tr><td style="padding:8px 0;color:#9090a8;">Date:</td><td style="padding:8px 0;">${new Date().toLocaleString()}</td></tr>
      </table>
      <hr style="border:1px solid rgba(255,255,255,0.1);margin:24px 0;">
      <p style="color:#9090a8;margin-bottom:8px;">Message:</p>
      <div style="background:rgba(255,255,255,0.05);border-left:3px solid #00e5ff;padding:16px;border-radius:8px;white-space:pre-wrap;">${contact.message}</div>
      <div style="margin-top:32px;text-align:center;">
        <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin'}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#00e5ff,#b06bff);color:#fff;border-radius:40px;text-decoration:none;font-weight:600;">View in Admin Panel</a>
      </div>
    </div>
  `;
  await resend.emails.send({
    from: 'Portfolio Bot <onboarding@resend.dev>',
    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: `📬 New message from ${contact.name} — ${contact.subject}`,
    html,
  });
}

async function sendAutoReply(contact) {
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#050508;color:#f0f0f8;padding:40px;border-radius:16px;">
      <h2 style="color:#00e5ff;">Hi ${contact.name}! 👋</h2>
      <p style="color:#9090a8;line-height:1.7;margin:16px 0;">Thanks for reaching out. I've received your message and will get back to you within 24 hours.</p>
      <div style="background:rgba(255,255,255,0.05);padding:20px;border-radius:12px;margin:24px 0;">
        <p style="color:#9090a8;margin-bottom:8px;font-size:0.85rem;">Your message:</p>
        <p style="color:#f0f0f8;">${contact.message}</p>
      </div>
      <p style="color:#9090a8;">In the meantime, feel free to check out my <a href="${process.env.FRONTEND_URL || '#'}" style="color:#00e5ff;">portfolio</a> or connect on <a href="https://github.com/Abhigyan-debug" style="color:#b06bff;">GitHub</a>.</p>
      <p style="color:#5a5a72;margin-top:32px;font-size:0.85rem;">— Abhigyan Khare</p>
    </div>
  `;
  await resend.emails.send({
    from: 'Abhigyan Khare <onboarding@resend.dev>',
    to: contact.email,
    subject: `Got your message! I'll be in touch shortly ✦`,
    html,
  });
}

// ─── AUTH MIDDLEWARE ──────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET || 'secret_change_me');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── ROUTES ───────────────────────────────

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Track visitor
app.post('/api/visit', async (req, res) => {
  try {
    await Visitor.create({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      page: req.body.page || '/',
      referrer: req.headers.referer || req.body.referrer,
    });
    const count = await Visitor.countDocuments();
    res.json({ success: true, totalVisitors: count });
  } catch (err) {
    res.status(500).json({ error: 'Could not track visit' });
  }
});

// Visitor count
app.get('/api/visitors/count', async (req, res) => {
  try {
    const total = await Visitor.countDocuments();
    const today = await Visitor.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } });
    const thisMonth = await Visitor.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(1)) } });
    res.json({ total, today, thisMonth });
  } catch {
    res.status(500).json({ error: 'Could not fetch count' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing required fields' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

    const contact = await Contact.create({
      name: name.substring(0, 100),
      email: email.substring(0, 200),
      subject: (subject || 'General Inquiry').substring(0, 200),
      message: message.substring(0, 5000),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
    });

    // Send emails (non-blocking)
    Promise.all([
      sendNotificationEmail(contact).catch(e => console.error('Notification email failed:', e)),
      sendAutoReply(contact).catch(e => console.error('Auto-reply failed:', e)),
    ]);

    res.status(201).json({ success: true, message: "Message received! I'll be in touch within 24 hours." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`🔐 Login attempt — username: "${username}"`);

    if (!username || !password) {
      console.log('❌ Login failed: missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      console.log(`❌ Login failed: no admin found with username "${username}"`);
      const allAdmins = await Admin.find({}, { username: 1 });
      console.log('   Existing admin usernames:', allAdmins.map(a => a.username));
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      console.log(`❌ Login failed: password mismatch for "${username}"`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log(`✅ Login successful — username: "${username}"`);
    const token = jwt.sign({ id: admin._id, username }, process.env.JWT_SECRET || 'secret_change_me', { expiresIn: '24h' });
    res.json({ success: true, token });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all messages
app.get('/api/admin/messages', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = unreadOnly === 'true' ? { read: false } : {};
    const messages = await Contact.find(filter).sort({ createdAt: -1 }).limit(+limit).skip((+page - 1) * +limit);
    const total = await Contact.countDocuments(filter);
    const unread = await Contact.countDocuments({ read: false });
    res.json({ messages, total, unread, pages: Math.ceil(total / +limit) });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark message as read
app.patch('/api/admin/messages/:id/read', authMiddleware, async (req, res) => {
  try {
    await Contact.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete message
app.delete('/api/admin/messages/:id', authMiddleware, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Analytics dashboard data
app.get('/api/admin/analytics', authMiddleware, async (req, res) => {
  try {
    const totalMessages = await Contact.countDocuments();
    const unreadMessages = await Contact.countDocuments({ read: false });
    const totalVisitors = await Visitor.countDocuments();
    const todayVisitors = await Visitor.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } });
    const monthVisitors = await Visitor.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(1)) } });
    // Last 7 days chart data
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0); return d;
    }).reverse();
    const chartData = await Promise.all(days.map(async d => {
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const visitors = await Visitor.countDocuments({ createdAt: { $gte: d, $lt: next } });
      const messages = await Contact.countDocuments({ createdAt: { $gte: d, $lt: next } });
      return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), visitors, messages };
    }));
    // Recent messages
    const recentMessages = await Contact.find().sort({ createdAt: -1 }).limit(5);
    res.json({ totalMessages, unreadMessages, totalVisitors, todayVisitors, monthVisitors, chartData, recentMessages });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// Create admin (run once, then protect this route)
app.post('/api/admin/setup', async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) return res.status(403).json({ error: 'Admin already exists' });
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) return res.status(400).json({ error: 'Invalid credentials' });
    await Admin.create({ username, password });
    res.json({ success: true, message: 'Admin created successfully' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── AUTO-SEED DEFAULT ADMIN ──────────────
async function seedDefaultAdmin() {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const defaultUser = process.env.ADMIN_USER || 'admin';
      const defaultPass = process.env.ADMIN_PASS || 'admin1234';
      await Admin.create({ username: defaultUser, password: defaultPass });
      console.log(`✅ Default admin created — username: "${defaultUser}", password: "${defaultPass}"`);
      console.log('⚠️  Change these credentials immediately in production!');
    } else {
      console.log(`✅ Admin user already exists (${count} found)`);
    }
  } catch (err) {
    console.error('❌ Failed to seed admin:', err.message);
  }
}

// ─── START SERVER ─────────────────────────
mongoose.connection.once('open', () => {
  seedDefaultAdmin();
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════╗
  ║   🚀 Portfolio Server Running     ║
  ║   Port: ${PORT}                       ║
  ║   Admin: /admin                   ║
  ║   API:   /api                     ║
  ╚═══════════════════════════════════╝
  `);
});

module.exports = app;
