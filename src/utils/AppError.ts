export class AppError extends Error {
  readonly statusCode: number;
  readonly errors?: string[];

  constructor(statusCode: number, message: string, errors?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "AppError";
  }
}
