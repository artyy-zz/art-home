import { createWorkerAction } from "@/actions/admin";
import { CreateActionForm, CreateFormPanel } from "@/components/admin/create-form-panel";
import { WorkerHoursBoard } from "@/components/admin/worker-hours-board";
import { Card } from "@/components/shared/card";
import type { Locale } from "@/lib/i18n";
import { can, getUserPermissionMatrix, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const inputClassName =
  "rounded-2xl border border-black/10 bg-white/92 px-4 py-3 text-sm text-[var(--color-foreground)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[rgba(150,114,79,0.14)]";

export default async function WorkerHoursPage({
  params,
}: PageProps<"/[locale]/admin/worker-hours">) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const user = await requirePermission(typedLocale, "WORKER_HOURS", "VIEW");
  const permissions = await getUserPermissionMatrix(user);
  const canCreate = can(permissions, "WORKER_HOURS", "CREATE");
  const canEdit = can(permissions, "WORKER_HOURS", "EDIT");
  const canDelete = can(permissions, "WORKER_HOURS", "DELETE");

  const workers = await prisma.worker.findMany({
    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
    include: {
      entries: {
        orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      },
      advances: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  return (
    <div className="space-y-6">
      {canCreate ? (
        <CreateFormPanel
          title={typedLocale === "sq" ? "Shto Punëtor" : "Add Worker"}
          buttonLabel={typedLocale === "sq" ? "Shto Punëtor" : "Add Worker"}
          cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
        >
          <CreateActionForm
            action={createWorkerAction.bind(null, typedLocale)}
            className="grid gap-4 md:grid-cols-2"
            submitLabel={typedLocale === "sq" ? "Ruaj" : "Save"}
            cancelLabel={typedLocale === "sq" ? "Anulo" : "Cancel"}
            errorMessage={typedLocale === "sq" ? "Punetori nuk u ruajt." : "Worker could not be saved."}
            footerClassName="md:col-span-2"
          >
            <input
              name="name"
              required
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Emri" : "Name"}
            />
            <input
              name="role"
              required
              className={inputClassName}
              placeholder={typedLocale === "sq" ? "Roli" : "Role"}
            />
          </CreateActionForm>
        </CreateFormPanel>
      ) : null}

      <Card className="rounded-[28px] p-6">
        <div className="mb-5">
          <h2 className="font-display text-3xl leading-none text-[var(--color-foreground)]">
            {typedLocale === "sq" ? "Orët e Punëtorëve" : "Worker Hours"}
          </h2>
        </div>
        <WorkerHoursBoard
          locale={typedLocale}
          workers={workers.map((worker) => ({
            id: worker.id,
            name: worker.name,
            role: worker.role,
            entries: worker.entries.map((entry) => ({
              id: entry.id,
              startedAt: entry.startedAt.toISOString(),
              finishedAt: entry.finishedAt.toISOString(),
            })),
            advances: worker.advances.map((advance) => ({
              id: advance.id,
              date: advance.date.toISOString(),
              amountCents: advance.amountCents,
            })),
          }))}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Card>
    </div>
  );
}
