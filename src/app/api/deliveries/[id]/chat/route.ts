import { chatWithDelivery, errorResponse } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return await chatWithDelivery(request, id);
  } catch (error) {
    return errorResponse(error);
  }
}
