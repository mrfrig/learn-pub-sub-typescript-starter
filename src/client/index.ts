import amqp from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import {
  declareAndBind,
  SimpleQueueType,
} from "../internal/pubsub/declareAndBind.js";
import { ExchangePerilDirect, PauseKey } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  console.log("Starting Peril client...");

  const conn = await amqp.connect(rabbitConnString);
  console.log("Connection was successful ");

  const username = await clientWelcome();

  const [channel, queue] = await declareAndBind(
    conn,
    ExchangePerilDirect,
    `pause.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
  );

  const state = new GameState(username);

  while (true) {
    const words = await getInput();
    if (words.length === 0) {
      continue;
    }
    const command = words[0];

    switch (command) {
      case "spawn":
        commandSpawn(state, words);
        break;

      case "move":
        commandMove(state, words);
        break;

      case "status":
        await commandStatus(state);
        break;

      case "help":
        printClientHelp();
        break;

      case "spam":
        console.log("Spamming not allowed yet!");
        break;

      case "quit":
        printQuit();
        process.exit(0);

      default:
        console.log("I don't understand the command");
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
