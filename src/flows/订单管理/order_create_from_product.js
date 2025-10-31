/**
 * @flowKey lid8klr7nkv9fic1
 * @flowName order_create_from_product
 * @description 从产品套餐创建订单，并自动复制套餐物料到订单明细
 * @updateTime 2025-10-31 11:39:42
 */

// 解构上下文
const { repositories, params, dataSource } = context;
const {
  productRepository,
  productMaterialRepository,
  orderRepository,
  orderMaterialRepository,
  customerRepository,
} = repositories;

// 参数校验
if (!params.customerId) {
  throw new Error('客户ID不能为空');
}
if (!params.productId) {
  throw new Error('产品套餐ID不能为空');
}

// 获取套餐信息
const product = await productRepository.findOne({
  where: { id: params.productId },
});
if (!product) {
  throw new Error('产品套餐不存在');
}

// 获取套餐物料
const productMaterials = await productMaterialRepository.find({
  where: { productId: params.productId },
});
if (!productMaterials || productMaterials.length === 0) {
  throw new Error('产品套餐物料为空，请先配置套餐物料');
}

// 验证客户是否存在
const customer = await customerRepository.findOne({
  where: { id: params.customerId },
});
if (!customer) {
  throw new Error('客户不存在');
}

// 生成订单编号（DD + 日期 + 随机数）
const dateStr = dayjs().format('YYYYMMDD');
const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
const orderNo = `DD${dateStr}${random}`;

// 使用事务创建订单
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 创建订单
  const order = queryRunner.manager.create('Order', {
    orderNo,
    customerId: params.customerId,
    totalAmount: product.salePrice,
    costAmount: product.costPrice,
    paidAmount: 0,
    status: 'draft',
    remark: params.remark || '',
  });
  await queryRunner.manager.save(order);

  // 复制套餐物料到订单明细
  for (const pm of productMaterials) {
    const orderMaterial = queryRunner.manager.create('OrderMaterial', {
      orderId: order.id,
      materialId: pm.materialId,
      materialName: pm.materialName,
      category: pm.category,
      quantity: pm.quantity,
      unit: pm.unit,
      price: pm.price,
      amount: pm.amount,
    });
    await queryRunner.manager.save(orderMaterial);
  }

  // 更新客户状态为已报价
  await queryRunner.manager.update('Customer', params.customerId, {
    status: 'quoted',
  });

  await queryRunner.commitTransaction();

  return {
    success: true,
    data: {
      orderId: order.id,
      orderNo: order.orderNo,
      totalAmount: order.totalAmount,
    },
    message: '订单创建成功',
  };
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
