import type {
  ArmyMove,
  RecognitionOfWar,
} from "../internal/gamelogic/gamedata.js";
import type {
  GameState,
  PlayingState,
} from "../internal/gamelogic/gamestate.js";
import { writeLog, type GameLog } from "../internal/gamelogic/logs.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { AckType } from "../internal/pubsub/consume.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return (ps: PlayingState): AckType => {
    handlePause(gs, ps);
    process.stdout.write("> ");
    return AckType.Ack;
  };
}

export function handlerMove(
  gs: GameState,
  publishWar: (rw: RecognitionOfWar) => Promise<void>,
): (move: ArmyMove) => Promise<AckType> {
  return async (move: ArmyMove): Promise<AckType> => {
    try {
      const outcome = handleMove(gs, move);
      switch (outcome) {
        case MoveOutcome.Safe:
          return AckType.Ack;
        case MoveOutcome.MakeWar:
          const rw: RecognitionOfWar = {
            attacker: move.player,
            defender: gs.getPlayerSnap(),
          };
          try {
            await publishWar(rw);
            return AckType.Ack;
          } catch (error) {
            return AckType.NackRequeue;
          }

        default:
          return AckType.NackDiscard;
      }
    } finally {
      process.stdout.write("> ");
    }
  };
}

export function handlerWar(
  gs: GameState,
  publishLog: (msg: string) => Promise<void>,
): (rw: RecognitionOfWar) => Promise<AckType> {
  return async (rw: RecognitionOfWar): Promise<AckType> => {
    try {
      const outcome = handleWar(gs, rw);

      switch (outcome.result) {
        case WarOutcome.NotInvolved:
          return AckType.NackRequeue;
        case WarOutcome.NoUnits:
          return AckType.NackDiscard;
        case WarOutcome.OpponentWon:
          try {
            await publishLog(
              `${outcome.winner} won a war against ${outcome.loser}`,
            );
          } catch (err) {
            console.error("Error publishing game log:", err);
            return AckType.NackRequeue;
          }
        case WarOutcome.YouWon:
          try {
            await publishLog(
              `${outcome.winner} won a war against ${outcome.loser}`,
            );
          } catch (err) {
            console.error("Error publishing game log:", err);
            return AckType.NackRequeue;
          }
          return AckType.Ack;
        case WarOutcome.Draw:
          try {
            await publishLog(
              `A war between ${outcome.attacker} and ${outcome.defender} resulted in a draw`,
            );
          } catch (err) {
            console.error("Error publishing game log:", err);
            return AckType.NackRequeue;
          }

          return AckType.Ack;
        default:
          console.log("An error happened");
          return AckType.NackDiscard;
      }
    } finally {
      process.stdout.write("> ");
    }
  };
}

export async function handlerLog(data: GameLog): Promise<AckType> {
  try {
    await writeLog(data);
    return AckType.Ack;
  } catch (error) {
    return AckType.NackRequeue;
  } finally {
    process.stdout.write("> ");
  }
}
