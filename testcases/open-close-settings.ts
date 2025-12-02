/**
 * 测试用例：打开和关闭设置应用 30 次
 * 
 * 使用 Web API 与设备交互
 * 
 * 运行方式：
 * 1. 启动 Web 服务器: node start-web.js
 * 2. 运行测试: npx ts-node testcases/open-close-settings.ts
 */

export {}; // Make this file a module to avoid global scope conflicts

// 配置参数
const CONFIG = {
  apiBaseUrl: 'http://localhost:3000',
  androidSettingsPackage: 'com.android.settings',
  iosSettingsBundle: 'com.apple.Preferences',
  iterations: 30,
  waitAfterLaunch: 2000,
  waitAfterTerminate: 1000,
};

interface Device {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  type: string;
  status: string;
}

interface TestResult {
  iteration: number;
  launchTime: number;
  terminateTime: number;
  success: boolean;
  error?: string;
}

/**
 * 获取所有设备
 */
async function getDevices(): Promise<Device[]> {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/devices`);
  if (!response.ok) {
    throw new Error(`Failed to get devices: ${response.status}`);
  }
  const data = await response.json() as { devices: Device[] };
  return data.devices || [];
}

/**
 * 启动应用
 */
async function launchApp(deviceId: string, packageName: string): Promise<void> {
  const response = await fetch(
    `${CONFIG.apiBaseUrl}/api/devices/${deviceId}/apps/${packageName}/launch`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || `Failed to launch app: ${response.status}`);
  }
}

/**
 * 关闭应用
 */
async function terminateApp(deviceId: string, packageName: string): Promise<void> {
  const response = await fetch(
    `${CONFIG.apiBaseUrl}/api/devices/${deviceId}/apps/${packageName}/terminate`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || `Failed to terminate app: ${response.status}`);
  }
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化时间戳
 */
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * 打印日志
 */
function log(message: string): void {
  console.log(`[${formatTimestamp()}] ${message}`);
}

/**
 * 主测试函数
 */
async function runTest() {
  log('========================================');
  log('测试用例：打开关闭设置应用 30 次 (API 版本)');
  log('========================================');
  log(`API 地址: ${CONFIG.apiBaseUrl}`);
  log('');

  // 1. 检查 API 连接
  try {
    const healthResponse = await fetch(`${CONFIG.apiBaseUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error('API 服务器未响应');
    }
    log('✓ API 服务器连接正常');
  } catch (error) {
    log('✗ 无法连接到 API 服务器');
    log('请确保 Web 服务器正在运行: node start-web.js');
    process.exit(1);
  }

  // 2. 获取设备列表
  log('正在获取设备列表...');
  const devices = await getDevices();

  if (devices.length === 0) {
    log('错误：未检测到任何设备');
    process.exit(1);
  }

  log(`检测到 ${devices.length} 个设备：`);
  devices.forEach((device, index) => {
    log(`  ${index + 1}. ${device.name} (${device.platform} ${device.type})`);
  });

  // 3. 选择第一个设备
  const device = devices[0];
  log(`\n使用设备: ${device.name} (${device.id})`);

  // 4. 确定应用包名
  const packageName = device.platform === 'android' 
    ? CONFIG.androidSettingsPackage 
    : CONFIG.iosSettingsBundle;

  log(`目标应用: ${packageName}`);
  log(`测试次数: ${CONFIG.iterations}`);
  log('');

  // 5. 执行测试
  const results: TestResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 1; i <= CONFIG.iterations; i++) {
    log(`[${i}/${CONFIG.iterations}] 开始测试...`);

    const result: TestResult = {
      iteration: i,
      launchTime: 0,
      terminateTime: 0,
      success: false,
    };

    try {
      // 启动应用
      const launchStart = Date.now();
      await launchApp(device.id, packageName);
      result.launchTime = Date.now() - launchStart;
      log(`  ✓ 启动应用成功 (${result.launchTime}ms)`);

      // 等待应用完全启动
      await sleep(CONFIG.waitAfterLaunch);

      // 关闭应用
      const terminateStart = Date.now();
      await terminateApp(device.id, packageName);
      result.terminateTime = Date.now() - terminateStart;
      log(`  ✓ 关闭应用成功 (${result.terminateTime}ms)`);

      // 等待应用完全关闭
      await sleep(CONFIG.waitAfterTerminate);

      result.success = true;
      successCount++;
      log(`  ✓ 第 ${i} 次测试完成`);

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      failCount++;
      log(`  ✗ 第 ${i} 次测试失败: ${result.error}`);
    }

    results.push(result);
    log('');
  }

  // 6. 输出测试结果
  log('========================================');
  log('测试完成！');
  log('========================================');
  log(`总测试次数: ${CONFIG.iterations}`);
  log(`成功: ${successCount}`);
  log(`失败: ${failCount}`);
  log(`成功率: ${((successCount / CONFIG.iterations) * 100).toFixed(2)}%`);
  log('');

  // 7. 计算性能统计
  const successResults = results.filter(r => r.success);
  if (successResults.length > 0) {
    const launchTimes = successResults.map(r => r.launchTime);
    const terminateTimes = successResults.map(r => r.terminateTime);

    const avgLaunch = launchTimes.reduce((a, b) => a + b, 0) / launchTimes.length;
    const minLaunch = Math.min(...launchTimes);
    const maxLaunch = Math.max(...launchTimes);

    const avgTerminate = terminateTimes.reduce((a, b) => a + b, 0) / terminateTimes.length;
    const minTerminate = Math.min(...terminateTimes);
    const maxTerminate = Math.max(...terminateTimes);

    log('性能统计：');
    log('启动时间：');
    log(`  平均: ${avgLaunch.toFixed(2)}ms`);
    log(`  最快: ${minLaunch}ms`);
    log(`  最慢: ${maxLaunch}ms`);
    log('');
    log('关闭时间：');
    log(`  平均: ${avgTerminate.toFixed(2)}ms`);
    log(`  最快: ${minTerminate}ms`);
    log(`  最慢: ${maxTerminate}ms`);
  }

  // 8. 输出失败详情
  if (failCount > 0) {
    log('');
    log('失败详情：');
    results.filter(r => !r.success).forEach(r => {
      log(`  第 ${r.iteration} 次: ${r.error}`);
    });
  }

  log('');
  log('测试结束');
}

// 运行测试
runTest().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
