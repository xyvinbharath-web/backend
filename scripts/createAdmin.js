/*
 * One-time helper script to create a local admin user
 * Usage (from backend/):
 *   node scripts/createAdmin.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is not set in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const email = 'admin@test.com';
    const password = 'Passw0rd!';

    let admin = await User.findOne({ email });
    if (admin) {
      console.log(`Admin already exists: ${admin.email}`);
    } else {
      admin = await User.create({
        name: 'CLI Admin',
        email,
        phone: '+1000000000',
        password,
        role: 'admin',
        status: 'active',
      });
      console.log('Created admin:', admin.email);
    }

    console.log('Use these credentials to log in via /api/v1/admin/login or the admin panel:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

main();
