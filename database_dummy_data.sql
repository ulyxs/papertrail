-- Papertrail demo data for MySQL/MariaDB.
-- Import after server/schema.sql. This script replaces only records using the
-- DEMO: / demo- / DEMO-DV- prefixes; it does not clear unrelated application data.
-- All demo accounts use the password: password (development/testing only).
-- Proof metadata is NULL because this SQL file does not create physical upload files.

CREATE DATABASE IF NOT EXISTS treasury_ledger
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE treasury_ledger;

INSERT IGNORE INTO app_lock (id) VALUES (1);

DROP TEMPORARY TABLE IF EXISTS demo_seed_numbers;
CREATE TEMPORARY TABLE demo_seed_numbers (
  n INT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO demo_seed_numbers (n)
SELECT generated.n
FROM (
  SELECT ones.n + 10 * tens.n + 100 * hundreds.n + 1000 * thousands.n AS n
  FROM (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9
  ) AS ones
  CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9
  ) AS tens
  CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9
  ) AS hundreds
  CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9
  ) AS thousands
) AS generated
WHERE generated.n BETWEEN 1 AND 40;

START TRANSACTION;

-- Remove earlier demo rows in child-to-parent order.
DELETE r
FROM receipts AS r
JOIN disbursements AS d ON d.id = r.disbursement_id
WHERE d.voucher_number LIKE 'DEMO-DV-%';

DELETE FROM disbursements
WHERE voucher_number LIKE 'DEMO-DV-%';

DELETE FROM people
WHERE account_id IN (
  SELECT a.id
  FROM accounts AS a
  WHERE a.email LIKE 'demo-%@papertrail.test'
);

DELETE FROM funds
WHERE source_name LIKE 'DEMO:%';

DELETE FROM projects
WHERE project_name LIKE 'DEMO:%';

DELETE FROM audit_log
WHERE actor LIKE 'DEMO:%';

DELETE FROM accounts
WHERE email LIKE 'demo-%@papertrail.test';

-- Twelve approved accounts cover the Admin, Treasurer, and Auditor roles.
INSERT INTO accounts
  (first_name, last_name, email, password_hash, role, status, created_at, updated_at)
SELECT
  CASE MOD(n, 20)
    WHEN 0 THEN 'Alex' WHEN 1 THEN 'Jordan' WHEN 2 THEN 'Taylor'
    WHEN 3 THEN 'Morgan' WHEN 4 THEN 'Casey' WHEN 5 THEN 'Riley'
    WHEN 6 THEN 'Avery' WHEN 7 THEN 'Jamie' WHEN 8 THEN 'Quinn'
    WHEN 9 THEN 'Cameron' WHEN 10 THEN 'Drew' WHEN 11 THEN 'Sam'
    WHEN 12 THEN 'Reese' WHEN 13 THEN 'Parker' WHEN 14 THEN 'Rowan'
    WHEN 15 THEN 'Skyler' WHEN 16 THEN 'Emerson' WHEN 17 THEN 'Finley'
    WHEN 18 THEN 'Hayden' ELSE 'Kendall'
  END,
  CASE MOD(n, 20)
    WHEN 0 THEN 'Santos' WHEN 1 THEN 'Reyes' WHEN 2 THEN 'Cruz'
    WHEN 3 THEN 'Garcia' WHEN 4 THEN 'Mendoza' WHEN 5 THEN 'Torres'
    WHEN 6 THEN 'Flores' WHEN 7 THEN 'Ramos' WHEN 8 THEN 'Navarro'
    WHEN 9 THEN 'Castillo' WHEN 10 THEN 'Rivera' WHEN 11 THEN 'Aquino'
    WHEN 12 THEN 'Lim' WHEN 13 THEN 'Bautista' WHEN 14 THEN 'Villanueva'
    WHEN 15 THEN 'Dela Cruz' WHEN 16 THEN 'Gonzales' WHEN 17 THEN 'Mercado'
    WHEN 18 THEN 'Fernandez' ELSE 'Domingo'
  END,
  CONCAT('demo-', LPAD(n, 3, '0'), '@papertrail.test'),
  '$2y$10$r/XA31M0ePUuq2b.bFOykO8fFbzljmseRCifRZ6Riy2H4fO2D5sAC',
  CASE
    WHEN n = 1 THEN 'Admin'
    WHEN n BETWEEN 2 AND 5 THEN 'Treasurer'
    WHEN n BETWEEN 6 AND 12 THEN 'Auditor'
    ELSE 'User'
  END,
  'approved',
  DATE_SUB(NOW(), INTERVAL MOD(n * 17, 1500) DAY),
  DATE_SUB(NOW(), INTERVAL LEAST(MOD(n * 17, 1500), MOD(n * 7, 30)) DAY)
FROM demo_seed_numbers
WHERE n <= 12;

-- Approved accounts are active recipients; disapproved accounts remain archived.
INSERT INTO people (account_id, name, position, status, created_at)
SELECT
  a.id,
  CONCAT(a.first_name, ' ', a.last_name),
  a.role,
  IF(a.status = 'approved', 'active', 'archived'),
  a.created_at
