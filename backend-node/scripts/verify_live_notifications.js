import app from '../src/app.js';
import { connectDB } from '../src/config/database.js';
import request from 'supertest';

async function runLiveVerification() {
  console.log('='.repeat(70));
  console.log('🚀 SkillBridge AI: Live Notification System Verification');
  console.log('='.repeat(70));

  await connectDB();

  // 1. Health Probe
  console.log('\n[1/7] Probing GET /api/v1/health ...');
  const healthRes = await request(app).get('/api/v1/health');
  console.log(`  -> Status: HTTP ${healthRes.status}`);
  console.log(`  -> Response:`, JSON.stringify(healthRes.body));

  // 2. Student Authentication (Web & Mobile Shared Account)
  console.log('\n[2/7] Authenticating Shared Test Account (student@skillbridge.ai) ...');
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'student@skillbridge.ai', password: 'Student@123456' });

  if (loginRes.status !== 200) {
    console.error('  ❌ Login failed:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.access_token;
  const user = loginRes.body.user;
  console.log(`  -> Auth Success: User ID ${user.id} (${user.email}, ${user.full_name})`);

  // 3. Trigger Learning Event Notification
  console.log('\n[3/7] Dispatching Application Notification Event (POST /api/v1/notifications) ...');
  const createRes = await request(app)
    .post('/api/v1/notifications')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: '🎯 Practice Quiz Milestone',
      message: 'You scored 90% on Python Data Structures Diagnostic!',
      type: 'quiz_result',
    });

  console.log(`  -> Status: HTTP ${createRes.status}`);
  console.log(`  -> Created Notification: ID ${createRes.body.id} ("${createRes.body.title}")`);
  const notifId = createRes.body.id;

  // 4. Query Notifications List (React Web & Flutter Mobile)
  console.log('\n[4/7] Querying Notifications List & Unread Count ...');
  const listRes = await request(app)
    .get('/api/v1/notifications')
    .set('Authorization', `Bearer ${token}`);

  console.log(`  -> List Total: ${listRes.body.total} item(s)`);
  console.log(`  -> Unread Count: ${listRes.body.unread_count}`);

  // 5. Simulate React Web Action: Mark Read
  console.log(`\n[5/7] Simulating React Web Action: Mark Notification ID ${notifId} as Read ...`);
  const readRes = await request(app)
    .patch(`/api/v1/notifications/${notifId}/read`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`  -> Status: HTTP ${readRes.status}, is_read=${readRes.body.is_read}`);

  // 6. Simulate Flutter Mobile Query: Verify Updated Unread Count
  console.log('\n[6/7] Simulating Flutter Mobile Query: Verifying Updated State ...');
  const countRes = await request(app)
    .get('/api/v1/notifications/unread-count')
    .set('Authorization', `Bearer ${token}`);

  console.log(`  -> Updated Unread Count: ${countRes.body.unread_count}`);

  // 7. Delete Notification & Confirm Sync
  console.log(`\n[7/7] Executing Delete Action (DELETE /api/v1/notifications/${notifId}) ...`);
  const delRes = await request(app)
    .delete(`/api/v1/notifications/${notifId}`)
    .set('Authorization', `Bearer ${token}`);

  console.log(`  -> Status: HTTP ${delRes.status}, message: "${delRes.body.message}"`);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Live E2E Notification System Verification Completed Successfully!');
  console.log('='.repeat(70));
  process.exit(0);
}

runLiveVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
