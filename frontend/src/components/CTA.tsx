import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-primary via-secondary to-primary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 animate-fade-in">
            Ready to Build Trust{" "}
            <span className="block mt-2">on Cardano?</span>
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.1s' }}>
            Join the decentralized identity revolution. Whether you're an individual seeking verification or an organization building trust, YoTouch has you covered.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button size="xl" variant="accent" className="group shadow-2xl" onClick={() => window.location.href = '/auth'}>
              Start Verification
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="xl" className="bg-background/10 backdrop-blur-sm border-2 border-primary-foreground/30 text-primary-foreground hover:bg-background/20 hover:border-primary-foreground/50 shadow-lg" onClick={() => window.location.href = 'mailto:contact@yotouch.com'}>
              <Mail className="mr-2" />
              Contact Sales
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-primary-foreground/80 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm">Zero setup required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm">Privacy guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm">Community verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
