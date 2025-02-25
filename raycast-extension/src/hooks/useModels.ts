import { useState, useEffect, useCallback } from "react";
import { Model, OpenRouterModel } from "../types";
import { useOpenRouter } from "./useOpenRouter";
import { v4 as uuidv4 } from "uuid";

export function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { fetchModels } = useOpenRouter();

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const openRouterModels = await fetchModels();

      const formattedModels: Model[] = openRouterModels.map((model: OpenRouterModel) => ({
        id: uuidv4(),
        name: model.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      setModels(formattedModels);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load models"));
      console.error("Error loading models:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchModels]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return {
    models,
    isLoading,
    error,
    refreshModels: loadModels,
  };
}
