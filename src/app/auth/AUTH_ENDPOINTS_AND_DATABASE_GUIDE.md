# Nexora Technologies — Authentication & Profile API Testing Guide

> **Module:** Authentication, Sessions, and Applicant Profile  
> **Base URL:** `http://localhost:4000/api/v1`  
> **Interactive Swagger UI:** `http://localhost:4000/api-docs`  
> **Full Backend Guide:** Also located at [`server/BACKEND_API_TESTING_AND_DATABASE_GUIDE.md`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/server/BACKEND_API_TESTING_AND_DATABASE_GUIDE.md)  
> **Specification Baseline:** Nexora SRS v1.2 & Authentication Module Specification

---

## 1. Database Architecture & Internal Mechanics

This module strictly utilizes **3 tables** in PostgreSQL via Prisma:

```
┌─────────────────────────────────┐
│              users              │
├─────────────────────────────────┤
│ id: UUID (PK)                   │
│ full_name: VARCHAR(120)         │
│ email: VARCHAR(255) (UNIQUE)    │◄──────┐
│ password_hash: TEXT (Bcrypt)    │       │
│ role: 'APPLICANT' | 'ADMIN'     │       │ 1-to-1 Cascade
│ status: 'ACTIVE' | 'DISABLED'   │       │
│ password_changed_at: TIMESTAMPTZ│       │
│ last_login_at: TIMESTAMPTZ      │       ▼
│ created_at / updated_at         │ ┌───────────────────────────────┐
└────────────────┬────────────────┘ │      applicant_profiles       │
                 │ 1-to-N           ├───────────────────────────────┤
                 ▼                  │ user_id: UUID (PK, FK)        │
┌─────────────────────────────────┐ │ phone: VARCHAR(25)            │
│            sessions             │ │ current_location: VARCHAR(160)│
├─────────────────────────────────┤ │ highest_qualification: VARCHAR│
│ id: UUID (PK)                   │ │ college_university: VARCHAR   │
│ user_id: UUID (FK)              │ │ graduation_year: SMALLINT     │
│ refresh_token_hash: TEXT(UNIQUE)│ │ technical_skills: TEXT[]      │
│ expires_at: TIMESTAMPTZ         │ │ total_experience_years: NUMERIC
│ revoked_at: TIMESTAMPTZ (NULL)  │ │ current_or_previous_employer  │
│ created_at: TIMESTAMPTZ         │ │ linkedin_url / github_url     │
└─────────────────────────────────┘ └───────────────────────────────┘
```

### Visual Row Evolution (How Tables Appear at Each Step):

#### Stage 0: Initial Admin Seeding (`npx prisma db seed`)
* **`users` Table:**
  ```text
  id                                   | full_name         | email                 | role  | status | password_hash
  -------------------------------------+-------------------+-----------------------+-------+--------+--------------------------------------------------------------
  a0000000-0000-0000-0000-000000000001 | System Admin      | admin@nexora.com      | ADMIN | ACTIVE | $2b$12$K8yR2uK2v5YqZ... (Bcrypt hashed)
  ```
* **`applicant_profiles` Table:** Empty
* **`sessions` Table:** Empty

#### Stage 1: New Applicant Registration (`POST /api/v1/auth/register`)
Alex Morgan registers with `fullName`, `email`, and `password`.  
Prisma runs an atomic transaction inserting 3 rows across 3 tables:
* **`users` Table:**
  ```text
  id                                   | full_name   | email                   | role      | status | password_hash
  -------------------------------------+-------------+-------------------------+-----------+--------+-----------------------------------
  e826b527-df21-4f16-8f38-23214da91845 | Alex Morgan | alex.morgan@example.com | APPLICANT | ACTIVE | $2b$12$eX8... (Bcrypt hash)
  ```
* **`applicant_profiles` Table:**
  ```text
  user_id                              | phone | current_location | technical_skills | total_experience_years
  -------------------------------------+-------+------------------+------------------+-----------------------
  e826b527-df21-4f16-8f38-23214da91845 | NULL  | NULL             | {}               | NULL
  ```
