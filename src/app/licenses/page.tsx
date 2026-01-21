import PageHeader from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function LicensesPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Licenças de Software de Terceiros" />
      <main className="flex-1 p-4 md:p-6 flex justify-center">
        <Card className="w-full max-w-4xl shadow-lg">
          <CardHeader>
            <CardTitle>Atribuição de Licenças</CardTitle>
            <CardDescription>
              O NOC AI incorpora software de código aberto. Agradecemos aos desenvolvedores por suas
              contribuições. As licenças originais são fornecidas abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            <div>
              <h3 className="text-xl font-semibold">isptools/probe</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                Este projeto utiliza código do isptools/probe, que é licenciado sob a licença MIT.
              </p>
              <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
                {`Copyright (c) 2024 isptools

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
