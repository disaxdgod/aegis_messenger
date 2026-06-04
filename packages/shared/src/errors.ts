/** Коды ошибок REST API для единообразной обработки на клиенте. */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "RATE_LIMIT"
  | "INTERNAL";

export interface ApiErrorDTO {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Ошибки по полям (формы входа и т.д.). */
    fields?: Record<string, string>;
  };
}
