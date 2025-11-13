import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Activity,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  ClipboardList,
  Crown,
  FileText,
  GitBranch,
  Lightbulb,
  Search,
  ShieldCheck,
  Users,
  UserCheck
} from "lucide-react";

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

  const featureItems = [
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track voter sentiment, turnout, and campaign performance live through interactive dashboards."
    },
    {
      icon: Users,
      title: "Voter Management",
      description: "Maintain rich voter profiles, family records, and demographics for targeted outreach."
    },
    {
      icon: ClipboardList,
      title: "Survey Builder",
      description: "Design and deploy custom surveys with a drag-and-drop builder to collect field data instantly."
    },
    {
      icon: Building2,
      title: "Booth Management",
      description: "Organize polling booths, assign agents, and monitor booth activities in real time."
    },
    {
      icon: Search,
      title: "Live Monitoring",
      description: "Track survey responses, booth operations, and agent activities with instant alerts."
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Access",
      description: "Enable multi-level dashboards so each role sees the insights that matter most."
    }
  ];

  const intelligenceFeatures = [
    "Predictive Analytics: Anticipate voter behavior and turnout trends.",
    "Campaign Intelligence: Identify swing regions and high-impact demographics.",
    "Geographic Insights: Map-based visualization for booth and constituency levels.",
    "Smart Notifications: Instant alerts for anomalies or critical updates.",
    "Comprehensive Reports: Export performance summaries and audit logs easily."
  ];

  const roleDashboards = [
    {
      icon: Crown,
      role: "L0 – National Administrator",
      purpose: "Oversee complete campaign operations across all constituencies.",
      highlights: ["Access full analytics", "Manage system settings", "Monitor KPIs", "Control user access"]
    },
    {
      icon: GitBranch,
      role: "L1 – Constituency Director",
      purpose: "Manage and coordinate multiple constituencies efficiently.",
      highlights: ["View real-time metrics", "Assign moderators", "Analyze booth-level performance"]
    },
    {
      icon: UserCheck,
      role: "L2 – Field Supervisor",
      purpose: "Handle constituency-level voter engagement and survey execution.",
      highlights: ["Manage voters and families", "Launch surveys", "Monitor completion rates"]
    },
    {
      icon: Lightbulb,
      role: "L9 – Strategy Command Center",
      purpose: "Drive decision-making with data intelligence.",
      highlights: ["Access predictive insights", "View sentiment heatmaps", "Compare regional performance"]
    }
  ];

  const whyKuralapp = [
    {
      title: "Data-Driven Decision Making",
      description: "Transform raw campaign data into actionable insights with AI-powered analytics."
    },
    {
      title: "Real-Time Collaboration",
      description: "Enable instant coordination between teams across constituencies and roles."
    },
    {
      title: "Modular & Scalable Architecture",
      description: "Add or customize modules as your campaign grows, from voter tracking to advanced analytics."
    },
    {
      title: "Enterprise-Grade Security",
      description: "Protect sensitive campaign data using robust role-based authentication and encryption."
    },
    {
      title: "Modern Tech Stack",
      description: "Built with React, Tailwind CSS, Recharts, and Supabase-ready APIs for speed and scalability."
    },
    {
      title: "Responsive Interface",
      description: "Manage your campaign seamlessly across mobile, tablet, and desktop devices."
    },
    {
      title: "Intelligent Insights Engine",
      description: "Predict trends, optimize outreach, and maximize voter engagement using AI-enhanced analytics."
    }
  ];

  const footerLinks = [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">KuralApp</span>
          </div>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <span>Decoding Democracy through Data</span>
          </div>
          <Button onClick={() => navigate("/login")}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_theme(colors.primary/20),_transparent_60%)]" aria-hidden />
        <div className="container relative px-4 pb-24 pt-20 md:px-6 md:pb-32 md:pt-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_minmax(0,_0.9fr)]">
            <div className="text-center lg:text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                Empowering Smarter, Data-Driven Election Campaigns
              </p>
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl">
                Manage Your Electoral Campaign Efficiently
              </h1>
              <p className="mb-8 text-lg text-muted-foreground sm:text-xl md:text-2xl">
                A comprehensive platform to manage constituencies, voters, surveys, agents, and booth operations — all from a single, intelligent dashboard.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" onClick={() => navigate("/login")} className="text-lg">
                  Get Started
                </Button>
                <Button size="lg" variant="outline" className="text-lg" onClick={() => navigate("/features")}>
                  Learn More
                </Button>
              </div>
            </div>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background/60 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary">Live Campaign Overview</h3>
                  <p className="text-sm text-muted-foreground">Real-time analytics across constituencies</p>
                </div>
                <BellRing className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-primary/10 bg-background/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Turnout Forecast</span>
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold">78%</p>
                  <span className="text-xs text-emerald-500">+6.2% vs last week</span>
                </div>
                <div className="rounded-xl border border-primary/10 bg-background/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sentiment Pulse</span>
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold">Positive</p>
                  <span className="text-xs text-primary">92 live survey responses</span>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-primary/10 bg-background/70 p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Agents Online</p>
                    <p className="text-xs text-muted-foreground">Monitor field activity and escalation alerts in real time.</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <span className="font-semibold">134 active</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-emerald-500">12 new updates</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container px-4 py-20 md:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything You Need to Win</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful tools designed for modern, data-driven electoral campaigns.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="group sm:col-span-2 lg:col-span-3 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background/80 p-6 shadow-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary/80">Predictive Analysis Dashboard</p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">Campaign Command Center Overview</h3>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Live snapshot synced with the hero command center. Monitor turnout forecasts, sentiment momentum, booth health, and alert queues in one connected workspace.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                <BellRing className="h-4 w-4" />
                4 live alerts
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-primary/10 bg-background/80 p-4">
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  Turnout Forecast
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-semibold">78%</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confidence</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-1.5" />
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  +6.2% vs last week
                </span>
              </div>

              <div className="rounded-xl border border-primary/10 bg-background/80 p-4">
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  Sentiment Pulse
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-semibold">Positive</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Responses</span>
                    <span>92 live</span>
                  </div>
                  <Progress value={68} className="h-1.5" />
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <Users className="h-3.5 w-3.5" />
                  124 constituencies covered
                </span>
              </div>

              <div className="rounded-xl border border-primary/10 bg-background/80 p-4">
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  Booth Health Index
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-semibold">92/100</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Green</p>
                    <p>68</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Watch</p>
                    <p>21</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Alert</p>
                    <p>7</p>
                  </div>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-500">
                  <BellRing className="h-3.5 w-3.5" />
                  2 booths need action
                </span>
              </div>

              <div className="rounded-xl border border-primary/10 bg-background/80 p-4">
                <div className="flex items-center justify-between text-sm font-medium text-foreground">
                  Alert Queue
                  <ClipboardList className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-semibold">08</p>
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-700">
                    Ward 12 spike
                    <span className="font-medium">Review</span>
                  </li>
                  <li className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-700">
                    Booth 47B boost
                    <span className="font-medium">Amplify</span>
                  </li>
                </ul>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Synced with Command Center
                </span>
              </div>
            </div>
          </Card>

          {featureItems.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group h-full border-primary/10 p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Intelligence Section */}
      <section id="intelligence" className="bg-primary/5 py-20">
        <div className="container px-4 md:px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">Advanced Intelligence & Insights</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Turn your campaign data into decisions that win.</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Elevate every stage of your campaign with predictive intelligence, smart alerts, and rich geographic insights built for election teams.
              </p>
            </div>
            <Card className="border-primary/10 bg-background/80 p-8 shadow-lg">
              <div className="flex flex-col gap-4">
                {intelligenceFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">{feature}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="container px-4 py-20 md:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Smart Dashboards for Every Campaign Role</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Purpose-built control panels designed to empower leaders at every level.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2">
          {roleDashboards.map((role) => {
            const Icon = role.icon;
            return (
              <Card key={role.role} className="h-full border-primary/10 p-6">
                <div className="mb-4 flex items-center gap-3 text-primary">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">{role.role}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{role.purpose}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {role.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
        <p className="mx-auto mt-10 max-w-4xl text-center text-sm text-muted-foreground">
          Each dashboard is uniquely designed to deliver clarity, control, and confidence for every leadership level.
        </p>
      </section>

      {/* Why KuralApp Section */}
      <section id="why-kuralapp" className="bg-background/80 py-20">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Why KuralApp Stands Out</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Innovation, intelligence, and impact — all built into one powerful ecosystem.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {whyKuralapp.map((point) => (
              <Card key={point.title} className="h-full border-primary/10 p-6">
                <h3 className="text-lg font-semibold">{point.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{point.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="container px-4 py-20 md:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background/70 p-10 shadow-xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to Transform Your Campaign?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join successful campaigns already powered by Kuralapp. Manage voters, track surveys, and monitor performance — all in real time.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-lg" onClick={() => navigate("/login")}>
                Sign In to Your Dashboard
              </Button>
                <Button size="lg" variant="outline" className="text-lg" onClick={() => setIsDemoOpen(true)}>
                Request a Demo
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <Dialog open={isDemoOpen} onOpenChange={handleDemoOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Live KuralApp Demo</DialogTitle>
            <DialogDescription>
              Tell us when to connect — we’ll call back quickly with a personalised walkthrough.
            </DialogDescription>
          </DialogHeader>

          {demoSubmitted ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <p className="font-semibold">Thank you{demoForm.fullName ? `, ${demoForm.fullName}` : "!"}</p>
                <p>Our team has your details and will call you shortly to confirm the demo slot.</p>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="demo-full-name">Full name</Label>
                  <Input
                    id="demo-full-name"
                    value={demoForm.fullName}
                    onChange={handleDemoInputChange("fullName")}
                    placeholder="Ananya Rao"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-email">Work email</Label>
                  <Input
                    id="demo-email"
                    type="email"
                    value={demoForm.email}
                    onChange={handleDemoInputChange("email")}
                    placeholder="you@campaign.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-organization">Organization</Label>
                  <Input
                    id="demo-organization"
                    value={demoForm.organization}
                    onChange={handleDemoInputChange("organization")}
                    placeholder="Campaign name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-date">Preferred date</Label>
                  <Input
                    id="demo-date"
                    type="date"
                    value={demoForm.preferredDate}
                    onChange={handleDemoInputChange("preferredDate")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-time">Preferred time</Label>
                  <Input
                    id="demo-time"
                    type="time"
                    value={demoForm.preferredTime}
                    onChange={handleDemoInputChange("preferredTime")}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="demo-notes">Anything else we should know?</Label>
                  <Textarea
                    id="demo-notes"
                    value={demoForm.notes}
                    onChange={handleDemoInputChange("notes")}
                    placeholder="Share campaign goals, key regions, or special requirements."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmittingDemo}>
                  {isSubmittingDemo ? "Scheduling..." : "Submit request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer id="footer" className="border-t bg-background py-10">
        <div className="container flex flex-col gap-6 px-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-medium text-foreground">© 2025 KuralApp Application . All rights reserved.</p>
            <p>Empowering Democracy through Data and Technology.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:justify-end">
            {footerLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
