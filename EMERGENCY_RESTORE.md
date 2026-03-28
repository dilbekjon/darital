# Darital Emergency Restore

Bu fayl emergency holatda tez tiklash uchun.

Qachon ishlatiladi:
- VPS ishlamay qolsa
- Docker volume yo'qolsa
- PostgreSQL data buzilsa
- MinIO file'lar yo'qolsa
- noto'g'ri deploy sabab system ochilmay qolsa

## 1. Nima borligini biling

Sizda backup 2 joyda bo'ladi:
- local: `/opt/darital-backups/...`
- off-site: `Cloudflare R2 -> darital/backups/...`

Har bir backup ichida:

```text
db/darital.dump
files/minio-data.tar.gz
configs/.env.production
configs/docker-compose.prod.yml
configs/docker-compose.vps.yml
configs/nginx-darital.conf
configs/nginx.conf
configs/RESTORE-ORDER.txt
manifest.txt
```

## 2. Eng muhim prioritet

Tiklash tartibi:
1. config
2. postgres
3. minio files
4. api/admin/tenant
5. smoke test

## 3. Agar eski VPS tirik bo'lsa

Avval hozirgi holatni to'xtatib yubormang. Yangi backup olishga urinib ko'ring:

```bash
cd ~/darital
sudo BACKUP_RCLONE_REMOTE=darital-backup:darital/backups ./scripts/backup-vps.sh
```

Agar shu ishlasa, eng yangi backup bilan davom eting.

## 4. Agar yangi VPS bo'lsa

### 4.1. Asosiy paketlar

```bash
sudo apt update
sudo apt install -y docker.io docker-compose nginx rclone curl
```

### 4.2. Repo'ni olib keling

```bash
cd ~
git clone <YOUR_DARITAL_REPO_URL> darital
cd ~/darital
```

### 4.3. R2 remote'ni ulang

`rclone config` orqali oldingi `darital-backup` remote'ni qayta yarating.

Test:

```bash
rclone lsd darital-backup:
rclone lsf darital-backup:darital/backups
```

## 5. Backup'dan config'larni qaytarish

Avval qaysi backup'ni tiklamoqchi ekaningizni tanlang:

```bash
rclone lsf darital-backup:darital/backups
```

Misol uchun:
- `2026-03-28_18-32-58`

### 5.1. Backup'ni local'ga tushiring

```bash
mkdir -p ~/restore-work
rclone copy darital-backup:darital/backups/2026-03-28_18-32-58 ~/restore-work/2026-03-28_18-32-58
```

### 5.2. Config'larni joyiga qo'ying

```bash
cp ~/restore-work/2026-03-28_18-32-58/configs/.env.production ~/darital/.env.production
cp ~/restore-work/2026-03-28_18-32-58/configs/docker-compose.prod.yml ~/darital/docker-compose.prod.yml
cp ~/restore-work/2026-03-28_18-32-58/configs/docker-compose.vps.yml ~/darital/docker-compose.vps.yml
sudo cp ~/restore-work/2026-03-28_18-32-58/configs/nginx-darital.conf /etc/nginx/sites-available/darital
sudo cp ~/restore-work/2026-03-28_18-32-58/configs/nginx.conf /etc/nginx/nginx.conf
```

Nginx test:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6. PostgreSQL va MinIO'ni ko'tarish

Avval faqat infra service'larni ishga tushiring:

```bash
cd ~/darital
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production up -d postgres redis minio
```

Holatini tekshiring:

```bash
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production ps
```

## 7. Database restore

### 7.1. Dump faylni tayyorlang

Backup dump yo'li:

```bash
~/restore-work/2026-03-28_18-32-58/db/darital.dump
```

### 7.2. Restore command

Repo ichidagi script bilan restore qiling:

```bash
cd ~/darital
chmod +x scripts/restore-db-vps.sh
./scripts/restore-db-vps.sh ~/restore-work/2026-03-28_18-32-58/db/darital.dump
```

Bu script:
- mavjud DB'ni drop qiladi
- qayta create qiladi
- `darital.dump` ni restore qiladi

## 8. MinIO files restore

Backup archive:

```bash
~/restore-work/2026-03-28_18-32-58/files/minio-data.tar.gz
```

Avval archive'ni oching:

```bash
mkdir -p ~/restore-work/minio-restore
tar -xzf ~/restore-work/2026-03-28_18-32-58/files/minio-data.tar.gz -C ~/restore-work/minio-restore
```

Keyin MinIO container ichiga qaytaring:

```bash
sudo docker cp ~/restore-work/minio-restore/minio-data/. darital-minio:/data
sudo docker restart darital-minio
```

## 9. App service'larni ko'tarish

Database va files qaytgandan keyin:

```bash
cd ~/darital
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production up -d --build api admin-web tenant-web
```

Holatini tekshiring:

```bash
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production ps
```

Loglar:

```bash
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production logs --tail=100 api
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production logs --tail=100 admin-web
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production logs --tail=100 tenant-web
```

## 10. Smoke test

Tiklangandan keyin shularni tekshiring:
- admin login ochilyaptimi
- tenant login ochilyaptimi
- tenantlar ro'yxati ko'rinyaptimi
- contractlar ko'rinyaptimi
- uploaded file'lar ochilyaptimi
- live support chat ishlayaptimi
- `/api/health` javob beryaptimi

Minimal command:

```bash
curl -I https://api.darital-arenda.uz/api/health
```

## 11. Agar faqat database buzilgan bo'lsa

To'liq VPS restore shart emas. Faqat:
1. eng yangi backup'ni toping
2. `scripts/restore-db-vps.sh` bilan DB restore qiling
3. API'ni restart qiling

```bash
cd ~/darital
./scripts/restore-db-vps.sh /opt/darital-backups/YYYY-MM-DD_HH-MM-SS/db/darital.dump
sudo docker-compose -f docker-compose.prod.yml -f docker-compose.vps.yml --env-file .env.production restart api
```

## 12. Agar faqat file'lar yo'qolgan bo'lsa

Faqat MinIO restore qiling:

```bash
mkdir -p ~/restore-work/minio-restore
tar -xzf /opt/darital-backups/YYYY-MM-DD_HH-MM-SS/files/minio-data.tar.gz -C ~/restore-work/minio-restore
sudo docker cp ~/restore-work/minio-restore/minio-data/. darital-minio:/data
sudo docker restart darital-minio
```

## 13. Restore bo'lgandan keyin

Majburiy ishlar:
- yangi manual backup oling
- Telegram backup alert kelyaptimi tekshiring
- admin paneldan asosiy data to'g'ri ochilganini tekshiring
- R2 off-site backup yana ishlayotganini tekshiring

```bash
cd ~/darital
sudo BACKUP_RCLONE_REMOTE=darital-backup:darital/backups ./scripts/backup-vps.sh
rclone lsf darital-backup:darital/backups
```

## 14. Emergency checklist

Qisqa checklist:
1. Oxirgi backup'ni top
2. Config'ni qaytar
3. Postgres/MinIO'ni ko'tar
4. DB restore qil
5. File restore qil
6. API/Admin/Tenant'ni ko'tar
7. Smoke test qil
8. Yangi backup olib tasdiqla

## 15. Eslatma

Application archive system backup emas.

Haqiqiy recovery uchun siz quyilarga tayanasiz:
- `darital.dump`
- `minio-data.tar.gz`
- `.env.production`
- nginx config
- compose config
