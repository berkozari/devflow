# DEV-015 — Adım 4: Health Monitoring (local-production)

Bu paket mevcut DevFlow `devflow-prod-local` Compose projesine uygundur. Domain, HTTPS ve bulut izleme servisi gerektirmez. Development/test veritabanlarını kullanmaz, volume silmez ve migration çalıştırmaz.

## Tasarım

- `GET /api/v1/health/live` → her zaman HTTP 200 (`{"status":"ok"}`), API işlemi HTTP cevap verebiliyorsa canlıdır. Veritabanını sorgulamaz.
- `GET /api/v1/health/ready` → hem PostgreSQL için Prisma `SELECT 1` hem de Redis için `PING` başarılıysa HTTP 200. Herhangi birinin başarısızlığı/yavaşlığı durumunda HTTP 503 (`{"status":"unavailable"}`). İki sorgu paralel, her biri 2 saniyeyle sınırlı.
- Endpoint'ler API'de Helmet ve requestLogger'dan sonra; CORS, cookie, CSRF ve uygulama route'larından **önce** mount edilir. Böylece CSRF session cookie üretmez ve login olmadan izlenebilir. API zaten yalnızca Compose ağı üzerinden erişilebilir, dışarıdan erişim web reverse proxy'den `localhost:8080` ile sınırlıdır.
- Compose API healthcheck, geçici CSRF endpoint'inden gerçek `/ready` endpoint'ine çevrilir. PostgreSQL, Redis ve Web healthcheck'leri daha önceki Compose dosyasından aynen kalır. Her servis için log rotation da mevcut: `json-file` / `10m` / `3`.
- `docker/scripts/health-status-local-production.sh` Docker container health status + HTTP kontrollerini raporlar ve hata durumunda exit 1 verir. **Komut sadece kontrol eder; servisleri yeniden başlatmaz.**

**Önemli:** Docker'da `unhealthy` olmak tek başına `restart: unless-stopped` ile container'ı otomatik olarak yeniden başlatmaz. Restart policy süreç kapandığında devreye girer. Health monitor sağlıksızlığı saptar; kök neden incelemesi ve kontrollü toparlama gerekir.

## İçerik

- `apps/api/src/routes/health.routes.ts` (yeni, gerçek bağımlılık kontrolü)
- `apps/api/tests/unit/routes/health.routes.test.ts` (mock PostgreSQL/Redis, gerçek veritabanına dokunmaz)
- `docker/patches/step4-health-monitoring.patch` (mevcut `app.ts` ve `compose.prod-local.yaml` için dar patch)
- `docker/scripts/health-status-local-production.sh` (yerel health raporu)
- `docker/DEV-015-STEP4.md` (bu belge)

## 1 — Dosyaları kopyala

Repo kökünde:

```bash
cd ~/Sites/my_projects/devflow
unzip -n ~/Downloads/devflow-dev015-step4-health-monitoring.zip -d .
```

**Mevcut `app.ts` veya Compose dosyası arşiv tarafından doğrudan değiştirilmez.** Patch uygulanmadan önce kontrol et:

```bash
git apply --check docker/patches/step4-health-monitoring.patch
# Yalnızca kontrol başarılıysa:
git apply docker/patches/step4-health-monitoring.patch

git diff -- apps/api/src/app.ts docker/compose.prod-local.yaml
```

Patch geçmiş kaynak sürümü üzerinde hazırlanmıştır. `git apply --check` başarısızsa zorlamayın; güncel iki dosya üzerinden dar patch'i uyarlayalım. Yeni dosyalar yanlışlıkla root README veya env dosyası üzerine yazmaz.

## 2 — Test, typecheck, Docker image

```bash
pnpm --dir apps/api exec vitest run tests/unit/routes/health.routes.test.ts
pnpm --filter @devflow/api build

docker build --progress=plain -f apps/api/Dockerfile -t devflow-api:dev015 .
```

API prod Docker image'ı yeni health route'unu içermelidir. Web image'ını yeniden build etmek gerekmez.

## 3 — Compose doğrula, yalnızca API'yi yeniden oluştur

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml config --quiet

docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml \
  up -d --no-deps --force-recreate api
```

Bu işlem PostgreSQL/Redis container'larını değiştirmez ve veritabanı volume'larını silmez. Çalışan API bağlantıları kısa süreli kesilir.

## 4 — Temel smoke test

```bash
curl -i http://localhost:8080/api/v1/health/live
curl -i http://localhost:8080/api/v1/health/ready
bash docker/scripts/health-status-local-production.sh
```

Beklenen: iki endpoint `HTTP 200`, `{"status":"ok"}`. Script sonunda `HEALTH CHECK PASSED`, dört container `healthy`.

Log inceleme:

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml logs --tail=80 api web postgres redis
```

Docker Desktop container sağlık durumu da görülebilir. Kontroller şifre, token veya connection string'i döndürmez; log paylaşmadan önce içerik kontrolü yine de yap.

## 5 — İsteğe bağlı kontrollü Redis arıza testi

Önce açık kullanıcı işlerini tamamla. Bu test local-production uygulamasında geçici olarak Redis bağlantısını keser, diğer ortamları etkilemez:

```bash
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml stop redis

curl -i http://localhost:8080/api/v1/health/live   # 200
curl -i http://localhost:8080/api/v1/health/ready  # 503

# Mutlaka Redis'i geri başlat:
docker compose --env-file docker/env/local-production.env \
  -f docker/compose.prod-local.yaml start redis

curl -i http://localhost:8080/api/v1/health/ready  # tekrar 200 olmalı
```

Eğer ioredis bağlantıyı kesmiş ve tekrar bağlanamıyorsa, Redis healthy olduktan sonra yalnız API'yi `docker compose ... restart api` ile yeniden başlatabilirsin. `docker compose down -v` veya PostgreSQL volume sıfırlama gerekmiyor. Bu testi yapmadan da unit testleri Redis başarısızlığını doğrular.

## Kabul kriterleri

- [ ] API unit testleri başarılı
- [ ] TypeScript build ve API Docker build başarılı
- [ ] Compose `config --quiet` başarılı
- [ ] `live` 200, `ready` 200; hem API hem diğer üç servis healthy
- [ ] Redis / PostgreSQL başarısızlıklarında `ready` 503 (en azından unit testlerde)
- [ ] Health endpoint'leri CSRF cookie oluşturmaz ve secret/error ayrıntısı içermez
- [ ] Mevcut frontend, login ve data işlemleri çalışmaya devam eder
- [ ] Log rotation kuralı var ve health-status scripti başarılı

### Eksikler / sınırlar

- Bu sürüm, Docker health status ve yerel kontrol scriptiyle **yerel izleme** sağlar; Slack/e-posta alarm servisi veya Prometheus kurulmaz.
- İleride gerçek sunucuya geçildiğinde HTTPS/domain ve dış uptime alarmı eklenebilir.
- Backup ile ilgili açık kalan *otomatik harici şifreli kopya* gereksinimi Adım 3B kapsamında ayrı tutulur; bu paket onu tamamlamaz.
- Paket daha eski paylaşılmış API snapshot'ına ve DEV-015 Adım 2 Compose dosyasına göre hazırlandı; kullanıcının son commit'iyle gerçek çalışma doğrulaması yerel terminalde yapılmalıdır.
