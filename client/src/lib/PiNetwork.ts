// This service abstracts the Pi Network SDK interactions.
// In development (localhost), it mocks the SDK behavior.
// In production (Pi Browser), it should call the real window.Pi methods.

export const Pi = {
    authenticate: async () => {
        // Check if we are in a real Pi Browser environment (usually checks for window.Pi)
        // For this demo, we assume localhost = Mock Mode

        console.log('Mocking Pi.authenticate()...');

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 1. Check if we already have a stored mock user
                const storedUser = localStorage.getItem('mock_pi_user');
                if (storedUser) {
                    console.log('Restoring Mock User from localStorage');
                    resolve(JSON.parse(storedUser));
                    return;
                }

                // 2. Generate a RANDOM mock user for development testing
                // This allows multiple devices/browsers to simulate different users
                const randomId = Math.floor(Math.random() * 10000);
                const mockUser = {
                    uid: `pi_user_dev_${randomId}`,
                    username: `Dev_User_${randomId}`,
                    accessToken: `mock_access_token_${randomId}`
                };

                // Save to localStorage
                localStorage.setItem('mock_pi_user', JSON.stringify(mockUser));
                console.log('Created Random Mock User:', mockUser.username);

                resolve(mockUser);
            }, 800);
        });
    }
};
