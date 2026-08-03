export type CustomSaleStatus = 'pending' | 'partially_paid' | 'paid' | 'delivered' | 'cancelled' | string;

export interface CustomSaleLineItem {
  productId?: string | null;
  productName?: string | null;
  product?: { name?: string | null } | null;
  name: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  manualCost?: number;
  totalCost?: number;
}

export interface CustomSalePayment {
  _id?: string;
  amount: number;
  paymentDate: string;
  note?: string | null;
}

export interface CustomSale {
  _id?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  sellingDate?: string;
  deliveryDate?: string;
  finalProductName?: string;
  description?: string;
  quantity?: number;
  materials?: CustomSaleLineItem[];
  additionalComponents?: CustomSaleLineItem[];
  laborCost?: number;
  discountAmount?: number;
  totalPrice?: number;
  paidAmount?: number;
  remainingAmount?: number;
  materialsCost?: number;
  additionalComponentsCost?: number;
  profitAmount?: number;
  status?: CustomSaleStatus;
  payments?: CustomSalePayment[];
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomSaleFilters {
  search?: string;
  customerName?: string;
  customerPhone?: string;
  invoiceNumber?: string;
  finalProductName?: string;
  status?: string;
  sellingDate?: string;
  deliveryDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  invoiceType?: 'custom-sales';
}

export interface CustomSalePayload {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  sellingDate: string;
  deliveryDate?: string | null;
  finalProductName: string;
  description?: string | null;
  quantity: number;
  materials: CustomSaleLineItem[];
  additionalComponents: CustomSaleLineItem[];
  laborCost: number;
  discountAmount: number;
  initialPaidAmount?: number;
  notes?: string | null;
}

export interface CustomSalePaymentPayload {
  amount: number;
  paymentDate: string;
  note?: string | null;
}

export interface CustomSaleSummary {
  materialsCost: number;
  additionalComponentsCost: number;
  laborCost: number;
  subtotal: number;
  discount: number;
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  profitAmount: number;
}
