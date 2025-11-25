import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export interface Provider {
  id: string;
  name: string;
  displayName: string;
  models: string[];
  defaultModel: string;
  configured: boolean;
}

export interface ProvidersResponse {
  providers: Provider[];
  defaultProvider: string | null;
  hasConfiguredProviders: boolean;
}

/**
 * Hook to manage AI provider configuration
 * Fetches available providers from backend and manages selection state
 */
export function useProviderConfig() {
  const { data, isLoading, error } = useQuery<ProvidersResponse>({
    queryKey: ['providers'],
    queryFn: async () => {
      const res = await fetch('/api/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Auto-select default provider and model when data loads
  useEffect(() => {
    if (data && data.providers.length > 0 && !selectedProvider) {
      const defaultProvider = data.defaultProvider || data.providers[0].id;
      setSelectedProvider(defaultProvider);

      const providerData = data.providers.find(p => p.id === defaultProvider);
      if (providerData) {
        setSelectedModel(providerData.defaultModel);
      }
    }
  }, [data, selectedProvider]);

  // Update model when provider changes
  useEffect(() => {
    if (selectedProvider && data) {
      const providerData = data.providers.find(p => p.id === selectedProvider);
      if (providerData) {
        // Always update to provider's default model when switching providers
        // to avoid showing wrong models in dropdown
        setSelectedModel(providerData.defaultModel);
      }
    }
  }, [selectedProvider, data]); // Remove selectedModel from deps to avoid infinite loop

  const providers = data?.providers || [];
  const currentProvider = selectedProvider || data?.defaultProvider || providers[0]?.id;
  const providerData = providers.find(p => p.id === currentProvider);
  const currentModel = selectedModel || providerData?.defaultModel || '';

  return {
    // Provider list
    providers,
    hasConfiguredProviders: data?.hasConfiguredProviders ?? false,
    isLoading,
    error,

    // Current selection
    selectedProvider: currentProvider,
    selectedModel: currentModel,
    availableModels: providerData?.models || [],

    // Selection setters
    setSelectedProvider: (providerId: string) => {
      setSelectedProvider(providerId);
      // Model will be auto-updated by useEffect
    },
    setSelectedModel,

    // Provider info
    currentProviderName: providerData?.displayName || 'Unknown',
  };
}
