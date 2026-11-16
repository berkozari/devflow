# DevFlow · DEV-014 — GitHub Actions CI and coverage gates

Bu paket DEV-014'ün **CI hazırlık** aşamasıdır. Yeni unit/E2E testleri içermez. Kullanıcının yerel ortamında beş Playwright E2E testi başarılıdır; **bu workflow'ların GitHub üzerinde çalıştırıldığı henüz doğrulanmadı**.

## Dosyalar

| Yol | Eylem |
| --- | --- |
| `.github/workflows/api-ci.yml` | Önceki API CI dosyasının güncellenmiş sürümü; varsa değiştirecek |
| `.github/workflows/web-ci.yml` | **Yeni** frontend + gerçek E2E CI workflow'u |
| `apps/api/vitest.config.ts` | Bilinen son API Vitest config + threshold; varsa değiştirecek |
| `apps/web/vitest.config.ts` | Bilinen son frontend Vitest config + threshold + lcov; varsa değiştirecek |

**Önemli:** Dosyalar, önceki sohbetlerde paylaşılan kaynakların son bilinen sürümlerinden hazırlandı. Bunlar canlı çalışma ağacının (`git status`) kopyası değildir. `unzip -o` kullanmadan önce mevcut config'leri mutlaka karşılaştır.

## 1. Kurulum: önce diff

Monorepo kökünde:

```bash
mkdir -p /tmp/devflow-ci-review
unzip ~/Downloads/devflow-dev014-ci-final.zip -d /tmp/devflow-ci-review

# Var olan dosyalarla değişiklikleri kontrol et
for file in \
  .github/workflows/api-ci.yml \
  .github/workflows/web-ci.yml \
  apps/api/vitest.config.ts \
  apps/web/vitest.config.ts; do
  if [[ -f "$file" ]]; then
    diff -u "$file" "/tmp/devflow-ci-review/$file" || true
  fi
done
```

Kontrol ettikten sonra:

```bash
unzip -o ~/Downloads/devflow-dev014-ci-final.zip -d .
```

**Bu ZIP dosyası `.env`, `.env.test`, test kaynakları, package.json veya pnpm-lock.yaml değiştirmez.**

## 2. Coverage thresholds

| Alan | Statements | Branches | Functions | Lines | Son bildirilen yerel ölçüm |
| --- | ---: | ---: | ---: | ---: | --- |
| API | 85% | 75% | 85% | 85% | 89.59 / 79.72 / 92.50 / 89.63 |
| Web | 85% | 80% | 80% | 85% | 91.40 / 88.34 / 86.43 / 92.44 |

Vitest coverage kontrolü eşik altına düşerse CI başarısız olur. Frontend raporuna LCOV çıktısı da eklendi. Coverage kapsamı değiştirilmedi (`src/main.tsx` hariç ve mevcut include/exclude kalıpları korunur).

## 3. Workflow davranışı

### API CI

- `push`, `pull_request` ve `workflow_dispatch` ile çalışır.
- Node 24, root `packageManager`'dan pnpm, `pnpm install --frozen-lockfile`.
- PostgreSQL 17 ve Redis 7 için geçici GitHub Actions servisleri (sırasıyla 5432 ve **6380**).
- Ayrı `devflow_test` veritabanı ve yalnızca workflow'a ait test kullanıcı/parolası.
- `apps/api/.env.test` dosyası CI runner'da hazırlanır; Git'e eklenmez.
- Prisma Client `generate`; test DB üzerinde `prisma migrate deploy`; API typecheck/build; Vitest unit/integration + coverage.
- API coverage artifact'ı 7 gün saklanır.

### Web CI

- `web-tests`: frontend typecheck (`test:typecheck` dahil), build ve unit/component + coverage eşikleri.
- `browser-e2e`: `web-tests` başarılı olduktan sonra ayrı runner ve **ayrı** PostgreSQL/Redis servisleri ile başlar. Prisma migration'larını sadece CI test DB'sine uygular, API'yi 3000 portunda başlatır, CSRF endpoint + `Access-Control-Allow-Origin` doğrular, Playwright Chromium ile tüm 5 E2E testi çalıştırır.
- `playwright install --with-deps chromium` kullanır; testler tek worker ve retry=0 olarak mevcut Playwright config tarafından yönetilir.
- Hatalı E2E sonuçlarının izleri/raporları 3 gün saklanır. **Trace'ler test token/cookie bilgileri içerebilir**; GitHub artifact erişimi olan kişilerin bunları gizli test çıktısı olarak değerlendirmesi gerekir.
- Yapılandırma gerçek geliştirici/production veritabanını veya Redis'i kullanmaz; `E2E_ISOLATED_DB=confirmed` yanında URL host/db/port kontrolleri uygular.

