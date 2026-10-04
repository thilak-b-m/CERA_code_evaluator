export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error.' : error.message,
  });
}