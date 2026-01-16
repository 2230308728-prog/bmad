'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Refund {
  id: number;
  refundNo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  refundAmount: string;
  reason: string;
  appliedAt: string;
  user: {
    id: number;
    nickname: string;
  };
  order: {
    id: number;
    orderNo: string;
    product: {
      title: string;
    };
  };
}

interface RefundsResponse {
  data: Refund[];
  total: number;
  page: number;
  pageSize: number;
  meta?: {
    timestamp: string;
    version: string;
  };
}

const STATUS_LABELS = {
  PENDING: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: '已批准', color: 'bg-blue-100 text-blue-800' },
  REJECTED: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  PROCESSING: { label: '处理中', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-800' },
  FAILED: { label: '失败', color: 'bg-red-100 text-red-800' },
};

interface RefundStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  processing: number;
  completed: number;
  failed: number;
  totalAmount: string;
}

/**
 * Refunds List Page
 */
export default function RefundsPage() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 20 });
  const [filters, setFilters] = useState({ status: '' });
  const [stats, setStats] = useState<RefundStats | null>(null);

  useEffect(() => {
    fetchRefunds();
    fetchStats();
  }, [pagination.page, filters]);

  async function fetchRefunds() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: '20',
        ...(filters.status && { status: filters.status }),
      });
      const response = await apiClient.get<RefundsResponse>(`/admin/refunds?${params}`);
      setRefunds(response.data?.data || []);
      setPagination({
        page: response.data?.page || 1,
        total: response.data?.total || 0,
        pageSize: response.data?.pageSize || 20,
        totalPages: Math.ceil((response.data?.total || 0) / (response.data?.pageSize || 20))
      });
    } catch (error) {
      console.error('Failed to fetch refunds:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await apiClient.get<RefundStats>('/admin/refunds/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch refund stats:', error);
    }
  }

  async function handleApprove(refundId: number) {
    try {
      await apiClient.patch(`/admin/refunds/${refundId}/approve`, {});
      await fetchRefunds();
    } catch (error) {
      console.error('Failed to approve refund:', error);
      alert('批准退款失败');
    }
  }

  async function handleReject(refundId: number) {
    const reason = prompt('请输入拒绝原因：');
    if (!reason) return;

    try {
      await apiClient.patch(`/admin/refunds/${refundId}/reject`, { rejectedReason: reason });
      await fetchRefunds();
    } catch (error) {
      console.error('Failed to reject refund:', error);
      alert('拒绝退款失败');
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">退款管理</h1>
        <p className="mt-1 text-sm text-gray-500">处理用户的退款申请</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">总退款申请</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="mt-4 text-sm text-gray-500">
              待审核 {stats.pending} | 处理中 {stats.processing}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">已批准</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.approved}</p>
            <p className="mt-4 text-sm text-gray-500">
              已完成 {stats.completed} | 已拒绝 {stats.rejected}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">退款总额</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              ¥{Number(stats.totalAmount).toLocaleString()}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              累计退款金额
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">失败退款</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{stats.failed}</p>
            <p className="mt-4 text-sm text-gray-500">
              退款处理失败
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
            <option value="PENDING">待审核</option>
            <option value="APPROVED">已批准</option>
            <option value="REJECTED">已拒绝</option>
            <option value="PROCESSING">处理中</option>
            <option value="COMPLETED">已完成</option>
            <option value="FAILED">失败</option>
          </select>
        </div>
      </div>

      {/* Refunds Table */}
      {isLoading ? (
        <div className="animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">退款单号</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">订单</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">退款金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">原因</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">申请时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(refunds || []).map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {refund.refundNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {refund.order.orderNo}
                    <div className="text-xs text-gray-500">{refund.order.product.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {refund.user.nickname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ¥{Number(refund.refundAmount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">{refund.reason}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${STATUS_LABELS[refund.status].color}`}>
                      {STATUS_LABELS[refund.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(refund.appliedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {refund.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(refund.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          批准
                        </button>
                        <button
                          onClick={() => handleReject(refund.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          拒绝
                        </button>
                      </div>
                    )}
                    {refund.status !== 'PENDING' && (
                      <button
                        onClick={() => router.push(`/dashboard/refunds/${refund.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        查看详情
                      </button>
                    )}
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
