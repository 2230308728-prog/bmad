'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Order {
  id: number;
  orderNo: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';
  totalAmount: string;
  createdAt: string;
  user: {
    id: number;
    nickname: string;
  };
  product: {
    id: number;
    title: string;
    images: string[];
  };
  bookingDate: string;
  childName: string;
}

interface OrdersResponse {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  meta?: {
    timestamp: string;
    version: string;
  };
}

const STATUS_LABELS = {
  PENDING: { label: '待支付', color: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: '已支付', color: 'bg-blue-100 text-blue-800' },
  CONFIRMED: { label: '已确认', color: 'bg-indigo-100 text-indigo-800' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-800' },
  REFUNDING: { label: '退款中', color: 'bg-orange-100 text-orange-800' },
  REFUNDED: { label: '已退款', color: 'bg-red-100 text-red-800' },
};

interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  completed: number;
  cancelled: number;
  refunding: number;
  refunded: number;
  totalRevenue: string;
  todayRevenue: string;
}

/**
 * Orders List Page
 */
export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 20 });
  const [filters, setFilters] = useState({ status: '', orderNo: '' });
  const [stats, setStats] = useState<OrderStats | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [pagination.page, filters]);

  async function fetchOrders() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.orderNo && { orderNo: filters.orderNo }),
      });
      const response = await apiClient.get<OrdersResponse>(`/admin/orders?${params}`);
      setOrders(response.data?.data || []);
      setPagination({
        page: response.data?.page || 1,
        total: response.data?.total || 0,
        pageSize: response.data?.pageSize || 20,
        totalPages: Math.ceil((response.data?.total || 0) / (response.data?.pageSize || 20))
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await apiClient.get<{ data: OrderStats }>('/admin/orders/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">订单管理</h1>
        <p className="mt-1 text-sm text-gray-500">查看和管理平台上的所有订单</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">总订单数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="mt-4 text-sm text-gray-500">
              待支付 {stats.pending} | 已支付 {stats.paid}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">已完成订单</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.completed}</p>
            <p className="mt-4 text-sm text-gray-500">
              已取消 {stats.cancelled} | 已退款 {stats.refunded}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">总收入</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ¥{Number(stats.totalRevenue).toLocaleString()}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              累计收入金额
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">今日收入</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              ¥{Number(stats.todayRevenue).toLocaleString()}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              今日订单收入
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">全部状态</option>
            <option value="PENDING">待支付</option>
            <option value="PAID">已支付</option>
            <option value="CONFIRMED">已确认</option>
            <option value="COMPLETED">已完成</option>
            <option value="CANCELLED">已取消</option>
            <option value="REFUNDING">退款中</option>
            <option value="REFUNDED">已退款</option>
          </select>
          <input
            type="text"
            placeholder="搜索订单号..."
            value={filters.orderNo}
            onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          />
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">订单号</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">产品</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">预订日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(orders || []).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.orderNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {order.product.images[0] && (
                        <img
                          src={order.product.images[0]}
                          alt={order.product.title}
                          className="mr-3 h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div className="text-sm text-gray-900">{order.product.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.user.nickname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ¥{Number(order.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${STATUS_LABELS[order.status].color}`}>
                      {STATUS_LABELS[order.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.bookingDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                共 {pagination.total} 条记录
              </div>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page === 1}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  上一页
                </button>
                <span className="px-3 py-1 text-sm">第 {pagination.page} / {pagination.totalPages} 页</span>
                <button
                  disabled={pagination.page === pagination.totalPages}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
