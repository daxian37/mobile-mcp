/**
 * 测试用例：设置应用5级页面遍历
 * 
 * 目的：
 * - 遍历设置应用的所有可点击元素
 * - 测试页面覆盖率
 * - 发现潜在的崩溃或卡顿问题
 * - 收集页面层级结构数据
 * 
 * 运行方式：
 * 1. 启动 Web 服务器: node start-web.js
 * 2. 运行测试: npx ts-node testcases/settings-page-traversal.ts
 */

// 配置参数
const CONFIG = {
  apiBaseUrl: 'http://localhost:3000',
  androidSettingsPackage: 'com.android.settings',
  iosSettingsBundle: 'com.apple.Preferences',
  maxDepth: 5,                    // 最大遍历深度
  waitAfterClick: 1500,           // 点击后等待时间（毫秒）
  waitAfterBack: 800,             // 返回后等待时间（毫秒）
  screenshotDelay: 500,           // 截图延迟（毫秒）
  maxElementsPerPage: 20,         // 每页最多点击元素数
};

interface Device {
  id: string;
  name: string;
  platform: 'ios' | 'android';
  type: string;
  status: string;
}

interface ElementInfo {
  type: string;
  text?: string;
  label?: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface PageNode {
  depth: number;
  path: string[];
  elementCount: number;
  clickableCount: number;
  timestamp: string;
  screenshot?: string;
}

interface TraversalStats {
  totalPages: number;
  totalClicks: number;
  totalBackActions: number;
  uniquePages: Set<string>;
  pagesByDepth: Map<number, number>;
  errors: Array<{ depth: number; path: string[]; error: string }>;
}

// API 辅助函数
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
    const error = await response.json() as { message?: string };
    throw new Error(error.message || `Failed to launch app`);
  }
}

async function getElements(deviceId: string): Promise<ElementInfo[]> {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/devices/${deviceId}/elements`);
  if (!response.ok) {
    throw new Error(`Failed to get elements: ${response.status}`);
  }
  const data = await response.json() as { elements: ElementInfo[] };
  return data.elements || [];
}

async function tapElement(deviceId: string, x: number, y: number): Promise<void> {
  const response = await fetch(
    `${CONFIG.apiBaseUrl}/api/devices/${deviceId}/tap`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to tap: ${response.status}`);
  }
}

