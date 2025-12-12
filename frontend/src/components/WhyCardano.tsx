import { Card } from "@/components/ui/card";
import { DollarSign, Lock, Zap, Users, Globe, CheckCircle } from "lucide-react";

const reasons = [
  {
    icon: DollarSign,
    title: "Low-Cost Transactions",
    description: "Cardano's efficient architecture enables thousands of micro-transactions at minimal cost, perfect for identity verification at scale.",
  },
  {
    icon: Lock,
    title: "High Assurance Security",
    description: "Built with formal verification methods, Cardano provides the predictable, secure foundation identity systems require.",
  },
  {
    icon: Zap,
    title: "EUTxO Model",
    description: "Extended Unspent Transaction Output model is ideal for storing immutable identity verification snapshots.",
  },
  {
    icon: Users,
    title: "Community Governance",
    description: "Decentralized reputation systems align perfectly with Cardano's community-driven philosophy.",
  },
  {
    icon: Globe,
    title: "Africa-Focused",
    description: "Cardano's investment in African identity infrastructure makes it the natural choice for YoTouch's mission.",
  },
  {
    icon: CheckCircle,
    title: "Sustainability",
    description: "Proof-of-Stake consensus ensures YoTouch can scale globally without environmental concerns.",
  },
];

const WhyCardano = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-secondary/5 to-background relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Why{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Cardano?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            The perfect blockchain infrastructure for decentralized identity verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {reasons.map((reason, index) => (
            <Card
              key={index}
              className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-glow transition-all duration-300">
                  <reason.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{reason.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border shadow-lg">
            <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Built on Cardano's proven infrastructure</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyCardano;
