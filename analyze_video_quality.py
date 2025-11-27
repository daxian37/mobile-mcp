#!/usr/bin/env python3
"""
视频质量分析工具 - 检测黑屏、白屏、闪烁等问题
基于OpenCV进行视频帧分析
"""

import cv2
import numpy as np
import sys
import os
from datetime import datetime
import json

class VideoQualityAnalyzer:
    def __init__(self, video_path):
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        self.fps = self.cap.get(cv2.CAP_PROP_FPS)
        self.total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # 检测阈值
        self.BLACK_THRESHOLD = 30  # 平均亮度低于此值视为黑屏
        self.WHITE_THRESHOLD = 225  # 平均亮度高于此值视为白屏
        self.FLICKER_THRESHOLD = 50  # 帧间亮度差异超过此值视为闪烁
        self.FREEZE_THRESHOLD = 5  # 连续相似帧超过此数量视为卡顿
        
        # 检测结果
        self.black_frames = []
        self.white_frames = []
        self.flicker_frames = []
        self.freeze_frames = []
        self.brightness_history = []
        
    def calculate_brightness(self, frame):
        """计算帧的平均亮度"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        return np.mean(gray)
    
    def calculate_frame_diff(self, frame1, frame2):
        """计算两帧之间的差异"""
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(gray1, gray2)
        return np.mean(diff)
    
    def detect_black_screen(self, frame, frame_num):
        """检测黑屏"""
        brightness = self.calculate_brightness(frame)
        if brightness < self.BLACK_THRESHOLD:
            timestamp = frame_num / self.fps
            self.black_frames.append({
                'frame': frame_num,
                'timestamp': timestamp,
                'brightness': brightness,
                'frame_image': frame.copy()  # 保存帧图像
            })
            return True
        return False
    
    def detect_white_screen(self, frame, frame_num):
        """检测白屏"""
        brightness = self.calculate_brightness(frame)
        if brightness > self.WHITE_THRESHOLD:
            timestamp = frame_num / self.fps
            self.white_frames.append({
                'frame': frame_num,
                'timestamp': timestamp,
                'brightness': brightness,
                'frame_image': frame.copy()  # 保存帧图像
            })
            return True
        return False
    
    def detect_flicker(self, prev_frame, curr_frame, frame_num):
        """检测闪烁"""
        if prev_frame is None:
            return False
        
        diff = self.calculate_frame_diff(prev_frame, curr_frame)
        if diff > self.FLICKER_THRESHOLD:
            timestamp = frame_num / self.fps
            
            # 分析闪烁原因
            prev_brightness = self.calculate_brightness(prev_frame)
            curr_brightness = self.calculate_brightness(curr_frame)
            brightness_change = curr_brightness - prev_brightness
            
            # 计算颜色变化
            prev_mean_result = cv2.mean(prev_frame)
            curr_mean_result = cv2.mean(curr_frame)
            
            # 确保返回的是元组，取前3个通道（BGR）
            if isinstance(prev_mean_result, tuple):
                prev_mean = prev_mean_result[:3]
            else:
                prev_mean = (prev_mean_result, prev_mean_result, prev_mean_result)
            
            if isinstance(curr_mean_result, tuple):
                curr_mean = curr_mean_result[:3]
            else:
                curr_mean = (curr_mean_result, curr_mean_result, curr_mean_result)
            
            color_change = np.sqrt(sum([(c - p)**2 for c, p in zip(curr_mean, prev_mean)]))
            
            self.flicker_frames.append({
                'frame': frame_num,
                'timestamp': timestamp,
                'diff': diff,
                'prev_frame_image': prev_frame.copy(),  # 保存前一帧
                'frame_image': curr_frame.copy(),  # 保存当前帧
                'prev_brightness': prev_brightness,
                'curr_brightness': curr_brightness,
                'brightness_change': brightness_change,
                'color_change': color_change
            })
            return True
        return False
    
    def analyze(self):
        """执行完整的视频分析"""
        print(f"📹 开始分析视频: {os.path.basename(self.video_path)}")
        print(f"   分辨率: {self.width}x{self.height}")
        print(f"   帧率: {self.fps:.2f} fps")
        print(f"   总帧数: {self.total_frames}")
        print(f"   时长: {self.total_frames/self.fps:.2f}秒")
        print()
        
        prev_frame = None
        frame_num = 0
        similar_frame_count = 0
        last_different_frame = 0
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            frame_num += 1
            
            # 显示进度
            if frame_num % 30 == 0:
                progress = (frame_num / self.total_frames) * 100
                print(f"\r分析进度: {progress:.1f}% ({frame_num}/{self.total_frames})", end='')
            
            # 计算亮度
            brightness = self.calculate_brightness(frame)
            self.brightness_history.append(brightness)
            
            # 检测黑屏
            self.detect_black_screen(frame, frame_num)
            
            # 检测白屏
            self.detect_white_screen(frame, frame_num)
            
            # 检测闪烁
            if prev_frame is not None:
                self.detect_flicker(prev_frame, frame, frame_num)
                
                # 检测卡顿（连续相似帧）
                diff = self.calculate_frame_diff(prev_frame, frame)
                if diff < 1.0:  # 几乎相同的帧
                    similar_frame_count += 1
                else:
                    if similar_frame_count >= self.FREEZE_THRESHOLD:
                        timestamp = last_different_frame / self.fps
                        self.freeze_frames.append({
                            'start_frame': last_different_frame,
                            'end_frame': frame_num - 1,
                            'duration': similar_frame_count / self.fps,
                            'timestamp': timestamp
                        })
                    similar_frame_count = 0
                    last_different_frame = frame_num
            
            prev_frame = frame.copy()
        
        print("\n\n✓ 分析完成")
        self.cap.release()
        
    def generate_report(self, output_dir):
        """生成分析报告"""
        # 创建截图目录
        screenshots_dir = os.path.join(output_dir, 'issue_screenshots')
        os.makedirs(screenshots_dir, exist_ok=True)
        
        # 保存问题帧截图
        self.save_issue_screenshots(screenshots_dir)
        
        # 准备报告数据（移除frame_image字段）
        def clean_frame_data(frame):
            """移除不能序列化的字段"""
            return {k: v for k, v in frame.items() if k not in ['frame_image', 'prev_frame_image']}
        
        report = {
            'video_info': {
                'path': self.video_path,
                'resolution': f'{self.width}x{self.height}',
                'fps': self.fps,
                'total_frames': self.total_frames,
                'duration': self.total_frames / self.fps
            },
            'detection_results': {
                'black_screens': len(self.black_frames),
                'white_screens': len(self.white_frames),
                'flickers': len(self.flicker_frames),
                'freezes': len(self.freeze_frames)
            },
            'details': {
                'black_frames': [clean_frame_data(frame) for frame in self.black_frames[:10]],
                'white_frames': [clean_frame_data(frame) for frame in self.white_frames[:10]],
                'flicker_frames': [clean_frame_data(frame) for frame in self.flicker_frames[:10]],
                'freeze_frames': self.freeze_frames
            },
            'statistics': {
                'avg_brightness': np.mean(self.brightness_history),
                'min_brightness': np.min(self.brightness_history),
                'max_brightness': np.max(self.brightness_history),
                'brightness_std': np.std(self.brightness_history)
            }
        }
        
        # 保存JSON报告
        json_path = os.path.join(output_dir, 'video_analysis.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成文本报告
        self.generate_text_report(output_dir, report)
        
        # 生成HTML报告
        self.generate_html_report(output_dir, report)
        
        return report
    
    def save_issue_screenshots(self, screenshots_dir):
        """保存问题帧截图"""
        print(f"💾 保存问题帧截图到: {screenshots_dir}")
        
        # 保存黑屏截图
        for i, item in enumerate(self.black_frames[:10]):
            if 'frame_image' in item:
                filename = f"black_screen_frame_{item['frame']}.png"
                filepath = os.path.join(screenshots_dir, filename)
                cv2.imwrite(filepath, item['frame_image'])
                print(f"  ✓ 黑屏截图: {filename}")
        
        # 保存白屏截图
        for i, item in enumerate(self.white_frames[:10]):
            if 'frame_image' in item:
                filename = f"white_screen_frame_{item['frame']}.png"
                filepath = os.path.join(screenshots_dir, filename)
                cv2.imwrite(filepath, item['frame_image'])
                print(f"  ✓ 白屏截图: {filename}")
        
        # 保存闪烁截图（包括前后帧对比）
        for i, item in enumerate(self.flicker_frames[:10]):
            if 'frame_image' in item and 'prev_frame_image' in item:
                # 保存当前帧
                filename = f"flicker_frame_{item['frame']}.png"
                filepath = os.path.join(screenshots_dir, filename)
                cv2.imwrite(filepath, item['frame_image'])
                
                # 保存前一帧
                prev_filename = f"flicker_frame_{item['frame']}_prev.png"
                prev_filepath = os.path.join(screenshots_dir, prev_filename)
                cv2.imwrite(prev_filepath, item['prev_frame_image'])
                
                # 生成对比图
                comparison = self.create_comparison_image(
                    item['prev_frame_image'], 
                    item['frame_image'],
                    item
                )
                comp_filename = f"flicker_frame_{item['frame']}_comparison.png"
                comp_filepath = os.path.join(screenshots_dir, comp_filename)
                cv2.imwrite(comp_filepath, comparison)
                
                print(f"  ✓ 闪烁截图: {filename} (含前后帧对比)")
        
        total_screenshots = len([f for f in self.black_frames[:10] if 'frame_image' in f]) + \
                           len([f for f in self.white_frames[:10] if 'frame_image' in f]) + \
                           len([f for f in self.flicker_frames[:10] if 'frame_image' in f])
        
        if total_screenshots > 0:
            print(f"✓ 共保存 {total_screenshots} 张问题帧截图（含对比图）")
        else:
            print("  无问题帧需要保存")
    
    def create_comparison_image(self, prev_frame, curr_frame, item):
        """创建前后帧对比图"""
        # 缩小图片以便并排显示
        scale = 0.5
        h, w = prev_frame.shape[:2]
        new_h, new_w = int(h * scale), int(w * scale)
        
        prev_resized = cv2.resize(prev_frame, (new_w, new_h))
        curr_resized = cv2.resize(curr_frame, (new_w, new_h))
        
        # 计算差异图
        diff = cv2.absdiff(prev_resized, curr_resized)
        
        # 创建画布
        canvas_h = new_h + 100  # 额外空间用于文字
        canvas_w = new_w * 3 + 40  # 三张图并排，加间隔
        canvas = np.ones((canvas_h, canvas_w, 3), dtype=np.uint8) * 255
        
        # 放置图片
        canvas[80:80+new_h, 10:10+new_w] = prev_resized
        canvas[80:80+new_h, 20+new_w:20+new_w*2] = curr_resized
        canvas[80:80+new_h, 30+new_w*2:30+new_w*3] = diff
        
        # 添加标题和信息
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(canvas, f"Frame {item['frame']} Flicker Analysis", 
                   (10, 30), font, 0.8, (0, 0, 0), 2)
        cv2.putText(canvas, f"Diff: {item['diff']:.2f} | Brightness Change: {item['brightness_change']:.2f}", 
                   (10, 60), font, 0.6, (0, 0, 0), 1)
        
        # 图片标签
        cv2.putText(canvas, f"Previous ({item['frame']-1})", 
                   (10, canvas_h-10), font, 0.5, (0, 0, 0), 1)
        cv2.putText(canvas, f"Current ({item['frame']})", 
                   (20+new_w, canvas_h-10), font, 0.5, (0, 0, 0), 1)
        cv2.putText(canvas, "Difference", 
                   (30+new_w*2, canvas_h-10), font, 0.5, (0, 0, 0), 1)
        
        return canvas
    
    def analyze_flicker_issue(self, item):
        """分析闪烁问题的详细原因"""
        analysis = []
        
        # 亮度变化分析
        if abs(item['brightness_change']) > 30:
            if item['brightness_change'] > 0:
                analysis.append(f"亮度突然增加 {item['brightness_change']:.1f} (变亮)")
            else:
                analysis.append(f"亮度突然降低 {abs(item['brightness_change']):.1f} (变暗)")
        
        # 颜色变化分析
        if item['color_change'] > 50:
            analysis.append(f"颜色发生明显变化 (变化量: {item['color_change']:.1f})")
        
        # 差异程度分析
        if item['diff'] > 80:
            analysis.append("帧间差异极大，可能是场景切换")
        elif item['diff'] > 60:
            analysis.append("帧间差异较大，可能是快速滑动或动画")
        else:
            analysis.append("帧间差异中等，可能是正常的UI变化")
        
        if not analysis:
            analysis.append("轻微的视觉变化，可能是正常现象")
        
        return " | ".join(analysis)
    
    def generate_text_report(self, output_dir, report):
        """生成文本报告"""
        txt_path = os.path.join(output_dir, 'video_analysis.txt')
        
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write("视频质量分析报告\n")
            f.write("=" * 60 + "\n\n")
            
            f.write("📹 视频信息\n")
            f.write("-" * 60 + "\n")
            f.write(f"文件: {os.path.basename(self.video_path)}\n")
            f.write(f"分辨率: {report['video_info']['resolution']}\n")
            f.write(f"帧率: {report['video_info']['fps']:.2f} fps\n")
            f.write(f"总帧数: {report['video_info']['total_frames']}\n")
            f.write(f"时长: {report['video_info']['duration']:.2f}秒\n\n")
            
            f.write("🔍 检测结果\n")
            f.write("-" * 60 + "\n")
            f.write(f"黑屏检测: {report['detection_results']['black_screens']} 次\n")
            f.write(f"白屏检测: {report['detection_results']['white_screens']} 次\n")
            f.write(f"闪烁检测: {report['detection_results']['flickers']} 次\n")
            f.write(f"卡顿检测: {report['detection_results']['freezes']} 次\n\n")
            
            f.write("📊 亮度统计\n")
            f.write("-" * 60 + "\n")
            f.write(f"平均亮度: {report['statistics']['avg_brightness']:.2f}\n")
            f.write(f"最低亮度: {report['statistics']['min_brightness']:.2f}\n")
            f.write(f"最高亮度: {report['statistics']['max_brightness']:.2f}\n")
            f.write(f"亮度标准差: {report['statistics']['brightness_std']:.2f}\n\n")
            
            # 详细信息
            if self.black_frames:
                f.write("⚫ 黑屏详情（前10个）\n")
                f.write("-" * 60 + "\n")
                for item in self.black_frames[:10]:
                    f.write(f"  帧 {item['frame']} ({item['timestamp']:.2f}s) - 亮度: {item['brightness']:.2f}\n")
                f.write("\n")
            
            if self.white_frames:
                f.write("⚪ 白屏详情（前10个）\n")
                f.write("-" * 60 + "\n")
                for item in self.white_frames[:10]:
                    f.write(f"  帧 {item['frame']} ({item['timestamp']:.2f}s) - 亮度: {item['brightness']:.2f}\n")
                f.write("\n")
            
            if self.flicker_frames:
                f.write("⚡ 闪烁详情（前10个）\n")
                f.write("-" * 60 + "\n")
                for item in self.flicker_frames[:10]:
                    f.write(f"  帧 {item['frame']} ({item['timestamp']:.2f}s)\n")
                    f.write(f"    差异值: {item['diff']:.2f}\n")
                    f.write(f"    亮度变化: {item['prev_brightness']:.1f} → {item['curr_brightness']:.1f} ({item['brightness_change']:+.1f})\n")
                    f.write(f"    颜色变化: {item['color_change']:.1f}\n")
                    f.write(f"    分析: {self.analyze_flicker_issue(item)}\n")
                    f.write(f"    截图: flicker_frame_{item['frame']}_comparison.png\n")
                    f.write("\n")
                f.write("\n")
            
            if self.freeze_frames:
                f.write("❄️  卡顿详情\n")
                f.write("-" * 60 + "\n")
                for item in self.freeze_frames:
                    f.write(f"  帧 {item['start_frame']}-{item['end_frame']} ({item['timestamp']:.2f}s) - 持续: {item['duration']:.2f}s\n")
                f.write("\n")
            
            f.write("=" * 60 + "\n")
            f.write(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        print(f"✓ 文本报告已保存: {txt_path}")

    
    def generate_html_report(self, output_dir, report):
        """生成HTML报告"""
        html_path = os.path.join(output_dir, 'video_analysis.html')
        
        # 准备图表数据
        brightness_data = self.brightness_history[::10]  # 每10帧取一个点
        frame_numbers = list(range(0, len(self.brightness_history), 10))
        
        html_content = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>视频质量分析报告</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }}
        .header h1 {{ font-size: 2em; margin-bottom: 10px; }}
        .content {{ padding: 30px; }}
        .section {{ margin-bottom: 30px; }}
        .section-title {{ font-size: 1.5em; color: #2c3e50; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }}
        .stat-card {{ background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }}
        .stat-label {{ font-size: 0.9em; color: #6c757d; margin-bottom: 5px; }}
        .stat-value {{ font-size: 2em; font-weight: 700; color: #2c3e50; }}
        .stat-unit {{ font-size: 0.5em; color: #6c757d; }}
        .chart-container {{ position: relative; height: 300px; margin: 20px 0; }}
        .issue-list {{ list-style: none; }}
        .issue-item {{ background: #fff3cd; padding: 10px 15px; margin: 5px 0; border-radius: 5px; border-left: 4px solid #ffc107; }}
        .issue-item.black {{ background: #f8d7da; border-left-color: #dc3545; }}
        .issue-item.white {{ background: #d1ecf1; border-left-color: #17a2b8; }}
        .issue-item.flicker {{ background: #fff3cd; border-left-color: #ffc107; }}
        .issue-item.freeze {{ background: #e2e3e5; border-left-color: #6c757d; }}
        .badge {{ display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600; }}
        .badge-success {{ background: #d4edda; color: #155724; }}
        .badge-warning {{ background: #fff3cd; color: #856404; }}
        .badge-danger {{ background: #f8d7da; color: #721c24; }}
        .summary {{ background: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📹 视频质量分析报告</h1>
            <p>基于帧分析的黑屏、白屏、闪烁检测</p>
            <p>生成时间: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}</p>
        </div>
        
        <div class="content">
            <!-- 视频信息 -->
            <div class="section">
                <h2 class="section-title">📹 视频信息</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">分辨率</div>
                        <div class="stat-value">{report['video_info']['resolution']}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">帧率</div>
                        <div class="stat-value">{report['video_info']['fps']:.1f}<span class="stat-unit">fps</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">总帧数</div>
                        <div class="stat-value">{report['video_info']['total_frames']}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">时长</div>
                        <div class="stat-value">{report['video_info']['duration']:.1f}<span class="stat-unit">秒</span></div>
                    </div>
                </div>
            </div>
            
            <!-- 检测结果摘要 -->
            <div class="section">
                <h2 class="section-title">🔍 检测结果摘要</h2>
                <div class="summary">
                    <p><strong>质量评估: </strong>
                    {'<span class="badge badge-success">优秀</span>' if report['detection_results']['black_screens'] == 0 and report['detection_results']['white_screens'] == 0 and report['detection_results']['flickers'] < 5 else '<span class="badge badge-warning">一般</span>' if report['detection_results']['flickers'] < 20 else '<span class="badge badge-danger">较差</span>'}
                    </p>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">⚫ 黑屏检测</div>
                        <div class="stat-value">{report['detection_results']['black_screens']}<span class="stat-unit">次</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">⚪ 白屏检测</div>
                        <div class="stat-value">{report['detection_results']['white_screens']}<span class="stat-unit">次</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">⚡ 闪烁检测</div>
                        <div class="stat-value">{report['detection_results']['flickers']}<span class="stat-unit">次</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">❄️ 卡顿检测</div>
                        <div class="stat-value">{report['detection_results']['freezes']}<span class="stat-unit">次</span></div>
                    </div>
                </div>
            </div>
            
            <!-- 亮度分析 -->
            <div class="section">
                <h2 class="section-title">📊 亮度分析</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">平均亮度</div>
                        <div class="stat-value">{report['statistics']['avg_brightness']:.1f}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">最低亮度</div>
                        <div class="stat-value">{report['statistics']['min_brightness']:.1f}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">最高亮度</div>
                        <div class="stat-value">{report['statistics']['max_brightness']:.1f}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">亮度标准差</div>
                        <div class="stat-value">{report['statistics']['brightness_std']:.1f}</div>
                    </div>
                </div>
                <div class="chart-container">
                    <canvas id="brightnessChart"></canvas>
                </div>
            </div>
            
            <!-- 问题详情 -->
            {'<div class="section"><h2 class="section-title">⚫ 黑屏详情</h2><ul class="issue-list">' + ''.join([f'<li class="issue-item black">帧 {item["frame"]} ({item["timestamp"]:.2f}s) - 亮度: {item["brightness"]:.2f}<br><img src="issue_screenshots/black_screen_frame_{item["frame"]}.png" style="max-width: 300px; margin-top: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" alt="黑屏截图"></li>' for item in self.black_frames[:10]]) + '</ul></div>' if self.black_frames else ''}
            
            {'<div class="section"><h2 class="section-title">⚪ 白屏详情</h2><ul class="issue-list">' + ''.join([f'<li class="issue-item white">帧 {item["frame"]} ({item["timestamp"]:.2f}s) - 亮度: {item["brightness"]:.2f}<br><img src="issue_screenshots/white_screen_frame_{item["frame"]}.png" style="max-width: 300px; margin-top: 10px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" alt="白屏截图"></li>' for item in self.white_frames[:10]]) + '</ul></div>' if self.white_frames else ''}
            
            {'<div class="section"><h2 class="section-title">⚡ 闪烁详情</h2>' + ''.join([f'''
                <div style="background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ffc107;">
                    <h3 style="margin: 0 0 10px 0; color: #856404;">帧 {item["frame"]} ({item["timestamp"]:.2f}s)</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div><strong>差异值:</strong> {item["diff"]:.2f}</div>
                        <div><strong>颜色变化:</strong> {item["color_change"]:.1f}</div>
                        <div><strong>前帧亮度:</strong> {item["prev_brightness"]:.1f}</div>
                        <div><strong>当前亮度:</strong> {item["curr_brightness"]:.1f}</div>
                        <div style="grid-column: 1 / -1;"><strong>亮度变化:</strong> {item["brightness_change"]:+.1f} {'📈 变亮' if item["brightness_change"] > 0 else '📉 变暗' if item["brightness_change"] < 0 else '➡️ 不变'}</div>
                    </div>
                    <div style="background: #fff; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <strong>🔍 问题分析:</strong> {self.analyze_flicker_issue(item)}
                    </div>
                    <div style="margin-top: 15px;">
                        <strong>📸 前后帧对比:</strong><br>
                        <img src="issue_screenshots/flicker_frame_{item["frame"]}_comparison.png" 
                             style="max-width: 100%; margin-top: 10px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.2);" 
                             alt="前后帧对比">
                    </div>
                </div>
            ''' for item in self.flicker_frames[:10]]) + '</div>' if self.flicker_frames else ''}
            
            {'<div class="section"><h2 class="section-title">❄️ 卡顿详情</h2><ul class="issue-list">' + ''.join([f'<li class="issue-item freeze">帧 {item["start_frame"]}-{item["end_frame"]} ({item["timestamp"]:.2f}s) - 持续: {item["duration"]:.2f}s</li>' for item in self.freeze_frames]) + '</ul></div>' if self.freeze_frames else ''}
        </div>
    </div>
    
    <script>
        const ctx = document.getElementById('brightnessChart').getContext('2d');
        new Chart(ctx, {{
            type: 'line',
            data: {{
                labels: {frame_numbers},
                datasets: [{{
                    label: '亮度值',
                    data: {brightness_data},
                    borderColor: 'rgb(102, 126, 234)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }}, {{
                    label: '黑屏阈值',
                    data: Array({len(brightness_data)}).fill({self.BLACK_THRESHOLD}),
                    borderColor: 'rgb(220, 53, 69)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }}, {{
                    label: '白屏阈值',
                    data: Array({len(brightness_data)}).fill({self.WHITE_THRESHOLD}),
                    borderColor: 'rgb(23, 162, 184)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }}]
            }},
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{ display: true, position: 'top' }}
                }},
                scales: {{
                    y: {{ beginAtZero: true, max: 255, title: {{ display: true, text: '亮度值' }} }},
                    x: {{ title: {{ display: true, text: '帧数' }} }}
                }}
            }}
        }});
    </script>
</body>
</html>
'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"✓ HTML报告已保存: {html_path}")

def main():
    if len(sys.argv) < 2:
        print("使用方法: python3 analyze_video_quality.py <video_path>")
        print("示例: python3 analyze_video_quality.py negative_screen_test_20251126_201219/test_recording.mp4")
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    if not os.path.exists(video_path):
        print(f"错误: 视频文件不存在: {video_path}")
        sys.exit(1)
    
    # 确定输出目录
    output_dir = os.path.dirname(video_path)
    if not output_dir:
        output_dir = '.'
    
    print("=" * 60)
    print("视频质量分析工具")
    print("=" * 60)
    print()
    
    # 创建分析器并执行分析
    analyzer = VideoQualityAnalyzer(video_path)
    analyzer.analyze()
    
    print()
    print("=" * 60)
    print("生成报告")
    print("=" * 60)
    print()
    
    # 生成报告
    report = analyzer.generate_report(output_dir)
    
    print()
    print("=" * 60)
    print("分析完成")
    print("=" * 60)
    print()
    print(f"检测结果:")
    print(f"  ⚫ 黑屏: {report['detection_results']['black_screens']} 次")
    print(f"  ⚪ 白屏: {report['detection_results']['white_screens']} 次")
    print(f"  ⚡ 闪烁: {report['detection_results']['flickers']} 次")
    print(f"  ❄️  卡顿: {report['detection_results']['freezes']} 次")
    print()
    print(f"报告文件:")
    print(f"  - {output_dir}/video_analysis.html")
    print(f"  - {output_dir}/video_analysis.txt")
    print(f"  - {output_dir}/video_analysis.json")
    print()

if __name__ == '__main__':
    main()
