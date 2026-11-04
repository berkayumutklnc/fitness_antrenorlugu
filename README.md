# Fitness Çalışma Merkezi (statik web uygulaması)

Bu klasör olduğu gibi Vercel'e yüklenebilir. Build adımı yok.

## Vercel'e yükleme (en kolay)
1. Bilgisayarında bu klasörü aç (web_sitesi).
2. Terminalde: `npx vercel --prod` (ilk seferde Vercel hesabınla giriş ister, sorulara Enter ile devam).
3. Verdiği `https://....vercel.app` adresini telefonda aç, "Ana ekrana ekle" de. Uygulama çevrimdışı da çalışır.

GitHub ile: boş bir repo aç, bu klasörün içeriğini yükle, vercel.com → Add New → Project → repoyu seç → Deploy (Framework: Other, Output: kök klasör).

## İçerik
- data/uXX.json: ünite konu anlatımı + AH quizi + ekstra quiz
- data/exams.json: 3 × 100 deneme sorusu
- data/atlas.json: hareket analizi atlası
- data/proje.json, data/rehber.json: bitirme projesi ve final rehberi dokümanları
- İlerleme tarayıcının localStorage'ında tutulur (cihaza özel).
