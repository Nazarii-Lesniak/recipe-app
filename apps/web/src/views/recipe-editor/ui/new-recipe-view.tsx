"use client";

import type { RecipeInput } from "@recipes/domain";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { CategoryDto } from "@/entities/recipe/server/recipe-service";
import { AiImportPanel } from "@/features/ai-import/ui/ai-import-panel";
import { RecipeForm } from "@/features/recipe-form/ui/recipe-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";

export function NewRecipeView({
  categories,
  initialSharedUrl,
  initialSharedText,
}: {
  categories: CategoryDto[];
  initialSharedUrl?: string;
  initialSharedText?: string;
}) {
  const t = useTranslations("editor");
  const hasShareTarget = Boolean(initialSharedUrl || initialSharedText);
  const [activeTab, setActiveTab] = useState<string>(hasShareTarget ? "ai" : "manual");
  const [importedValues, setImportedValues] = useState<Partial<RecipeInput> | undefined>(undefined);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <h1 className="font-editorial text-3xl font-bold">{t("newTitle")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="manual">{t("tabManual")}</TabsTrigger>
          <TabsTrigger value="ai">{t("tabAiImport")}</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <RecipeForm
            categories={categories}
            initialValues={importedValues}
            scopeKey="new"
            duplicateWarning={duplicateWarning}
          />
        </TabsContent>

        <TabsContent value="ai">
          <AiImportPanel
            initialUrl={initialSharedUrl}
            initialText={initialSharedText}
            onParsed={(data, isDuplicate) => {
              setImportedValues(data);
              setDuplicateWarning(isDuplicate);
              setActiveTab("manual");
            }}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
