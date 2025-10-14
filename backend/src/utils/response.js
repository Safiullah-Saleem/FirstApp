// Minimal standardized API response helpers

function ok(data = {}) {
  return {
    status: { statusCode: 200, statusMessage: "OK", statusDescription: "" },
    data,
  };
}

function badRequest(message) {
  return {
    status: { statusCode: 400, statusMessage: "Bad Request", statusDescription: message },
    data: {},
  };
}

function notFound(message) {
  return {
    status: { statusCode: 404, statusMessage: "Not Found", statusDescription: message },
    data: {},
  };
}

function serverError(message) {
  return {
    status: { statusCode: 500, statusMessage: "Internal Server Error", statusDescription: message },
    data: {},
  };
}

module.exports = { ok, badRequest, notFound, serverError };


