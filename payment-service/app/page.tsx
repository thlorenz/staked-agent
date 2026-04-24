import { PaymentForm } from "@/src/components/payment-form";
import { loadConfig } from "@/src/server/config";

export default function HomePage() {
  const { agentDestination } = loadConfig();

  return <PaymentForm agentDestination={agentDestination} />;
}
