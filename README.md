# EAMS Backend API

Enterprise Asset Management System — standalone Express + PostgreSQL API.

## Stack

- Node.js, Express, TypeScript
- PostgreSQL (`pg`)
- JWT + bcrypt authentication
- express-validator, helmet, cors, morgan, cookie-parser

## Setup

```bash
cd backend
cp .env.example .env   # adjust DATABASE_URL, JWT_SECRET
npm install
npm run build
npm run dev            # development (port 5001)
# or
npm start              # production (compiled dist/)
```

Requires the existing `goai_assets` PostgreSQL database (same schema as the React app).

## Setup (Docker Compose)

Runs the API and a PostgreSQL 16 container together — no local Node or Postgres install needed.

```bash
docker compose up -d --build
```

This starts:

- **`postgres`** — Postgres 16, exposed on `5432`, data persisted in the `postgres-data` volume
- **`api`** — built from the [Dockerfile](Dockerfile), exposed on `5001`, waits for Postgres to be healthy before starting

The `api` service's `DATABASE_URL` is wired to the `postgres` service automatically. Override any setting (`POSTGRES_PASSWORD`, `JWT_SECRET`, `API_PORT`, `CORS_ORIGIN`, etc.) via a `.env` file next to `docker-compose.yml` — see [.env.example](.env.example) for the full list of variables and their defaults.

The database starts empty. Drop schema/seed `.sql` files into [db/init/](db/init/) and they run automatically the first time the `postgres-data` volume is created:

```bash
docker compose down -v   # wipe the volume to re-run init scripts
docker compose up -d --build
```

Useful commands:

```bash
docker compose logs -f api   # tail API logs
docker compose ps            # container status
docker compose down          # stop (add -v to also delete the DB volume)
```

Uploaded asset images persist in the `uploads-data` volume, mounted at `/app/uploads` in the `api` container.

## Architecture (MVC)

```
Request → Route → Controller → Service → Repository → PostgreSQL
```

- **Controllers** — validate (via middleware), call service, format JSON response
- **Services** — business logic
- **Repositories** — parameterized SQL only

## Response format

```json
{ "success": true, "message": "...", "data": {} }
{ "success": false, "message": "...", "errors": ["..."] }
```

## Module status

| # | Module            | Status      |
|---|-------------------|-------------|
| 1 | Backend setup     | ✅ Complete |
| 2 | Authentication    | ✅ Complete |
| 3 | Dashboard APIs    | ✅ Complete |
| 4 | Categories        | ✅ Complete |
| 5 | Vendors           | ✅ Complete |
| 6 | Employees         | ✅ Complete |
| 7 | Assets            | ✅ Complete |
| 8 | Assignments       | ✅ Complete |
| 9 | Reports & Export  | ✅ Complete |
| 10| Image upload      | ⏳ Pending  |

## Auth endpoints (`/api/auth`)

| Method | Path               | Auth | Description              |
|--------|--------------------|------|--------------------------|
| POST   | `/login`           | No   | Login, returns JWT       |
| POST   | `/register`        | No   | Create account           |
| POST   | `/logout`          | No   | Clear auth cookie        |
| GET    | `/profile`         | Yes  | Current user + roles     |
| PUT    | `/change-password` | Yes  | Update password        |
| POST   | `/forgot-password` | No   | Request reset OTP        |
| POST   | `/reset-password`  | No   | Reset with OTP           |

Protected routes accept `Authorization: Bearer <token>` or `access_token` httpOnly cookie.

## Dashboard endpoints (`/api/dashboard`)

All dashboard routes require authentication.

| Method | Path                    | Description                                      |
|--------|-------------------------|--------------------------------------------------|
| GET    | `/summary`              | Asset, employee, vendor, and category counts       |
| GET    | `/assets-by-category`   | Asset counts grouped by category                 |
| GET    | `/assets-by-status`     | Asset counts grouped by status                   |
| GET    | `/recent-activities`    | Latest 10 asset-related activity log entries     |
| GET    | `/warranty-expiring`    | Assets with warranty expiring within 30 days       |

### Example responses

**`GET /api/dashboard/summary`**

```json
{
  "success": true,
  "message": "Dashboard summary retrieved",
  "data": {
    "totalAssets": 0,
    "availableAssets": 0,
    "assignedAssets": 0,
    "underRepair": 0,
    "inactiveAssets": 0,
    "employees": 0,
    "vendors": 0,
    "categories": 0
  }
}
```

