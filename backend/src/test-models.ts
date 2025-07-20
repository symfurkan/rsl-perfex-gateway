import { database } from './utils/database.js';
import { User, PerfexSession, LocalTask, TimeEntry } from './models/index.js';

async function testModels() {
  console.log('🧪 Starting model tests...');
  
  try {
    // Connect to database
    await database.connect();
    console.log('✅ Database connected');
    
    // Test User model
    console.log('\n📝 Testing User model...');
    const testUser = new User({
      email: 'test@example.com',
      passwordHash: '$2b$10$dummy.hash.for.testing.purposes.only.1234567890',
      perfexCredentials: {
        email: 'perfex@example.com',
        password: 'encrypted_password_here',
        encryptionKey: 'test_encryption_key_123'
      }
    });
    
    console.log('User validation:', testUser.validateSync() === null ? '✅ Valid' : '❌ Invalid');
    
    // Test PerfexSession model
    console.log('\n🔑 Testing PerfexSession model...');
    const testSession = new PerfexSession({
      userId: testUser._id,
      sessionCookie: 'sp_session=test_cookie_value',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
    
    console.log('Session validation:', testSession.validateSync() === null ? '✅ Valid' : '❌ Invalid');
    console.log('Session is valid:', testSession.isValid() ? '✅ Valid' : '❌ Invalid');
    
    // Test LocalTask model
    console.log('\n📋 Testing LocalTask model...');
    const testTask = new LocalTask({
      userId: testUser._id,
      perfexTaskId: 'TASK-123',
      title: 'Test Task Implementation',
      description: 'This is a test task for validation',
      status: 'In Progress',
      priority: 'High',
      assignees: [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com'
        }
      ],
      lastSynced: new Date(),
      tags: ['backend', 'testing', 'mongodb']
    });
    
    console.log('Task validation:', testTask.validateSync() === null ? '✅ Valid' : '❌ Invalid');
    console.log('Task progress:', testTask.progressPercentage + '%');
    
    // Test TimeEntry model
    console.log('\n⏱️  Testing TimeEntry model...');
    const testTimeEntry = new TimeEntry({
      userId: testUser._id,
      taskId: testTask._id,
      perfexTaskId: 'TASK-123',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      endTime: new Date(),
      notes: 'Worked on implementing database models',
      isRunning: false
    });
    
    console.log('TimeEntry validation:', testTimeEntry.validateSync() === null ? '✅ Valid' : '❌ Invalid');
    console.log('TimeEntry duration:', testTimeEntry.formattedDuration);
    console.log('TimeEntry status:', testTimeEntry.status);
    
    // Test virtual fields and methods
    console.log('\n🔧 Testing methods and virtuals...');
    console.log('Task is overdue:', testTask.isOverdue() ? '⚠️ Yes' : '✅ No');
    console.log('Session is expired:', testSession.isExpired() ? '❌ Yes' : '✅ No');
    console.log('TimeEntry current duration:', testTimeEntry.getCurrentDuration() + ' minutes');
    
    // Test database health
    console.log('\n💾 Testing database health...');
    const health = await database.healthCheck();
    console.log('Database health:', health);
    
    console.log('\n🎉 All model tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Model test failed:', error);
  } finally {
    // Disconnect from database
    await database.disconnect();
    console.log('✅ Database disconnected');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testModels().catch(console.error);
}

export { testModels };