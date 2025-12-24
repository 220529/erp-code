/**
 * @flowKey jttr7xbnuxmu8ggd
 * @flowName order_complete
 * @description 订单完工，更新订单和客户状态为已完工
 * @updateTime 2025-12-24 16:07:06
 */

// 解构上下文
const { repositories, params, dataSource } = context;
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
if (order.status !== 'in_progress') {
  throw new Error(`订单当前状态为${order.status}，只有施工中的订单才能完工`);
}

// 使用事务更新订单和客户状态
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 更新订单状态和完工时间
  await queryRunner.manager.update('Order', params.orderId, {
    status: 'completed',
    completedAt: new Date(),
  });

  // 更新客户状态为已完工
  await queryRunner.manager.update('Customer', order.customerId, {
    status: 'completed',
  });

  await queryRunner.commitTransaction();

  // 返回结果
  return {
    success: true,
    data: {},
    message: '订单已完工',
  };
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