FROM accounts AS a
WHERE a.email LIKE 'demo-%@papertrail.test'
  AND a.status IN ('approved', 'disapproved');

-- Five dated projects used by the import test cases.
INSERT INTO projects
  (project_name, start_date, end_date, semester, month, status, created_at)
SELECT
  CONCAT('DEMO: Campus Project ', LPAD(n, 3, '0')),
  DATE_SUB(CURDATE(), INTERVAL (n * 19) DAY),
  DATE_ADD(
    DATE_SUB(CURDATE(), INTERVAL (n * 19) DAY),
    INTERVAL (30 + MOD(n * 7, 180)) DAY
  ),
  CASE
    WHEN MONTH(DATE_SUB(CURDATE(), INTERVAL (n * 19) DAY)) >= 8 THEN 'First Semester'
    WHEN MONTH(DATE_SUB(CURDATE(), INTERVAL (n * 19) DAY)) <= 5 THEN 'Second Semester'
    ELSE 'Summer'
  END,
  MONTH(DATE_SUB(CURDATE(), INTERVAL (n * 19) DAY)),
  'active',
  DATE_SUB(NOW(), INTERVAL (n * 19) DAY)
FROM demo_seed_numbers
WHERE n <= 5;

-- Twenty incoming fund records for the funds ledger.
INSERT INTO funds
  (source_name, income_category, amount, received_on, note, created_at)
SELECT
  CONCAT('DEMO: ', CASE MOD(n, 8)
    WHEN 0 THEN 'Student Council Allocation'
    WHEN 1 THEN 'Engineering Alumni Association'
    WHEN 2 THEN 'Campus Book Fair'
    WHEN 3 THEN 'Community Donors'
    WHEN 4 THEN 'Annual Membership Collection'
    WHEN 5 THEN 'Research Grant Office'
    WHEN 6 THEN 'Local Business Sponsor'
    ELSE 'Department Activity Fund'
  END, ' #', LPAD(n, 4, '0')),
  CASE MOD(n, 7)
    WHEN 0 THEN 'Department Allocation'
    WHEN 1 THEN 'Membership Dues'
    WHEN 2 THEN 'Sponsorships'
    WHEN 3 THEN 'Donations'
    WHEN 4 THEN 'Fundraising Activities'
    WHEN 5 THEN 'Grants'
    ELSE 'Others'
  END,
  CAST(2000 + MOD(n * 137, 14700) AS DECIMAL(12, 2)),
  DATE_SUB(CURDATE(), INTERVAL MOD(n * 11, 1800) DAY),
  CONCAT('Demo ledger entry ', LPAD(n, 4, '0'),
         '; recorded for routine campus operating and project costs.'),
  DATE_SUB(NOW(), INTERVAL MOD(n * 11, 1800) DAY)
FROM demo_seed_numbers
WHERE n <= 20;

-- Forty project-linked import test cases exercise receipt and auditor workflows.
INSERT INTO disbursements
  (voucher_number, purpose, person_id, project_id, amount, released_on,
   semester, month, status, resolution_note, created_at)
SELECT
  CONCAT('DEMO-DV-', YEAR(s.released_date), '-', LPAD(s.n, 6, '0')),
  CASE MOD(s.n, 10)
    WHEN 0 THEN 'Purchase of classroom and office supplies'
    WHEN 1 THEN 'Printing of event materials and information sheets'
    WHEN 2 THEN 'Equipment rental for student programme'
    WHEN 3 THEN 'Transportation and delivery for campus outreach'
    WHEN 4 THEN 'Food and refreshments for project volunteers'
    WHEN 5 THEN 'Repair and maintenance of shared equipment'
    WHEN 6 THEN 'Workshop materials and participant kits'
    WHEN 7 THEN 'Venue and technical support expenses'
    WHEN 8 THEN 'Project documentation and communication costs'
    ELSE 'Replacement parts for student activity equipment'
  END,
  p.id,
  pr.id,
  CAST(250 + MOD(s.n * 173, 6125) AS DECIMAL(12, 2)),
  s.released_date,
  CASE
    WHEN MONTH(s.released_date) >= 8 THEN 'First Semester'
    WHEN MONTH(s.released_date) <= 5 THEN 'Second Semester'
    ELSE 'Summer'
  END,
  MONTH(s.released_date),
  CASE
    WHEN MOD(s.n, 10) = 0 THEN 'awaiting_receipt'
    WHEN MOD(s.n, 10) = 1 THEN 'for_review'
    WHEN MOD(s.n, 10) = 2 THEN 'flagged'
    ELSE 'approved'
  END,
  CASE
    WHEN MOD(s.n, 10) = 3
      THEN 'Verified corrected receipt and refund documentation.'
    ELSE NULL
  END,
  DATE_ADD(
    s.released_date,
    INTERVAL LEAST(MOD(s.n, 5), DATEDIFF(CURDATE(), s.released_date)) DAY
  )