async function pressBack(deviceId: string): Promise<void> {
  const response = await fetch(
    `${CONFIG.apiBaseUrl}/api/devices/${deviceId}/button`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ button: 'BACK' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to press back: ${response.status}`);
  }
}

async function getScreenshot(deviceId: string): Promise<string> {
  const response = await fetch(`${CONFIG.apiBaseUrl}/api/devices/${deviceId}/screenshot`);
  if (!response.ok) {
    throw new Error(`Failed to get screenshot: ${response.status}`);
  }
  const data = await response.json() as { screenshot: string };
  return data.screenshot;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message: string, indent: number = 0): void {
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const indentation = '  '.repeat(indent);
  console.log(`[${now}] ${indentation}${message}`);
}

// 判断元素是否可点击
function isClickable(element: ElementInfo): boolean {
  // 必须有有效的边界
  if (!element.bounds || element.bounds.width === 0 || element.bounds.height === 0) {
    return false;
  }
  
  // 必须在屏幕可见区域内（允许一些负值，因为可能有部分可见）
  if (element.bounds.y < -100) {
    return false;
  }
  
  // 元素太小，可能不可点击
  if (element.bounds.width < 20 || element.bounds.height < 20) {
    return false;
  }
  
  // 有文本或标签的元素通常是可点击的
  if (element.text && element.text.trim().length > 0) {
    return true;
  }
  
  if (element.label && element.label.trim().length > 0) {
    return true;
  }
  
  // 按钮类型总是可点击
  if (element.type && element.type.toLowerCase().includes('button')) {
    return true;
  }
  
  return false;
}

// 生成页面指纹（用于去重）
function getPageFingerprint(elements: ElementInfo[]): string {
  const clickableElements = elements.filter(isClickable);
  const texts = clickableElements
    .map(e => e.text || e.label || e.type)
    .sort()
    .join('|');
  return texts;
}

// 获取元素描述
function getElementDescription(element: ElementInfo): string {
  if (element.text) return `"${element.text}"`;
  if (element.label) return `[${element.label}]`;
  return `<${element.type}>`;
}

// 深度优先遍历
async function traversePage(
  deviceId: string,
  depth: number,
  path: string[],
  stats: TraversalStats,
  visitedPages: Set<string>
): Promise<void> {
  
  if (depth > CONFIG.maxDepth) {
    log(`已达到最大深度 ${CONFIG.maxDepth}，停止遍历`, depth);
    return;
  }
  
  log(`📄 当前深度: ${depth}, 路径: ${path.join(' > ') || '根页面'}`, depth);
  
  // 等待页面加载
  await sleep(CONFIG.screenshotDelay);
  
  // 获取当前页面元素
  let elements: ElementInfo[];
  try {
    elements = await getElements(deviceId);
  } catch (error) {
    log(`⚠️  获取元素失败: ${error}`, depth);
    stats.errors.push({ depth, path: [...path], error: String(error) });
    return;
  }
  
  // 生成页面指纹
  const fingerprint = getPageFingerprint(elements);
  
  // 检查是否已访问过此页面
  if (visitedPages.has(fingerprint)) {
    log(`⏭️  页面已访问过，跳过`, depth);
    return;
  }
  
  visitedPages.add(fingerprint);
  stats.uniquePages.add(fingerprint);
  
  // 统计信息
  const clickableElements = elements.filter(isClickable);
  stats.totalPages++;
  stats.pagesByDepth.set(depth, (stats.pagesByDepth.get(depth) || 0) + 1);
  
  log(`✓ 发现 ${elements.length} 个元素，其中 ${clickableElements.length} 个可点击`, depth);
  
  // 限制每页点击的元素数量
  const elementsToClick = clickableElements.slice(0, CONFIG.maxElementsPerPage);
  
  if (elementsToClick.length === 0) {
    log(`ℹ️  没有可点击元素，返回上一页`, depth);
    return;
  }
  
  // 遍历可点击元素
  for (let i = 0; i < elementsToClick.length; i++) {
    const element = elementsToClick[i];
    const elementDesc = getElementDescription(element);
    
    log(`🖱️  [${i + 1}/${elementsToClick.length}] 点击: ${elementDesc}`, depth);
    
    try {
      // 计算点击坐标（元素中心点）
      const x = element.bounds.x + element.bounds.width / 2;
      const y = element.bounds.y + element.bounds.height / 2;
      
      // 点击元素
      await tapElement(deviceId, x, y);
      stats.totalClicks++;
      
      // 等待页面响应
      await sleep(CONFIG.waitAfterClick);
      
      // 递归遍历下一层
      const newPath = [...path, elementDesc];
      await traversePage(deviceId, depth + 1, newPath, stats, visitedPages);
      
      // 返回上一页
      log(`⬅️  返回上一页`, depth);
      await pressBack(deviceId);
      stats.totalBackActions++;
      
      // 等待返回动画完成
      await sleep(CONFIG.waitAfterBack);
      
    } catch (error) {
      log(`❌ 操作失败: ${error}`, depth);
      stats.errors.push({
        depth,
        path: [...path, elementDesc],
        error: String(error),
      });
      
      // 尝试恢复：返回上一页
      try {
        await pressBack(deviceId);
        await sleep(CONFIG.waitAfterBack);
      } catch (backError) {
        log(`❌ 返回失败: ${backError}`, depth);
      }
    }
  }
}

// 主测试函数
async function runTest() {
  log('========================================');
  log('测试用例：设置应用5级页面遍历');
  log('========================================');
  log(`最大深度: ${CONFIG.maxDepth}`);
  log(`每页最多点击: ${CONFIG.maxElementsPerPage} 个元素`);
  log('');
  
  // 获取设备
  log('正在获取设备列表...');
  const devices = await getDevices();
  
  if (devices.length === 0) {
    log('❌ 错误：未检测到设备');
    return;
  }
  
  const device = devices[0];
  log(`✓ 使用设备: ${device.name} (${device.platform})`);
  
  // 确定应用包名
  const packageName = device.platform === 'android'
    ? CONFIG.androidSettingsPackage
    : CONFIG.iosSettingsBundle;
  
  log(`✓ 目标应用: ${packageName}`);
  log('');
  
  // 启动应用
  log('正在启动设置应用...');
  await launchApp(device.id, packageName);
  await sleep(2000); // 等待应用完全启动
  log('✓ 应用已启动');
  log('');
  
  // 初始化统计信息
  const stats: TraversalStats = {
    totalPages: 0,
    totalClicks: 0,
    totalBackActions: 0,
    uniquePages: new Set(),
    pagesByDepth: new Map(),
    errors: [],
  };
  
  const visitedPages = new Set<string>();
  const startTime = Date.now();
  
  // 开始遍历
  log('🚀 开始页面遍历...');
  log('');
  
  try {
    await traversePage(device.id, 0, [], stats, visitedPages);
  } catch (error) {
    log(`❌ 遍历过程中发生错误: ${error}`);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // 输出统计结果
  log('');
  log('========================================');
  log('遍历完成！');
  log('========================================');
  log(`总耗时: ${duration} 秒`);
  log('');
  
  log('📊 统计信息：');
  log(`  总页面数: ${stats.totalPages}`);
  log(`  唯一页面数: ${stats.uniquePages.size}`);
  log(`  总点击次数: ${stats.totalClicks}`);
  log(`  总返回次数: ${stats.totalBackActions}`);
  log('');
  
  log('📈 各层级页面分布：');
  for (let i = 0; i <= CONFIG.maxDepth; i++) {
    const count = stats.pagesByDepth.get(i) || 0;
    if (count > 0) {
      log(`  第 ${i} 层: ${count} 个页面`);
    }
  }
  log('');
  
  // 计算覆盖率指标
  const avgClicksPerPage = stats.totalPages > 0
    ? (stats.totalClicks / stats.totalPages).toFixed(2)
    : '0';
  const uniqueRatio = stats.totalPages > 0
    ? ((stats.uniquePages.size / stats.totalPages) * 100).toFixed(2)
    : '0';
  
  log('📊 覆盖率指标：');
  log(`  平均每页点击数: ${avgClicksPerPage}`);
  log(`  页面去重率: ${uniqueRatio}%`);
  log('');
  
  // 输出错误信息
  if (stats.errors.length > 0) {
    log('⚠️  错误列表：');
    stats.errors.forEach((error, index) => {
      log(`  ${index + 1}. [深度 ${error.depth}] ${error.path.join(' > ')}`);
      log(`     错误: ${error.error}`);
    });
    log('');
  } else {
    log('✅ 没有发生错误');
    log('');
  }
  
  log('测试结束');
}

// 运行测试
runTest().catch(error => {
  console.error('测试执行出错:', error);
  process.exit(1);
});
