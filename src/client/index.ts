import amqp from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { declareAndBind } from "../internal/pubsub/declareAndBind.js";
import { SimpleQueueType } from "../internal/pubsub/enums.js";
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  PauseKey,
} from "../internal/routing/routing.js";
import { subscribeJSON } from "../internal/pubsub/subscribeJSON.js";
import { handlerMove, handlerPause } from "./handlers.js";
import { publishJSON } from "../internal/pubsub/publishJSON.js";
import type { ArmyMove } from "../internal/gamelogic/gamedata.js";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  console.log("Starting Peril client...");

  const conn = await amqp.connect(rabbitConnString);
  console.log("Connection was successful ");

  const username = await clientWelcome();

  const queueName = `pause.${username}`;

  await declareAndBind(
    conn,
    ExchangePerilDirect,
    queueName,
    PauseKey,
    SimpleQueueType.Transient,
  );

  const gs = new GameState(username);
  const channel = await conn.createConfirmChannel();

  await subscribeJSON(
    conn,
    ExchangePerilDirect,
    queueName,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(gs),
  );

  const moveQueue = `army_moves.${username}`;

  await subscribeJSON(
    conn,
    ExchangePerilTopic,
    moveQueue,
    `${ArmyMovesPrefix}.*`,
    SimpleQueueType.Transient,
    handlerMove(gs),
  );

  while (true) {
    const words = await getInput();
    if (words.length === 0) {
      continue;
    }
    const command = words[0];

    switch (command) {
      case "spawn":
        try {
          commandSpawn(gs, words);
        } catch (err) {
          console.log((err as Error).message);
        }
        break;

      case "move":
        try {
          const move = commandMove(gs, words);
          await publishJSON(channel, ExchangePerilTopic, moveQueue, move);
        } catch (err) {
          console.log((err as Error).message);
        }
        break;

      case "status":
        await commandStatus(gs);
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