**`GET /api/dashboard/assets-by-category`**

```json
{
  "success": true,
  "message": "Assets by category retrieved",
  "data": [{ "category": "Laptop", "count": 5 }]
}
```

**`GET /api/dashboard/assets-by-status`**

```json
{
  "success": true,
  "message": "Assets by status retrieved",
  "data": [{ "status": "Available", "count": 8 }]
}
```

## Categories endpoints (`/api/categories`)

All category routes require authentication.

| Method | Path        | Description                                      |
|--------|-------------|--------------------------------------------------|
| GET    | `/`         | List all categories with asset counts            |
| GET    | `/search`   | Search by name or category code (`?q=`)          |
| GET    | `/stats`    | Category totals (empty vs with assets)           |
| GET    | `/:id`      | Get a single category by id                      |
| POST   | `/`         | Create a category                                |
| PUT    | `/:id`      | Update a category                                |
| DELETE | `/:id`      | Delete a category (409 if assets are assigned)   |

### Example responses

**`GET /api/categories`**

```json
{
  "success": true,
  "message": "Categories retrieved",
  "data": [
    {
      "id": "...",
      "categoryCode": "LAP",
      "name": "Laptop",
      "description": "Laptop devices",
      "assetCount": 5,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**`GET /api/categories/stats`**

```json
{
  "success": true,
  "message": "Category stats retrieved",
  "data": {
    "totalCategories": 15,
    "emptyCategories": 4,
    "categoriesWithAssets": 11
  }
}
```

**`POST /api/categories`**

```json
{
  "categoryCode": "LAP",
  "name": "Laptop",
  "description": "Laptop devices"
}
```

## Vendors endpoints (`/api/vendors`)

All vendor routes require authentication.

| Method | Path        | Description                                      |
|--------|-------------|--------------------------------------------------|
| GET    | `/`         | List all vendors with asset counts               |
| GET    | `/search`   | Search by name, code, contact, or email (`?q=`)  |
| GET    | `/stats`    | Vendor totals (with/without assets)              |
| GET    | `/:id`      | Get a single vendor by id                        |
| POST   | `/`         | Create a vendor (auto-generates `VEN###` code)   |
| PUT    | `/:id`      | Update a vendor                                  |
| DELETE | `/:id`      | Delete a vendor (409 if assets are assigned)     |

### Example responses

**`GET /api/vendors`**

```json
{
  "success": true,
  "message": "Vendors retrieved",
  "data": [
    {
      "id": "...",
      "vendorCode": "VEN001",
      "name": "Dell India",
      "contactPerson": "Rahul Sharma",
      "email": "rahul@dell.com",
      "phone": "+91xxxxxxxxxx",
      "address": "Bangalore",
      "assetCount": 12,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**`GET /api/vendors/stats`**

```json
{
  "success": true,
  "message": "Vendor stats retrieved",
  "data": {
    "totalVendors": 4,
    "vendorsWithAssets": 3,
    "vendorsWithoutAssets": 1
  }
}
```

**`POST /api/vendors`**

```json
{
  "vendorCode": "VEN001",
  "name": "Dell India",
  "contactPerson": "Rahul Sharma",
  "email": "rahul@dell.com",
  "phone": "9876543210",
  "address": "Bangalore"
}
```

`vendorCode` is optional; when omitted the next `VEN###` code is generated automatically.

## Employees endpoints (`/api/employees`)

All employee routes require authentication.

| Method | Path               | Description                                           |
|--------|--------------------|-------------------------------------------------------|
| GET    | `/`                | List all employees with assigned asset counts         |
| GET    | `/search`          | Search by code, ID, name, email, or department (`?q=`) |
| GET    | `/stats`           | Employee totals (active/inactive, with/without assets) |
| GET    | `/:id`             | Get a single employee by id                           |
| POST   | `/`                | Create an employee (auto-generates `EMP###` code)     |
| PUT    | `/:id`             | Update an employee                                    |
| POST   | `/:id/deactivate`  | Deactivate an employee (409 if assets are assigned) |
| DELETE | `/:id`             | Delete an employee (409 if assets are assigned)     |

### Example responses

**`GET /api/employees`**

