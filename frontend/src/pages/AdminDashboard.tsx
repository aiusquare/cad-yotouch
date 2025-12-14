import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Award,
  Shield,
  Users,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OverviewMetrics {
  verification: Record<string, number>;
  fieldAgents: number;
  validatorsLive: number;
}

type ApplicationStatus =
  | "kyc_pending"
  | "screening"
  | "awaiting_admin"
  | "approved"
  | "rejected"
  | "needs_info";

type RiskLevel = "low" | "medium" | "high";
type AppRole = Database["public"]["Enums"]["app_role"];
type SupportingDocuments = Record<string, Json>;

interface FieldAgentProfile {
  id: string;
  agent_id: string;
  coverage_area: string | null;
  tier: string | null;
  active: boolean;
  max_primary_validators: number;
  last_assignment_at: string | null;
  notes: string | null;
  agent?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
}

interface ProfileSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  nin: string | null;
  verification_status: string | null;
}

interface PrimaryValidatorApplication {
  id: string;
  candidate_name: string;
  candidate_contact: string | null;
  candidate_email: string | null;
  community: string | null;
  region: string | null;
  nin: string | null;
  bvn: string | null;
  supporting_documents: SupportingDocuments | null;
  risk_level: RiskLevel;
  status: ApplicationStatus;
  field_agent_id: string | null;
  primary_validator_profile_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  field_agent?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const STATUS_META: Record<
  PrimaryValidatorApplication["status"],
  { label: string; tone: string; accent: string }
> = {
  kyc_pending: {
    label: "KYC pending",
    tone: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    accent: "text-yellow-600",
  },
  screening: {
    label: "Screening",
    tone: "bg-sky-500/10 text-sky-700 border-sky-500/20",
    accent: "text-sky-600",
  },
  awaiting_admin: {
    label: "Awaiting admin",
    tone: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    accent: "text-amber-600",
  },
  approved: {
    label: "Approved",
    tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    accent: "text-emerald-600",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    accent: "text-rose-600",
  },
  needs_info: {
    label: "Needs info",
    tone: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    accent: "text-purple-600",
  },
};

const riskBadge: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkingRole, setCheckingRole] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    verification: {
      pending: 0,
      primary_validated: 0,
      verified: 0,
      rejected: 0,
    },
    fieldAgents: 0,
    validatorsLive: 0,
  });
  const [fieldAgents, setFieldAgents] = useState<FieldAgentProfile[]>([]);
  const [applications, setApplications] = useState<
    PrimaryValidatorApplication[]
  >([]);
  const [selectedApplication, setSelectedApplication] =
    useState<PrimaryValidatorApplication | null>(null);
  const [search, setSearch] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [agentSearchTerm, setAgentSearchTerm] = useState("");
  const [agentSearchResults, setAgentSearchResults] = useState<
    ProfileSummary[]
  >([]);
  const [agentSearchLoading, setAgentSearchLoading] = useState(false);
  const [selectedAgentCandidate, setSelectedAgentCandidate] =
    useState<ProfileSummary | null>(null);
  const [agentCoverageArea, setAgentCoverageArea] = useState("");
  const [agentTier, setAgentTier] = useState<
    "community" | "regional" | "national"
  >("community");
  const [agentMaxValidators, setAgentMaxValidators] = useState("15");
  const [agentNotes, setAgentNotes] = useState("");
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [walletUtxoCount, setWalletUtxoCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const verifyRole = async () => {
      setCheckingRole(true);
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        if (error) {
          console.error("Role check error", error);
          toast.error("Unable to verify your access");
          navigate("/dashboard");
          return;
        }

        if (!data) {
          toast.error("You need admin rights to view this page");
          navigate("/dashboard");
          return;
        }

        setHasRole(true);
      } finally {
        setCheckingRole(false);
      }
    };

    verifyRole();
  }, [user, navigate]);

  const fetchWalletUtxos = async () => {
    try {
      setWalletLoading(true);
      const [utxoRes, balanceRes] = await Promise.all([
        fetch("/api/wallet/utxo-count"),
        fetch("/api/wallet/balance"),
      ]);

      if (!utxoRes.ok) throw new Error("Failed to fetch UTXO count");
      if (!balanceRes.ok) throw new Error("Failed to fetch balance");

      const utxoData = await utxoRes.json();
      const balanceData = await balanceRes.json();

      setWalletUtxoCount(utxoData.utxoCount);
      setWalletBalance(balanceData.balanceAda);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
      setWalletUtxoCount(0);
      setWalletBalance(0);
    } finally {
      setWalletLoading(false);
    }
  };

  const loadDashboard = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const [
        verificationCounts,
        fieldAgentProfiles,
        validatorApplications,
        fieldAgentRoleCount,
        validatorRoleCount,
      ] = await Promise.all([
        fetchVerificationCounts(),
        fetchFieldAgents(),
        fetchValidatorApplications(),
        countByRole("field_agent"),
        countByRole("primary_validator"),
        fetchWalletUtxos(),
      ]);

      setMetrics({
        verification: verificationCounts,
        fieldAgents: fieldAgentRoleCount,
        validatorsLive: validatorRoleCount,
      });
      setFieldAgents(fieldAgentProfiles);
      setApplications(validatorApplications);
      setSelectedApplication((current) => {
        if (!validatorApplications.length) {
          return null;
        }
        if (!current) {
          return validatorApplications[0];
        }
        return (
          validatorApplications.find(
            (application) => application.id === current.id
          ) ?? validatorApplications[0]
        );
      });
    } catch (error) {
      console.error("Failed to load admin dashboard", error);
      toast.error("Unable to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasRole) return;
    loadDashboard();

    const channel = supabase
      .channel("admin-dashboard-refresh")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "primary_validator_applications",
        },
        () => loadDashboard(false)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "verification_requests" },
        () => loadDashboard(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasRole, loadDashboard]);

  const fetchVerificationCounts = async () => {
    const statuses = [
      "pending",
      "primary_validated",
      "verified",
      "rejected",
    ] as const;
    const entries = await Promise.all(
      statuses.map(async (status) => {
        const { count, error } = await supabase
          .from("verification_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        if (error) throw error;
        return [status, count || 0];
      })
    );
    return Object.fromEntries(entries) as OverviewMetrics["verification"];
  };

  const countByRole = async (role: AppRole) => {
    const { count, error } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", role);
    if (error) throw error;
    return count || 0;
  };

  const fetchFieldAgents = async (): Promise<FieldAgentProfile[]> => {
    const { data, error } = await supabase
      .from("field_agent_profiles")
      .select(
        `
        id,
        agent_id,
        coverage_area,
        tier,
        active,
        max_primary_validators,
        last_assignment_at,
        notes,
        profiles:profiles!field_agent_profiles_agent_id_fkey (
          first_name,
          last_name,
          phone_number
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (
      data?.map((entry) => ({
        id: entry.id,
        agent_id: entry.agent_id,
        coverage_area: entry.coverage_area,
        tier: entry.tier,
        active: entry.active,
        max_primary_validators: entry.max_primary_validators,
        last_assignment_at: entry.last_assignment_at,
        notes: entry.notes,
        agent: entry.profiles,
      })) || []
    );
  };

  const fetchValidatorApplications = async (): Promise<
    PrimaryValidatorApplication[]
  > => {
    const { data, error } = await supabase
      .from("primary_validator_applications")
      .select(
        `
        *,
        field_agent:profiles!primary_validator_applications_field_agent_id_fkey (
          first_name,
          last_name
        )
      `
      )
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return (
      data?.map((entry) => ({
        id: entry.id,
        candidate_name: entry.candidate_name,
        candidate_contact: entry.candidate_contact,
        candidate_email: entry.candidate_email,
        community: entry.community,
        region: entry.region,
        nin: entry.nin,
        bvn: entry.bvn,
        supporting_documents:
          (entry.supporting_documents as SupportingDocuments | null) ?? null,
        risk_level: (entry.risk_level as RiskLevel) ?? "medium",
        status: (entry.status as ApplicationStatus) ?? "kyc_pending",
        field_agent_id: entry.field_agent_id,
        primary_validator_profile_id: entry.primary_validator_profile_id,
        admin_notes: entry.admin_notes,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        field_agent: entry.field_agent,
      })) || []
    );
  };

  const applicationsByStatus = useMemo(() => {
    const base: Record<ApplicationStatus, number> = {
      kyc_pending: 0,
      screening: 0,
      awaiting_admin: 0,
      needs_info: 0,
      approved: 0,
      rejected: 0,
    };

    applications.forEach((app) => {
      base[app.status] = (base[app.status] || 0) + 1;
    });

    return base;
  }, [applications]);

  const applicationsByAgent = useMemo(() => {
    const map = new Map<
      string,
      { total: number; approved: number; open: number }
    >();
    applications.forEach((app) => {
      if (!app.field_agent_id) return;
      const entry = map.get(app.field_agent_id) || {
        total: 0,
        approved: 0,
        open: 0,
      };
      entry.total += 1;
      if (app.status === "approved") {
        entry.approved += 1;
      }
      if (app.status !== "approved" && app.status !== "rejected") {
        entry.open += 1;
      }
      map.set(app.field_agent_id, entry);
    });
    return map;
  }, [applications]);

  const existingAgentIds = useMemo(
    () => new Set(fieldAgents.map((agent) => agent.agent_id)),
    [fieldAgents]
  );

  const filteredApplications = useMemo(() => {
    if (!search) return applications;
    return applications.filter(
      (app) =>
        app.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
        (app.community?.toLowerCase().includes(search.toLowerCase()) ??
          false) ||
        (app.region?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  }, [applications, search]);

  const handleStatusUpdate = async (status: ApplicationStatus) => {
    if (!selectedApplication) return;
    try {
      setStatusUpdating(true);
      const { error } = await supabase
        .from("primary_validator_applications")
        .update({ status })
        .eq("id", selectedApplication.id);

      if (error) throw error;
      toast.success(`Application moved to ${STATUS_META[status].label}`);
      await loadDashboard(false);
    } catch (error) {
      console.error("Failed to update application", error);
      toast.error("Unable to update application status");
    } finally {
      setStatusUpdating(false);
    }
  };

  const resetAgentForm = useCallback(() => {
    setAgentSearchTerm("");
    setAgentSearchResults([]);
    setSelectedAgentCandidate(null);
    setAgentCoverageArea("");
    setAgentTier("community");
    setAgentMaxValidators("15");
    setAgentNotes("");
    setAgentSearchLoading(false);
  }, []);

  const handleAgentDialogChange = useCallback(
    (open: boolean) => {
      setCreateAgentOpen(open);
      if (!open) {
        resetAgentForm();
      }
    },
    [resetAgentForm]
  );

  const fetchProfileCandidates = useCallback(async (term: string) => {
    const sanitized = term.replace(/[%]/g, "").replace(/,/g, "");
    if (!sanitized) {
      setAgentSearchResults([]);
      return;
    }

    try {
      setAgentSearchLoading(true);
      const pattern = `%${sanitized}%`;
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, phone_number, nin, verification_status"
        )
        .or(
          `first_name.ilike.${pattern},last_name.ilike.${pattern},phone_number.ilike.${pattern},nin.ilike.${pattern}`
        )
        .limit(10);

      if (error) throw error;
      setAgentSearchResults(data ?? []);
    } catch (error) {
      console.error("Failed to search profiles", error);
      toast.error("Unable to search profiles");
    } finally {
      setAgentSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!createAgentOpen) return;
    const query = agentSearchTerm.trim();

    if (query.length < 2) {
      setAgentSearchLoading(false);
      setAgentSearchResults([]);
      return;
    }

    const handler = setTimeout(() => {
      fetchProfileCandidates(query);
    }, 400);

    return () => clearTimeout(handler);
  }, [agentSearchTerm, createAgentOpen, fetchProfileCandidates]);

  const handleCreateAgent = async () => {
    if (!selectedAgentCandidate) {
      toast.error("Select a profile to promote");
      return;
    }

    try {
      setCreatingAgent(true);
      const maxValidatorsValue = Math.max(0, Number(agentMaxValidators) || 0);

      const { error: roleError } = await supabase.from("user_roles").upsert(
        {
          user_id: selectedAgentCandidate.id,
          role: "field_agent",
        },
        { onConflict: "user_id,role" }
      );

      if (roleError) throw roleError;

      const { error: profileError } = await supabase
        .from("field_agent_profiles")
        .upsert(
          {
            agent_id: selectedAgentCandidate.id,
            coverage_area: agentCoverageArea || null,
            tier: agentTier,
            notes: agentNotes || null,
            max_primary_validators: maxValidatorsValue,
          },
          { onConflict: "agent_id" }
        );

      if (profileError) throw profileError;

      toast.success("Field agent created");
      handleAgentDialogChange(false);
      await loadDashboard(false);
    } catch (error) {
      console.error("Failed to create field agent", error);
      toast.error("Unable to create field agent");
    } finally {
      setCreatingAgent(false);
    }
  };

  if (checkingRole || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <p className="text-muted-foreground">
          Preparing administrator controls…
        </p>
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-primary/5 text-foreground">
      <header className="border-b border-border bg-card/70 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Administrator
            </p>
            <h1 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
              <Shield className="h-6 w-6 text-primary" /> Network Control Center
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => loadDashboard()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                icon: Shield,
                title: "Pending verifications",
                value: metrics.verification.pending,
                tone: "from-amber-500/20 to-yellow-500/10",
                caption: "Awaiting AI + validators",
              },
              {
                icon: ClipboardList,
                title: "Primary validated",
                value: metrics.verification.primary_validated,
                tone: "from-sky-500/20 to-blue-500/10",
                caption: "Ready for secondary review",
              },
              {
                icon: CheckCircle,
                title: "Fully verified",
                value: metrics.verification.verified,
                tone: "from-emerald-500/20 to-green-500/10",
                caption: "All checks cleared",
              },
              {
                icon: Users,
                title: "Field agents active",
                value: metrics.fieldAgents,
                tone: "from-purple-500/20 to-indigo-500/10",
                caption: "Gearing up validator onboarding",
              },
            ] as const
          ).map((stat) => (
            <Card
              key={stat.title}
              className="border-border/50 bg-card/80 text-foreground shadow-lg"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{stat.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {stat.caption}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "p-2 rounded-xl bg-gradient-to-br",
                      stat.tone
                    )}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-semibold text-foreground">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
          <Card className="border-border/50 bg-card/80 text-foreground shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Backend wallet UTXOs
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Available for transactions
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold text-foreground">
                {walletLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  walletUtxoCount
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80 text-foreground shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Backend wallet balance
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Total ADA available
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                  <Award className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold text-foreground">
                {walletLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>{walletBalance.toFixed(2)} ₳</>
                )}
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Field agent performance</CardTitle>
                  <CardDescription>
                    Coverage, intake velocity, and conversion rates
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAgentDialogChange(true)}
                >
                  Add field agent
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-center">Open</TableHead>
                      <TableHead className="text-center">Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldAgents.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground"
                        >
                          No field agents onboarded yet
                        </TableCell>
                      </TableRow>
                    )}
                    {fieldAgents.map((agent) => {
                      const totals = applicationsByAgent.get(
                        agent.agent_id
                      ) || {
                        total: 0,
                        approved: 0,
                        open: 0,
                      };
                      return (
                        <TableRow key={agent.id}>
                          <TableCell>
                            <div className="font-medium">
                              {agent.agent?.first_name} {agent.agent?.last_name}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {agent.agent?.phone_number || "N/A"}
                            </p>
                          </TableCell>
                          <TableCell>
                            {agent.coverage_area || "Not set"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="uppercase tracking-wide text-xs"
                            >
                              {agent.tier || "Community"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {totals.open}
                          </TableCell>
                          <TableCell className="text-center">
                            {totals.approved}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle>Validator pipeline</CardTitle>
              <CardDescription>Monitor every onboarding stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(applicationsByStatus).map(([status, count]) => {
                const typedStatus = status as ApplicationStatus;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{STATUS_META[typedStatus]?.label || status}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          STATUS_META[typedStatus]?.accent || "bg-white"
                        )}
                        style={{
                          width: `${
                            applications.length
                              ? (count / applications.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Primary validator applications</CardTitle>
                  <CardDescription>
                    Select an application to review details
                  </CardDescription>
                </div>
                <Input
                  placeholder="Search by name or region"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="max-w-xs"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-3">
                  {filteredApplications.length === 0 && (
                    <div className="text-center text-muted-foreground py-12">
                      No applications match this filter
                    </div>
                  )}
                  {filteredApplications.map((application) => (
                    <button
                      key={application.id}
                      onClick={() => setSelectedApplication(application)}
                      className={cn(
                        "w-full text-left rounded-2xl border border-border/60 bg-muted/30 p-4 transition-colors",
                        selectedApplication?.id === application.id
                          ? "border-primary/70 bg-primary/10"
                          : "hover:border-border"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold">
                            {application.candidate_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {application.community || "Unknown community"} ·{" "}
                            {application.region || "Region N/A"}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            "border",
                            STATUS_META[application.status]?.tone
                          )}
                        >
                          {STATUS_META[application.status]?.label ||
                            application.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Captured by{" "}
                          {application.field_agent?.first_name || "N/A"}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span>
                          Updated{" "}
                          {new Date(application.updated_at).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle>Application detail</CardTitle>
              <CardDescription>
                All data captured by the field team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedApplication && (
                <p className="text-muted-foreground">
                  Select an application to inspect its dossier.
                </p>
              )}
              {selectedApplication && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">
                        {selectedApplication.candidate_name}
                      </h3>
                      <Badge
                        className={cn(
                          "border",
                          STATUS_META[selectedApplication.status]?.tone
                        )}
                      >
                        {STATUS_META[selectedApplication.status]?.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>NIN: {selectedApplication.nin || "N/A"}</span>
                      <span>BVN: {selectedApplication.bvn || "N/A"}</span>
                      <span>
                        Community: {selectedApplication.community || "N/A"}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Field agent
                      </p>
                      <p className="font-medium">
                        {selectedApplication.field_agent?.first_name}{" "}
                        {selectedApplication.field_agent?.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Risk level
                      </p>
                      <Badge
                        className={cn(
                          "border",
                          riskBadge[selectedApplication.risk_level] ||
                            "bg-white/10"
                        )}
                      >
                        {selectedApplication.risk_level}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      Documents
                    </p>
                    <div className="space-y-2">
                      {Object.entries(
                        selectedApplication.supporting_documents || {}
                      ).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="text-foreground/80 capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-muted-foreground">
                            {Array.isArray(value) ? value.length : 1} file(s)
                          </span>
                        </div>
                      ))}
                      {Object.keys(
                        selectedApplication.supporting_documents || {}
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No uploads attached
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">
                      Admin notes
                    </p>
                    <p className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-foreground min-h-[80px]">
                      {selectedApplication.admin_notes || "No notes added yet"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate("needs_info")}
                      disabled={statusUpdating}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" /> Request info
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusUpdate("screening")}
                      disabled={statusUpdating}
                    >
                      Move to screening
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate("approved")}
                      disabled={statusUpdating}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate("rejected")}
                      disabled={statusUpdating}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <Dialog open={createAgentOpen} onOpenChange={handleAgentDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Onboard a field agent</DialogTitle>
            <DialogDescription>
              Promote an existing citizen record to field agent and define their
              operating envelope.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agent-search">Find profile</Label>
              <Input
                id="agent-search"
                placeholder="Search by name, phone, or NIN"
                value={agentSearchTerm}
                onChange={(event) => setAgentSearchTerm(event.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20">
              {agentSearchLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching
                  profiles…
                </div>
              ) : agentSearchResults.length ? (
                <ScrollArea className="max-h-56">
                  <div className="divide-y divide-border/50">
                    {agentSearchResults.map((profile) => {
                      const alreadyAgent = existingAgentIds.has(profile.id);
                      const isSelected =
                        selectedAgentCandidate?.id === profile.id;
                      return (
                        <button
                          type="button"
                          key={profile.id}
                          disabled={alreadyAgent}
                          onClick={() => setSelectedAgentCandidate(profile)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition",
                            isSelected
                              ? "border-l-2 border-primary bg-primary/10"
                              : "hover:bg-muted/50",
                            alreadyAgent &&
                              "cursor-not-allowed opacity-50 hover:bg-transparent"
                          )}
                        >
                          <div>
                            <p className="font-semibold">
                              {profile.first_name || "Unnamed"}{" "}
                              {profile.last_name || ""}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profile.phone_number || "No phone"} · NIN{" "}
                              {profile.nin || "N/A"}
                            </p>
                          </div>
                          <Badge
                            variant={isSelected ? "default" : "outline"}
                            className="text-xs uppercase"
                          >
                            {alreadyAgent
                              ? "Active agent"
                              : isSelected
                              ? "Selected"
                              : profile.verification_status || "Available"}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {agentSearchTerm.trim().length < 2
                    ? "Enter at least 2 characters to search all profiles."
                    : "No matching profiles. Ask the user to complete sign-up."}
                </p>
              )}
            </div>

            {selectedAgentCandidate && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm">
                <p className="font-semibold">
                  Assigning {selectedAgentCandidate.first_name || ""}{" "}
                  {selectedAgentCandidate.last_name || ""}
                </p>
                <p className="text-muted-foreground">
                  Verification status:{" "}
                  {selectedAgentCandidate.verification_status || "unknown"}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agent-coverage">Coverage area</Label>
                <Input
                  id="agent-coverage"
                  placeholder="e.g. Mainland, Lagos"
                  value={agentCoverageArea}
                  onChange={(event) => setAgentCoverageArea(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-tier">Tier</Label>
                <Select
                  value={agentTier}
                  onValueChange={(value) =>
                    setAgentTier(value as "community" | "regional" | "national")
                  }
                >
                  <SelectTrigger id="agent-tier">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-max">Maximum primary validators</Label>
              <Input
                id="agent-max"
                type="number"
                min={0}
                value={agentMaxValidators}
                onChange={(event) => setAgentMaxValidators(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-notes">Ops notes</Label>
              <Textarea
                id="agent-notes"
                rows={3}
                placeholder="Provide context, handoff details, or commitments"
                value={agentNotes}
                onChange={(event) => setAgentNotes(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleAgentDialogChange(false)}
              disabled={creatingAgent}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAgent}
              disabled={!selectedAgentCandidate || creatingAgent}
            >
              {creatingAgent && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create field agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
