# Requirements Document

## Introduction

本文档定义了 Mobile MCP 浏览器 Web 界面的需求。该功能将使用户能够通过 Web 浏览器访问和控制移动设备自动化测试，而无需通过命令行或 MCP 客户端。Web 界面将提供设备管理、实时屏幕查看、交互控制和测试脚本执行等功能。

## Glossary

- **Web Interface**: 基于浏览器的用户界面，用于与 Mobile MCP 服务器交互
- **Mobile MCP Server**: 现有的移动设备自动化服务器，提供 MCP 工具和设备控制功能
- **Device Panel**: 显示已连接设备列表的界面组件
- **Control Panel**: 提供设备交互控制的界面组件
- **Screenshot Stream**: 实时或定期更新的设备屏幕截图显示
- **WebSocket Connection**: 用于实时双向通信的网络连接
- **REST API**: 用于 HTTP 请求/响应的 API 接口
- **Session**: 用户与特定设备的交互会话

## Requirements

### Requirement 1

**User Story:** 作为移动测试工程师，我希望通过浏览器访问 Mobile MCP 服务器，以便无需安装额外的客户端工具即可进行设备管理和测试。

#### Acceptance Criteria

1. WHEN a user navigates to the Web Interface URL THEN the system SHALL display a connection status indicator and available devices list
2. WHEN the Web Interface loads THEN the system SHALL establish a connection to the Mobile MCP Server within 5 seconds
3. WHEN the connection fails THEN the system SHALL display an error message with reconnection options
4. WHEN the user is on an unsupported browser THEN the system SHALL display a warning message indicating minimum browser requirements
5. THE Web Interface SHALL support Chrome 90+, Firefox 88+, Safari 14+, and Edge 90+

### Requirement 2

**User Story:** 作为用户，我希望查看所有可用的移动设备，以便选择要控制的目标设备。

#### Acceptance Criteria

1. WHEN the Web Interface connects to the server THEN the system SHALL retrieve and display all available devices including simulators, emulators, and real devices
2. WHEN displaying device information THEN the system SHALL show device name, platform (iOS/Android), type (simulator/emulator/real), and connection status
3. WHEN a new device connects THEN the system SHALL update the device list automatically within 3 seconds
4. WHEN a device disconnects THEN the system SHALL update the device status and notify the user
5. WHEN no devices are available THEN the system SHALL display a helpful message with instructions on how to connect devices

### Requirement 3

**User Story:** 作为用户，我希望选择一个设备并查看其实时屏幕，以便了解设备当前状态。

#### Acceptance Criteria

1. WHEN a user selects a device from the list THEN the system SHALL display the device screen within 2 seconds
2. WHEN displaying the device screen THEN the system SHALL show the current screenshot with actual dimensions and scale information
3. WHEN the device screen updates THEN the system SHALL refresh the screenshot automatically at a configurable interval (default 1 second)
4. WHEN the user requests a manual refresh THEN the system SHALL capture and display a new screenshot immediately
5. WHEN screenshot capture fails THEN the system SHALL display an error message and retry automatically

### Requirement 4

**User Story:** 作为用户，我希望通过点击屏幕截图来与设备交互，以便直观地控制设备。

#### Acceptance Criteria

1. WHEN a user clicks on the device screenshot THEN the system SHALL calculate the correct coordinates and send a tap command to the device
2. WHEN the screenshot is scaled THEN the system SHALL correctly map click coordinates to actual device coordinates
3. WHEN a tap command is executed THEN the system SHALL provide visual feedback and update the screenshot within 1 second
4. WHEN a user performs a long press (holds for 500ms) THEN the system SHALL send a long press command to the device
5. WHEN a user performs a swipe gesture THEN the system SHALL detect the direction and distance and send the appropriate swipe command

### Requirement 5

**User Story:** 作为用户，我希望使用虚拟按钮控制设备，以便执行常见的设备操作。

#### Acceptance Criteria

1. WHEN the Control Panel is displayed THEN the system SHALL show buttons for HOME, BACK (Android only), VOLUME_UP, VOLUME_DOWN, and ENTER
2. WHEN a user clicks a control button THEN the system SHALL send the corresponding command to the device immediately
3. WHEN a button command is executing THEN the system SHALL disable the button and show a loading indicator
4. WHEN a button command completes THEN the system SHALL re-enable the button and update the device screen
5. WHERE the device is Android TV THEN the system SHALL additionally display DPAD_CENTER, DPAD_UP, DPAD_DOWN, DPAD_LEFT, and DPAD_RIGHT buttons

