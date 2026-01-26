import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config';
import { User } from '../src/models';

/**
 * Seed script to create the first admin user
 * Run with: npm run seed:admin
 */
async function seedAdmin(): Promise<void> {
    try {
        // Connect to database
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists:');
            console.log(`  Email: ${existingAdmin.email}`);
            console.log(`  Username: ${existingAdmin.username}`);
            await mongoose.disconnect();
            return;
        }

        // Create admin user
        const adminData = {
            username: 'admin',
            email: 'admin@aiclub.local',
            password: await bcrypt.hash('admin123', 12),
            role: 'admin',
            credits: 99999,
        };

        const admin = new User(adminData);
        await admin.save();

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('Login credentials:');
        console.log('  Email: admin@aiclub.local');
        console.log('  Password: admin123');
        console.log('');
        console.log('⚠️  IMPORTANT: Change this password immediately after first login!');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Failed to seed admin:', error);
        process.exit(1);
    }
}

seedAdmin();
