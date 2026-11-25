"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/core/i18n/navigation";
import type { RecipeCardDto } from "@/entities/recipe/server/recipe-service";
import { RecipeCard } from "@/entities/recipe/ui/recipe-card";
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
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";

type MyTab = "own" | "saved" | "drafts";

export function MyRecipesView({ initialTab = "own" }: { initialTab?: MyTab }) {
  const t = useTranslations("myRecipes");
  const tRecipe = useTranslations("recipe");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MyTab>(initialTab);
  const [deleteTarget, setDeleteTarget] = useState<RecipeCardDto | null>(null);

  const { data, isLoading } = useQuery<{ items: RecipeCardDto[] }>({
    queryKey: ["my-recipes", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/v1/my-recipes?tab=${activeTab}`);
      if (!res.ok) return { items: [] };
      return (await res.json()) as { items: RecipeCardDto[] };
    },
  });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    const res = await fetch(`/api/v1/recipes/by-id/${target.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      toast.error(tCommon("errorTitle"));
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["my-recipes"] });

    toast(t("deletedToast", { title: target.title }), {
      duration: 5000,
      action: {
        label: t("undo"),
        onClick: async () => {
          const restoreRes = await fetch(`/api/v1/recipes/by-id/${target.id}/restore`, {
            method: "POST",
          });
          if (restoreRes.ok) {
            await queryClient.invalidateQueries({ queryKey: ["my-recipes"] });
            toast.success(t("restoredToast"));
          }
        },
      },
    });
  };

  const renderGrid = (items: RecipeCardDto[], emptyText: string, ctaHref: string, ctaLabel: string) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {["m1", "m2", "m3"].map((k) => (
            <Skeleton key={k} className="h-72 rounded-lg" />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
          <p className="text-sm text-muted-foreground">{emptyText}</p>
          <Button asChild>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((recipe) => (
          <div key={recipe.id} className="flex flex-col gap-2">
            <RecipeCard recipe={recipe} />
            {activeTab !== "saved" ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex flex-wrap gap-1">
                  {recipe.visibility === "private" ? (
                    <Badge variant="outline">{tRecipe("privateBadge")}</Badge>
                  ) : null}
                  {recipe.moderationStatus === "hidden" ? (
                    <Badge variant="destructive">{tRecipe("hiddenBadge")}</Badge>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/recipes/${recipe.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span>{tCommon("edit")}</span>
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(recipe)}
                    aria-label={tCommon("delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-editorial text-3xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus className="h-4 w-4" />
            <span>{t("createCta")}</span>
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MyTab)}>
        <TabsList>
          <TabsTrigger value="own">{t("tabOwn")}</TabsTrigger>
          <TabsTrigger value="saved">{t("tabSaved")}</TabsTrigger>
          <TabsTrigger value="drafts">{t("tabDrafts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="own">
          {renderGrid(data?.items ?? [], t("emptyOwn"), "/recipes/new", t("createCta"))}
        </TabsContent>
        <TabsContent value="saved">
          {renderGrid(data?.items ?? [], t("emptySaved"), "/search", t("browseCta"))}
        </TabsContent>
        <TabsContent value="drafts">
          {renderGrid(data?.items ?? [], t("emptyDrafts"), "/recipes/new", t("createCta"))}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? setDeleteTarget(null) : undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
            <DialogDescription>{t("confirmDeleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
