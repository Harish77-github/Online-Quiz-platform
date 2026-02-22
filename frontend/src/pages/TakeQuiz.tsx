import { useEffect, useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuiz } from "@/hooks/use-quizzes";
import { useSubmitAttempt } from "@/hooks/use-attempts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import toast from "react-hot-toast";
import { API_BASE } from "@/lib/api";
import { AlertTriangle, Loader2, Maximize2, AlertCircle, Timer, ShieldCheck } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export default function TakeQuiz() {
  const [match, params] = useRoute("/quiz/:id");
  const id = params?.id || "";
  const [, setLocation] = useLocation();

  const { data: quiz, isLoading } = useQuiz(id);
  const submitAttempt = useSubmitAttempt();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [violations, setViolations] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showViolationAlert, setShowViolationAlert] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Access code state
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [verifiedAccessCode, setVerifiedAccessCode] = useState("");

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  // Initialize answers array
  useEffect(() => {
    if (quiz) {
      setAnswers(new Array(quiz.questions.length).fill(-1));
    }
  }, [quiz]);

  // Start timer when entering fullscreen and quiz has duration
  useEffect(() => {
    if (isFullscreen && quiz?.durationMinutes && !quizStartTime) {
      const startTime = Date.now();
      setQuizStartTime(startTime);
      setTimeRemaining(quiz.durationMinutes * 60);
    }
  }, [isFullscreen, quiz, quizStartTime]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || quizSubmitted || isTerminated) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          if (!submittedRef.current) {
            submittedRef.current = true;
            // Auto-submit on timer expiry
            setTimeout(() => autoSubmitQuiz("Auto-submitted: Time expired"), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining !== null, quizSubmitted, isTerminated]);

  // Anti-cheating monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isFullscreen && !isTerminated && !quizSubmitted) {
        handleViolation("Tab switching detected");
      }
    };

    const handleBlur = () => {
      if (isFullscreen && !isTerminated && !quizSubmitted) {
        handleViolation("Window focus lost");
      }
    };

    const preventCopy = (e: ClipboardEvent) => {
      if (quizSubmitted) return;
      e.preventDefault();
      toast.error("Copying is disabled during the quiz.");
    };

    const preventContext = (e: Event) => {
      if (!quizSubmitted) e.preventDefault();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("contextmenu", preventContext);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("contextmenu", preventContext);
    };
  }, [isFullscreen, isTerminated, violations, quizSubmitted]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (quizSubmitted || isSubmittingRef.current) return;
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement && !isTerminated && quiz) {
        handleViolation("Fullscreen exited");
        toast.error("Fullscreen exited — please return to fullscreen to continue.");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isTerminated, quiz, quizSubmitted, violations]);

  const handleViolation = (reason: string) => {
    const newCount = violations + 1;
    setViolations(newCount);
    setShowViolationAlert(true);

    if (newCount >= 4) {
      autoSubmitQuiz("Auto-submitted: 4 violations detected");
    }
  };

  const autoSubmitQuiz = useCallback((reason: string) => {
    if (quizSubmitted || isTerminated) return;
    isSubmittingRef.current = true;
    setIsTerminated(true);
    setQuizSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    submitAttempt.mutate({
      quizId: id,
      answers,
      terminated: true,
      terminationReason: reason,
      violations: Math.max(violations, 4),
      isAutoSubmitted: true,
      accessCode: verifiedAccessCode || undefined,
      startedAt: quizStartTime ? new Date(quizStartTime).toISOString() : undefined,
    } as any, {
      onSuccess: () => {
        toast.error(reason);
        setLocation("/history");
      }
    });
  }, [id, answers, violations, quizSubmitted, isTerminated, verifiedAccessCode]);

  const enterFullscreen = () => {
    // If quiz has access code and not yet verified, show modal
    if (quiz?.hasAccessCode && !verifiedAccessCode) {
      setShowAccessCodeModal(true);
      return;
    }

    document.documentElement.requestFullscreen().catch((err) => {
      console.error("Error enabling fullscreen:", err);
      toast.error("Could not enter fullscreen mode. Please try again.");
    });
  };

  const handleAccessCodeSubmit = async () => {
    if (!accessCodeInput.trim()) {
      setAccessCodeError("Please enter the access code");
      return;
    }
    try {
      // Validate access code against backend
      const res = await fetch(`${API_BASE}/api/quizzes/${id}/validate-access-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`,
        },
        body: JSON.stringify({ accessCode: accessCodeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccessCodeError(data.message || "Invalid access code");
        return;
      }
      setVerifiedAccessCode(accessCodeInput.trim());
      setShowAccessCodeModal(false);
      setAccessCodeError("");
      // Now enter fullscreen
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } catch (err) {
      setAccessCodeError("Failed to validate access code. Please try again.");
    }
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current || quizSubmitted) return;
    isSubmittingRef.current = true;
    setQuizSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    submitAttempt.mutate({
      quizId: id,
      answers,
      violations,
      accessCode: verifiedAccessCode || undefined,
      startedAt: quizStartTime ? new Date(quizStartTime).toISOString() : undefined,
    } as any, {
      onSuccess: async () => {
        // Exit fullscreen safely AFTER submission succeeds
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {});
        }
        toast.success("Quiz submitted! Your answers have been recorded.");
        setLocation("/history");
      },
      onError: () => {
        isSubmittingRef.current = false;
        setQuizSubmitted(false);
        toast.error("Submission failed — please try again.");
      }
    });
  };

  // Timer display helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getTimerColor = () => {
    if (timeRemaining === null) return "text-green-500 dark:text-green-400";
    if (timeRemaining <= 60) return "text-red-600 dark:text-red-500 animate-pulse";
    if (timeRemaining <= 300) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  if (isLoading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Initial Fullscreen Prompt
  if (!isFullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {/* Access Code Modal */}
        <AlertDialog open={showAccessCodeModal} onOpenChange={setShowAccessCodeModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Access Code Required
              </AlertDialogTitle>
              <AlertDialogDescription>
                This quiz requires an access code. Please enter the code provided by your faculty.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder="Enter access code"
                value={accessCodeInput}
                onChange={(e) => { setAccessCodeInput(e.target.value); setAccessCodeError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAccessCodeSubmit()}
              />
              {accessCodeError && <p className="text-sm text-destructive mt-2">{accessCodeError}</p>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowAccessCodeModal(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAccessCodeSubmit}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card className="max-w-md w-full shadow-2xl border border-primary/25 dark:border-primary/40 shadow-primary/10 rounded-xl">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Maximize2 className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
              <p className="text-muted-foreground">{quiz.description}</p>
            </div>

            {quiz.durationMinutes && (
              <div className="flex items-center justify-center gap-2 text-sm font-medium bg-secondary/50 p-3 rounded-lg">
                <Timer className="w-4 h-4 text-primary" />
                <span>Duration: {quiz.durationMinutes} minutes</span>
              </div>
            )}
            
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg text-left border border-amber-200 dark:border-amber-900">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Anti-Cheating Rules
              </h3>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>Full screen mode is mandatory</li>
                <li>Tab switching is tracked</li>
                <li>Copy/Paste is disabled</li>
                <li>4 violations will auto-submit the quiz</li>
                {quiz.durationMinutes && <li>Timer will auto-submit when time runs out</li>}
              </ul>
            </div>

            <Button onClick={enterFullscreen} size="lg" className="w-full text-lg h-12">
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-4xl mx-auto px-4 py-8">
      {/* Violation Alert Dialog */}
      <AlertDialog open={showViolationAlert} onOpenChange={setShowViolationAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Warning: Violation Detected
            </AlertDialogTitle>
            <AlertDialogDescription>
              We detected suspicious activity (tab switch or focus loss). 
              You have {4 - violations} attempts remaining before your quiz is automatically submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowViolationAlert(false)}>
            I Understand
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold truncate max-w-md">{quiz.title}</h2>
          <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
        </div>
        <div className="text-right flex items-center gap-4">
          {timeRemaining !== null && (
            <div className={`flex items-center gap-1 font-mono text-lg font-bold ${getTimerColor()}`}>
              <Timer className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          )}
          <p className="text-sm font-medium text-destructive">Violations: {violations}/4</p>
        </div>
      </div>

      <Progress value={progress} className="h-2 mb-8 bg-secondary" />

      <Card className="flex-1 shadow-lg border-primary/10">
        <CardContent className="pt-8 px-8">
          <h3 className="text-xl font-medium mb-8 leading-relaxed">
            {currentQuestion.questionText}
          </h3>

          <RadioGroup 
            value={answers[currentQuestionIndex] === -1 ? undefined : answers[currentQuestionIndex].toString()} 
            onValueChange={(val) => handleAnswer(parseInt(val))}
            className="space-y-4"
          >
            {currentQuestion.options.map((option: string, idx: number) => (
              <div 
                key={idx} 
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  answers[currentQuestionIndex] === idx 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                }`}
                onClick={() => handleAnswer(idx)}
              >
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-base font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="w-32"
        >
          Previous
        </Button>

        {isLastQuestion ? (
          <Button 
            onClick={handleSubmit} 
            className="w-32 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            disabled={submitAttempt.isPending}
          >
            {submitAttempt.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
          </Button>
        ) : (
          <Button 
            onClick={() => setCurrentQuestionIndex(prev => Math.min(quiz.questions.length - 1, prev + 1))}
            className="w-32"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
