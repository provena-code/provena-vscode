
const isDevMode = process.env.NODE_ENV === 'development';

/**
 * Utility class that with some helper functions for profiling code execution time.
 * Can aggregate time spent in different parts of the codebase, and can be easily disabled in production.
 */
export class Profiler {

    private enabled: boolean = isDevMode; // Set to false to disable profiling
    private timings: Map<string, {totalTime: number; startTime: number | null}> = new Map();
    private lastLabel: string | null = null;

    reset() {
        this.timings.clear();
    }

    private getTiming(label: string) {
        if (!this.timings.has(label)) {
            this.timings.set(label, { totalTime: 0, startTime: null });
        }
        return this.timings.get(label)!;
    }

    start(label: string) {
        if (!this.enabled) {
            return;
        }
        const timing = this.getTiming(label);
        timing.startTime = performance.now();
        this.lastLabel = label;
    }

    end(label: string) {
        if (!this.enabled) {
            return;
        }
        const timing = this.getTiming(label);
        if (timing.startTime === null) {
            console.warn(`Profiler: end called for label "${label}" without a matching start.`);
            return;
        }
        timing.totalTime += performance.now() - timing.startTime;
        timing.startTime = null;
        this.lastLabel = null;
    }

    endLast() {
        if (this.lastLabel) {
            this.end(this.lastLabel);
        }
    }

    endLastAndStart(label: string) {
        this.endLast();
        this.start(label);
    }

    report() {
        if (!this.enabled) {
            console.log("Profiler is disabled.");
            return;
        }
        console.log("Profiler Report:");
        this.timings.forEach((timing, label) => {
            console.log(`  ${label}: ${timing.totalTime.toFixed(2)} ms`);
        });
    }
}