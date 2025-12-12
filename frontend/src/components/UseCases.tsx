import { Card } from "@/components/ui/card";
import { Building2, Landmark, Users2, Briefcase, Home, Shield } from "lucide-react";

const useCases = [
  {
    icon: Building2,
    title: "Fintech & Banking",
    description: "Streamline KYC for digital wallets, lending apps, and microfinance institutions with trusted, verified identities.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Users2,
    title: "DAO Membership",
    description: "Verify real humans for decentralized organizations without compromising privacy or decentralization principles.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Briefcase,
    title: "Gig Economy",
    description: "Enable trusted worker verification for ride-sharing, delivery services, and freelance platforms.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: Landmark,
    title: "Government Services",
    description: "Provide proof-of-residence and identity for local governance programs, subsidies, and community initiatives.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Home,
    title: "Real Estate",
    description: "Verify tenant identities and address history for property rental and management platforms.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Shield,
    title: "NGO Programs",
    description: "Authenticate beneficiaries for aid distribution, ensuring resources reach legitimate recipients.",
    color: "from-teal-500 to-cyan-500",
  },
];

const UseCases = () => {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Powering Trust{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Everywhere
            </span>
          </h2>
          <p className="text-xl text-muted-foreground">
            From financial services to community programs, YoTouch brings verified identity where it's needed most
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden p-8 bg-card border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${useCase.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center mb-6 shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-300`}>
                  <useCase.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{useCase.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{useCase.description}</p>
              </div>

              {/* Corner accent */}
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${useCase.color} opacity-5 blur-2xl rounded-full transform translate-x-8 -translate-y-8`} />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
