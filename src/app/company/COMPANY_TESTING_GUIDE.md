# Nexora Technologies — Company Profile Module Testing Guide

> **Module:** Company Profile & Corporate Identity CMS  
> **Backend Directory:** [`server/src/app/company/`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/server/src/app/company/)  
> **Frontend Component:** [`client/src/features/admin/company/AdminCompanyPage.jsx`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/client/src/features/admin/company/AdminCompanyPage.jsx)  
> **Public Views:** `/about`, `/contact`, `/`  
> **Base URL:** `http://localhost:4000/api/v1`

---

## 1. Database Architecture & Table Structure

This module manages the corporate identity, official contact coordinates, and CMS content in the PostgreSQL table `company_profiles`.

### Table Schema (`company_profiles`)
```sql
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "company_name" VARCHAR(160) NOT NULL,
    "logo_url" TEXT,
    "short_description" VARCHAR(500) NOT NULL,
    "about" TEXT NOT NULL,
    "mission" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "areas_of_expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "business_capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(60) NOT NULL,
    "address" TEXT NOT NULL,
    "website_url" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);
```

### Visual Row Evolution:
```text
id           | company_name                      | email                  | phone            | updated_at
─────────────┼───────────────────────────────────┼────────────────────────┼──────────────────┼────────────────────────
<uuid-row-1> | Nexora Technologies Private Ltd   | contact@nexoratech.com | +91 93904 66320  | 2026-10-26T15:20:00Z
```

---

## 2. Backend API Test Cases

### Test Case C-1: Public Profile Retrieval (`GET /api/v1/company`)
* **Endpoint:** `GET http://localhost:4000/api/v1/company`
* **Authentication:** None (Public)
* **cURL Command:**
  ```bash
  curl -X GET http://localhost:4000/api/v1/company
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "company": {
        "companyName": "Nexora Technologies Private Limited",
        "shortDescription": "Delivering high-impact enterprise software engineering...",
        "email": "contact@nexoratech.com",
        "phone": "+91 93904 66320",
        "address": "LVS Arcade, Jubilee Enclave, Madhapur, Hitec City, Hyderabad 500081",
        "websiteUrl": "https://www.globaltechnologyservice.in",
        "areasOfExpertise": ["Full-Stack Web Application Development", "Cloud Architecture"],
        "businessCapabilities": ["Dedicated Engineering Pods", "Enterprise Delivery"]
      }
    }
  }
  ```

---

### Test Case C-2: Unauthorized Profile Update Attempt (`PUT /api/v1/admin/company`)
* **Endpoint:** `PUT http://localhost:4000/api/v1/admin/company`
* **Authentication:** Missing or Invalid Token
* **cURL Command:**
  ```bash
  curl -X PUT http://localhost:4000/api/v1/admin/company \
    -H "Content-Type: application/json" \
    -d '{"companyName": "Hacked Profile"}'
  ```
* **Expected Status:** `401 Unauthorized`
* **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Access token is missing or malformed."
    }
  }
  ```

---

### Test Case C-3: Admin Profile Update (`PUT /api/v1/admin/company`)
* **Endpoint:** `PUT http://localhost:4000/api/v1/admin/company`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **cURL Command:**
  ```bash
  curl -X PUT http://localhost:4000/api/v1/admin/company \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    -d '{
      "companyName": "Nexora Technologies Private Limited",
      "shortDescription": "Enterprise software engineering & cloud architecture provider.",
      "about": "Nexora Technologies is an ISO 9001:2015 certified global technology services company.",
      "mission": "To empower enterprises with resilient digital infrastructure.",
      "vision": "To be a globally recognised technology partner known for software craftsmanship.",
      "email": "contact@nexoratech.com",
      "phone": "+91 93904 66320",
      "address": "LVS Arcade, Jubilee Enclave, Madhapur, Hitec City, Hyderabad 500081",
      "websiteUrl": "https://www.globaltechnologyservice.in",
      "areasOfExpertise": ["Full-Stack Development", "Cloud Architecture", "DevOps"],
      "businessCapabilities": ["Dedicated Engineering Pods", "Enterprise Delivery"]
    }'
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Company profile updated successfully.",
    "data": {
      "company": {
        "companyName": "Nexora Technologies Private Limited",
        "email": "contact@nexoratech.com",
        "phone": "+91 93904 66320"
      }
    }
  }
  ```

---

### Test Case C-4: Validation Failure (`400 Bad Request`)
* **Endpoint:** `PUT http://localhost:4000/api/v1/admin/company`
* **Payload with Invalid Email:**
  ```json
  {
    "companyName": "N",
    "email": "not-an-email"
  }
  ```
* **Expected Status:** `400 Bad Request`
* **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Request validation failed",
      "details": [
        { "field": "companyName", "message": "Company name must be at least 2 characters" },
        { "field": "email", "message": "Invalid official contact email" }
      ]
    }
  }
  ```

---

## 3. Database Reflection Verification

Run the following command in `nexora/server` to directly inspect the row in PostgreSQL:
```powershell
node -e "import('./src/core/database/prisma.js').then(async ({prisma}) => { const c = await prisma.companyProfile.findFirst(); console.log(c); process.exit(0); })"
```

### Direct SQL Query in PostgreSQL:
```sql
SELECT company_name, email, phone, address, updated_at 
FROM company_profiles 
LIMIT 1;
```

---

## 4. Frontend UI Walkthrough & Verification Check

1. **Log in as Administrator:**
   - URL: `http://localhost:5173/login`
   - Email: `admin@nexoratech.com`
   - Password: `AdminSecurePass2026!`

2. **Navigate to Company Settings:**
   - Sidebar -> Click **Company Info** (`http://localhost:5173/admin/company`).
   - The form immediately displays all current values.

3. **Edit and Save:**
   - Change **Company Name** to `Nexora Technologies Private Limited`.
   - Update **Contact Phone** to `+91 93904 66320`.
   - Click **Save Company Profile**.
   - **UI Success Indicator:** A green notification appears: *"Company settings and corporate profile saved successfully!"*

4. **Verify Public UI Reflection:**
   - **About Page (`http://localhost:5173/about`):** The badge displays *"About Nexora Technologies Private Limited"*.
   - **Contact Page (`http://localhost:5173/contact`):** Headquarters address and direct desk phone numbers update immediately.
   - **Home Page (`http://localhost:5173/`):** Footer and company badge reflect the saved name.
