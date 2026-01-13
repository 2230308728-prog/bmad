/**
 * Global type definitions for admin dashboard
 * This file will be expanded as the project grows
 */

// User types (for Epic 2)
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'parent';
  createdAt: string;
  updatedAt: string;
}

// Product types (for Epic 3)
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  status: 'available' | 'out_of_stock' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

// Order types (for Epic 4 & 5)
export interface Order {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  timestamp: string;
}
