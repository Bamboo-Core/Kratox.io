"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type AccordionItem = {
    id: number;
    title: string;
    content: string;
};

type AccordionProps = {
    items: AccordionItem[];
};

function RichText({ text }: { text: string }) {
    if (!text) return null;

    const parts = text.split(/(<bold>.*?<\/bold>|<code>.*?<\/code>|<link>.*?<\/link>|_.*?_)/g);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('<bold>')) {
                    return (
                        <strong key={i} className="text-white">
                            {part.replace(/<\/?bold>/g, '')}
                        </strong>
                    );
                }
                if (part.startsWith('<code>')) {
                    return (
                        <code key={i} className="px-1 bg-zinc-800 rounded font-mono text-xs text-orange-400">
                            {part.replace(/<\/?code>/g, '')}
                        </code>
                    );
                }
                if (part.startsWith('<link>')) {
                    return (
                        <Link
                            key={i}
                            href="/docs/technical"
                            className="text-orange-500 hover:text-orange-400 font-medium underline underline-offset-4 transition-colors"
                        >
                            {part.replace(/<\/?link>/g, '')}
                        </Link>
                    );
                }
                if (part.startsWith('_') && part.endsWith('_')) {
                    return (
                        <em key={i} className="italic text-gray-300">
                            {part.substring(1, part.length - 1)}
                        </em>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
}

function Accordion({ items }: AccordionProps) {
    const [openItem, setOpenItem] = useState<number | null>(null);

    const toggleItem = (id: number): void => {
        setOpenItem((prev) => (prev === id ? null : id));
    };

    return (
        <div>
            {items.map((item) => (
                <div key={item.id} className="border-b border-gray-200/10">
                    <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex justify-between items-center py-6 text-left font-medium text-white hover:text-orange-400 transition-colors group"
                    >
                        <span className="text-lg">{item.title}</span>
                        <span className={cn(
                            "ml-2 text-2xl transition-transform duration-300",
                            openItem === item.id ? "rotate-180 text-orange-500" : "text-gray-500 group-hover:text-gray-300"
                        )}>
                            {openItem === item.id ? "−" : "+"}
                        </span>
                    </button>

                    {openItem === item.id && (
                        <div className="pb-6 text-gray-400 leading-relaxed transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                            <RichText text={item.content} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export { Accordion };

export default function FAQs() {
    const { t } = useTranslation();

    const rawItems = t("landing.faqs.items", { returnObjects: true }) as Array<{
        question: string;
        answer: string;
    }>;

    const items: AccordionItem[] = Array.isArray(rawItems)
        ? rawItems.map((item, index) => ({
            id: index + 1,
            title: item.question,
            content: item.answer,
        }))
        : [];

    return (
        <div className="w-full max-w-5xl mx-auto mt-10 mb-10">
            <h2 className="text-3xl font-bold mb-4">{t("landing.faqs.title")}</h2>
            <Accordion items={items} />
        </div>
    );
}