export interface HealthResponseDTO {
  ok: true;
  app: string;
  apiVersion: string;
  database: "up" | "down";
  uptimeSeconds: number;
}
