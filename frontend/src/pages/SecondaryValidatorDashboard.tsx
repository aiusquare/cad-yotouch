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

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  face_match_score: number | null;
  liveness_score: number | null;
  social_proof_score: number | null;
  reputation_score: number | null;
  final_score: number | null;
  created_at: string;
  selfie_url: string | null;
  nin_bvn: string | null;
  secondary_validator_notes: string | null;
  secondary_validator_id: string | null;
  secondary_validated_at: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    nin: string | null;
    bvn: string | null;
    residential_address: string | null;
  };
}

export default function SecondaryValidatorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasRole, setHasRole] = useState(false);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<VerificationRequest | null>(null);
  const [socialProofScore, setSocialProofScore] = useState([70]);
  const [reputationScore, setReputationScore] = useState([75]);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!selectedRequest) {
      setSocialProofScore([70]);
      setReputationScore([75]);
      setNotes("");
      return;
    }

    setSocialProofScore([selectedRequest.social_proof_score ?? 70]);
    setReputationScore([selectedRequest.reputation_score ?? 75]);
    setNotes(selectedRequest.secondary_validator_notes || "");
  }, [selectedRequest]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    checkRole();
    fetchRequests();
  }, [user, navigate]);

  const checkRole = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "secondary_validator",
    });

    if (error) {
      console.error("Error checking role:", error);
      toast.error("Access denied");
      navigate("/dashboard");
      return;
    }

    if (!data) {
      toast.error("You don't have secondary validator access");
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
          bvn,
          residential_address
        )
      `
      )
      .eq("status", "primary_validated")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load verification requests");
      return;
    }

    setRequests(data || []);
  };

  const calculateFinalScore = () => {
    if (!selectedRequest) return 0;

    const scores = [
      selectedRequest.face_match_score || 0,
      selectedRequest.liveness_score || 0,
      socialProofScore[0],
      reputationScore[0],
    ];

    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    const finalScore = calculateFinalScore();
    const now = new Date().toISOString();
    const normalizedNotes = notes.trim() ? notes.trim() : null;

    const { error: requestError } = await supabase
      .from("verification_requests")
      .update({
        social_proof_score: socialProofScore[0],
        reputation_score: reputationScore[0],
        final_score: finalScore,
        status: "verified",
        secondary_validator_id: user?.id ?? null,
        secondary_validator_notes: normalizedNotes,
        secondary_validated_at: now,
      })
      .eq("id", selectedRequest.id);

    if (requestError) {
      console.error("Error approving request:", requestError);
      toast.error("Failed to approve verification");
      setProcessing(false);
      return;
    }

    // Update user profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        verification_status: "verified",
        verification_score: finalScore,
      })
      .eq("id", selectedRequest.user_id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    toast.success("Verification completed successfully!");
    setSelectedRequest(null);
    setNotes("");
    setSocialProofScore([70]);
    setReputationScore([75]);
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
        status: "rejected",
        final_score: null,
        secondary_validator_id: user?.id ?? null,
        secondary_validator_notes: normalizedNotes,
        secondary_validated_at: now,
        social_proof_score: socialProofScore[0],
        reputation_score: reputationScore[0],
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
    setSocialProofScore([70]);
    setReputationScore([75]);
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
              Secondary Validator Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and validate address and reputation
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
                  Primary Validated ({requests.length})
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
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">
                                Face: {request.face_match_score}%
                              </Badge>
                              <Badge variant="outline">
                                Live: {request.liveness_score}%
                              </Badge>
                            </div>
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
                    Validate address and reputation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">User Information</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {selectedRequest.profiles?.first_name}{" "}
                        {selectedRequest.profiles?.last_name}
                      </p>
                      <p>
                        <span className="text-muted-foreground">NIN:</span>{" "}
                        {selectedRequest.profiles?.nin || "Not provided"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">BVN:</span>{" "}
                        {selectedRequest.profiles?.bvn || "Not provided"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Address:</span>{" "}
                        {selectedRequest.profiles?.residential_address ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">
                      Primary Validation Scores
                    </h3>
                    <div className="flex gap-4">
                      <Badge>
                        Face Match: {selectedRequest.face_match_score}%
                      </Badge>
                      <Badge>Liveness: {selectedRequest.liveness_score}%</Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Social Proof Score: {socialProofScore[0]}%
                    </label>
                    <Slider
                      value={socialProofScore}
                      onValueChange={setSocialProofScore}
                      max={100}
                      step={1}
                      className="mb-4"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Reputation Score: {reputationScore[0]}%
                    </label>
                    <Slider
                      value={reputationScore}
                      onValueChange={setReputationScore}
                      max={100}
                      step={1}
                      className="mb-4"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Final Score: {calculateFinalScore()}%
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Average of all validation scores
                    </p>
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
                        "Approve & Complete"
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
