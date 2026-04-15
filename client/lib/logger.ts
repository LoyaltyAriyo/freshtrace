export function logInfo(message: string) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

export function logError(error: unknown) {
  console.error(
    `[ERROR] ${new Date().toISOString()} -`,
    error
  );
}