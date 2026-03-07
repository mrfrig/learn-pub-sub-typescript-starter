import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publishJSON.js";
import {
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
} from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { getInput, printServerHelp } from "../internal/gamelogic/gamelogic.js";
import {
  declareAndBind,
  SimpleQueueType,
} from "../internal/pubsub/declareAndBind.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  console.log("Starting Peril server...");

  const conn = await amqp.connect(rabbitConnString);
  console.log("Connection was successful ");

  const channel = await conn.createConfirmChannel();

  await declareAndBind(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    "game_logs.*",
    SimpleQueueType.Durable,
  );

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      try {
        await conn.close();
        console.log("RabbitMQ connection closed.");
      } catch (err) {
        console.error("Error closing RabbitMQ connection:", err);
      } finally {
        process.exit(0);
      }
    }),
  );

  printServerHelp();

  while (true) {
    const words = await getInput();
    if (words.length === 0) {
      continue;
    }
    const command = words[0];

    if (command === "pause") {
      console.log("Sending a pause message");
      const playingState: PlayingState = {
        isPaused: true,
      };

      await publishJSON(channel, ExchangePerilDirect, PauseKey, playingState);
    } else if (command === "resume") {
      console.log("Sending a resume message");
      const playingState: PlayingState = {
        isPaused: false,
      };

      await publishJSON(channel, ExchangePerilDirect, PauseKey, playingState);
    } else if (command === "quit") {
      console.log("Goodbye!");
      process.exit(0);
    } else {
      console.log("I don't understand the command");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