* **`sessions` Table:**
  ```text
  id                                   | user_id                              | refresh_token_hash                                               | expires_at          | revoked_at
  -------------------------------------+--------------------------------------+------------------------------------------------------------------+---------------------+-----------
  s1111111-1111-1111-1111-111111111111 | e826b527-df21-4f16-8f38-23214da91845 | b78e3c79a4025d57b2ff93dc72... (SHA-256 of issued refresh token) | 2026-11-02 12:00:00 | NULL
  ```

#### Stage 2: Applicant Login (`POST /api/v1/auth/login`)
Alex logs in from a second device:
* **`users` Table:** `last_login_at` is updated to `NOW()`.
* **`sessions` Table:** A second active session row is created:
  ```text
  id                                   | user_id                              | refresh_token_hash               | expires_at          | revoked_at
  -------------------------------------+--------------------------------------+----------------------------------+---------------------+-----------
  s1111111-1111-1111-1111-111111111111 | e826b527-df21-4f16-8f38-23214da91845 | b78e3c79... (Laptop session)     | 2026-11-02 12:00:00 | NULL
  s2222222-2222-2222-2222-222222222222 | e826b527-df21-4f16-8f38-23214da91845 | d91f63a1... (Mobile session)     | 2026-11-02 12:05:00 | NULL
  ```

#### Stage 3: Refresh Token Rotation (`POST /api/v1/auth/refresh`)
* Old session is revoked: `revoked_at` is set to `NOW()`.
* New session row is inserted with a fresh SHA-256 hash. Reusing the old token is blocked.

#### Stage 4: Profile Details Updated (`PATCH /api/v1/me/profile`)
* **`applicant_profiles` Table:**
  ```text
  user_id                              | phone           | current_location | technical_skills            | total_experience_years
  -------------------------------------+-----------------+------------------+-----------------------------+-----------------------
  e826b527-df21-4f16-8f38-23214da91845 | +91 98765 43210 | Bangalore        | {"JavaScript","React","Node"} | 2.5
  ```

#### Stage 5: Password Reset (`POST /api/v1/auth/reset-password`)
* **`users` Table:** `password_hash` updated; `password_changed_at` set to `NOW()`.
* **`sessions` Table:** All sessions for this user have `revoked_at` set to `NOW()`, logging out all devices simultaneously.

---

## 2. Complete Endpoints Reference & Testing

---

### Endpoint 1: Register New Applicant
* **Method & Route:** `POST /api/v1/auth/register`
* **Access:** Public (Rate-limited: 20 req / 15 min)
* **Purpose:** Creates applicant credentials and profile. Public body can never assign `ADMIN`.

#### Request Body:
```json
{
  "fullName": "Alex Morgan",
  "email": "alex.morgan@example.com",
  "password": "Password123!"
}
```

#### How to Test with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"Alex Morgan\",\"email\":\"alex.morgan@example.com\",\"password\":\"Password123!\"}"
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
      "refreshToken": "7c88eb960bf209e74d1a49f575239a5893a77800..."
    }
  }
}
```

#### Error Case: Duplicate Email (`409 Conflict`):
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "An account with this email address already exists"
  }
}
```

---

### Endpoint 2: Authenticate & Login
* **Method & Route:** `POST /api/v1/auth/login`
* **Access:** Public (Rate-limited: 20 req / 15 min)
* **Purpose:** Verifies email/password and starts a new session.

#### Request Body:
```json
{
  "email": "alex.morgan@example.com",
  "password": "Password123!"
}
```

#### How to Test with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alex.morgan@example.com\",\"password\":\"Password123!\"}"
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
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "refreshToken": "a671f00a5d4e..."
    }
  }
}
```

#### Error Case: Wrong Password (`401 Unauthorized`):
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

### Endpoint 3: Get Current User Context
* **Method & Route:** `GET /api/v1/auth/me`
* **Access:** Authenticated (Requires valid Bearer access token)
* **Purpose:** Reads safe user identity from JWT and verifies account is active.

#### How to Test with cURL:
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
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

---

### Endpoint 4: Refresh Access Token (Token Rotation)
* **Method & Route:** `POST /api/v1/auth/refresh`
* **Access:** Requires valid refresh token
* **Purpose:** Issues fresh access token and rotates refresh token; revokes previous token.

#### Request Body:
```json
{
  "refreshToken": "a671f00a5d4e..."
}
```

#### How to Test with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN_HERE\"}"
```

