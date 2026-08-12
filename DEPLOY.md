# YULO Production Deploy — yulowear.in

## Final live URLs

- Website: https://yulowear.in
- Admin: https://admin.yulowear.in
- API: https://api.yulowear.in

---

## Easiest way (from your Mac) — one command

After SSH is enabled once on MilesWeb:

```bash
cd /Users/naveenreddy/Desktop/NaveenHosur/projects/yulo
cp deploy.env.example deploy.env
# edit deploy.env with your MilesWeb SSH user + host

chmod +x scripts/deploy.sh
./scripts/deploy.sh              # website + admin + api
./scripts/deploy.sh website      # only website
./scripts/deploy.sh admin        # only admin
./scripts/deploy.sh api          # only api
```

This builds locally and uploads with `rsync` over SSH.  
It never overwrites the production `api .env` or `uploads/`.

---

## STEP 1 — Buy / open hosting

You need hosting with:

- PHP 8.2+
- MySQL database
- cPanel (Hostinger / GoDaddy / etc. is fine)

---

## STEP 2 — Create subdomains in cPanel

In cPanel → Domains / Subdomains, create:

1. `admin.yulowear.in`
2. `api.yulowear.in`

Main domain `yulowear.in` is already there.

---

## STEP 3 — Create MySQL database

In cPanel → MySQL Databases:

1. Create database → e.g. `yulo_db`
2. Create user → e.g. `yulo_user`
3. Set a strong password
4. Add user to database with ALL privileges

Save these 3 values. You need them later.

---

## STEP 4 — Build website + admin on your Mac

Open Terminal and run:

```bash
cd /Users/naveenreddy/Desktop/NaveenHosur/projects/yulo

# Build website
cd frontend
npm install
npm run build
cd ..

# Build admin
cd admin
npm install --legacy-peer-deps
npm run build
cd ..
```

After this you will have:

- `frontend/dist` → website files
- `admin/dist` → admin files

---

## STEP 5 — Upload files (File Manager or FTP)

### A) Website → yulowear.in

Upload **all files inside** `frontend/dist/`  
to: `public_html/` (or your main domain folder)

### B) Admin → admin.yulowear.in

Upload **all files inside** `admin/dist/`  
to: the `admin` subdomain folder  
(example: `public_html/admin` or `admin.yulowear.in`)

### C) API → api.yulowear.in

Upload the full `backend/` folder contents  
to: the `api` subdomain folder

Do **NOT** upload your local `backend/.env` from Mac if it has localhost settings.  
Create a new `.env` on the server (Step 6).

---

## STEP 6 — Create production backend `.env` on server

In the API folder, create a file named `.env` with:

```env
APP_NAME=YULO
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yulowear.in
FRONTEND_URL=https://yulowear.in
ADMIN_URL=https://admin.yulowear.in

DB_HOST=localhost
DB_PORT=3306
DB_NAME=YOUR_DB_NAME
DB_USER=YOUR_DB_USER
DB_PASS=YOUR_DB_PASSWORD

JWT_SECRET=change-this-to-a-long-random-secret-key-min-32-chars
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

CORS_ALLOWED_ORIGINS=https://yulowear.in,https://www.yulowear.in,https://admin.yulowear.in

UPLOAD_PATH=uploads
MAX_UPLOAD_SIZE=5242880

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=helloyulowear@gmail.com
MAIL_PASSWORD=YOUR_GMAIL_APP_PASSWORD
MAIL_FROM_ADDRESS=helloyulowear@gmail.com
MAIL_FROM_NAME=YULO

PHONEPE_MERCHANT_ID=
PHONEPE_SALT_KEY=
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=production
PHONEPE_CALLBACK_URL=https://api.yulowear.in/api/payments/phonepe/callback

RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60
```

Replace:

- `YOUR_DB_NAME`
- `YOUR_DB_USER`
- `YOUR_DB_PASSWORD`
- `YOUR_GMAIL_APP_PASSWORD`
- `JWT_SECRET` (make a long random string)

---

## STEP 7 — Import database (MilesWeb / cPanel)

Important: shared hosting **cannot** run `CREATE DATABASE yulo_db`.
Use the database you already created in cPanel (example: `yulowear1_123`).

In phpMyAdmin:

1. Click your database name on the left (e.g. `yulowear1_123`)
2. Click **Import**
3. Choose `backend/database/schema.sql` → Go
4. (Optional) Import `backend/database/seed.sql` for demo data
5. In API `.env` set:
   ```env
   DB_NAME=yulowear1_123
   DB_USER=your_cpanel_db_user
   DB_PASS=your_cpanel_db_password
   ```
   (use your real DB name/user from cPanel — not `yulo_db`)

---

## STEP 8 — Install PHP packages on API

If your host has SSH / Terminal:

```bash
cd api-folder-path
composer install --no-dev --ignore-platform-reqs
chmod -R 775 uploads
```

If no SSH: ask host support to run composer, or upload `vendor/` from your Mac after:

```bash
cd backend
composer install --no-dev --ignore-platform-reqs
```

Then upload the `vendor` folder too.

---

## STEP 9 — Enable SSL

In cPanel → SSL / Let’s Encrypt:

Enable HTTPS for:

- yulowear.in
- www.yulowear.in
- admin.yulowear.in
- api.yulowear.in

---

## STEP 10 — Test

1. Open https://api.yulowear.in/api/health  
   → should return success JSON
2. Open https://yulowear.in  
   → website
3. Open https://admin.yulowear.in  
   → admin login
4. Register a user → OTP email should arrive
5. Add product in admin → check it on website

---

## Local development (later, on your laptop)

Keep using localhost. Do not change production files for this.

```bash
# API
cd backend && php -S 127.0.0.1:8080 router.php

# Website
cd frontend && npm run dev

# Admin
cd admin && npm run dev
```

- Local uses `.env` with localhost
- Live build uses `.env.production` with yulowear.in

---

## If something fails

| Problem | Fix |
|---|---|
| Website blank / 404 on refresh | Make sure `.htaccess` is in website/admin folders |
| API not working | Check `.env` DB values + `api/health` |
| CORS error | Check `CORS_ALLOWED_ORIGINS` includes your live domains |
| OTP not sending | Check Gmail app password in API `.env` |
| Images not showing | Make sure `uploads` folder is writable |
| Admin “Internal server error” when adding products | Deploy latest API code. Also import `backend/database/home_sections.sql` in phpMyAdmin if `home_sections` / `product_home_sections` are missing. Ensure `uploads` is writable (`chmod -R 775 uploads`). Use a unique product slug. |
| Product image upload fails | `chmod -R 775 uploads` on the API folder; confirm PHP `fileinfo` is enabled |
