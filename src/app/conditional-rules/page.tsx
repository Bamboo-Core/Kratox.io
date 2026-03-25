'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sparkles,
  Bot,
  Loader2,
  PlusCircle,
  Power,
  PowerOff,
  ShieldBan,
  List,
  History,
} from 'lucide-react';
import { useSuggestRuleMutation } from '@/hooks/useAiRules';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import {
  useAutomationRulesQuery,
  useUpdateAutomationRuleMutation,
  useDeleteAutomationRuleMutation,
} from '@/hooks/useAutomationRules';
import { RuleDialog } from './_components/rule-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LogsTab from './_components/logs-tab';
import { useFeatureFlag } from '@/hooks/useFeatureFlags'; // New import
import TemplatesTab from './_components/templates-tab'; // New import for the new UI
import { useAuthStore } from '@/store/auth-store';
import { useTenantsQuery } from '@/hooks/useAdminManagement';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';
import { Label } from '@/components/ui/label';

interface SuggestedRule {
  when: string;
  if: string;
  action: string;
}

export default function ConditionalRulesPage() {
  const [description, setDescription] = useState('');
  const [suggestedRule, setSuggestedRule] = useState<SuggestedRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  
  const suggestRuleMutation = useSuggestRuleMutation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { data: tenants = [] } = useTenantsQuery();

  useEffect(() => {
    if (isAdmin && user?.tenantId && !selectedTenantId) {
      setSelectedTenantId(user.tenantId);
    }
  }, [isAdmin, user?.tenantId, selectedTenantId]);

  const scriptableAutomationEnabled = true;

  const {
    data: rules = [],
    isLoading: isLoadingRules,
    isError,
    error,
  } = useAutomationRulesQuery({ 
    enabled: !scriptableAutomationEnabled,
    tenantIdOverride: isAdmin ? (selectedTenantId || null) : null
  });

  const updateRuleMutation = useUpdateAutomationRuleMutation(isAdmin ? (selectedTenantId || null) : null);
  const deleteRuleMutation = useDeleteAutomationRuleMutation(isAdmin ? (selectedTenantId || null) : null);

  const handleSuggestRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSuggestedRule(null);
    suggestRuleMutation.mutate(description, {
      onSuccess: (data) => setSuggestedRule(data.rule),
    });
  };

  const handleToggleRule = (ruleId: string, isEnabled: boolean) => {
    updateRuleMutation.mutate({ id: ruleId, data: { is_enabled: isEnabled } });
  };

  const handleDeleteRule = (ruleId: string) => {
    deleteRuleMutation.mutate(ruleId, {
      onSuccess: () => toast({ title: 'Sucesso', description: 'Regra deletada.' }),
      onError: (err) => toast({ variant: 'destructive', title: 'Erro', description: err.message }),
    });
  };

  const formatCondition = (conditions: any) => {
    const key = Object.keys(conditions)[0];
    const value = conditions[key];
    switch (key) {
      case 'alert_name_contains':
        return `Nome do Alerta contém "${value}"`;
      default:
        return JSON.stringify(conditions);
    }
  };

  const formatAction = (type: string, params: any) => {
    switch (type) {
      case 'dns_block_domain_from_alert':
        return `Extrair domínio do alerta e bloquear no DNS`;
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Motor de Regras de Automação" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        {/* Admin Tenant Selector */}
        {isAdmin && (
          <Card className="shadow-md border-orange-100 bg-orange-50/30 max-w-4xl mx-auto">
            <CardHeader className="py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Gerenciamento Multi-tenant (Admin)</CardTitle>
                  <CardDescription>Visualize e gerencie regras para um cliente específico.</CardDescription>
                </div>
                <div className="flex items-center gap-2 min-w-[250px]">
                  <Label htmlFor="tenant-select" className="whitespace-nowrap">Cliente:</Label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger id="tenant-select" className="bg-white border-orange-200">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* This container will show the new or old UI based on the feature flag */}
        {scriptableAutomationEnabled ? (
          <Tabs defaultValue="templates" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">
                <History className="mr-2 h-4 w-4" />
                Templates de Automação
              </TabsTrigger>
              <TabsTrigger value="logs">
                <History className="mr-2 h-4 w-4" />
                Histórico de Execuções
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates">
              <Card className="shadow-lg mt-4">
                <CardHeader>
                  <CardTitle>Templates de Automação Disponíveis</CardTitle>
                  <CardDescription>
                    Ative ou desative os templates de automação pré-configurados para a conta selecionada.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TemplatesTab tenantIdOverride={isAdmin ? (selectedTenantId || null) : null} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="logs">
              <Card className="shadow-lg mt-4">
                <CardHeader>
                  <CardTitle>Histórico de Execuções das Automações</CardTitle>
                  <CardDescription>
                    Audite todas as ações executadas automaticamente pelo motor de regras.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LogsTab tenantIdOverride={isAdmin ? (selectedTenantId || null) : null} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {/* OLD UI for creating rules manually */}
            <Card className="shadow-lg max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Gerador de Regras com IA
                </CardTitle>
                <CardDescription>
                  Descreva um problema ou um cenário de automação em linguagem natural, e a IA irá
                  sugerir uma regra estruturada para você.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSuggestRule}>
                <CardContent>
                  <textarea
                    placeholder="Exemplo: 'Quando um alerta do Zabbix mencionar um ataque de phishing de um domínio específico, eu quero extrair esse domínio e bloqueá-lo no DNS.'"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    disabled={suggestRuleMutation.isPending}
                    className="w-full p-2 border rounded-md"
                  />
                </CardContent>
                <CardContent>
                  <Button
                    type="submit"
                    disabled={!description.trim() || suggestRuleMutation.isPending}
                  >
                    {suggestRuleMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Bot className="mr-2 h-4 w-4" />
                    )}
                    Sugerir Regra com IA
                  </Button>
                </CardContent>
              </form>
            </Card>

            {suggestRuleMutation.isError && (
              <Alert variant="destructive" className="max-w-4xl mx-auto">
                <AlertTitle>Falha na Geração da Sugestão</AlertTitle>
                <AlertDescription>
                  {suggestRuleMutation.error instanceof Error
                    ? suggestRuleMutation.error.message
                    : 'Ocorreu um erro desconhecido.'}
                </AlertDescription>
              </Alert>
            )}

            {suggestedRule && (
              <Card className="shadow-lg max-w-4xl mx-auto">
                <CardHeader>
                  <CardTitle>Sugestão de Regra Gerada</CardTitle>
                  <CardDescription>
                    A IA analisou sua descrição e sugere a seguinte automação. Você pode aprová-la e
                    ativá-la.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="text-base w-24 justify-center py-1">
                      QUANDO
                    </Badge>
                    <p className="font-mono bg-muted p-2 rounded-md flex-1">{suggestedRule.when}</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="text-base w-24 justify-center py-1">
                      SE
                    </Badge>
                    <p className="font-mono bg-muted p-2 rounded-md flex-1">{suggestedRule.if}</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Badge variant="success" className="text-base w-24 justify-center py-1">
                      AÇÃO
                    </Badge>
                    <p className="font-mono bg-muted p-2 rounded-md flex-1">
                      {suggestedRule.action}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="rules" className="w-full max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rules">
                  <List className="mr-2 h-4 w-4" />
                  Regras
                </TabsTrigger>
                <TabsTrigger value="logs">
                  <History className="mr-2 h-4 w-4" />
                  Histórico de Execuções
                </TabsTrigger>
              </TabsList>
              <TabsContent value="rules">
                <Card className="shadow-lg mt-4">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Regras de Automação Ativas</CardTitle>
                      <Button onClick={() => setIsRuleDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Regra
                      </Button>
                    </div>
                    <CardDescription>
                      Gerencie as regras que automatizam as operações da sua rede.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingRules && (
                      <div className="text-center">
                        <Loader2 className="h-6 w-6 animate-spin" /> Carregando regras...
                      </div>
                    )}
                    {isError && (
                      <Alert variant="destructive">
                        <AlertTitle>Erro</AlertTitle>
                        <AlertDescription>{error.message}</AlertDescription>
                      </Alert>
                    )}

                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Condição</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rules.length > 0
                            ? rules.map((rule) => (
                                <TableRow key={rule.id}>
                                  <TableCell>
                                    <Switch
                                      checked={rule.is_enabled}
                                      onCheckedChange={(checked) =>
                                        handleToggleRule(rule.id, checked)
                                      }
                                      disabled={updateRuleMutation.isPending}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{rule.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {formatCondition(rule.trigger_conditions)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="gap-2">
                                      <ShieldBan className="h-4 w-4" />
                                      {formatAction(rule.action_type, rule.action_params)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isto irá deletar
                                            permanentemente a regra &quot;{rule.name}&quot;.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteRule(rule.id)}
                                            className="bg-destructive hover:bg-destructive/90"
                                          >
                                            Deletar
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                </TableRow>
                              ))
                            : !isLoadingRules && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center h-24">
                                    Nenhuma regra de automação encontrada.
                                  </TableCell>
                                </TableRow>
                              )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="logs">
                <Card className="shadow-lg mt-4">
                  <CardHeader>
                    <CardTitle>Histórico de Execuções das Automações</CardTitle>
                    <CardDescription>
                      Audite todas as ações executadas automaticamente pelo motor de regras.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LogsTab tenantIdOverride={isAdmin ? (selectedTenantId || null) : null} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            <RuleDialog 
              isOpen={isRuleDialogOpen} 
              onOpenChange={setIsRuleDialogOpen} 
              tenantIdOverride={isAdmin ? (selectedTenantId || null) : null}
            />
          </>
        )}
      </main>
    </div>
  );
}
