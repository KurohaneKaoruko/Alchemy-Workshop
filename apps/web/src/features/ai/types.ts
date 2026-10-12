import type { EventContext } from "@/features/game/types";

export interface AiEventRequestBody {
  context: EventContext;
  config: {
    baseUrl?: string;
    model: string;
    apiKey: string;
  };
}

export interface AiEventResponseBody {
  title: string;
  body: string;
  tags?: string[];
}
