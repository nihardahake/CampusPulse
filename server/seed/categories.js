require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Category = require('../models/Category');

const defaultCategories = [
  { name: 'Wi-Fi & Network', slaHours: 24, description: 'Campus internet and network access' },
  { name: 'Plumbing', slaHours: 48, description: 'Water, drains and fixtures' },
  { name: 'Electrical', slaHours: 24, description: 'Lighting and power' },
  { name: 'Furniture', slaHours: 72, description: 'Beds, desks and common-area furniture' },
  { name: 'Cleaning', slaHours: 24, description: 'Sanitation and waste' },
  { name: 'Lab Equipment', slaHours: 12, description: 'Teaching and research equipment' },
];

async function seedCategories() {
  await connectDB();

  for (const category of defaultCategories) {
    await Category.updateOne(
      { name: category.name },
      { $setOnInsert: category },
      { upsert: true, runValidators: true }
    );
  }

  console.log(`Ensured ${defaultCategories.length} default CampusPulse categories exist.`);
  await mongoose.disconnect();
}

seedCategories().catch(async (error) => {
  console.error('Unable to seed categories:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
