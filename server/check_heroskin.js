require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected.');

        const query = 'heroskin';
        console.log(`Searching for user: ${query}`);
        
        const user = await User.findOne({
            $or: [
                { username: query },
                { nickname: query },
                { piUsername: query }
            ]
        });

        if (user) {
            console.log('User found:');
            console.log('  ID:', user._id);
            console.log('  Username:', user.username);
            console.log('  Nickname:', user.nickname);
            console.log('  Avatar:', user.avatar);
            console.log('  Raw User Object:', JSON.stringify(user.toObject(), null, 2));
        } else {
            console.log(`User '${query}' not found.`);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
