import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';
let token = '';
let userId = '';
let clientId = '';
let reminderId = '';

const api = axios.create({
  baseURL: API_URL,
  validateStatus: () => true, // Don't throw on any status
});

async function test() {
  try {
    console.log('🧪 Testing delete endpoint with foreign key fixes...\n');

    // 1. Register
    console.log('1️⃣  Registering user...');
    const registerRes = await api.post('/auth/register', {
      email: `test-${Date.now()}@example.com`,
      password: 'Test@1234',
      name: 'Test User',
    });
    console.log(`Response: ${registerRes.status}`);
    if (registerRes.status !== 201) {
      console.error('Failed to register:', registerRes.data);
      return;
    }
    token = registerRes.data.token;
    userId = registerRes.data.user.id;
    console.log(`✅ Registered user: ${userId}\n`);

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // 2. Create client
    console.log('2️⃣  Creating client...');
    const clientRes = await api.post('/clients', {
      name: 'Test Client',
      email: 'client@example.com',
      phone: '1234567890',
    });
    console.log(`Response: ${clientRes.status}`);
    if (clientRes.status !== 201) {
      console.error('Failed to create client:', clientRes.data);
      return;
    }
    clientId = clientRes.data.id;
    console.log(`✅ Created client: ${clientId}\n`);

    // 3. Create reminder
    console.log('3️⃣  Creating reminder...');
    const reminderRes = await api.post('/reminders', {
      clientId: clientId,
      title: 'Test Reminder',
      description: 'This is a test reminder',
      reminderDate: new Date(Date.now() + 86400000).toISOString(),
      reminderTime: '10:00',
    });
    console.log(`Response: ${reminderRes.status}`);
    if (reminderRes.status !== 201) {
      console.error('Failed to create reminder:', reminderRes.data);
      return;
    }
    reminderId = reminderRes.data.id;
    console.log(`✅ Created reminder: ${reminderId}\n`);

    // 4. Delete reminder
    console.log('4️⃣  Deleting reminder...');
    const deleteRes = await api.delete(`/reminders/${reminderId}`);
    console.log(`Response Status: ${deleteRes.status}`);
    console.log(`Response Data:`, JSON.stringify(deleteRes.data, null, 2));

    if (deleteRes.status === 200) {
      console.log('\n✅ ✅ ✅ DELETE SUCCESSFUL! ✅ ✅ ✅\n');
      console.log('The foreign key constraint issue has been FIXED!');
    } else {
      console.log('\n❌ Delete failed');
      if (deleteRes.data.stack) {
        console.log('\nError Stack:');
        console.log(deleteRes.data.stack);
      }
    }
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

test();
