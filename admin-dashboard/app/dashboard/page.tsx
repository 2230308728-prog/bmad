'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

// Backend returns: { data: { today: {...}, week: {...}, month: {...}, total: {...} } }
interface DashboardOverviewResponse {
  today: {
    orders: number;
    ordersAmount: string;
    newUsers: number;
    paidOrders: number;
    completedOrders: number;
  };
  total: {
    users: number;
    orders: number;
    products: number;
    revenue: string;
  };
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: string;
  totalUsers: number;
  totalProducts: number;
  todayOrders: number;
  todayRevenue: string;
  todayPaidOrders: number;
  todayCompletedOrders: number;
}

// Backend returns camelCase fields with nested user and product objects
interface RecentOrder {
  id: number;
  orderNo: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';
  totalAmount: string;
  bookingDate: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    phone: string;
    role: string;
  };
  product: {
    id: number;
    title: string;
    price: string;
  } | null;
}

/**
 * Dashboard Overview Page
 */
export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard statistics
      // Backend returns: { data: { today: {...}, total: {...} } }
      const overviewResponse = await apiClient.get<DashboardOverviewResponse>('/admin/dashboard/overview');

      // Transform backend data to DashboardStats format
      const stats: DashboardStats = {
        totalOrders: overviewResponse.data.total.orders,
        totalRevenue: overviewResponse.data.total.revenue,
        totalUsers: overviewResponse.data.total.users,
        totalProducts: overviewResponse.data.total.products,
        todayOrders: overviewResponse.data.today.orders,
        todayRevenue: overviewResponse.data.today.ordersAmount,
        todayPaidOrders: overviewResponse.data.today.paidOrders,
        todayCompletedOrders: overviewResponse.data.today.completedOrders,
      };
      setStats(stats);

      // Fetch recent orders
      // Backend returns: { data: { data: [...], total, page, pageSize } }
      const ordersResponse = await apiClient.get<{ data: RecentOrder[]; total: number; page: number; pageSize: number }>('/admin/orders?page=1&pageSize=5');
      setRecentOrders(ordersResponse.data.data || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('加载数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-red-50 p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="mt-1 text-sm text-gray-500">查看平台运营数据和关键指标</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Orders */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总订单数</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              今日新增 <span className="font-semibold text-gray-900">{stats.todayOrders}</span> 单
              <span className="mx-1">|</span>
              已支付 <span className="font-semibold text-blue-600">{stats.todayPaidOrders}</span> 单
            </p>
          </div>

          {/* Total Revenue */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总收入</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  ¥{Number(stats.totalRevenue).toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              今日收入 <span className="font-semibold text-green-600">¥{Number(stats.todayRevenue).toLocaleString()}</span>
            </p>
          </div>

          {/* Total Users */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">总用户数</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              注册用户总数
            </p>
          </div>

          {/* Total Products */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">产品数量</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <div className="rounded-full bg-orange-100 p-3">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              在售产品
            </p>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">最近订单</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  订单号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  创建时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    暂无订单
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {order.orderNo}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {order.user.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      ¥{Number(order.totalAmount).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        order.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'REFUNDING' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'COMPLETED' ? '已完成' :
                         order.status === 'CONFIRMED' ? '已确认' :
                         order.status === 'PENDING' ? '待付款' :
                         order.status === 'PAID' ? '已付款' :
                         order.status === 'REFUNDING' ? '退款中' :
                         order.status || '未知'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
