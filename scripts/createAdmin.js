const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const AdminUser = require('../models/AdminUser');

(async () => {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log('Usage: node scripts/createAdmin.js onlyankit yourPassword123');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(password, 12);

  await AdminUser.findOneAndUpdate(
    { username },
    { username, passwordHash },
    { upsert: true, new: true }
  );

  console.log('✅ Admin user created/updated:', username);
  process.exit(0);
})();
