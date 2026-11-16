# DEV-015 — Adım 5A: GitHub Actions Docker CI + GHCR

**Kapsam:** Mevcut DEV-014 API CI + Web CI (Playwright dahil) korunur; yeni `docker-images.yml` yalnızca başarılı testlerden sonra image build/yayınlama yapar. Bu aşamada MacBook'a uzaktan deployment veya migration YOK.

## Yapılan değişiklikler

- `.github/workflows/docker-images.yml`: PR'da tests -> Docker build doğrulaması (`push: false`); `main` push'ta tests -> GHCR multi-platform image publish.
- `docker/patches/step5a-reusable-workflows.patch`: mevcut `api-ci.yml` ve `web-ci.yml` dosyalarına yalnızca `workflow_call:` tetikleyicisi ekler. Diğer test adımları **değişmez**.
- `docs/DEV-015-STEP5A.md`: bu belge.

## 1. Dosyaları aç

```bash
cd ~/Sites/my_projects/devflow
unzip -n ~/Downloads/devflow-dev015-step5a-github-actions.zip -d .
```

**İnceleyip uygula** (varsa mevcut GitHub workflows değişikliklerini koru):

```bash
git apply --check docker/patches/step5a-reusable-workflows.patch
git apply docker/patches/step5a-reusable-workflows.patch

git diff --check
git diff -- .github/workflows/api-ci.yml .github/workflows/web-ci.yml
```

Patch başka sürüme uymuyorsa zorla uygulama; iki dosyanın `on:` bölümüne elle `workflow_call:` eklemek yeterli. `on` bölümündeki mevcut `push`, `pull_request`, `workflow_dispatch` tetikleyicileri durmalı.

## 2. Sadece DEV-015 branch'e commit/push

```bash
git status --short
git check-ignore docker/env/local-production.env
# Check that .env values, private keys, dumps, .age backups are NOT staged.
git add .github/workflows/api-ci.yml .github/workflows/web-ci.yml \
  .github/workflows/docker-images.yml \
  docker/patches/step5a-reusable-workflows.patch docs/DEV-015-STEP5A.md
git diff --cached --name-only
git commit -m "ci: add Docker image build and GHCR publish pipeline"
git push -u origin feature/dev-015-devops-deployment
```

Zaten önceki adımlardan commit edilmemiş dosyalar varsa onları ayrı commit'lerle yönetebilirsin. **Sakın `git add -A` ile kontrolsüz staging yapma.**

## 3. PR aç ve GitHub Actions ekranında doğrula

DEV-015 branch'inden `main` hedefine PR aç. Yeni workflow **DevFlow Docker Images** şunları yapmalı:

1. `Reuse API CI`: unit/integration, typecheck, Prisma migrations, coverage
2. `Reuse Web CI`: unit/component, coverage, gerçek Chromium E2E
3. `PR Docker build - api` ve `PR Docker build - web`: build başarılı, **registry push YOK**

Mevcut bağımsız API/Web CI workflow'ları da çalışmaya devam eder. Bu nedenle PR'da testler iki defa koşabilir; güvenli geçiş için mevcut test workflow'larını değiştirmedik. Daha sonra tekilleştirebiliriz.

## 4. Main'e merge sonrası GHCR yayınlama

`main` push'u testler başarılı olduğunda iki multi-platform image üretir:

```
ghcr.io/<owner>/<repository>-api:sha-<40-char-main-commit-sha>
ghcr.io/<owner>/<repository>-web:sha-<40-char-main-commit-sha>
```

- Giriş `GITHUB_TOKEN` ile olur. GitHub Actions'ta `packages: write` izni yalnızca publish işine verildi.
- `main` dışındaki branch ve PR'larda image publish **yasak**.
- Dockerfile'lar root monorepo context'i (`context: .`) üzerinden build edilir.
- `linux/amd64` ve `linux/arm64` image'ları Mac Intel/Apple Silicon için desteklenir.
- Image tag commit SHA'sına bağlıdır. `latest` tag'i ile belirsiz deployment yapılmaz.
- GHCR private package ise Mac'te image çekmek için ayrıca read:packages yetkili token ile `docker login ghcr.io` gerekebilir; PAT'ı shell history'ye yazma.

**Not:** Merge, workflow'un doğrulanmasını sağlayan ayrı bir karardır. PR testleri başarılı olmadan merge yapma. Bu pakette `docker compose down`, `down -v`, veritabanı migration veya remote deploy işlemi yoktur.

## Kabul kriterleri (5A)

- [ ] Patch ve `git diff --check` başarılı
- [ ] PR'da iki reusable CI ve iki Dockerfile build işi başarılı
- [ ] PR'da image publish yok
- [ ] Merge sonrası main run'ında iki GHCR image üretildi
- [ ] Image'ların SHA tag'i doğru ve `amd64`/`arm64` platformları mevcut

**Sonraki aşama 5B:** aynı Git commit'inden alınan GHCR API/Web image'ları için ayrı Compose override ve sürüm-pinned local deploy/rollback; migration job'ı image ile aynı kaynak revizyonunda çalıştırma. Bunları GHCR yayınlaması doğrulanmadan otomatik çalıştırma.
