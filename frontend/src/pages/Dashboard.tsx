import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Shield,
  LogOut,
  User,
  CheckCircle,
  Clock,
  XCircle,
  ArrowRight,
  Camera,
  ShieldCheck,
  Users,
  Loader2,
  Award,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { submitProof } from "@/lib/proofs";
import { resolveBadge } from "@/lib/badges";

type BadgeBreakdown = {
  base: number;
  primary: number;
  secondary: number;
  role: number;
  reputation: number;
};

interface BadgeStats {
  level: number;
  title: string;
  description: string;
  mantra: string;
  points: number;
  progress: number;
  nextTitle: string | null;
  pointsToNext: number;
  counts: {
    primaryReviews: number;
    secondaryReviews: number;
  };
  breakdown: BadgeBreakdown;
}

const BADGE_POINT_WEIGHTS = {
  verification: 120,
  baseUnverified: 20,
  primaryReview: 60,
  secondaryReview: 40,
  rolePrimary: 25,
  roleSecondary: 15,
  reputationMultiplier: 0.5,
};

const BADGE_THEMES: Record<
  number,
  { pill: string; glow: string; accent: string }
> = {
  0: {
    pill: "bg-slate-900 text-white",
    glow: "from-slate-200/60 via-white/20 to-transparent",
    accent: "text-slate-900",
  },
  1: {
    pill: "bg-emerald-600 text-white",
    glow: "from-emerald-200/60 via-emerald-100/20 to-transparent",
    accent: "text-emerald-700",
  },
  2: {
    pill: "bg-sky-600 text-white",
    glow: "from-sky-200/60 via-sky-100/20 to-transparent",
    accent: "text-sky-700",
  },
  3: {
    pill: "bg-violet-600 text-white",
    glow: "from-violet-200/60 via-violet-100/20 to-transparent",
    accent: "text-violet-700",
  },
  4: {
    pill: "bg-amber-600 text-white",
    glow: "from-amber-200/60 via-amber-100/20 to-transparent",
    accent: "text-amber-700",
  },
};

