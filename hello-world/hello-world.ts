import { query } from "@anthropic-ai/claude-agent-sdk";
import type { HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";

async function main() {
  const q = query({
    prompt: "Hello, Claude! Please introduce yourself in one sentence.",
    options: {
      maxTurns: 100,
      cwd: path.join(process.cwd(), "agent"),
      model: "opus",
      executable: "node", // Use the current node binary path
      includePartialMessages: true, // Enable streaming events
      allowedTools: [
        "Task",
        "Bash",
        "Glob",
        "Grep",
        "LS",
        "ExitPlanMode",
        "Read",
        "Edit",
        "MultiEdit",
        "Write",
        "NotebookEdit",
        "WebFetch",
        "TodoWrite",
        "WebSearch",
        "BashOutput",
        "KillBash",
      ],
      hooks: {
        PreToolUse: [
          {
            matcher: "Write|Edit|MultiEdit",
            hooks: [
              async (input: any): Promise<HookJSONOutput> => {
                const filePath = input.tool_input.file_path || "";
                const ext = path.extname(filePath).toLowerCase();

                if (ext === ".js" || ext === ".ts") {
                  const customScriptsPath = path.join(
                    process.cwd(),
                    "agent",
                    "custom_scripts"
                  );

                  if (!filePath.startsWith(customScriptsPath)) {
                    return {
                      decision: "block",
                      stopReason: `Script files (.js and .ts) must be written to the custom_scripts directory. Please use the path: ${customScriptsPath}/${path.basename(
                        filePath
                      )}`,
                      continue: false,
                    };
                  }
                }

                return { continue: true };
              },
            ],
          },
        ],
      },
    },
  });

  for await (const message of q) {
    if (message.type === "stream_event") {
      // Handle streaming chunks
      const event = message.event;
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        process.stdout.write(event.delta.text);
      }
    } else if (message.type === "assistant" && message.message) {
      // Complete message received - add a newline
      console.log(); // Move to next line after streaming is done
    }
  }
}

main().catch(console.error);
