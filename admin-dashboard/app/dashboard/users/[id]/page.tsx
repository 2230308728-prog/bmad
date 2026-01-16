'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface UserDetail {
  id: number;
  nickname: string;
  avatarUrl: string | null;
  openid: string | null;
  phone: string | null;
  role: 'PARENT' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  orderCount: number;
  totalSpent: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserOrder {
  id: number;
  orderNo: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  product: {
    id: number;
    title: string;
  };
}

/**
 * User Detail Page
 */
export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'orders' && user) {
      fetchUserOrders();
    }
  }, [activeTab, user]);

  async function fetchUser() {
    try {
      const response = await apiClient.get<{ data: UserDetail }>(`/admin/users/${userId}`);
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!user) return;

    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { status: newStatus });
      await fetchUser();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('更新用户状态失败');
    }
  }

  async function fetchUserOrders() {
    if (!user) return;

    try {
      setOrdersLoading(true);
      const response = await apiClient.get<{ data: UserOrder[] }>(`/admin/users/${user.id}/orders?page=1&pageSize=10`);
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-white p-6 shadow">
        <div className="h-96 rounded bg-gray-200"></div>
      </div>
    );
  }

  if (!user) {
    return <div>用户不存在</div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/users')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 返回用户列表
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User Info Card */}
        <div className="lg:col-span-1">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nickname}
                  className="mr-4 h-20 w-20 rounded-full"
                />
              ) : (
                <div className="mr-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600">
                  <span className="text-2xl font-medium text-white">
                    {user.nickname.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.nickname}</h2>
                <p className="text-sm text-gray-500">ID: {user.id}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">角色</span>
                <span className="font-medium">{user.role === 'PARENT' ? '家长' : '管理员'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">状态</span>
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                  user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  user.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {user.status === 'ACTIVE' ? '正常' : user.status === 'INACTIVE' ? '未激活' : '已禁用'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">手机号</span>
                <span className="font-medium">{user.phone || '未绑定'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">订单数</span>
                <span className="font-medium">{user.orderCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">消费金额</span>
                <span className="font-medium">¥{Number(user.totalSpent).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">注册时间</span>
                <span className="font-medium">{new Date(user.createdAt).toLocaleString()}</span>
              </div>
              {user.lastLoginAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">最后登录</span>
                  <span className="font-medium">{new Date(user.lastLoginAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
              {user.status === 'ACTIVE' && (
                <button
                  onClick={() => updateStatus('BANNED')}
                  className="w-full rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  禁用用户
                </button>
              )}
              {user.status === 'BANNED' && (
                <button
                  onClick={() => updateStatus('ACTIVE')}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  恢复用户
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab('info')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                基本信息
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                订单历史
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">详细资料</h3>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">OpenID</dt>
                  <dd className="mt-1 font-mono text-xs text-gray-900">{user.openid || '未绑定微信'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">手机号</dt>
                  <dd className="mt-1 font-medium text-gray-900">{user.phone || '未绑定'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">角色</dt>
                  <dd className="mt-1 font-medium text-gray-900">{user.role === 'PARENT' ? '家长' : '管理员'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">状态</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {user.status === 'ACTIVE' ? '正常' : user.status === 'INACTIVE' ? '未激活' : '已禁用'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">注册时间</dt>
                  <dd className="mt-1 font-medium text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">更新时间</dt>
                  <dd className="mt-1 font-medium text-gray-900">{new Date(user.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">订单历史</h3>
                <button
                  onClick={() => router.push(`/dashboard/orders?userId=${user.id}`)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  查看全部
                </button>
              </div>

              {ordersLoading ? (
                <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="mt-2 text-sm text-gray-500">加载中...</p>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">暂无订单记录</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">订单号</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">产品</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">金额</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">创建时间</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {order.orderNo}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {order.product.title}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            ¥{Number(order.totalAmount).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status === 'COMPLETED' ? '已完成' :
                               order.status === 'PENDING' ? '待支付' :
                               order.status === 'PAID' ? '已支付' :
                               order.status || '未知'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
