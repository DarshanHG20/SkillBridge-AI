import app from './app.js';
import config from './config/index.js';
import { connectDB } from './config/database.js';
import { Skill, User } from './models/index.js';
import { runSqlMigration } from '../scripts/migrate_sql_to_mongo.js';
import { seedMongoDatabase } from '../scripts/seed_mongo.js';

async function bootstrap() {
  try {
    console.log('='.repeat(70));
    console.log(`Starting ${config.projectName} Node.js Express Server...`);
    console.log('='.repeat(70));

    await connectDB();

    // 1. Initialize preserved SQLite curriculum taxonomy first if database has no skills yet
    const skillCount = await Skill.countDocuments();
    if (skillCount === 0) {
      console.log('[Bootstrap] Initializing curriculum taxonomy from preserved SQLite database...');
      try {
        await runSqlMigration({ dryRun: false, disconnect: false });
      } catch (migErr) {
        console.warn('[Bootstrap] SQL migration notice:', migErr.message);
      }
    }

    // 2. Seed accounts, enriched courses, modules, lessons, quizzes (>=5 questions), coding & RAG docs
    try {
      await seedMongoDatabase({ disconnect: false });
    } catch (seedErr) {
      console.warn('[Bootstrap] Seeding notice:', seedErr.message);
    }

    const server = app.listen(config.port, config.host, () => {
      console.log(`🚀 SkillBridge AI Node.js Backend is running!`);
      console.log(`🌐 Server URL:        http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
      console.log(`🏥 Health Check:      http://localhost:${config.port}${config.apiV1Str}/health`);
      console.log(`📚 API Root:          http://localhost:${config.port}${config.apiV1Str}`);
      console.log(`⚙️  Environment:       ${config.environment}`);
      console.log('='.repeat(70));
    });

    return server;
  } catch (err) {
    console.error('Fatal error during server startup:', err);
    process.exit(1);
  }
}

bootstrap();

export { bootstrap };
