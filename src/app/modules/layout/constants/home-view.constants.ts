export type HomeView = 'dashboard' | 'inventory' | 'products' | 'selling' | 'invoice-history';

export const HOME_VIEW_STORAGE_KEY = 'home_current_view';
export const HOME_DEFAULT_VIEW: HomeView = 'dashboard';
export const HOME_VIEWS: HomeView[] = ['dashboard', 'inventory', 'products', 'selling', 'invoice-history'];
