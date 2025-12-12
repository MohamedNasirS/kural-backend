const mongoose = require('mongoose');
require('../server/models/User.js');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kuralapp');
    const User = mongoose.model('User');

    // Find all L2 users
    const users = await User.find({ role: 'L2' }).select('name email phone assignedAC role');

    console.log('All ACI (L2) users:');
    users.forEach(u => {
      console.log(`  Name: ${u.name}, Email: ${u.email}, AssignedAC: ${u.assignedAC} (type: ${typeof u.assignedAC})`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUser();
