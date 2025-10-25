# Sales & Billing Integration Guide

## Overview
This document describes the comprehensive sales and billing system with integrated ledger, bank, and cash account management. The system tracks sales, updates balances, and handles returns with automatic balance reversals.

---

## Features

### 1. **Bill Creation with Ledger/Bank/Cash Integration**
When a bill is saved, you can select:
- A **ledger account** (for tracking customer credits)
- A **bank account** (for tracking deposits)
- A **cash account** (for cash sales)

The system automatically:
- Creates a new sale entry (not update existing)
- Updates the selected ledger/bank/cash balance
- Reduces inventory quantity

### 2. **Sale History**
Get sale history filtered by:
- Company code
- Date range
- Pagination support

### 3. **Bill Management**
- Get bills by company code
- Filter by date range
- Pagination support
- Includes associated sale items

### 4. **Return Sale**
When a sale is returned:
- **Increases** item quantity in inventory
- **Reverses** ledger balance (subtracts from total sales)
- **Reverses** bank balance (subtracts from balance)
- **Reverses** cash balance (subtracts from balance)

---

## API Endpoints

### 1. Save Bill
**POST** `/api/billing/saveBills`

**Request Body:**
```json
{
  "company_code": "2370",
  "customer": "John Doe",
  "date": "2024-01-15",
  "total": 500.00,
  "paid": 500.00,
  "ledger_id": "uuid-of-ledger",     // Optional
  "bank_id": "uuid-of-bank",          // Optional
  "cash_id": "uuid-of-cash",          // Optional
  "items": [
    {
      "itemId": "123",
      "name": "Mobile Phone",
      "saleQuantity": 1,
      "salePrice": 500.00,
      "costPrice": 400.00
    }
  ]
}
```

**What happens:**
1. Creates a bill record
2. Creates sale record(s) with `ledger_id`, `bank_id`, `cash_id`
3. Updates ledger balance: `currentBalance += (total_price - paid)`
4. Updates bank/cash balance: `balance += paid`
5. Reduces inventory quantity

**Response:**
```json
{
  "response": {
    "status": {
      "statusCode": 200,
      "statusMessage": "Bill saved successfully"
    },
    "data": {
      "billId": 123,
      "billNumber": 456,
      "message": "Bill and inventory updated successfully"
    }
  }
}
```

---

### 2. Get Sale History
**GET** `/api/billing/sale-history?company_code=2370&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=50`

**Query Parameters:**
- `company_code` (required): Company code
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page

**Response:**
```json
{
  "response": {
    "status": {
      "statusCode": 200,
      "statusMessage": "Sale history retrieved successfully"
    },
    "data": {
      "count": 150,
      "rows": [
        {
          "id": 1,
          "bill_id": 123,
          "company_code": "2370",
          "ledger_id": "uuid",
          "bank_id": "uuid",
          "cash_id": "uuid",
          "item_id": "123",
          "name": "Mobile Phone",
          "quantity": 1,
          "sale_price": 500.00,
          "total_price": 500.00,
          "paid": 500.00,
          "date": "2024-01-15",
          "bill": {
            "id": 123,
            "bill_number": 456,
            "customer": "John Doe"
          }
        }
      ]
    }
  }
}
```

---

### 3. Get Bills by Company
**GET** `/api/billing/bills-by-company?company_code=2370&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=50`

**Query Parameters:**
- `company_code` (required): Company code
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Items per page

**Response:**
```json
{
  "response": {
    "status": {
      "statusCode": 200,
      "statusMessage": "Bills retrieved successfully"
    },
    "data": {
      "bills": [
        {
          "id": 123,
          "company_code": "2370",
          "bill_number": 456,
          "customer": "John Doe",
          "total": 500.00,
          "paid": 500.00,
          "date": "2024-01-15",
          "sales": [
            {
              "id": 1,
              "name": "Mobile Phone",
              "quantity": 1,
              "sale_price": 500.00,
              "total_price": 500.00
            }
          ]
        }
      ],
      "pagination": {
        "total": 150,
        "page": 1,
        "limit": 50,
        "totalPages": 3
      }
    }
  }
}
```

---

### 4. Return Sale
**POST** `/api/billing/return-sale`

**Request Body:**
```json
{
  "sale_id": 1,
  "company_code": "2370",
  "return_quantity": 1
}
```

**What happens:**
1. Increases inventory quantity
2. Reverses ledger balance (subtracts from total sales)
3. Reverses bank balance (subtracts from balance)
4. Reverses cash balance (subtracts from balance)

**Response:**
```json
{
  "response": {
    "status": {
      "statusCode": 200,
      "statusMessage": "Sale returned successfully"
    },
    "data": {
      "sale_id": 1,
      "return_amount": 500.00,
      "return_quantity": 1,
      "message": "Sale returned successfully. Inventory restored and balances reversed."
    }
  }
}
```

---

## Database Models

### Sale Model
```javascript
{
  id: INTEGER (Primary Key),
  bill_id: INTEGER (Foreign Key to bills),
  company_code: STRING,
  
  // Integration fields
  ledger_id: UUID,
  bank_id: UUID,
  cash_id: UUID,
  
  item_id: STRING,
  name: STRING,
  quantity: INTEGER,
  sale_price: DECIMAL(12,2),
  cost_price: DECIMAL(12,2),
  total_price: DECIMAL(12,2),
  paid: DECIMAL(12,2),
  date: DATE,
  
  created_at: BIGINT,
  modified_at: BIGINT
}
```

