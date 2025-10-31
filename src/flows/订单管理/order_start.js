/**
 * @flowKey k1a5idbnul59ti8m
 * @flowName order_start
 * @description 订单开工
 * @updateTime 2025-10-31 11:39:06
 */

// 解构上下文
const { repositories, params } = context;
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
if (order.status !== 'signed') {
  throw new Error(`订单当前状态为${order.status}，只有已签约的订单才能开工`);
}

// 更新订单状态和开工时间
await orderRepository.update(params.orderId, {
  status: 'in_progress',
  foremanId: params.foremanId || null,
  startedAt: new Date(),
});

return {
  success: true,
  message: '订单已开工',
};
