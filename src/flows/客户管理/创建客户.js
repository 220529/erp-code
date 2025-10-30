/**
 * @flowKey customer/create
 * @flowName 创建客户
 * @description 创建客户并记录初次跟进
 * @updateTime 2025-01-29 19:00:00
 */

// ============================================
// 1. 解构上下文
// ============================================
const { repositories, params, user } = context;
const { customerRepository, customerFollowRepository } = repositories;

// ============================================
// 2. 参数校验
// ============================================
const { name, phone, contact, source, address } = params;

if (!name) {
  throw new Error('客户名称不能为空');
}

if (!phone) {
  throw new Error('联系电话不能为空');
}

// ============================================
// 3. 检查客户是否已存在
// ============================================
const existingCustomer = await customerRepository.findOne({
  where: { phone },
});

if (existingCustomer) {
  throw new Error(`该电话号码已存在客户: ${existingCustomer.name}`);
}

// ============================================
// 4. 创建客户
// ============================================
const customer = await customerRepository.save({
  name,
  phone,
  contact: contact || name,
  source: source || '其他',
  address: address || '',
  status: 1, // 1-潜在客户
  createdBy: user.id,
});

// ============================================
// 5. 创建首次跟进记录
// ============================================
await customerFollowRepository.save({
  customerId: customer.id,
  customerName: customer.name,
  type: 'init',
  content: '客户创建',
  followBy: user.id,
});

// ============================================
// 6. 返回结果
// ============================================
return {
  success: true,
  data: {
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
  },
  message: '客户创建成功',
};
