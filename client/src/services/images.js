const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function imageUrl(value) {
  if (!value)
    return "";

  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://"))
    return value;

  if (value.startsWith("/"))
    return `${BASE_URL}${value}`;

  return value;
}
