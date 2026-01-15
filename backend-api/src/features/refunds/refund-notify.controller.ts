import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { WechatPayService, WechatRefundNotifyData } from '../payments/wechat-pay.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RefundStatus } from '@prisma/client';
import { RefundNotifyRequestDto } from './dto/refund-notify.dto';

/**
 * 退款回调控制器
 * 处理微信支付退款回调通知
 * 无需认证（微信服务器直接调用）
 */
@ApiTags('Refund Notification')
@Controller('api/v1/refunds')
export class RefundNotifyController {
  private readonly logger = new Logger(RefundNotifyController.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 微信支付退款回调通知端点
   * 微信服务器调用此端点通知退款结果
   */
  @Post('payment/notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '接收微信支付退款回调通知',
    description: '微信服务器调用此端点通知退款结果（无需认证）',
    externalDocs: {
      description: '微信支付退款通知文档',
      url: 'https://pay.weixin.qq.com/wiki/doc/api/index.html',
    },
  })
  @ApiBody({ type: RefundNotifyRequestDto })
  @ApiResponse({
    status: 200,
    description: '处理成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'SUCCESS' },
        message: { type: 'string', example: '成功' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '签名验证失败或数据格式错误',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'FAIL' },
        message: { type: 'string', example: '失败原因' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: '服务器内部错误',
  })
  async handleRefundNotify(@Body() notifyDto: RefundNotifyRequestDto) {
    this.logger.log(
      `收到微信退款回调通知 [refundNo: ${notifyDto.resource.associated_data}]`,
    );

    try {
      // 验证签名
      const isValid = await this.wechatPayService.verifyNotify(
        notifyDto.timestamp,
        notifyDto.nonce,
        JSON.stringify(notifyDto),
        notifyDto.signature,
        notifyDto.serial,
      );

      if (!isValid) {
        this.logger.warn('微信退款回调签名验证失败');
        return {
          code: 'FAIL',
          message: '签名验证失败',
        };
      }

      // 解密回调数据
      const decryptedData = this.wechatPayService.decipherNotify(
        notifyDto.resource.ciphertext,
        notifyDto.resource.associated_data,
        notifyDto.resource.nonce,
      ) as WechatRefundNotifyData;

      const refundNo = decryptedData.out_refund_no;
      const wechatRefundId = decryptedData.refund_id;
      const status = decryptedData.status; // SUCCESS, ABNORMAL, PROCESSING

      this.logger.log(
        `微信退款回调数据解密成功 [refundNo: ${refundNo}, wechatRefundId: ${wechatRefundId}, status: ${status}]`,
      );

      // 查询退款记录
      const refundRecord = await this.prisma.refundRecord.findUnique({
        where: { refundNo },
        include: { order: true },
      });

      if (!refundRecord) {
        this.logger.warn(`退款记录不存在: ${refundNo}`);
        return {
          code: 'FAIL',
          message: '退款记录不存在',
        };
      }

      // 幂等性处理：如果退款已完成或失败，直接返回成功
      if (
        refundRecord.status === RefundStatus.COMPLETED ||
        refundRecord.status === RefundStatus.FAILED
      ) {
        this.logger.log(
          `退款已处理，跳过重复回调 [refundNo: ${refundNo}, currentStatus: ${refundRecord.status}]`,
        );
        return {
          code: 'SUCCESS',
          message: '成功',
        };
      }

      // 处理不同的退款状态
      if (status === 'SUCCESS') {
        // 退款成功
        const updatedRefund = await this.prisma.refundRecord.update({
          where: { id: refundRecord.id },
          data: {
            status: RefundStatus.COMPLETED,
            wechatRefundId,
            refundedAt: new Date(),
          },
        });

        this.logger.log(
          `退款成功，状态已更新为 COMPLETED [refundNo: ${refundNo}, wechatRefundId: ${wechatRefundId}]`,
        );

        // Story 5.7: 发送退款完成通知
        // NOTE: 通知发送失败不影响主流程（记录日志即可）
        try {
          await this.notificationsService.sendRefundResultNotification(
            refundRecord.userId,
            'COMPLETED',
            refundRecord.refundNo,
            parseFloat(refundRecord.amount.toString()),
            refundRecord.reason || undefined,
            undefined,
            updatedRefund.refundedAt || undefined,
          );
        } catch (notificationError) {
          this.logger.warn(
            `退款完成通知发送失败（不影响主流程）: refundNo=${refundNo}, error=${notificationError}`,
          );
        }
      } else if (status === 'ABNORMAL') {
        // 退款异常
        await this.prisma.refundRecord.update({
          where: { id: refundRecord.id },
          data: {
            status: RefundStatus.FAILED,
            wechatRefundId,
          },
        });

        this.logger.warn(
          `退款异常，状态已更新为 FAILED [refundNo: ${refundNo}, wechatRefundId: ${wechatRefundId}]`,
        );

        // NOTE: 用户通知将在 Story 5.7（微信订阅消息通知）中实现
        // NOTE: 管理员通知需要管理员手动处理
      } else if (status === 'PROCESSING') {
        // 退款处理中，不更新状态，等待后续回调
        this.logger.log(
          `退款处理中，等待后续回调 [refundNo: ${refundNo}, wechatRefundId: ${wechatRefundId}]`,
        );
      }

      // 返回成功响应给微信
      return {
        code: 'SUCCESS',
        message: '成功',
      };
    } catch (error) {
      this.logger.error(
        `处理微信退款回调失败: ${(error as Error).message}`,
        error,
      );
      return {
        code: 'FAIL',
        message: '处理失败',
      };
    }
  }
}
