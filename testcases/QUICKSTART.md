# 快速开始

## 前提条件

1. 确保 Mobile MCP Web 服务器正在运行：
   ```bash
   node start-web.js
   ```

2. 确保至少有一个设备已连接（Android 真机、模拟器或 iOS 模拟器）

## 运行测试

### 步骤 1：启动 Web 服务器

在一个终端中启动 Web 服务器：

```bash
node start-web.js
```

你应该看到类似的输出：
```
CORS enabled with origins: *
Serving static files from /path/to/mobile-mcp/frontend/dist
HTTP server enabled
Web server listening on port 3000
WebSocket server listening on port 3001
Mobile MCP Web Interface started successfully
Web server started successfully!
HTTP server: http://localhost:3000
WebSocket server: ws://localhost:3001
```

### 步骤 2：运行测试

在另一个终端中运行测试：

```bash
npx ts-node testcases/open-close-settings.ts
```

### 为什么使用 Web API？

**优点：**
- ✅ 开箱即用，无需编译
- ✅ 不需要直接访问设备管理器
- ✅ 可以远程运行测试
- ✅ 与 Web 界面使用相同的 API
- ✅ 更稳定可靠
- ✅ 易于调试和维护

## 修改测试参数

编辑测试文件中的 `CONFIG` 对象：

```typescript
const CONFIG = {
  // Android 设置应用包名
  androidSettingsPackage: 'com.android.settings',
  // iOS 设置应用 Bundle ID
  iosSettingsBundle: 'com.apple.Preferences',
  // 测试次数
  iterations: 30,  // 修改这里改变测试次数
  // 每次操作后的等待时间（毫秒）
  waitAfterLaunch: 2000,
  waitAfterTerminate: 1000,
};
```

## 测试输出示例

```
[2024-12-02 10:30:00] ========================================
[2024-12-02 10:30:00] 测试用例：打开关闭设置应用 30 次
[2024-12-02 10:30:00] ========================================
[2024-12-02 10:30:00] API 地址: http://localhost:3000
[2024-12-02 10:30:00] 
[2024-12-02 10:30:00] ✓ API 服务器连接正常
[2024-12-02 10:30:00] 正在获取设备列表...
[2024-12-02 10:30:00] 检测到 1 个设备：
[2024-12-02 10:30:00]   1. e7880948 (android real)
[2024-12-02 10:30:00] 
[2024-12-02 10:30:00] 使用设备: e7880948 (e7880948)
[2024-12-02 10:30:00] 目标应用: com.android.settings
[2024-12-02 10:30:00] 测试次数: 30
[2024-12-02 10:30:00] 
[2024-12-02 10:30:00] [1/30] 开始测试...
[2024-12-02 10:30:01]   ✓ 启动应用成功 (1234ms)
[2024-12-02 10:30:03]   ✓ 关闭应用成功 (567ms)
[2024-12-02 10:30:04]   ✓ 第 1 次测试完成
...
[2024-12-02 10:35:00] ========================================
[2024-12-02 10:35:00] 测试完成！
[2024-12-02 10:35:00] ========================================
[2024-12-02 10:35:00] 总测试次数: 30
[2024-12-02 10:35:00] 成功: 30
[2024-12-02 10:35:00] 失败: 0
[2024-12-02 10:35:00] 成功率: 100.00%
[2024-12-02 10:35:00] 
[2024-12-02 10:35:00] 性能统计：
[2024-12-02 10:35:00] 启动时间：
[2024-12-02 10:35:00]   平均: 1250.50ms
[2024-12-02 10:35:00]   最快: 1100ms
[2024-12-02 10:35:00]   最慢: 1500ms
[2024-12-02 10:35:00] 
[2024-12-02 10:35:00] 关闭时间：
[2024-12-02 10:35:00]   平均: 580.25ms
[2024-12-02 10:35:00]   最快: 500ms
[2024-12-02 10:35:00]   最慢: 700ms
```

## 创建自定义测试

1. 复制现有测试文件作为模板
2. 修改测试逻辑
3. 运行测试

示例：创建一个测试滑动操作的脚本

```typescript
// testcases/swipe-test.ts
import { getAllDevices, getRobotForDevice, sleep, log } from './utils/device-helper.js';

async function runTest() {
  const devices = await getAllDevices();
  const robot = await getRobotForDevice(devices[0]);
  
  // 向上滑动 10 次
  for (let i = 0; i < 10; i++) {
    await robot.swipe('up');
    await sleep(1000);
  }
}

runTest();
```

## 故障排除

### 错误：无法连接到 API 服务器

确保 Web 服务器正在运行：
```bash
node start-web.js
```

### 错误：未检测到任何设备

- Android: 运行 `adb devices` 检查设备连接
- iOS: 运行 `xcrun simctl list` 检查模拟器状态

### 错误：应用启动失败

- 检查应用包名是否正确
- 确保应用已安装在设备上
- 查看服务器日志获取详细错误信息
