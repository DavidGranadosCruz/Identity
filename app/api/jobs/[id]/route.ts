import { fail, ok } from "@/app/api/_utils";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { JobService } from "@/server/services/job-service";

const jobService = new JobService();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentUserIdOrThrow();
    const { id } = await params;

    const job = await jobService.getJob(id);
    if (!job) {
      return ok({ job: null }, 404);
    }

    return ok({ job });
  } catch (error) {
    return fail(error);
  }
}