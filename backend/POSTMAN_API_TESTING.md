# Postman API Testing Guide

## Base URL
```
http://localhost:3000/api/billing
```

---

## 1. Save Bill with Ledger/Bank/Cash Integration

### **POST** `/api/billing/saveBills`

### Test Case 1: Cash Sale
```json
{
  "company_code": "2370",
  "customer": "John Doe",
  "phone": "1234567890",
  "seller": "Sales Person",
  "date": "2024-01-15",
  "subTotal": 1000.00,
  "discount": 0.00,
  "total": 1000.00,
  "paid": 1000.00,
  "change": 0.00,
  "paymentMethod": "cash",
  "notes": "Cash sale",
  "cash_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "123",
      "name": "Samsung Galaxy S21",
      "description": "Latest smartphone",
      "itemCode": "SG-S21-001",
      "category": "Mobile Phones",
      "unit": "pcs",
      "saleQuantity": 1,
      "salePrice": 1000.00,
      "costPrice": 800.00,
      "discount": 0.00,
      "vendor": "Samsung",
      "selectedImei": "",
      "saleBatchNumber": "",
      "saleType": "pieces"
    }
  ]
}
```

### Test Case 2: Credit Sale with Ledger
```json
{
  "company_code": "2370",
  "customer": "Jane Smith",
  "phone": "0987654321",
  "seller": "Sales Person",
  "date": "2024-01-15",
  "subTotal": 5000.00,
  "discount": 0.00,
  "total": 5000.00,
  "paid": 0.00,
  "change": 0.00,
  "paymentMethod": "credit",
  "notes": "Credit sale to customer",
  "ledger_id": "550e8400-e29b-41d4-a716-446655440001",
  "items": [
    {
      "itemId": "124",
      "name": "iPhone 15 Pro",
      "description": "Apple flagship phone",
      "itemCode": "IP-15P-001",
      "category": "Mobile Phones",
      "unit": "pcs",
      "saleQuantity": 1,
      "salePrice": 5000.00,
      "costPrice": 4000.00,
      "discount": 0.00,
      "vendor": "Apple",
      "selectedImei": "",
      "saleBatchNumber": "",
      "saleType": "pieces"
    }
  ]
}
```

### Test Case 3: Bank Transfer Sale
```json
{
  "company_code": "2370",
  "customer": "Mike Johnson",
  "phone": "1122334455",
  "seller": "Sales Person",
  "date": "2024-01-15",
  "subTotal": 3000.00,
  "discount": 100.00,
  "total": 2900.00,
  "paid": 2900.00,
  "change": 0.00,
  "paymentMethod": "bank_transfer",
  "notes": "Bank transfer payment",
  "bank_id": "550e8400-e29b-41d4-a716-446655440002",
  "items": [
    {
      "itemId": "125",
      "name": "MacBook Air M2",
      "description": "Apple laptop",
      "itemCode": "MBA-M2-001",
      "category": "Laptops",
      "unit": "pcs",
      "saleQuantity": 1,
      "salePrice": 3000.00,
      "costPrice": 2500.00,
      "discount": 100.00,
      "vendor": "Apple",
      "selectedImei": "",
      "saleBatchNumber": "",
      "saleType": "pieces"
    }
  ]
}
```

### Test Case 4: Partial Payment with Ledger + Cash
```json
{
  "company_code": "2370",
  "customer": "Sarah Wilson",
  "phone": "5566778899",
  "seller": "Sales Person",
  "date": "2024-01-15",
  "subTotal": 8000.00,
  "discount": 0.00,
  "total": 8000.00,
  "paid": 3000.00,
  "change": 0.00,
  "paymentMethod": "mixed",
  "notes": "Partial payment - cash + credit",
  "ledger_id": "550e8400-e29b-41d4-a716-446655440001",
  "cash_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "126",
      "name": "Dell XPS 13",
      "description": "Premium laptop",
      "itemCode": "DX-13-001",
      "category": "Laptops",
      "unit": "pcs",
      "saleQuantity": 1,
      "salePrice": 8000.00,
      "costPrice": 6000.00,
      "discount": 0.00,
      "vendor": "Dell",
      "selectedImei": "",
      "saleBatchNumber": "",
      "saleType": "pieces"
    }
  ]
}
```

