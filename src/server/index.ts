import amqp from "amqplib";

async function main() {
  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  console.log("Starting Peril server...");

  const conn = await amqp.connect(rabbitConnString);
  console.log("Connection was successful ");

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
