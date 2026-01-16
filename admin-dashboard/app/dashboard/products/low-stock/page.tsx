'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Product {
  id: number;
  title: string;
  price: string;
  stock: number;
  lowStock: boolean;
  category: { id: number; name: string };
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
}

/**
 * Low Stock Products Page
 */
export default function LowStockPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  async function fetchLowStockProducts() {
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ data: Product[] }>('/admin/products/low-stock');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch low stock products:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/products')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 返回产品列表
        </button>
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-gray-900">低库存产品</h1>
          <p className="mt-1 text-sm text-gray-500">库存少于 10 件的产品列表</p>
        </div>
      </div>

      {/* Low Stock Products Table */}
      {isLoading ? (
        <div className="animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">产品</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">价格</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">库存</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    暂无低库存产品
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.title}</div>
                      <div className="text-xs text-gray-500">ID: {product.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        product.lowStock ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.stock} 件
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        product.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                        product.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status === 'PUBLISHED' ? '已发布' :
                         product.status === 'DRAFT' ? '草稿' : '未发布'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
