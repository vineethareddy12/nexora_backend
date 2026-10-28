# Nexora Technologies — Enterprise Services Module Testing Guide

> **Module:** Enterprise Services Catalog & CMS  
> **Backend Directory:** [`server/src/app/services/`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/server/src/app/services/)  
> **Frontend Component:** [`client/src/features/admin/services/AdminServicesPage.jsx`](file:///c:/Users/Lenovo/Desktop/new%20project/nexora/client/src/features/admin/services/AdminServicesPage.jsx)  
> **Public Views:** `/services`, `/` (Home services grid)  
> **Base URL:** `http://localhost:4000/api/v1`

---

## 1. Database Architecture & Table Structure

This module stores technology capabilities, industry solutions, and service offerings in the PostgreSQL table `services`.

### Table Schema (`services`)
```sql
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "short_description" VARCHAR(320) NOT NULL,
    "full_description" TEXT,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon_name" VARCHAR(60),
    "image_url" TEXT,
    "display_order" SMALLINT NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");
CREATE INDEX "services_is_published_display_order_idx" ON "services"("is_published", "display_order");
```

### Visual Row Evolution:
```text
id           | title                            | slug                         | category          | is_published | display_order
─────────────┼──────────────────────────────────┼──────────────────────────────┼───────────────────┼──────────────┼──────────────
<uuid-row-1> | AI & Machine Learning Solutions  | ai-machine-learning-solution | AI & Data Science | true         | 1
```

---

## 2. Backend API Test Cases

### Test Case S-1: Public Published Services Retrieval (`GET /api/v1/services`)
* **Endpoint:** `GET http://localhost:4000/api/v1/services`
* **Authentication:** None (Public)
* **cURL Command:**
  ```bash
  curl -X GET http://localhost:4000/api/v1/services
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

### Test Case S-2: Unauthorized Service Creation Attempt (`POST /api/v1/admin/services`)
* **Endpoint:** `POST http://localhost:4000/api/v1/admin/services`
* **Authentication:** Missing Token
* **cURL Command:**
  ```bash
  curl -X POST http://localhost:4000/api/v1/admin/services \
    -H "Content-Type: application/json" \
    -d '{"title": "Unauthorized Service", "slug": "unauthorized-service"}'
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

### Test Case S-3: Admin Create Service (`POST /api/v1/admin/services`)
* **Endpoint:** `POST http://localhost:4000/api/v1/admin/services`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **cURL Command:**
  ```bash
  curl -X POST http://localhost:4000/api/v1/admin/services \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
    -d '{
      "title": "AI & Machine Learning Solutions",
      "slug": "ai-machine-learning-solutions",
      "category": "Artificial Intelligence",
      "shortDescription": "Enterprise LLM integration, predictive analytics, and automated document extraction pipelines.",
      "fullDescription": "From generative AI and retrieval-augmented generation (RAG) to automated vision pipelines.",
      "capabilities": ["LLM Fine-Tuning", "Computer Vision", "RAG Systems", "Automated OCR"],
      "techStack": ["Python", "TensorFlow", "PyTorch", "FastAPI"],
      "iconName": "Cpu",
      "displayOrder": 1,
      "isPublished": true
    }'
  ```
* **Expected Status:** `201 Created`
* **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Service created successfully.",
    "data": {
      "service": {
        "id": "e4b17e44-...",
        "title": "AI & Machine Learning Solutions",
        "slug": "ai-machine-learning-solutions",
        "category": "Artificial Intelligence",
        "isPublished": true,
        "displayOrder": 1
      }
    }
  }
  ```

---

### Test Case S-4: Duplicate Slug Conflict (`409 Conflict`)
* **Endpoint:** `POST http://localhost:4000/api/v1/admin/services`
* **Payload:** Attempting to create another service with the slug `ai-machine-learning-solutions`.
* **Expected Status:** `409 Conflict`
* **Expected Response:**
  ```json
  {
    "success": false,
    "error": {
      "code": "SLUG_ALREADY_EXISTS",
      "message": "A service with the slug \"ai-machine-learning-solutions\" already exists."
    }
  }
  ```

---

### Test Case S-5: Toggle Published Status (`PATCH /api/v1/admin/services/:id/status`)
* **Endpoint:** `PATCH http://localhost:4000/api/v1/admin/services/SERVICE_ID/status`
* **Authentication:** `Bearer <ADMIN_JWT_ACCESS_TOKEN>`
* **Payload:**
  ```json
  {
    "isPublished": false
  }
  ```
* **Expected Status:** `200 OK`
* **Expected Response:**
  ```json
  {
    "success": true,
    "data": {
      "service": {
        "id": "SERVICE_ID",
        "isPublished": false
      }
    }
  }
  ```

---

## 3. Database Reflection Verification

Run the following command in `nexora/server` to directly inspect the table:
```powershell
node -e "import('./src/core/database/prisma.js').then(async ({prisma}) => { const s = await prisma.service.findMany(); console.log(s); process.exit(0); })"
```

### Direct SQL Query in PostgreSQL:
```sql
SELECT id, title, slug, category, is_published, display_order, created_at 
FROM services 
ORDER BY display_order ASC;
```

---

## 4. Frontend UI Walkthrough & Verification Check

1. **Log in as Administrator:**
   - URL: `http://localhost:5173/login`
   - Email: `admin@nexoratech.com`
   - Password: `AdminSecurePass2026!`

2. **Navigate to Services Console:**
   - Sidebar -> Click **Services** (`http://localhost:5173/admin/services`).
   - If the database was cleared, you see the empty state *"No Services Found"*.

3. **Add a New Service:**
   - Click the **Add New Service** button (+ icon).
   - Fill in:
     - Title: `AI & Machine Learning Solutions`
     - Category: `Artificial Intelligence`
     - Slug: `ai-machine-learning-solutions` (auto-generates or enter manually)
     - Short Description: `Enterprise LLM integration, predictive analytics, and automated document extraction pipelines.`
     - Capabilities (comma-separated): `LLM Fine-Tuning, Computer Vision, RAG Systems, Automated OCR`
     - Display Order: `1`
     - Check the box: **Publish on public website** (`isPublished = true`)
   - Click **Create Service**.
   - **UI Success Indicator:** Green banner *"Service created successfully!"* appears, modal closes, and the service row appears in the table with an **Active (Published)** green badge.

4. **Verify Public UI Reflection:**
   - **Services Page (`http://localhost:5173/services`):** The empty state disappears. The new card **AI & Machine Learning Solutions** renders with its icon, capabilities badges, and description.
   - **Home Page (`http://localhost:5173/`):** The service appears under **Comprehensive IT & Engineering Services**.
   - **Admin Dashboard (`http://localhost:5173/admin/dashboard`):** The **Enterprise Services** counter auto-increments from `0` to `1`.
