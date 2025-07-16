
"use client";

import { useState } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Bot, Loader2 } from "lucide-react";
import { useSuggestRuleMutation } from '@/hooks/useAiRules';
import { Badge } from '@/components/ui/badge';

interface SuggestedRule {
  when: string;
  if: string;
  action: string;
}

export default function ConditionalRulesPage() {
  const [description, setDescription] = useState("");
  const [suggestedRule, setSuggestedRule] = useState<SuggestedRule | null>(null);
  const suggestRuleMutation = useSuggestRuleMutation();

  const handleSuggestRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSuggestedRule(null); // Clear previous suggestion
    suggestRuleMutation.mutate(description, {
      onSuccess: (data) => {
        setSuggestedRule(data.rule);
      },
      // onError is handled by the mutation's state
    });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Motor de Regras de Automação" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <Card className="shadow-lg max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Gerador de Regras com IA
            </CardTitle>
            <CardDescription>
              Descreva um problema ou um cenário de automação em linguagem natural, e a IA irá sugerir uma regra estruturada para você.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSuggestRule}>
            <CardContent>
              <Textarea
                placeholder="Exemplo: 'Quando um alerta do Zabbix mencionar um ataque de phishing de um domínio específico, eu quero extrair esse domínio e bloqueá-lo no DNS.'"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={suggestRuleMutation.isPending}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={!description.trim() || suggestRuleMutation.isPending}>
                {suggestRuleMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-4 w-4" />
                )}
                Sugerir Regra com IA
              </Button>
            </CardFooter>
          </form>
        </Card>

        {suggestRuleMutation.isError && (
          <Alert variant="destructive" className="max-w-4xl mx-auto">
            <AlertTitle>Falha na Geração da Sugestão</AlertTitle>
            <AlertDescription>
              {suggestRuleMutation.error instanceof Error ? suggestRuleMutation.error.message : "Ocorreu um erro desconhecido."}
            </AlertDescription>
          </Alert>
        )}

        {suggestedRule && (
          <Card className="shadow-lg max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Sugestão de Regra Gerada</CardTitle>
              <CardDescription>A IA analisou sua descrição e sugere a seguinte automação. No futuro, você poderá aprovar e ativar esta regra com um clique.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="text-base w-24 justify-center py-1">QUANDO</Badge>
                    <p className="font-mono bg-muted p-2 rounded-md flex-1">{suggestedRule.when}</p>
                </div>
                <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="text-base w-24 justify-center py-1">SE</Badge>
                     <p className="font-mono bg-muted p-2 rounded-md flex-1">{suggestedRule.if}</p>
                </div>
                <div className="flex items-start space-x-3">
                    <Badge variant="success" className="text-base w-24 justify-center py-1">AÇÃO</Badge>
                     <p className="font-mono bg-muted p-2 rounded-md flex-1">{suggestedRule.action}</p>
                </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
