
export interface Product {
  id: string;
  name: string;
  model: string;
  description: string;
  image: string;
  unitPrice: number;
  dimensions?: string;
  powerConsumption?: string;
  energyEfficiency?: string;
  origin?: string;
  specialFeature?: string;
  warranty?: string;
  installationDiagram?: string;
}

export interface QuoteItem extends Product {
  quantity: number;
  quotePrice?: number;
}

export interface QuoteSettings {
  discount: number; // as a percentage
  includeVat: boolean;
  terms: string;
}

export interface DisplayConfig {
  productImage: boolean;
  dimensions: boolean;
  powerConsumption: boolean;
  energyEfficiency: boolean;
  origin: boolean;
  specialFeature: boolean;
  warranty: boolean;
  installationDiagram: boolean;
}

export interface Customer {
    name: string;
    phone: string;
    address: string;
}

export interface AppState {
  currentStep: number;
  quoteDetails: { name: string; date: string; logo: string; };
  customer: Customer;
  salesInfo: { name: string; phone: string; };
  quoteItems: QuoteItem[];
  settings: QuoteSettings;
  displayConfig: DisplayConfig;
}

export interface Draft {
  id: string;
  name: string;
  lastSaved: string;
  state: AppState;
}