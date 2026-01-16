'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Product {
  id: number;
  title: string;
  price: string;
  originalPrice: string | null;
  stock: number;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  category: { id: number; name: string };
  images: string[];
  createdAt: string;
}

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  pageSize: number;
  meta?: {
    timestamp: string;
    version: string;
  };
}

/**
 * Products List Page
 */
export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 20 });

  useEffect(() => {
    fetchProducts();
  }, [pagination.page]);

  async function fetchProducts() {
    try {
      setIsLoading(true);
      const response = await apiClient.get<ProductsResponse>(
        `/admin/products?page=${pagination.page}&pageSize=20`
      );
      setProducts(response.data?.data || []);
      setPagination({
        page: response.data?.page || 1,
        total: response.data?.total || 0,
        pageSize: response.data?.pageSize || 20,
        totalPages: Math.ceil((response.data?.total || 0) / (response.data?.pageSize || 20))
      });
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(productId: number, currentStatus: string) {
    const newStatus = currentStatus === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED';
    if (!confirm(`确定要将产品状态更改为${newStatus === 'PUBLISHED' ? '已发布' : '未发布'}吗？`)) {
      return;
    }

    try {
      await apiClient.patch(`/admin/products/${productId}/status`, { status: newStatus });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to update product status:', error);
      alert('更新产品状态失败');
    }
  }

  async function handleDelete(productId: number) {
    if (!confirm('确定要删除此产品吗？删除后无法恢复！')) {
      return;
    }

    try {
      await apiClient.delete(`/admin/products/${productId}`);
      await fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除产品失败');
    }
  }

  async function handleStockUpdate(productId: number, currentStock: number) {
    const newStock = prompt('请输入新的库存数量：', currentStock.toString());
    if (newStock === null || newStock === '') {
      return;
    }

    const stockNum = parseInt(newStock);
    if (isNaN(stockNum) || stockNum < 0) {
      alert('请输入有效的库存数量（≥0）');
      return;
    }

    try {
      await apiClient.patch(`/admin/products/${productId}/stock`, { stock: stockNum });
      await fetchProducts();
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('更新库存失败');
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理平台上的所有研学产品</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/products/new')}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          新增产品
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => router.push('/dashboard/products/low-stock')}
            className="rounded-md border border-orange-300 bg-orange-50 px-3 py-1 text-sm text-orange-600 hover:bg-orange-100"
          >
            查看低库存产品
          </button>
          <select className="rounded-md border-gray-300 text-sm">
            <option value="">全部状态</option>
            <option value="PUBLISHED">已发布</option>
            <option value="DRAFT">草稿</option>
            <option value="UNPUBLISHED">未发布</option>
          </select>
          <select className="rounded-md border-gray-300 text-sm">
            <option value="">全部分类</option>
          </select>
          <input
            type="text"
            placeholder="搜索产品名称..."
            className="rounded-md border-gray-300 text-sm"
          />
        </div>
      </div>

      {/* Products Table */}
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
              {(products || []).map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {product.images[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="mr-4 h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                        <div className="text-xs text-gray-500">ID: {product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ¥{Number(product.price).toLocaleString()}
                    {product.originalPrice && (
                      <span className="ml-2 text-xs text-gray-500 line-through">
                        ¥{Number(product.originalPrice).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{product.stock}</span>
                      <button
                        onClick={() => handleStockUpdate(product.id, product.stock)}
                        className="text-xs text-blue-600 hover:text-blue-900"
                      >
                        更新库存
                      </button>
                    </div>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleStatusChange(product.id, product.status)}
                        className="text-green-600 hover:text-green-900"
                      >
                        {product.status === 'PUBLISHED' ? '下架' : product.status === 'UNPUBLISHED' ? '发布' : '发布'}
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        删除
                      </button>
                    </div>
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