const DEFAULT_BADGE_THEME = {
  pill: "bg-muted text-foreground",
  glow: "from-muted/50 via-background/20 to-transparent",
  accent: "text-foreground",
};

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userRequest, setUserRequest] = useState<any>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [validatorStats, setValidatorStats] = useState({
    completed: 0,
    pending: 0,
    rejected: 0,
    successRate: 0,
  });
  const [finalizingProof, setFinalizingProof] = useState(false);
  const [joiningSecondaryPool, setJoiningSecondaryPool] = useState(false);
  const [badgeStats, setBadgeStats] = useState<BadgeStats | null>(null);
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [badgeMinting, setBadgeMinting] = useState(false);
  const [userRolesLoaded, setUserRolesLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadUserRoles();
      loadUserVerificationRequest();
    }
  }, [user]);

  useEffect(() => {
    if (userRoles.includes("admin")) {
      navigate("/admin", { replace: true });
    }
  }, [userRoles, navigate]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`verification-request-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_requests",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUserVerificationRequest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (
      userRoles.includes("primary_validator") ||
      userRoles.includes("secondary_validator")
    ) {
      loadPendingRequestsCount();
      loadValidatorStats();

      // Subscribe to real-time changes
      const channel = supabase
        .channel("verification-requests-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "verification_requests",
            filter: "status=eq.pending",
          },
          (payload) => {
            console.log("New verification request:", payload);
            // Show toast notification for new requests
            toast({
              title: "New Verification Request",
              description:
                "A new verification request has been submitted and is awaiting review.",
              duration: 5000,
            });
            // Reload count and stats
            loadPendingRequestsCount();
            loadValidatorStats();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "verification_requests",
          },
          () => {
            // Reload count and stats when status changes
            loadPendingRequestsCount();
            loadValidatorStats();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "verification_requests",
          },
          () => {
            // Reload count and stats when requests are deleted
            loadPendingRequestsCount();
            loadValidatorStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userRoles, toast]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadUserVerificationRequest = async () => {
    if (!user?.id) return;
    try {
      setRequestLoading(true);
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      setUserRequest(data);
    } catch (error) {
      console.error("Error loading verification request:", error);
    } finally {
      setRequestLoading(false);
    }
  };

  const loadUserRoles = async () => {
    if (!user?.id) {
      setUserRoles([]);
      setUserRolesLoaded(false);
      return;
    }

    setUserRolesLoaded(false);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);

      if (error) throw error;
      setUserRoles(data?.map((r) => r.role) || []);
    } catch (error) {
      console.error("Error loading user roles:", error);
    } finally {
      setUserRolesLoaded(true);
    }
  };

  const handleJoinSecondaryValidatorPool = async () => {
    if (!user) return;

    if (verificationStatus !== "verified") {
      toast({
        title: "Verification required",
        description: "Complete your own verification before reviewing others.",
      });
      return;
    }

    setJoiningSecondaryPool(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: user.id, role: "secondary_validator" },
          { onConflict: "user_id,role" }
        );

      if (error) throw error;

      toast({
        title: "Secondary reviews unlocked",
        description:
          "Thanks for backing the network. New dossiers will appear in your validator dashboard.",
      });

      await loadUserRoles();
    } catch (error) {
      console.error("Error joining secondary validator pool:", error);
      toast({
        title: "Unable to start secondary reviews",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setJoiningSecondaryPool(false);
    }
  };

  const loadPendingRequestsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("verification_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error("Error loading pending requests count:", error);
    }
  };

  const loadValidatorStats = async () => {
    try {
      // Get counts for each status
      const { count: completedCount } = await supabase
        .from("verification_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "verified");

      const { count: pendingCount } = await supabase
        .from("verification_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: rejectedCount } = await supabase
        .from("verification_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected");

      const completed = completedCount || 0;
      const rejected = rejectedCount || 0;
      const total = completed + rejected;
      const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      setValidatorStats({
        completed,
        pending: pendingCount || 0,
        rejected,
        successRate,
      });
    } catch (error) {
      console.error("Error loading validator stats:", error);
    }
  };

  const loadBadgeProgress = useCallback(async () => {
    if (!user?.id || !profile) {
      return;
    }

    setBadgeLoading(true);

    try {
      const [primaryAgg, secondaryAgg] = await Promise.all([
        supabase
          .from("verification_requests")
          .select("*", { count: "exact", head: true })
          .eq("primary_validator_id", user.id)
          .in("status", ["primary_validated", "verified"]),
        supabase
          .from("verification_requests")
          .select("*", { count: "exact", head: true })
          .eq("secondary_validator_id", user.id)
          .eq("status", "verified"),
      ]);

      if (primaryAgg?.error) throw primaryAgg.error;
      if (secondaryAgg?.error) throw secondaryAgg.error;

      const primaryReviews = primaryAgg?.count || 0;
      const secondaryReviews = secondaryAgg?.count || 0;

      const basePoints =
        profile.verification_status === "verified"
          ? BADGE_POINT_WEIGHTS.verification
          : BADGE_POINT_WEIGHTS.baseUnverified;

      const rolePoints =
        (userRoles.includes("primary_validator")
          ? BADGE_POINT_WEIGHTS.rolePrimary
          : 0) +
        (userRoles.includes("secondary_validator")
          ? BADGE_POINT_WEIGHTS.roleSecondary
          : 0);

      const reputationBonus = Math.round(
        (profile.verification_score ?? 0) *
          BADGE_POINT_WEIGHTS.reputationMultiplier
      );

      const totalPoints =
        basePoints +
        primaryReviews * BADGE_POINT_WEIGHTS.primaryReview +
        secondaryReviews * BADGE_POINT_WEIGHTS.secondaryReview +
        rolePoints +
        reputationBonus;

      const { current, next, progressToNext } = resolveBadge(totalPoints);

      const storedLevel = profile.badge_level ?? 0;
      const storedPoints = profile.badge_points ?? 0;

      // Only update badge_points and timestamp; badge_level updates after blockchain mint
      if (storedPoints !== totalPoints) {
        const { data, error } = await supabase
          .from("profiles")
          .update({
            badge_points: totalPoints,
            badge_last_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setProfile(data);
        }
      }

      setBadgeStats({
        level: current.level,
        title: current.title,
        description: current.description,
        mantra: current.mantra,
        points: totalPoints,
        progress: progressToNext,
        nextTitle: next?.title ?? null,
        pointsToNext: next ? Math.max(0, next.minPoints - totalPoints) : 0,
        counts: {
          primaryReviews,
          secondaryReviews,
        },
        breakdown: {
          base: basePoints,
          primary: primaryReviews * BADGE_POINT_WEIGHTS.primaryReview,
          secondary: secondaryReviews * BADGE_POINT_WEIGHTS.secondaryReview,
          role: rolePoints,
          reputation: reputationBonus,
        },
      });
    } catch (error) {
      console.error("Error syncing badge progress:", error);
    } finally {
      setBadgeLoading(false);
    }
  }, [profile, user, userRoles]);

  useEffect(() => {
    if (!user || !profile || !userRolesLoaded) {
      return;
    }

    loadBadgeProgress();
  }, [user, profile, userRoles, userRolesLoaded, loadBadgeProgress]);

  const handleTriggerFinalProof = async () => {
    if (!user || !userRequest) {
      return;
    }

    if (userRequest.status !== "verified") {
      toast({
        title: "Hang tight",
        description: "Final proof unlocks once validators finish their review.",
      });
      return;
    }

    // setFinalizingProof(true);

    try {
      const payload = `${user.id}:${userRequest.id}:${Date.now()}`;
      let proofHash = payload;

      console.log("Generating proof hash from payload:", payload);

      if (globalThis.crypto?.subtle) {
        const encoded = new TextEncoder().encode(payload);
        const buffer = await globalThis.crypto.subtle.digest(
          "SHA-256",
          encoded
        );
        proofHash = Array.from(new Uint8Array(buffer))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } else if (globalThis.crypto?.randomUUID) {
        proofHash = globalThis.crypto.randomUUID().replace(/-/g, "");
      }

      console.log("Submitting identity proof with hash:", proofHash);

      const { txHash } = await submitProof({
        applicantHash: proofHash,
        score: userRequest.final_score || 0,
        reviewerSignatures: userRequest.reviewer_signatures || [],
      });

      console.log("Submitted identity proof, tx hash:", txHash);

      // const { error } = await supabase
      //   .from("profiles")
      //   .update({
      //     verification_status: "verified",
      //     blockchain_proof_hash: proofHash,
      //     verification_score:
      //       userRequest.final_score ?? profile?.verification_score,
      //   })
      //   .eq("id", user.id);

      // if (error) throw error;

      // await loadProfile();
      // toast({
      //   title: "Final proof triggered",
      //   description: `Transaction submitted: ${txHash}`,
      // });
    } catch (error) {
      console.error("Error triggering final proof:", error);
      toast({
        title: "Unable to trigger proof",
        description: "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setFinalizingProof(false);
    }
  };

  const handleBadgeMint = async () => {
    if (!user?.id) {
      toast({
        title: "User not loaded",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setBadgeMinting(true);

    try {
      const computedLevel = badgeStats?.level ?? 1;
      const storedLevel = profile?.badge_level ?? 0;

      // Determine action: Init, Upgrade, or Retire
      const action = storedLevel === 0 ? "Init" : "Upgrade";

      // TODO: Fetch verification key hash from Cardano wallet or stored profile data
      // For now, we'll use a placeholder; in production, this should come from the user's wallet
      const ownerVkhHex =
        (profile as any)?.cardano_vkh ||
        "0000000000000000000000000000000000000000000000000000000000000000";

      const response = await fetch("/api/badges/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: computedLevel,
          action,
          ownerVkhHex,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Badge minting failed");
      }

      const result = await response.json();

      // Update profile with the new badge level if badges are loaded
      if (profile) {
        const { data, error } = await supabase
          .from("profiles")
          .update({
            badge_level: computedLevel,
            badge_last_updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setProfile(data);
        }
      }

      toast({
        title: "Badge minted successfully!",
        description: `Minted badge: ${
          badgeStats?.title || `Level ${computedLevel}`
        }`,
      });

      console.log("Badge mint transaction:", result);
    } catch (error) {
      console.error("Error minting badge:", error);
      toast({
        title: "Badge minting failed",
        description:
          error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setBadgeMinting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <User className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatReviewTimestamp = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  };

  const aiComplete = Boolean(
    userRequest &&
      userRequest.face_match_score !== null &&
      userRequest.liveness_score !== null
  );
  const primaryComplete =
    userRequest?.status === "primary_validated" ||
    userRequest?.status === "verified";
  const secondaryComplete = userRequest?.status === "verified";

  const profileStatus = profile?.verification_status || "unverified";
  const requestDerivedStatus = useMemo(() => {
    if (!userRequest?.status) return null;

    if (userRequest.status === "verified") {
      return "verified";
    }

    if (userRequest.status === "rejected") {
      return "rejected";
    }

    if (["pending", "primary_validated"].includes(userRequest.status)) {
      return "pending";
    }

    return null;
  }, [userRequest?.status]);

  const verificationStatus = useMemo(() => {
    if (
      profileStatus === "unverified" &&
      requestDerivedStatus &&
      requestDerivedStatus !== "rejected"
    ) {
      return requestDerivedStatus;
    }

    return profileStatus;
  }, [profileStatus, requestDerivedStatus]);

  const finalProofComplete = Boolean(profile?.blockchain_proof_hash);
  const canTriggerFinalProof = Boolean(
    secondaryComplete &&
      !finalProofComplete &&
      userRequest?.status === "verified"
  );
  const eligibleForSecondaryValidatorRole =
    verificationStatus === "verified" &&
    !userRoles.includes("secondary_validator") &&
    !userRoles.includes("primary_validator") &&
    !userRoles.includes("admin");
  const primaryReviewAvailable = Boolean(
    userRequest?.primary_validated_at || userRequest?.primary_validator_notes
  );
  const secondaryReviewAvailable = Boolean(
    userRequest?.secondary_validated_at ||
      userRequest?.secondary_validator_notes ||
      typeof userRequest?.final_score === "number"
  );
  const primaryReviewTimestamp = formatReviewTimestamp(
    userRequest?.primary_validated_at
  );
  const secondaryReviewTimestamp = formatReviewTimestamp(
    userRequest?.secondary_validated_at
  );

  const badgeTheme =
    badgeStats && BADGE_THEMES[badgeStats.level]
      ? BADGE_THEMES[badgeStats.level]
      : DEFAULT_BADGE_THEME;

  const activeBadgeRoles = useMemo(() => {
    const labels: string[] = [];
    if (userRoles.includes("primary_validator"))
      labels.push("Primary validator");
    if (userRoles.includes("secondary_validator"))
      labels.push("Secondary validator");
    return labels.length ? labels.join(" + ") : "Citizen";
  }, [userRoles]);

  const progressSteps = [
    {
      title: "AI screening",
      description: "Liveness + face match checks",
      statusText: aiComplete ? "Captured" : "Awaiting upload",
      complete: aiComplete,
      icon: <Camera className="w-5 h-5" />,
    },
    {
      title: "Primary validator review",
      description: "Community validator in your area",
      statusText: primaryComplete ? "Cleared" : "Queued",
      complete: primaryComplete,
      icon: <ShieldCheck className="w-5 h-5" />,
    },
    {
      title: "Secondary validator review",
      description: "Distributed trust circle",
      statusText: secondaryComplete
        ? "Cleared"
        : primaryComplete
        ? "In review"
        : "Waiting",
      complete: secondaryComplete,
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Final proof",
      description: "Cardano hash + profile badge",
      statusText: finalProofComplete ? "Minted" : "Pending",
      complete: finalProofComplete,
      icon: <CheckCircle className="w-5 h-5" />,
    },
  ];

  const validatorFeedbackSection =
    userRequest && (primaryReviewAvailable || secondaryReviewAvailable) ? (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">
          Validator feedback
        </p>
        <div className="space-y-3">
          {primaryReviewAvailable && (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    Primary validator
                  </p>
                  {primaryReviewTimestamp && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed {primaryReviewTimestamp}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    primaryComplete
                      ? "border-green-500/50 text-green-600"
                      : "text-muted-foreground"
                  }
                >
                  {primaryComplete ? "Cleared" : "Feedback posted"}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Character</span>
                  <span className="font-medium">
                    {userRequest.character_level || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Address rating</span>
                  <span className="font-medium">
                    {userRequest.address_rating || "—"}
                  </span>
                </div>
              </div>
              {userRequest.primary_validator_notes && (
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                  {userRequest.primary_validator_notes}
                </p>
              )}
            </div>
          )}
          {secondaryReviewAvailable && (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    Secondary validator
                  </p>
                  {secondaryReviewTimestamp && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed {secondaryReviewTimestamp}
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    secondaryComplete
                      ? "border-green-500/50 text-green-600"
                      : "text-muted-foreground"
                  }
                >
                  {secondaryComplete ? "Cleared" : "Awaiting proof"}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Social proof</span>
                  <span className="font-medium">
                    {typeof userRequest.social_proof_score === "number"
                      ? `${userRequest.social_proof_score}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reputation</span>
                  <span className="font-medium">
                    {typeof userRequest.reputation_score === "number"
                      ? `${userRequest.reputation_score}%`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Final score</span>
                  <span className="font-medium">
                    {typeof userRequest.final_score === "number"
                      ? `${userRequest.final_score}%`
                      : "—"}
                  </span>
                </div>
              </div>
              {userRequest.secondary_validator_notes && (
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                  {userRequest.secondary_validator_notes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    ) : null;

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">YoTouch</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBadgeMint}
              disabled={badgeMinting}
              className="mr-2"
            >
              {badgeMinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Dev Mint
                </>
              )}
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Card */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    Welcome back, {profile?.first_name} {profile?.last_name}!
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {user?.email}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(verificationStatus)}
                    <Badge className={getStatusColor(verificationStatus)}>
                      {verificationStatus}
                    </Badge>
                  </div>
                  {(userRoles.includes("primary_validator") ||
                    userRoles.includes("secondary_validator")) && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {userRoles.includes("primary_validator")
                        ? "Primary Validator"
                        : "Secondary Validator"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            {profile?.verification_score > 0 && (
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      Verification Score
                    </span>
                    <span className="font-bold text-foreground">
                      {profile.verification_score}/100
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${profile.verification_score}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Badge Evolution */}
          <Card className="relative overflow-hidden border-primary/30 bg-card/80 shadow-lg">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${badgeTheme.glow} opacity-70 pointer-events-none`}
            />
            <CardHeader className="relative z-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Badge evolution
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Badge
                      className={`${badgeTheme.pill} text-xs tracking-wide uppercase`}
                    >
                      Level {badgeStats?.level ?? 0}
                    </Badge>
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {badgeStats?.title ?? "New Member"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {badgeStats?.description ||
                          "Complete verification to unlock your first badge."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <Award className={`w-8 h-8 ${badgeTheme.accent}`} />
                  <Badge
                    variant="outline"
                    className="bg-background/70 border-border/50"
                  >
                    {badgeStats?.points ?? 0} pts earned
                  </Badge>
                  {badgeStats &&
                    profile &&
                    badgeStats.level > (profile.badge_level ?? 0) && (
                      <Button
                        size="sm"
                        onClick={handleBadgeMint}
                        disabled={badgeMinting}
                        className="mt-2 gap-2"
                      >
                        {badgeMinting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Minting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Mint Badge
                          </>
                        )}
                      </Button>
                    )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 space-y-5">
              {badgeLoading || !badgeStats ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-3 w-full rounded-full bg-muted" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[0, 1, 2, 3].map((key) => (
                      <div key={key} className="h-20 rounded-xl bg-muted" />
                    ))}
                  </div>
                  <div className="h-16 rounded-xl bg-muted" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {badgeStats.nextTitle
                          ? `Next: ${badgeStats.nextTitle}`
                          : "You reached the final tier"}
                      </span>
                      <span>{badgeStats.progress}%</span>
                    </div>
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                        style={{ width: `${badgeStats.progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Base trust +{badgeStats.breakdown.base} pts • Total{" "}
                      {badgeStats.points} pts
                      {badgeStats.nextTitle
                        ? ` • ${badgeStats.pointsToNext} pts to ${badgeStats.nextTitle}`
                        : ""}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Primary reviews
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {badgeStats.counts.primaryReviews}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{badgeStats.breakdown.primary} pts
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Secondary reviews
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {badgeStats.counts.secondaryReviews}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{badgeStats.breakdown.secondary} pts
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Role bonus
                      </p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {activeBadgeRoles}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{badgeStats.breakdown.role} pts
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Reputation boost
                      </p>
                      <p className="mt-1 text-2xl font-bold text-foreground">
                        {profile?.verification_score ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{badgeStats.breakdown.reputation} pts
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {badgeStats.title}
                        </p>
                        <p>{badgeStats.mantra}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {eligibleForSecondaryValidatorRole && (
            <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <Users className="w-5 h-5" />
                  Help with secondary reviews
                </CardTitle>
                <CardDescription>
                  You are fully verified. Volunteer a few minutes to review
                  neighbors and keep the network trustworthy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    We will show you anonymized dossiers needing a second set of
                    eyes. Each completed review strengthens your own reputation
                    score.
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleJoinSecondaryValidatorPool}
                    disabled={joiningSecondaryPool}
                  >
                    {joiningSecondaryPool ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enrolling…
                      </>
                    ) : (
                      "Start reviewing identities"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validator Dashboard Access */}
          {(userRoles.includes("primary_validator") ||
            userRoles.includes("secondary_validator")) && (
            <>
              <Card className="border-primary/50 shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Validator Access
                  </CardTitle>
                  <CardDescription>
                    Access your validator dashboard to review verification
                    requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {userRoles.includes("primary_validator") && (
                    <Button
                      size="lg"
                      className="w-full relative"
                      onClick={() => navigate("/validator/primary")}
                    >
                      Open Primary Validator Dashboard
                      {pendingCount > 0 && (
                        <Badge className="ml-2 bg-destructive text-destructive-foreground">
                          {pendingCount}
                        </Badge>
                      )}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  {userRoles.includes("secondary_validator") &&
                    !userRoles.includes("primary_validator") && (
                      <Button
                        size="lg"
                        className="w-full relative"
                        onClick={() => navigate("/validator/secondary")}
                      >
                        Open Secondary Validator Dashboard
                        {pendingCount > 0 && (
                          <Badge className="ml-2 bg-destructive text-destructive-foreground">
                            {pendingCount}
                          </Badge>
                        )}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                </CardContent>
              </Card>

              {/* Validator Statistics */}
              <Card className="border-border/50 shadow-lg">
                <CardHeader>
                  <CardTitle>Validator Statistics</CardTitle>
                  <CardDescription>
                    Overview of your verification activity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-3xl font-bold text-foreground mb-1">
                        {validatorStats.pending}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pending
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 rounded-lg">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {validatorStats.completed}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                    </div>
                    <div className="text-center p-4 bg-red-500/10 rounded-lg">
                      <div className="text-3xl font-bold text-red-600 mb-1">
                        {validatorStats.rejected}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rejected
                      </div>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-1">
                        {validatorStats.successRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Success Rate
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Verification Status Card */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>Identity Verification</CardTitle>
              <CardDescription>
                Complete your identity verification to unlock all YoTouch
                features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationStatus === "unverified" && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Get Verified</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Start your verification journey to gain trust on the YoTouch
                    platform and access verification services.
                  </p>
                  <Button
                    size="lg"
                    variant="hero"
                    onClick={() => navigate("/facial-verification")}
                  >
                    Start Verification Process
                  </Button>
                </div>
              )}

              {verificationStatus === "pending" && (
                <div className="space-y-8">
                  <div className="text-center py-8">
                    <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">
                      Verification in Progress
                    </h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Your verification request was sent to validators and is
                      currently in the community review window. This usually
                      takes 24-48 hours.
                    </p>
                  </div>

                  {requestLoading && (
                    <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating progress...
                    </div>
                  )}

                  {!requestLoading && userRequest && (
                    <div className="space-y-4 text-left">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Current progress
                      </p>
                      <div className="space-y-3">
                        {progressSteps.map((step) => (
                          <div
                            key={step.title}
                            className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/40 p-4"
                          >
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                step.complete
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-background text-muted-foreground"
                              }`}
                            >
                              {step.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {step.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {step.description}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    step.complete
                                      ? "border-green-500/40 text-green-600"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {step.statusText}
                                </Badge>
                              </div>
                              {step.title === "Final proof" &&
                                canTriggerFinalProof && (
                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      size="sm"
                                      onClick={handleTriggerFinalProof}
                                      disabled={finalizingProof}
                                    >
                                      {finalizingProof ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Triggering...
                                        </>
                                      ) : (
                                        "Trigger final proof"
                                      )}
                                    </Button>
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {validatorFeedbackSection}
                    </div>
                  )}
                </div>
              )}

              {verificationStatus === "verified" && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    Verification Complete!
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Your identity has been verified and your proof is stored on
                    the Cardano blockchain.
                  </p>
                  {!finalProofComplete && canTriggerFinalProof && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={handleTriggerFinalProof}
                        disabled={finalizingProof}
                      >
                        {finalizingProof ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Triggering...
                          </>
                        ) : (
                          "Trigger final proof"
                        )}
                      </Button>
                    </div>
                  )}
                  {profile?.blockchain_proof_hash && (
                    <div className="bg-muted rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-xs text-muted-foreground mb-1">
                        Blockchain Proof Hash
                      </p>
                      <code className="text-xs font-mono break-all">
                        {profile.blockchain_proof_hash}
                      </code>
                    </div>
                  )}
                  {validatorFeedbackSection && (
                    <div className="mt-8 text-left">
                      {validatorFeedbackSection}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {verificationStatus === "pending" && (
            <Card className="border-primary/40 bg-primary/5 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Shield className="w-4 h-4" />
                  <p className="text-sm font-semibold uppercase tracking-[0.3em]">
                    Community review window
                  </p>
                </div>
                <CardTitle className="text-xl">
                  Validators around{" "}
                  {profile?.residential_address || "your address"} are weighing
                  in
                </CardTitle>
                <CardDescription>
                  We send anonymized dossiers to trusted humans in your area and
                  secondary AI sentinels. Their reviews feed directly into your
                  scorecard below.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/40 bg-white/60 p-4 text-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Stage 1
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    Local reputation pings
                  </p>
                  <p className="text-sm text-slate-600">
                    Primary validators confirm they know you physically and
                    validate your address claim.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/40 bg-white/60 p-4 text-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Stage 2
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    Secondary vetting
                  </p>
                  <p className="text-sm text-slate-600">
                    Anonymous community reviewers test for consistency, fraud
                    signals, and social proof.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/40 bg-white/60 p-4 text-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Stage 3
                  </p>
                  <p className="mt-2 text-base font-semibold">Score updates</p>
                  <p className="text-sm text-slate-600">
                    As every review lands, your dashboard score refreshes and
                    the Cardano proof queue prepares the final hash.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardDescription>Verification Score</CardDescription>
                <CardTitle className="text-3xl">
                  {profile?.verification_score || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardDescription>Status</CardDescription>
                <CardTitle className="text-2xl capitalize">
                  {profile?.verification_status || "Unverified"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardDescription>Blockchain Proof</CardDescription>
                <CardTitle className="text-2xl">
                  {profile?.blockchain_proof_hash ? "Yes" : "No"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
