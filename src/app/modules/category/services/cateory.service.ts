import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CateoryService {
  private _baseUrl = environment.api_base_url

  constructor(private _http: HttpClient) { }

  getCategories() {
    return this._http.get(`${this._baseUrl}categories`);
  }

  getCategoryById(id: number) {
    return this._http.get(`${this._baseUrl}categories/${id}`);
  }

  createCategory(category: any) {
    return this._http.post(`${this._baseUrl}categories`, category);
  }

  deleteCategory(id: string) {
    return this._http.delete(`${this._baseUrl}categories/${id}`);
  }

  getProducts(category_id: number | string, params?: any) {
    return this._http.get(`${this._baseUrl}products`, { params });
  }

  addNewProduct(product: any) {
    return this._http.post(`${this._baseUrl}products`, product);
  }

  getProductById(id: number) {
    return this._http.get(`${this._baseUrl}products/${id}`);
  }

  updateProduct(id: number, payload: any) {
    return this._http.put(`${this._baseUrl}products/${id}`, payload);
  }

  deleteProduct(id: number) {
    return this._http.delete(`${this._baseUrl}products/${id}`);
  }

  createModel(model: any) {
    return this._http.post(`${this._baseUrl}models`, model);
  }

  getModelById(id: number) {
    return this._http.get(`${this._baseUrl}models/${id}`);
  }

  updateModel(id: number, model: any) {
    return this._http.patch(`${this._baseUrl}models/${id}`, model);
  }

  getAllModels() {
    return this._http.get(`${this._baseUrl}models`);
  }

  deleteModel(id: number) {
    return this._http.delete(`${this._baseUrl}models/${id}`);
  }

  veryQrCode(qr_id: number) {
    return this._http.get(`${this._baseUrl}models/verify-qr/${qr_id}`);
  }

  printQrCodes(payload: any) {
    return this._http.post(`${this._baseUrl}models/print-qr`, payload);
  }
}
