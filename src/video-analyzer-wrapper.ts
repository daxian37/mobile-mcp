/**
 * Video Analyzer Wrapper - TypeScript wrapper for Python video analyzer
 * This provides a TypeScript interface to the Python video analysis tool
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface VideoAnalysisReport {
    video_info: {
        path: string;
        resolution: string;
        fps: number;
        total_frames: number;
        duration: number;
    };
    detection_results: {
        black_screens: number;
        white_screens: number;
        flickers: number;
        freezes: number;
    };
    details: {
        black_frames: Array<{
            frame: number;
            timestamp: number;
            brightness: number;
        }>;
        white_frames: Array<{
            frame: number;
            timestamp: number;
            brightness: number;
        }>;
        flicker_frames: Array<{
            frame: number;
            timestamp: number;
            diff: number;
            prev_brightness: number;
            curr_brightness: number;
            brightness_change: number;
            color_change: number;
        }>;
        freeze_frames: Array<{
            start_frame: number;
            end_frame: number;
            duration: number;
            timestamp: number;
        }>;
    };
    statistics: {
        avg_brightness: number;
        min_brightness: number;
        max_brightness: number;
        brightness_std: number;
    };
}

export class VideoAnalyzerWrapper {
	private pythonScript: string;

	constructor(pythonScriptPath?: string) {
		this.pythonScript = pythonScriptPath || path.join(__dirname, "../analyze_video_quality.py");
	}

	/**
     * Analyze video quality using Python script
     * @param videoPath Path to the video file
     * @returns Analysis report
     */
	async analyzeVideo(videoPath: string): Promise<VideoAnalysisReport> {
		// Validate video file exists
		if (!fs.existsSync(videoPath)) {
			throw new Error(`Video file not found: ${videoPath}`);
		}

		// Validate Python script exists
		if (!fs.existsSync(this.pythonScript)) {
			throw new Error(`Python script not found: ${this.pythonScript}`);
		}

		console.log(`🎬 Analyzing video: ${path.basename(videoPath)}`);

		try {
			// Execute Python script
			const { stdout, stderr } = await execAsync(
				`python3 "${this.pythonScript}" "${videoPath}"`,
				{ maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large outputs
			);

			// Log Python output
			if (stdout) {
				console.log(stdout);
			}
			if (stderr) {
				console.error("Python stderr:", stderr);
			}

			// Read generated JSON report
			const outputDir = path.dirname(videoPath) || ".";
			const jsonPath = path.join(outputDir, "video_analysis.json");

			if (!fs.existsSync(jsonPath)) {
				throw new Error("Analysis report not generated");
			}

			const reportData = fs.readFileSync(jsonPath, "utf-8");
			const report: VideoAnalysisReport = JSON.parse(reportData);

			console.log("✅ Analysis complete");
			return report;

		} catch (error: any) {
			throw new Error(`Video analysis failed: ${error.message}`);
		}
	}

	/**
     * Get analysis summary
     * @param report Analysis report
     * @returns Summary string
     */
	getSummary(report: VideoAnalysisReport): string {
		const { detection_results, video_info, statistics } = report;

		let summary = `📹 Video Analysis Summary\n`;
		summary += `${"=".repeat(50)}\n\n`;
		summary += `Video: ${path.basename(video_info.path)}\n`;
		summary += `Duration: ${video_info.duration.toFixed(2)}s\n`;
		summary += `Resolution: ${video_info.resolution}\n`;
		summary += `FPS: ${video_info.fps.toFixed(2)}\n\n`;
		summary += `Detection Results:\n`;
		summary += `  ⚫ Black screens: ${detection_results.black_screens}\n`;
		summary += `  ⚪ White screens: ${detection_results.white_screens}\n`;
		summary += `  ⚡ Flickers: ${detection_results.flickers}\n`;
		summary += `  ❄️  Freezes: ${detection_results.freezes}\n\n`;
		summary += `Brightness Statistics:\n`;
		summary += `  Average: ${statistics.avg_brightness.toFixed(2)}\n`;
		summary += `  Min: ${statistics.min_brightness.toFixed(2)}\n`;
		summary += `  Max: ${statistics.max_brightness.toFixed(2)}\n`;
		summary += `  Std Dev: ${statistics.brightness_std.toFixed(2)}\n`;

		return summary;
	}

	/**
     * Check if video has quality issues
     * @param report Analysis report
     * @returns true if issues detected
     */
	hasQualityIssues(report: VideoAnalysisReport): boolean {
		const { detection_results } = report;
		return (
			detection_results.black_screens > 0 ||
            detection_results.white_screens > 10 ||
            detection_results.flickers > 20 ||
            detection_results.freezes > 5
		);
	}

	/**
     * Get quality score (0-100)
     * @param report Analysis report
     * @returns Quality score
     */
	getQualityScore(report: VideoAnalysisReport): number {
		const { detection_results, video_info } = report;
		const totalFrames = video_info.total_frames;

		// Calculate penalties
		let score = 100;

		// Black screen penalty (severe)
		score -= (detection_results.black_screens / totalFrames) * 1000;

		// White screen penalty (moderate)
		score -= (detection_results.white_screens / totalFrames) * 500;

		// Flicker penalty (moderate)
		score -= (detection_results.flickers / totalFrames) * 300;

		// Freeze penalty (minor)
		score -= (detection_results.freezes / totalFrames) * 200;

		return Math.max(0, Math.min(100, score));
	}

	/**
     * Get quality rating
     * @param score Quality score
     * @returns Rating string
     */
	getQualityRating(score: number): string {
		if (score >= 90) {return "优秀 (Excellent)";}
		if (score >= 75) {return "良好 (Good)";}
		if (score >= 60) {return "一般 (Fair)";}
		if (score >= 40) {return "较差 (Poor)";}
		return "很差 (Very Poor)";
	}
}

// CLI usage
async function main() {
	const args = process.argv.slice(2);

	if (args.length < 1) {
		console.log("Usage: ts-node video-analyzer-wrapper.ts <video_path>");
		console.log("Example: ts-node video-analyzer-wrapper.ts test_video.mp4");
		process.exit(1);
	}

	const videoPath = args[0];

	try {
		const analyzer = new VideoAnalyzerWrapper();
		const report = await analyzer.analyzeVideo(videoPath);

		console.log("\n" + analyzer.getSummary(report));

		const score = analyzer.getQualityScore(report);
		const rating = analyzer.getQualityRating(score);

		console.log(`\n📊 Quality Score: ${score.toFixed(1)}/100`);
		console.log(`📈 Quality Rating: ${rating}`);

		if (analyzer.hasQualityIssues(report)) {
			console.log("\n⚠️  Quality issues detected!");
		} else {
			console.log("\n✅ No significant quality issues");
		}

	} catch (error: any) {
		console.error(`❌ Error: ${error.message}`);
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	main();
}

export default VideoAnalyzerWrapper;
