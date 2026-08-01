export const DELIVERY_NAVIGATION_EVENT = 'delivery:navigate';

export type DeliveryNavigationDetail = {
  path: string;
  state?: unknown;
};

export function navigateDelivery(path: string, state?: unknown) {
  window.dispatchEvent(new CustomEvent<DeliveryNavigationDetail>(DELIVERY_NAVIGATION_EVENT, {
    detail: { path, state },
  }));
}
