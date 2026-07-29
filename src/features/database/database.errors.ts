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

export class DatabaseQueryError extends Error {
  constructor(message = "Query database belum dapat diproses.") {
    super(message);
    this.name = "DatabaseQueryError";
  }
}
