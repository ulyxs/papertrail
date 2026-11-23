# Digital Treasury Ledger
A React dashboard backed by a PHP JSON API and a MySQL/MariaDB database. It supports account registration and approval, role-based access, categorized incoming funds with proof images, project-linked disbursements, receipt submissions, auditor decisions, and an activity log.

## Run locally with XAMPP

1. Start **MySQL** in the XAMPP Control Panel. Make sure PHP has the `pdo_mysql` extension enabled.
2. Open phpMyAdmin at `http://localhost/phpmyadmin`.
   - For a **fresh install**, import [`server/schema.sql`](./server/schema.sql). Do not run the migrations on this new schema.
   - To **upgrade an existing install**, do not re-import the schema. Migration scripts are not included in this checkout, so preserve your existing database and prepare a reviewed migration before upgrading it.
   - The initial schema contains no sample accounts or voucher recipients. Approved accounts automatically appear as voucher recipients; project and transaction tables start empty.
   - Existing databases are upgraded automatically on API startup: disbursement records receive their semester and month values from the release date.
3. **Provision the first Admin** from the repository root after the schema or migrations are installed. Run this only in a trusted terminal; password input is visible:

   ```powershell
   C:\xampp\php\php.exe server\setup_initial_admin.php
   ```

   ```
   php server/setup_initial_admin.php
   ```

   The command is CLI-only, creates an approved Admin with a securely hashed password, and refuses to run once any Admin account exists. Registrations cannot assign themselves the Admin role.
4. Start the PHP API server from the repository root:

   ```powershell
   C:\xampp\php\php.exe -S 127.0.0.1:8000 -t server/public
   ```

   ```
   php -S 127.0.0.1:8000 -t server/public
   ```

5. In a second terminal:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

6. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The Vite development server proxies `/api.php` to the PHP server. For the built site, run `npm run build` in `client`; Vite writes the site into `server/public`, alongside the API. Point Apache's document root at `server/public` to serve the built site.

Dashboard pages use hash routes (for example, `/#/funds`), so reloading or using the browser's back and forward buttons keeps navigation on the selected page.

Database connection settings are read from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The defaults in [`server/config/database.php`](./server/config/database.php) match a typical local XAMPP install (`root` with an empty password); change them for your environment.

## Accounts and access

- Registration collects first name, last name, email, and password. New accounts receive the `User` role and `pending` status and cannot sign in until an Admin approves them and assigns a role.
- The supported roles are `User`, `Auditor`, `Treasurer`, and `Admin`. API endpoints enforce permissions in addition to the role-filtered navigation.
- Users and Auditors can view financial records; Auditors can review transactions and access audit history. Treasurers manage incoming funds, projects, disbursements, and liquidation. Admins can access all sections and manage accounts.
- Treasurer and Admin users can view registered accounts in Personnel, including each account's voucher clearance status and linked receipt history. Approved accounts are automatically synchronized as voucher recipients; pending and disapproved accounts cannot be selected for new releases. Existing voucher records remain preserved.
- Passwords are stored as password hashes. Session cookies are HttpOnly and SameSite; state-changing API requests require a CSRF token. Use HTTPS and secure database credentials when deploying.
- Password recovery is not included. Ordinary users cannot edit their own account details.

## Notes

- Projects require a name and start/end dates. Projects with linked vouchers cannot be deleted; archive them instead. Existing voucher/project names are migrated into projects, with dates left unknown rather than guessed.
- Disbursement receipt submissions record vendor, reference, amount, date, and an optional note. They may also include a JPG/JPEG or PNG proof image up to 5 MB.
- Incoming funds may include a JPEG, PNG, or WebP proof image up to 5 MB. Proofs are stored under `server/storage` outside the public web root and viewed through the API. Ensure PHP can write to `server/storage`, and configure `upload_max_filesize` to at least `5M` and `post_max_size` to at least `8M` in `php.ini`.
- A mismatched receipt must be flagged; a flagged record can be cleared only after an auditor records how it was resolved.
- Before public deployment or use with real financial records, add login rate limiting, configure HTTPS and secure database credentials, and review the hosting environment's error handling and storage permissions.
