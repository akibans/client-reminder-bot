import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

async function reproduce() {
    try {
        console.log("Registering/Logging in to get token...");
        const username = `testuser_${Date.now()}`;
        await axios.post(`${API_URL}/auth/register`, { username, password: 'password123' });
        const { data: loginData } = await axios.post(`${API_URL}/auth/login`, { username, password: 'password123' });
        const token = loginData.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log("Creating a client...");
        const { data: client } = await axios.post(`${API_URL}/clients`, { name: 'Test Client', email: `test_${Date.now()}@example.com` }, config);
        
        console.log("Creating a reminder...");
        const scheduleAt = new Date(Date.now() + 10000).toISOString();
        const { data: reminder } = await axios.post(`${API_URL}/reminders`, {
            message: 'Test Reminder',
            sendVia: 'email',
            scheduleAt,
            clients: [client.id]
        }, config);

        console.log(`Created reminder: ${reminder.id}. Attempting to delete...`);
        const { data: deleteRes } = await axios.delete(`${API_URL}/reminders/${reminder.id}`, config);
        console.log("Deletion success:", deleteRes);

    } catch (err) {
        console.error("Reproduction failed with error:");
        if (err.response) {
            console.error(err.response.status, err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

reproduce();
