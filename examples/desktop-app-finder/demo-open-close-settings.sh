#!/bin/bash

# 演示脚本：在 Android 设备上打开和关闭设置应用
# 功能：在桌面上查找设置应用图标，如果找不到则左右滑动查找

echo "🚀 开始演示：在桌面查找并打开设置应用"
echo ""

# 检查设备连接
echo "📱 检查连接的设备..."
DEVICE=$(adb devices | grep -w "device" | head -1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ 错误：没有找到连接的 Android 设备"
    echo ""
    echo "💡 提示："
    echo "   1. 请确保 Android 设备已连接"
    echo "   2. 已启用 USB 调试"
    echo "   3. 运行 'adb devices' 确认设备已识别"
    exit 1
fi

echo "✅ 找到设备: $DEVICE"
echo ""

# 获取设备信息
DEVICE_MODEL=$(adb -s $DEVICE shell getprop ro.product.model | tr -d '\r')
ANDROID_VERSION=$(adb -s $DEVICE shell getprop ro.build.version.release | tr -d '\r')
echo "📱 设备型号: $DEVICE_MODEL"
echo "🤖 Android 版本: $ANDROID_VERSION"
echo ""

# 函数：检查当前页面是否有设置应用图标
check_settings_icon() {
    local device=$1
    # 获取当前屏幕的 UI 层级结构
    adb -s $device shell uiautomator dump /sdcard/window_dump.xml > /dev/null 2>&1
    adb -s $device pull /sdcard/window_dump.xml /tmp/window_dump.xml > /dev/null 2>&1
    
    # 查找设置应用的图标（可能的文本：设置、Settings、系统设置等）
    if grep -q -i "设置\|Settings\|系统设置" /tmp/window_dump.xml 2>/dev/null; then
        return 0  # 找到了
    else
        return 1  # 没找到
    fi
}

# 函数：点击设置应用图标
click_settings_icon() {
    local device=$1
    # 从 XML 中提取设置图标的坐标
    local bounds=$(grep -i "设置\|Settings\|系统设置" /tmp/window_dump.xml | grep -o 'bounds="[^"]*"' | head -1 | sed 's/bounds="//;s/"//')
    
    if [ -n "$bounds" ]; then
        # 解析坐标 [x1,y1][x2,y2]
        local x1=$(echo $bounds | sed 's/\[//g;s/\].*//;s/,.*//g')
        local y1=$(echo $bounds | sed 's/\[//g;s/\].*//;s/.*,//;s/\[.*//g')
        local x2=$(echo $bounds | sed 's/.*\[//;s/\]//;s/,.*//g')
        local y2=$(echo $bounds | sed 's/.*,//;s/\]//g')
        
        # 计算中心点
        local center_x=$(( (x1 + x2) / 2 ))
        local center_y=$(( (y1 + y2) / 2 ))
        
        echo "   📍 找到设置图标位置: ($center_x, $center_y)"
        adb -s $device shell input tap $center_x $center_y
        return 0
    else
        return 1
    fi
}

# 函数：向左滑动屏幕
swipe_left() {
    local device=$1
    echo "   ⬅️  向左滑动..."
    # 获取屏幕尺寸
    local screen_size=$(adb -s $device shell wm size | grep "Physical size" | cut -d: -f2 | tr -d ' ')
    local width=$(echo $screen_size | cut -dx -f1)
    local height=$(echo $screen_size | cut -dx -f2)
    
    # 从右向左滑动（80% -> 20%）
    local start_x=$(( width * 80 / 100 ))
    local end_x=$(( width * 20 / 100 ))
    local y=$(( height / 2 ))
    
    adb -s $device shell input swipe $start_x $y $end_x $y 300
    sleep 1
}

# 函数：向右滑动屏幕
swipe_right() {
    local device=$1
    echo "   ➡️  向右滑动..."
    # 获取屏幕尺寸
    local screen_size=$(adb -s $device shell wm size | grep "Physical size" | cut -d: -f2 | tr -d ' ')
    local width=$(echo $screen_size | cut -dx -f1)
    local height=$(echo $screen_size | cut -dx -f2)
    
    # 从左向右滑动（20% -> 80%）
    local start_x=$(( width * 20 / 100 ))
    local end_x=$(( width * 80 / 100 ))
    local y=$(( height / 2 ))
    
    adb -s $device shell input swipe $start_x $y $end_x $y 300
    sleep 1
}

# 步骤 1: 返回主屏幕
echo "🏠 步骤 1: 返回主屏幕..."
adb -s $DEVICE shell input keyevent KEYCODE_HOME
sleep 1
echo "✅ 已返回主屏幕"
echo ""

# 步骤 2: 在桌面上查找设置应用图标
echo "🔍 步骤 2: 在桌面上查找设置应用图标..."
MAX_SWIPES=5  # 最多滑动次数
FOUND=false

# 先检查当前页面
if check_settings_icon $DEVICE; then
    echo "✅ 在当前页面找到设置图标"
    FOUND=true
else
    echo "⚠️  当前页面未找到设置图标，开始滑动查找..."
    
    # 先向左滑动查找
    for i in $(seq 1 $MAX_SWIPES); do
        swipe_left $DEVICE
        if check_settings_icon $DEVICE; then
            echo "✅ 在第 $i 次左滑后找到设置图标"
            FOUND=true
            break
        fi
    done
    
    # 如果向左没找到，回到起点并向右滑动查找
    if [ "$FOUND" = false ]; then
        echo "   🔄 向左未找到，尝试向右滑动..."
        # 回到起点
        for i in $(seq 1 $MAX_SWIPES); do
            swipe_right $DEVICE
        done
        
        # 向右滑动查找
        for i in $(seq 1 $MAX_SWIPES); do
            swipe_right $DEVICE
            if check_settings_icon $DEVICE; then
                echo "✅ 在第 $i 次右滑后找到设置图标"
                FOUND=true
                break
            fi
        done
    fi
fi

if [ "$FOUND" = false ]; then
    echo "❌ 错误：在桌面上未找到设置应用图标"
    echo ""
    echo "💡 提示：尝试直接启动设置应用..."
    adb -s $DEVICE shell am start -n com.android.settings/.Settings > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ 通过包名直接启动设置应用成功"
    else
        echo "❌ 启动失败"
        exit 1
    fi
else
    # 步骤 3: 点击设置图标
    echo ""
    echo "👆 步骤 3: 点击设置应用图标..."
    if click_settings_icon $DEVICE; then
        sleep 2
        echo "✅ 设置应用已启动"
    else
        echo "❌ 点击失败，尝试直接启动..."
        adb -s $DEVICE shell am start -n com.android.settings/.Settings > /dev/null 2>&1
        echo "✅ 通过包名直接启动设置应用"
    fi
fi
echo ""

# 步骤 4: 截图（可选）
echo "📸 步骤 4: 截取屏幕截图..."
adb -s $DEVICE shell screencap -p /sdcard/settings_screenshot.png > /dev/null 2>&1
adb -s $DEVICE pull /sdcard/settings_screenshot.png ./settings_screenshot.png > /dev/null 2>&1
if [ -f "./settings_screenshot.png" ]; then
    echo "✅ 截图已保存到: ./settings_screenshot.png"
    adb -s $DEVICE shell rm /sdcard/settings_screenshot.png > /dev/null 2>&1
else
    echo "⚠️  截图失败（可能没有权限）"
fi
echo ""

# 步骤 5: 等待
echo "⏳ 步骤 5: 等待 3 秒..."
sleep 3
echo "✅ 等待完成"
echo ""

# 步骤 6: 关闭设置应用
echo "🛑 步骤 6: 关闭设置应用..."
adb -s $DEVICE shell am force-stop com.android.settings
if [ $? -eq 0 ]; then
    echo "✅ 设置应用已关闭"
else
    echo "❌ 关闭设置应用失败"
    exit 1
fi
echo ""

# 步骤 7: 返回主屏幕
echo "🏠 步骤 7: 返回主屏幕..."
adb -s $DEVICE shell input keyevent KEYCODE_HOME
echo "✅ 已返回主屏幕"
echo ""

# 清理临时文件
rm -f /tmp/window_dump.xml

echo "🎉 演示完成！"
echo ""
echo "📝 总结："
echo "   ✓ 返回主屏幕"
echo "   ✓ 在桌面查找设置应用图标（支持左右滑动）"
echo "   ✓ 点击图标启动设置应用"
echo "   ✓ 等待 3 秒"
echo "   ✓ 成功关闭设置应用"
echo "   ✓ 返回主屏幕"
