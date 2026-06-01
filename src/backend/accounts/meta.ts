export async function getBackendMeta(_backendUrl?: string | null): Promise<{
  name: string;
  version: string;
  featureFlags?: Record<string, boolean>;
}> {
  return {
    name: "Cineflix Local",
    version: "0.0.0",
    featureFlags: {},
  };
}
