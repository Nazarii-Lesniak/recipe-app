"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/core/i18n/navigation";
import type { ModerationQueueItem } from "@/features/moderation/server/moderation-service";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/shared/ui";

export function AdminModerationView({
  initialQueue,
  isAdmin,
}: {
  initialQueue: ModerationQueueItem[];
  isAdmin: boolean;
}) {
  const t = useTranslations("moderation");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();

  const [hideTarget, setHideTarget] = useState<ModerationQueueItem | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [hardDeleteTarget, setHardDeleteTarget] = useState<ModerationQueueItem | null>(null);

  const { data: queueData } = useQuery<{ items: ModerationQueueItem[] }>({
    queryKey: ["moderation-queue"],
    initialData: { items: initialQueue },
    queryFn: async () => {
      const res = await fetch("/api/v1/moderation/queue");
      if (!res.ok) return { items: [] };
      return (await res.json()) as { items: ModerationQueueItem[] };
    },
  });

  const { data: archiveData } = useQuery<{ items: ModerationQueueItem[] }>({
    queryKey: ["admin-archive"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await fetch("/api/v1/admin/archive");
      if (!res.ok) return { items: [] };
      return (await res.json()) as { items: ModerationQueueItem[] };
    },
  });

  const handleModerate = async (
    recipeId: string,
    action: "approved" | "hidden",
    reason?: string,
  ) => {
    const res = await fetch(`/api/v1/moderation/${recipeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      toast.error(tCommon("errorTitle"));
      return;
    }
    setHideTarget(null);
    setHideReason("");
    await queryClient.invalidateQueries({ queryKey: ["moderation-queue"] });
    await queryClient.invalidateQueries({ queryKey: ["moderation-count"] });
  };

  const handleRestore = async (recipeId: string) => {
    const res = await fetch(`/api/v1/admin/archive/${recipeId}/restore`, { method: "POST" });
    if (!res.ok) {
      toast.error(tCommon("errorTitle"));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-archive"] });
  };

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return;
    const id = hardDeleteTarget.id;
    setHardDeleteTarget(null);
    const res = await fetch(`/api/v1/admin/archive/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(tCommon("errorTitle"));
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-archive"] });
  };

  const queueItems = queueData?.items ?? [];
  const archiveItems = archiveData?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <h1 className="font-editorial text-3xl font-bold">{t("title")}</h1>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            {t("queueTab")} ({queueItems.length})
          </TabsTrigger>
          {isAdmin ? (
            <TabsTrigger value="archive">
              {t("archiveTab")} ({archiveItems.length})
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="queue" className="space-y-3">
          {queueItems.length === 0 ? (
            <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
              {t("emptyQueue")}
            </Card>
          ) : (
            queueItems.map((item) => (
              <Card key={item.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/recipes/${item.slug}`}
                      className="font-editorial text-lg font-semibold hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <Badge variant="muted">{item.locale.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">@{item.authorUsername}</p>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleModerate(item.id, "approved")}>
                    <Check className="h-4 w-4" />
                    <span>{t("approve")}</span>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setHideTarget(item)}>
                    <EyeOff className="h-4 w-4" />
                    <span>{t("hide")}</span>
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="archive" className="space-y-3">
            {archiveItems.length === 0 ? (
              <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
                {t("emptyArchive")}
              </Card>
            ) : (
              archiveItems.map((item) => (
                <Card
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div className="space-y-1">
                    <p className="font-editorial text-lg font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">@{item.authorUsername}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(item.id)}>
                      <RotateCcw className="h-4 w-4" />
                      <span>{t("restore")}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setHardDeleteTarget(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{t("hardDelete")}</span>
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <Dialog
        open={Boolean(hideTarget)}
        onOpenChange={(open) => (!open ? setHideTarget(null) : undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("hide")}</DialogTitle>
            <DialogDescription>{hideTarget?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hide-reason">{t("hideReasonLabel")}</Label>
            <Textarea
              id="hide-reason"
              rows={3}
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder={t("hideReasonPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideTarget(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={hideReason.trim().length < 3}
              onClick={() =>
                hideTarget ? handleModerate(hideTarget.id, "hidden", hideReason.trim()) : undefined
              }
            >
              {t("hide")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(hardDeleteTarget)}
        onOpenChange={(open) => (!open ? setHardDeleteTarget(null) : undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("hardDelete")}</DialogTitle>
            <DialogDescription>{t("hardDeleteConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHardDeleteTarget(null)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleHardDelete}>
              {t("hardDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
