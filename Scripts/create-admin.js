// ═══════════════════════════════════════════
// create-admin.js — Manually create an admin user
// Usage: npm run setup-admin
// ═══════════════════════════════════════════

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
const Admin = mongoose.model('Admin', adminSchema);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n╔═══════════════════════════════════╗');
  console.log('║   🔧 Admin User Setup             ║');
  console.log('╚═══════════════════════════════════╝\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/portfolio';
  console.log(`Connecting to: ${uri.replace(/\/\/.*@/, '//***@')}\n`);

  await mongoose.connect(uri);
  console.log('✅ MongoDB connected\n');

  const existing = await Admin.countDocuments();
  if (existing > 0) {
    const admins = await Admin.find({}, { username: 1 });
    console.log(`⚠️  ${existing} admin(s) already exist: ${admins.map(a => a.username).join(', ')}`);
    const overwrite = await ask('Do you want to create another admin? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  const username = await ask('Enter admin username: ');
  const password = await ask('Enter admin password (min 8 chars): ');

  if (!username || !password || password.length < 8) {
    console.log('❌ Invalid input. Username required, password must be >= 8 chars.');
    process.exit(1);
  }

  await Admin.create({ username, password });
  console.log(`\n✅ Admin "${username}" created successfully!`);
  console.log('You can now log in at /admin\n');

  rl.close();
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
