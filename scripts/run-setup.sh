#!/bin/bash

# MongoDB Database Setup Runner
# Bu script MongoDB veritabanı kurulumunu çalıştırır

echo "🚀 RSL Perfex Gateway - MongoDB Kurulum"
echo "========================================"

# Kullanıcıdan bilgileri al
read -p "MongoDB Username: " MONGODB_USERNAME
read -s -p "MongoDB Password: " MONGODB_PASSWORD
echo
read -p "MongoDB Host (default: localhost): " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-localhost}
read -p "MongoDB Port (default: 27017): " MONGODB_PORT
MONGODB_PORT=${MONGODB_PORT:-27017}
read -p "Database Name (default: rsl-perfex-gateway): " MONGODB_DATABASE
MONGODB_DATABASE=${MONGODB_DATABASE:-rsl-perfex-gateway}

echo
echo "📋 Bağlantı Bilgileri:"
echo "  Host: $MONGODB_HOST:$MONGODB_PORT"
echo "  Username: $MONGODB_USERNAME"
echo "  Database: $MONGODB_DATABASE"
echo

read -p "Devam etmek istiyor musunuz? (y/N): " confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ İşlem iptal edildi"
    exit 1
fi

# Environment variables set et
export MONGODB_USERNAME
export MONGODB_PASSWORD
export MONGODB_HOST
export MONGODB_PORT
export MONGODB_DATABASE

echo
echo "🔄 MongoDB kurulum script'i çalıştırılıyor..."

# Script'i çalıştır
if mongosh < scripts/setup-database-env.js; then
    echo
    echo "🎉 Kurulum başarılı!"
    echo
    echo "📝 Backend .env dosyanız için:"
    echo "MONGODB_URI=mongodb://$MONGODB_USERNAME:$MONGODB_PASSWORD@$MONGODB_HOST:$MONGODB_PORT/$MONGODB_DATABASE"
else
    echo
    echo "❌ Kurulum başarısız!"
    echo "💡 MongoDB bağlantı bilgilerinizi kontrol edin"
    exit 1
fi