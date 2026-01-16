'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface OrderDetail {
  id: number;
  orderNo: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDING' | 'REFUNDED';
  totalAmount: string;
  paidAmount: string;
  createdAt: string;
  bookingDate: string;
  childName: string;
  childAge: number;
  contactName: string;
  contactPhone: string;
  participantCount: number;
  remark: string | null;
  paidAt: string | null;
  user: {
    id: number;
    nickname: string;
    phone: string | null;
  };
  product: {
    id: number;
    title: string;
    description: string;
    images: string[];
    location: string;
    duration: string;
    price: string;
  };
}

const STATUS_LABELS = {
  PENDING: '待支付',
  PAID: '已支付',
  CONFIRMED: '已确认',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
};

/**
 * Order Detail Page
 */
export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  async function fetchOrder() {
    try {
      const response = await apiClient.get<{ data: OrderDetail }>(`/admin/orders/${orderId}`);
      setOrder(response.data.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!order) return;

    setIsUpdating(true);
    try {
      await apiClient.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      await fetchOrder();
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('更新订单状态失败');
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-white p-6 shadow">
        <div className="h-96 rounded bg-gray-200"></div>
      </div>
    );
  }

  if (!order) {
    return <div>订单不存在</div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/orders')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 返回订单列表
        </button>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">订单详情</h1>
            <p className="text-sm text-gray-500">订单号: {order.orderNo}</p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
            order.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
            order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">产品信息</h2>
            <div className="flex">
              {order.product.images[0] && (
                <img
                  src={order.product.images[0]}
                  alt={order.product.title}
                  className="mr-4 h-32 w-32 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{order.product.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{order.product.description}</p>
                <div className="mt-2 flex gap-4 text-sm text-gray-500">
                  <span>📍 {order.product.location}</span>
                  <span>⏱ {order.product.duration}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">参与人信息</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">孩子姓名</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.childName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">孩子年龄</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.childAge} 岁</dd>
              </div>
              <div>
                <dt className="text-gray-500">联系人</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.contactName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">联系电话</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.contactPhone}</dd>
              </div>
              <div>
                <dt className="text-gray-500">参与人数</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.participantCount} 人</dd>
              </div>
              <div>
                <dt className="text-gray-500">预订日期</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.bookingDate}</dd>
              </div>
              {order.remark && (
                <div className="col-span-2">
                  <dt className="text-gray-500">备注</dt>
                  <dd className="mt-1 font-medium text-gray-900">{order.remark}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* User Info */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">用户信息</h2>
            <dl className="text-sm">
              <div className="mb-2">
                <dt className="text-gray-500">用户昵称</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.user.nickname}</dd>
              </div>
              <div>
                <dt className="text-gray-500">手机号</dt>
                <dd className="mt-1 font-medium text-gray-900">{order.user.phone || '未绑定'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Amount */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">订单金额</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">订单总额</span>
                <span className="font-medium">¥{Number(order.totalAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已支付</span>
                <span className="font-medium text-green-600">¥{Number(order.paidAmount).toLocaleString()}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">支付时间</span>
                  <span className="font-medium">{new Date(order.paidAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">操作</h2>
            <div className="space-y-3">
              {order.status === 'PAID' && (
                <>
                  <button
                    onClick={() => updateStatus('COMPLETED')}
                    disabled={isUpdating}
                    className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    标记为已完成
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/refunds?orderId=${order.id}`)}
                    className="w-full rounded-md border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    处理退款
                  </button>
                </>
              )}
              {order.status === 'PENDING' && (
                <button
                  onClick={() => updateStatus('CANCELLED')}
                  disabled={isUpdating}
                  className="w-full rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  取消订单
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">订单时间线</h2>
            <div className="space-y-4 text-sm">
              <div className="flex">
                <div className="mr-3 flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600">
                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">订单创建</p>
                  <p className="text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
              {order.paidAt && (
                <div className="flex">
                  <div className="mr-3 flex-shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600">
                      <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">支付成功</p>
                    <p className="text-gray-500">{new Date(order.paidAt).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
