import React from "react";
import { useRoute } from "wouter";
import { useQuizAttempts } from "@/hooks/use-attempts";
import { useQuiz } from "@/hooks/use-quizzes";
import { useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import {
  Loader2,
  ArrowLeft,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle
} from "lucide-react";

import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

/*
Normalize attempt MongoDB _id → id
*/
function normalizeAttempt(attempt: any) {

  return {
    ...attempt,
    id: attempt._id,
  };
}

export default function QuizAttempts() {

  const [match, params] = useRoute("/quiz/:id/attempts");

  const id = params?.id || "";
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const {
    data: quiz,
    isLoading: isQuizLoading
  } = useQuiz(id);

  const {
    data: attemptsRaw,
    isLoading: isAttemptsLoading
  } = useQuizAttempts(id);

  const attempts = attemptsRaw?.map(normalizeAttempt) || [];

  if (isQuizLoading || isAttemptsLoading) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  /*
  Quiz truly not found
  */
  if (!quiz) {

    return (
      <div className="min-h-screen flex items-center justify-center">

        <div className="text-center">

          <h2 className="text-xl font-semibold mb-2">
            Quiz not found
          </h2>

          <Link href="/dashboard">
            <Button variant="outline">
              Back to Dashboard
            </Button>
          </Link>

        </div>

      </div>
    );
  }

  return (

    <div className="min-h-screen bg-background pb-20">

      <div className="bg-secondary/30 py-12 border-b">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-4 mb-4">

            <Link href="/dashboard">

              <Button variant="ghost" size="icon">

                <ArrowLeft className="w-5 h-5" />

              </Button>

            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              Quiz Results
            </h1>

          </div>

          <h2 className="text-xl text-primary font-medium">
            {quiz.title}
          </h2>

          <p className="text-muted-foreground mt-2">
            {attempts.length} total submissions
          </p>

        </div>

      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        <Card>

          <CardHeader className="flex flex-row items-center justify-between">

            <CardTitle>
              Student Submissions
            </CardTitle>

            <Button variant="default" size="sm" onClick={() => {
              if (!attempts || attempts.length === 0) return;

              const header = "Student Name,Email,Score,Total,Percentage,Violations,Time Taken,Status,Date";

              const rows = attempts.map((a: any) => {
                const percentage = Math.round((a.score / a.totalQuestions) * 100);
                const status = a.isLocked ? "Locked" : a.isAutoSubmitted ? "Auto-Submitted" : a.terminated ? "Terminated" : "Completed";
                const date = a.completedAt ? new Date(a.completedAt).toLocaleString() : "";
                const timeTaken = a.timeTakenSeconds ? `${Math.floor(a.timeTakenSeconds / 60)}m ${a.timeTakenSeconds % 60}s` : "-";
                return `${a.studentName},${a.studentEmail},${a.score},${a.totalQuestions},${percentage}%,${a.violations || 0},${timeTaken},${status},${date}`;
              });

              const csv = [header, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "quiz-attempts.csv";
              a.click();
              window.URL.revokeObjectURL(url);
            }}>

              <Download className="w-4 h-4 mr-2" />

              Download CSV

            </Button>

          </CardHeader>

          <CardContent className="p-0">

            <Table>

              <TableHeader>

                <TableRow>

                  <TableHead>Student Name</TableHead>

                  <TableHead>Email</TableHead>

                  <TableHead>Score</TableHead>

                  <TableHead>Percentage</TableHead>

                  <TableHead>Violations</TableHead>

                  <TableHead>Time Taken</TableHead>

                  <TableHead>Status</TableHead>

                  <TableHead>Date</TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {attempts.length === 0 ? (

                  <TableRow>

                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >

                      No students have attempted this quiz yet.

                    </TableCell>

                  </TableRow>

                ) : (

                  attempts.map((attempt: any) => {

                    const percentage =
                      Math.round(
                        (attempt.score / attempt.totalQuestions) * 100
                      );

                    const hasDetailedAnswers = Array.isArray(attempt.answers) && attempt.answers.length > 0 && typeof attempt.answers[0] === 'object';
                    const isExpanded = expandedRows[attempt.id] || false;

                    return (
                      <React.Fragment key={attempt.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => hasDetailedAnswers && toggleRow(attempt.id)}>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {hasDetailedAnswers && (
                              isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            {attempt.studentName}
                          </div>
                        </TableCell>

                        <TableCell>
                          {attempt.studentEmail}
                        </TableCell>

                        <TableCell>
                          {attempt.score}/{attempt.totalQuestions}
                        </TableCell>

                        <TableCell>

                          <Badge>

                            {percentage}%

                          </Badge>

                        </TableCell>

                        <TableCell>
                          {(attempt.violations || 0) > 0 ? (
                            <Badge variant="destructive">{attempt.violations}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {attempt.timeTakenSeconds ? (
                            <span className="font-mono text-sm">
                              {Math.floor(attempt.timeTakenSeconds / 60)}m {attempt.timeTakenSeconds % 60}s
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>

                          {attempt.isLocked ? (

                            <Badge variant="destructive">
                              Locked
                            </Badge>

                          ) : attempt.isAutoSubmitted ? (

                            <Badge variant="destructive">
                              Auto-Submitted
                            </Badge>

                          ) : attempt.terminated ? (

                            <Badge variant="destructive">
                              Terminated
                            </Badge>

                          ) : (

                            <Badge>
                              Completed
                            </Badge>

                          )}

                        </TableCell>

                        <TableCell>

                          {attempt.attemptedAt
                            ? format(
                                new Date(attempt.attemptedAt),
                                "MMM d, HH:mm"
                              )
                            : "-"}

                        </TableCell>

                      </TableRow>

                      {hasDetailedAnswers && isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-muted-foreground mb-3">Answer Details for {attempt.studentName}</p>
                              {attempt.answers.map((ans: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className={`p-3 rounded-lg border-l-4 text-sm ${
                                    ans.isCorrect 
                                      ? 'border-l-green-500 bg-green-50 dark:bg-green-950/20' 
                                      : 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">
                                      <span className="text-muted-foreground">Q{idx + 1}:</span> {ans.questionText}
                                    </p>
                                    {ans.isCorrect ? (
                                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    )}
                                  </div>
                                  <div className="mt-1 space-y-0.5">
                                    <p><span className="text-muted-foreground">Selected:</span> <span className={ans.isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>{ans.selectedAnswer || "Not answered"}</span></p>
                                    {!ans.isCorrect && (
                                      <p><span className="text-muted-foreground">Correct:</span> <span className="text-green-700 dark:text-green-400">{ans.correctAnswer}</span></p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      </React.Fragment>
                    );

                  })

                )}

              </TableBody>

            </Table>

          </CardContent>

        </Card>

      </div>

    </div>

  );

}