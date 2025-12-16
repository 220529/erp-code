/**
 * @flowKey ux5vzv7qq5gw5z38
 * @flowName order_sign
 * @description 订单签约
 * @updateTime 2025-12-16 16:46:06
 */

// 解构上下文
const { repositories, params, user, dataSource } = context;
const { orderRepository } = repositories;

// 参数校验
if (!params.orderId) {
  throw new Error('订单ID不能为空');
}

// 查询订单
const order = await orderRepository.findOne({
  where: { id: params.orderId },
});
if (!order) {
  throw new Error('订单不存在');
}

// 检查订单状态
if (order.status !== 'pending') {
  throw new Error(`订单当前状态为${order.status}，只有待签约状态的订单才能签约`);
}

const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 更新订单状态为已签约
  await queryRunner.manager.update('Order', params.orderId, {
    status: 'signed',
    signedAt: new Date(),
  });

  // 如果有定金金额，创建定金收款记录
  if (params.depositAmount && params.depositAmount > 0) {
    // 生成收款单号（SK + 日期 + 随机数）
    const dateStr = dayjs().format('YYYYMMDD');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    const paymentNo = `SK${dateStr}${random}`;

    const payment = queryRunner.manager.create('Payment', {
      paymentNo,
      orderId: params.orderId,
      type: 'deposit',
      amount: params.depositAmount,
      method: params.paymentMethod || 'cash',
      status: 'pending',
      createdBy: user?.id || 1,
    });
    await queryRunner.manager.save(payment);
  }

  // 更新客户状态为已签约
  await queryRunner.manager.update('Customer', order.customerId, {
    status: 'signed',
  });

  await queryRunner.commitTransaction();

  return {
    success: true,
    message: '订单签约成功',
  };
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
