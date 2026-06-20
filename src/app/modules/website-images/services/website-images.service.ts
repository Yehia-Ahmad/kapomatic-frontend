import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  WebsiteImage,
  WebsiteImageCategoryOption,
  WebsiteImagePayload,
  WebsiteImageProductOption,
  WebsiteImageTargetType
} from '../models/website-images.models';

@Injectable({ providedIn: 'root' })
export class WebsiteImagesService {
  private readonly baseUrl = `${environment.api_base_url}website-images`;
  private readonly categoriesUrl = `${environment.api_base_url}categories`;
  private readonly productsUrl = `${environment.api_base_url}products`;

  constructor(private readonly http: HttpClient) {}

  getWebsiteImages(): Observable<WebsiteImage[]> {
    return this.http.get<unknown>(this.baseUrl).pipe(
      map((response) => this.extractArray(response, ['websiteImages', 'data.websiteImages', 'images', 'data.images', 'items', 'data']).map(
        (item) => this.normalizeWebsiteImage(item)
      ))
    );
  }

  getWebsiteImage(id: string): Observable<WebsiteImage> {
    return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(
      map((response) => this.normalizeWebsiteImage(this.extractObject(response)))
    );
  }

  createWebsiteImage(payload: WebsiteImagePayload): Observable<WebsiteImage> {
    return this.http.post<unknown>(this.baseUrl, payload).pipe(
      map((response) => this.normalizeWebsiteImage(this.extractObject(response)))
    );
  }

  updateWebsiteImage(id: string, payload: WebsiteImagePayload): Observable<WebsiteImage> {
    return this.http.put<unknown>(`${this.baseUrl}/${id}`, payload).pipe(
      map((response) => this.normalizeWebsiteImage(this.extractObject(response)))
    );
  }

  deleteWebsiteImage(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.baseUrl}/${id}`);
  }

  getResolvedProducts(id: string): Observable<WebsiteImageProductOption[]> {
    return this.http.get<unknown>(`${this.baseUrl}/${id}/products`).pipe(
      map((response) => this.extractArray(response, ['resolvedProducts', 'data.resolvedProducts', 'products', 'data.products', 'data']).map(
        (product) => this.normalizeProduct(product)
      ))
    );
  }

  getCategories(): Observable<WebsiteImageCategoryOption[]> {
    return this.http.get<unknown>(this.categoriesUrl).pipe(
      map((response) => this.extractArray(response, ['categories', 'data.categories', 'data']).map((category: any) => ({
        id: String(category?._id || category?.id || ''),
        name: String(category?.name || category?.title || '')
      })).filter((category) => category.id))
    );
  }

  getProductsByCategory(categoryId: string): Observable<WebsiteImageProductOption[]> {
    return this.http.get<unknown>(this.productsUrl, { params: { categoryId } }).pipe(
      map((response) => this.extractArray(response, ['products', 'data.products', 'data']).map(
        (product) => this.normalizeProduct(product)
      ))
    );
  }

  getProductById(id: string): Observable<WebsiteImageProductOption> {
    return this.http.get<unknown>(`${this.productsUrl}/${id}`).pipe(
      map((response) => this.normalizeProduct(this.extractObject(response)))
    );
  }

  private normalizeWebsiteImage(item: any): WebsiteImage {
    const targetType = String(item?.targetType || 'category').toLowerCase();

    return {
      id: String(item?._id || item?.id || ''),
      title: String(item?.title || ''),
      image: String(item?.imageBase64 || item?.image || item?.imageUrl || ''),
      targetType: this.isTargetType(targetType) ? targetType : 'category',
      categoryIds: this.extractIds(item?.categoryIds || item?.categories || []),
      productIds: this.extractIds(item?.productIds || item?.products || []),
      maxPrice: item?.maxPrice === null || item?.maxPrice === undefined
        ? null
        : Number(item.maxPrice),
      isActive: Boolean(item?.isActive ?? true),
      createdAt: item?.createdAt ? String(item.createdAt) : null
    };
  }

  private normalizeProduct(product: any): WebsiteImageProductOption {
    const category = product?.category || product?.categoryId || {};

    return {
      id: String(product?._id || product?.id || ''),
      name: String(product?.name || product?.productName || ''),
      code: String(product?.code || ''),
      image: String(product?.image || product?.imageBase64 || product?.imageUrl || ''),
      categoryId: String(category?._id || category?.id || product?.categoryId || ''),
      categoryName: String(category?.name || product?.categoryName || ''),
      retailPrice: Number(product?.retailPrice ?? product?.price ?? 0)
    };
  }

  private extractObject(response: any): any {
    return response?.data?.websiteImage || response?.data?.item || response?.data ||
      response?.websiteImage || response?.item || response || {};
  }

  private extractArray(response: any, keys: string[]): any[] {
    if (Array.isArray(response)) return response;

    for (const key of keys) {
      const value = key.split('.').reduce((current, part) => current?.[part], response);
      if (Array.isArray(value)) return value;
    }

    if (Array.isArray(response?.data?.items)) return response.data.items;
    if (Array.isArray(response?.data?.products)) return response.data.products;
    return [];
  }

  private extractIds(values: any[]): string[] {
    if (!Array.isArray(values)) return [];
    return values.map((value) => String(value?._id || value?.id || value)).filter(Boolean);
  }

  private isTargetType(value: string): value is WebsiteImageTargetType {
    return ['category', 'product', 'both', 'price'].includes(value);
  }
}
