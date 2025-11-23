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

                // 2. Generate a FIXED mock user for development stability
                // Using a fixed ID ensures we don't keep creating new users and hitting DB limits or conflicts
                const mockUser = {
                    uid: 'pi_user_dev_001',
                    username: 'Pi_Dev_User',
                    accessToken: 'mock_access_token_dev'
                };

                // Save to localStorage
                localStorage.setItem('mock_pi_user', JSON.stringify(mockUser));
                console.log('Created Fixed Mock User');

                resolve(mockUser);
            }, 800);
        });
    }
};
