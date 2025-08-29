
"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminAutomationActions, useAdminAutomationCriteria } from "@/hooks/useAdminManagement";
import { AlertTriangle, Loader2 } from "lucide-react";


function CriteriaTable() {
    const { data: criteria = [], isLoading, isError, error } = useAdminAutomationCriteria();
    
    if (isLoading) return <div className="text-center p-4"><Loader2 className="h-5 w-5 animate-spin inline-block" /> Loading Criteria...</div>;
    if (isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>System Name</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {criteria.length > 0 ? criteria.map((c) => (
                        <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.label}</TableCell>
                            <TableCell>{c.description}</TableCell>
                            <TableCell className="font-mono text-xs">{c.name}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center">No criteria defined.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}


function ActionsTable() {
    const { data: actions = [], isLoading, isError, error } = useAdminAutomationActions();
    
    if (isLoading) return <div className="text-center p-4"><Loader2 className="h-5 w-5 animate-spin inline-block" /> Loading Actions...</div>;
    if (isError) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>System Name</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {actions.length > 0 ? actions.map((a) => (
                        <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.label}</TableCell>
                            <TableCell>{a.description}</TableCell>
                            <TableCell className="font-mono text-xs">{a.name}</TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center">No actions defined.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

export default function AutomationTab() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-2">Rule Criteria</h3>
                <p className="text-sm text-muted-foreground mb-4">These are the conditions clients can select in the "IF" part of their automation rules.</p>
                <CriteriaTable />
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Rule Actions</h3>
                <p className="text-sm text-muted-foreground mb-4">These are the actions clients can select in the "ACTION" part of their automation rules.</p>
                <ActionsTable />
            </div>
        </div>
    );
}
