
"use client"; // This page will have client-side interaction for form handling

import { useState, useEffect } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit2, Trash2, ListChecks, ToggleRight, Loader2 } from "lucide-react";
import type { Rule } from "@/types/rules"; // Updated import

const initialRules: Rule[] = [
  { id: "RULE001", name: "High CPU Alert", triggerType: "Zabbix Alert", triggerCondition: "CPU Usage > 90% for 5m", actionCommand: "notify_admin_critical_cpu {{device}}", isEnabled: true, tenant: "Tenant A" },
  { id: "RULE002", name: "Device Offline", triggerType: "Ping Failure", triggerCondition: "3 consecutive failed pings", actionCommand: "create_ticket 'Device {{device}} offline'", isEnabled: true, tenant: "Tenant B" },
  { id: "RULE003", name: "Backup Config", triggerType: "Time Schedule", triggerCondition: "Daily at 2 AM", actionCommand: "backup_config_all_routers", isEnabled: false, tenant: "Global" },
];

export default function ConditionalRulesPage() {
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [ruleName, setRuleName] = useState("");
  const [triggerType, setTriggerType] = useState("");
  const [triggerCondition, setTriggerCondition] = useState("");
  const [actionCommand, setActionCommand] = useState("");
  const [tenant, setTenant] = useState("");

  // Client-side hydration check
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !triggerType || !triggerCondition || !actionCommand || !tenant) {
      // Basic validation
      alert("Please fill all fields.");
      return;
    }
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newRule: Rule = {
      id: `RULE${String(rules.length + 1).padStart(3, '0')}`,
      name: ruleName,
      triggerType,
      triggerCondition,
      actionCommand,
      isEnabled: true,
      tenant,
    };
    setRules(prevRules => [newRule, ...prevRules]);

    // Reset form
    setRuleName("");
    setTriggerType("");
    setTriggerCondition("");
    setActionCommand("");
    setTenant("");
    setIsSubmitting(false);
  };

  const toggleRuleStatus = (ruleId: string) => {
    setRules(prevRules =>
      prevRules.map(rule =>
        rule.id === ruleId ? { ...rule, isEnabled: !rule.isEnabled } : rule
      )
    );
  };

  const deleteRule = (ruleId: string) => {
    setRules(prevRules => prevRules.filter(rule => rule.id !== ruleId));
  };

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Conditional Rules Engine" />
        <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Conditional Rules Engine" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-primary" />
              Create New Rule
            </CardTitle>
            <CardDescription>Define automated actions based on specific network triggers and conditions.</CardDescription>
          </CardHeader>
          <form onSubmit={handleAddRule}>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleName">Rule Name</Label>
                <Input id="ruleName" placeholder="e.g., Auto-restart Service" value={ruleName} onChange={e => setRuleName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant</Label>
                <Input id="tenant" placeholder="e.g., Tenant A or Global" value={tenant} onChange={e => setTenant(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="triggerType">WHEN (Trigger Type)</Label>
                <Select onValueChange={setTriggerType} value={triggerType}>
                  <SelectTrigger id="triggerType">
                    <SelectValue placeholder="Select trigger..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zabbix Alert">Zabbix Alert</SelectItem>
                    <SelectItem value="Metric Threshold">Metric Threshold</SelectItem>
                    <SelectItem value="Ping Failure">Ping Failure</SelectItem>
                    <SelectItem value="Time Schedule">Time Schedule</SelectItem>
                    <SelectItem value="Manual Trigger">Manual Trigger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="triggerCondition">IF (Condition)</Label>
                <Input id="triggerCondition" placeholder="e.g., CPU > 90% for 5m OR specific Zabbix alert name" value={triggerCondition} onChange={e => setTriggerCondition(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="actionCommand">ACTION (Command / Script)</Label>
                <Textarea id="actionCommand" placeholder="e.g., ssh {{device_ip}} 'sudo reboot' OR send_telegram_message 'Alert: {{alert_message}} on {{device_name}}'" value={actionCommand} onChange={e => setActionCommand(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Rule
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                Configured Rules
            </CardTitle>
            <CardDescription>Manage existing automation rules.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{rule.triggerType}</TableCell>
                    <TableCell className="truncate max-w-xs">{rule.triggerCondition}</TableCell>
                    <TableCell className="truncate max-w-xs font-mono text-xs">{rule.actionCommand}</TableCell>
                    <TableCell>{rule.tenant}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`status-${rule.id}`}
                          checked={rule.isEnabled}
                          onCheckedChange={() => toggleRuleStatus(rule.id)}
                          aria-label={`Toggle status for rule ${rule.name}`}
                        />
                        <Label htmlFor={`status-${rule.id}`}>
                           {rule.isEnabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="Edit rule" className="hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete rule" onClick={() => deleteRule(rule.id)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {rules.length === 0 && (
                <p className="py-4 text-center text-muted-foreground">No rules configured yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
