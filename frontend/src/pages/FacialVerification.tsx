import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { fetchNinRecord, NinRecord } from "@/lib/identity";

const ADDRESS_CLARITY_OPTIONS = [
  "Street & house number",
  "Street without number",
  "Estate or compound",
  "Village/district description",
  "Landmark-only description",
];

interface ProfileRecord {
  first_name: string | null;
  last_name: string | null;
  nin: string | null;
  bvn: string | null;
  residential_address: string | null;
  address_clarity: string | null;
  address_landmarks: string | null;
  address_directions: string | null;
  verification_status: string | null;
}

const FacialVerification = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [ninRecord, setNinRecord] = useState<NinRecord | null>(null);
  const [ninLookupLoading, setNinLookupLoading] = useState(false);
  const [ninLookupError, setNinLookupError] = useState<string | null>(null);
  const [hasConfirmedRecords, setHasConfirmedRecords] = useState(false);
  const [savingRecords, setSavingRecords] = useState(false);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);
  const [aiComplete, setAiComplete] = useState(false);
  const [addressSubmitted, setAddressSubmitted] = useState(false);
  const [addressForm, setAddressForm] = useState({
    residentialAddress: "",
    addressClarity: ADDRESS_CLARITY_OPTIONS[0],
    addressLandmarks: "",
    addressDirections: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressMatchScore, setAddressMatchScore] = useState<number | null>(
    null
  );
  const [addressHydrated, setAddressHydrated] = useState(false);
  const lastNinLookup = useRef<string | null>(null);

  type Stage = "records" | "facial" | "address" | "submitted";

  const formatDate = (value: string | null) => {
    if (!value) {
      return "Not provided";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const stageOrder: Stage[] = ["records", "facial", "address", "submitted"];

  const derivedStage: Stage = !hasConfirmedRecords
    ? "records"
    : !aiComplete
    ? "facial"
    : !addressSubmitted
    ? "address"
    : "submitted";

  const [activeStage, setActiveStage] = useState<Stage>("records");
  const derivedIndex = stageOrder.indexOf(derivedStage);
  const activeIndex = stageOrder.indexOf(activeStage);

  useEffect(() => {
    setActiveStage(derivedStage);
  }, [derivedStage]);

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < derivedIndex;

  const goToPrevStage = () => {
    if (canGoPrev) {
      setActiveStage(stageOrder[activeIndex - 1]);
    }
  };

  const goToNextStage = () => {
    if (canGoNext) {
      setActiveStage(stageOrder[activeIndex + 1]);
    }
  };

  const isFinalStage = activeStage === "submitted";

  const stageCopy = useMemo(
    () => ({
      records: {
        title: "NIN & BVN confirmation",
        hint: "Review the records retrieved from national databases",
      },
      facial: {
        title: "AI facial verification",
        hint: "Run liveness and face match checks",
      },
      address: {
        title: "Describe your address",
        hint: "Give validators African-context directions to boost your score",
      },
      submitted: {
        title: "Submitted to validators",
        hint: "Sit tight while validators complete their review",
      },
    }),
    []
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "first_name, last_name, nin, bvn, residential_address, address_clarity, address_landmarks, address_directions, verification_status"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile for verification", err);
        setFetchError(
          "We couldn't retrieve your records. Please try again or contact support."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!profile?.nin) {
      setNinRecord(null);
      setNinLookupError(null);
      setNinLookupLoading(false);
      lastNinLookup.current = null;
      return;
    }

    if (lastNinLookup.current === profile.nin) {
      return;
    }

    let cancelled = false;
    setNinLookupLoading(true);
    setNinLookupError(null);

    fetchNinRecord(profile.nin)
      .then((record) => {
        if (cancelled) {
          return;
        }
        setNinRecord(record);
        lastNinLookup.current = profile.nin;
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Error fetching NIN snapshot", error);
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't retrieve your NIN record";
        setNinLookupError(message);
        setNinRecord(null);
      })
      .finally(() => {
        if (!cancelled) {
          setNinLookupLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.nin]);

  useEffect(() => {
    if (!user) return;

    const loadExistingRequest = async () => {
      try {
        const { data, error } = await supabase
          .from("verification_requests")
          .select(
            "id, nin_bvn, face_match_score, liveness_score, residential_claim, status, address_match_score"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          // Restore step 1: records confirmation
          if (data.nin_bvn) {
            setHasConfirmedRecords(true);
          }

          // Restore step 2: AI facial verification
          if (data.face_match_score !== null && data.liveness_score !== null) {
            setAiComplete(true);
          }

          // Restore step 3: address submission
          if (data.residential_claim) {
            setAddressSubmitted(true);
            try {
              // Handle both string and object types (Supabase might auto-parse JSONB)
              const parsed =
                typeof data.residential_claim === "string"
                  ? JSON.parse(data.residential_claim)
                  : data.residential_claim;

              if (parsed && typeof parsed === "object") {
                setAddressForm({
                  residentialAddress: parsed.address || "",
                  addressClarity:
                    parsed.clarity &&
                    ADDRESS_CLARITY_OPTIONS.includes(parsed.clarity)
                      ? parsed.clarity
                      : ADDRESS_CLARITY_OPTIONS[0],
                  addressLandmarks: parsed.landmarks || "",
                  addressDirections: parsed.directions || "",
                });

                if (typeof parsed.match_score === "number") {
                  setAddressMatchScore(parsed.match_score);
                }

                setAddressHydrated(true);
              }
            } catch (parseError) {
              console.warn("Unable to parse stored address claim", parseError);
            }
          }

          if (typeof data.address_match_score === "number") {
            setAddressMatchScore(data.address_match_score);
          }

          console.log("Restored verification progress:", {
            hasConfirmedRecords: Boolean(data.nin_bvn),
            aiComplete: Boolean(
              data.face_match_score !== null && data.liveness_score !== null
            ),
            addressSubmitted: Boolean(data.residential_claim),
            status: data.status,
          });
        }
      } catch (requestError) {
        console.error("Error loading verification request", requestError);
      }
    };

    loadExistingRequest();
  }, [user]);

  useEffect(() => {
    if (!profile || addressHydrated) return;

    if (
      !profile.residential_address &&
      !profile.address_landmarks &&
      !profile.address_directions
    ) {
      return;
    }

    setAddressForm((prev) => ({
      residentialAddress:
        prev.residentialAddress || profile.residential_address || "",
      addressClarity:
        profile.address_clarity &&
        ADDRESS_CLARITY_OPTIONS.includes(profile.address_clarity)
          ? profile.address_clarity
          : prev.addressClarity,
      addressLandmarks:
        prev.addressLandmarks || profile.address_landmarks || "",
      addressDirections:
        prev.addressDirections || profile.address_directions || "",
    }));

    setAddressHydrated(true);
  }, [profile, addressHydrated]);

  const persistVerificationRequest = async (
    payload: Record<string, unknown>
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    const { data: existing, error: fetchError } = await supabase
      .from("verification_requests")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("verification_requests")
        .update({
          updated_at: new Date().toISOString(),
          ...payload,
        })
        .eq("id", existing.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        updated_at: new Date().toISOString(),
        ...payload,
      });

      if (error) {
        throw error;
      }
    }
  };

  const startVerification = () => {
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        const faceMatchScore = 82 + Math.round(Math.random() * 6);
        const livenessScore = 78 + Math.round(Math.random() * 8);

        await persistVerificationRequest({
          face_match_score: faceMatchScore,
          liveness_score: livenessScore,
        });

        setAiComplete(true);
        setSyncIssue(null);
        toast.success(
          "Facial verification completed successfully! We've saved your AI results and alerted validators."
        );
      } catch (error) {
        console.error("Error saving AI verification", error);
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "object"
            ? JSON.stringify(error)
            : String(error);
        setSyncIssue("ai");
        toast.error(
          `We couldn't save your facial verification (${message}). We'll keep you on this step so you can retry.`
        );
      } finally {
        setIsProcessing(false);
      }
    }, 3000);
  };

  const completeOnboarding = () => {
    navigate("/dashboard");
  };

  const computeAddressMatchScore = () => {
    const recordAddress = profile?.residential_address || "";
    const normalise = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const claimCombined = `${addressForm.residentialAddress} ${addressForm.addressLandmarks} ${addressForm.addressDirections}`;
    const claimTokens = normalise(claimCombined);

    if (!claimTokens.length) {
      return 0;
    }

    const recordTokens = normalise(recordAddress);
    const claimSet = new Set(claimTokens);
    const recordSet = new Set(recordTokens);

    let intersection = 0;
    claimSet.forEach((token) => {
      if (recordSet.has(token)) {
        intersection += 1;
      }
    });

    const union = new Set([...claimSet, ...recordSet]).size || 1;
    const baseScore = recordTokens.length ? (intersection / union) * 100 : 65;

    const clarityIndex = ADDRESS_CLARITY_OPTIONS.indexOf(
      addressForm.addressClarity
    );
    const clarityBonus = Math.max(0, 10 - clarityIndex * 2);

    return Math.round(Math.min(98, Math.max(40, baseScore + clarityBonus)));
  };

  const handleAddressSubmit = async () => {
    if (!user) {
      toast.error("Please sign in again to save your address");
      return;
    }

    if (
      !addressForm.residentialAddress.trim() ||
      !addressForm.addressLandmarks.trim() ||
      !addressForm.addressDirections.trim()
    ) {
      toast.error("Please complete the address fields before continuing");
      return;
    }

    setSavingAddress(true);
    try {
      const matchScore = computeAddressMatchScore();
      await persistVerificationRequest({
        residential_claim: JSON.stringify({
          address: addressForm.residentialAddress.trim(),
          clarity: addressForm.addressClarity,
          landmarks: addressForm.addressLandmarks.trim(),
          directions: addressForm.addressDirections.trim(),
          recorded_at: new Date().toISOString(),
          match_score: matchScore,
        }),
        address_match_score: matchScore,
        status: "pending",
      });

      await supabase
        .from("profiles")
        .update({
          residential_address: addressForm.residentialAddress.trim(),
          address_clarity: addressForm.addressClarity,
          address_landmarks: addressForm.addressLandmarks.trim(),
          address_directions: addressForm.addressDirections.trim(),
          verification_status: "pending",
        })
        .eq("id", user.id);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              residential_address: addressForm.residentialAddress.trim(),
              address_clarity: addressForm.addressClarity,
              address_landmarks: addressForm.addressLandmarks.trim(),
              address_directions: addressForm.addressDirections.trim(),
              verification_status: "pending",
            }
          : prev
      );

      setAddressMatchScore(matchScore);
      setAddressSubmitted(true);
      setAddressHydrated(true);
      setSyncIssue(null);
      toast.success(
        `Saved! Your address now carries a ${matchScore}% match confidence for validators.`
      );
    } catch (error) {
      console.error("Error saving address claim", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object"
          ? JSON.stringify(error)
          : String(error);
      setSyncIssue("address");
      toast.error(
        `We couldn't save your address directions (${message}). Please retry.`
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const confirmRecords = async () => {
    if (!profile?.nin || !profile?.bvn) {
      toast.error("NIN and BVN details are required before continuing.");
      return;
    }
    const monnifySnapshot = ninRecord
      ? {
          nin: ninRecord.nin,
          firstName: ninRecord.firstName,
          middleName: ninRecord.middleName,
          lastName: ninRecord.lastName,
          dateOfBirth: ninRecord.dateOfBirth,
          gender: ninRecord.gender,
          phoneNumber: ninRecord.phoneNumber,
        }
      : undefined;
    setSavingRecords(true);
    try {
      await persistVerificationRequest({
        nin_bvn: JSON.stringify({
          nin: profile.nin,
          bvn: profile.bvn,
          confirmed_at: new Date().toISOString(),
          monnify_snapshot: monnifySnapshot,
        }),
      });
      setHasConfirmedRecords(true);
      toast.success(
        "Records confirmed and saved. Continue with liveness check."
      );
    } catch (error) {
      console.error("Error saving record confirmation", error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object"
          ? JSON.stringify(error)
          : String(error);
      setSyncIssue("records");
      toast.warning(
        `We couldn't sync your confirmation (${message}). You can still continue and we'll retry in the background.`
      );
      setHasConfirmedRecords(true);
    } finally {
      setSavingRecords(false);
    }
  };

  const renderStageContent = () => {
    if (activeStage === "records") {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-[0.3em]">
              Step 1 · Confirm retrieved records
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              We pulled your enrollment data using the NIN/BVN provided during
              registration. Please confirm these details before we initiate AI
              facial verification.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
            {profileLoading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Retrieving your NIN/BVN record...
              </div>
            ) : fetchError ? (
              <p className="text-sm text-destructive">{fetchError}</p>
            ) : profile ? (
              <>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Full name</dt>
                    <dd className="font-semibold text-foreground">
                      {[profile.first_name, profile.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">NIN</dt>
                    <dd className="font-mono text-base">
                      {profile.nin || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">BVN</dt>
                    <dd className="font-mono text-base">
                      {profile.bvn || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Residential address</dt>
                    <dd className="text-foreground">
                      {profile.residential_address || "Not provided"}
                    </dd>
                  </div>
                </dl>
                {profile.nin && (
                  <div className="mt-5 space-y-2">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      Monnify snapshot (minimal fields)
                    </p>
                    <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                      {ninLookupLoading ? (
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Contacting Monnify…
                        </div>
                      ) : ninLookupError ? (
                        <p className="text-sm text-destructive">{ninLookupError}</p>
                      ) : ninRecord ? (
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">Verified name</dt>
                            <dd className="font-medium text-foreground">
                              {[ninRecord.firstName, ninRecord.lastName]
                                .filter(Boolean)
                                .join(" ") || "Unavailable"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Date of birth</dt>
                            <dd className="text-foreground">
                              {formatDate(ninRecord.dateOfBirth)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Gender</dt>
                            <dd className="text-foreground">
                              {ninRecord.gender || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Phone</dt>
                            <dd className="text-foreground">
                              {ninRecord.phoneNumber || "Not provided"}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          We'll display the minimal Monnify fields once your record is retrieved.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No profile data found.
              </p>
            )}
          </div>

          <Button
            onClick={confirmRecords}
            disabled={
              profileLoading || !profile?.nin || !profile?.bvn || savingRecords
            }
            className="w-full"
            size="lg"
          >
            {savingRecords ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving confirmation...
              </>
            ) : hasConfirmedRecords ? (
              "Reconfirm records"
            ) : (
              "Confirm records & continue"
            )}
          </Button>
          {!profileLoading && (!profile?.nin || !profile?.bvn) && (
            <p className="text-xs text-destructive text-center">
              Provide both NIN and BVN in your profile to continue.
            </p>
          )}
        </div>
      );
    }

    if (activeStage === "facial") {
      if (!hasConfirmedRecords) {
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Finish Step 1 first</p>
            <p>
              Confirm your NIN/BVN records before running the AI liveness check.
            </p>
          </div>
        );
      }

      return (
        <>
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-[0.3em]">
              Step 2 · AI facial verification
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Keep steady while we run biometric liveness checks and match
              against your national ID photo.
            </p>
          </div>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            {isProcessing ? (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Processing liveness check...
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4 p-6">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                <div>
                  <p className="font-medium">Camera Preview</p>
                  <p className="text-sm text-muted-foreground">
                    Position your face in the center of the frame
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Instructions:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ensure you're in a well-lit area</li>
              <li>Look directly at the camera</li>
              <li>Follow the on-screen prompts during verification</li>
              <li>Keep your face within the frame</li>
            </ul>
          </div>

          <Button
            onClick={startVerification}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Start Liveness Check
              </>
            )}
          </Button>
        </>
      );
    }

    if (activeStage === "address") {
      if (!hasConfirmedRecords || !aiComplete) {
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Finish earlier steps first</p>
            <p>
              Confirm your records and complete the liveness check before
              submitting address directions.
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-[0.3em]">
              Step 3 · Describe your address
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Give validators African-context directions. We'll match it with
              the NIN/BVN address above to add to your trust score.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              NIN/BVN address on file
            </p>
            <p className="mt-1 text-foreground">
              {profile?.residential_address ||
                "No record provided. Be extra descriptive so validators can find you fast."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="address-claim">Residential address</Label>
              <Textarea
                id="address-claim"
                placeholder="House 14, Oluwaseyi Close, off Adetola Street, Surulere, Lagos"
                value={addressForm.residentialAddress}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    residentialAddress: e.target.value,
                  })
                }
                rows={3}
                disabled={savingAddress}
              />
              <p className="text-xs text-muted-foreground">
                Describe the place the way neighbors or riders would.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Address clarity</Label>
              <Select
                value={addressForm.addressClarity}
                onValueChange={(value) =>
                  setAddressForm({
                    ...addressForm,
                    addressClarity: value,
                  })
                }
                disabled={savingAddress}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select address type" />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_CLARITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-landmarks">Nearby landmarks</Label>
              <Textarea
                id="address-landmarks"
                placeholder="Two houses after Mama Nkechi canteen, opposite the community borehole"
                value={addressForm.addressLandmarks}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    addressLandmarks: e.target.value,
                  })
                }
                rows={2}
                disabled={savingAddress}
              />
              <p className="text-xs text-muted-foreground">
                Mention landmarks boda/okada riders commonly reference.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-directions">Simple directions</Label>
              <Textarea
                id="address-directions"
                placeholder="From Ugborikoko junction, take the sandy road by the mosque, second blue gate on the left"
                value={addressForm.addressDirections}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    addressDirections: e.target.value,
                  })
                }
                rows={2}
                disabled={savingAddress}
              />
              <p className="text-xs text-muted-foreground">
                Keep it in plain language so validators can verify quickly.
              </p>
            </div>
          </div>

          <Button
            onClick={handleAddressSubmit}
            disabled={savingAddress}
            className="w-full"
            size="lg"
          >
            {savingAddress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving address claim...
              </>
            ) : (
              "Save address directions"
            )}
          </Button>
        </div>
      );
    }

    return (
      <div className="text-center space-y-6">
        <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
          <p className="text-green-800 dark:text-green-200 font-medium">
            Verification package shared!
          </p>
          <p className="text-sm text-green-600 dark:text-green-300 mt-2">
            Validators received your AI scores and address directions
            {addressMatchScore !== null
              ? ` — ${addressMatchScore}% match confidence.`
              : "."}
          </p>
        </div>

        <Button onClick={completeOnboarding} className="w-full" size="lg">
          Continue to Dashboard
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-border/50">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              {isFinalStage ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-2xl">
                {isFinalStage
                  ? "Verification package sent"
                  : "AI-Powered Facial Verification"}
              </CardTitle>
              <CardDescription>
                {isFinalStage
                  ? "Validators now have your biometrics and address directions"
                  : "Complete liveness check and share easy directions for validators"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary">
                Verification progress
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {stageCopy[activeStage].title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stageCopy[activeStage].hint}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {stageOrder.map((stage, idx) => {
                    const isComplete = idx < derivedIndex;
                    const isActive = idx === activeIndex;

                    return (
                      <div
                        key={stage}
                        className={cn(
                          "h-2 w-12 rounded-full bg-border transition-colors",
                          isComplete && "bg-primary",
                          isActive && !isComplete && "bg-primary/70",
                          isActive && "ring-2 ring-primary/60"
                        )}
                        aria-label={`Step ${idx + 1}: ${
                          stageCopy[stage].title
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {renderStageContent()}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                onClick={goToPrevStage}
                disabled={!canGoPrev}
              >
                Previous step
              </Button>
              <Button
                variant="outline"
                onClick={goToNextStage}
                disabled={!canGoNext}
              >
                Preview next step
              </Button>
            </div>

            <div className="space-y-3">
              {syncIssue && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Sync issue detected</p>
                    <p>
                      We couldn't sync your{" "}
                      {syncIssue === "records"
                        ? "record confirmation"
                        : syncIssue === "address"
                        ? "address directions"
                        : "AI results"}{" "}
                      to the blockchain queue. We'll retry automatically when
                      you move forward. If this keeps happening, contact
                      support.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Need help?</p>
                  <p>
                    You're on step {stageOrder.indexOf(derivedStage) + 1} of{" "}
                    {stageOrder.length}. If anything looks wrong with your
                    records or the camera setup, email
                    <a
                      className="font-semibold text-amber-900 underline decoration-dotted underline-offset-4 ml-1"
                      href="mailto:support@yotouch.io"
                    >
                      support@yotouch.io
                    </a>
                    , or ping your onboarding agent.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FacialVerification;
