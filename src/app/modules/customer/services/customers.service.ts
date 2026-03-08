import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { removeNullishFieldsParams } from '../../../core/utilities/helper-function';

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerQueryParams {
  search?: string;
  name?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomersService {
  private _baseUrl = environment.api_base_url;

  constructor(private _http: HttpClient) { }

  getCustomers(params?: CustomerQueryParams) {
    const cleanedParams = removeNullishFieldsParams({ ...(params ?? {}) });
    return this._http.get(`${this._baseUrl}customers`, { params: cleanedParams });
  }

  getCustomerById(id: string) {
    return this._http.get(`${this._baseUrl}customers/${id}`);
  }

  createCustomer(payload: Pick<Customer, 'name' | 'phone'>) {
    return this._http.post(`${this._baseUrl}customers`, payload);
  }

  updateCustomer(id: string, payload: Pick<Customer, 'name' | 'phone'>) {
    return this._http.put(`${this._baseUrl}customers/${id}`, payload);
  }

  deleteCustomer(id: string) {
    return this._http.delete(`${this._baseUrl}customers/${id}`);
  }
}
