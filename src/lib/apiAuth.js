import { verifyToken } from "./jwt";

export function getAuthUser(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  return payload ? (payload.user || payload) : null;
}
