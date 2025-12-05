const mongoose = require('mongoose');
const User = require('./src/models/User');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const checkAvatar = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/happygames');
        console.log('Connected to DB');

        // 查找最近更新头像的用户
        const user = await User.findOne({}).sort({ updatedAt: -1 });

        if (!user) {
            console.log('No users found');
            return;
        }

        console.log('User:', user.username, user.nickname);
        console.log('Avatar Path in DB:', user.avatar);

        if (user.avatar && user.avatar.startsWith('/uploads')) {
            const localPath = path.join(__dirname, 'public', user.avatar);
            console.log('Checking local file path:', localPath);

            if (fs.existsSync(localPath)) {
                console.log('✅ File exists on disk!');
                const stats = fs.statSync(localPath);
                console.log('File size:', stats.size, 'bytes');
            } else {
                console.log('❌ File NOT found on disk!');

                // List files in avatars dir
                const avatarDir = path.join(__dirname, 'public/uploads/avatars');
                if (fs.existsSync(avatarDir)) {
                    console.log('Files in avatars dir:', fs.readdirSync(avatarDir));
                } else {
                    console.log('Avatars dir does not exist:', avatarDir);
                }
            }
        } else {
            console.log('Avatar is not a local upload (or is default).');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
};

checkAvatar();
