'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Product {
  id: number;
  title: string;
  description: string;
  categoryId: number;
  price: string;
  originalPrice: string | null;
  stock: number;
  minAge: number;
  maxAge: number;
  duration: string;
  location: string;
  images: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
  featured: boolean;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

/**
 * Edit Product Page
 */
export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [productId]);

  async function fetchProduct() {
    try {
      const response = await apiClient.get<{ data: Product }>(`/admin/products/${productId}`);
      setProduct(response.data.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      setIsLoadingCategories(true);
      const response = await apiClient.get<{ data: Category[] }>('/admin/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      alert('加载分类失败');
    } finally {
      setIsLoadingCategories(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    setIsSubmitting(true);

    try {
      await apiClient.patch(`/admin/products/${productId}`, product);
      router.push('/dashboard/products');
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('更新产品失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg bg-white p-6 shadow">
        <div className="h-96 rounded bg-gray-200"></div>
      </div>
    );
  }

  if (!product) {
    return <div>产品不存在</div>;
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
        <h1 className="mt-2 text-2xl font-bold text-gray-900">编辑产品</h1>
        <p className="text-sm text-gray-500">ID: {product.id}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">基本信息</h2>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">产品标题 *</label>
                <input
                  type="text"
                  required
                  value={product.title}
                  onChange={(e) => setProduct({ ...product, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">产品描述 *</label>
                <textarea
                  required
                  rows={6}
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Category & Price */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">分类与价格</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">产品分类 *</label>
                {isLoadingCategories ? (
                  <select
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50"
                  >
                    <option>加载中...</option>
                  </select>
                ) : (
                  <select
                    required
                    value={product.categoryId}
                    onChange={(e) => setProduct({ ...product, categoryId: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">售价 *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={product.price}
                  onChange={(e) => setProduct({ ...product, price: String(parseFloat(e.target.value)) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">原价</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={product.originalPrice || ''}
                  onChange={(e) => setProduct({
                    ...product,
                    originalPrice: e.target.value ? String(parseFloat(e.target.value)) : null
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">库存数量 *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={product.stock}
                  onChange={(e) => setProduct({ ...product, stock: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">详细信息</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">最小年龄</label>
                  <input
                    type="number"
                    min="0"
                    value={product.minAge}
                    onChange={(e) => setProduct({ ...product, minAge: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">最大年龄</label>
                  <input
                    type="number"
                    min="0"
                    value={product.maxAge}
                    onChange={(e) => setProduct({ ...product, maxAge: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">活动时长 *</label>
                <input
                  type="text"
                  required
                  value={product.duration}
                  onChange={(e) => setProduct({ ...product, duration: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">活动地点 *</label>
                <input
                  type="text"
                  required
                  value={product.location}
                  onChange={(e) => setProduct({ ...product, location: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">产品图片</label>
                <div className="mt-2 space-y-2">
                  {product.images.map((image, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <img src={image} alt="" className="h-16 w-16 rounded object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = product.images.filter((_, i) => i !== index);
                          setProduct({ ...product, images: newImages });
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">发布设置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">状态</label>
                <select
                  value={product.status}
                  onChange={(e) => setProduct({ ...product, status: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  <option value="DRAFT">草稿</option>
                  <option value="PUBLISHED">发布</option>
                  <option value="UNPUBLISHED">下架</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={product.featured}
                  onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                  设为推荐产品
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/products')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? '保存中...' : '保存更改'}
          </button>
        </div>
      </form>
    </div>
  );
}
