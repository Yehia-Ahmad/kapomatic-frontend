import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { removeNullishFieldsParams } from '../../../core/utilities/helper-function';
import {
  CustomSaleFilters,
  CustomSalePaymentPayload,
  CustomSalePayload
} from '../models/custom-sales.models';

@Injectable({
  providedIn: 'root'
})
export class CustomSalesService {
  private readonly baseUrl = `${environment.api_base_url}workshop-sales`;

  constructor(private readonly http: HttpClient) {}

  getCustomSales(filters?: CustomSaleFilters) {
    const params = removeNullishFieldsParams({
      ...(filters ?? {}),
      invoiceType: 'custom-sales'
    });
    return this.http.get(this.baseUrl, { params });
  }

  getCustomSaleById(id: string) {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  createCustomSale(payload: CustomSalePayload) {
    return this.http.post(this.baseUrl, payload);
  }

  updateCustomSale(id: string, payload: CustomSalePayload) {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  deleteCustomSale(id: string) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  addPayment(id: string, payload: CustomSalePaymentPayload) {
    return this.http.post(`${this.baseUrl}/${id}/payments`, payload);
  }

  cancelCustomSale(id: string) {
    return this.http.post(`${this.baseUrl}/${id}/cancel`, {});
  }

  markDelivered(id: string) {
    return this.http.post(`${this.baseUrl}/${id}/mark-delivered`, {});
  }
}

