import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

async function main() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection;
    const users = db.collection('users');

    // Create a test L2 user for AC 111 with known password
    const passwordHash = await bcrypt.hash('test111', 10);

    const result = await users.updateOne(
      { email: 'test111@kuralapp.com' },
      {
        $set: {
          email: 'test111@kuralapp.com',
          phone: '9876543111',
          name: 'Test ACI 111',
          password: passwordHash,
          passwordHash: passwordHash,
          role: 'L2',
          assignedAC: 111,
          aciName: 'Mettupalayam',
          aci_name: 'Mettupalayam',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('Test user created/updated:');
    console.log('  Email: test111@kuralapp.com');
    console.log('  Password: test111');
    console.log('  Role: L2');
    console.log('  AC: 111 (Mettupalayam)');
    console.log('Result:', result);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
