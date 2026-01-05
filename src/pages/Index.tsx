import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, BookOpen, BarChart3, Shield, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Users, title: 'Student Management', description: 'Easily manage student records and profiles' },
    { icon: BookOpen, title: 'Score Tracking', description: 'Record and analyze academic performance' },
    { icon: BarChart3, title: 'Reports & Analytics', description: 'Generate comprehensive report cards' },
    { icon: Shield, title: 'Secure Access', description: 'Role-based access for admins and teachers' },
  ];

  const benefits = [
    'Streamlined academic workflows',
    'Real-time grade calculations',
    'Bulk PDF report generation',
    'Multi-class support',
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center text-center space-y-8">
            {/* Badge */}
            <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">School Management Made Easy</span>
            </div>

            {/* Main heading */}
            <h1 className="animate-fade-in text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight" style={{ animationDelay: '0.1s' }}>
              Empower Your School
              <span className="block mt-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                With Smart Tools
              </span>
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-in max-w-2xl text-lg md:text-xl text-muted-foreground" style={{ animationDelay: '0.2s' }}>
              A comprehensive platform for managing students, tracking scores, and generating professional report cards with ease.
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-in flex flex-col sm:flex-row gap-4" style={{ animationDelay: '0.3s' }}>
              <Button
                size="lg"
                onClick={() => navigate('/school-code')}
                className="gradient-primary text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/super-admin')}
                className="px-8 py-6 text-lg border-2 hover:bg-muted transition-all duration-300"
              >
                Super Admin
              </Button>
            </div>

            {/* Floating icon */}
            <div className="animate-float mt-8">
              <div className="p-6 rounded-2xl gradient-primary shadow-glow">
                <GraduationCap className="h-16 w-16 text-primary-foreground" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed to simplify school administration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Schools Love Us
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Our platform is trusted by schools to manage their academic operations efficiently and professionally.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-accent/20">
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-foreground font-medium">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-20" />
              <div className="relative bg-card rounded-3xl p-8 border border-border shadow-xl">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl gradient-primary">
                      <BarChart3 className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">98%</p>
                      <p className="text-sm text-muted-foreground">Time Saved on Reports</p>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl gradient-secondary">
                      <Users className="h-8 w-8 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">1000+</p>
                      <p className="text-sm text-muted-foreground">Students Managed</p>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl gradient-success">
                      <BookOpen className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">Easy</p>
                      <p className="text-sm text-muted-foreground">Score Entry & Tracking</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 md:p-12 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your School?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                Join schools already using our platform to streamline their academic management.
              </p>
              <Button
                size="lg"
                onClick={() => navigate('/school-code')}
                className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Enter School Code
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Edu Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
