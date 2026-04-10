import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function getUserFromToken() {
  try {
    const cookieStore = await cookies(); // ✅ MUST await
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return decoded;
  } catch {
    return null;
  }
}
