import { Badge } from "@/components/ui/badge";
import { UserPlus, Scan, Users, Award, Check, Lock } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "User Onboarding",
    description: "Submit your name, NIN/BVN, selfie, video, and residential address. All data is immediately encrypted with AES-256.",
    points: "Stage 1",
    color: "bg-primary",
  },
  {
    icon: Scan,
    title: "AI Verification",
    description: "Advanced facial recognition compares your selfie with official ID photos. Liveness detection prevents spoofing.",
    points: "50 points",
    color: "bg-secondary",
  },
  {
    icon: Users,
    title: "Community Validation",
    description: "Primary validators (community leaders) and secondary validators (independent reviewers) verify your identity and address.",
    points: "40 points",
    color: "bg-accent",
  },
  {
    icon: Award,
    title: "Reputation Weighting",
    description: "Validator reputation scores influence the final verification score, ensuring high-quality reviews.",
    points: "10 points",
    color: "bg-primary",
  },
  {
    icon: Check,
    title: "Score Computation",
    description: "All verification layers combine to create your identity score (0-100), reflecting your verification strength.",
    points: "Final Score",
    color: "bg-secondary",
  },
  {
    icon: Lock,
    title: "Blockchain Proof",
    description: "A SHA-256 hash is stored on Cardano, creating an immutable, verifiable proof. Digital address NFT minted.",
    points: "Completed",
    color: "bg-accent",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1 text-sm">
            The Verification Pipeline
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            How{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              YoTouch Works
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            A seamless 6-step process combining AI, human validators, and blockchain technology
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent transform -translate-x-1/2" />

            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative mb-12 lg:mb-20 animate-fade-in ${
                  index % 2 === 0 ? "lg:pr-1/2" : "lg:pl-1/2 lg:text-right"
                }`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className={`lg:absolute lg:top-0 ${index % 2 === 0 ? "lg:right-0 lg:pr-16" : "lg:left-0 lg:pl-16"}`}>
                  <div className="bg-card border border-border rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className={`flex items-start gap-4 ${index % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                      <div className={`w-16 h-16 rounded-xl ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                        <step.icon className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-2xl font-bold text-foreground">{step.title}</h3>
                          <Badge className={`${step.color} text-white border-0`}>{step.points}</Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline dot */}
                <div className="hidden lg:block absolute left-1/2 top-8 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary transform -translate-x-1/2 border-4 border-background shadow-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
