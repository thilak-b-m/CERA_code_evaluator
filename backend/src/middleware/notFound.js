export function notFoundHandler(request, response, next) {
  const error = new Error(`Route ${request.method} ${request.originalUrl} was not found.`);
  error.statusCode = 404;
  next(error);
}