// Access token stored in memory (NOT localStorage) to prevent XSS exposure
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAuth(): void {
  accessToken = null;
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}
