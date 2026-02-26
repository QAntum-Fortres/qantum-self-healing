// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Pattern Recognizer
// Learns from test failures and predicts future flakiness
// ─────────────────────────────────────────────────────────────────────────────

export interface Pattern {
  id: string;
  name: string;
  type: PatternType;
  features: number[];
  frequency: number;
  lastSeen: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export type PatternType =
  | 'failure'
  | 'flaky'
  | 'slow'
  | 'resource-heavy'
  | 'dependency'
  | 'timing'
  | 'data'
  | 'environment'
  | 'timeout';

export interface PatternMatch {
  pattern: Pattern;
  similarity: number;
  matchedFeatures: string[];
}

export interface RecognitionResult {
  matches: PatternMatch[];
  suggestedType: PatternType;
  confidence: number;
  recommendations: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// FEATURE EXTRACTOR
// ──────────────────────────────────────────────────────────────────────────────

export class FeatureExtractor {
  static fromExecution(data: {
    duration: number;
    avgDuration: number;
    passed: boolean;
    retries: number;
    errorType?: string;
    timeOfDay: number;
    dayOfWeek: number;
    memoryUsage?: number;
    cpuUsage?: number;
  }): number[] {
    return [
      data.duration / 1000,
      data.duration / Math.max(data.avgDuration, 1),
      data.passed ? 1 : 0,
      Math.min(data.retries / 5, 1),
      this.encodeErrorType(data.errorType),
      data.timeOfDay / 24,
      data.dayOfWeek / 7,
      Math.min((data.memoryUsage ?? 0) / 100, 1),
      Math.min((data.cpuUsage ?? 0) / 100, 1),
    ];
  }

  static fromError(message: string): number[] {
    const checks = [
      /timeout/i,
      /connection/i,
      /null|undefined/i,
      /assertion|expect/i,
      /element.*not.*found/i,
      /network/i,
      /memory/i,
      /permission|access/i,
      /concurrent|race/i,
      /database|sql/i,
    ];
    const features: number[] = checks.map((r) => (r.test(message) ? 1 : 0));
    features.push(Math.min(message.length / 1000, 1));
    features.push(Math.min(message.split('\n').length / 50, 1));
    return features;
  }

  private static encodeErrorType(errorType?: string): number {
    const map: Record<string, number> = {
      AssertionError: 0.1, TypeError: 0.2, ReferenceError: 0.3,
      TimeoutError: 0.4, NetworkError: 0.5, ElementNotFoundError: 0.6,
      DatabaseError: 0.7, PermissionError: 0.8, StaleElementReferenceError: 0.9,
    };
    return errorType ? (map[errorType] ?? 0.95) : 0;
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATTERN RECOGNIZER
// ──────────────────────────────────────────────────────────────────────────────

export class PatternRecognizer {
  private static instance: PatternRecognizer;
  private patterns: Map<string, Pattern> = new Map();
  private executionHistory: Map<string, { passed: boolean; duration: number; timestamp: number }[]> = new Map();

  static getInstance(): PatternRecognizer {
    if (!PatternRecognizer.instance) {
      PatternRecognizer.instance = new PatternRecognizer();
    }
    return PatternRecognizer.instance;
  }

  recordExecution(testId: string, data: { passed: boolean; duration: number }): void {
    const history = this.executionHistory.get(testId) ?? [];
    history.push({ ...data, timestamp: Date.now() });
    // Keep last 100 executions per test
    if (history.length > 100) history.shift();
    this.executionHistory.set(testId, history);
  }

  recognize(features: number[]): RecognitionResult {
    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns.values()) {
      const similarity = FeatureExtractor.cosineSimilarity(features, pattern.features);
      if (similarity > 0.6) {
        matches.push({
          pattern,
          similarity,
          matchedFeatures: this.describeMatches(features, pattern.features),
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    const top = matches[0];

    return {
      matches,
      suggestedType: top?.pattern.type ?? 'failure',
      confidence: top?.similarity ?? 0,
      recommendations: this.buildRecommendations(top?.pattern.type ?? 'failure'),
    };
  }

  /**
   * Predict probability (0–1) that a test will fail on next run.
   */
  predictFailure(testId: string): number {
    const history = this.executionHistory.get(testId);
    if (!history || history.length < 3) return 0;

    const recent = history.slice(-10);
    const failRate = recent.filter((e) => !e.passed).length / recent.length;
    const durations = recent.map((e) => e.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + (d - avgDuration) ** 2, 0) / durations.length;
    const cv = Math.sqrt(variance) / avgDuration; // coefficient of variation = flakiness indicator

    return Math.min(failRate * 0.7 + Math.min(cv, 1) * 0.3, 1);
  }

  learnPattern(name: string, type: PatternType, features: number[], metadata?: Record<string, any>): void {
    const id = `${type}-${Date.now()}`;
    this.patterns.set(id, {
      id, name, type, features,
      frequency: 1, lastSeen: Date.now(),
      confidence: 0.8, metadata,
    });
  }

  getPatternCount(): number {
    return this.patterns.size;
  }

  private describeMatches(features: number[], patternFeatures: number[]): string[] {
    const labels = ['duration', 'relative-duration', 'pass/fail', 'retries', 'error-type', 'time-of-day', 'day-of-week', 'memory', 'cpu'];
    const matched: string[] = [];
    const len = Math.min(features.length, patternFeatures.length, labels.length);
    for (let i = 0; i < len; i++) {
      if (Math.abs(features[i] - patternFeatures[i]) < 0.2) {
        matched.push(labels[i]);
      }
    }
    return matched;
  }

  private buildRecommendations(type: PatternType): string[] {
    const map: Record<PatternType, string[]> = {
      flaky: [
        'Add retry logic: use test.describe with retries option',
        'Add waitForLoadState() before assertions',
        'Consider test isolation improvements',
      ],
      timeout: [
        'Increase default timeout in playwright.config.ts',
        'Add explicit wait conditions instead of fixed delays',
        'Check for network bottlenecks in test environment',
      ],
      'resource-heavy': [
        'Run this test in isolation',
        'Increase Node.js heap: NODE_OPTIONS=--max-old-space-size=4096',
        'Consider parallelization with workers',
      ],
      failure: [
        'Check for recent UI changes that may have broken selectors',
        'Enable SelfHealingEngine.getInstance().heal() on failures',
        'Add screenshot capture on failure for debugging',
      ],
      slow: [
        'Profile test with DEBUG=pw:api playwright test',
        'Reduce waitForTimeout() calls',
        'Check for unnecessary page.reload() calls',
      ],
      dependency: [
        'Mock external dependencies in test environment',
        'Use page.route() to intercept and stub network calls',
        'Add health check before test run',
      ],
      timing: [
        'Use page.waitForResponse() instead of fixed timeouts',
        'Add page.waitForLoadState("networkidle") after navigation',
        'Check timezone handling in date-dependent tests',
      ],
      data: [
        'Use test fixtures for consistent test data',
        'Clean up test data after each test in afterEach()',
        'Consider database seeding before test run',
      ],
      environment: [
        'Pin Node.js version in .nvmrc',
        'Use Docker for consistent test environment',
        'Check environment variables are set correctly in CI',
      ],
    };
    return map[type] ?? [];
  }
}
