# Desktop App Finder - Integration Guide

## 📋 Overview

This document explains how the Desktop App Finder integrates with the Mobile MCP project and how to use it in your automation workflows.

## 🔗 Integration with Mobile MCP

The Desktop App Finder complements Mobile MCP's existing tools by providing:

1. **Smart App Discovery**: Automatically finds apps on the home screen
2. **Coordinate-based Launching**: Uses UI hierarchy for precise tapping
3. **Fallback Mechanisms**: Multiple strategies to ensure app launch success

## 🎯 Use Cases

### 1. Automated Testing
```bash
#!/bin/bash
# Test app launch performance

for i in {1..10}; do
    echo "Test run $i"
    time ./find-and-launch-app.sh "MyApp" "com.example.app"
    adb shell am force-stop com.example.app
    sleep 2
done
```

### 2. Integration with Mobile MCP Tools

You can combine Desktop App Finder with Mobile MCP tools:

```bash
#!/bin/bash
# Launch app and interact with it

# Step 1: Find and launch app
./find-and-launch-app.sh "Settings" "com.android.settings"

# Step 2: Use Mobile MCP tools (via MCP client)
# - Take screenshot
# - List elements
# - Interact with UI elements
```

### 3. Node.js Integration

```javascript
const { execSync } = require('child_process');
const path = require('path');

class DesktopAppFinder {
    constructor(scriptsPath) {
        this.scriptsPath = scriptsPath || path.join(__dirname, 'examples/desktop-app-finder');
    }

    launchApp(appName, packageName, activity = '') {
        const scriptPath = path.join(this.scriptsPath, 'find-and-launch-app.sh');
        const args = [appName, packageName];
        if (activity) args.push(activity);
        
        try {
            const result = execSync(
                `"${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`,
                { encoding: 'utf8', cwd: this.scriptsPath }
            );
            return { success: true, output: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    demoSettings() {
        const scriptPath = path.join(this.scriptsPath, 'demo-open-close-settings.sh');
        try {
            const result = execSync(`"${scriptPath}"`, {
                encoding: 'utf8',
                cwd: this.scriptsPath
            });
            return { success: true, output: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Usage
const finder = new DesktopAppFinder();

// Launch Settings app
const result = finder.launchApp('Settings', 'com.android.settings');
console.log(result);

// Run demo
const demo = finder.demoSettings();
console.log(demo);
```

### 4. Python Integration

```python
import subprocess
import os

class DesktopAppFinder:
    def __init__(self, scripts_path=None):
        self.scripts_path = scripts_path or os.path.join(
            os.path.dirname(__file__), 
            'examples/desktop-app-finder'
        )
    
    def launch_app(self, app_name, package_name, activity=''):
        script_path = os.path.join(self.scripts_path, 'find-and-launch-app.sh')
        args = [script_path, app_name, package_name]
        if activity:
            args.append(activity)
        
        try:
            result = subprocess.run(
                args,
                cwd=self.scripts_path,
                capture_output=True,
                text=True,
                check=True
            )
            return {'success': True, 'output': result.stdout}
        except subprocess.CalledProcessError as e:
            return {'success': False, 'error': e.stderr}
    
    def demo_settings(self):
        script_path = os.path.join(self.scripts_path, 'demo-open-close-settings.sh')
        try:
            result = subprocess.run(
                [script_path],
                cwd=self.scripts_path,
                capture_output=True,
                text=True,
                check=True
            )
            return {'success': True, 'output': result.stdout}
        except subprocess.CalledProcessError as e:
            return {'success': False, 'error': e.stderr}

# Usage
finder = DesktopAppFinder()

# Launch Settings app
result = finder.launch_app('Settings', 'com.android.settings')
print(result)

# Run demo
demo = finder.demo_settings()
print(demo)
```

## 🔄 Workflow Integration

### CI/CD Pipeline

```yaml
# .github/workflows/android-test.yml
name: Android App Test

on: [push, pull_request]

jobs:
  test:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Start Android Emulator
        run: |
          emulator -avd test_device -no-window -no-audio &
          adb wait-for-device
          adb shell input keyevent 82  # Unlock screen
      
      - name: Install Mobile MCP
        run: npm install
      
      - name: Test App Launch
        run: |
          cd examples/desktop-app-finder
          chmod +x *.sh
          ./find-and-launch-app.sh "Settings" "com.android.settings"
      
      - name: Capture Screenshot
        if: always()
        run: |
          adb shell screencap -p /sdcard/test.png
          adb pull /sdcard/test.png
      
      - name: Upload Artifacts
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: screenshots
          path: test.png
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install'
                sh 'adb devices'
            }
        }
        
        stage('Test App Launch') {
            steps {
                dir('examples/desktop-app-finder') {
                    sh 'chmod +x *.sh'
                    sh './find-and-launch-app.sh "MyApp" "com.example.app"'
                }
            }
        }
        
        stage('Verify') {
            steps {
                sh 'adb shell dumpsys window | grep -i "mCurrentFocus"'
            }
        }
    }
    
    post {
        always {
            sh 'adb shell screencap -p /sdcard/result.png'
            sh 'adb pull /sdcard/result.png'
            archiveArtifacts artifacts: 'result.png'
        }
    }
}
```

## 🛠️ Advanced Usage

### Custom Swipe Configuration

Edit the scripts to customize swipe behavior:

```bash
# In find-and-launch-app.sh or demo-open-close-settings.sh

