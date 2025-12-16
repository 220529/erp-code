/**
 * @flowKey gqdykf0m7yworrgw
 * @flowName payment_confirm
 * @description 确认收款
 * @updateTime 2025-12-16 16:50:35
 */

// 解构上下文
const { repositories, params, dataSource } = context;
const { paymentRepository, orderRepository } = repositories;

// 参数校验
if (!params.paymentId) {
  throw new Error('收款记录ID不能为空');
}

// 查询收款记录
const payment = await paymentRepository.findOne({
  where: { id: params.paymentId },
});
if (!payment) {
  throw new Error('收款记录不存在');
}

// 检查收款状态
if (payment.status === 'confirmed') {
  throw new Error('该收款记录已确认，无需重复操作');
}
if (payment.status === 'cancelled') {
  throw new Error('该收款记录已取消，无法确认');
}

// 使用事务更新收款状态和订单已收金额
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 更新收款状态为已确认
  await queryRunner.manager.update('Payment', params.paymentId, {
    status: 'confirmed',
    paidAt: params.paidAt || new Date(),
  });

  // 查询订单当前已收金额
  const order = await orderRepository.findOne({
    where: { id: payment.orderId },
  });
  if (!order) {
    throw new Error('关联的订单不存在');
  }

  // 累加订单已收金额
  const newPaidAmount = Number(order.paidAmount) + Number(payment.amount);

  await queryRunner.manager.update('Order', payment.orderId, {
    paidAmount: newPaidAmount,
  });

  await queryRunner.commitTransaction();

  // 返回结果
  return {
    success: true,
    data: {
      paidAmount: newPaidAmount,
      totalAmount: order.totalAmount,
      unpaidAmount: Number(order.totalAmount) - newPaidAmount,
    },
    message: '收款确认成功',
  };
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