### Test Case 5: Multiple Items Sale
```json
{
  "company_code": "2370",
  "customer": "David Brown",
  "phone": "9988776655",
  "seller": "Sales Person",
  "date": "2024-01-15",
  "subTotal": 1500.00,
  "discount": 50.00,
  "total": 1450.00,
  "paid": 1450.00,
  "change": 0.00,
  "paymentMethod": "cash",
  "notes": "Multiple items purchase",
  "cash_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "127",
      "name": "AirPods Pro",
      "description": "Wireless earbuds",
      "itemCode": "APP-001",
      "category": "Accessories",
      "unit": "pcs",
      "saleQuantity": 1,
      "salePrice": 800.00,
      "costPrice": 600.00,
      "discount": 0.00,
      "vendor": "Apple",
      "selectedImei": "",
      "saleBatchNumber": "",
      "saleType": "pieces"
    },
    {
      "itemId": "128",
      "name": "iPhone Charger",
      "description": "Lightning cable",
      "itemCode": "IC-001",
      "category": "Accessories",
      "unit": "pcs",
      "saleQuantity": 2,
      "salePrice": 350.00,
      "costPrice": 200.00,
      "discount": 50.00,
      "vendor": "Apple",
      "selectedImei": "",
      "saleBatchNumber": "",
      "saleType": "pieces"
    }
  ]
}
```

---

## 2. Get Sale History

### **GET** `/api/billing/sale-history`

### Query Parameters:
- `company_code` (required)
- `startDate` (optional)
- `endDate` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

### Test Case 1: Get All Sales for Company
```
GET /api/billing/sale-history?company_code=2370
```

### Test Case 2: Get Sales with Date Range
```
GET /api/billing/sale-history?company_code=2370&startDate=2024-01-01&endDate=2024-01-31
```

### Test Case 3: Get Sales with Pagination
```
GET /api/billing/sale-history?company_code=2370&page=1&limit=10
```

### Test Case 4: Get Sales with All Filters
```
GET /api/billing/sale-history?company_code=2370&startDate=2024-01-01&endDate=2024-01-31&page=1&limit=20
```

---

## 3. Get Bills by Company

### **GET** `/api/billing/bills-by-company`

### Query Parameters:
- `company_code` (required)
- `startDate` (optional)
- `endDate` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

### Test Case 1: Get All Bills for Company
```
GET /api/billing/bills-by-company?company_code=2370
```

### Test Case 2: Get Bills with Date Range
```
GET /api/billing/bills-by-company?company_code=2370&startDate=2024-01-01&endDate=2024-01-31
```

### Test Case 3: Get Bills with Pagination
```
GET /api/billing/bills-by-company?company_code=2370&page=1&limit=5
```

### Test Case 4: Get Bills with All Filters
```
GET /api/billing/bills-by-company?company_code=2370&startDate=2024-01-01&endDate=2024-01-31&page=2&limit=10
```

---

## 4. Return Sale

### **POST** `/api/billing/return-sale`

### Test Case 1: Full Return
```json
{
  "sale_id": 1,
  "company_code": "2370",
  "return_quantity": 1
}
```

### Test Case 2: Partial Return
```json
{
  "sale_id": 2,
  "company_code": "2370",
  "return_quantity": 2
}
```

### Test Case 3: Return with Different Quantity
```json
{
  "sale_id": 3,
  "company_code": "2370",
  "return_quantity": 1
}
```

---

## 5. Update Bill

### **PUT** `/api/billing/bill/{id}`

### Test Case 1: Update Bill Details
```json
{
  "customer": "Updated Customer Name",
  "phone": "9999999999",
  "notes": "Updated notes",
  "discount": 100.00,
  "total": 4900.00
}
```

---

## 6. Update Sale

### **PUT** `/api/billing/sale/{id}`

