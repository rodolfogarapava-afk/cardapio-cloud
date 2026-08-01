export type DeliveryAccess = {
  phone?: string;
  token?: string;
  tenantId?: string;
  vendorSlug?: string;
  updatedAt?: number;
};

const ACCESS_KEY = 'cardapio_delivery_access';

export function readDeliveryAccess(): DeliveryAccess | null {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const parsed = JSON.parse(storage.getItem(ACCESS_KEY) || 'null') as DeliveryAccess | null;
      if (parsed?.phone) return parsed;
    } catch {
      storage.removeItem(ACCESS_KEY);
    }
  }
  return null;
}

export function saveDeliveryAccess(access: DeliveryAccess) {
  const value = JSON.stringify({ ...access, updatedAt: Date.now() });
  window.localStorage.setItem(ACCESS_KEY, value);
  window.sessionStorage.setItem(ACCESS_KEY, value);
}

export function clearDeliveryAccess() {
  window.localStorage.removeItem(ACCESS_KEY);
  window.sessionStorage.removeItem(ACCESS_KEY);
}