## 4. Önkoşullar

1. Monorepo kökünde `package.json` içinde `packageManager: "pnpm@..."` (son bilinen `pnpm@12.18.0`), `pnpm-lock.yaml`, `pnpm-workspace.yaml` bulunmalı. `pnpm-lock.yaml` değişiklikleri de commit'e dahil edilmeli.
2. `apps/api/prisma.config.ts`, `apps/api/prisma/migrations/` veya uygulamanın kullandığı migrasyon yolu source control'e ekli olmalı. Prisma v7 migrasyonları `DATABASE_URL` ile test DB'ye uygulanır. Bu iki dosya/yol ZIP içinde bulunmaz ve ayrıca sağlanmış değildi.
3. `@playwright/test` ve frontend Vitest paketleri `apps/web/package.json` ve lockfile'da kurulu olmalı (beş yerel Playwright testinin geçmesi kurulu olduklarına işaret ediyor, ancak Git'te commit edilip edilmedikleri ayrıca kontrol edilmeli).
4. API `pnpm --filter @devflow/api build` sonrası `pnpm --dir apps/api start` komutuyla ayağa kalkmalı. `PORT=3000` ve `CLIENT_URL1=http://127.0.0.1:5173` env'leri kullanılmalı.
5. Root `.gitignore` içinde şu kalıplar bulunmalı; *güncel .gitignore verilmediğinden otomatik değiştirilmedi*:
   ```gitignore
   **/.env.test
   **/coverage/
   **/playwright-report/
   **/test-results/
   ```
6. GitHub Actions kullanımı için repo'da Actions etkin olmalı. Bu iş akışları GitHub-hosted Ubuntu runner ve Docker service container desteğine ihtiyaç duyar.

## 5. Önce yerel testleri tekrar doğrula

```bash
pnpm --filter @devflow/web test:typecheck
pnpm --filter @devflow/web test:coverage
pnpm --filter @devflow/web build

# api .env.test / isolated local postgres / redis test servisi açıkken:
pnpm --filter @devflow/api typecheck
pnpm --filter @devflow/api build
pnpm --filter @devflow/api exec vitest run --coverage

# E2E için çalışır API + ayrı test DB ve Redis gerekir:
E2E_ISOLATED_DB=confirmed \
E2E_API_BASE_URL=http://127.0.0.1:3000/api/v1 \
pnpm --filter @devflow/web exec playwright test --config playwright.config.ts
```

API test komutu `apps/api/.env.test` içindeki `TEST_DATABASE_URL`'yi kullanır; bu dosya güvenli değilse testleri çalıştırma.

## 6. Commit/push kontrolü (henüz yapma)

```bash
git status --short
git diff -- .github/workflows/api-ci.yml .github/workflows/web-ci.yml apps/api/vitest.config.ts apps/web/vitest.config.ts
git check-ignore -v apps/api/.env.test apps/web/coverage apps/web/test-results || true
```

Yerel kontroller geçtikten sonra **ayrı feature branch**'te workflow'ları push ederek GitHub Actions'in `DevFlow API CI` ve `DevFlow Web CI` adımlarıyla gerçek runner doğrulaması yapılmalı. İlk başarılı GitHub Actions koşusuna kadar DEV-014 CI kabul kriteri tamamlandı diye işaretlenmemelidir. `API - Build...`, `Web - Typecheck...` ve `E2E - Chromium...` job'ları için repository ruleset / required status checks yapılandırılabilir.

## 7. Olası ilk-run sorunları

| İşaret | Kontrol |
| --- | --- |
| `pnpm install --frozen-lockfile` başarısız | root lockfile, root `packageManager`, @playwright/test devDependency uyumu |
| `prisma migrate deploy` başarısız | `prisma.config.ts`, committed migrations, Prisma 7 config DATABASE_URL kullanımı |
| Backend start başarısız | Node build çıktısındaki `dist/index.js`, `pnpm --dir apps/api start`, Prisma generate |
| API CORS ön kontrolü başarısız | `CLIENT_URL1=http://127.0.0.1:5173`, port 3000, backend logları |
| Playwright tarayıcı açılmıyor | `playwright install --with-deps chromium`, @playwright/test sürüm uyumu |
| Coverage eşik altında | İlgili `apps/{api,web}/coverage/index.html` raporları, kapsamı yapay düşürmeden kritik test ekleme |

**Test doğrulama notu:** Workflow YAML parse ve shell sözdizimi kontrolü yapıldı. Bu ortamda tam DevFlow monorepo, pnpm-lock.yaml, gerçek PostgreSQL/Redis, GitHub runner ve tarayıcı bulunmadığı için uçtan uca CI çalıştırılamadı.
