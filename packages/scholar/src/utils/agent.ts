import { Agent } from "@mariozechner/pi-agent-core";
import { getModel, type Api, type Model } from "@mariozechner/pi-ai";

function getReadingModel(): Model<Api> {
  const provider = process.env.OPENAI_PROVIDER ?? "openai";
  const modelName = process.env.OPENAI_MODEL ?? "gpt-5.5";
  let model = getModel(provider as any, modelName as any);

  if (!model) {
    model = {
      id: modelName,
      name: modelName,
      api: "openai-completions",
      provider,
      baseUrl: "",
      reasoning: false,
      input: ["text", "image"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128000,
      maxTokens: 16384,
    } as Model<Api>;
  }

  const baseUrl = process.env.OPENAI_BASE_URL;
  if (baseUrl) {
    model.baseUrl = baseUrl;
  }

  return model;
}

/** Create a paper-reading Agent with the given system prompt. */
export function createReadingAgent(systemPrompt: string): Agent {
  const model = getReadingModel();

  return new Agent({
    initialState: {
      systemPrompt,
      model,
    },
    getApiKey: () => process.env.OPENAI_API_KEY ?? "",
  });
}

export interface AgentTask<T> {
  run: () => Promise<T>;
}

/** Run tasks with concurrency control. Returns results in original order. */
export async function runAgents<T>(tasks: AgentTask<T>[], concurrency: number): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results = new Array<T>(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i].run();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
