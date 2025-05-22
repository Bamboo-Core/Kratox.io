
"use client"; // This page will have client-side interaction for form handling

import { useState, useEffect } from 'react';
import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Terminal, PlayCircle, Loader2 } from "lucide-react";

export default function CommandExecutionPage() {
  const [command, setCommand] = useState("");
  const [targetDevice, setTargetDevice] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executedAt, setExecutedAt] = useState<string | null>(null);

  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command || !targetDevice) {
      setOutput("Error: Target device and command must be specified.");
      return;
    }
    setIsLoading(true);
    setOutput(`Executing "${command}" on ${targetDevice}...`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const timestamp = new Date().toLocaleString();
    setExecutedAt(timestamp);
    // Simulate different outputs
    if (command.toLowerCase().includes("error")) {
        setOutput(`Error executing command on ${targetDevice} at ${timestamp}:\n\nPermission denied or command not found.`);
    } else if (command.toLowerCase().includes("show config")) {
        setOutput(`Output from ${targetDevice} at ${timestamp}:\n\nHostname ${targetDevice}\nInterface GigabitEthernet0/0\n ip address 192.168.1.1 255.255.255.0\n no shutdown\n!\nInterface GigabitEthernet0/1\n ip address 10.0.0.1 255.255.255.0\n shutdown`);
    } else {
        setOutput(`Output from ${targetDevice} at ${timestamp}:\n\nCommand executed successfully.\n${targetDevice}> ${command}\n... (simulated output) ...`);
    }
    setIsLoading(false);
  };

  // Effect to update executedAt for client-side rendering consistency
  useEffect(() => {
    if (isLoading) {
      setExecutedAt(new Date().toLocaleString());
    }
  }, [isLoading]);


  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Command Execution" />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              Execute Remote Command
            </CardTitle>
            <CardDescription>
              Run commands on network devices via SSH. Ensure you have the necessary permissions.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleExecuteCommand}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="targetDevice">Target Device IP / Hostname</Label>
                <Input
                  id="targetDevice"
                  placeholder="e.g., 192.168.1.1 or router.example.com"
                  value={targetDevice}
                  onChange={(e) => setTargetDevice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="command">Command</Label>
                <Input
                  id="command"
                  placeholder="e.g., show version, ping 8.8.8.8"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || !command || !targetDevice}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Execute Command
              </Button>
            </CardFooter>
          </form>
        </Card>

        {output && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Command Output</CardTitle>
              {executedAt && <CardDescription>Last executed: {executedAt}</CardDescription>}
            </CardHeader>
            <CardContent>
              <Textarea
                value={output}
                readOnly
                rows={10}
                className="font-mono text-sm bg-muted/50 border-dashed"
                placeholder="Command output will appear here..."
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
