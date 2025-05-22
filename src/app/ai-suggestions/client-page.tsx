
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getAIRuleSuggestions } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const initialState = {
  message: null,
  errors: null,
  suggestedRules: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Get AI Suggestions
        </>
      )}
    </Button>
  );
}

export default function AiSuggestionsClientPage() {
  const [state, formAction] = useFormState(getAIRuleSuggestions, initialState);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Generate Rule Suggestions
          </CardTitle>
          <CardDescription>
            Describe your network issue or desired automation, and our AI will suggest relevant conditional rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="description" className="font-semibold">Problem Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="e.g., 'When a server's CPU usage is high for 5 minutes, send an alert and try to restart the problematic service.' or 'Automate nightly configuration backups for all core routers.'"
                rows={6}
                className="mt-1 border-input focus:border-primary"
                required
                aria-describedby="description-error"
              />
              {state?.errors?.description && (
                <p id="description-error" className="text-sm text-destructive mt-1">{state.errors.description[0]}</p>
              )}
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      {state?.message && !state.errors?.description && (
         <Alert variant={state.errors || !state.suggestedRules ? "destructive" : "default"} className={`${state.errors || !state.suggestedRules ? 'border-destructive' : 'border-green-500 dark:border-green-400'}`}>
           {state.errors || !state.suggestedRules ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
           <AlertTitle>{state.errors || !state.suggestedRules ? "Error" : "Success!"}</AlertTitle>
           <AlertDescription>{state.message}</AlertDescription>
         </Alert>
      )}
      
      {state?.suggestedRules && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Suggested Rules</CardTitle>
            <CardDescription>Review the AI-generated suggestions below. You can copy and adapt them into the Rules Engine.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted/50 rounded-md text-sm whitespace-pre-wrap overflow-x-auto border border-dashed">
              {state.suggestedRules}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
