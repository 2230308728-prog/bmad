import { Module, Global } from '@nestjs/common';
import { PrismaService } from './lib/prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
