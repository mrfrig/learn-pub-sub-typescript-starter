import amqp from "amqplib";
import { SimpleQueueType } from "./enums.js";
import { declareAndBind } from "./declareAndBind.js";

export enum AckType {
  Ack,
  NackRequeue,
  NackDiscard,
}

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
  const [ch, queue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType,
  );

  await ch.consume(
    queue.queue,
    async function (msg: amqp.ConsumeMessage | null) {
      if (!msg) return;

      let data: T;
      try {
        data = JSON.parse(msg.content.toString());
      } catch (err) {
        console.error("Could not unmarshal message:", err);
        return;
      }

      try {
        const result = await handler(data);
        switch (result) {
          case AckType.Ack:
            ch.ack(msg);
            break;
          case AckType.NackDiscard:
            ch.nack(msg, false, false);
            break;
          case AckType.NackRequeue:
            ch.nack(msg, false, true);
            break;
          default:
            const unreachable: never = result;
            console.error("Unexpected ack type:", unreachable);
            return;
        }
      } catch (err) {
        console.error("Error handling message:", err);
        ch.nack(msg, false, false);
        return;
      }
    },
  );
}