# Change maximum swipes
MAX_SWIPES=10  # Default is 5

# Change swipe speed (milliseconds)
adb shell input swipe $start_x $y $end_x $y 500  # Slower
adb shell input swipe $start_x $y $end_x $y 200  # Faster

# Change swipe distance (percentage of screen width)
local start_x=$(( width * 90 / 100 ))  # Start from 90%
local end_x=$(( width * 10 / 100 ))    # End at 10%
```

### Multi-Device Support

```bash
#!/bin/bash
# Launch app on multiple devices

DEVICES=$(adb devices | grep -w "device" | awk '{print $1}')

for device in $DEVICES; do
    echo "Launching on device: $device"
    DEVICE=$device ./find-and-launch-app.sh "Settings" "com.android.settings"
done
```

### Retry Logic

```bash
#!/bin/bash
# Retry app launch with exponential backoff

MAX_RETRIES=3
RETRY_COUNT=0
WAIT_TIME=2

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if ./find-and-launch-app.sh "MyApp" "com.example.app"; then
        echo "Success!"
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Attempt $RETRY_COUNT failed. Waiting ${WAIT_TIME}s..."
        sleep $WAIT_TIME
        WAIT_TIME=$((WAIT_TIME * 2))
    fi
done

echo "Failed after $MAX_RETRIES attempts"
exit 1
```

## 📊 Monitoring and Logging

### Add Logging

```bash
#!/bin/bash
# Enhanced logging

LOG_FILE="app_launch_$(date +%Y%m%d_%H%M%S).log"

{
    echo "=== App Launch Log ==="
    echo "Date: $(date)"
    echo "Device: $(adb devices | grep -w device | head -1)"
    echo ""
    
    ./find-and-launch-app.sh "MyApp" "com.example.app"
    
    echo ""
    echo "=== End Log ==="
} 2>&1 | tee "$LOG_FILE"
```

### Performance Metrics

```bash
#!/bin/bash
# Measure performance

START_TIME=$(date +%s%N)

./find-and-launch-app.sh "MyApp" "com.example.app"

END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Launch time: ${DURATION}ms"

# Log to file
echo "$(date),MyApp,${DURATION}" >> performance.csv
```

## 🔐 Security Considerations

1. **ADB Security**: Ensure ADB is only accessible on trusted networks
2. **Script Permissions**: Keep scripts executable only by authorized users
3. **Package Names**: Validate package names to prevent injection attacks
4. **Temporary Files**: Scripts clean up temporary files automatically

## 🤝 Contributing

To add new features to Desktop App Finder:

1. Create a new script in `examples/desktop-app-finder/`
2. Add documentation to `docs/desktop-app-finder/`
3. Update the main README
4. Add tests if applicable
5. Submit a pull request

## 📚 Related Documentation

- [Desktop App Finder README](README.md)
- [Mobile MCP Main README](../../README.md)
- [Project Structure](../../PROJECT_STRUCTURE.md)
- [Chinese Documentation](../../docs/desktop-app-finder/)

---

**Last Updated**: 2024-11-27  
**Version**: 1.0.0
