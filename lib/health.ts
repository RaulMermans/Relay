export type HealthResponse = {
  status: "ok";
  service: "relay";
};

export function createHealthResponse(): HealthResponse {
  return {
    status: "ok",
    service: "relay",
  };
}
