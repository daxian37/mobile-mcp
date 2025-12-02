# Mobile MCP 测试用例

这个目录包含了各种自动化测试脚本，用于测试移动设备的功能和性能。

## 目录结构

```
testcases/
├── README.md                        # 本文件
├── QUICKSTART.md                    # 快速开始指南
├── open-close-settings-api.ts       # 打开关闭设置应用测试
└── .gitignore                       # Git 忽略文件
```

## 如何运行测试

### 前提条件

1. 确保 Web 服务器正在运行：
   ```bash
   node start-web.js
   ```

2. 确保至少有一个设备已连接

### 运行测试

```bash
npx ts-node testcases/open-close-settings.ts
```

## 创建新的测试用例

1. 在 `testcases/` 目录下创建新的 `.ts` 文件
2. 参考 `open-close-settings.ts` 的结构
3. 使用 HTTP API 与设备交互
4. 运行测试

## 示例测试用例

- `open-close-settings.ts` - 打开和关闭设置应用 30 次，测试应用启动性能

## API 端点

测试脚本使用以下 API 端点：

- `GET /api/devices` - 获取设备列表
- `POST /api/devices/:deviceId/apps/:packageName/launch` - 启动应用
- `POST /api/devices/:deviceId/apps/:packageName/terminate` - 关闭应用
- `POST /api/devices/:deviceId/tap` - 点击屏幕
- `POST /api/devices/:deviceId/swipe` - 滑动屏幕
- `POST /api/devices/:deviceId/keys` - 输入文本

完整 API 文档请参考：[frontend/API_DOCUMENTATION.md](../frontend/API_DOCUMENTATION.md)

## 注意事项

- 确保设备已连接并可被检测到
- 某些测试可能需要特定的应用已安装
- 测试脚本会输出详细的日志信息
- 所有测试都通过 Web API 运行，无需编译
