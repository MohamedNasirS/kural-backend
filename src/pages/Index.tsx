import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Lock,
  MapPin,
  Search,
  Shield,
  Smartphone,
  Users,
  Zap
} from "lucide-react";
import KuralFullLogo from "@/assets/images/Kural_full.png";

const Index = () => {
  const navigate = useNavigate();
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isSubmittingDemo, setIsSubmittingDemo] = useState(false);
  const [demoSubmitted, setDemoSubmitted] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoForm, setDemoForm] = useState({
    fullName: "",
    email: "",
    organization: "",
    preferredDate: "",
    preferredTime: "",
    notes: ""
  });

  const resetDemoForm = () => {
    setDemoForm({
      fullName: "",
      email: "",
      organization: "",
      preferredDate: "",
      preferredTime: "",
      notes: ""
    });
    setDemoSubmitted(false);
    setDemoError(null);
    setIsSubmittingDemo(false);
  };

  const handleDemoOpenChange = (open: boolean) => {
    setIsDemoOpen(open);
    if (!open) {
      resetDemoForm();
    }
  };

  const handleDemoInputChange = (field: keyof typeof demoForm) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setDemoForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
    if (demoError) {
      setDemoError(null);
    }
  };

  const handleDemoSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!demoForm.fullName || !demoForm.email || !demoForm.preferredDate || !demoForm.preferredTime) {
      setDemoError("Please fill in your name, email, preferred date, and time.");
      return;
    }

    setDemoError(null);
    setIsSubmittingDemo(true);

    window.setTimeout(() => {
      setIsSubmittingDemo(false);
      setDemoSubmitted(true);
    }, 800);
  };

  const stats = [
    { value: "5M+", label: "Voters Managed" },
    { value: "200+", label: "Constituencies" },
    { value: "10K+", label: "Field Agents" },
    { value: "99.9%", label: "Uptime" }
  ];

  const features = [
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Live dashboards tracking voter sentiment, turnout predictions, and campaign performance metrics."
    },
    {
      icon: Users,
      title: "Voter Management",
      description: "Comprehensive voter profiles with family records, demographics, and engagement history."
    },
    {
      icon: ClipboardList,
      title: "Survey Builder",
      description: "Create and deploy custom surveys with drag-and-drop ease. Collect field data instantly."
    },
    {
      icon: Building2,
      title: "Booth Operations",
      description: "Manage polling booths, assign agents, and monitor activities across all locations."
    },
    {
      icon: MapPin,
      title: "Geographic Intelligence",
      description: "Map-based visualization for booth and constituency-level insights and planning."
    },
    {
      icon: Search,
      title: "Live Monitoring",
      description: "Track survey responses, agent activities, and receive instant alerts on critical updates."
    }
  ];

  const capabilities = [
    "Predictive analytics for voter behavior",
    "Multi-level role-based dashboards",
    "Real-time field agent coordination",
    "Automated reporting and exports",
    "Mobile-optimized for field work",
    "Enterprise-grade data security"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-8">
            <img src={KuralFullLogo} alt="KuralApp" className="h-9 w-auto" />
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#platform" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Platform</a>
              <a href="#security" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Security</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setIsDemoOpen(true)} className="hidden sm:inline-flex">
              Request Demo
            </Button>
            <Button onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative px-4 py-20 md:px-6 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
              <span className="mr-2 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">New</span>
              <span className="text-muted-foreground">AI-powered campaign intelligence now available</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              The Command Center for
              <span className="text-primary"> Modern Elections</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Manage constituencies, coordinate field teams, and make data-driven decisions with India's most comprehensive election campaign platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/login")} className="w-full sm:w-auto text-base px-8">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setIsDemoOpen(true)} className="w-full sm:w-auto text-base px-8">
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b bg-muted/30">
        <div className="container px-4 py-12 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Win
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful tools designed for modern electoral campaigns. From voter management to real-time analytics.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="group relative overflow-hidden border-0 bg-muted/30 p-6 transition-all hover:bg-muted/50 hover:shadow-lg">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Platform Section */}
      <section id="platform" className="border-y bg-muted/20">
        <div className="container px-4 py-20 md:px-6 md:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for Campaign Excellence
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From national administrators to field supervisors, KuralApp provides role-specific dashboards that deliver the insights each team member needs.
              </p>
              <ul className="mt-8 space-y-4">
                {capabilities.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button onClick={() => navigate("/login")}>
                  Explore the Platform
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Campaign Overview</p>
                      <p className="text-2xl font-bold">AC 119 Dashboard</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-background/80 p-4">
                      <p className="text-sm text-muted-foreground">Total Voters</p>
                      <p className="text-xl font-bold">3,42,890</p>
                      <p className="text-xs text-emerald-600">+2.4% from last month</p>
                    </div>
                    <div className="rounded-lg bg-background/80 p-4">
                      <p className="text-sm text-muted-foreground">Surveys Done</p>
                      <p className="text-xl font-bold">12,458</p>
                      <p className="text-xs text-emerald-600">78% completion rate</p>
                    </div>
                    <div className="rounded-lg bg-background/80 p-4">
                      <p className="text-sm text-muted-foreground">Active Agents</p>
                      <p className="text-xl font-bold">156</p>
                      <p className="text-xs text-primary">Online now</p>
                    </div>
                    <div className="rounded-lg bg-background/80 p-4">
                      <p className="text-sm text-muted-foreground">Booths Covered</p>
                      <p className="text-xl font-bold">289/312</p>
                      <p className="text-xs text-amber-600">23 remaining</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="container px-4 py-20 md:px-6 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Enterprise-Grade Security
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Your campaign data is protected with the highest security standards.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <Card className="border-0 bg-muted/30 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground">
                Granular permissions ensure users only see data relevant to their role and constituency.
              </p>
            </Card>
            <Card className="border-0 bg-muted/30 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Data Encryption</h3>
              <p className="text-sm text-muted-foreground">
                All data is encrypted in transit and at rest using industry-standard protocols.
              </p>
            </Card>
            <Card className="border-0 bg-muted/30 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold">Secure Mobile Access</h3>
              <p className="text-sm text-muted-foreground">
                Field agents can securely access the platform from any device with authenticated sessions.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-primary/5">
        <div className="container px-4 py-20 md:px-6 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Transform Your Campaign?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join the leading political campaigns using KuralApp to manage voters, coordinate teams, and win elections.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate("/login")} className="w-full sm:w-auto text-base px-8">
                Start Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setIsDemoOpen(true)} className="w-full sm:w-auto text-base px-8">
                Request a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Dialog */}
      <Dialog open={isDemoOpen} onOpenChange={handleDemoOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Demo</DialogTitle>
            <DialogDescription>
              Fill in your details and we'll arrange a personalized walkthrough of KuralApp.
            </DialogDescription>
          </DialogHeader>

          {demoSubmitted ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <p className="font-semibold">Thank you{demoForm.fullName ? `, ${demoForm.fullName}` : ""}!</p>
                <p>Our team will contact you shortly to confirm your demo.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => handleDemoOpenChange(false)}>Close</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-4">
              {demoError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  {demoError}
                </div>
              )}
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="demo-full-name">Name</Label>
                    <Input
                      id="demo-full-name"
                      value={demoForm.fullName}
                      onChange={handleDemoInputChange("fullName")}
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-email">Email</Label>
                    <Input
                      id="demo-email"
                      type="email"
                      value={demoForm.email}
                      onChange={handleDemoInputChange("email")}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-organization">Organization</Label>
                  <Input
                    id="demo-organization"
                    value={demoForm.organization}
                    onChange={handleDemoInputChange("organization")}
                    placeholder="Campaign or party name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="demo-date">Preferred Date</Label>
                    <Input
                      id="demo-date"
                      type="date"
                      value={demoForm.preferredDate}
                      onChange={handleDemoInputChange("preferredDate")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="demo-time">Preferred Time</Label>
                    <Input
                      id="demo-time"
                      type="time"
                      value={demoForm.preferredTime}
                      onChange={handleDemoInputChange("preferredTime")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-notes">Additional Notes</Label>
                  <Textarea
                    id="demo-notes"
                    value={demoForm.notes}
                    onChange={handleDemoInputChange("notes")}
                    placeholder="Tell us about your requirements..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmittingDemo} className="w-full">
                  {isSubmittingDemo ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container px-4 py-12 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src={KuralFullLogo} alt="KuralApp" className="h-8 w-auto" />
              <span className="text-sm text-muted-foreground">
                Empowering Democracy through Data
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">About</button>
              <button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button>
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} KuralApp. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