```json
{
  "success": true,
  "message": "Employees retrieved",
  "data": [
    {
      "id": "...",
      "employeeCode": "EMP001",
      "employeeId": "GOAI001",
      "name": "John Doe",
      "email": "john@company.com",
      "phone": "9876543210",
      "department": "Engineering",
      "designation": "Software Engineer",
      "location": "Bangalore",
      "status": "Active",
      "assignedAssets": 2,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**`GET /api/employees/stats`**

```json
{
  "success": true,
  "message": "Employee stats retrieved",
  "data": {
    "totalEmployees": 10,
    "activeEmployees": 9,
    "inactiveEmployees": 1,
    "employeesWithAssets": 6,
    "employeesWithoutAssets": 4
  }
}
```

**`POST /api/employees`**

```json
{
  "employeeId": "GOAI001",
  "name": "John Doe",
  "email": "john@company.com",
  "phone": "9876543210",
  "department": "Engineering",
  "designation": "Software Engineer",
  "location": "Bangalore",
  "status": "Active"
}
```

`employeeCode` is optional; when omitted the next `EMP###` code is generated automatically.

## Assets endpoints (`/api/assets`)

All asset routes require authentication.

| Method | Path                 | Description                                      |
|--------|----------------------|--------------------------------------------------|
| GET    | `/`                  | List all assets with category, vendor, employee  |
| GET    | `/search`            | Search by asset ID, serial, brand, category, vendor (`?q=`) |
| GET    | `/stats`             | Asset counts by status                           |
| GET    | `/:id`               | Get full asset details with images               |
| POST   | `/`                  | Create asset (`multipart/form-data`, up to 10 images) |
| PUT    | `/:id`               | Update asset (optional additional images)        |
| DELETE | `/:id`               | Delete asset (only if never assigned)            |
| POST   | `/:id/deactivate`    | Deactivate asset                                 |
| POST   | `/:id/dispose`       | Dispose asset                                    |
| POST   | `/:id/repair`        | Move asset to Under Repair                       |
| POST   | `/:id/available`     | Return repaired asset to Available               |

Asset IDs are auto-generated per category: `AI-LAP001`, `AI-KEY001`, `AI-MOU001`, etc.

Uploaded images are stored under `backend/uploads/assets` and served from `/uploads/assets/...`.

### Example `POST /api/assets` (multipart fields)

- `categoryId`, `brand`, `serialNumber`, `invoiceNumber`, `purchaseDate`, `warrantyExpiry`, `vendorId`, `purchaseCost`
- Optional: `description`, `specifications`, `notes`
- Files: `images` (jpg/jpeg/png/webp, max 10)

## Assignments endpoints (`/api/assignments`)

All assignment routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all assignment history |
| GET | `/search` | Search by asset code, employee name, or employee ID (`?q=`) |
| GET | `/stats` | Assignment totals including overdue count |
| GET | `/active` | List currently active assignments |
| GET | `/employee/:employeeId` | Assignments for an employee |
| GET | `/asset/:assetId` | Assignment history for an asset |
| GET | `/:id` | Get assignment details |
| POST | `/` | Assign an available asset to an employee |
| POST | `/:id/return` | Return an asset (marks assignment returned) |
| POST | `/:id/unassign` | Unassign without deleting history |

### Example `POST /api/assignments`

```json
{
  "assetId": "...",
  "employeeId": "...",
  "assignedDate": "2026-08-01",
  "expectedReturnDate": "2027-08-01",
  "remarks": "Assigned for project"
}
```

## Reports endpoints (`/api/reports`)

All report routes require authentication.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/assets` | Asset report with optional filters |
| GET | `/employees` | Employee report with assigned asset counts |
| GET | `/vendors` | Vendor report with asset counts |
| GET | `/assignments` | Complete assignment history report |
| GET | `/warranty-expiring` | Assets expiring within `?days=` (default 30) |
| GET | `/assets/export/excel` | Download asset report as Excel |
| GET | `/assets/export/pdf` | Download asset report as PDF |
| GET | `/assignments/export/excel` | Download assignment report as Excel |
| GET | `/assignments/export/pdf` | Download assignment report as PDF |

### Asset report filters (query parameters)

`category`, `vendor`, `employee`, `status`, `purchaseDateFrom`, `purchaseDateTo`, `warrantyFrom`, `warrantyTo`

## Health check

```
GET /api/health
```

## Frontend integration (later)

Replace TanStack Server Functions with Axios calls to `http://localhost:5001/api/...` (or `VITE_API_URL`) — UI unchanged.
