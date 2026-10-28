# Nexora Technologies — Comprehensive Backend API & Database Reference Guide

> **Module:** Nexora Backend (Authentication, Sessions, Applicant Profile, Health, and Core API)  
> **Base URL:** `http://localhost:4000/api/v1`  
> **Interactive Swagger UI:** `http://localhost:4000/api-docs`  
> **Raw OpenAPI Specification:** `http://localhost:4000/api-docs.json`  
> **Database:** PostgreSQL with Prisma ORM  
> **Specification Baseline:** Nexora SRS v1.2 & Authentication Module Specification  

---

## Table of Contents
1. [Architecture & Design Principles](#1-architecture--design-principles)
2. [Database Architecture & Visual Row Evolution](#2-database-architecture--visual-row-evolution)
   - [2.1 Active Schema Models](#21-active-schema-models)
   - [2.2 Entity Relationship Diagram](#22-entity-relationship-diagram)
   - [2.3 How the Database Appears: Step-by-Step State Changes](#23-how-the-database-appears-step-by-step-state-changes)
3. [Every Endpoint: Functional Details & Testing Guide](#3-every-endpoint-functional-details--testing-guide)
   - [Endpoint 1: System Health Check (`GET /health`)](#endpoint-1-system-health-check)
   - [Endpoint 2: API v1 Health Check (`GET /api/v1/health`)](#endpoint-2-api-v1-health-check)
   - [Endpoint 3: Register Applicant Account (`POST /api/v1/auth/register`)](#endpoint-3-register-applicant-account)
   - [Endpoint 4: Authenticate & Login (`POST /api/v1/auth/login`)](#endpoint-4-authenticate--login)
   - [Endpoint 5: Get Current User Identity (`GET /api/v1/auth/me`)](#endpoint-5-get-current-user-identity)
   - [Endpoint 6: Refresh Access Token with Token Rotation (`POST /api/v1/auth/refresh`)](#endpoint-6-refresh-access-token-with-token-rotation)
   - [Endpoint 7: Terminate Session & Logout (`POST /api/v1/auth/logout`)](#endpoint-7-terminate-session--logout)
   - [Endpoint 8: Forgot Password Request (`POST /api/v1/auth/forgot-password`)](#endpoint-8-forgot-password-request)
   - [Endpoint 9: Confirm Password Reset (`POST /api/v1/auth/reset-password`)](#endpoint-9-confirm-password-reset)
   - [Endpoint 10: Fetch Own Candidate Profile (`GET /api/v1/me/profile`)](#endpoint-10-fetch-own-candidate-profile)
   - [Endpoint 11: Update Candidate Profile (`PATCH /api/v1/me/profile`)](#endpoint-11-update-candidate-profile)
4. [Security, Cryptography & Data Integrity Mechanisms](#4-security-cryptography--data-integrity-mechanisms)
5. [Complete Verification & Testing Runbook](#5-complete-verification--testing-runbook)

---

## 1. Architecture & Design Principles

The Nexora backend is built following clean modular civil-engineering standards:
* **Runtime & Language:** Node.js (ES Modules `import/export`, strict plain JavaScript `.js`, no TypeScript build step).
* **Framework:** Express.js 4.
* **Database Engine:** PostgreSQL via Prisma Client ORM.
* **Directory Layout:**
  - `src/core/`: Application-wide configuration, database clients, error handlers, security middleware, and rate limiters.
  - `src/app/`: Domain-driven feature modules (`auth/`, `applicant-profile/`, `health/`).
  - `src/api/v1/`: Versioned API router mounting all domain routes.
* **Incremental Table Rule:** Only tables strictly required by the active phase exist in the database schema. Future tables (`jobs`, `applications`, `documents`, `interviews`) are only migrated when their respective phases begin.

---

## 2. Database Architecture & Visual Row Evolution

### 2.1 Active Schema Models

The active database strictly contains **3 tables**:

#### 1. `users` Table
Stores authentication credentials, security timestamps, role, and lifecycle status.

| Column Name | SQL Data Type | Nullable | Default | Description / Purpose |
| :--- | :--- | :---: | :---: | :--- |
| `id` | `UUID` | No | `uuid()` | Primary Key. Globally unique user identifier. |
| `full_name` | `VARCHAR(120)` | No | - | User's legal full name. |
| `email` | `VARCHAR(255)` | No | - | **Unique**, lowercase normalized email address. |
| `password_hash`| `TEXT` | No | - | One-way Bcrypt hash (cost factor 12). Plain passwords are never stored. |
| `role` | `ENUM` | No | `'APPLICANT'` | Role: `'APPLICANT'` or `'ADMIN'`. |
| `status` | `ENUM` | No | `'ACTIVE'` | Status: `'ACTIVE'` or `'DISABLED'`. |
| `password_changed_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp of last password change. Used to invalidate older reset tokens & sessions. |
| `last_login_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp of most recent successful login. |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Account registration date. |
| `updated_at` | `TIMESTAMPTZ` | No | Auto | Timestamp of last record update. |

#### 2. `applicant_profiles` Table
Stores candidate professional profile information. Linked 1-to-1 with `users`.

| Column Name | SQL Data Type | Nullable | Default | Description / Purpose |
| :--- | :--- | :---: | :---: | :--- |
| `user_id` | `UUID` | No | - | Primary Key & Foreign Key referencing `users(id)` with `ON DELETE CASCADE`. |
| `phone` | `VARCHAR(25)` | Yes | `NULL` | Applicant contact number. |
| `current_location` | `VARCHAR(160)` | Yes | `NULL` | City/State/Country (e.g., Bangalore, India). |
| `highest_qualification` | `VARCHAR(120)` | Yes | `NULL` | E.g., "B.Tech Computer Science". |
| `college_university` | `VARCHAR(180)` | Yes | `NULL` | Institution name. |
| `graduation_year` | `SMALLINT` | Yes | `NULL` | Year of graduation (e.g., 2024). |
| `technical_skills` | `TEXT[]` | No | `ARRAY[]` | PostgreSQL array of skill tags (e.g., `["React", "Node.js"]`). |
| `total_experience_years` | `DECIMAL(4,1)` | Yes | `NULL` | Years of experience (e.g., `2.5`). |
| `current_or_previous_employer`| `VARCHAR(180)` | Yes | `NULL` | Most recent company. |
| `linkedin_url` | `TEXT` | Yes | `NULL` | Validated LinkedIn profile URL. |
| `github_url` | `TEXT` | Yes | `NULL` | Validated GitHub profile URL. |
| `portfolio_url`| `TEXT` | Yes | `NULL` | Validated Portfolio/Personal website URL. |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Profile creation date. |
| `updated_at` | `TIMESTAMPTZ` | No | Auto | Profile update date. |

#### 3. `sessions` Table
Tracks active refresh tokens and device sessions.

| Column Name | SQL Data Type | Nullable | Default | Description / Purpose |
| :--- | :--- | :---: | :---: | :--- |
| `id` | `UUID` | No | `uuid()` | Primary Key. Session ID. |
| `user_id` | `UUID` | No | - | Foreign Key referencing `users(id)` with `ON DELETE CASCADE`. |
| `refresh_token_hash` | `TEXT` | No | - | **Unique** SHA-256 hash of the issued refresh token. Raw tokens are never stored. |
| `expires_at` | `TIMESTAMPTZ` | No | - | Expiration timestamp (e.g., 7 days from issue). |
| `revoked_at` | `TIMESTAMPTZ` | Yes | `NULL` | Timestamp when session was revoked (logout or rotation). If `NULL`, session is active. |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Session creation date. |

---

### 2.2 Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────┐
│                         users                          │
├────────────────────────────────────────────────────────┤
│ PK  id                  UUID                           │
│     full_name           VARCHAR(120)                   │
│ UQ  email               VARCHAR(255)                   │
│     password_hash       TEXT                           │
│     role                ENUM ('APPLICANT', 'ADMIN')    │
│     status              ENUM ('ACTIVE', 'DISABLED')    │
│     password_changed_at TIMESTAMPTZ                    │
│     last_login_at       TIMESTAMPTZ                    │
│     created_at          TIMESTAMPTZ                    │
│     updated_at          TIMESTAMPTZ                    │
└──────────────┬────────────────────────────┬────────────┘
               │ 1                          │ 1
               │                            │
               │ 1 (Cascade)                │ N (Cascade)
               ▼                            ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────┐
│      applicant_profiles      │ │                sessions                │
├──────────────────────────────┤ ├────────────────────────────────────────┤
│ PK,FK user_id         UUID   │ │ PK  id                 UUID            │
│       phone           VARCHAR│ │ FK  user_id            UUID            │
│       current_location VARCHAR││ UQ  refresh_token_hash TEXT            │
│       highest_qual... VARCHAR│ │     expires_at         TIMESTAMPTZ     │
│       technical_skills TEXT[]│ │     revoked_at         TIMESTAMPTZ     │
│       experience_yrs  DECIMAL│ │     created_at         TIMESTAMPTZ     │
│       linkedin/github TEXT   │ └────────────────────────────────────────┘
└──────────────────────────────┘
```

---

### 2.3 How the Database Appears: Step-by-Step State Changes

To understand exactly how the database changes, observe the following rows at each stage:

#### Stage 0: Initial Admin Seeding (`npx prisma db seed`)
The admin account is created via code seed. No public API can create an admin.
* **`users` Table:**
  ```text
  id                                   | full_name         | email                 | role  | status | password_hash
  -------------------------------------+-------------------+-----------------------+-------+--------+--------------------------------------------------------------
  a0000000-0000-0000-0000-000000000001 | System Admin      | admin@nexora.com      | ADMIN | ACTIVE | $2b$12$K8yR2uK2v5YqZ... (Bcrypt hashed)
  ```
* **`applicant_profiles` Table:** Empty (Admin does not have an applicant profile).
* **`sessions` Table:** Empty (Admin hasn't logged in yet).

---

#### Stage 1: New Applicant Registration (`POST /api/v1/auth/register`)
Alex Morgan registers with `fullName`, `email`, and `password`.  
Prisma runs an **atomic transaction** (`prisma.$transaction`) inserting 3 rows across 3 tables simultaneously:
1. **`users` Table:**
  ```text
  id                                   | full_name   | email                   | role      | status | password_hash
  -------------------------------------+-------------+-------------------------+-----------+--------+-----------------------------------
  e826b527-df21-4f16-8f38-23214da91845 | Alex Morgan | alex.morgan@example.com | APPLICANT | ACTIVE | $2b$12$eX8... (Bcrypt hash)
  ```
2. **`applicant_profiles` Table:**
  ```text
  user_id                              | phone | current_location | technical_skills | total_experience_years
  -------------------------------------+-------+------------------+------------------+-----------------------
  e826b527-df21-4f16-8f38-23214da91845 | NULL  | NULL             | {}               | NULL
  ```
3. **`sessions` Table:**
  ```text
  id                                   | user_id                              | refresh_token_hash                                               | expires_at          | revoked_at
  -------------------------------------+--------------------------------------+------------------------------------------------------------------+---------------------+-----------
  s1111111-1111-1111-1111-111111111111 | e826b527-df21-4f16-8f38-23214da91845 | b78e3c79a4025d57b2ff93dc72... (SHA-256 of issued refresh token) | 2026-11-02 12:00:00 | NULL
  ```

---

#### Stage 2: Applicant Login (`POST /api/v1/auth/login`)
Alex logs in from a second device (e.g., mobile phone):
1. **`users` Table:** `last_login_at` is updated to `2026-10-26 12:05:00`.
2. **`sessions` Table:** A **second active session row** is created for the new device:
  ```text
  id                                   | user_id                              | refresh_token_hash               | expires_at          | revoked_at
  -------------------------------------+--------------------------------------+----------------------------------+---------------------+-----------
  s1111111-1111-1111-1111-111111111111 | e826b527-df21-4f16-8f38-23214da91845 | b78e3c79... (Laptop session)     | 2026-11-02 12:00:00 | NULL
  s2222222-2222-2222-2222-222222222222 | e826b527-df21-4f16-8f38-23214da91845 | d91f63a1... (Mobile session)     | 2026-11-02 12:05:00 | NULL
  ```

---

#### Stage 3: Refresh Token Rotation (`POST /api/v1/auth/refresh`)
When the laptop access token expires, the client sends the laptop refresh token:
1. The old session (`s1111111...`) is **revoked**: `revoked_at` is set to `2026-10-26 12:15:00`.
2. A brand-new session (`s3333333...`) is inserted with a new refresh token hash.
* **`sessions` Table Appearance:**
  ```text
  id                                   | refresh_token_hash          | expires_at          | revoked_at          | Status
  -------------------------------------+-----------------------------+---------------------+---------------------+----------
  s1111111-1111-1111-1111-111111111111 | b78e3c79... (Old laptop)    | 2026-11-02 12:00:00 | 2026-10-26 12:15:00 | REVOKED
  s2222222-2222-2222-2222-222222222222 | d91f63a1... (Mobile device) | 2026-11-02 12:05:00 | NULL                | ACTIVE
  s3333333-3333-3333-3333-333333333333 | f55a9018... (New laptop)    | 2026-11-02 12:15:00 | NULL                | ACTIVE
  ```

---

#### Stage 4: Profile Details Updated (`PATCH /api/v1/me/profile`)
Alex updates skills, phone, and university:
* **`applicant_profiles` Table Appearance:**
  ```text
  user_id                              | phone           | current_location | technical_skills        | total_experience_years | college_university
  -------------------------------------+-----------------+------------------+-------------------------+------------------------+-----------------------------
  e826b527-df21-4f16-8f38-23214da91845 | +91 98765 43210 | Bangalore        | {"React","Node","Postgres"} | 2.5                    | National Institute of Tech
  ```

---

#### Stage 5: Password Reset (`POST /api/v1/auth/reset-password`)
Alex resets the password:
1. **`users` Table:**
   - `password_hash` is updated to the new Bcrypt hash.
   - `password_changed_at` is set to `2026-10-26 12:30:00`.
2. **`sessions` Table:**
   - **All active sessions for this user are instantly revoked**:
   ```sql
   UPDATE sessions SET revoked_at = NOW() WHERE user_id = 'e826b527-df21-4f16-8f38-23214da91845' AND revoked_at IS NULL;
   ```
   Now **every single session row** has `revoked_at != NULL`. Both laptop and mobile are logged out immediately!

---

## 3. Every Endpoint: Functional Details & Testing Guide

---

### Endpoint 1: System Health Check
* **Method & Path:** `GET /health`
* **Access:** Public (No authentication required)
* **Purpose:** Quick probe for container orchestrators, load balancers, and uptime monitors.
* **Headers:** None required.

#### Testing with cURL:
```bash
curl -X GET http://localhost:4000/health
```

#### Testing with PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/health" -Method Get
```

#### Expected Success Response (`200 OK`):
```json
{
  "status": "healthy",
  "uptime": 124.52,
  "timestamp": "2026-10-26T06:30:00.000Z",
  "version": "1.0.0"
}
```

---

### Endpoint 2: API v1 Health Check
* **Method & Path:** `GET /api/v1/health`
* **Access:** Public (Rate-limited: global limiter 100 req / 15 min)
* **Purpose:** Confirms API v1 routing subsystem is responsive.

#### Testing with cURL:
```bash
curl -X GET http://localhost:4000/api/v1/health
```

#### Expected Success Response (`200 OK`):
```json
{
  "status": "healthy",
  "api": "v1",
  "timestamp": "2026-10-26T06:30:00.000Z"
}
```

---

### Endpoint 3: Register Applicant Account
* **Method & Path:** `POST /api/v1/auth/register`
* **Access:** Public (Rate-limited: 20 req / 15 min)
* **Purpose:** Creates credentials, creates applicant profile record, generates session, and returns JWT access token + refresh token.
* **Security Enforcement:** Role is hardcoded to `'APPLICANT'`. Supplying `role: "ADMIN"` in the payload is ignored and rejected.

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Payload:
```json
{
  "fullName": "Alex Morgan",
  "email": "alex.morgan@example.com",
  "password": "Password123!"
}
```
*Validation Rules:*
* `fullName`: 2 to 120 characters, trimmed.
* `email`: Valid email format, lowercase normalized.
* `password`: Minimum 8 characters, must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol (`@$!%*?&`).

#### Testing with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Alex Morgan\",\"email\":\"alex.morgan@example.com\",\"password\":\"Password123!\"}"
```

#### Testing with PowerShell:
```powershell
$body = @{
    fullName = "Alex Morgan"
    email    = "alex.morgan@example.com"
    password = "Password123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/register" -Method Post -Body $body -ContentType "application/json"
```

#### Expected Success Response (`201 Created`):
```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "user": {
      "id": "e826b527-df21-4f16-8f38-23214da91845",
      "fullName": "Alex Morgan",
      "email": "alex.morgan@example.com",
      "role": "APPLICANT",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "48bfa9321ef804a..."
    }
  }
}
```

#### Error Case 1: Duplicate Email (`409 Conflict`):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "An account with this email address already exists"
  }
}
```

#### Error Case 2: Weak Password (`400 Bad Request`):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "password",
        "message": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      }
    ]
  }
}
```

---

### Endpoint 4: Authenticate & Login
* **Method & Path:** `POST /api/v1/auth/login`
* **Access:** Public (Rate-limited: 20 req / 15 min to prevent brute force)
* **Purpose:** Validates credentials via Bcrypt, updates `last_login_at`, issues new session row with SHA-256 hash, returns access & refresh tokens.

#### Request Payload:
```json
{
  "email": "alex.morgan@example.com",
  "password": "Password123!"
}
```

#### Testing with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alex.morgan@example.com\",\"password\":\"Password123!\"}"
```

#### Testing with PowerShell:
```powershell
$body = @{
    email    = "alex.morgan@example.com"
    password = "Password123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Authenticated successfully",
  "data": {
    "user": {
      "id": "e826b527-df21-4f16-8f38-23214da91845",
      "fullName": "Alex Morgan",
      "email": "alex.morgan@example.com",
      "role": "APPLICANT",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "7c88eb960bf209e..."
    }
  }
}
```

#### Error Case: Wrong Credentials (`401 Unauthorized`):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

---

### Endpoint 5: Get Current User Identity
* **Method & Path:** `GET /api/v1/auth/me`
* **Access:** Protected (Requires `Authorization: Bearer <accessToken>`)
* **Purpose:** Fast identity verification; decodes claims from JWT, confirms user account exists and is `'ACTIVE'`.

#### Testing with cURL:
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "e826b527-df21-4f16-8f38-23214da91845",
      "fullName": "Alex Morgan",
      "email": "alex.morgan@example.com",
      "role": "APPLICANT",
      "status": "ACTIVE"
    }
  }
}
```

#### Error Case: Missing / Expired Bearer Token (`401 Unauthorized`):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required: Bearer token missing"
  }
}
```

---

### Endpoint 6: Refresh Access Token with Token Rotation
* **Method & Path:** `POST /api/v1/auth/refresh`
* **Access:** Public with valid refresh token (Rate-limited: 30 req / 15 min)
* **Purpose:** Exchanging an expiring short-lived access token (15m) for a new pair.
* **Security Mechanics (Token Rotation):**
  1. Hashes incoming refresh token with SHA-256.
  2. Finds session row. Verifies `revoked_at IS NULL` and `expires_at > NOW()`.
  3. Sets `revoked_at = NOW()` on the old session.
  4. Inserts a brand new session row.
  5. Returns fresh access token and fresh refresh token.
  6. Reusing an old token is rejected.

#### Request Payload:
```json
{
  "refreshToken": "YOUR_CURRENT_REFRESH_TOKEN"
}
```

#### Testing with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_CURRENT_REFRESH_TOKEN\"}"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.brand_new_token...",
    "refreshToken": "e14b8702c2e9...",
    "user": {
      "id": "e826b527-df21-4f16-8f38-23214da91845",
      "email": "alex.morgan@example.com",
      "fullName": "Alex Morgan",
      "role": "APPLICANT"
    }
  }
}
```

#### Error Case: Reused or Revoked Token (`401 Unauthorized`):
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid, expired, or revoked refresh token"
  }
}
```

---

### Endpoint 7: Terminate Session & Logout
* **Method & Path:** `POST /api/v1/auth/logout`
* **Access:** Public / Session-aware
* **Purpose:** Securely ends device session by setting `revoked_at = NOW()` in PostgreSQL.

#### Request Payload:
```json
{
  "refreshToken": "YOUR_CURRENT_REFRESH_TOKEN"
}
```

#### Testing with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_CURRENT_REFRESH_TOKEN\"}"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Session logged out successfully",
  "data": null
}
```

---

### Endpoint 8: Forgot Password Request
* **Method & Path:** `POST /api/v1/auth/forgot-password`
* **Access:** Public (Rate-limited: 5 req / 15 min)
* **Purpose:** Generates a cryptographically signed reset token.
* **Enumeration Defense:** Returns the exact same response regardless of whether the email exists in `users`.
* **Stateless Mechanics:** Does NOT require a database table. Signs a reset JWT with `aud: 'nexora-pwd-reset'`, user id, and email, expiring in 1 hour.

#### Request Payload:
```json
{
  "email": "alex.morgan@example.com"
}
```

#### Testing with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alex.morgan@example.com\"}"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "If an account exists for that email, password-reset instructions will be sent.",
  "data": {
    "message": "If an account exists for that email, password-reset instructions will be sent.",
    "devPreviewToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```
*(Note: `devPreviewToken` is included in development mode for instant local testing).*

---

### Endpoint 9: Confirm Password Reset
* **Method & Path:** `POST /api/v1/auth/reset-password`
* **Access:** Public with valid Reset Token (Rate-limited: 5 req / 15 min)
* **Purpose:** Resets user password, updates `password_changed_at = NOW()`, and invalidates all existing sessions.
* **Replay Protection:** If the token has an issue timestamp (`iat`) older than `users.password_changed_at`, the token is rejected. This guarantees the token can **never be used twice**.

#### Request Payload:
```json
{
  "token": "YOUR_RESET_TOKEN_HERE",
  "newPassword": "NewSecurePassword2026!"
}
```

#### Testing with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"YOUR_RESET_TOKEN_HERE\",\"newPassword\":\"NewSecurePassword2026!\"}"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Password has been reset successfully",
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

#### Error Case: Token Already Used (`400 Bad Request`):
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "This reset link has already been used or expired."
  }
}
```

---

### Endpoint 10: Fetch Own Candidate Profile
* **Method & Path:** `GET /api/v1/me/profile`
* **Access:** Protected (Requires `Authorization: Bearer <accessToken>`)
* **Purpose:** Retrieves applicant profile joined with name and email from `users`.

#### Testing with cURL:
```bash
curl -X GET http://localhost:4000/api/v1/me/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Applicant profile retrieved",
  "data": {
    "userId": "e826b527-df21-4f16-8f38-23214da91845",
    "fullName": "Alex Morgan",
    "email": "alex.morgan@example.com",
    "phone": null,
    "currentLocation": null,
    "highestQualification": null,
    "collegeUniversity": null,
    "graduationYear": null,
    "technicalSkills": [],
    "totalExperienceYears": null,
    "currentOrPreviousEmployer": null,
    "linkedinUrl": null,
    "githubUrl": null,
    "portfolioUrl": null
  }
}
```

---

### Endpoint 11: Update Candidate Profile
* **Method & Path:** `PATCH /api/v1/me/profile`
* **Access:** Protected (Requires `Authorization: Bearer <accessToken>`)
* **Purpose:** Modifies professional qualifications, skills, contact numbers, and social links.
* **Security Enforcement:** Strips or rejects any unauthorized properties (`role`, `email`, `status`).

#### Request Payload:
```json
{
  "phone": "+91 98765 43210",
  "currentLocation": "Bangalore, India",
  "highestQualification": "B.Tech Computer Science",
  "collegeUniversity": "National Institute of Technology",
  "graduationYear": 2024,
  "technicalSkills": ["JavaScript", "React", "Node.js", "PostgreSQL", "Docker"],
  "totalExperienceYears": 2.5,
  "currentOrPreviousEmployer": "Tech Innovations Pvt Ltd",
  "linkedinUrl": "https://linkedin.com/in/alexmorgan-dev",
  "githubUrl": "https://github.com/alexmorgan",
  "portfolioUrl": "https://alexmorgan.dev"
}
```

#### Testing with cURL:
```bash
curl -X PATCH http://localhost:4000/api/v1/me/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+91 98765 43210\",\"currentLocation\":\"Bangalore, India\",\"highestQualification\":\"B.Tech Computer Science\",\"collegeUniversity\":\"National Institute of Technology\",\"graduationYear\":2024,\"technicalSkills\":[\"JavaScript\",\"React\",\"Node.js\",\"PostgreSQL\",\"Docker\"],\"totalExperienceYears\":2.5,\"currentOrPreviousEmployer\":\"Tech Innovations Pvt Ltd\",\"linkedinUrl\":\"https://linkedin.com/in/alexmorgan-dev\",\"githubUrl\":\"https://github.com/alexmorgan\",\"portfolioUrl\":\"https://alexmorgan.dev\"}"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Applicant profile updated successfully",
  "data": {
    "userId": "e826b527-df21-4f16-8f38-23214da91845",
    "fullName": "Alex Morgan",
    "email": "alex.morgan@example.com",
    "phone": "+91 98765 43210",
    "currentLocation": "Bangalore, India",
    "highestQualification": "B.Tech Computer Science",
    "collegeUniversity": "National Institute of Technology",
    "graduationYear": 2024,
    "technicalSkills": [
      "JavaScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "Docker"
    ],
    "totalExperienceYears": "2.5",
    "currentOrPreviousEmployer": "Tech Innovations Pvt Ltd",
    "linkedinUrl": "https://linkedin.com/in/alexmorgan-dev",
    "githubUrl": "https://github.com/alexmorgan",
    "portfolioUrl": "https://alexmorgan.dev"
  }
}
```

---

## 4. Security, Cryptography & Data Integrity Mechanisms

1. **Password Hashing:**
   - Hashed using **Bcrypt** with **cost factor 12**.
   - Salting is automatic per user. Plaintext passwords never hit logs or storage.
2. **Refresh Token Storage (SHA-256 Hashing):**
   - The user client receives a cryptographically random hexadecimal string (`crypto.randomBytes(40).toString('hex')`).
   - The database only ever saves `crypto.createHash('sha256').update(rawToken).digest('hex')`.
   - If the database is ever compromised, an attacker cannot impersonate user sessions because SHA-256 is non-reversible.
3. **Session Invalidation Across Devices:**
   - Any password reset triggers an immediate revocation of all user sessions (`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ...`).
4. **Stateless Replay-Proof Password Resets:**
   - Reset tokens are signed JWTs containing `sub: user.id`, `email`, and `iat`.
   - Verification checks that `token.iat * 1000 > user.passwordChangedAt`.
   - As soon as the password is reset, `passwordChangedAt` is updated to `NOW()`, instantly invalidating the token.
5. **Role Escalation Prevention:**
   - `auth.routes.js` and `auth.service.js` strictly force `role = 'APPLICANT'` on public registration.
   - Admin accounts can only be seeded internally via `prisma/seed.js`.
6. **Rate Limiting:**
   - `authLimiter`: 20 requests per 15 minutes per IP on `/login`, `/register`.
   - `passwordResetLimiter`: 5 requests per 15 minutes per IP on `/forgot-password`, `/reset-password`.
   - `globalLimiter`: 100 requests per 15 minutes per IP across all `/api/v1` routes.

---

## 5. Complete Verification & Testing Runbook

### Step 1: Environment Configuration
Ensure `nexora/server/.env` contains your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nexora_db?schema=public"
JWT_ACCESS_SECRET="nexora_dev_access_secret_key_minimum_32_characters_long_12345"
JWT_REFRESH_SECRET="nexora_dev_refresh_secret_key_minimum_32_characters_long_12345"
JWT_RESET_SECRET="nexora_dev_reset_secret_key_minimum_32_characters_long_12345"
```

### Step 2: Apply Database Migration
Generate Prisma Client and apply migrations to create `users`, `applicant_profiles`, and `sessions`:
```powershell
cd nexora/server
npx prisma migrate dev --name init_auth_and_users
```

### Step 3: Run Database Seed (Creates Admin)
```powershell
npx prisma db seed
```

### Step 4: Run the Automated Backend Verification Suite
Execute the Phase 2 test suite:
```powershell
npm run test:phase2
```
This automated suite tests:
* Registration of a new applicant (`201 Created`).
* Rejection of duplicate email (`409 Conflict`).
* Login with valid credentials (`200 OK`).
* Rejection of wrong password (`401 Unauthorized`).
* Identity check via `GET /api/v1/auth/me` with Bearer token (`200 OK`).
* Rejection of missing Bearer token (`401 Unauthorized`).
* Refresh token rotation (`200 OK`).
* Rejection of reused/revoked refresh token (`401 Unauthorized`).
* Password reset flow and immediate session revocation.
* Profile retrieval (`GET /me/profile`) and updates (`PATCH /me/profile`).
