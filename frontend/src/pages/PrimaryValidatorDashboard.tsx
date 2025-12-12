import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

const CHARACTER_LEVELS = [
  "Needs mentoring",
  "Building trust",
  "Neutral",
  "Trusted",
  "Community pillar",
];
const DEFAULT_CHARACTER_INDEX = 2;

const ADDRESS_LEVELS = [
  "Unverified",
  "Needs visit",
  "Inconclusive",
  "Seems valid",
  "Community confirmed",
];
const DEFAULT_ADDRESS_INDEX = 2;

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  face_match_score: number | null;
  liveness_score: number | null;
  created_at: string;
  selfie_url: string | null;
  residential_claim: string | null;
  character_level: string | null;
  address_rating: string | null;
  nin_bvn: string | null;
  primary_validator_notes: string | null;
  primary_validator_id: string | null;
  primary_validated_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    nin: string | null;
    bvn: string | null;
  };
}

export default function PrimaryValidatorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<VerificationRequest | null>(null);
  const [characterRatingIndex, setCharacterRatingIndex] = useState(
    DEFAULT_CHARACTER_INDEX
  );
  const [addressRatingIndex, setAddressRatingIndex] = useState(
    DEFAULT_ADDRESS_INDEX
  );
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const selectedCharacterLevel =
    CHARACTER_LEVELS[characterRatingIndex] ?? "Not rated";
  const selectedAddressLevel =
    ADDRESS_LEVELS[addressRatingIndex] ?? "Not rated";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkRole();
    fetchRequests();
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedRequest) {
      setCharacterRatingIndex(DEFAULT_CHARACTER_INDEX);
      setAddressRatingIndex(DEFAULT_ADDRESS_INDEX);
      setNotes("");
      return;
    }

    const normalized = selectedRequest.character_level?.toLowerCase() ?? "";
    const matchIndex = CHARACTER_LEVELS.findIndex(
      (level) => level.toLowerCase() === normalized
    );
    setCharacterRatingIndex(
      matchIndex !== -1 ? matchIndex : DEFAULT_CHARACTER_INDEX
    );

    const addressNormalized =
      selectedRequest.address_rating?.toLowerCase() ?? "";
    const addressMatchIndex = ADDRESS_LEVELS.findIndex(
      (level) => level.toLowerCase() === addressNormalized
    );
    setAddressRatingIndex(
      addressMatchIndex !== -1 ? addressMatchIndex : DEFAULT_ADDRESS_INDEX
    );

    setNotes(selectedRequest.primary_validator_notes || "");
  }, [selectedRequest]);

  const checkRole = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "primary_validator",
    });

    if (error) {
      console.error("Error checking role:", error);
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }

    if (!data) {
      toast.error("You don't have primary validator access");
      navigate("/dashboard");
      return;
    }

    setHasRole(true);
    setLoading(false);
  };

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from("verification_requests")
      .select(
        `
        *,
        profiles (
          first_name,
          last_name,
          nin,
          bvn
        )
      `
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load verification requests");
      return;
    }

    setRequests(data || []);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    const now = new Date().toISOString();
    const normalizedNotes = notes.trim() ? notes.trim() : null;

    const { error } = await supabase
      .from("verification_requests")
      .update({
        character_level: selectedCharacterLevel,
        address_rating: selectedAddressLevel,
        primary_validator_id: user?.id ?? null,
        primary_validator_notes: normalizedNotes,
        primary_validated_at: now,
        status: "primary_validated",
      })
      .eq("id", selectedRequest.id);

    if (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve verification");
      setProcessing(false);
      return;
    }

    toast.success("Verification approved and sent to secondary validation");
    setSelectedRequest(null);
    setNotes("");
    setCharacterRatingIndex(DEFAULT_CHARACTER_INDEX);
    setAddressRatingIndex(DEFAULT_ADDRESS_INDEX);
    fetchRequests();
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    const now = new Date().toISOString();
    const normalizedNotes = notes.trim() ? notes.trim() : null;

    const { error } = await supabase
      .from("verification_requests")
      .update({
        character_level: selectedCharacterLevel,
        address_rating: selectedAddressLevel,
        primary_validator_id: user?.id ?? null,
        primary_validator_notes: normalizedNotes,
        primary_validated_at: now,
        status: "rejected",
      })
      .eq("id", selectedRequest.id);

    if (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject verification");
      setProcessing(false);
      return;
    }

    toast.success("Verification rejected");
    setSelectedRequest(null);
    setNotes("");
    setCharacterRatingIndex(DEFAULT_CHARACTER_INDEX);
    setAddressRatingIndex(DEFAULT_ADDRESS_INDEX);
    fetchRequests();
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Primary Validator Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and validate identity documents
            </p>
          </div>
          <Button onClick={signOut} variant="outline">
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Pending Verifications ({requests.length})
                </CardTitle>
                <CardDescription>
                  Select a verification request to review
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pending verifications
                  </p>
                ) : (
                  requests.map((request) => (
                    <Card
                      key={request.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedRequest?.id === request.id
                          ? "border-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {request.profiles?.first_name}{" "}
                              {request.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                request.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge>{request.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Review Panel */}
          <div>
            {selectedRequest ? (
              <Card>
                <CardHeader>
                  <CardTitle>Review Verification</CardTitle>
                  <CardDescription>
                    Validate identity and liveness
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-[160px,1fr]">
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-muted p-4">
                      <div className="h-32 w-32 overflow-hidden rounded-xl bg-muted">
                        {selectedRequest.selfie_url ? (
                          <img
                            src={selectedRequest.selfie_url}
                            alt="Applicant selfie"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            No photo
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">Validee</Badge>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Full name
                        </p>
                        <p className="text-lg font-semibold">
                          {selectedRequest.profiles?.first_name}{" "}
                          {selectedRequest.profiles?.last_name}
                        </p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            NIN
                          </p>
                          <p className="font-mono text-base">
                            {selectedRequest.profiles?.nin || "Not provided"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            BVN
                          </p>
                          <p className="font-mono text-base">
                            {selectedRequest.profiles?.bvn || "Not provided"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Address claim
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {selectedAddressLevel}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">
                          {selectedRequest.residential_claim ||
                            "Applicant has not provided an address"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Character level
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-primary text-primary"
                          >
                            {selectedCharacterLevel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Based on past community endorsements
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-muted bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        AI face match
                      </p>
                      <p className="text-3xl font-semibold">
                        {selectedRequest.face_match_score !== null
                          ? `${selectedRequest.face_match_score}%`
                          : "Awaiting AI"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Generated by the automated model
                      </p>
                    </div>
                    <div className="rounded-2xl border border-muted bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        AI liveness
                      </p>
                      <p className="text-3xl font-semibold">
                        {selectedRequest.liveness_score !== null
                          ? `${selectedRequest.liveness_score}%`
                          : "Awaiting AI"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Generated by the automated model
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Character rating: {selectedCharacterLevel}
                    </label>
                    <Slider
                      value={[characterRatingIndex]}
                      onValueChange={(value) =>
                        setCharacterRatingIndex(
                          value[0] ?? DEFAULT_CHARACTER_INDEX
                        )
                      }
                      max={CHARACTER_LEVELS.length - 1}
                      step={1}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      {CHARACTER_LEVELS.map((level, index) => (
                        <span
                          key={level}
                          className={
                            index === characterRatingIndex
                              ? "text-primary font-semibold"
                              : ""
                          }
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Address rating: {selectedAddressLevel}
                    </label>
                    <Slider
                      value={[addressRatingIndex]}
                      onValueChange={(value) =>
                        setAddressRatingIndex(value[0] ?? DEFAULT_ADDRESS_INDEX)
                      }
                      max={ADDRESS_LEVELS.length - 1}
                      step={1}
                      className="mb-2"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      {ADDRESS_LEVELS.map((level, index) => (
                        <span
                          key={level}
                          className={
                            index === addressRatingIndex
                              ? "text-primary font-semibold"
                              : ""
                          }
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Notes (Optional)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any observations or notes..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Reject"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a verification request to review
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
