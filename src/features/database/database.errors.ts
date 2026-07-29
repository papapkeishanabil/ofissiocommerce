export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor(message = "Database belum tersedia.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}
