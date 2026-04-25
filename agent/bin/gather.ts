async function main(): Promise<void> {
  throw new Error("gather CLI is not implemented yet.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
