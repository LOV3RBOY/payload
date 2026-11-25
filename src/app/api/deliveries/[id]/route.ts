import { errorResponse, readDelivery } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return await readDelivery(id);
  } catch (error) {
    return errorResponse(error);
  }
}
