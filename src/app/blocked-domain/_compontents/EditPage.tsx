"use client";

import { useState } from "react";
import { BlockedDomainContent } from "./BlockedDomainContent";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function EditPage() {
    const { t } = useTranslation();

    const [bgColor, setBgColor] = useState<string>("");
    const [textColor, setTextColor] = useState<string>("");
    const [icon, setIcon] = useState<string>("");
    const [footerText, setFooterText] = useState<string>("Kratox.io");
    const [activeTab, setActiveTab] = useState<string>("en");
    const [translations, setTranslations] = useState({
        pt: { title: "", subtitle: "" },
        en: { title: "", subtitle: "" },
        es: { title: "", subtitle: "" }
    });

    const handleTranslationChange = (lang: 'pt' | 'en' | 'es', field: 'title' | 'subtitle', value: string) => {
        setTranslations(prev => ({
            ...prev,
            [lang]: {
                ...prev[lang],
                [field]: value
            }
        }));
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-background">
            <aside className="w-full lg:w-1/3 xl:w-1/4 h-full border-r bg-card overflow-y-auto p-6 shadow-xl z-10">
                <div className="flex flex-col gap-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{t("blockedPageEdit.title")}</h2>
                        <p className="text-muted-foreground text-sm">
                            {t("blockedPageEdit.description")}
                        </p>
                    </div>

                    <Separator />

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="bgColor">{t("blockedPageEdit.label.backgroundColor")}</Label>
                            <div className="flex gap-2">
                                <div className="relative w-10 h-10 rounded border overflow-hidden shrink-0">
                                    <input
                                        type="color"
                                        id="bgColorColor"
                                        value={bgColor || "#000000"}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                                    />
                                </div>
                                <Input
                                    id="bgColor"
                                    placeholder="#000000"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    className="font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="textColor">{t("blockedPageEdit.label.textColor")}</Label>
                            <div className="flex gap-2">
                                <div className="relative w-10 h-10 rounded border overflow-hidden shrink-0">
                                    <input
                                        type="color"
                                        id="textColorColor"
                                        value={textColor || "#ffffff"}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
                                    />
                                </div>
                                <Input
                                    id="textColor"
                                    placeholder="#ffffff"
                                    value={textColor}
                                    onChange={(e) => setTextColor(e.target.value)}
                                    className="font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="icon">{t("blockedPageEdit.label.iconUrl")}</Label>
                            <Input
                                id="icon"
                                placeholder="https://kratox.com.br"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="footerText">{t("blockedPageEdit.label.footerText")}</Label>
                            <Input
                                id="footerText"
                                placeholder="Kratox.io"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                            />
                            <div className="text-xs text-muted-foreground">
                                {t("blockedPageEdit.label.footerTextHint")}
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <Label>{t("blockedPageEdit.label.textContent")}</Label>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="w-full grid grid-cols-3">
                                    <TabsTrigger value="en">{t("languages.en")}</TabsTrigger>
                                    <TabsTrigger value="pt">{t("languages.pt")}</TabsTrigger>
                                    <TabsTrigger value="es">{t("languages.es")}</TabsTrigger>
                                </TabsList>

                                <div className="mt-4">
                                    <TabsContent value="pt" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title-pt">{t("blockedPageEdit.label.title", { lang: "PT" })}</Label>
                                            <Input
                                                id="title-pt"
                                                value={translations.pt.title}
                                                onChange={(e) => handleTranslationChange('pt', 'title', e.target.value)}
                                                placeholder={t("accessForbidden.title", { lng: "pt" })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subtitle-pt">{t("blockedPageEdit.label.subtitle", { lang: "PT" })}</Label>
                                            <Input
                                                id="subtitle-pt"
                                                value={translations.pt.subtitle}
                                                onChange={(e) => handleTranslationChange('pt', 'subtitle', e.target.value)}
                                                placeholder={t("accessForbidden.subtitle", { lng: "pt" })}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="en" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title-en">{t("blockedPageEdit.label.title", { lang: "EN" })}</Label>
                                            <Input
                                                id="title-en"
                                                value={translations.en.title}
                                                onChange={(e) => handleTranslationChange('en', 'title', e.target.value)}
                                                placeholder={t("accessForbidden.title", { lng: "en" })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subtitle-en">{t("blockedPageEdit.label.subtitle", { lang: "EN" })}</Label>
                                            <Input
                                                id="subtitle-en"
                                                value={translations.en.subtitle}
                                                onChange={(e) => handleTranslationChange('en', 'subtitle', e.target.value)}
                                                placeholder={t("accessForbidden.subtitle", { lng: "en" })}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="es" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title-es">{t("blockedPageEdit.label.title", { lang: "ES" })}</Label>
                                            <Input
                                                id="title-es"
                                                value={translations.es.title}
                                                onChange={(e) => handleTranslationChange('es', 'title', e.target.value)}
                                                placeholder={t("accessForbidden.title", { lng: "es" })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="subtitle-es">{t("blockedPageEdit.label.subtitle", { lang: "ES" })}</Label>
                                            <Input
                                                id="subtitle-es"
                                                value={translations.es.subtitle}
                                                onChange={(e) => handleTranslationChange('es', 'subtitle', e.target.value)}
                                                placeholder={t("accessForbidden.subtitle", { lng: "es" })}
                                            />
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex gap-4">
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                            {t("blockedPageEdit.button.save")}
                        </Button>
                        <Button className="w-full bg-gray-500 hover:bg-gray-600 text-white hover:text-white" variant="outline" onClick={() => {
                            setBgColor("");
                            setTextColor("");
                            setIcon("");
                            setFooterText("Kratox.io");
                            setTranslations({
                                pt: { title: "", subtitle: "" },
                                en: { title: "", subtitle: "" },
                                es: { title: "", subtitle: "" }
                            });
                        }}>
                            {t("blockedPageEdit.button.reset")}
                        </Button>
                    </div>
                </div>
            </aside>

            <main className="flex-1 h-full overflow-hidden bg-gray-900/50 flex flex-col items-center justify-center relative">
                <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm z-50">
                    {t("blockedPageEdit.preview")}
                </div>

                <div className="w-full h-full overflow-auto">
                    <BlockedDomainContent
                        customTranslations={translations}
                        customIcon={icon}
                        customBackgroundColor={bgColor}
                        customTextColor={textColor}
                        customFooterText={footerText}
                        isPreview={true}
                        previewLang={activeTab}
                    />
                </div>
            </main>
        </div>
    );
}