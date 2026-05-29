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

const runSlotsTest = async () => {
  console.log('=== STARTING SLOTS MANAGEMENT AND DUPLICATE GUARD TEST ===');
  const timestamp = Date.now();

  const doctorEmail = `doc_slot_${timestamp}@clinic.com`;
  const patientEmail = `pat_slot_${timestamp}@clinic.com`;

  console.log('1. Registering Doctor...');
  const docReg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: doctorEmail,
    password: 'password123',
    role: 'doctor',
    name: 'Dr. Slots Tester',
    specialization: 'Neurology'
  });
  if (docReg.status !== 201) throw new Error('Doctor registration failed: ' + JSON.stringify(docReg.body));

  const docLogin = await request(`${API_BASE}/auth/login`, 'POST', { email: doctorEmail, password: 'password123' });
  const docToken = docLogin.body.token;
  const doctorId = docLogin.body.user.doctorProfile._id;

  console.log('2. Registering Patient...');
  const patReg = await request(`${API_BASE}/auth/register`, 'POST', {
    email: patientEmail,
    password: 'password123',
    role: 'patient'
  });
  if (patReg.status !== 201) throw new Error('Patient registration failed: ' + JSON.stringify(patReg.body));

  const patLogin = await request(`${API_BASE}/auth/login`, 'POST', { email: patientEmail, password: 'password123' });
  const patToken = patLogin.body.token;

  // Let's set a target date (e.g. 5 days from now to avoid collisions)
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 5);
  const targetDateStr = targetDate.toISOString().split('T')[0];
  console.log(`Target date for slots: ${targetDateStr}`);

  console.log('2.5. Attempting to generate slots for a past date (should fail)...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const genPastRes = await request(`${API_BASE}/slots/generate`, 'POST', {
    startDate: yesterdayStr,
    endDate: yesterdayStr,
    intervalMinutes: 30,
    startTimeStr: '10:00',
    endTimeStr: '11:00'
  }, docToken);

  if (genPastRes.status === 400 && genPastRes.body.message.includes('past dates')) {
    console.log('✅ PASS: Correctly blocked past date slot generation. Msg:', genPastRes.body.message);
  } else {
    throw new Error(`❌ FAIL: Generating slots for past date did not fail as expected. Status: ${genPastRes.status}, body: ${JSON.stringify(genPastRes.body)}`);
  }

  console.log('3. Generating slots for the first time on target date...');
  const genRes1 = await request(`${API_BASE}/slots/generate`, 'POST', {
    startDate: targetDateStr,
    endDate: targetDateStr,
    intervalMinutes: 30,
    startTimeStr: '10:00',
    endTimeStr: '11:00' // Generates 2 slots: 10:00-10:30, 10:30-11:00
  }, docToken);

  if (genRes1.status !== 201) {
    throw new Error('Initial slot generation failed: ' + JSON.stringify(genRes1.body));
  }
  console.log('Initial slots generated successfully.');

  console.log('4. Attempting duplicate slot generation on the same date (should fail)...');
  const genRes2 = await request(`${API_BASE}/slots/generate`, 'POST', {
    startDate: targetDateStr,
    endDate: targetDateStr,
    intervalMinutes: 30,
    startTimeStr: '11:00',
    endTimeStr: '12:00'
  }, docToken);

  if (genRes2.status === 400) {
    console.log('✅ PASS: Duplicate guard correctly blocked generation. Msg:', genRes2.body.message);
  } else {
    throw new Error(`❌ FAIL: Duplicate guard did not block generation. Status: ${genRes2.status}, body: ${JSON.stringify(genRes2.body)}`);
  }

  console.log('5. Fetching generated slots...');
  const slotsFetch = await request(`${API_BASE}/slots/available?doctorId=${doctorId}&date=${targetDateStr}`, 'GET');
  const slots = slotsFetch.body.slots;
  if (!slots || slots.length < 2) {
    throw new Error('Fetched slots are invalid or empty: ' + JSON.stringify(slotsFetch.body));
  }
  const slot1 = slots[0];
  const slot2 = slots[1];
  console.log(`Slot 1 ID: ${slot1._id}, status: ${slot1.status}`);
  console.log(`Slot 2 ID: ${slot2._id}, status: ${slot2.status}`);

  console.log('6. Toggling slot 1 availability to unavailable...');
  const toggleRes1 = await request(`${API_BASE}/slots/${slot1._id}/toggle`, 'PATCH', null, docToken);
  if (toggleRes1.status !== 200 || toggleRes1.body.slot.status !== 'unavailable') {
    throw new Error('Failed to toggle slot 1 availability: ' + JSON.stringify(toggleRes1.body));
  }
  console.log('✅ PASS: Toggled slot 1 status to unavailable successfully.');

  console.log('7. Verifying slot 1 availability change in list...');
  const slotsFetchAfterToggle = await request(`${API_BASE}/slots/available?doctorId=${doctorId}&date=${targetDateStr}`, 'GET');
  const fetchedSlot1 = slotsFetchAfterToggle.body.slots.find(s => s._id === slot1._id);
  if (fetchedSlot1.status !== 'unavailable') {
    throw new Error('Slot 1 status in list is not unavailable: ' + JSON.stringify(fetchedSlot1));
  }
  console.log('✅ PASS: Slot list shows updated unavailable status.');

  console.log('8. Patient booking slot 2 (should succeed)...');
  const bookRes = await request(`${API_BASE}/appointments`, 'POST', { slotId: slot2._id, reason: 'Follow-up' }, patToken);
  if (bookRes.status !== 201) {
    throw new Error('Failed to book slot 2: ' + JSON.stringify(bookRes.body));
  }
  console.log('Slot 2 successfully booked.');

  console.log('9. Checking booked slot constraints (toggling availability of slot 2 should fail)...');
  const toggleRes2 = await request(`${API_BASE}/slots/${slot2._id}/toggle`, 'PATCH', null, docToken);
  if (toggleRes2.status === 400) {
    console.log('✅ PASS: Blocked toggling of booked slot 2. Msg:', toggleRes2.body.message);
  } else {
    throw new Error(`❌ FAIL: Toggling booked slot 2 did not fail. Status: ${toggleRes2.status}`);
  }

  console.log('10. Checking booked slot constraints (deleting booked slot 2 should fail)...');
  const deleteRes2 = await request(`${API_BASE}/slots/${slot2._id}`, 'DELETE', null, docToken);
  console.log(`Delete Res 2: status = ${deleteRes2.status}, body =`, JSON.stringify(deleteRes2.body));
  if (deleteRes2.status === 400) {
    console.log('✅ PASS: Blocked deletion of booked slot 2. Msg:', deleteRes2.body.message);
  } else {
    throw new Error(`❌ FAIL: Deleting booked slot 2 did not fail. Status: ${deleteRes2.status}`);
  }

  console.log('11. Deleting slot 1 (unavailable) (should succeed)...');
  const deleteRes1 = await request(`${API_BASE}/slots/${slot1._id}`, 'DELETE', null, docToken);
  console.log(`Delete Res 1: status = ${deleteRes1.status}, body =`, JSON.stringify(deleteRes1.body));
  if (deleteRes1.status !== 200) {
    throw new Error('Failed to delete slot 1: ' + JSON.stringify(deleteRes1.body));
  }
  console.log('✅ PASS: Slot 1 deleted successfully.');

  console.log('12. Verifying slot 1 is removed from database...');
  const slotsFetchAfterDelete = await request(`${API_BASE}/slots/available?doctorId=${doctorId}&date=${targetDateStr}`, 'GET');
  const existsSlot1 = slotsFetchAfterDelete.body.slots.some(s => s._id === slot1._id);
  if (existsSlot1) {
    throw new Error('Deleted slot 1 still exists in available slots list');
  }
  console.log('✅ PASS: Slot 1 is no longer in the list.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
};

runSlotsTest().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
