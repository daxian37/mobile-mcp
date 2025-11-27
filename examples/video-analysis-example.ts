/**
 * Video Analysis Example - How to use VideoAnalyzerWrapper in TypeScript
 */

import VideoAnalyzerWrapper from "../src/video-analyzer-wrapper";

async function exampleBasicUsage() {
	console.log("📝 Example 1: Basic Usage\n");

	const analyzer = new VideoAnalyzerWrapper();
	const videoPath = "test_video.mp4";

	try {
		// Analyze video
		const report = await analyzer.analyzeVideo(videoPath);

		// Print summary
		console.log(analyzer.getSummary(report));

		// Check quality
		const score = analyzer.getQualityScore(report);
		console.log(`Quality Score: ${score.toFixed(1)}/100`);

	} catch (error: any) {
		console.error(`Error: ${error.message}`);
	}
}

async function exampleDetailedAnalysis() {
	console.log("\n📝 Example 2: Detailed Analysis\n");

	const analyzer = new VideoAnalyzerWrapper();
	const videoPath = "test_video.mp4";

	try {
		const report = await analyzer.analyzeVideo(videoPath);

		// Access detailed information
		console.log("Black Screen Frames:");
		report.details.black_frames.forEach(frame => {
			console.log(`  Frame ${frame.frame} at ${frame.timestamp.toFixed(2)}s - Brightness: ${frame.brightness.toFixed(2)}`);
		});

		console.log("\nFlicker Frames:");
		report.details.flicker_frames.forEach(frame => {
			console.log(`  Frame ${frame.frame} at ${frame.timestamp.toFixed(2)}s - Diff: ${frame.diff.toFixed(2)}`);
		});

		console.log("\nFreeze Periods:");
		report.details.freeze_frames.forEach(freeze => {
			console.log(`  Frames ${freeze.start_frame}-${freeze.end_frame} - Duration: ${freeze.duration.toFixed(2)}s`);
		});

	} catch (error: any) {
		console.error(`Error: ${error.message}`);
	}
}

async function exampleQualityCheck() {
	console.log("\n📝 Example 3: Quality Check\n");

	const analyzer = new VideoAnalyzerWrapper();
	const videoPath = "test_video.mp4";

	try {
		const report = await analyzer.analyzeVideo(videoPath);

		// Check if video has quality issues
		if (analyzer.hasQualityIssues(report)) {
			console.log("⚠️  Video has quality issues:");

			if (report.detection_results.black_screens > 0) {
				console.log(`  - ${report.detection_results.black_screens} black screen(s) detected`);
			}
			if (report.detection_results.white_screens > 10) {
				console.log(`  - ${report.detection_results.white_screens} white screen(s) detected`);
			}
			if (report.detection_results.flickers > 20) {
				console.log(`  - ${report.detection_results.flickers} flicker(s) detected`);
			}
			if (report.detection_results.freezes > 5) {
				console.log(`  - ${report.detection_results.freezes} freeze(s) detected`);
			}
		} else {
			console.log("✅ Video quality is good");
		}

		// Get quality rating
		const score = analyzer.getQualityScore(report);
		const rating = analyzer.getQualityRating(score);
		console.log(`\nQuality Rating: ${rating} (${score.toFixed(1)}/100)`);

	} catch (error: any) {
		console.error(`Error: ${error.message}`);
	}
}

async function exampleBatchAnalysis() {
	console.log("\n📝 Example 4: Batch Analysis\n");

	const analyzer = new VideoAnalyzerWrapper();
	const videos = ["video1.mp4", "video2.mp4", "video3.mp4"];

	for (const videoPath of videos) {
		try {
			console.log(`\nAnalyzing: ${videoPath}`);
			const report = await analyzer.analyzeVideo(videoPath);
			const score = analyzer.getQualityScore(report);
			const rating = analyzer.getQualityRating(score);

			console.log(`  Score: ${score.toFixed(1)}/100 - ${rating}`);
			console.log(`  Issues: Black=${report.detection_results.black_screens}, White=${report.detection_results.white_screens}, Flicker=${report.detection_results.flickers}`);

		} catch (error: any) {
			console.error(`  Error: ${error.message}`);
		}
	}
}

async function exampleIntegrationWithMCP() {
	console.log("\n📝 Example 5: Integration with Mobile MCP\n");

	// This example shows how to integrate video analysis with Mobile MCP workflow

	const analyzer = new VideoAnalyzerWrapper();

	// Simulate MCP workflow
	console.log("1. Record screen using Mobile MCP...");
	const recordedVideoPath = "screen_recording.mp4";

	console.log("2. Analyze recorded video...");
	try {
		const report = await analyzer.analyzeVideo(recordedVideoPath);

		console.log("3. Check video quality...");
		const score = analyzer.getQualityScore(report);

		if (score < 60) {
			console.log("⚠️  Video quality is poor, consider re-recording");
			console.log(`   Issues detected:`);
			console.log(`   - Black screens: ${report.detection_results.black_screens}`);
			console.log(`   - White screens: ${report.detection_results.white_screens}`);
			console.log(`   - Flickers: ${report.detection_results.flickers}`);
		} else {
			console.log("✅ Video quality is acceptable");
		}

		console.log("4. Generate report...");
		console.log(`   HTML report: video_analysis.html`);
		console.log(`   JSON report: video_analysis.json`);

	} catch (error: any) {
		console.error(`Error: ${error.message}`);
	}
}

// Run examples
async function runAllExamples() {
	console.log("🎬 Video Analysis Examples\n");
	console.log("=".repeat(60));

	// Uncomment the examples you want to run:

	// await exampleBasicUsage();
	// await exampleDetailedAnalysis();
	// await exampleQualityCheck();
	// await exampleBatchAnalysis();
	// await exampleIntegrationWithMCP();

	console.log("\n" + "=".repeat(60));
	console.log("✅ Examples complete");
}

// Run if called directly
if (require.main === module) {
	runAllExamples().catch(console.error);
}

export {
	exampleBasicUsage,
	exampleDetailedAnalysis,
	exampleQualityCheck,
	exampleBatchAnalysis,
	exampleIntegrationWithMCP
};
