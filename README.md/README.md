# ✦ Alex Nova — Premium Developer Portfolio

A futuristic, full-stack developer portfolio with animated UI, contact form, MongoDB backend, admin panel, and email notifications.

---

## 🚀 Features

### Frontend (index.html)
- ⚡ Animated particle canvas background (WebGL-like)
- 🖱️ Custom cursor with trail effect
- ⌨️ Typing animation hero section
- 📊 Animated stats counter
- 🎨 Glassmorphism + Neon dark design
- 🌙 Dark / Light theme toggle
- 🎵 Ambient music toggle (Web Audio API)
- 💬 AI chatbot widget (keyword-based)
- 🚀 Hire Me popup modal
- 📱 Fully responsive (mobile/tablet/desktop)
- 🔍 Project category filtering
- 📜 Scroll reveal animations
- 🔀 Parallax effects
- 📈 Scroll progress bar
- ⏳ Loading screen animation
- 🏷️ Visitor counter

### Backend (server.js)
- 📬 Contact form → MongoDB storage
- 📧 Email notifications (Nodemailer + Gmail)
- 📧 Auto-reply to sender
- 🔒 Admin panel with JWT authentication
- 📊 Visitor analytics tracking
- 🛡️ Rate limiting (5 contact submissions/hour)
- 🪖 Helmet security headers
- 📋 RESTful API

### Admin Panel (admin.html)
- 🔐 Secure login with JWT
- 📊 Dashboard with stats (messages, visitors, today)
- 📬 View, mark read, delete messages
- 📈 7-day analytics chart
- 👁️ Visitor tracking

---

## 📁 Folder Structure

```
portfolio/
├── public/
│   ├── index.html        ← Main portfolio page
│   └── admin.html        ← Admin panel
├── scripts/
│   └── create-admin.js   ← Run once to create admin user
├── server.js             ← Express + MongoDB backend
├── package.json
├── .env.example          ← Copy to .env
└── README.md
```

---

## ⚙️ Setup & Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, email credentials, and JWT secret
```

### 3. Create Admin User
```bash
# Start server first, then run:
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourStrongPassword123"}'
```

### 4. Move frontend files to public/
```bash
mkdir public
cp index.html admin.html public/
```

### 5. Start Development
```bash
npm run dev      # nodemon (hot reload)
npm start        # production
```

---

## 🌐 Deployment

### Vercel (Serverless — Frontend Only)
```bash
# vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
> For full-stack, use Railway, Render, or a VPS.

### Railway (Full-Stack Recommended)
1. Push to GitHub
2. Connect repo to railway.app
3. Add environment variables in dashboard
4. Deploy 🚀

### Netlify (Frontend Only)
1. Drag & drop `public/` folder to netlify.com
2. For backend, deploy separately on Railway/Render

---

## 🔌 Connecting the Contact Form to the Backend

In `index.html`, find the `submitForm()` function and replace the simulated timeout:

```javascript
async function submitForm() {
  const name = document.getElementById('contact-name').value;
  const email = document.getElementById('contact-email').value;
  const subject = document.getElementById('contact-subject').value;
  const message = document.getElementById('contact-message').value;
  if (!name || !email || !message) { alert('Please fill in all required fields.'); return; }
  const btn = document.querySelector('.form-submit');
  btn.textContent = 'Sending...'; btn.style.opacity = '0.7';
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('form-success').style.display = 'block';
      // clear fields...
    } else {
      alert(data.error || 'Something went wrong.');
    }
  } catch {
    alert('Network error. Please try again.');
  } finally {
    btn.textContent = 'Send Message ✦'; btn.style.opacity = '1';
  }
}
```

---

## 🎨 Customization Guide

| What to Change | Where |
|---|---|
| Your name | Search "Alex Nova" in index.html |
| Profile emoji/image | `.hero-avatar-inner` and `.about-emoji` |
| Typing roles | `const roles = [...]` in the JS section |
| Social links | `href="#"` links in hero and contact sections |
| Projects | `.project-card` divs in Projects section |
| Skills & percentages | `data-width="95"` attributes |
| Color palette | `:root` CSS variables at top of style |
| Stats numbers | `data-count="6"` attributes |
| Email | `alex@nova.dev` in contact section |

---

## 📄 License

MIT — Free to use and modify for personal portfolios.

---

*Crafted with ♥ — Built to impress recruiters and clients.*
