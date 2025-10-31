/**
 * @flowKey n5sru9z5tfc2r4s0
 * @flowName kx
 * @description 测试验证
 * @updateTime 2025-10-30 15:34:59
 */

// 解构上下文
const { repositories, params, user } = context;

// 参数校验
console.log('这是一个测试流程...........kx', user);

// 业务逻辑
// ...

// 返回结果
return {
  success: true,
  data: {},
  message: '操作成功',
};
