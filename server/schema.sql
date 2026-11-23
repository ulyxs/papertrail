CREATE DATABASE IF NOT EXISTS treasury_ledger
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE treasury_ledger;

-- A registered account starts pending; Admin approval is required before it can sign in.
CREATE TABLE IF NOT EXISTS accounts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('User', 'Auditor', 'Treasurer', 'Admin') NOT NULL DEFAULT 'User',
  status ENUM('pending', 'approved', 'disapproved') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY accounts_email_unique (email),
  KEY accounts_status_role_idx (status, role)
) ENGINE=InnoDB;

-- Voucher recipients mirror approved accounts so each disbursement stays linked to an account.
CREATE TABLE IF NOT EXISTS people (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id INT UNSIGNED NULL,
  name VARCHAR(161) NOT NULL,
  position VARCHAR(120) NOT NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY people_account_unique (account_id),
  KEY people_status_name_idx (status, name),
  CONSTRAINT people_account_fk FOREIGN KEY (account_id) REFERENCES accounts(id)
) ENGINE=InnoDB;

-- Incoming funds and their optional proof are recorded together for the financial ledger.
CREATE TABLE IF NOT EXISTS funds (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_name VARCHAR(180) NOT NULL,
  income_category ENUM(
    'Department Allocation',
    'Membership Dues',
    'Sponsorships',
    'Donations',
    'Fundraising Activities',
    'Grants',
    'Others'
  ) NOT NULL DEFAULT 'Others',
  amount DECIMAL(12, 2) NOT NULL,
  received_on DATE NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  proof_path VARCHAR(80) NULL,
  proof_mime VARCHAR(32) NULL,
  proof_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY funds_received_on_idx (received_on)
) ENGINE=InnoDB;

-- Projects remain available for historical vouchers even after they are archived.
CREATE TABLE IF NOT EXISTS projects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_name VARCHAR(180) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY projects_name_unique (project_name),
  KEY projects_status_idx (status, project_name)
) ENGINE=InnoDB;

-- Every release points to both a recipient and project; foreign keys protect those records.
CREATE TABLE IF NOT EXISTS disbursements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  voucher_number VARCHAR(24) NOT NULL UNIQUE,
  purpose VARCHAR(180) NOT NULL,
  person_id INT UNSIGNED NOT NULL,
  project_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  released_on DATE NOT NULL,
  semester ENUM('First Semester', 'Second Semester', 'Summer') NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  status ENUM('awaiting_receipt', 'for_review', 'flagged', 'approved') NOT NULL DEFAULT 'awaiting_receipt',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT disbursements_person_fk FOREIGN KEY (person_id) REFERENCES people(id),
  CONSTRAINT disbursements_project_fk FOREIGN KEY (project_id) REFERENCES projects(id),
  KEY disbursements_status_idx (status, released_on),
  KEY disbursements_person_idx (person_id, status),
  KEY disbursements_project_idx (project_id)
) ENGINE=InnoDB;

-- One receipt per voucher keeps submission and review status unambiguous.
CREATE TABLE IF NOT EXISTS receipts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  disbursement_id BIGINT UNSIGNED NOT NULL UNIQUE,
  vendor VARCHAR(180) NOT NULL,
  reference VARCHAR(120) NOT NULL DEFAULT '',
  amount DECIMAL(12, 2) NOT NULL,
  submitted_on DATE NOT NULL,
  note VARCHAR(500) NOT NULL DEFAULT '',
  proof_path VARCHAR(80) NULL,
  proof_mime VARCHAR(32) NULL,
  proof_name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT receipts_disbursement_fk FOREIGN KEY (disbursement_id) REFERENCES disbursements(id)
) ENGINE=InnoDB;

-- Actions are appended here for accountability across account and financial workflows.
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor VARCHAR(120) NOT NULL,
  action VARCHAR(120) NOT NULL,
  detail VARCHAR(700) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY audit_created_at_idx (created_at)
) ENGINE=InnoDB;

-- Shared lock row serializes first-Admin setup and balance-sensitive releases.
CREATE TABLE IF NOT EXISTS app_lock (
  id TINYINT UNSIGNED PRIMARY KEY
) ENGINE=InnoDB;

INSERT IGNORE INTO app_lock (id) VALUES (1);
