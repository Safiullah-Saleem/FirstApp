# 🚀 Complete Backend API Documentation

**Base URL:** `http://localhost:8000/api`

---

## 📋 **Table of Contents**
1. [Authentication & Headers](#authentication--headers)
2. [User Management APIs](#user-management-apis)
3. [Employee Management APIs](#employee-management-apis)
4. [Items/Inventory Management APIs](#itemsinventory-management-apis)
5. [Billing Management APIs](#billing-management-apis)
6. [Company Management APIs](#company-management-apis)
7. [Error Handling](#error-handling)
8. [Frontend Integration Examples](#frontend-integration-examples)

---

## 🔐 **Authentication & Headers**

### Headers Required
```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN" // Only for protected routes
}
```

---

## 👥 **User Management APIs**

### 1. **User Registration**
```http
POST /api/users/signup
```

**Request Body (Simple Format):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "password": "password123",
  "company_name": "My Company",
  "address": "123 Main St, City, Country"
}
```

**Request Body (Wrapped Format):**
```json
{
  "request": {
    "data": {
      "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "password": "password123",
        "company_name": "My Company",
        "address": "123 Main St, City, Country"
      }
    }
  }
}
```

### 2. **User Login**
```http
POST /api/users/login
```

**Request Body (Simple Format):**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Request Body (Wrapped Format):**
```json
{
  "data": {
    "user": {
      "email": "john@example.com",
      "password": "password123"
    }
  }
}
```

### 3. **Update User**
```http
POST /api/users/update
```

**Request Body:**
```json
{
  "_id": "john@example.com",
  "user": {
    "name": "John Updated",
    "company_name": "Updated Company",
    "phone": "9876543210",
    "address": "456 New St, City, Country"
  }
}
```

### 4. **Get User by Email**
```http
GET /api/users/{email}
```

### 5. **Get All Users**
```http
GET /api/users
```

---

## 👨‍💼 **Employee Management APIs**

### 1. **Employee Registration**
```http
POST /api/employees/register
```

**Request Body (Simple Format):**
```json
{
  "username": "emp001",
  "company_code": "8888",
  "email": "emp@company.com",
  "password": "employee123"
}
```

### 2. **Employee Login**
```http
POST /api/employees/login
```

**Request Body:**
```json
{
  "_id": "emp001", // employee_code or email
  "password": "employee123" // optional, defaults to "12345678"
}
```

### 3. **Get All Employees**
```http
GET /api/employees
```

### 4. **Get Employee by ID**
```http
GET /api/employees/{employee_code_or_email}
```

---

## 📦 **Items/Inventory Management APIs**

### 1. **Save Item (Create/Update)**
```http
POST /api/items/save
```

**Request Body (Create New Item):**
```json
{
  "company_code": "8888",
  "name": "iPhone 14",
  "description": "Latest iPhone model",
  "price": 999.99,
  "costPrice": 850.00,
  "quantity": 100,
  "barCode": "1234567890123",
  "itemCode": "IPH14",
  "category": "Electronics",
  "unit": "pieces",
  "minquantity": 10,
  "vendor": "Apple Store",
  "status": "Active",
  "expiryDate": "2025-12-31",
  "imgURL": "https://example.com/image.jpg",
  "shop_code": "SHOP001",
  "rack_code": "RACK01",
  "weight": 0.5,
  "weightType": false,
  "box": true,
  "piecesPerBox": 10,
  "pricePerPiece": 99.99,
  "batchNumber": [
    {
      "batchNumber": "BATCH001",
      "quantity": 50,
      "expiryDate": "2025-12-31"
    }
  ],
  "imeiNumbers": ["123456789012345", "234567890123456"]
}
```

**Request Body (Update Existing Item):**
```json
{
  "_id": "item_unique_id",
  "company_code": "8888",
  "name": "Updated Item Name",
  "quantity": 150
}
```

### 2. **Get All Items**
```http
GET /api/items?company_code=8888
```

### 3. **Get Item by ID**
```http
GET /api/items/{item_id}?company_code=8888
```

### 4. **Update Item**
```http
PUT /api/items/update
```

**Request Body:**
```json
{
  "request": {
    "data": {
      "item": {
        "_id": "item_unique_id",
        "company_code": "8888",
        "name": "Updated Name",
        "quantity": 200
      }
    }
  }
}
```

### 5. **Delete Item (Path Parameter)**
```http
DELETE /api/items/{item_id}?company_code=8888
```

### 6. **Delete Item (POST Request)**
```http
POST /api/items/delete
```

**Request Body:**
```json
{
  "request": {
    "data": {
      "item": {
        "_id": "item_unique_id",
        "company_code": "8888"
      }
    }
  }
}
```

### 7. **Get Inventory**
```http
POST /api/items/inventory
```

**Request Body:**
```json
{
  "request": {
    "data": {
      "company_code": "8888"
    }
  }
}
```

---

## 💰 **Billing Management APIs**

### 1. **Save Bill**
```http
POST /api/billing/saveBills
```

**Request Body (Simple Format):**
```json
{
  "company_code": "8888",
  "billNumber": 1001,
  "customer": "John Customer",
  "phone": "1234567890",
  "seller": "Cashier1",
  "date": "2024-01-15",
  "subTotal": 999.98,
  "discount": 50.00,
  "total": 949.98,
  "paid": 1000.00,
  "change": 50.02,
  "paymentMethod": "cash",
  "notes": "No notes",
  "warehouseBill": false,
  "storeBill": true,
  "gst": "GST18%",
  "bankName": "",
  "cheque": "",
  "bankId": "",
  "ledger_id": "",
  "ledger_address": "",
  "discount_type": "price",
  "formallyOutstandings": 0,
  "items": [
    {
      "itemId": "IPH14",
      "name": "iPhone 14",
      "description": "Latest iPhone model",
      "itemCode": "IPH14",
      "category": "Electronics",
      "unit": "pieces",
      "saleQuantity": 1,
      "salePrice": 999.99,
      "costPrice": 850.00,
      "discount": 0,
      "vendor": "Apple Store",
      "selectedImei": "123456789012345",
      "saleBatchNumber": "BATCH001",
      "batchNo": "BATCH001",
      "saleType": "pieces"
    }
  ]
}
```

**Request Body (Wrapped Format):**
```json
{
  "request": {
    "method": "saveBills",
    "data": {
      "bill": {
        "company_code": "8888",
        "items": [...]
      }
    }
  }
}
```

### 2. **Save Sale**
```http
POST /api/billing/saveSale
```

**Request Body (Array Format):**
```json
[
  {
    "company_code": "8888",
    "itemId": "IPH14",
    "name": "iPhone 14",
    "description": "Latest iPhone",
    "itemCode": "IPH14",
    "category": "Electronics",
    "unit": "pieces",
    "quantity": 1,
    "salePrice": 999.99,
    "price": 850.00,
    "totalPrice": 999.99,
    "totalProfit": 149.99,
    "discount": 0,
    "vendor": "Apple Store",
    "selectedImei": "123456789012345",
    "date": "2024-01-15",
    "timestamp": 1642204800,
    "read": "true",
    "minQuantity": 10,
    "imgURL": "https://example.com/image.jpg",
    "paid": 999.99
  }
]
```

**Request Body (Single Object Format):**
```json
{
  "company_code": "8888",
  "itemId": "IPH14",
  "name": "iPhone 14",
  "quantity": 1,
  "salePrice": 999.99
}
```

---

## 🏢 **Company Management APIs**

### 1. **Update Company Settings**
```http
PUT /api/company/update
```

**Request Body:**
```json
{
  "request": {
    "data": {
      "company": {
        "_id": "8888",
        "company_name": "Updated Company Name",
        "address": "Updated Address",
        "terms_conditions": "New terms and conditions",
        "gst_number": "GST123456789",
        "company_logo": "https://example.com/logo.png",
        "bill_stamp": {
          "name": "company-stamp.png",
          "url": "https://example.com/stamp.png"
        },
        "stock_value": "yes",
        "ledger_regions": ["Region1", "Region2"],
        "access": ["Dashboard", "Inventory", "Sales"],
        "features_access": [
          {
            "title": "Dashboard",
            "selected": true,
            "price": 1000
          }
        ]
      }
    }
  }
}
```

### 2. **Get Company Settings (POST)**
```http
POST /api/company/getCompany
```

**Request Body:**
```json
{
  "request": {
    "method": "getCompany",
    "data": {
      "_id": "8888"
    }
  }
}
```

### 3. **Get Company Settings (GET)**
```http
GET /api/company/{companyCode}
```

### 4. **Update Company Password**
```http
PUT /api/company/update-password
```

**Request Body:**
```json
{
  "company_code": "8888",
  "current_password": "old_password",
  "new_password": "new_password"
}
```

---

## ❌ **Error Handling**

### Standard Error Response Format
```json
{
  "response": {
    "status": {
      "statusCode": 400,
      "statusMessage": "Error description"
    },
    "data": null
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (Missing fields)
- `401` - Unauthorized (Invalid credentials)
- `404` - Not Found
- `409` - Conflict (Duplicate data)
- `500` - Internal Server Error

---

## 🌐 **Frontend Integration Examples**

### JavaScript/React Example
```javascript
// API Base Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Example: User Login
const loginUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    const result = await response.json();
    
    if (result.response.status.statusCode === 200) {
      // Store token
      localStorage.setItem('token', result.response.data.token);
      return result.response.data.user;
    } else {
      throw new Error(result.response.status.statusMessage);
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Example: Save Item
const saveItem = async (itemData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(itemData)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Save item error:', error);
    throw error;
  }
};

// Example: Get Inventory
const getInventory = async (companyCode, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/items/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        request: {
          data: {
            company_code: companyCode
          }
        }
      })
    });
    
    const result = await response.json();
    return result.response.data.inventory;
  } catch (error) {
    console.error('Get inventory error:', error);
    throw error;
  }
};
```

### Axios Configuration Example
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📝 **Quick Reference**

### Essential Endpoints for Frontend:
```javascript
const API_ENDPOINTS = {
  // Authentication
  USER_SIGNUP: 'POST /api/users/signup',
  USER_LOGIN: 'POST /api/users/login',
  
  // Inventory Management
  SAVE_ITEM: 'POST /api/items/save',
  GET_INVENTORY: 'POST /api/items/inventory',
  UPDATE_ITEM: 'PUT /api/items/update',
  DELETE_ITEM: 'DELETE /api/items/{id}',
  
  // Billing
  SAVE_BILL: 'POST /api/billing/saveBills',
  SAVE_SALE: 'POST /api/billing/saveSale',
  
  // Company
  UPDATE_COMPANY: 'PUT /api/company/update',
  GET_COMPANY: 'POST /api/company/getCompany',
  
  // Employees
  EMPLOYEE_REGISTER: 'POST /api/employees/register',
  EMPLOYEE_LOGIN: 'POST /api/employees/login'
};
```

---

**🎯 Ready to integrate with your frontend! All endpoints are tested and working properly.**
