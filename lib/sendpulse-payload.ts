import { SendMessageRequest } from "@/lib/types";

export function buildSendPulsePayload(input: SendMessageRequest) {
  return {
    channel: "instagram",
    event: "message",
    body: [
      {
        contact: {
          id: input.contactId,
          name: input.contactName,
          username: input.contactUsername
        },
        message: {
          type: "text",
          text: input.text
        },
        meta: {
          persona: input.persona,
          sandbox: true
        }
      }
    ]
  };
}
