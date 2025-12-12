import { Card } from "@/components/ui/card";
import { Users, Shield, TrendingUp, CheckCircle, Globe, Zap } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Social-Proof Verification",
    description: "Human validators from your community verify your identity, creating a trust layer that works where traditional systems fail.",
    gradient: "from-primary to-secondary",
  },
  {
    icon: Shield,
    title: "AI-Powered Biometrics",
    description: "Advanced face recognition and liveness detection ensure the person behind the screen is real and matches official records.",
    gradient: "from-secondary to-accent",
  },
  {
    icon: TrendingUp,
    title: "Reputation System",
    description: "Validators earn reputation points based on accuracy, creating a self-reinforcing ecosystem of trusted verifiers.",
    gradient: "from-accent to-primary",
  },
  {
    icon: CheckCircle,
    title: "Immutable Proofs",
    description: "Verification hashes stored on Cardano blockchain provide tamper-proof, universally verifiable identity credentials.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Globe,
    title: "Portable Identity",
    description: "Your verified identity travels with you across platforms, apps, and services without repeated KYC processes.",
    gradient: "from-secondary to-primary",
  },
  {
    icon: Zap,
    title: "Instant Verification",
    description: "Multi-layered verification completes in minutes, not days, enabling faster onboarding and better user experiences.",
    gradient: "from-accent to-secondary",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            What Makes YoTouch{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Truly Unique
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            The first identity platform combining AI, human trust, and blockchain technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border/50 bg-card group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-glow transition-all duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
