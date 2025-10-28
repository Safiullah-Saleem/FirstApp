const validateItem = (req, res, next) => {
  let itemData;
  
  // Extract item data based on different request formats
  if (req.body.request && req.body.request.data && req.body.request.data.item) {
    itemData = req.body.request.data.item;
  } else if (req.body.data && req.body.data.item) {
    itemData = req.body.data.item;
  } else if (req.body.item) {
    itemData = req.body.item;
  } else {
    itemData = req.body;
  }

  const { name, company_code, price, quantity } = itemData;

  // Basic validation
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

  // ========== ENHANCED VALIDATION FOR TRACKING TYPES ==========

  // Box Tracking Validation
  if (itemData.enableBoxTracking) {
    if (itemData.box === true) {
      if (!itemData.piecesPerBox || itemData.piecesPerBox <= 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Pieces per box is required and must be greater than 0 when box tracking is enabled",
            },
            data: null,
          },
        });
      }
      
      if (!itemData.totalBoxes || itemData.totalBoxes < 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: "Total boxes is required and cannot be negative when box tracking is enabled",
            },
            data: null,
          },
        });
      }
    }
  }

  // Batch Tracking Validation
  if (itemData.enableBatchTracking && Array.isArray(itemData.batchNumber)) {
    if (itemData.batchNumber.length === 0) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "At least one batch is required when batch tracking is enabled",
          },
          data: null,
        },
      });
    }

    for (let i = 0; i < itemData.batchNumber.length; i++) {
      const batch = itemData.batchNumber[i];
      
      if (!batch.batchNumber) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Batch number is required for batch ${i + 1}`,
            },
            data: null,
          },
        });
      }

      if (!batch.quantity && batch.quantity !== 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Quantity is required for batch ${batch.batchNumber}`,
            },
            data: null,
          },
        });
      }

      if (batch.quantity < 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Quantity cannot be negative for batch ${batch.batchNumber}`,
            },
            data: null,
          },
        });
      }

      // Validate batch expiry date if provided
      if (batch.expiryDate) {
        const expiryDate = new Date(batch.expiryDate);
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({
            response: {
              status: {
                statusCode: 400,
                statusMessage: `Invalid expiry date for batch ${batch.batchNumber}`,
              },
              data: null,
            },
          });
        }
      }
    }
  }

  // IMEI Tracking Validation
  if (itemData.enableImeiTracking && Array.isArray(itemData.imeiNumbers)) {
    if (itemData.imeiNumbers.length === 0) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "At least one IMEI number is required when IMEI tracking is enabled",
          },
          data: null,
        },
      });
    }

    // Validate IMEI format (basic validation)
    const invalidImeis = itemData.imeiNumbers.filter(imei => {
      if (typeof imei !== 'string') return true;
      // Basic IMEI validation: 15-17 digits
      return !/^\d{15,17}$/.test(imei.replace(/\s/g, ''));
    });

    if (invalidImeis.length > 0) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: `Invalid IMEI format: ${invalidImeis.slice(0, 3).join(', ')}`,
          },
          data: null,
        },
      });
    }

    // Check for duplicate IMEIs
    const uniqueImeis = new Set(itemData.imeiNumbers);
    if (uniqueImeis.size !== itemData.imeiNumbers.length) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "Duplicate IMEI numbers are not allowed",
          },
          data: null,
        },
      });
    }
  }

  // Size Tracking Validation
  if (itemData.enableSizeTracking && Array.isArray(itemData.sizeVariants)) {
    if (itemData.sizeVariants.length === 0) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: "At least one size variant is required when size tracking is enabled",
          },
          data: null,
        },
      });
    }

    const seenSizes = new Set();
    
    for (let i = 0; i < itemData.sizeVariants.length; i++) {
      const variant = itemData.sizeVariants[i];
      
      if (!variant.size) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Size is required for variant ${i + 1}`,
            },
            data: null,
          },
        });
      }

      // Check for duplicate sizes
      if (seenSizes.has(variant.size)) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Duplicate size '${variant.size}' found in variants`,
            },
            data: null,
          },
        });
      }
      seenSizes.add(variant.size);

      if (!variant.quantity && variant.quantity !== 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Quantity is required for size ${variant.size}`,
            },
            data: null,
          },
        });
      }

      if (variant.quantity < 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Quantity cannot be negative for size ${variant.size}`,
            },
            data: null,
          },
        });
      }

      if (variant.price && variant.price < 0) {
        return res.status(400).json({
          response: {
            status: {
              statusCode: 400,
              statusMessage: `Price cannot be negative for size ${variant.size}`,
            },
            data: null,
          },
        });
      }
    }
  }

  // ========== CONFLICT VALIDATION ==========

  // Check for conflicting tracking types
  const enabledTrackings = [
    itemData.enableBoxTracking && 'Box',
    itemData.enableBatchTracking && 'Batch',
    itemData.enableImeiTracking && 'IMEI',
    itemData.enableSizeTracking && 'Size'
  ].filter(Boolean);

  if (enabledTrackings.length > 2) {
    console.warn(`Multiple tracking types enabled: ${enabledTrackings.join(', ')}`);
    // Allow multiple tracking types but log warning
  }

  // IMEI tracking should not be combined with quantity-based tracking for accurate counting
  if (itemData.enableImeiTracking && (itemData.enableBoxTracking || itemData.enableBatchTracking)) {
    console.warn("IMEI tracking combined with quantity-based tracking may cause inconsistencies");
  }

  next();
};

// Special validation for process-sale endpoint
const validateSale = (req, res, next) => {
  const { itemId, companyCode, quantity } = req.body;

  if (!itemId || !companyCode || !quantity) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Item ID, company code, and quantity are required",
        },
        data: null,
      },
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Sale quantity must be greater than 0",
        },
        data: null,
      },
    });
  }

  // Validate IMEI numbers if provided
  if (req.body.imeiNumbers && Array.isArray(req.body.imeiNumbers)) {
    if (req.body.imeiNumbers.length !== quantity) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: `Number of IMEI numbers (${req.body.imeiNumbers.length}) must match sale quantity (${quantity})`,
          },
          data: null,
        },
      });
    }

    const invalidImeis = req.body.imeiNumbers.filter(imei => !/^\d{15,17}$/.test(imei.replace(/\s/g, '')));
    if (invalidImeis.length > 0) {
      return res.status(400).json({
        response: {
          status: {
            statusCode: 400,
            statusMessage: `Invalid IMEI format: ${invalidImeis.slice(0, 3).join(', ')}`,
          },
          data: null,
        },
      });
    }
  }

  next();
};

// Validation for batch operations
const validateBatch = (req, res, next) => {
  const { itemId, companyCode, batchData } = req.body;

  if (!itemId || !companyCode || !batchData) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Item ID, company code, and batch data are required",
        },
        data: null,
      },
    });
  }

  if (!batchData.batchNumber || !batchData.quantity) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Batch number and quantity are required in batch data",
        },
        data: null,
      },
    });
  }

  if (batchData.quantity < 0) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Batch quantity cannot be negative",
        },
        data: null,
      },
    });
  }

  next();
};

// Validation for IMEI operations
const validateImei = (req, res, next) => {
  const { itemId, companyCode, imeiNumbers } = req.body;

  if (!itemId || !companyCode || !imeiNumbers || !Array.isArray(imeiNumbers)) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "Item ID, company code, and IMEI numbers array are required",
        },
        data: null,
      },
    });
  }

  if (imeiNumbers.length === 0) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: "At least one IMEI number is required",
        },
        data: null,
      },
    });
  }

  const invalidImeis = imeiNumbers.filter(imei => !/^\d{15,17}$/.test(imei.replace(/\s/g, '')));
  if (invalidImeis.length > 0) {
    return res.status(400).json({
      response: {
        status: {
          statusCode: 400,
          statusMessage: `Invalid IMEI format: ${invalidImeis.slice(0, 3).join(', ')}`,
        },
        data: null,
      },
    });
  }

  next();
};

module.exports = {
  validateItem,
  validateSale,
  validateBatch,
  validateImei
};