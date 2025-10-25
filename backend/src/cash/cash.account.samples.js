/**
 * Cash Account Management - Sample API Calls
 * CommonJS format for testing cash account operations
 *
 * These samples demonstrate how to:
 * 1. Create cash accounts with proper balances
 * 2. Update cash account balances
 * 3. Test the functionality
 */

const axios = require('axios');

// Sample data as requested
const sampleData = {
  company_code: "4530",
  cashName: "Main Cash",
  alternativeCashName: "Petty Cash",
  balance: 10000,
  alternativeBalance: 5000,
  description: "Primary cash account"
};

/**
 * Sample API call to create a cash account with balance
 * Method: createCashAccountWithBalance
 */
const createMainCashAccount = {
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'createCashAccountWithBalance',
      data: {
        company_code: sampleData.company_code,
        cashName: sampleData.cashName,
        balance: sampleData.balance,
        description: sampleData.description
      }
    }
  }
};

/**
 * Sample API call to create petty cash account
 * Method: createCashAccountWithBalance
 */
const createPettyCashAccount = {
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'createCashAccountWithBalance',
      data: {
        company_code: sampleData.company_code,
        cashName: sampleData.alternativeCashName,
        balance: sampleData.alternativeBalance,
        description: "Petty cash for small expenses"
      }
    }
  }
};

/**
 * Sample API call to update cash account balance
 * Method: setCashAccountBalance
 * Note: You'll need to get the _id from the create response first
 */
const updateCashBalance = (cashAccountId) => ({
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'setCashAccountBalance',
      data: {
        _id: cashAccountId,
        balance: 15000, // New balance amount
        description: "Updated balance after deposit"
      }
    }
  }
});

/**
 * Sample API call to get cash account by company
 * Method: getCashByCompany
 */
const getCashByCompany = {
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'getCashByCompany',
      data: {
        company_code: sampleData.company_code
      }
    }
  }
};

/**
 * Sample API call to get cash in hand and bank accounts
 * Method: getCashInHandBankByCompany
 */
const getCashInHandAndBanks = {
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'getCashInHandBankByCompany',
      data: {
        company_code: sampleData.company_code
      }
    }
  }
};

/**
 * Function to execute sample API calls
 * Uncomment the calls you want to test
 */
const testCashAccountAPIs = async () => {
  try {
    console.log('Testing Cash Account APIs...\n');

    // Test 1: Create main cash account
    console.log('1. Creating main cash account...');
    const mainCashResponse = await axios(createMainCashAccount);
    console.log('Response:', JSON.stringify(mainCashResponse.data, null, 2));

    if (mainCashResponse.data.response.success) {
      const cashAccountId = mainCashResponse.data.response.data.cashAccount._id;

      // Test 2: Update cash balance
      console.log('\n2. Updating cash balance...');
      const updateResponse = await axios(updateCashBalance(cashAccountId));
      console.log('Response:', JSON.stringify(updateResponse.data, null, 2));

      // Test 3: Get cash by company
      console.log('\n3. Getting cash by company...');
      const getCashResponse = await axios(getCashByCompany);
      console.log('Response:', JSON.stringify(getCashResponse.data, null, 2));

      // Test 4: Get cash in hand and banks
      console.log('\n4. Getting cash in hand and bank accounts...');
      const summaryResponse = await axios(getCashInHandAndBanks);
      console.log('Response:', JSON.stringify(summaryResponse.data, null, 2));
    }

  } catch (error) {
    console.error('Error testing APIs:', error.response ? error.response.data : error.message);
  }
};

/**
 * Alternative method using the existing saveCash method
 * for creating cash accounts with balance
 */
const createCashUsingExistingMethod = {
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'saveCash',
      data: {
        company_code: sampleData.company_code,
        cashName: sampleData.cashName,
        balance: sampleData.balance,
        description: sampleData.description
      }
    }
  }
};

/**
 * Alternative method using updateCashBalance for adding/subtracting
 * from existing cash balance
 */
const addToCashBalance = (cashAccountId, amount) => ({
  url: 'http://localhost:8000/api/cash',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    request: {
      method: 'updateCashBalance',
      data: {
        _id: cashAccountId,
        amount: amount,
        type: 'add', // 'add' or 'subtract'
        description: `Added ${amount} to cash balance`
      }
    }
  }
});

/**
 * Function to test alternative methods
 */
const testAlternativeMethods = async () => {
  try {
    console.log('Testing Alternative Methods...\n');

    // Create cash account using existing method
    console.log('1. Creating cash account using saveCash method...');
    const createResponse = await axios(createCashUsingExistingMethod);
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));

    if (createResponse.data.response.success) {
      const cashAccountId = createResponse.data.response.data.cash;

      // Add to balance using existing method
      console.log('\n2. Adding to cash balance using updateCashBalance method...');
      const addResponse = await axios(addToCashBalance(cashAccountId, 2500));
      console.log('Response:', JSON.stringify(addResponse.data, null, 2));
    }

  } catch (error) {
    console.error('Error testing alternative methods:', error.response ? error.response.data : error.message);
  }
};

// Export samples for use in other files
module.exports = {
  sampleData,
  createMainCashAccount,
  createPettyCashAccount,
  updateCashBalance,
  getCashByCompany,
  getCashInHandAndBanks,
  createCashUsingExistingMethod,
  addToCashBalance,
  testCashAccountAPIs,
  testAlternativeMethods
};

// Uncomment to run tests
// testCashAccountAPIs().then(() => console.log('Test completed'));
// testAlternativeMethods().then(() => console.log('Alternative test completed'));
