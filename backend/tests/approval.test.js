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

const runApprovalTest = async () => {
  console.log('=== STARTING APPROVAL API TEST ===');
  const timestamp = Date.now();

  const doctorEmail = `doc_appr_${timestamp}@clinic.com`;
  const patientEmail = `pat_appr_${timestamp}@clinic.com`;

  console.log('1. Registering Doctor...');
  const docReg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: doctorEmail,
    password: 'password123',
    role: 'doctor',
    name: 'Dr. Approval Test',
    specialization: 'Cardiology'
  });
  if (docReg.status !== 201) throw new Error('Doctor registration failed');

  const docLogin = await request(`${API_BASE}/auth/login`, 'POST', { email: doctorEmail, password: 'password123' });
  const docToken = docLogin.body.token;
  const doctorId = docLogin.body.user.doctorProfile._id;

  console.log('2. Registering Patient...');
  const patReg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: patientEmail,
    password: 'password123',
    role: 'patient'
  });
  const patLogin = await request(`${API_BASE}/auth/login`, 'POST', { email: patientEmail, password: 'password123' });
  const patToken = patLogin.body.token;

  console.log('3. Generating slot for Doctor...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  await request(`${API_BASE}/slots/generate`, 'POST', {
    startDate: tomorrowStr,
    endDate: tomorrowStr,
    intervalMinutes: 30,
    startTimeStr: '11:00',
    endTimeStr: '11:30'
  }, docToken);

  console.log('4. Fetching slots...');
  const slotsFetch = await request(`${API_BASE}/slots/available?doctorId=${doctorId}&date=${tomorrowStr}`, 'GET');
  const slotId = slotsFetch.body.slots[0]._id;

  console.log('5. Patient booking slot...');
  const bookRes = await request(`${API_BASE}/appointments`, 'POST', { slotId, reason: 'Routine Test' }, patToken);
  const appointmentId = bookRes.body.appointment._id;
  console.log('Appointment ID:', appointmentId);

  console.log('6. Doctor approving slot...');
  const apprRes = await request(`${API_BASE}/appointments/${appointmentId}/status`, 'PATCH', { status: 'approved' }, docToken);
  console.log('Approval response status:', apprRes.status, apprRes.body.message);

  console.log('7. Doctor rejecting slot (to test state toggle)...');
  const rejectRes = await request(`${API_BASE}/appointments/${appointmentId}/status`, 'PATCH', { status: 'rejected' }, docToken);
  console.log('Rejection response status:', rejectRes.status, rejectRes.body.message);

  if (apprRes.status === 200 && rejectRes.status === 200) {
    console.log('✅ SUCCESS: Doctor approval and rejection endpoints are fully operational and verified!');
    process.exit(0);
  } else {
    console.error('❌ FAILURE: Status update request returned error code.');
    process.exit(1);
  }
};

runApprovalTest().catch((err) => {
  console.error('Approval test failed:', err);
  process.exit(1);
});
