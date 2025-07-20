// MongoDB Database Setup Script for RSL Perfex Gateway
// Bu script MongoDB'de veritabanı ve gerekli collection'ları oluşturur

// MongoDB bağlantı bilgileri
const username = 'YOUR_USERNAME';  // Buraya MongoDB kullanıcı adınızı yazın
const password = 'YOUR_PASSWORD';  // Buraya MongoDB şifrenizi yazın
const host = 'localhost';
const port = '27017';
const dbName = 'rsl-perfex-gateway';

// Authentication ile bağlan
print('🔐 MongoDB\'ye authentication ile bağlanılıyor...');
try {
  // Admin veritabanına bağlan ve authenticate ol
  db = connect(`mongodb://${username}:${password}@${host}:${port}/admin`);
  print('✅ Authentication başarılı');
} catch (error) {
  print('❌ Authentication hatası: ' + error.message);
  print('💡 Username ve password\'ünüzü kontrol edin');
  quit(1);
}

// Veritabanına geç
use(dbName);

print(`🔄 ${dbName} veritabanı oluşturuluyor...`);

// Collection'ları oluştur
const collections = [
  'users',
  'perfex_sessions', 
  'local_tasks',
  'time_entries'
];

collections.forEach(collectionName => {
  try {
    db.createCollection(collectionName);
    print(`✅ ${collectionName} collection oluşturuldu`);
  } catch (error) {
    if (error.code === 48) {
      print(`⚠️  ${collectionName} collection zaten mevcut`);
    } else {
      print(`❌ ${collectionName} collection oluşturulurken hata: ${error.message}`);
    }
  }
});

// İndeksler oluştur
print('\n📊 İndeksler oluşturuluyor...');

// Users collection indeksleri
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "isActive": 1 });
db.users.createIndex({ "createdAt": 1 });
db.users.createIndex({ "lastLoginAt": 1 });
print('✅ Users indeksleri oluşturuldu');

// Perfex Sessions collection indeksleri
db.perfex_sessions.createIndex({ "userId": 1, "isActive": 1 });
db.perfex_sessions.createIndex({ "userId": 1, "expiresAt": 1 });
db.perfex_sessions.createIndex({ "expiresAt": 1, "isActive": 1 });
db.perfex_sessions.createIndex({ "lastUsed": 1 });
db.perfex_sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 }); // TTL index
print('✅ Perfex Sessions indeksleri oluşturuldu');

// Local Tasks collection indeksleri
db.local_tasks.createIndex({ "userId": 1, "isActive": 1 });
db.local_tasks.createIndex({ "userId": 1, "status": 1 });
db.local_tasks.createIndex({ "userId": 1, "priority": 1 });
db.local_tasks.createIndex({ "userId": 1, "perfexTaskId": 1 }, { unique: true });
db.local_tasks.createIndex({ "userId": 1, "dueDate": 1 });
db.local_tasks.createIndex({ "userId": 1, "lastSynced": 1 });
db.local_tasks.createIndex({ "status": 1, "priority": 1 });
db.local_tasks.createIndex({ "tags": 1 });
db.local_tasks.createIndex({ "project.id": 1 });
// Text search indeksi
db.local_tasks.createIndex({ 
  "title": "text", 
  "description": "text",
  "tags": "text"
});
print('✅ Local Tasks indeksleri oluşturuldu');

// Time Entries collection indeksleri
db.time_entries.createIndex({ "userId": 1, "taskId": 1 });
db.time_entries.createIndex({ "userId": 1, "isRunning": 1 });
db.time_entries.createIndex({ "userId": 1, "startTime": 1 });
db.time_entries.createIndex({ "userId": 1, "isSynced": 1 });
db.time_entries.createIndex({ "taskId": 1, "startTime": 1 });
db.time_entries.createIndex({ "perfexTaskId": 1, "perfexTimerId": 1 });
db.time_entries.createIndex({ "isRunning": 1, "userId": 1 });
db.time_entries.createIndex({ "isSynced": 1, "lastSyncAttempt": 1 });
// Unique constraint: sadece bir kullanıcının aynı anda çalışan bir timer'ı olabilir
db.time_entries.createIndex(
  { "userId": 1, "isRunning": 1 },
  { 
    unique: true,
    partialFilterExpression: { "isRunning": true }
  }
);
print('✅ Time Entries indeksleri oluşturuldu');

// Veritabanı bilgilerini göster
print('\n📊 Veritabanı Bilgileri:');
print(`📁 Veritabanı: ${db.getName()}`);
print(`📚 Collection'lar: ${db.getCollectionNames().join(', ')}`);

// Collection'ların boyutlarını göster
print('\n📈 Collection İstatistikleri:');
db.getCollectionNames().forEach(name => {
  const stats = db.getCollection(name).stats();
  print(`  ${name}: ${stats.count} döküman, ${(stats.size / 1024).toFixed(2)} KB`);
});

print('\n🎉 MongoDB veritabanı kurulumu tamamlandı!');
print('\n🔗 Bağlantı URL\'si: mongodb://localhost:27017/rsl-perfex-gateway');
print('💡 Bu veritabanını backend uygulamamızda kullanabilirsiniz.');