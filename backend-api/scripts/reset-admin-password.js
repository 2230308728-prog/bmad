const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const hashedPassword = await bcrypt.hash('Admin123456', 10);

    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { password: hashedPassword }
    });

    console.log('✅ 管理员密码已重置为: Admin123456');
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
