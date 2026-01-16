const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAndCreateAdmin() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    console.log(`✅ 数据库连接成功`);
    console.log(`📊 当前管理员数量: ${adminCount}`);

    if (adminCount > 0) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: {
          id: true,
          email: true,
          nickname: true,
          role: true,
          status: true
        }
      });
      console.log(`📋 现有管理员列表:`);
      admins.forEach(admin => {
        console.log(`   - ID: ${admin.id}, Email: ${admin.email}, 昵称: ${admin.nickname}, 状态: ${admin.status}`);
      });
    } else {
      console.log(`⚠️  没有管理员用户，正在创建默认管理员...`);

      const hashedPassword = await bcrypt.hash('Admin123456', 10);

      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          password: hashedPassword,
          nickname: '管理员',
          name: '系统管理员',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });

      console.log(`✅ 默认管理员创建成功!`);
      console.log(`   邮箱: admin@example.com`);
      console.log(`   密码: Admin123456`);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateAdmin();
