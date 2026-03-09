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
  handler: (data: T) => AckType,
): Promise<void> {
  const [channel, queue] = await declareAndBind(
    conn,
    exchange,
    queueName,
    key,
    queueType,
  );

  channel.consume(queueName, (msg: amqp.ConsumeMessage | null) => {
    if (msg === null) return;

    const content = JSON.parse(msg.content.toString());
    const actType = handler(content);

    if (actType === AckType.Ack) {
      console.log("Message processed successfully");
      channel.ack(msg);
    } else if (actType === AckType.NackRequeue) {
      console.log("Message not processed successfully, retrying");
      channel.nack(msg, false, true);
    } else {
      console.log("Message not processed successfully, discarding");
      channel.nack(msg, false, false);
    }
    process.stdout.write("> ");
  });
}