### Ledger Account Model
```javascript
{
  _id: UUID (Primary Key),
  company_code: STRING,
  name: STRING,
  
  // Balance fields
  openingBalance: DECIMAL(15,2),
  currentBalance: DECIMAL(15,2),
  saleTotal: DECIMAL(15,2),
  depositedSalesTotal: DECIMAL(15,2),
  purchasesTotal: DECIMAL(15,2),
  depositedPurchasesTotal: DECIMAL(15,2),
  
  created_at: BIGINT,
  modified_at: BIGINT
}
```

### Bank Account Model
```javascript
{
  _id: UUID (Primary Key),
  company_code: STRING,
  bankName: STRING,
  balance: DECIMAL(15,2),
  created_at: BIGINT,
  modified_at: BIGINT
}
```

### Cash Account Model
```javascript
{
  _id: UUID (Primary Key),
  company_code: STRING,
  cashName: STRING,
  balance: DECIMAL(15,2),
  created_at: BIGINT,
  modified_at: BIGINT
}
```

---

## Important Concepts

### 1. **Sale Creates New Entry (Not Updates)**
When you save a bill, a **new** sale entry is created. The system does **not** update existing sales.

### 2. **Balance Updates are Additive**
- When a sale is made:
  - Ledger: `currentBalance += (total_price - paid)`
  - Bank/Cash: `balance += paid`
  
- When a sale is returned:
  - Ledger: `currentBalance -= return_amount`
  - Bank/Cash: `balance -= return_amount`

### 3. **Inventory is Reduced on Sale, Restored on Return**
- Sale: `item.quantity -= sale_quantity`
- Return: `item.quantity += return_quantity`

### 4. **Ledger Balance Calculation**
```
currentBalance = openingBalance + (all sales - all payments) - (all purchases - all payments)
```

---

## Use Cases

### Use Case 1: Cash Sale
```json
{
  "company_code": "2370",
  "total": 1000.00,
  "paid": 1000.00,
  "cash_id": "uuid-of-cash-account",
  "items": [...]
}
```
**Result:**
- Cash balance increased by 1000.00
- Inventory reduced
- No ledger entry (cash sale)

### Use Case 2: Bank Transfer Sale
```json
{
  "company_code": "2370",
  "total": 5000.00,
  "paid": 5000.00,
  "bank_id": "uuid-of-bank-account",
  "items": [...]
}
```
**Result:**
- Bank balance increased by 5000.00
- Inventory reduced
- No ledger entry (full payment)

### Use Case 3: Credit Sale with Ledger
```json
{
  "company_code": "2370",
  "total": 3000.00,
  "paid": 0.00,
  "ledger_id": "uuid-of-customer-ledger",
  "items": [...]
}
```
**Result:**
- Ledger `currentBalance` increased by 3000.00
- Ledger `saleTotal` increased by 3000.00
- Inventory reduced
- No cash/bank entry (credit sale)

### Use Case 4: Partial Payment Sale
```json
{
  "company_code": "2370",
  "total": 5000.00,
  "paid": 2000.00,
  "ledger_id": "uuid-of-customer-ledger",
  "cash_id": "uuid-of-cash-account",
  "items": [...]
}
```
**Result:**
- Cash balance increased by 2000.00
- Ledger `currentBalance` increased by 3000.00 (5000 - 2000)
- Ledger `saleTotal` increased by 5000.00
- Ledger `depositedSalesTotal` increased by 2000.00
- Inventory reduced

### Use Case 5: Return Sale
```json
{
  "sale_id": 123,
  "company_code": "2370",
  "return_quantity": 1
}
```
**Result:**
- Inventory increased by 1
- If ledger was used: balance decreased
- If bank was used: balance decreased
- If cash was used: balance decreased

---

## Error Handling

### Common Errors

1. **Item Not Found**
```json
{
  "statusCode": 400,
  "statusMessage": "Item with ID 123 not found"
}
```

2. **Insufficient Stock**
```json
{
  "statusCode": 400,
  "statusMessage": "Insufficient stock for item 123. Available: 5, Requested: 10"
}
```

3. **Company Code Missing**
```json
{
  "statusCode": 400,
  "statusMessage": "Company code is required"
}
```

---

## Testing

### Test Sale with Ledger
```bash
curl -X POST http://localhost:3000/api/billing/saveBills \
  -H "Content-Type: application/json" \
  -d '{
    "company_code": "2370",
    "customer": "Test Customer",
    "total": 1000.00,
    "paid": 0.00,
    "ledger_id": "uuid-here",
    "items": [
      {
        "itemId": "123",
        "name": "Test Item",
        "saleQuantity": 1,
        "salePrice": 1000.00
      }
    ]
  }'
```

### Test Return Sale
```bash
curl -X POST http://localhost:3000/api/billing/return-sale \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": 1,
    "company_code": "2370",
    "return_quantity": 1
  }'
```

---

## Notes

1. All balance updates are done through model hooks (`afterCreate`, `afterUpdate`)
2. Ledger, bank, and cash account models use `_id` as primary key (UUID)
3. Sale model uses `id` as primary key (INTEGER)
4. All transactions use database transactions for data consistency
5. Returns reverse all balance changes made during sale creation
