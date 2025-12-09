import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function main() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection;

    // Check L2 users for AC 111
    const users = db.collection('users');
    const l2Users = await users.find({ role: 'L2', assignedAC: 111 }).toArray();
    console.log('L2 Users for AC 111:');
    l2Users.forEach(u => {
      console.log('  - Email:', u.email);
      console.log('    Password:', u.password);
      console.log('    passwordHash:', u.passwordHash ? 'exists' : 'null');
      console.log('    isActive:', u.isActive);
      console.log('');
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
