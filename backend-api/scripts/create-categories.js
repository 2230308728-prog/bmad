const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createProductCategories() {
  try {
    console.log('🌱 开始创建产品分类...\n');

    const categories = [
      { id: 1, name: '自然科学', description: '包括科技馆、博物馆、自然探索等科学类研学活动' },
      { id: 2, name: '历史文化', description: '包括博物馆、古迹、传统文化体验等历史文化类研学活动' },
      { id: 3, name: '艺术体验', description: '包括艺术工坊、创意设计、表演艺术等艺术类研学活动' },
    ];

    for (const category of categories) {
      const existing = await prisma.productCategory.findUnique({
        where: { id: category.id }
      });

      if (existing) {
        console.log(`⚠️  分类 ID ${category.id} 已存在，跳过创建`);
      } else {
        await prisma.productCategory.create({
          data: category
        });
        console.log(`✅ 创建分类: ${category.name} (ID: ${category.id})`);
      }
    }

    console.log('\n📊 当前分类列表:');
    const allCategories = await prisma.productCategory.findMany();
    allCategories.forEach(cat => {
      console.log(`   - ID: ${cat.id}, 名称: ${cat.name}`);
    });

    console.log('\n✨ 产品分类创建完成！');
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createProductCategories();
