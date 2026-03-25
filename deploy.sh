#!/bin/bash
set -e

echo "🚀 RandevuApp Deploy Scripti"
echo "================================"

# 1. Zip'i çıkart (eğer zip'ten çalışıyorsa)
# cd ~/Downloads && unzip randevuapp.zip && cd randevuapp

# 2. Git ayarları
git init
git branch -M main

# 3. Remote ekle (repo adını güncelle)
git remote add origin https://github.com/memofti/randevum.git 2>/dev/null || git remote set-url origin https://github.com/memofti/randevum.git

# 4. Tüm dosyaları ekle ve push et
git add -A
git commit -m "feat: RandevuApp Next.js 14 - Müşteri, Firma ve Admin panelleri"
git push -u origin main --force

echo ""
echo "✅ GitHub'a yüklendi!"
echo ""
echo "Şimdi Vercel'de şunları yap:"
echo "1. vercel.com → 'New Project' → 'randevum' reposunu seç"
echo "2. Environment Variables ekle:"
echo "   NEXT_PUBLIC_SUPABASE_URL = https://mqaqwqomabsctozeuryf.supabase.co"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYXF3cW9tYWJzY3RvemV1cnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjcyODcsImV4cCI6MjA4OTM0MzI4N30.l4rNSdTME5L0SNtT2qIM_XWojtto_xutmuzEENai0x8"
echo "3. Deploy'a bas"
echo ""
echo "Veya Vercel CLI ile:"
echo "   npm i -g vercel && vercel --name randevuapp"
