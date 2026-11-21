export function logDiscovery(message: string, extra?: Record<string, string | number | boolean | null>) {
  if (extra) {
    console.info('[discovery]', message, extra)
    return
  }
  console.info('[discovery]', message)
}
