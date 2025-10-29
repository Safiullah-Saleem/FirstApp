const validateItem = (req, res, next) => {
  const { name, company_code, price, quantity } = req.body;

  if (!name || !company_code) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Item name and company code are required",
        },
        data: null,
      },
    });
  }

  if (price && price < 0) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Price cannot be negative",
        },
        data: null,
      },
    });
  }

  if (quantity && quantity < 0) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Quantity cannot be negative",
        },
        data: null,
      },
    });
  }

  next();
};

module.exports = {
  validateItem,
};
