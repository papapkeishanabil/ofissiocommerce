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

export class SupabaseDatabaseError extends DatabaseQueryError {
  reason:
    | "invalid_key"
    | "invalid_url"
    | "relation_does_not_exist"
    | "permission_denied"
    | "rls_denied"
    | "network_error"
    | "query_error";

  status?: number;

  code?: string;

  table?: string;

  constructor(input: {
    message?: string;
    reason: SupabaseDatabaseError["reason"];
    status?: number;
    code?: string;
    table?: string;
  }) {
    super(input.message ?? "Query Supabase belum dapat diproses.");
    this.name = "SupabaseDatabaseError";
    this.reason = input.reason;
    this.status = input.status;
    this.code = input.code;
    this.table = input.table;
  }
}