#### Expected Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_token...",
    "refreshToken": "48bfa9321ef...",
    "user": {
      "id": "e826b527-df21-4f16-8f38-23214da91845",
      "email": "alex.morgan@example.com",
      "fullName": "Alex Morgan",
      "role": "APPLICANT"
    }
  }
}
```

---

### Endpoint 5: Logout Session
* **Method & Route:** `POST /api/v1/auth/logout`
* **Access:** Public / Session-aware
* **Purpose:** Marks the session row in PostgreSQL as revoked (`revoked_at = NOW()`).

#### Request Body:
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
}
```

#### How to Test with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"YOUR_REFRESH_TOKEN_HERE\"}"
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

### Endpoint 6: Read Own Applicant Profile
* **Method & Route:** `GET /api/v1/me/profile`
* **Access:** Authenticated (Applicant)
* **Purpose:** Retrieves candidate professional details with `fullName` and `email` populated from `users`.

#### How to Test with cURL:
```bash
curl -X GET http://localhost:4000/api/v1/me/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
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

### Endpoint 7: Update Own Applicant Profile
* **Method & Route:** `PATCH /api/v1/me/profile`
* **Access:** Authenticated (Applicant)
* **Purpose:** Updates permitted candidate credentials. Rejects any attempt to modify `role`, `email`, or `status`.

#### Request Body:
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

#### How to Test with cURL:
```bash
curl -X PATCH http://localhost:4000/api/v1/me/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+91 98765 43210\",\"currentLocation\":\"Bangalore\",\"highestQualification\":\"B.Tech\",\"technicalSkills\":[\"React\",\"Node.js\"],\"totalExperienceYears\":2.5}"
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
    "currentLocation": "Bangalore",
    "highestQualification": "B.Tech",
    "technicalSkills": ["React", "Node.js"],
    "totalExperienceYears": "2.5"
  }
}
```

---

### Endpoint 8: Forgot Password (Request Reset)
* **Method & Route:** `POST /api/v1/auth/forgot-password`
* **Access:** Public (Rate-limited: 5 req / 15 min)
* **Security:** Always returns the same neutral message whether the account exists or not, preventing enumeration.

#### Request Body:
```json
{
  "email": "alex.morgan@example.com"
}
```

#### How to Test with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"alex.morgan@example.com\"}"
```

#### Expected Response (`200 OK`):
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

---

### Endpoint 9: Confirm Password Reset
* **Method & Route:** `POST /api/v1/auth/reset-password`
* **Access:** Public with valid Reset Token
* **Purpose:** Sets new password, updates `password_changed_at`, and invalidates all existing user sessions.

#### Request Body:
```json
{
  "token": "YOUR_RESET_JWT_TOKEN",
  "newPassword": "NewStrongPassword2026!"
}
```

#### How to Test with cURL:
```bash
curl -X POST http://localhost:4000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"YOUR_RESET_JWT_TOKEN\",\"newPassword\":\"NewStrongPassword2026!\"}"
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

---

## 3. End-to-End Automated Test Execution Checklist

To run the automated test suite verifying all endpoints:
```powershell
cd nexora/server
npm run test:phase2
```

This automated suite runs:
1. Candidate registration (`POST /register`) -> Asserts `201 Created`.
2. Duplicate email rejection -> Asserts `409 Conflict`.
3. Candidate login -> Asserts `200 OK` and checks `accessToken` + `refreshToken`.
4. Wrong password rejection -> Asserts `401 Unauthorized`.
5. Protected identity check (`GET /me`) -> Asserts `200 OK` with Bearer token.
6. Missing token check -> Asserts `401 Unauthorized`.
7. Refresh token rotation -> Asserts `200 OK` and verifies new token generation.
8. Revocation check -> Asserts old token cannot be reused.
9. Password reset flow and immediate invalidation of old sessions.
10. Applicant profile retrieval (`GET /me/profile`) and update (`PATCH /me/profile`).
