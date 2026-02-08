import Navbar from "@/components/Navbar";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyDraftGuard from "@/components/landing/WhyDraftGuard";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <WhyDraftGuard />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
