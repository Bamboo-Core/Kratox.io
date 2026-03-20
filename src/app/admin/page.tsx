'use client';

import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building, ListChecks, ToyBrick, Bot, MessageSquare } from 'lucide-react';
import UsersTab from './_components/users-tab';
import TenantsTab from './_components/tenants-tab';
import BlocklistsTab from './_components/blocklists-tab';
import AutomationTab from './_components/automation-tab';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import AutomationTemplatesTab from './_components/automation-templates-tab';
import WhatsappTestCard from './_components/whatsapp-test-card';
import AutomationTestCard from './_components/automation-test-card';
import { useTranslation } from 'react-i18next';

export default function AdminPage() {
  const scriptableAutomationEnabled = useFeatureFlag('scriptable_automation_templates');
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('admin.title')} />
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              {t('admin.tabs.users')}
            </TabsTrigger>
            {/* <TabsTrigger value="tenants">
              <Building className="mr-2 h-4 w-4" />
              {t('admin.tabs.tenants')}
            </TabsTrigger> */}
            <TabsTrigger value="blocklists">
              <ListChecks className="mr-2 h-4 w-4" />
              {t('admin.tabs.blocklists')}
            </TabsTrigger>
            {/* <TabsTrigger value="automation">
              {scriptableAutomationEnabled ? (
                <Bot className="mr-2 h-4 w-4" />
              ) : (
                <ToyBrick className="mr-2 h-4 w-4" />
              )}
              {t('admin.tabs.automation')}
            </TabsTrigger>
            <TabsTrigger value="tests">
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('admin.tabs.tests')}
            </TabsTrigger> */}
          </TabsList>

          <TabsContent value="users">
            <Card className="shadow-lg mt-4">
              <CardHeader>
                <CardTitle>{t('admin.users.title')}</CardTitle>
                <CardDescription>
                  {t('admin.users.description')}
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
                <CardTitle>{t('admin.tenants.title')}</CardTitle>
                <CardDescription>
                  {t('admin.tenants.description')}
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
                <CardTitle>{t('admin.blocklists.title')}</CardTitle>
                <CardDescription>
                  {t('admin.blocklists.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BlocklistsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="automation">
            {scriptableAutomationEnabled ? (
              <Card className="shadow-lg mt-4">
                <CardHeader>
                  <CardTitle>{t('admin.automation.templatesTitle')}</CardTitle>
                  <CardDescription>
                    {t('admin.automation.templatesDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AutomationTemplatesTab />
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg mt-4">
                <CardHeader>
                  <CardTitle>{t('admin.automation.blocksTitle')}</CardTitle>
                  <CardDescription>
                    {t('admin.automation.blocksDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AutomationTab />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="tests">
            <WhatsappTestCard />
            <AutomationTestCard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
