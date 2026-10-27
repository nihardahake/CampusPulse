require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const { Category, User } = require('../models');

const password = process.env.DEMO_ACCOUNT_PASSWORD || 'CampusPulseDemo!26';
const staffAccounts = [
  { name: 'Arjun Network', email: 'wifi@campuspulse.demo', category: 'Wi-Fi & Network' },
  { name: 'Priya Facilities', email: 'plumbing@campuspulse.demo', categories: ['Plumbing', 'Electrical'] },
  { name: 'Noah Housing', email: 'housing@campuspulse.demo', categories: ['Furniture', 'Cleaning'] },
  { name: 'Lina Labs', email: 'labs@campuspulse.demo', category: 'Lab Equipment' },
];

async function createIfMissing({ name, email, role, categories = [] }, passwordHash) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Kept existing account: ${email}`);
    return;
  }

  await User.create({ name, email, role, categories, passwordHash });
  console.log(`Created ${role.toLowerCase()} account: ${email}`);
}

async function seedDemoAccounts() {
  await connectDB();
  const categoryDocs = await Category.find();
  const categoryIds = new Map(categoryDocs.map((category) => [category.name, category._id]));
  const requiredCategories = [...new Set(staffAccounts.flatMap((staff) => staff.categories || [staff.category]))];
  const missing = requiredCategories.filter((name) => !categoryIds.has(name));
  if (missing.length) {
    throw new Error(`Missing categories: ${missing.join(', ')}. Run npm run seed:categories first.`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await createIfMissing({ name: 'Maya Admin', email: 'admin@campuspulse.demo', role: 'ADMIN' }, passwordHash);

  for (const staff of staffAccounts) {
    const names = staff.categories || [staff.category];
    await createIfMissing({
      name: staff.name,
      email: staff.email,
      role: 'STAFF',
      categories: names.map((category) => categoryIds.get(category)),
    }, passwordHash);
  }

  console.log(`Demo admin and staff accounts use password: ${password}`);
  await mongoose.disconnect();
}

seedDemoAccounts().catch(async (error) => {
  console.error('Unable to seed demo accounts:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
