
"use client";

import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building, ListChecks, ToyBrick, Probe } from "lucide-react";
import UsersTab from './_components/users-tab';
import TenantsTab from './_components/tenants-tab';
import BlocklistsTab from "./_components/blocklists-tab";
import AutomationTab from "./_components/automation-tab"; // New import

export default function AdminPage() {
    return (
        <div className="flex flex-col h-full">
            <PageHeader title="Platform Administration" />
            <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 max-w-4xl">
                        <TabsTrigger value="users">
                            <Users className="mr-2 h-4 w-4" />
                            User Management
                        </TabsTrigger>
                        <TabsTrigger value="tenants">
                            <Building className="mr-2 h-4 w-4" />
                            Tenant Management
                        </TabsTrigger>
                        <TabsTrigger value="blocklists">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Blocklist Feeds
                        </TabsTrigger>
                        <TabsTrigger value="automation">
                            <ToyBrick className="mr-2 h-4 w-4" />
                            Automation
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <Card className="shadow-lg mt-4">
                            <CardHeader>
                                <CardTitle>Manage Users</CardTitle>
                                <CardDescription>
                                    Create, edit, and manage users across all tenants.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UsersTab />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="tenants">
                        <Card className="shadow-lg mt-4">
                            <CardHeader>
                                <CardTitle>Manage Tenants</CardTitle>
                                <CardDescription>
                                    Create and view all tenants on the platform. You can also configure tenant-specific settings like the Probe API URL here.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TenantsTab />
                            </CardContent>
                        </Card>
                    </TabsContent>

                     <TabsContent value="blocklists">
                        <Card className="shadow-lg mt-4">
                            <CardHeader>
                                <CardTitle>Manage Blocklist Feeds</CardTitle>
                                <CardDescription>
                                    Create and manage standard blocklists that tenants can subscribe to.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <BlocklistsTab />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="automation">
                        <Card className="shadow-lg mt-4">
                            <CardHeader>
                                <CardTitle>Automation Building Blocks</CardTitle>
                                <CardDescription>
                                    Define the criteria and actions that clients can use to build their automation rules.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AutomationTab />
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
}
