# License Integration Architecture & Guide

This document describes the integration between the Invenaro application and the external license service `invenaro-control`.

---

## 1. Architecture Flow Diagram

```
+-----------------------------------------------------------------------------------+
|                                  INVENARO APP                                     |
|                                                                                   |
|  +--------------------+        +-------------------------+                        |
|  |   Frontend (Web)   | -----> |   API Routes / Server   |                        |
|  | - useLicense()     |        | - enforceLicenseState   |                        |
|  | - LicenseBanner    |        | - requireModule(key)    |                        |
|  | - ModuleLockedView |        +------------+------------+                        |
|  +--------------------+                     |                                     |
|                                             v                                     |
|                                +--------------------------+                       |
|                                |      LicenseService      |                       |
|                                +------------+-------------+                       |
|                                             |                                     |
|                      +----------------------+-----------------------+             |
|                      |                                              |             |
|                      v (1. Check Cache)                             v (2. Miss)   |
|          +-----------------------+                    +-----------------------+   |
|          | Database LicenseCache |                    |    invenaro-control   |   |
|          | (Postgres / Prisma)   |                    |    (External API)     |   |
|          +-----------+-----------+                    +-----------+-----------+   |
|                      ^                                            |               |
|                      |             Verify Ed25519                 |               |
|                      +--------------------------------------------+               |
|                                    Store fresh JWT                                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Environment Variables

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `LICENSE_KEY` | String | *Required* | Unique client license key (format: `INV-XXXX-...`). Never expose with `VITE_` prefix. |
| `LICENSE_API_URL` | URL | `https://control.invenaro.com` | Base URL of the control service. |
| `LICENSE_PUBLIC_KEY` | PEM | *Required* | Base64-encoded or raw SPKI PEM for Ed25519 public key. |
| `LICENSE_PUBLIC_JWKS` | JSON | (Optional) | JWKS string containing key rotations indexed by `kid`. |
| `APP_DOMAIN` | String | Request host | Expected domain (e.g. `inventory.company.com`). Used for domain validation. |
| `APP_VERSION` | String | Package version | Semantic application version reported to control service. |
| `CRON_SECRET` | String | *Required* | Shared secret for Vercel Cron (`Authorization: Bearer <CRON_SECRET>`). |
| `LICENSE_OFFLINE_GRACE_DAYS` | Number | `7` | Days to continue running in offline mode if control service is unreachable. |
| `LICENSE_ENFORCEMENT` | `"on" \| "off"` | `"on"` | Disable enforcement for local development ONLY. Ignored in `production`. |

---

## 3. State Machine & Behavior Matrix

The license state machine evaluates token validity, status claim, and network availability to return one of four operational states:

| State | Condition | Write Operations (POST/PUT/DELETE) | Read Operations (GET) | Auth & Password Change | UI Banner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `active` | Valid token, `status === "active"` | Allowed | Allowed | Allowed | None |
| `grace` | Valid token, `status === "grace"` | Allowed | Allowed | Allowed | Yellow warning banner |
| `read_only` | Valid token, `status === "expired"` or `"suspended"` | **Blocked (403)** | Allowed | Allowed | Red warning banner |
| `offline_grace` | Control unreachable, last valid token within `LICENSE_OFFLINE_GRACE_DAYS` | Allowed | Allowed | Allowed | Orange warning banner |
| `unlicensed` | No valid token, bad signature, or offline grace exceeded | **Blocked (403)** | Allowed | Allowed | Red error banner |

> [!IMPORTANT]
> In all states, user login, logout, and password change endpoints are **ALWAYS** accessible. Existing customer data is never deleted or permanently locked away.

---

## 4. Gated Feature Modules

| Module Key | Covered Routes & Features |
| :--- | :--- |
| `multi_godown` | Secondary warehouses, multi-location stock viewing |
| `transfers` | Stock transfers (`/api/transfers/*`) |
| `invoices_returns` | Direct invoices, sales & purchase returns, bills (`/api/invoices/*`) |
| `payments_dues` | Customer dues, supplier payments (`/api/payments/*`) |
| `stock_control` | Stock adjustments, counts, reorder rules (`/api/adjustments/*`) |
| `gst` | GST invoicing, e-Way bills, tax filing reports |
| `ledger_ui` | General ledger and party statements (`/api/ledger/*`) |
| `reports_advanced` | Financial and cohort reports (`/api/reports/advanced/*`) |
| `import_export` | Batch CSV/Excel data import & export |
| `batch_expiry` | Batch numbers, manufacturing and expiry dates |
| `barcode` | Barcode label generation and scanning APIs |
| `ai_data_assistant` | AI data assistant queries |
| `ai_knowledge_assistant` | AI knowledge base queries |

---

## 5. Manual Testing with cURL

### Step 1: Check License Status
```bash
curl -X GET http://localhost:5000/api/license/status \
  -H "Authorization: Bearer <AUTH_TOKEN>"
```

Expected Response:
```json
{
  "state": "active",
  "plan": "business",
  "modules": {
    "multi_godown": true,
    "transfers": true,
    "stock_control": true,
    "ledger_ui": true,
    "invoices_returns": true,
    "reports_advanced": true,
    "gst": false,
    "import_export": false,
    "batch_expiry": false,
    "barcode": false,
    "ai_data_assistant": false,
    "ai_knowledge_assistant": false
  },
  "licenseExpiresAt": "2027-01-01T00:00:00.000Z",
  "graceEndsAt": null,
  "message": "License is active"
}
```

### Step 2: Trigger Daily Cron Refresh
```bash
curl -X GET http://localhost:5000/api/cron/license-refresh \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected Response:
```json
{
  "success": true,
  "state": "active",
  "refreshedAt": "2026-09-21T14:50:00.000Z"
}
```

### Step 3: Test Write Gating when Unlicensed or Read-Only
When a license enters `read_only` or `unlicensed` state:
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Widget"}'
```

Expected Response (HTTP 403):
```json
{
  "error": "license_read_only",
  "message": "Instance is in read_only state. Write operations are disabled."
}
```
