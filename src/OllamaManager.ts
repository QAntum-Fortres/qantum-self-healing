// ─────────────────────────────────────────────────────────────────────────────
// @qantum/self-healing — Ollama Manager
// Manages local AI models for AI-powered selector healing
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { spawn } from 'child_process';

const PREFERRED_MODELS = [
  'qwen2.5-coder',
  'llama3',
  'gemma3',
  'mistral',
  'phi3',
  'gemma',
  'codellama',
  'deepseek-coder',
];

export class OllamaManager {
  private static instance: OllamaManager;
  private readonly baseUrl = 'http://localhost:11434';
  private modelName = 'llama3';
  private initialized = false;

  private constructor() {}

  static getInstance(): OllamaManager {
    if (!OllamaManager.instance) {
      OllamaManager.instance = new OllamaManager();
    }
    return OllamaManager.instance;
  }

  async getAvailableModels(): Promise<{ name: string; base: string }[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
      return (response.data.models ?? []).map((m: any) => ({
        name: m.name,
        base: m.name.split(':')[0],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Pick the best available local model from the preference list.
   */
  async adaptModel(): Promise<string> {
    const available = await this.getAvailableModels();
    const bases = available.map((m) => m.base);

    for (const preferred of PREFERRED_MODELS) {
      const found = available.find((m) => m.base === preferred);
      if (found) {
        this.modelName = found.name;
        console.log(`[OllamaManager] Using model: ${this.modelName}`);
        return this.modelName;
      }
    }

    if (available.length > 0) {
      this.modelName = available[0].name;
      console.log(`[OllamaManager] Fallback model: ${this.modelName}`);
      return this.modelName;
    }

    console.warn('[OllamaManager] No models found. Install one with: ollama pull llama3');
    return this.modelName;
  }

  async checkStatus(): Promise<boolean> {
    try {
      const r = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      return r.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Start Ollama if not running (works on Linux/macOS/Windows with Ollama installed).
   */
  async ensureRunning(): Promise<boolean> {
    if (await this.checkStatus()) {
      console.log('[OllamaManager] Ollama is running');
      return true;
    }

    console.log('[OllamaManager] Starting Ollama...');
    try {
      const proc = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
      proc.unref();

      // Wait up to 8 seconds for it to start
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await this.checkStatus()) {
          console.log('[OllamaManager] Ollama started successfully');
          this.initialized = true;
          return true;
        }
      }
    } catch (err) {
      console.error('[OllamaManager] Failed to start Ollama. Is it installed?');
      console.error('Install: https://ollama.ai/download');
    }

    return false;
  }

  /**
   * Generate text from a prompt using the selected model.
   */
  async generate(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    if (!this.initialized) {
      await this.adaptModel();
      this.initialized = true;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.modelName,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.1,
            num_predict: options?.maxTokens ?? 100,
          },
        },
        { timeout: 30000 }
      );
      return response.data.response ?? '';
    } catch (err: any) {
      throw new Error(`Ollama generation failed: ${err.message}`);
    }
  }

  getModelName(): string {
    return this.modelName;
  }

  setModelName(name: string): void {
    this.modelName = name;
  }
}
