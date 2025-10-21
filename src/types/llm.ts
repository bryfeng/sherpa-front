export interface LLMModelOption {
  id: string
  label: string
  description?: string
}

export interface LLMProviderInfo {
  id: string
  display_name: string
  status: string
  default_model?: string
  description?: string
  reason?: string
  models: LLMModelOption[]
}

export interface LLMProvidersResponse {
  providers: LLMProviderInfo[]
  default_provider?: string
  default_model?: string
  fetched_at?: string
}
