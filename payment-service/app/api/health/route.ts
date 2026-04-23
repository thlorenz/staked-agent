import { jsonOk } from "@/src/server/http";
import type { HealthResponse } from "@/src/server/types";

export function GET(): Response {
  const response: HealthResponse = {
    ok: true,
    service: "payment-service"
  };

  return jsonOk(response);
}