### Requirement 6

**User Story:** 作为用户，我希望输入文本到设备，以便填写表单或搜索内容。

#### Acceptance Criteria

1. WHEN the user types in the text input field THEN the system SHALL buffer the input locally
2. WHEN the user presses Enter or clicks Send THEN the system SHALL send the complete text to the device
3. WHEN text is being sent THEN the system SHALL show a sending indicator
4. WHEN text input completes THEN the system SHALL clear the input field and update the device screen
5. WHEN the user enables "Submit after send" option THEN the system SHALL send an ENTER command after the text

### Requirement 7

**User Story:** 作为用户，我希望查看设备上的 UI 元素列表，以便了解可交互的元素及其属性。

#### Acceptance Criteria

1. WHEN the user requests element list THEN the system SHALL call mobile_list_elements_on_screen and display results in a structured format
2. WHEN displaying elements THEN the system SHALL show type, text, label, coordinates, and dimensions for each element
3. WHEN the user clicks an element in the list THEN the system SHALL highlight the corresponding area on the screenshot
4. WHEN the user double-clicks an element in the list THEN the system SHALL send a tap command to that element's coordinates
5. WHEN no elements are found THEN the system SHALL display a message indicating the screen has no accessible elements

### Requirement 8

**User Story:** 作为用户，我希望管理设备上的应用程序，以便安装、启动、终止和卸载应用。

#### Acceptance Criteria

1. WHEN the user opens the app management panel THEN the system SHALL display a list of installed apps with names and package identifiers
2. WHEN the user selects "Launch" for an app THEN the system SHALL call mobile_launch_app with the package name
3. WHEN the user selects "Terminate" for a running app THEN the system SHALL call mobile_terminate_app with the package name
4. WHEN the user uploads an app file (.apk, .ipa, .app, .zip) THEN the system SHALL call mobile_install_app with the file path
5. WHEN the user selects "Uninstall" for an app THEN the system SHALL prompt for confirmation and call mobile_uninstall_app

### Requirement 9

**User Story:** 作为用户，我希望执行预定义的测试脚本，以便自动化复杂的测试流程。

#### Acceptance Criteria

1. WHEN the user opens the script panel THEN the system SHALL display available test scripts and an editor for creating new scripts
2. WHEN the user creates a script THEN the system SHALL provide syntax highlighting and autocomplete for available MCP tools
3. WHEN the user executes a script THEN the system SHALL run each command sequentially and display progress
4. WHEN a script command executes THEN the system SHALL show the command, parameters, and result in a log panel
5. WHEN a script encounters an error THEN the system SHALL pause execution, highlight the failing command, and display the error message

### Requirement 10

**User Story:** 作为用户，我希望保存和加载会话配置，以便快速恢复之前的工作状态。

#### Acceptance Criteria

1. WHEN the user saves a session THEN the system SHALL store the selected device, screenshot refresh rate, and open panels
2. WHEN the user loads a saved session THEN the system SHALL restore the device selection and UI configuration
3. WHEN the user closes the browser THEN the system SHALL automatically save the current session to local storage
4. WHEN the user returns to the Web Interface THEN the system SHALL offer to restore the last session
5. WHEN session restoration fails THEN the system SHALL display the default interface and notify the user

### Requirement 11

**User Story:** 作为开发者，我希望 Web 界面通过 REST API 和 WebSocket 与 Mobile MCP Server 通信，以便实现高效的实时交互。

#### Acceptance Criteria

1. THE system SHALL expose REST API endpoints for device listing, app management, and command execution
2. THE system SHALL use WebSocket connections for real-time screenshot streaming and event notifications
3. WHEN a REST API request is made THEN the system SHALL return responses in JSON format with appropriate HTTP status codes
4. WHEN a WebSocket connection is established THEN the system SHALL send a connection confirmation message
5. WHEN the WebSocket connection drops THEN the system SHALL attempt to reconnect automatically with exponential backoff

### Requirement 12

**User Story:** 作为系统管理员，我希望配置 Web 服务器的端口和访问控制，以便安全地部署服务。

#### Acceptance Criteria

1. WHEN starting the Web Interface server THEN the system SHALL read configuration from environment variables or a config file
2. THE system SHALL support configuring the HTTP port (default 3000) and WebSocket port (default 3001)
3. WHERE authentication is enabled THEN the system SHALL require valid credentials before allowing access
4. WHEN CORS is configured THEN the system SHALL enforce the specified origin restrictions
5. WHEN HTTPS is enabled THEN the system SHALL use the provided SSL certificate and key files
