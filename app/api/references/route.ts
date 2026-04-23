import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { parseUploadedImage } from "@/lib/storage/image-file";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { ReferenceService } from "@/server/services/reference-service";

const referenceService = new ReferenceService();

export async function GET() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const reference = await referenceService.getLatestReference(userId);
    return ok({ reference });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new Error("Debes enviar una imagen de referencia en el campo 'file'");
    }

    const uploadedFile = await parseUploadedImage(file);
    const result = await referenceService.uploadReference({
      userId,
      file: uploadedFile,
    });

    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
