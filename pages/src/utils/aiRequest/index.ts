import { requestAsStream } from "./aiRequest";

export const onRequest = requestAsStream({
  url: "/api/assistant/sse" 
});
