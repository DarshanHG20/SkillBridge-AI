import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/database.js';
import config from '../src/config/index.js';
import {
  User,
  Skill,
  Assessment,
  Career,
  Project,
  CodingProblem,
  Document,
} from '../src/models/index.js';

async function verify() {
  console.log('=== SkillBridge AI: E2E Backend & Database Verification ===');
  console.log(`Node Environment: ${config.nodeEnv}`);
  console.log(`Port: ${config.port}`);
  console.log(`Configured MongoDB URI: ${config.mongoUri}`);

  const conn = await connectDB();
  const dbHost = conn.host;
  const dbPort = conn.port;
  const dbName = conn.name;
  console.log(`Active MongoDB Connection: ${dbHost}:${dbPort}/${dbName}`);
  console.log(`Database Mode: ${dbPort ? (conn.client?.s?.url?.includes('127.0.0.1') ? 'Local MongoDB / In-Memory' : 'External Cluster') : 'Connected'}`);

  // 1. Verify User Seed & Auth
  const admin = await User.findOne({ email: 'admin@skillbridge.ai' });
  const student = await User.findOne({ email: 'student@skillbridge.ai' });

  console.log('\n--- 1. Account & Credential Verification ---');
  if (admin) {
    const adminMatch = await bcrypt.compare('Admin@123456', admin.hashed_password);
    console.log(`Admin account [${admin.email}] found: role=${admin.role}, passwordMatch=${adminMatch}`);
  } else {
    console.log('Admin account not found in current database.');
  }

  if (student) {
    const studentMatch = await bcrypt.compare('Student@123456', student.hashed_password);
    console.log(`Student account [${student.email}] found: role=${student.role}, passwordMatch=${studentMatch}`);
  } else {
    console.log('Student account not found in current database.');
  }

  // 2. Collection Record Counts
  console.log('\n--- 2. Database Record Counts ---');
  const userCount = await User.countDocuments();
  const skillCount = await Skill.countDocuments();
  const assessmentCount = await Assessment.countDocuments();
  const careerCount = await Career.countDocuments();
  const projectCount = await Project.countDocuments();
  const problemCount = await CodingProblem.countDocuments();
  const docCount = await Document.countDocuments();

  console.log(`Users: ${userCount}`);
  console.log(`Skills: ${skillCount}`);
  console.log(`Assessments: ${assessmentCount}`);
  console.log(`Careers: ${careerCount}`);
  console.log(`Projects: ${projectCount}`);
  console.log(`Coding Problems: ${problemCount}`);
  console.log(`Knowledge Documents: ${docCount}`);

  await disconnectDB();
  console.log('\n=== E2E Verification Completed Successfully ===');
}

verify().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
