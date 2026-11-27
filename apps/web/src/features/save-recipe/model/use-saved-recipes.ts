"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useSession } from "@/core/auth/auth-client";
import { useAuthModalStore } from "@/features/auth-modal/model/use-auth-modal-store";
import { resolveClientErrorKey } from "@/shared/lib/error-messages";

export function useSavedRecipeIds() {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  const query = useQuery<{ ids: string[] }>({
    queryKey: ["saved-recipe-ids"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch("/api/v1/my-recipes/saved-ids");
      if (!res.ok) return { ids: [] };
      return (await res.json()) as { ids: string[] };
    },
    staleTime: 60_000,
  });

  return {
    savedIds: new Set(isAuthenticated ? (query.data?.ids ?? []) : []),
    isAuthenticated,
    isLoading: query.isLoading,
  };
}

export function useToggleSaveRecipe() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const openLogin = useAuthModalStore((s) => s.openLogin);
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const mutation = useMutation({
    mutationFn: async ({
      recipeId,
      nextSaved,
    }: {
      recipeId: string;
      nextSaved: boolean;
      onErrorRollback?: () => void;
    }) => {
      const res = await fetch(`/api/v1/recipes/by-id/${recipeId}/save`, {
        method: nextSaved ? "POST" : "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw { status: res.status, code: err.error };
      }
      return { recipeId, nextSaved };
    },
    onMutate: async ({ recipeId, nextSaved }) => {
      await queryClient.cancelQueries({ queryKey: ["saved-recipe-ids"] });
      const previous = queryClient.getQueryData<{ ids: string[] }>(["saved-recipe-ids"]);

      queryClient.setQueryData<{ ids: string[] }>(["saved-recipe-ids"], (old) => {
        const current = new Set(old?.ids ?? []);
        if (nextSaved) {
          current.add(recipeId);
        } else {
          current.delete(recipeId);
        }
        return { ids: Array.from(current) };
      });

      return { previous };
    },
    onError: (error: unknown, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["saved-recipe-ids"], context.previous);
      }
      variables.onErrorRollback?.();
      if (error && typeof error === "object" && "status" in error) {
        const errObj = error as { status?: number; code?: string };
        if (errObj.status === 401) {
          openLogin(tAuth("authRequiredForAction"));
          return;
        }
        toast.error(tErrors(resolveClientErrorKey(errObj.code, errObj.status)));
        return;
      }
      toast.error(tErrors("network"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-recipe-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["my-recipes"] });
    },
  });

  const toggleSave = (
    recipeId: string,
    currentlySaved: boolean,
    onErrorRollback?: () => void,
  ): boolean => {
    if (!session?.user) {
      openLogin(tAuth("authRequiredForAction"));
      return false;
    }
    mutation.mutate({ recipeId, nextSaved: !currentlySaved, onErrorRollback });
    return true;
  };

  return {
    toggleSave,
    isPending: mutation.isPending,
  };
}
