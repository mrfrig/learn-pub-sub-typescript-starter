import amqp from "amqplib";
import { SimpleQueueType } from "./enums.js";
import { declareAndBind } from "./declareAndBind.js";

export async function subscribeJSON<T>(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
  handler: (data: T) => void,
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
    handler(content);
    channel.ack(msg);
  });
}
