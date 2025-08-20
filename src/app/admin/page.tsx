
"use client";

import PageHeader from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building, ShieldBan, ListChecks } from "lucide-react";
import UsersTab from './_components/users-tab';
import TenantsTab from './_components/tenants-tab';
import DnsTab from "./_components/dns-tab";
import BlocklistsTab from "./_components/blocklists-tab";

export default function AdminPage() {
    return (
        <div className="flex flex-col h-full">
            <PageHeader title="Platform Administration" />
            <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
                <Tabs defaultValue="users" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 max-w-3xl">
                        <TabsTrigger value="users">
                            <Users className="mr-2 h-4 w-4" />
                            User Management
                        </TabsTrigger>
                        <TabsTrigger value="tenants">
                            <Building className="mr-2 h-4 w-4" />
                            Tenant Management
                        </TabsTrigger>
                        <TabsTrigger value="dns">
                            <ShieldBan className="mr-2 h-4 w-4" />
                            Global DNS Blocklist
                        </TabsTrigger>
                        <TabsTrigger value="blocklists">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Blocklist Feeds
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
                                    Create and view all tenants on the platform.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <TenantsTab />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="dns">
                        <Card className="shadow-lg mt-4">
                            <CardHeader>
                                <CardTitle>Global DNS Management</CardTitle>
                                <CardDescription>
                                    View and manage DNS blocklists for all tenants from a central location.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DnsTab />
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

                </Tabs>
            </main>
        </div>
    );
}
