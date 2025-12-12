import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Lock } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/90 to-secondary/95" />
      </div>

      {/* Floating shapes */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/10 backdrop-blur-sm border border-background/20 mb-8 animate-fade-in">
            <Shield className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium text-primary-foreground">Powered by Cardano Blockchain</span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 animate-fade-in leading-tight" style={{ animationDelay: '0.1s' }}>
            Decentralized Identity
            <span className="block mt-2 bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
              Verified by Community
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-primary-foreground/90 mb-12 max-w-3xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: '0.2s' }}>
            A trust layer for people, communities, and digital services. Prove who you are without depending on centralized authorities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button size="xl" variant="accent" className="group" onClick={() => window.location.href = '/auth'}>
              Get Started
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="xl" variant="outline" className="bg-background/10 backdrop-blur-sm border-primary-foreground/30 text-primary-foreground hover:bg-background/20" onClick={() => {
              document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-background/10 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-primary-foreground">Blockchain Secured</h3>
              <p className="text-sm text-primary-foreground/70">Immutable verification proofs</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-background/10 backdrop-blur-sm flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-primary-foreground">Community Verified</h3>
              <p className="text-sm text-primary-foreground/70">Trusted human validators</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-background/10 backdrop-blur-sm flex items-center justify-center">
                <Lock className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-primary-foreground">Privacy First</h3>
              <p className="text-sm text-primary-foreground/70">Zero-knowledge verification</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
