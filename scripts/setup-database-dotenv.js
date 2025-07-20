// MongoDB Database Setup Script for RSL Perfex Gateway (.env version)
// Bu script backend/.env dosyasından MongoDB bağlantı bilgilerini okur

// .env dosyasını yükle
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '../backend/.env');
  
  if (!fs.existsSync(envPath)) {
    print('❌ .env dosyası bulunamadı: ' + envPath);
    print('💡 Önce backend/.env dosyasını oluşturun');
    quit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim();
      }
    }
  });
  
  return envVars;
}

// Environment variables yükle
const env = loadEnvFile();

// MongoDB bağlantı bilgileri
const username = env.MONGODB_USERNAME || '';
const password = env.MONGODB_PASSWORD || '';
const host = env.MONGODB_HOST || 'localhost';
const port = env.MONGODB_PORT || '27017';
const dbName = env.MONGODB_DATABASE || 'rsl-perfex-gateway';
const mongoUri = env.MONGODB_URI;

print('🔄 MongoDB Database Setup başlatılıyor...');
print('📁 .env dosyası: backend/.env');
print(`📊 Hedef veritabanı: ${dbName}`);
print(`🔗 Host: ${host}:${port}`);

// Bağlantı URI'sini oluştur
let connectionUri;
if (mongoUri) {
  connectionUri = mongoUri;
  print('🔗 MONGODB_URI kullanılıyor');
} else if (username && password) {
  connectionUri = `mongodb://${username}:${password}@${host}:${port}/${dbName}`;
  print(`👤 Authentication: ${username}:***`);
} else {
  connectionUri = `mongodb://${host}:${port}/${dbName}`;
  print('🔓 Authentication yok');
}

// MongoDB'ye bağlan
print('\n🔐 MongoDB\'ye bağlanılıyor...');
try {
  if (username && password) {
    // Authentication gerekli
    db = connect(`mongodb://${username}:${password}@${host}:${port}/admin`);
    print('✅ Authentication başarılı');
    use(dbName);
  } else {
    // Authentication yok
    db = connect(`mongodb://${host}:${port}/${dbName}`);
    print('✅ Bağlantı başarılı');
  }
} catch (error) {
  print('❌ Bağlantı hatası: ' + error.message);
  print('💡 .env dosyasındaki MongoDB ayarlarını kontrol edin');
  quit(1);
}

print(`\n🔄 ${dbName} veritabanı oluşturuluyor...`);

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

try {
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

} catch (error) {
  print('❌ İndeks oluşturma hatası: ' + error.message);
}

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
print(`\n🔗 Bağlantı URL'si: ${connectionUri.replace(/:([^:@]+)@/, ':***@')}`);
print('💡 Backend uygulamanız .env dosyasındaki ayarlarla çalışacak.');