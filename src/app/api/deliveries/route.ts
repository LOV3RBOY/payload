import { createDelivery, errorResponse } from "@/lib/http";

export async function POST(request: Request) {
  try {
    return await createDelivery(request);
  } catch (error) {
    return errorResponse(error);
  }
}
