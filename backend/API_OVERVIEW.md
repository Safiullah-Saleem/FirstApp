## API Overview

Base URL: `http://localhost:8000`

Response contract (all endpoints):

```
{
  "status": { "statusCode": number, "statusMessage": string, "statusDescription": string },
  "data": { ... }
}
```

### Health
- GET `/` – backend info
- GET `/health` – service health

---

## Ledgers
Folder: `src/ledger`

Controller: `ledger.controller.js`
- `getByCompany(req, res)`
- `saveLedger(req, res)`
- `deleteLedger(req, res)`

Routes: mounted at `/api/ledgers`

1) GET `/api/ledgers/getByCompany`
   - Query: `company_code` (required), `ledgerRegions` (repeatable, optional), `next_page_token` (optional)
   - 200 data:
     - `current_page_token`: string
     - `next_page_token`: string
     - `salesTotal`: number
     - `purchasesTotal`: number
     - `ledgers`: Ledger[]

2) POST `/api/ledgers/save`
   - Body:
   ```json
   {
     "method": "saveLedger",
     "data": {
       "ledger": {
         "_id": 1,               // optional for update
         "name": "string",
         "company_code": "string",
         "ledgerType": "customer" | "supplier",
         "address": "string",
         "region": "string",
         "phoneNo": "string",
         "dueDate": "string"
       }
     }
   }
   ```

3) DELETE `/api/ledgers/delete`
   - Body:
   ```json
   {
     "method": "deleteLedger",
     "data": { "ledger_id": 1, "company_code": "string" }
   }
   ```

Model: `ledger.model.js` (table `ledgers`)
- Fields: `id, _rev, name, company_code, ledgerType, address, region, phoneNo, created_at, modified_at, dueDate, saleTotal, purchaseTotal, depositedSalesTotal, depositedPurchaseTotal`
- Indexes: `company_code, ledgerType, region, name`

---

## Transactions
Folder: `src/transaction`

Controller: `transaction.controller.js`
- `addSale(req, res)`
- `addPurchase(req, res)`
- `addPayment(req, res)`
- `addReturn(req, res)`

Routes: mounted at `/api/transactions`

1) POST `/api/transactions/addSale`
   - Body:
   ```json
   {
     "method": "addSaleTransaction",
     "data": {
       "ledger_id": 1,
       "company_code": "string",
       "transaction": {
         "srNum": "string",
         "date": 1731500000,
         "detail": "string",
         "totalAmount": 1000,
         "depositedAmount": 300,
         "billNumber": 101,
         "isReturn": false,
         "invoiceNumber": "INV-001"
       }
     }
   }
   ```

2) POST `/api/transactions/addPurchase`
   - Body:
   ```json
   {
     "method": "addPurchaseTransaction",
     "data": {
       "ledger_id": 1,
       "company_code": "string",
       "transaction": {
         "srNum": "string",
         "date": 1731500000,
         "detail": "string",
         "totalAmount": 5000,
         "depositedAmount": 2000,
         "billNumber": 501,
         "isReturn": false
       }
     }
   }
   ```

3) POST `/api/transactions/addPayment`
   - Body:
   ```json
   {
     "method": "addPayment",
     "data": {
       "ledger_id": 1,
       "company_code": "string",
       "type": "sale",
       "payment": {
         "srNum": "string",
         "date": 1731500000,
         "detail": "string",
         "depositedAmount": 400,
         "applyTo": ["srNum1", "srNum2"]
       }
     }
   }
   ```

4) POST `/api/transactions/addReturn`
   - Body:
   ```json
   {
     "method": "addReturn",
     "data": {
       "ledger_id": 1,
       "company_code": "string",
       "type": "sale",
       "return": {
         "srNum": "Return-...",
         "date": 1731500000,
         "detail": "string",
         "billNumber": 101,
         "totalAmount": 200,
         "originalSrNum": "INV-001-sr"
       }
     }
   }
   ```

Model: `transaction.model.js` (table `transactions`)
- Fields: `id, ledger_id, company_code, srNum, date, detail, totalAmount, depositedAmount, remainingAmount, billNumber, isReturn, type, invoiceNumber, direction, created_at, modified_at`
- Indexes: `company_code, ledger_id, date, direction, srNum (unique)`

Business rules applied in controller:
- Remaining per txn: `remainingAmount = totalAmount - depositedAmount`
- Payment cannot exceed aggregate remaining across targeted invoices
- Return cannot exceed original invoice cumulative amount
- Ledger totals auto recalculated after each mutation (saleTotal, purchaseTotal, depositedSalesTotal, depositedPurchaseTotal)

---

## Items
Folder: `src/items`

Routes (mounted at `/api/items`):
- POST `/api/items/save`
- GET `/api/items/`
- GET `/api/items/inventory`
- POST `/api/items/inventory`
- PUT `/api/items/update`
- POST `/api/items/delete`
- GET `/api/items/:id`
- DELETE `/api/items/:id`

## Billing
Folder: `src/billing`

Routes (mounted at `/api/billing`):
- POST `/api/billing/saveBills`
- POST `/api/billing/saveSale`

## Company
Folder: `src/company`

Routes (mounted at `/api/company`):
- PUT `/api/company/update`
- PUT `/api/company/update-password`
- POST `/api/company/getCompany`
- GET `/api/company/:companyCode`

## Employees
Folder: `src/employees`

Routes (mounted at `/api/employees`):
- POST `/api/employees/register`
- POST `/api/employees/login`
- GET `/api/employees/`
- GET `/api/employees/:id`

## Users
Folder: `src/user`

Routes (mounted at `/api/users`):
- POST `/api/users/signup`
- POST `/api/users/login`
- POST `/api/users/update`
- GET `/api/users/:email`
- GET `/api/users/`


