import axios from "axios";

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
});

export const api = {
  get:    <T>(url: string)                   => http.get<T>(url).then((r) => r.data),
  post:   <T>(url: string, data?: unknown)   => http.post<T>(url, data).then((r) => r.data),
  delete: <T>(url: string, data?: unknown)   => http.delete<T>(url, { data }).then((r) => r.data),
};
