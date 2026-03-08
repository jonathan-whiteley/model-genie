import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useWizard } from "@/lib/wizard-context";
import { useParseQuestions, useUploadQuestions } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
function GenieLampIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} fill="currentColor">
      {/* Spout - long curved pouring lip on the left */}
      <path d="M48 240c0-16 8-28 24-36l80-40c8-4 16-2 16 8v24c0 8-4 14-12 18l-60 30c-4 2-8 6-8 12v8c0 8 4 14 12 16l56 16h92v-56H144c-48 0-96-32-96-64v64z" opacity="0.95"/>
      {/* Lamp body - big round pot */}
      <ellipse cx="296" cy="296" rx="136" ry="80" />
      {/* Handle - curly C shape on the right */}
      <path d="M432 264c24 0 44 16 44 40s-20 40-44 40" fill="none" stroke="currentColor" strokeWidth="28" strokeLinecap="round"/>
      {/* Lid rim - wide band on top of body */}
      <rect x="216" y="208" width="160" height="20" rx="10"/>
      {/* Lid dome */}
      <path d="M248 208c0 0 16-48 48-48s48 48 48 48z"/>
      {/* Lid ball finial */}
      <circle cx="296" cy="148" r="16"/>
      {/* Pedestal neck */}
      <path d="M264 376l-8 24h80l-8-24z"/>
      {/* Pedestal base */}
      <ellipse cx="296" cy="408" rx="56" ry="16"/>
    </svg>
  );
}

export function StepInput() {
  const { setStep, setQuestions, setParsedQuestions, setEntities } = useWizard();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const parseMutation = useParseQuestions();
  const uploadMutation = useUploadQuestions();

  const handleParse = async () => {
    const questions = text
      .split("\n")
      .map((q) => q.replace(/^\d+[.)]\s*/, "").replace(/^[-\u2022]\s*/, "").trim())
      .filter(Boolean);

    if (questions.length === 0) {
      setError("Please enter at least one question.");
      return;
    }

    setError(null);
    try {
      const result = await parseMutation.mutateAsync({ questions });
      setQuestions(questions);
      setParsedQuestions(result.data.parsed_questions);
      setEntities(result.data.entities);
      setStep("parse");
    } catch {
      setError("Failed to parse questions. Please try again.");
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadMutation.mutateAsync(formData);
        const questions = result.data.parsed_questions.map((pq) => pq.original_text);
        setQuestions(questions);
        setParsedQuestions(result.data.parsed_questions);
        setEntities(result.data.entities);
        setStep("parse");
      } catch {
        setError("Failed to upload and parse file. Please try again.");
      }
    },
    [setQuestions, setParsedQuestions, setEntities, setStep, uploadMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
  });

  const isLoading = parseMutation.isPending || uploadMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Business Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={
              "What were net sales by category last month?\nHow many weekly units sold in west region?\nWhat were product XYZ's gross sales last week?"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <Button onClick={handleParse} disabled={isLoading || !text.trim()} className="gap-2">
            {isLoading ? (
              "Analyzing questions..."
            ) : (
              <>
                <GenieLampIcon className="w-5 h-5" />
                Analyze Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-muted-foreground">
              {isDragActive
                ? "Drop the file here..."
                : "Drag & drop a CSV or XLSX file here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">One question per row</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
