/**
 * 调试工具：查看当前页面的所有元素
 */

const CONFIG = {
  apiBaseUrl: 'http://localhost:3000',
  androidSettingsPackage: 'com.android.settings',
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
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('获取设备...');
  const devices = await getDevices();
  const device = devices[0];
  console.log(`使用设备: ${device.name}\n`);
  
  console.log('启动设置应用...');
  await launchApp(device.id, CONFIG.androidSettingsPackage);
  await sleep(2000);
  console.log('应用已启动\n');
  
  console.log('获取页面元素...');
  const elements = await getElements(device.id);
  console.log(`找到 ${elements.length} 个元素:\n`);
  
  elements.forEach((el, index) => {
    console.log(`元素 ${index + 1}:`);
    console.log(`  类型: ${el.type}`);
    console.log(`  文本: ${el.text || '(无)'}`);
    console.log(`  标签: ${el.label || '(无)'}`);
    if (el.bounds) {
      console.log(`  位置: x=${el.bounds.x}, y=${el.bounds.y}`);
      console.log(`  大小: w=${el.bounds.width}, h=${el.bounds.height}`);
    } else {
      console.log(`  位置: (无边界信息)`);
    }
    console.log('');
  });
}

main().catch(console.error);
