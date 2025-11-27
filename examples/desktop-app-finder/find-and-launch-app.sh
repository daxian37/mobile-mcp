#!/bin/bash

# 通用脚本：在 Android 桌面上查找并启动任意应用
# 用法: ./find-and-launch-app.sh "应用名称" "包名"
# 示例: ./find-and-launch-app.sh "设置" "com.android.settings"

# 检查参数
if [ $# -lt 2 ]; then
    echo "❌ 用法: $0 <应用名称> <包名> [Activity名称]"
    echo ""
    echo "示例:"
    echo "  $0 '设置' 'com.android.settings'"
    echo "  $0 '微信' 'com.tencent.mm' '.ui.LauncherUI'"
    echo "  $0 'Chrome' 'com.android.chrome'"
    exit 1
fi

APP_NAME=$1
PACKAGE_NAME=$2
ACTIVITY_NAME=${3:-""}  # 可选的 Activity 名称

echo "🚀 开始查找并启动应用: $APP_NAME"
echo ""

# 检查设备连接
echo "📱 检查连接的设备..."
DEVICE=$(adb devices | grep -w "device" | head -1 | awk '{print $1}')

if [ -z "$DEVICE" ]; then
    echo "❌ 错误：没有找到连接的 Android 设备"
    exit 1
fi

echo "✅ 找到设备: $DEVICE"
DEVICE_MODEL=$(adb -s $DEVICE shell getprop ro.product.model | tr -d '\r')
echo "📱 设备型号: $DEVICE_MODEL"
echo ""

# 函数：检查当前页面是否有目标应用图标
check_app_icon() {
    local device=$1
    local app_name=$2
    
    adb -s $device shell uiautomator dump /sdcard/window_dump.xml > /dev/null 2>&1
    adb -s $device pull /sdcard/window_dump.xml /tmp/window_dump.xml > /dev/null 2>&1
    
    # 查找应用图标（支持中英文名称）
    if grep -q "$app_name" /tmp/window_dump.xml 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# 函数：点击应用图标
click_app_icon() {
    local device=$1
    local app_name=$2
    
    # 从 XML 中提取应用图标的坐标（获取第一个匹配项）
    local bounds=$(grep "$app_name" /tmp/window_dump.xml | grep -o 'bounds="[^"]*"' | head -1 | sed 's/bounds="//;s/"//')
    
    if [ -n "$bounds" ]; then
        local x1=$(echo $bounds | sed 's/\[//g;s/\].*//;s/,.*//g')
        local y1=$(echo $bounds | sed 's/\[//g;s/\].*//;s/.*,//;s/\[.*//g')
        local x2=$(echo $bounds | sed 's/.*\[//;s/\]//;s/,.*//g')
        local y2=$(echo $bounds | sed 's/.*,//;s/\]//g')
        
        local center_x=$(( (x1 + x2) / 2 ))
        local center_y=$(( (y1 + y2) / 2 ))
        
        echo "   📍 找到应用图标位置: ($center_x, $center_y)"
        adb -s $device shell input tap $center_x $center_y
        return 0
    else
        return 1
    fi
}

# 函数：滑动屏幕
swipe_screen() {
    local device=$1
    local direction=$2  # left 或 right
    
    local screen_size=$(adb -s $device shell wm size | grep "Physical size" | cut -d: -f2 | tr -d ' ')
    local width=$(echo $screen_size | cut -dx -f1)
    local height=$(echo $screen_size | cut -dx -f2)
    local y=$(( height / 2 ))
    
    if [ "$direction" = "left" ]; then
        echo "   ⬅️  向左滑动..."
        local start_x=$(( width * 80 / 100 ))
        local end_x=$(( width * 20 / 100 ))
    else
        echo "   ➡️  向右滑动..."
        local start_x=$(( width * 20 / 100 ))
        local end_x=$(( width * 80 / 100 ))
    fi
    
    adb -s $device shell input swipe $start_x $y $end_x $y 300
    sleep 1
}

# 步骤 1: 返回主屏幕
echo "🏠 步骤 1: 返回主屏幕..."
adb -s $DEVICE shell input keyevent KEYCODE_HOME
sleep 1
echo "✅ 已返回主屏幕"
echo ""

# 步骤 2: 查找应用图标
echo "🔍 步骤 2: 在桌面上查找 '$APP_NAME' 图标..."
MAX_SWIPES=5
FOUND=false

# 检查当前页面
if check_app_icon $DEVICE "$APP_NAME"; then
    echo "✅ 在当前页面找到应用图标"
    FOUND=true
else
    echo "⚠️  当前页面未找到，开始滑动查找..."
    
    # 向左滑动查找
    for i in $(seq 1 $MAX_SWIPES); do
        swipe_screen $DEVICE "left"
        if check_app_icon $DEVICE "$APP_NAME"; then
            echo "✅ 在第 $i 次左滑后找到应用图标"
            FOUND=true
            break
        fi
    done
    
    # 向右滑动查找
    if [ "$FOUND" = false ]; then
        echo "   🔄 向左未找到，尝试向右滑动..."
        for i in $(seq 1 $(( MAX_SWIPES * 2 ))); do
            swipe_screen $DEVICE "right"
        done
        
        for i in $(seq 1 $MAX_SWIPES); do
            swipe_screen $DEVICE "right"
            if check_app_icon $DEVICE "$APP_NAME"; then
                echo "✅ 在第 $i 次右滑后找到应用图标"
                FOUND=true
                break
            fi
        done
    fi
fi

# 步骤 3: 启动应用
echo ""
echo "🚀 步骤 3: 启动应用..."

if [ "$FOUND" = true ]; then
    # 通过点击图标启动
    if click_app_icon $DEVICE "$APP_NAME"; then
        sleep 2
        echo "✅ 应用已通过图标启动"
    else
        echo "⚠️  点击失败，尝试直接启动..."
        FOUND=false
    fi
fi

if [ "$FOUND" = false ]; then
    # 通过包名直接启动
    echo "💡 使用包名直接启动: $PACKAGE_NAME"
    if [ -n "$ACTIVITY_NAME" ]; then
        adb -s $DEVICE shell am start -n "$PACKAGE_NAME/$ACTIVITY_NAME" > /dev/null 2>&1
    else
        adb -s $DEVICE shell monkey -p $PACKAGE_NAME -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ 应用已通过包名启动"
    else
        echo "❌ 启动失败"
        exit 1
    fi
fi

echo ""
echo "🎉 完成！应用 '$APP_NAME' 已成功启动"

# 清理临时文件
rm -f /tmp/window_dump.xml
