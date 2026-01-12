'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTestAutomationLogMutation } from '@/hooks/useAdminManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bot } from 'lucide-react';

export default function AutomationTestCard() {
    const { toast } = useToast();
    const testAutomationMutation = useTestAutomationLogMutation();
    const [groupId, setGroupId] = useState('15');

    const handleTest = () => {
        testAutomationMutation.mutate(groupId, {
            onSuccess: (data) => {
                toast({
                    title: 'Sucesso!',
                    description: `Log simulado para o host ${data.host}. Notificação disparada.`,
                });
            },
            onError: (error) => {
                toast({
                    variant: 'destructive',
                    title: 'Falha na Simulação',
                    description: error.message,
                });
            },
        });
    };

    return (
        <Card className="shadow-lg mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Teste de Log de Automação
                </CardTitle>
                <CardDescription>
                    Simule a criação de um log de automação para um host de um grupo específico (Padrão: 15).
                    Isso salvará um log no banco e disparará a notificação via WhatsApp.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="groupId">ID do Grupo Zabbix</Label>
                    <Input
                        type="text"
                        id="groupId"
                        placeholder="15"
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                    />
                </div>
                <Button
                    onClick={handleTest}
                    disabled={testAutomationMutation.isPending}
                >
                    {testAutomationMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Simular Log e Notificação
                </Button>
            </CardContent>
        </Card>
    );
}
