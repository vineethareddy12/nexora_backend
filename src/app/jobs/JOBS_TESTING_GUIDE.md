# Nexora Technologies — Job Vacancies Module Testing Guide

> **Module:** Recruitment Vacancy Management & Careers CMS  
> **Backend Directory:** [`server/src/app/jobs/`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/server/src/app/jobs/)  
> **Frontend Component:** [`client/src/features/admin/jobs/AdminJobsPage.jsx`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/client/src/features/admin/jobs/AdminJobsPage.jsx)  
> **Public Views:** `/careers`, `/jobs/:id`, `/` (Featured jobs)  
> **Base URL:** `http://localhost:4000/api/v1`

---

## 1. Database Architecture & Table Structure

This module manages talent vacancies and recruitment requirements in the PostgreSQL table `jobs`.

### Table Schema (`jobs`)
```sql
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP');
CREATE TYPE "WorkMode" AS ENUM ('ON_SITE', 'HYBRID', 'REMOTE');

CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "job_code" VARCHAR(50) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "department" VARCHAR(120) NOT NULL,
    "location" VARCHAR(140) NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "work_mode" "WorkMode" NOT NULL DEFAULT 'HYBRID',
    "experience_required" VARCHAR(80) NOT NULL,
    "salary_range" VARCHAR(100),
    "description" TEXT NOT NULL,
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferred_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "number_of_openings" SMALLINT DEFAULT 1,
    "application_deadline" TIMESTAMPTZ,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "jobs_job_code_key" ON "jobs"("job_code");
CREATE INDEX "jobs_status_application_deadline_idx" ON "jobs"("status", "application_deadline");
CREATE INDEX "jobs_department_work_mode_idx" ON "jobs"("department", "work_mode");
```

### Visual Row Evolution:
```text
id           | job_code     | title                | department              | status    | number_of_openings
─────────────┼──────────────┼──────────────────────┼─────────────────────────┼───────────┼───────────────────
<uuid-row-1> | NEX-TEST-001 | Lead Cloud Architect | Infrastructure & Cloud  | PUBLISHED | 2
```

---

## 2. Backend API Test Cases

### Test Case J-1: Public Published Jobs Retrieval (`GET /api/v1/jobs`)
* **Endpoint:** `GET http://localhost:4000/api/v1/jobs`
* **Authentication:** None (Public)
* **cURL Command:**
  ```bash
  curl -X GET http://localhost:4000/api/v1/jobs
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "items": [],
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 0,
        "totalPages": 1
      }
    }
  }
  ```

---

### Test Case J-2: Unauthorized Job Creation (`POST /api/v1/admin/jobs`)
* **Endpoint:** `POST http://localhost:4000/api/v1/admin/jobs`
* **Authentication:** Missing Token
* **Expected Status:** `401 Unauthorized`

---

### Test Case J-3: Admin Create Job Posting (`POST /api/v1/admin/jobs`)
* **Endpoint:** `POST http://localhost:4000/api/v1/admin/jobs`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **cURL Command:**
  ```bash
  curl -X POST http://localhost:4000/api/v1/admin/jobs \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    -d '{
      "jobCode": "NEX-TEST-001",
      "title": "Lead Cloud Architect",
      "department": "Infrastructure & Cloud",
      "location": "Hyderabad, India",
      "employmentType": "FULL_TIME",
      "workMode": "HYBRID",
      "experienceRequired": "5+ years",
      "salaryRange": "₹18,00,000 - ₹24,00,000 PA",
      "numberOfOpenings": 2,
      "applicationDeadline": "2026-12-31T23:59:59.000Z",
      "status": "PUBLISHED",
      "isFeatured": true,
      "description": "Architect and manage Kubernetes clusters and automated CI/CD cloud pipelines.",
      "responsibilities": ["Design multi-region AWS architectures", "Configure Prometheus & Grafana alerts"],
      "requiredQualifications": ["B.Tech / M.Tech in Computer Science or related degree"],
      "requiredSkills": ["Docker", "Kubernetes", "Terraform", "AWS"],
      "preferredSkills": ["CKA Certification", "Golang"]
    }'
  ```
