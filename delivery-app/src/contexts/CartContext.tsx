import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Cart, CartItem, CartItemComplement, DeliveryMode, DeliveryAddress } from '@/types';

interface CartContextType {
  cart: Cart | null;
  addItem: (
    restaurantId: string,
    restaurantName: string,
    restaurantSlug: string,
    restaurantAddress: string | undefined,
    productId: string,
    productName: string,
    productImage: string | undefined,
    unitPrice: number,
    quantity: number,
    complements: CartItemComplement[],
    observation?: string,
    removedIngredients?: string[]
  ) => void;
  updateItem: (
    itemId: string,
    unitPrice: number,
    quantity: number,
    complements: CartItemComplement[],
    observation?: string,
    removedIngredients?: string[]
  ) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setDeliveryFee: (fee: number) => void;
  deliveryMode: DeliveryMode;
  setDeliveryMode: (mode: DeliveryMode) => void;
  deliveryAddress: DeliveryAddress | null;
  setDeliveryAddress: (address: DeliveryAddress | null) => void;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function calculateItemTotal(unitPrice: number, quantity: number, complements: CartItemComplement[]): number {
  const complementsTotal = complements.reduce((sum, c) => sum + c.price, 0);
  return (unitPrice + complementsTotal) * quantity;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);

  const addItem = useCallback(
    (
      restaurantId: string,
      restaurantName: string,
      restaurantSlug: string,
      restaurantAddress: string | undefined,
      productId: string,
      productName: string,
      productImage: string | undefined,
      unitPrice: number,
      quantity: number,
      complements: CartItemComplement[],
      observation?: string,
      removedIngredients?: string[]
    ) => {
      const totalPrice = calculateItemTotal(unitPrice, quantity, complements);

      const newItem: CartItem = {
        id: generateId(),
        productId,
        productName,
        productImage,
        quantity,
        unitPrice,
        complements,
        removedIngredients: removedIngredients && removedIngredients.length > 0 ? removedIngredients : undefined,
        observation,
        totalPrice,
      };

      setCart(prev => {
        // Se não há carrinho ou é de outro restaurante, cria um novo
        if (!prev || prev.restaurantId !== restaurantId) {
          return {
            restaurantId,
            restaurantName,
            restaurantSlug,
            restaurantAddress,
            items: [newItem],
            subtotal: totalPrice,
            deliveryFee: 0,
            total: totalPrice,
          };
        }

        // Adiciona ao carrinho existente
        const newItems = [...prev.items, newItem];
        const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

        return {
          ...prev,
          items: newItems,
          subtotal,
          total: subtotal + prev.deliveryFee,
        };
      });
    },
    []
  );

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setCart(prev => {
      if (!prev) return null;

      if (quantity <= 0) {
        const newItems = prev.items.filter(item => item.id !== itemId);
        if (newItems.length === 0) return null;

        const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
        return {
          ...prev,
          items: newItems,
          subtotal,
          total: subtotal + prev.deliveryFee,
        };
      }

      const newItems = prev.items.map(item => {
        if (item.id !== itemId) return item;
        const totalPrice = calculateItemTotal(item.unitPrice, quantity, item.complements);
        return { ...item, quantity, totalPrice };
      });

      const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);

      return {
        ...prev,
        items: newItems,
        subtotal,
        total: subtotal + prev.deliveryFee,
      };
    });
  }, []);

  const updateItem = useCallback(
    (itemId: string, unitPrice: number, quantity: number, complements: CartItemComplement[], observation?: string, removedIngredients?: string[]) => {
      setCart(prev => {
        if (!prev) return null;
        const totalPrice = calculateItemTotal(unitPrice, quantity, complements);
        const newItems = prev.items.map(item => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            unitPrice,
            quantity,
            complements,
            observation,
            removedIngredients: removedIngredients && removedIngredients.length > 0 ? removedIngredients : undefined,
            totalPrice,
          };
        });
        const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
        return { ...prev, items: newItems, subtotal, total: subtotal + prev.deliveryFee };
      });
    },
    []
  );

  const removeItem = useCallback((itemId: string) => {
    setCart(prev => {
      if (!prev) return null;

      const newItems = prev.items.filter(item => item.id !== itemId);
      if (newItems.length === 0) return null;

      const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
      return {
        ...prev,
        items: newItems,
        subtotal,
        total: subtotal + prev.deliveryFee,
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(null);
  }, []);

  const setDeliveryFee = useCallback((fee: number) => {
    setCart(prev => {
      if (!prev) return null;
      return {
        ...prev,
        deliveryFee: fee,
        total: prev.subtotal + fee,
      };
    });
  }, []);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        setDeliveryFee,
        deliveryMode,
        setDeliveryMode,
        deliveryAddress,
        setDeliveryAddress,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
