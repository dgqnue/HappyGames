
require('dotenv').config();
const { fetchLatestAvatarUrl } = require('./server/src/utils/avatarUtils');
const { getFullAvatarUrl } = require('./server/src/utils/urlUtils');

async function test() {
    console.log('Testing avatar URLs...');
    
    // Test 1: Null user ID (should return default avatar full URL)
    const defaultUrl = await fetchLatestAvatarUrl(null);
    console.log('Default Avatar URL (from fetchLatestAvatarUrl(null)):', defaultUrl);

    // Test 2: Direct getFullAvatarUrl check
    const directDefault = getFullAvatarUrl('/images/default-avatar.png');
    console.log('Direct getFullAvatarUrl("/images/default-avatar.png"):', directDefault);
    
    const nullDefault = getFullAvatarUrl(null);
    console.log('Direct getFullAvatarUrl(null):', nullDefault);
}

test();
