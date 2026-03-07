import amqp from "amqplib";
import { publishJSON } from "../internal/pubsub/publishJSON.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  console.log("Starting Peril server...");

  const conn = await amqp.connect(rabbitConnString);
  console.log("Connection was successful ");

  const channel = await conn.createConfirmChannel();

  const playingState: PlayingState = {
    isPaused: true
  }

  publishJSON(channel, ExchangePerilDirect, PauseKey, playingState);

  process.on('SIGINT', () => {
    console.log("Shutting down Peril server...");
    conn.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
