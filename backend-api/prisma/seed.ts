import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库初始化...\n');

  // 1. 创建默认管理员
  console.log('📋 检查管理员账户...');
  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin123456'; // 生产环境应该使用环境变量

  let admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!admin) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        nickname: '管理员',
        name: '系统管理员',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log(`✅ 创建默认管理员: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`✅ 管理员已存在: ${admin.email}`);
  }

  // 2. 创建产品分类
  console.log('\n📂 检查产品分类...');
  const categories = [
    {
      id: 1,
      name: '自然科学',
      description: '包括科技馆、博物馆、自然探索等科学类研学活动',
    },
    {
      id: 2,
      name: '历史文化',
      description: '包括博物馆、古迹、传统文化体验等历史文化类研学活动',
    },
    {
      id: 3,
      name: '艺术体验',
      description: '包括艺术工坊、创意设计、表演艺术等艺术类研学活动',
    },
  ];

  for (const categoryData of categories) {
    const existing = await prisma.productCategory.findUnique({
      where: { id: categoryData.id },
    });

    if (!existing) {
      await prisma.productCategory.create({
        data: categoryData,
      });
      console.log(`✅ 创建分类: ${categoryData.name} (ID: ${categoryData.id})`);
    } else {
      console.log(`✅ 分类已存在: ${categoryData.name} (ID: ${categoryData.id})`);
    }
  }

  console.log('\n✨ 数据库初始化完成！');
  console.log('\n📊 初始数据概览:');
  const [userCount, categoryCount] = await Promise.all([
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.productCategory.count(),
  ]);
  console.log(`   - 管理员: ${userCount} 个`);
  console.log(`   - 产品分类: ${categoryCount} 个`);
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
