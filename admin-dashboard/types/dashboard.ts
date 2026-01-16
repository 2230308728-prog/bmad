/**
 * Dashboard Overview Types
 */

export interface DashboardOverview {
  todayOrders: number;
  todayAmount: number;
  todayNewUsers: number;
  pendingRefunds: number;
  pendingIssues: number;
}

export interface OrdersTrendData {
  hour: number;
  orders: number;
  amount: number;
}

export interface UserRetentionData {
  day: string;
  count: number;
  percentage: number;
}

export interface ConversionFunnelData {
  stage: string;
  count: number;
  percentage: number;
}

export interface PopularProductData {
  productId: number;
  productName: string;
  orders: number;
  amount: number;
  conversionRate: number;
}
