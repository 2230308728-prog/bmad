-- CreateProductStatus
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED');

-- CreateProductCategory
CREATE TABLE "product_categories" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateProduct
CREATE TABLE "products" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "original_price" DECIMAL(10,2),
    "stock" INTEGER DEFAULT 0 NOT NULL,
    "min_age" INTEGER DEFAULT 3 NOT NULL,
    "max_age" INTEGER DEFAULT 18 NOT NULL,
    "duration" VARCHAR(100) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "images" TEXT[] DEFAULT '{}' NOT NULL,  -- 默认空数组
    "status" "ProductStatus" DEFAULT 'DRAFT' NOT NULL,
    "featured" BOOLEAN DEFAULT false NOT NULL,
    "view_count" INTEGER DEFAULT 0 NOT NULL,
    "booking_count" INTEGER DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE INDEX "products_status_featured_idx" ON "products"("status", "featured");

-- CreateIndex: 全文搜索索引（用于产品标题搜索）
CREATE INDEX "products_title_fulltext_idx" ON "products" USING gin(to_tsvector('simple', title));

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
