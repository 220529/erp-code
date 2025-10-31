/**
 * @flowKey typ6ew4ht513htdf
 * @flowName order_material_update
 * @description 更新订单明细
 * @updateTime 2025-10-31 11:38:02
 */

// 解构上下文
const { repositories, params, dataSource } = context;
const { orderMaterialRepository } = repositories;

// 参数校验
if (!params.orderMaterialId) {
  throw new Error('订单明细ID不能为空');
}
if (!params.quantity || params.quantity <= 0) {
  throw new Error('数量必须大于0');
}
if (!params.price || params.price < 0) {
  throw new Error('单价不能为负数');
}

// 查询订单明细
const orderMaterial = await orderMaterialRepository.findOne({
  where: { id: params.orderMaterialId },
});
if (!orderMaterial) {
  throw new Error('订单明细不存在');
}

const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 计算新的小计金额
  const newAmount = Number(params.quantity) * Number(params.price);

  // 更新订单明细
  await queryRunner.manager.update('OrderMaterial', params.orderMaterialId, {
    quantity: params.quantity,
    price: params.price,
    amount: newAmount,
  });

  // 查询该订单所有明细，重新计算订单总金额
  const allMaterials = await queryRunner.manager
    .createQueryBuilder('OrderMaterial', 'om')
    .where('om.orderId = :orderId', { orderId: orderMaterial.orderId })
    .getMany();

  const totalAmount = allMaterials.reduce((sum, m) => {
    return sum + Number(m.amount);
  }, 0);

  // 更新订单总金额
  await queryRunner.manager.update('Order', orderMaterial.orderId, {
    totalAmount: totalAmount,
  });

  await queryRunner.commitTransaction();

  return {
    success: true,
    data: {
      amount: newAmount,
      totalAmount: totalAmount,
    },
    message: '订单明细更新成功',
  };
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
