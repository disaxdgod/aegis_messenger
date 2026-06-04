export class HttpError extends Error {
  readonly statusCode: number;
  readonly apiCode?: import("@aegis/shared").ApiErrorCode;
  readonly fields?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    options?: {
      apiCode?: import("@aegis/shared").ApiErrorCode;
      fields?: Record<string, string>;
    },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.apiCode = options?.apiCode;
    this.fields = options?.fields;
    this.name = "HttpError";
  }
}