### Test Case 1: Update Sale Details
```json
{
  "quantity": 2,
  "sale_price": 1200.00,
  "total_price": 2400.00,
  "discount": 50.00
}
```

---

## 7. Delete Bill

### **DELETE** `/api/billing/bill/{id}`

### Request Body:
```json
{
  "company_code": "2370"
}
```

---

## 8. Delete Sale

### **DELETE** `/api/billing/sale/{id}`

### Request Body:
```json
{
  "company_code": "2370"
}
```

---

## 9. Health Check

### **GET** `/api/billing/health`

No request body needed.

---

## Postman Collection Setup

### Environment Variables:
Create a Postman environment with these variables:

```
base_url: http://localhost:3000/api/billing
company_code: 2370
ledger_id: 550e8400-e29b-41d4-a716-446655440001
bank_id: 550e8400-e29b-41d4-a716-446655440002
cash_id: 550e8400-e29b-41d4-a716-446655440000
```

### Headers for All Requests:
```
Content-Type: application/json
Accept: application/json
```

---

## Expected Responses

### Successful Sale Creation:
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

### Successful Sale History:
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
          "ledger_id": "550e8400-e29b-41d4-a716-446655440001",
          "bank_id": null,
          "cash_id": null,
          "item_id": "123",
          "name": "Samsung Galaxy S21",
          "quantity": 1,
          "sale_price": 1000.00,
          "total_price": 1000.00,
          "paid": 1000.00,
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

### Successful Return Sale:
```json
{
  "response": {
    "status": {
      "statusCode": 200,
      "statusMessage": "Sale returned successfully"
    },
    "data": {
      "sale_id": 1,
      "return_amount": 1000.00,
      "return_quantity": 1,
      "message": "Sale returned successfully. Inventory restored and balances reversed."
    }
  }
}
```

---

## Error Responses

### Missing Company Code:
```json
{
  "response": {
    "status": {
      "statusCode": 400,
      "statusMessage": "Company code is required"
    },
    "data": null
  }
}
```

### Item Not Found:
```json
{
  "response": {
    "status": {
      "statusCode": 400,
      "statusMessage": "Item with ID 999 not found"
    },
    "data": null
  }
}
```

### Insufficient Stock:
```json
{
  "response": {
    "status": {
      "statusCode": 400,
      "statusMessage": "Insufficient stock for item 123. Available: 5, Requested: 10"
    },
    "data": null
  }
}
```

---

## Testing Workflow

### 1. Test Sale Creation
1. Create a cash sale
2. Create a credit sale with ledger
3. Create a bank transfer sale
4. Create a partial payment sale

### 2. Test Sale History
1. Get all sales
2. Filter by date range
3. Test pagination

### 3. Test Bill Management
1. Get bills by company
2. Filter bills by date
3. Test pagination

### 4. Test Return Functionality
1. Return a cash sale
2. Return a credit sale
3. Return a partial payment sale

### 5. Test Error Cases
1. Missing company code
2. Invalid item ID
3. Insufficient stock
4. Invalid sale ID for return

---

## Notes

1. **UUIDs**: Replace the example UUIDs with actual UUIDs from your database
2. **Item IDs**: Use actual item IDs from your inventory
3. **Company Code**: Use your actual company code
4. **Dates**: Use current dates or adjust as needed
5. **Quantities**: Ensure sufficient stock before testing sales
6. **Balances**: Check ledger/bank/cash balances before and after operations

---

## Quick Test Scripts

### Test Cash Sale:
```bash
curl -X POST http://localhost:3000/api/billing/saveBills \
  -H "Content-Type: application/json" \
  -d '{
    "company_code": "2370",
    "customer": "Test Customer",
    "total": 1000.00,
    "paid": 1000.00,
    "cash_id": "your-cash-uuid",
    "items": [{
      "itemId": "123",
      "name": "Test Item",
      "saleQuantity": 1,
      "salePrice": 1000.00
    }]
  }'
```

### Test Return Sale:
```bash
curl -X POST http://localhost:3000/api/billing/return-sale \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": 1,
    "company_code": "2370",
    "return_quantity": 1
  }'
```