FROM (
  SELECT
    n,
    1 + MOD(n - 1, 12) AS person_number,
    CASE
      WHEN MOD(n, 10) = 0
        THEN DATE_SUB(CURDATE(), INTERVAL MOD(n * 13, 6) DAY)
      ELSE DATE_SUB(CURDATE(), INTERVAL (10 + MOD(n * 13, 1340)) DAY)
    END AS released_date
  FROM demo_seed_numbers
  WHERE n <= 40
) AS s
JOIN people AS p
  ON p.account_id = (
    SELECT a.id
    FROM accounts AS a
    WHERE a.email = CONCAT('demo-', LPAD(s.person_number, 3, '0'), '@papertrail.test')
  )
JOIN projects AS pr
  ON pr.project_name = CONCAT('DEMO: Campus Project ', LPAD(1 + MOD(s.n - 1, 5), 3, '0'));

-- Receipts exist for every voucher that has moved beyond awaiting_receipt.
-- Flagged examples intentionally have a small amount discrepancy.
INSERT INTO receipts
  (disbursement_id, vendor, reference, amount, submitted_on, note, created_at)
SELECT
  d.id,
  CASE MOD(n.n, 8)
    WHEN 0 THEN 'Northside Office Supplies'
    WHEN 1 THEN 'Campus Print and Copy Center'
    WHEN 2 THEN 'Metro Equipment Rental'
    WHEN 3 THEN 'Community Transport Cooperative'
    WHEN 4 THEN 'Harvest Catering Services'
    WHEN 5 THEN 'Central Hardware and Repair'
    WHEN 6 THEN 'Brightline Events and Audio'
    ELSE 'Student Resource Bookshop'
  END,
  CONCAT('INV-', DATE_FORMAT(d.released_on, '%y%m'), '-', LPAD(n.n, 6, '0')),
  CASE
    WHEN d.status = 'flagged' THEN d.amount - 1.25
    ELSE d.amount
  END,
  DATE_ADD(d.released_on, INTERVAL MOD(n.n, 9) DAY),
  CASE
    WHEN d.status = 'flagged' THEN 'Amount differs from voucher; awaiting auditor resolution.'
    WHEN d.status = 'for_review' THEN 'Supporting invoice submitted for review.'
    ELSE 'Receipt and supporting invoice verified.'
  END,
  DATE_ADD(d.released_on, INTERVAL MOD(n.n, 9) DAY)
FROM disbursements AS d
JOIN demo_seed_numbers AS n
  ON d.voucher_number = CONCAT('DEMO-DV-', YEAR(d.released_on), '-', LPAD(n.n, 6, '0'))
WHERE d.status <> 'awaiting_receipt';

-- Forty audit events attributed to demo staff accounts.
INSERT INTO audit_log (actor, action, detail, created_at)
SELECT
  CONCAT('DEMO: ', a.first_name, ' ', a.last_name),
  CASE MOD(n.n, 10)
    WHEN 0 THEN 'Recorded incoming funds'
    WHEN 1 THEN 'Created a project'
    WHEN 2 THEN 'Released funds'
    WHEN 3 THEN 'Submitted a receipt'
    WHEN 4 THEN 'Approved a transaction'
    WHEN 5 THEN 'Flagged a transaction'
    WHEN 6 THEN 'Approved account'
    WHEN 7 THEN 'Changed account role'
    WHEN 8 THEN 'Updated project details'
    ELSE 'Resolved a flagged transaction'
  END,
  CONCAT('Demo activity ', LPAD(n.n, 4, '0'),
         ': routine account and treasury workflow record for interface testing.'),
  DATE_SUB(NOW(), INTERVAL MOD(n.n * 19, 2500) DAY)
FROM demo_seed_numbers AS n
JOIN accounts AS a
  ON a.email = CONCAT('demo-', LPAD(1 + MOD(n.n - 1, 12), 3, '0'), '@papertrail.test')
WHERE n.n <= 40;

COMMIT;

DROP TEMPORARY TABLE IF EXISTS demo_seed_numbers;

-- Counts for a quick import check.
SELECT 'accounts' AS table_name, COUNT(*) AS demo_rows
FROM accounts WHERE email LIKE 'demo-%@papertrail.test'
UNION ALL
SELECT 'people', COUNT(*) FROM people
WHERE account_id IN (SELECT id FROM accounts WHERE email LIKE 'demo-%@papertrail.test')
UNION ALL
SELECT 'projects', COUNT(*) FROM projects WHERE project_name LIKE 'DEMO:%'
UNION ALL
SELECT 'funds', COUNT(*) FROM funds WHERE source_name LIKE 'DEMO:%'
UNION ALL
SELECT 'disbursements', COUNT(*) FROM disbursements WHERE voucher_number LIKE 'DEMO-DV-%'
UNION ALL
SELECT 'receipts', COUNT(*) FROM receipts
WHERE disbursement_id IN (
  SELECT id FROM disbursements WHERE voucher_number LIKE 'DEMO-DV-%'
)
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log WHERE actor LIKE 'DEMO:%'
UNION ALL
SELECT 'app_lock', COUNT(*) FROM app_lock WHERE id = 1;
