export default class HttpError extends Error {
  constructor(statusCode, message, fields) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    if (fields) {
      this.fields = fields;
    }
  }
}
