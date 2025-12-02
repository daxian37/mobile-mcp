/**
 * 测试用例：设置应用滑动遍历
 * 
 * 由于元素坐标信息不完整，使用滑动方式遍历设置页面
 * 
 * 运行方式：
 * 1. 启动 Web 服务器: node start-web.js
 * 2. 运行测试: npx ts-node testcases/settings-swipe-traversal.ts
 */

const CONFIG = {
  apiBaseUrl: 'http://localhost:3000',
  androidSettingsPackage: 'com.android.settings',
  swipeCount: 10,                 // 滑动次数
  waitAfterSwipe: 1000,           // 滑动后等待时间
  screenshotDelay: 1000,          // 截图延迟（改为1秒）
  operationDelay: 1000,           // 每次操作之间的间隔（1秒）
};

interface Device {
  id: string;
  name: string;
  platform: 'ios' | 'android';
}

interface ElementInfo {
  type: string;
  text?: string;
  label?: string;
}

async function getDevices(): Promise<Device[]> {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/devices`);
  const data = await response.json() as { devices: Device[] };
  return data.devices || [];
}

async function launchApp(deviceId: string, packageName: string): Promise<void> {
  const response = await fetch(
    `${CONFIG.apiBaseUrl}/api/devices/${deviceId}/apps/${packageName}/launch`,
    { method: 'POST' }
  );
  if (!response.ok) {
    throw new Error(`Failed to launch app`);
  }
}

async function getElements(deviceId: string): Promise<ElementInfo[]> {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/devices/${deviceId}/elements`);
  if (!response.ok) {
    throw new Error(`Failed to get elements`);
  }
  const data = await response.json() as { elements: ElementInfo[] };
  return data.elements || [];
}

async function swipe(deviceId: string, direction: string): Promise<void> {
  const response = await fetch(
    `${CONFIG.apiBaseUrl}/api/devices/${deviceId}/swipe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to swipe`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message: string): void {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`[${now}] ${message}`);
}

function getPageFingerprint(elements: ElementInfo[]): string {
  return elements
    .map(e => e.text || e.label || '')
    .filter(t => t.length > 0)
    .sort()
    .join('|');
}

async function main() {
  log('========================================');
  log('测试用例：设置应用滑动遍历');
  log('========================================');
  log(`滑动次数: ${CONFIG.swipeCount}`);
  log('');
  
  // 获取设备
  log('正在获取设备列表...');
  const devices = await getDevices();
  const device = devices[0];
  log(`✓ 使用设备: ${device.name}`);
  log('');
  
  // 启动应用
  log('正在启动设置应用...');
  await launchApp(device.id, CONFIG.androidSettingsPackage);
  await sleep(2000);
  log('✓ 应用已启动');
  log('');
  
  // 统计信息
  const uniquePages = new Set<string>();
  const allMenuItems = new Set<string>();
  let totalSwipes = 0;
  
  log('🚀 开始遍历...');
  log('');
  
  // 向下滑动遍历
  for (let i = 0; i < CONFIG.swipeCount; i++) {
    log(`📄 [${i + 1}/${CONFIG.swipeCount}] 获取当前页面内容...`);
    
    // 操作前等待1秒
    await sleep(CONFIG.operationDelay);
    
    await sleep(CONFIG.screenshotDelay);
    
    try {
      const elements = await getElements(device.id);
      const fingerprint = getPageFingerprint(elements);
      
      // 收集菜单项
      const menuItems = elements
        .filter(e => e.text && e.text.length > 0 && e.text.length < 50)
        .map(e => e.text!);
      
      menuItems.forEach(item => allMenuItems.add(item));
      
      log(`  ✓ 发现 ${elements.length} 个元素，${menuItems.length} 个菜单项`);
      
      if (menuItems.length > 0) {
        log(`  📋 菜单项: ${menuItems.slice(0, 5).join(', ')}${menuItems.length > 5 ? '...' : ''}`);
      }
      
      // 检查是否是新页面
      if (uniquePages.has(fingerprint)) {
        log(`  ⏭️  页面重复，停止滑动`);
        break;
      }
      
      uniquePages.add(fingerprint);
      
      // 向下滑动
      if (i < CONFIG.swipeCount - 1) {
        log(`  ⬇️  向下滑动...`);
        await sleep(CONFIG.operationDelay); // 滑动前等待1秒
        await swipe(device.id, 'down');
        totalSwipes++;
        await sleep(CONFIG.waitAfterSwipe);
      }
      
    } catch (error) {
      log(`  ❌ 错误: ${error}`);
    }
    
    log('');
  }
  
  // 输出统计结果
  log('========================================');
  log('遍历完成！');
  log('========================================');
  log('');
  
  log('📊 统计信息：');
  log(`  唯一页面数: ${uniquePages.size}`);
  log(`  总滑动次数: ${totalSwipes}`);
  log(`  发现菜单项: ${allMenuItems.size} 个`);
  log('');
  
  log('📋 所有菜单项列表：');
  const sortedItems = Array.from(allMenuItems).sort();
  sortedItems.forEach((item, index) => {
    log(`  ${index + 1}. ${item}`);
  });
  log('');
  
  log('✅ 测试结束');
}

main().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
