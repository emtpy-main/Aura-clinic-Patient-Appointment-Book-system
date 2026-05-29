const http = require('http');

const API_BASE = 'http://localhost:5000/api';

const request = (url, method, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : {}
          });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw: data } });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTest = async () => {
  console.log('=== STARTING CONCURRENCY LOCK TEST ===');
  const timestamp = Date.now();

  const doctorEmail = `doc_${timestamp}@clinic.com`;
  const patient1Email = `p1_${timestamp}@clinic.com`;
  const patient2Email = `p2_${timestamp}@clinic.com`;

  console.log('1. Registering doctor:', doctorEmail);
  const docReg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: doctorEmail,
    password: 'password123',
    role: 'doctor',
    name: 'Dr. Test Concurrency',
    specialization: 'Testing'
  });
  if (docReg.status !== 201) throw new Error('Doctor registration failed');

  console.log('2. Log in as doctor to generate token...');
  const docLogin = await request(`${API_BASE}/auth/login`, 'POST', {
    email: doctorEmail,
    password: 'password123'
  });
  const docToken = docLogin.body.token;

  console.log('3. Registering Patient 1:', patient1Email);
  const p1Reg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: patient1Email,
    password: 'password123',
    role: 'patient'
  });

  console.log('4. Registering Patient 2:', patient2Email);
  const p2Reg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: patient2Email,
    password: 'password123',
    role: 'patient'
  });

  console.log('5. Log in Patient 1 & 2 to generate tokens...');
  const p1Login = await request(`${API_BASE}/auth/login`, 'POST', { email: patient1Email, password: 'password123' });
  const p2Login = await request(`${API_BASE}/auth/login`, 'POST', { email: patient2Email, password: 'password123' });
  const p1Token = p1Login.body.token;
  const p2Token = p2Login.body.token;

  console.log('6. Generating slots as Doctor...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const genSlots = await request(`${API_BASE}/slots/generate`, 'POST', {
    startDate: tomorrowStr,
    endDate: tomorrowStr,
    intervalMinutes: 30,
    startTimeStr: '10:00',
    endTimeStr: '10:30'
  }, docToken);

  console.log('Generated slots count:', genSlots.body.count);

  console.log('7. Fetching available slots...');
  const doctorId = docLogin.body.user.doctorProfile._id;
  const fetchAvail = await request(`${API_BASE}/slots/available?doctorId=${doctorId}&date=${tomorrowStr}`, 'GET');
  const slots = fetchAvail.body.slots;
  if (!slots || slots.length === 0) {
    throw new Error('No slots available for booking test');
  }

  const slotId = slots[0]._id;
  console.log('Target Slot ID for concurrent bookings:', slotId);

  console.log('8. Dispatching concurrent booking requests...');
  const [res1, res2] = await Promise.all([
    request(`${API_BASE}/appointments`, 'POST', { slotId, reason: 'Patient 1 Booking' }, p1Token),
    request(`${API_BASE}/appointments`, 'POST', { slotId, reason: 'Patient 2 Booking' }, p2Token)
  ]);

  console.log('Booking 1 response status:', res1.status, res1.body.message);
  console.log('Booking 2 response status:', res2.status, res2.body.message);

  const statuses = [res1.status, res2.status];
  const successCount = statuses.filter(s => s === 201).length;
  const conflictCount = statuses.filter(s => s === 409).length;

  console.log('\n--- VERIFICATION RESULTS ---');
  console.log(`Successful Bookings (expected 1): ${successCount}`);
  console.log(`Conflict Bookings (expected 1): ${conflictCount}`);

  if (successCount === 1 && conflictCount === 1) {
    console.log('✅ SUCCESS: Concurrency locking successfully prevented double booking!');
    process.exit(0);
  } else {
    console.error('❌ FAILURE: Concurrency locking failed or double booking occurred!');
    process.exit(1);
  }
};

runTest().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
