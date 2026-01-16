'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface Issue {
  id: number;
  title: string;
  type: 'COMPLAINT' | 'QUESTION' | 'SUGGESTION' | 'REFUND_REQUEST';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
  user: {
    id: number;
    nickname: string;
  };
  order: {
    id: number;
    orderNo: string;
  } | null;
}

interface IssuesResponse {
  data: Issue[];
  total: number;
  page: number;
  pageSize: number;
  meta?: {
    timestamp: string;
    version: string;
  };
}

const TYPE_LABELS = {
  COMPLAINT: '投诉',
  QUESTION: '咨询',
  SUGGESTION: '建议',
  REFUND_REQUEST: '退款申请',
};

const STATUS_LABELS = {
  OPEN: { label: '待处理', color: 'bg-red-100 text-red-800' },
  IN_PROGRESS: { label: '处理中', color: 'bg-blue-100 text-blue-800' },
  RESOLVED: { label: '已解决', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: '已关闭', color: 'bg-gray-100 text-gray-800' },
};

const PRIORITY_LABELS = {
  LOW: { label: '低', color: 'bg-gray-100 text-gray-800' },
  MEDIUM: { label: '中', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-800' },
  URGENT: { label: '紧急', color: 'bg-red-100 text-red-800' },
};

interface IssueStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

/**
 * Issues List Page
 */
export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 20 });
  const [filters, setFilters] = useState({ status: '', type: '', priority: '' });
  const [stats, setStats] = useState<IssueStats | null>(null);

  useEffect(() => {
    fetchIssues();
    fetchStats();
  }, [pagination.page, filters]);

  async function fetchIssues() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.priority && { priority: filters.priority }),
      });
      const response = await apiClient.get<IssuesResponse>(`/admin/issues?${params}`);
      setIssues(response.data?.data || []);
      setPagination({
        page: response.data?.page || 1,
        total: response.data?.total || 0,
        pageSize: response.data?.pageSize || 20,
        totalPages: Math.ceil((response.data?.total || 0) / (response.data?.pageSize || 20))
      });
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await apiClient.get<{ data: IssueStats }>('/admin/issues/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch issue stats:', error);
    }
  }

  async function updateStatus(issueId: number, newStatus: string) {
    try {
      await apiClient.patch(`/admin/issues/${issueId}/status`, { status: newStatus });
      await fetchIssues();
    } catch (error) {
      console.error('Failed to update issue:', error);
      alert('更新问题状态失败');
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">问题管理</h1>
        <p className="mt-1 text-sm text-gray-500">处理用户的问题和投诉</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">总问题数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">待处理</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">{stats.open}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">处理中</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">已解决</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.resolved}</p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">已关闭</p>
            <p className="mt-2 text-3xl font-bold text-gray-600">{stats.closed}</p>
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
            <option value="OPEN">待处理</option>
            <option value="IN_PROGRESS">处理中</option>
            <option value="RESOLVED">已解决</option>
            <option value="CLOSED">已关闭</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">全部类型</option>
            <option value="COMPLAINT">投诉</option>
            <option value="QUESTION">咨询</option>
            <option value="SUGGESTION">建议</option>
            <option value="REFUND_REQUEST">退款申请</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">全部优先级</option>
            <option value="URGENT">紧急</option>
            <option value="HIGH">高</option>
            <option value="MEDIUM">中</option>
            <option value="LOW">低</option>
          </select>
        </div>
      </div>

      {/* Issues Table */}
      {isLoading ? (
        <div className="animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">优先级</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">关联订单</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(issues || []).map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${PRIORITY_LABELS[issue.priority].color}`}>
                      {PRIORITY_LABELS[issue.priority].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {issue.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {TYPE_LABELS[issue.type]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.user.nickname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {issue.order ? issue.order.orderNo : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${STATUS_LABELS[issue.status].color}`}>
                      {STATUS_LABELS[issue.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(issue.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {issue.status === 'OPEN' && (
                      <button
                        onClick={() => updateStatus(issue.id, 'IN_PROGRESS')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        开始处理
                      </button>
                    )}
                    {issue.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => updateStatus(issue.id, 'RESOLVED')}
                        className="text-green-600 hover:text-green-900"
                      >
                        标记解决
                      </button>
                    )}
                    {issue.status === 'RESOLVED' && (
                      <button
                        onClick={() => updateStatus(issue.id, 'CLOSED')}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        关闭
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
