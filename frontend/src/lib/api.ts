// Central API base URL configuration
// In production (Vercel), VITE_API_URL points to the Render backend
// In development, it falls back to empty string (relative paths work with proxy)
export const API_BASE: string = (import.meta.env.VITE_API_URL as string) || "";

if (!API_BASE && import.meta.env.PROD) {
  console.error("ERROR: VITE_API_URL is not defined in production!");
}

if (API_BASE) {
  console.log("API BASE URL:", API_BASE);
}