* **Expected Status:** `201 Created`
* **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Job posting created successfully.",
    "data": {
      "job": {
        "id": "c1d47e44-...",
        "jobCode": "NEX-TEST-001",
        "title": "Lead Cloud Architect",
        "status": "PUBLISHED",
        "numberOfOpenings": 2
      }
    }
  }
  ```

---

### Test Case J-4: Duplicate Job Code Check (`409 Conflict`)
* **Endpoint:** `POST http://localhost:4000/api/v1/admin/jobs`
* **Payload:** Attempting to post another job with code `NEX-TEST-001`.
* **Expected Status:** `409 Conflict`
* **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "JOB_CODE_ALREADY_EXISTS",
      "message": "A job with code \"NEX-TEST-001\" already exists."
    }
  }
  ```

---

### Test Case J-5: Filter Jobs by Department & Work Mode (`GET /api/v1/jobs`)
* **Endpoint:** `GET http://localhost:4000/api/v1/jobs?department=Infrastructure%20%26%20Cloud&workMode=HYBRID`
* **Expected Status:** `200 OK`
* **Expected Response:** Returns only the matching job postings.

---

### Test Case J-6: Admin Update Status to CLOSED (`PATCH /api/v1/admin/jobs/:id/status`)
* **Endpoint:** `PATCH http://localhost:4000/api/v1/admin/jobs/JOB_ID/status`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **Payload:**
  ```json
  {
    "status": "CLOSED"
  }
  ```
* **Expected Status:** `200 OK`
* **Database Effect:** The job's status becomes `CLOSED`, immediately hiding it from the public `/careers` vacancy board.

---

## 3. Database Reflection Verification

Run in `nexora/server`:
```powershell
node -e "import('./src/core/database/prisma.js').then(async ({prisma}) => { const j = await prisma.job.findMany(); console.log(j); process.exit(0); })"
```

### Direct SQL Query in PostgreSQL:
```sql
SELECT id, job_code, title, department, employment_type, work_mode, status, number_of_openings, created_at 
FROM jobs 
ORDER BY created_at DESC;
```

---

## 4. Frontend UI Walkthrough & Verification Check

1. **Log in as Administrator:**
   - URL: `http://localhost:5173/login`
   - Email: `admin@nexoratech.com`
   - Password: `AdminSecurePass2026!`

2. **Navigate to Jobs Management:**
   - Sidebar -> Click **Job Postings** (`http://localhost:5173/admin/jobs`).
   - If clean, the table displays the empty state *"No Vacancies Found"*.

3. **Post a New Vacancy:**
   - Click the **Post New Vacancy** button (+ icon).
   - Fill in:
     - Job Code: `NEX-TEST-001`
     - Job Title: `Lead Cloud Architect`
     - Department: `Infrastructure & Cloud`
     - Location: `Hyderabad, India`
     - Employment Type: `Full-time`
     - Work Mode: `Hybrid`
     - Experience Required: `5+ years`
     - Openings: `2`
     - Application Deadline: Select a future date (e.g. Dec 31, 2026)
     - Status: Select **Published**
     - Description: `Architect and manage Kubernetes clusters and automated CI/CD cloud pipelines.`
   - Click **Create Job Posting**.
   - **UI Success Indicator:** Green toast appears, modal closes, and `Lead Cloud Architect` (`NEX-TEST-001`) is listed in the Admin table with a green `PUBLISHED` badge.

4. **Verify Public UI Reflection:**
   - **Careers Page (`http://localhost:5173/careers`):** Empty state vanishes. The job card appears with its department tag, work mode badge, description, and an active **Apply Now** button.
   - **Job Details Page (`http://localhost:5173/jobs/JOB_ID`):** Renders full job spec, responsibilities, and application submission form.
   - **Admin Dashboard (`http://localhost:5173/admin/dashboard`):** Both **Job Postings** and **Open Vacancies** counters auto-increment from `0` to `1`.
