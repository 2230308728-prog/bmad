'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface User {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  role: 'PARENT' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  phone: string | null;
  orderCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
  createdAt: string;
}

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  meta?: {
    timestamp: string;
    version: string;
  };
}

const ROLE_LABELS = {
  PARENT: '家长',
  ADMIN: '管理员',
};

const STATUS_LABELS = {
  ACTIVE: { label: '正常', color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: '未激活', color: 'bg-gray-100 text-gray-800' },
  BANNED: { label: '已禁用', color: 'bg-red-100 text-red-800' },
};

interface UserStats {
  total: number;
  parents: number;
  admins: number;
  active: number;
  inactive: number;
  banned: number;
  todayRegistered: number;
  weekRegistered: number;
  monthRegistered: number;
}

/**
 * Users List Page
 */
export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 20 });
  const [filters, setFilters] = useState({ role: '', status: '', keyword: '' });
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [pagination.page, filters]);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: '20',
        ...(filters.role && { role: filters.role }),
        ...(filters.status && { status: filters.status }),
        ...(filters.keyword && { keyword: filters.keyword }),
      });
      const response = await apiClient.get<UsersResponse>(`/admin/users?${params}`);
      console.log('[Users] API Response:', response);
      console.log('[Users] Response data:', response.data);
      const usersData = response.data?.data || [];
      console.log('[Users] Users data:', usersData);
      setUsers(usersData);
      setPagination({
        page: response.data?.page || 1,
        total: response.data?.total || 0,
        pageSize: response.data?.pageSize || 20,
        totalPages: Math.ceil((response.data?.total || 0) / (response.data?.pageSize || 20))
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await apiClient.get<{ data: UserStats }>('/admin/users/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        <p className="mt-1 text-sm text-gray-500">查看和管理平台用户</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">总用户数</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="mt-4 text-sm text-gray-500">
              家长 {stats.parents} | 管理员 {stats.admins}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">活跃用户</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{stats.active}</p>
            <p className="mt-4 text-sm text-gray-500">
              未激活 {stats.inactive} | 已禁用 {stats.banned}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">今日新增</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{stats.todayRegistered}</p>
            <p className="mt-4 text-sm text-gray-500">
              本周新增 {stats.weekRegistered}
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <p className="text-sm font-medium text-gray-600">本月新增</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">{stats.monthRegistered}</p>
            <p className="mt-4 text-sm text-gray-500">
              注册用户增长
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">全部角色</option>
            <option value="PARENT">家长</option>
            <option value="ADMIN">管理员</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">全部状态</option>
            <option value="ACTIVE">正常</option>
            <option value="INACTIVE">未激活</option>
            <option value="BANNED">已禁用</option>
          </select>
          <input
            type="text"
            placeholder="搜索昵称或手机号..."
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            className="rounded-md border-gray-300 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">订单数</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">消费金额</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">注册时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(users || []).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.nickname}
                          className="mr-3 h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                          <span className="text-sm font-medium text-white">
                            {user.nickname.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.nickname}</div>
                        <div className="text-xs text-gray-500">{user.phone || '未绑定手机'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ROLE_LABELS[user.role]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${STATUS_LABELS[user.status].color}`}>
                      {STATUS_LABELS[user.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.orderCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ¥{Number(user.totalSpent).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => router.push(`/dashboard/users/${user.id}`)}
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
