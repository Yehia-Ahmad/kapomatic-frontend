import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private _baseUrl = environment.api_base_url;

  constructor(private _http: HttpClient) { }

  searchProducts(query: string) {
    return this._http.get(`${this._baseUrl}products/search`, {
      params: { q: query }
    });
  }

  createSelling(payload: {
    productId: string;
    customerName: string;
    sellingDate: string;
    quantity: number;
    price: number;
  }) {
    return this._http.post(`${this._baseUrl}sellings`, payload);
  }

  getSellings(params?: {
    categoryId?: string;
    productId?: string;
    customerName?: string;
    customerPhone?: string;
    sellingDate?: string;
  }) {
    return this._http.get(`${this._baseUrl}sellings`, { params });
  }

  deleteSelling(id: string) {
    return this._http.delete(`${this._baseUrl}sellings/${id}`);
  }
}
