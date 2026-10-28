# Nexora Technologies — Contact Enquiries Module Testing Guide

> **Module:** Contact Enquiries, Client Leads & Triage Operations  
> **Backend Directory:** [`server/src/app/enquiries/`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/server/src/app/enquiries/)  
> **Frontend Component:** [`client/src/features/admin/enquiries/AdminEnquiriesPage.jsx`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/client/src/features/admin/enquiries/AdminEnquiriesPage.jsx)  
> **Public Views:** `/contact` (Send Us a Message form)  
> **Base URL:** `http://localhost:4000/api/v1`

---

## 1. Database Architecture & Table Structure

This module captures incoming client inquiries, project scopes, and enterprise requests in the PostgreSQL table `contact_enquiries`.

### Table Schema (`contact_enquiries`)
```sql
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE "contact_enquiries" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_enquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_enquiries_status_created_at_idx" ON "contact_enquiries"("status", "created_at");
```

### Visual Row Evolution:
```text
id           | full_name   | email                              | status      | admin_notes                                | created_at
─────────────┼─────────────┼────────────────────────────────────┼─────────────┼────────────────────────────────────────────┼────────────────────────
<uuid-row-1> | Rohan Verma | rohan.verma@enterpriseclient.com   | IN_PROGRESS | Scheduled technical call for Thursday 3 PM | 2026-10-26T15:25:00Z
```

---

## 2. Backend API Test Cases

### Test Case E-1: Public Submit Inbound Enquiry (`POST /api/v1/enquiries`)
* **Endpoint:** `POST http://localhost:4000/api/v1/enquiries`
* **Authentication:** None (Public)
* **cURL Command:**
  ```bash
  curl -X POST http://localhost:4000/api/v1/enquiries \
    -H "Content-Type: application/json" \
    -d '{
      "fullName": "Rohan Verma",
      "email": "rohan.verma@enterpriseclient.com",
      "phone": "+91 98765 43210",
      "subject": "Enterprise Cloud Migration RFP",
      "message": "We are looking to migrate our on-premise infrastructure to AWS Kubernetes. Please share consultation availability."
    }'
  ```
* **Expected Status:** `201 Created`
* **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Enquiry submitted successfully. We will get back to you shortly.",
    "data": {
      "enquiry": {
        "id": "f8a42e11-...",
        "fullName": "Rohan Verma",
        "email": "rohan.verma@enterpriseclient.com",
        "subject": "Enterprise Cloud Migration RFP",
        "status": "NEW",
        "createdAt": "2026-10-26T15:25:00.000Z"
      }
    }
  }
  ```

---

### Test Case E-2: Validation Error on Malformed Email (`400 Bad Request`)
* **Endpoint:** `POST http://localhost:4000/api/v1/enquiries`
* **Payload:**
  ```json
  {
    "fullName": "Rohan Verma",
    "email": "invalid-email-address",
    "subject": "Hi",
    "message": "Short"
  }
  ```
* **Expected Status:** `400 Bad Request`
* **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "details": [
        { "field": "email", "message": "Invalid contact email address" },
        { "field": "subject", "message": "Subject must be at least 3 characters" },
        { "field": "message", "message": "Message must be at least 10 characters" }
      ]
    }
  }
  ```

---

### Test Case E-3: Admin List Enquiries (`GET /api/v1/admin/enquiries`)
* **Endpoint:** `GET http://localhost:4000/api/v1/admin/enquiries`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **cURL Command:**
  ```bash
  curl -X GET http://localhost:4000/api/v1/admin/enquiries \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "f8a42e11-...",
          "fullName": "Rohan Verma",
          "email": "rohan.verma@enterpriseclient.com",
          "status": "NEW"
        }
      ],
      "pagination": { "totalItems": 1 }
    }
  }
  ```

---

### Test Case E-4: Admin Triage — Update Status (`PATCH /api/v1/admin/enquiries/:id/status`)
* **Endpoint:** `PATCH http://localhost:4000/api/v1/admin/enquiries/ENQUIRY_ID/status`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **Payload:**
  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Enquiry status updated successfully.",
    "data": {
      "enquiry": {
        "id": "ENQUIRY_ID",
        "status": "IN_PROGRESS"
      }
    }
  }
  ```

---

### Test Case E-5: Admin Add Internal Notes (`PATCH /api/v1/admin/enquiries/:id/notes`)
* **Endpoint:** `PATCH http://localhost:4000/api/v1/admin/enquiries/ENQUIRY_ID/notes`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **Payload:**
  ```json
  {
    "notes": "Scheduled technical scoping call for Thursday 3 PM with solutions architecture pod."
  }
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Admin notes saved successfully.",
    "data": {
      "enquiry": {
        "id": "ENQUIRY_ID",
        "adminNotes": "Scheduled technical scoping call for Thursday 3 PM with solutions architecture pod."
      }
    }
  }
  ```

---

## 3. Database Reflection Verification

Run in `nexora/server`:
```powershell
node -e "import('./src/core/database/prisma.js').then(async ({prisma}) => { const e = await prisma.contactEnquiry.findMany(); console.log(e); process.exit(0); })"
```

### Direct SQL Query in PostgreSQL:
```sql
SELECT id, full_name, email, phone, subject, status, admin_notes, created_at 
FROM contact_enquiries 
ORDER BY created_at DESC;
```

---

## 4. Frontend UI Walkthrough & Verification Check

1. **Submit an Enquiry from the Public Website:**
   - Open browser at `http://localhost:5173/contact`.
   - Scroll down to the **Send Us a Message** contact form.
   - Enter:
     - Full Name: `Rohan Verma`
     - Email: `rohan.verma@enterpriseclient.com`
     - Phone: `+91 98765 43210`
     - Subject: `Enterprise Cloud Migration RFP`
     - Message: `We are looking to migrate our on-premise infrastructure to AWS Kubernetes. Please share consultation availability.`
   - Click **Send Message**.
   - **UI Success Indicator:** The form morphs into a green confirmation card: *"Enquiry Transmitted Successfully. Thank you, Rohan Verma! Our solutions team has received your brief."*

2. **Verify in Admin Portal:**
   - Log in as admin at `http://localhost:5173/login`.
   - Sidebar -> Click **Enquiries** (`http://localhost:5173/admin/enquiries`).
   - The enquiry table displays **Rohan Verma** with status badge `NEW` and subject `Enterprise Cloud Migration RFP`.

3. **Perform Admin Triage & Save Notes:**
   - Click the **Review & Triage** (eye icon) button next to Rohan Verma.
   - Change Status to `IN_PROGRESS`.
   - Type in the Admin Notes box: *"Scheduled technical scoping call for Thursday 3 PM."*
   - Click **Save Status & Notes**.
   - **UI Success Indicator:** Green checkmark appears. The table updates the status badge to `IN_PROGRESS`.

4. **Verify Admin Dashboard Reflection:**
   - Go to `http://localhost:5173/admin/dashboard`.
   - The **Contact Enquiries** card updates its count and subtext to reflect pending review items.
