'use client';

import PageHeader from '@/components/layout/page-header';
import FadeIn from '@/app/_components/FadeIn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Scale, ShieldCheck, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';


export default function LicensesPage() {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <PageHeader title={t('userNav.licenses')} />

            <main className="flex-1 p-4 md:p-8 flex justify-center overflow-y-auto relative z-10">
                <FadeIn className="w-full max-w-5xl">
                    <div className="space-y-10 pb-20">
                        {/* Header Section */}
                        <div className="space-y-6 text-center max-w-3xl mx-auto">
                            <div className="inline-block p-3 rounded-2xl bg-orange-500/10 mb-2">
                                <Scale className="text-orange-500 h-8 w-8" />
                            </div>
                            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                                Atribuição de Licenças
                            </h2>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                O Kratox é construído sobre bases sólidas de código aberto. 
                                Agradecemos imensamente à comunidade de desenvolvedores por suas contribuições valiosas.
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <Separator className="bg-orange-500/20 w-24 h-1 rounded-full" />
                        </div>

                        {/* Licenses Grid/List */}
                        <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
                            <Card className="bg-card/40 backdrop-blur-md border-border/40 shadow-2xl overflow-hidden group hover:border-orange-500/40 transition-all duration-500 hover:shadow-orange-500/5">
                                <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent"></div>
                                <CardHeader className="pb-6 pt-8 px-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform duration-500">
                                                <ShieldCheck size={24} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl font-bold text-white group-hover:text-orange-500 transition-colors">isptools/probe</CardTitle>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-500 border border-orange-500/10">MIT License</span>
                                                </div>
                                            </div>
                                        </div>
                                        <FileText className="text-muted-foreground/20 group-hover:text-orange-500/10 transition-colors" size={56} />
                                    </div>
                                </CardHeader>
                                <CardContent className="px-8 pb-8 space-y-6">
                                    <p className="text-lg text-muted-foreground leading-relaxed">
                                        Este componente é fundamental para as nossas capacidades de diagnóstico e monitoramento de rede em tempo real. 
                                        Utilizamos e adaptamos partes do código original seguindo rigorosamente os termos da licença permissiva MIT.
                                    </p>
                                    
                                    <div className="relative group/code">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-orange-500/5 rounded-2xl blur opacity-20 group-hover/code:opacity-40 transition duration-500"></div>
                                        <pre className="relative bg-[#0d1117]/80 backdrop-blur-sm p-8 rounded-2xl text-xs md:text-sm font-mono text-gray-400 overflow-x-auto border border-white/5 leading-relaxed shadow-inner scrollbar-thin scrollbar-thumb-white/10">
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
                                    
                                    <div className="pt-4 flex items-center justify-between text-sm text-muted-foreground/60 italic">
                                        <span>Última revisão: Março 2026</span>
                                        <span className="flex items-center gap-1"><Scale size={14} /> Open Source Compliance</span>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    </div>
                </FadeIn>
            </main>
        </div>
    );
}
